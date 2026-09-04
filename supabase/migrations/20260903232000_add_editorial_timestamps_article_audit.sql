alter table public.articles
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.projects
  add column if not exists case_study_published_at timestamptz,
  add column if not exists updated_at timestamptz;

-- created_at is the only verifiable historical timestamp. Use it once for the
-- backfill instead of inventing a deployment-time editorial date.
update public.articles
set updated_at = coalesce(updated_at, created_at),
    published_at = case
      when published then coalesce(published_at, created_at)
      else null
    end
where updated_at is null
   or (published and published_at is null)
   or (not published and published_at is not null);

update public.projects
set updated_at = coalesce(updated_at, created_at),
    case_study_published_at = case
      when case_study_published then coalesce(case_study_published_at, created_at)
      else null
    end
where updated_at is null
   or (case_study_published and case_study_published_at is null)
   or (not case_study_published and case_study_published_at is not null);

alter table public.articles
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.projects
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.maintain_article_editorial_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := new.created_at;
    new.published_at := case when new.published then new.created_at else null end;
  else
    new.updated_at := statement_timestamp();
    if new.published then
      if old.published then
        new.published_at := old.published_at;
      else
        new.published_at := statement_timestamp();
      end if;
    else
      new.published_at := null;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.maintain_project_editorial_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := new.created_at;
    new.case_study_published_at := case
      when new.case_study_published then new.created_at
      else null
    end;
  else
    new.updated_at := statement_timestamp();
    if new.case_study_published then
      if old.case_study_published then
        new.case_study_published_at := old.case_study_published_at;
      else
        new.case_study_published_at := statement_timestamp();
      end if;
    else
      new.case_study_published_at := null;
    end if;
  end if;

  return new;
end;
$$;

-- The migration is promoted before the new application image. Keep the
-- publication invariant fail-closed during that window and after an image
-- rollback: legacy direct writes may still edit drafts, but they cannot change
-- public visibility without going through the audited RPC below.
create or replace function public.enforce_article_publication_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    (tg_op = 'INSERT' and new.published)
    or (tg_op = 'UPDATE' and new.published is distinct from old.published)
  ) and current_setting('app.article_publication_audit', true)
      is distinct from 'save_article_with_publication_audit' then
    raise exception 'article_publication_requires_audited_rpc' using errcode = '42501';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgname = 'set_article_editorial_timestamps'
      and tgrelid = 'public.articles'::regclass
      and not tgisinternal
  ) then
    create trigger set_article_editorial_timestamps
      before insert or update on public.articles
      for each row execute function public.maintain_article_editorial_timestamps();
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgname = 'set_project_editorial_timestamps'
      and tgrelid = 'public.projects'::regclass
      and not tgisinternal
  ) then
    create trigger set_project_editorial_timestamps
      before insert or update on public.projects
      for each row execute function public.maintain_project_editorial_timestamps();
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgname = 'enforce_article_publication_audit'
      and tgrelid = 'public.articles'::regclass
      and not tgisinternal
  ) then
    create trigger enforce_article_publication_audit
      before insert or update of published on public.articles
      for each row execute function public.enforce_article_publication_audit();
  end if;
end;
$$;

revoke all on function public.maintain_article_editorial_timestamps()
  from public, anon, authenticated;
revoke all on function public.maintain_project_editorial_timestamps()
  from public, anon, authenticated;
revoke all on function public.enforce_article_publication_audit()
  from public, anon, authenticated;
grant execute on function public.maintain_article_editorial_timestamps()
  to service_role;
grant execute on function public.maintain_project_editorial_timestamps()
  to service_role;
grant execute on function public.enforce_article_publication_audit()
  to service_role;

