alter table public.articles
  add column if not exists author_key text;

-- Antoine is the only approved author in the current editorial model. Existing
-- rows predate attribution, so this is the only truthful backfill available.
update public.articles
set author_key = 'antoine-quarroz'
where author_key is null;

alter table public.articles
  alter column author_key set default 'antoine-quarroz',
  alter column author_key set not null;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'articles_author_key_approved'
      and conrelid = 'public.articles'::regclass
  ) then
    alter table public.articles
      add constraint articles_author_key_approved
      check (author_key = 'antoine-quarroz');
  end if;
end;
$$;

-- Keep the signature stable for migration-before-image deployment. A legacy
-- insert receives the canonical default and a legacy update preserves the
-- stored author. Explicit null or unapproved values still fail closed.
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
  v_author_key text;
  v_before_publication jsonb;
  v_after_publication jsonb;
  v_publication_changed boolean;
  v_previous_publication_guard text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'article_payload_invalid' using errcode = '22023';
  end if;

  v_input := jsonb_populate_record(null::public.articles, p_payload);

  if p_article_id is null then
    v_author_key := case
      when p_payload ? 'author_key' then v_input.author_key
      else 'antoine-quarroz'
    end;
    v_after_publication := jsonb_build_object(
      'published', coalesce(v_input.published, false),
      'authorKey', v_author_key
    );

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
        tags, read_time, author_key
      ) values (
        p_organization_id, v_input.title, v_input.slug, v_input.excerpt,
        v_input.content, v_input.cover_image, coalesce(v_input.published, false),
        v_input.tags, v_input.read_time, v_author_key
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

  v_author_key := case
    when p_payload ? 'author_key' then v_input.author_key
    else v_before.author_key
  end;
  v_before_publication := jsonb_build_object(
    'published', v_before.published,
    'authorKey', v_before.author_key
  );
  v_after_publication := jsonb_build_object(
    'published', coalesce(v_input.published, false),
    'authorKey', v_author_key
  );
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
        read_time = v_input.read_time,
        author_key = v_author_key
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

comment on column public.articles.author_key is
  'Stable approved author identifier resolved through the public identity registry.';