create or replace function public.save_article_with_publication_audit(
  p_organization_id uuid,
  p_article_id bigint,
  p_actor_user_id uuid,
  p_actor_role text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_before public.articles%rowtype;
  v_input public.articles%rowtype;
  v_saved public.articles%rowtype;
  v_before_publication jsonb;
  v_after_publication jsonb;
  v_publication_changed boolean;
  v_previous_publication_guard text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'article_payload_invalid' using errcode = '22023';
  end if;

  v_input := jsonb_populate_record(null::public.articles, p_payload);
  v_after_publication := jsonb_build_object(
    'published', coalesce(v_input.published, false)
  );

  if p_article_id is null then
    if coalesce(v_input.published, false)
      and coalesce(p_actor_role, '') not in ('owner', 'admin') then
      raise exception 'article_publication_forbidden' using errcode = '42501';
    end if;

    v_previous_publication_guard := coalesce(
      current_setting('app.article_publication_audit', true),
      ''
    );
    perform set_config(
      'app.article_publication_audit',
      'save_article_with_publication_audit',
      true
    );
    begin
      insert into public.articles (
        organization_id, title, slug, excerpt, content, cover_image, published,
        tags, read_time
      ) values (
        p_organization_id, v_input.title, v_input.slug, v_input.excerpt,
        v_input.content, v_input.cover_image, coalesce(v_input.published, false),
        v_input.tags, v_input.read_time
      )
      returning * into v_saved;
    exception when others then
      perform set_config('app.article_publication_audit', v_previous_publication_guard, true);
      raise;
    end;
    perform set_config('app.article_publication_audit', v_previous_publication_guard, true);

    insert into public.audit_logs (
      organization_id, actor_user_id, action, entity_type, entity_id, payload
    ) values (
      p_organization_id, p_actor_user_id, 'article.publication_changed',
      'article', v_saved.id::text,
      jsonb_build_object('before', null, 'after', v_after_publication)
    );

    return to_jsonb(v_saved);
  end if;

  select *
  into v_before
  from public.articles
  where organization_id = p_organization_id
    and id = p_article_id
  for update;

  if not found then
    raise exception 'article_not_found' using errcode = 'P0002';
  end if;

  v_before_publication := jsonb_build_object('published', v_before.published);
  v_publication_changed := v_before.published is distinct from coalesce(v_input.published, false);

  if v_publication_changed and coalesce(p_actor_role, '') not in ('owner', 'admin') then
    raise exception 'article_publication_forbidden' using errcode = '42501';
  end if;

  v_previous_publication_guard := coalesce(
    current_setting('app.article_publication_audit', true),
    ''
  );
  perform set_config(
    'app.article_publication_audit',
    'save_article_with_publication_audit',
    true
  );
  begin
    update public.articles
    set title = v_input.title,
        slug = v_input.slug,
        excerpt = v_input.excerpt,
        content = v_input.content,
        cover_image = v_input.cover_image,
        published = coalesce(v_input.published, false),
        tags = v_input.tags,
        read_time = v_input.read_time
    where organization_id = p_organization_id
      and id = p_article_id
    returning * into v_saved;
  exception when others then
    perform set_config('app.article_publication_audit', v_previous_publication_guard, true);
    raise;
  end;
  perform set_config('app.article_publication_audit', v_previous_publication_guard, true);

  if v_publication_changed then
    insert into public.audit_logs (
      organization_id, actor_user_id, action, entity_type, entity_id, payload
    ) values (
      p_organization_id, p_actor_user_id, 'article.publication_changed',
      'article', v_saved.id::text,
      jsonb_build_object('before', v_before_publication, 'after', v_after_publication)
    );
  end if;

  return to_jsonb(v_saved);
end;
$$;

revoke all on function public.save_article_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_article_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  to service_role;

comment on function public.save_article_with_publication_audit(uuid, bigint, uuid, text, jsonb) is
  'Locks and saves one organization-scoped article, enforces publication roles and records publication audit changes atomically.';

comment on column public.articles.published_at is
  'Timestamp of the current publication period; null while the article is private.';
comment on column public.articles.updated_at is
  'Timestamp of the latest persisted article change.';
comment on column public.projects.case_study_published_at is
  'Timestamp of the current case-study publication period; null while the study is private.';
comment on column public.projects.updated_at is
  'Timestamp of the latest persisted project change.';
