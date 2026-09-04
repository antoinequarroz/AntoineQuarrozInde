create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'viewer', 'client')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.projects (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  title text not null,
  slug text not null unique,
  category text not null check (category in ('web', 'mobile', 'cms')),
  tags text[] not null default '{}',
  description text not null,
  description_en text,
  description_de text,
  image text,
  live_url text,
  code_url text,
  featured boolean not null default false,
  portfolio_visible boolean not null default false,
  case_study_published boolean not null default false,
  case_study_approved_at timestamptz,
  case_study_approved_by uuid references auth.users(id) on delete set null,
  client_label text,
  client_disclosure_status text not null default 'pending'
    constraint projects_client_disclosure_status_allowed check (client_disclosure_status in ('pending', 'anonymous', 'approved')),
  project_role text,
  project_duration text,
  case_study_timeline_approved boolean not null default false,
  completed_at date,
  challenge text,
  project_scope text,
  key_decisions text,
  approach text,
  solution text,
  outcome text,
  outcome_approved boolean not null default false,
  case_study_links_approved boolean not null default false,
  related_service_paths text[] not null default '{}'
    constraint projects_related_service_paths_allowed check (
      cardinality(related_service_paths) <= 4
      and array_position(related_service_paths, null) is null
      and cardinality(array_positions(related_service_paths, '/developpeur-web-valais')) <= 1
      and cardinality(array_positions(related_service_paths, '/creation-site-internet-valais')) <= 1
      and cardinality(array_positions(related_service_paths, '/refonte-site-web-valais')) <= 1
      and cardinality(array_positions(related_service_paths, '/application-mobile-valais')) <= 1
      and related_service_paths <@ array[
        '/developpeur-web-valais',
        '/creation-site-internet-valais',
        '/refonte-site-web-valais',
        '/application-mobile-valais'
      ]::text[]
    ),
  deliverables text[] not null default '{}',
  gallery_images text[] not null default '{}',
  results jsonb not null default '[]'::jsonb check (jsonb_typeof(results) = 'array'),
  seo_title text,
  seo_description text,
  case_study_published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint projects_case_study_approval_pair check (
    (case_study_approved_at is null and case_study_approved_by is null)
    or (case_study_approved_at is not null and case_study_approved_by is not null)
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  cover_image text,
  published boolean not null default false,
  author_key text not null default 'antoine-quarroz'
    constraint articles_author_key_approved check (author_key = 'antoine-quarroz'),
  tags text[] not null default '{}',
  read_time integer not null default 5 check (read_time > 0),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  author text not null,
  company text not null default '',
  role text not null default '',
  avatar text,
  rating integer not null check (rating between 1 and 5),
  content text not null,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  event text not null,
  variant text,
  path text,
  locale text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'replied', 'archived')),
  tags text[] not null default '{}',
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  company text,
  email text not null,
  phone text,
  status text not null default 'lead' check (status in ('lead', 'active', 'inactive')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  client_id bigint references public.clients(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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
    if row(
      new.organization_id,
      new.title,
      new.slug,
      new.excerpt,
      new.content,
      new.cover_image,
      new.published,
      new.author_key,
      new.tags,
      new.read_time
    ) is distinct from row(
      old.organization_id,
      old.title,
      old.slug,
      old.excerpt,
      old.content,
      old.cover_image,
      old.published,
      old.author_key,
      old.tags,
      old.read_time
    ) then
      new.updated_at := statement_timestamp();
    else
      new.updated_at := old.updated_at;
    end if;

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
    select 1 from pg_catalog.pg_trigger
    where tgname = 'set_article_editorial_timestamps'
      and tgrelid = 'public.articles'::regclass
      and not tgisinternal
  ) then
    create trigger set_article_editorial_timestamps
      before insert or update on public.articles
      for each row execute function public.maintain_article_editorial_timestamps();
  end if;
  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'set_project_editorial_timestamps'
      and tgrelid = 'public.projects'::regclass
      and not tgisinternal
  ) then
    create trigger set_project_editorial_timestamps
      before insert or update on public.projects
      for each row execute function public.maintain_project_editorial_timestamps();
  end if;
  if not exists (
    select 1 from pg_catalog.pg_trigger
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
    perform set_config('app.article_publication_audit', 'save_article_with_publication_audit', true);
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

  select * into v_before
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
  perform set_config('app.article_publication_audit', 'save_article_with_publication_audit', true);
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

create or replace function public.save_project_with_publication_audit(
  p_organization_id uuid,
  p_project_id bigint,
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
  v_before public.projects%rowtype;
  v_input public.projects%rowtype;
  v_saved public.projects%rowtype;
  v_before_publication jsonb;
  v_after_publication jsonb;
  v_before_case_content jsonb;
  v_after_case_content jsonb;
  v_publication_changed boolean;
  v_case_content_changed boolean := false;
  v_approval_contract boolean;
  v_approval_confirmed boolean := false;
  v_sensitive_fields text[] := '{}';
  v_result jsonb;
  v_approved_at timestamptz;
  v_approved_by uuid;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'project_payload_invalid' using errcode = '22023';
  end if;

  v_approval_contract := p_payload ? 'client_disclosure_status';
  if p_payload ? 'case_study_approval_confirmed' then
    if jsonb_typeof(p_payload -> 'case_study_approval_confirmed') <> 'boolean' then
      raise exception 'project_case_study_approval_confirmation_invalid' using errcode = '22023';
    end if;
    v_approval_confirmed := (p_payload ->> 'case_study_approval_confirmed')::boolean;
  end if;

  v_input := jsonb_populate_record(null::public.projects, p_payload);
  v_after_publication := jsonb_build_object(
    'portfolioVisible', coalesce(v_input.portfolio_visible, false),
    'caseStudyPublished', coalesce(v_input.case_study_published, false)
  );
  if v_approval_contract then
    v_after_publication := jsonb_set(v_after_publication, '{caseStudyApproved}', 'false'::jsonb);
  end if;
  v_after_case_content := jsonb_build_object(
    'title', v_input.title,
    'slug', v_input.slug,
    'category', v_input.category,
    'tags', v_input.tags,
    'description', v_input.description,
    'image', v_input.image,
    'liveUrl', v_input.live_url,
    'codeUrl', v_input.code_url,
    'clientLabel', v_input.client_label,
    'clientDisclosureStatus', v_input.client_disclosure_status,
    'projectRole', v_input.project_role,
    'projectDuration', v_input.project_duration,
    'timelineApproved', v_input.case_study_timeline_approved,
    'completedAt', v_input.completed_at,
    'context', v_input.challenge,
    'scope', v_input.project_scope,
    'decisions', v_input.key_decisions,
    'approach', v_input.approach,
    'solution', v_input.solution,
    'outcome', v_input.outcome,
    'outcomeApproved', v_input.outcome_approved,
    'linksApproved', v_input.case_study_links_approved,
    'services', v_input.related_service_paths,
    'deliverables', v_input.deliverables,
    'galleryImages', v_input.gallery_images,
    'results', v_input.results,
    'seoTitle', v_input.seo_title,
    'seoDescription', v_input.seo_description
  );

  if p_project_id is null then
    if (coalesce(v_input.portfolio_visible, false) or coalesce(v_input.case_study_published, false))
      and p_actor_role not in ('owner', 'admin') then
      raise exception 'project_publication_forbidden' using errcode = '42501';
    end if;

    if v_approval_contract and coalesce(v_input.case_study_published, false) then
      if p_actor_user_id is null then
        raise exception 'project_case_study_approver_missing' using errcode = '22023';
      end if;
      if not v_approval_confirmed then
        raise exception 'project_case_study_approval_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.challenge), '') is null then
        raise exception 'project_case_study_context_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.project_role), '') is null then
        raise exception 'project_case_study_role_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.project_scope), '') is null then
        raise exception 'project_case_study_scope_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.key_decisions), '') is null then
        raise exception 'project_case_study_decisions_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.outcome), '') is null or not coalesce(v_input.outcome_approved, false) then
        raise exception 'project_case_study_approved_outcome_required' using errcode = '22023';
      end if;
      if v_input.client_disclosure_status not in ('anonymous', 'approved') then
        raise exception 'project_case_study_disclosure_required' using errcode = '22023';
      end if;
      if v_input.client_disclosure_status = 'approved' and nullif(btrim(v_input.client_label), '') is null then
        raise exception 'project_case_study_client_label_required' using errcode = '22023';
      end if;
      if cardinality(coalesce(v_input.related_service_paths, '{}')) = 0 then
        raise exception 'project_case_study_service_required' using errcode = '22023';
      end if;
      for v_result in select value from jsonb_array_elements(coalesce(v_input.results, '[]'::jsonb)) loop
        if jsonb_typeof(v_result) <> 'object'
          or (coalesce((v_result ->> 'approved')::boolean, false)
            and (nullif(btrim(v_result ->> 'value'), '') is null or nullif(btrim(v_result ->> 'label'), '') is null)) then
          raise exception 'project_case_study_result_invalid' using errcode = '22023';
        end if;
      end loop;
      v_approved_at := statement_timestamp();
      v_approved_by := p_actor_user_id;
      v_after_publication := jsonb_set(v_after_publication, '{caseStudyApproved}', 'true'::jsonb);
    end if;

    insert into public.projects (
      organization_id, client_id, title, slug, category, tags, description,
      description_en, description_de, image, live_url, code_url, featured,
      portfolio_visible, case_study_published, client_label, project_role,
      project_duration, completed_at, challenge, approach, solution, outcome,
      deliverables, gallery_images, results, seo_title, seo_description,
      project_scope, key_decisions, client_disclosure_status,
      case_study_links_approved, case_study_timeline_approved, outcome_approved,
      related_service_paths, case_study_approved_at, case_study_approved_by
    ) values (
      p_organization_id, v_input.client_id, v_input.title, v_input.slug,
      v_input.category, v_input.tags, v_input.description, v_input.description_en,
      v_input.description_de, v_input.image, v_input.live_url, v_input.code_url,
      v_input.featured, coalesce(v_input.portfolio_visible, false),
      coalesce(v_input.case_study_published, false), v_input.client_label,
      v_input.project_role, v_input.project_duration, v_input.completed_at,
      v_input.challenge, v_input.approach, v_input.solution, v_input.outcome,
      v_input.deliverables, v_input.gallery_images, v_input.results,
      v_input.seo_title, v_input.seo_description, v_input.project_scope,
      v_input.key_decisions, coalesce(v_input.client_disclosure_status, 'pending'),
      coalesce(v_input.case_study_links_approved, false),
      coalesce(v_input.case_study_timeline_approved, false),
      coalesce(v_input.outcome_approved, false),
      coalesce(v_input.related_service_paths, '{}'), v_approved_at, v_approved_by
    )
    returning * into v_saved;

    insert into public.audit_logs (
      organization_id, actor_user_id, action, entity_type, entity_id, payload
    ) values (
      p_organization_id, p_actor_user_id, 'project.publication_changed',
      'project', v_saved.id::text,
      jsonb_build_object('before', null, 'after', v_after_publication)
    );

    if v_approval_contract then
      insert into public.audit_logs (
        organization_id, actor_user_id, action, entity_type, entity_id, payload
      ) values (
        p_organization_id, p_actor_user_id, 'project.case_study_sensitive_changed',
        'project', v_saved.id::text,
        jsonb_build_object(
          'fields', jsonb_build_array('caseStudyContent'),
          'approved', v_approved_at is not null
        )
      );
    end if;

    return to_jsonb(v_saved);
  end if;

  select *
  into v_before
  from public.projects
  where organization_id = p_organization_id
    and id = p_project_id
  for update;

  if not found then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  v_before_publication := jsonb_build_object(
    'portfolioVisible', v_before.portfolio_visible,
    'caseStudyPublished', v_before.case_study_published
  );
  if v_approval_contract then
    v_before_publication := jsonb_set(
      v_before_publication,
      '{caseStudyApproved}',
      to_jsonb(v_before.case_study_approved_at is not null)
    );
  end if;
  v_before_case_content := jsonb_build_object(
    'title', v_before.title,
    'slug', v_before.slug,
    'category', v_before.category,
    'tags', v_before.tags,
    'description', v_before.description,
    'image', v_before.image,
    'liveUrl', v_before.live_url,
    'codeUrl', v_before.code_url,
    'clientLabel', v_before.client_label,
    'clientDisclosureStatus', v_before.client_disclosure_status,
    'projectRole', v_before.project_role,
    'projectDuration', v_before.project_duration,
    'timelineApproved', v_before.case_study_timeline_approved,
    'completedAt', v_before.completed_at,
    'context', v_before.challenge,
    'scope', v_before.project_scope,
    'decisions', v_before.key_decisions,
    'approach', v_before.approach,
    'solution', v_before.solution,
    'outcome', v_before.outcome,
    'outcomeApproved', v_before.outcome_approved,
    'linksApproved', v_before.case_study_links_approved,
    'services', v_before.related_service_paths,
    'deliverables', v_before.deliverables,
    'galleryImages', v_before.gallery_images,
    'results', v_before.results,
    'seoTitle', v_before.seo_title,
    'seoDescription', v_before.seo_description
  );
  v_case_content_changed := v_before_case_content is distinct from v_after_case_content;
  v_publication_changed := v_before.portfolio_visible is distinct from coalesce(v_input.portfolio_visible, false)
    or v_before.case_study_published is distinct from coalesce(v_input.case_study_published, false);

  if v_publication_changed and p_actor_role not in ('owner', 'admin') then
    raise exception 'project_publication_forbidden' using errcode = '42501';
  end if;

  if v_approval_contract and v_before.case_study_published
    and v_before.case_study_approved_at is not null
    and coalesce(v_input.case_study_published, false)
    and v_case_content_changed then
    raise exception 'project_case_study_locked' using errcode = '40001';
  end if;

  if coalesce(v_input.case_study_published, false) then
    if v_before.case_study_published and v_before.case_study_approved_at is not null and not v_case_content_changed then
      v_approved_at := v_before.case_study_approved_at;
      v_approved_by := v_before.case_study_approved_by;
      v_after_publication := jsonb_set(v_after_publication, '{caseStudyApproved}', 'true'::jsonb);
    elsif v_approval_contract then
      if p_actor_role not in ('owner', 'admin') then
        raise exception 'project_publication_forbidden' using errcode = '42501';
      end if;
      if p_actor_user_id is null then
        raise exception 'project_case_study_approver_missing' using errcode = '22023';
      end if;
      if not v_approval_confirmed then
        raise exception 'project_case_study_approval_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.challenge), '') is null then
        raise exception 'project_case_study_context_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.project_role), '') is null then
        raise exception 'project_case_study_role_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.project_scope), '') is null then
        raise exception 'project_case_study_scope_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.key_decisions), '') is null then
        raise exception 'project_case_study_decisions_required' using errcode = '22023';
      end if;
      if nullif(btrim(v_input.outcome), '') is null or not coalesce(v_input.outcome_approved, false) then
        raise exception 'project_case_study_approved_outcome_required' using errcode = '22023';
      end if;
      if v_input.client_disclosure_status not in ('anonymous', 'approved') then
        raise exception 'project_case_study_disclosure_required' using errcode = '22023';
      end if;
      if v_input.client_disclosure_status = 'approved' and nullif(btrim(v_input.client_label), '') is null then
        raise exception 'project_case_study_client_label_required' using errcode = '22023';
      end if;
      if cardinality(coalesce(v_input.related_service_paths, '{}')) = 0 then
        raise exception 'project_case_study_service_required' using errcode = '22023';
      end if;
      for v_result in select value from jsonb_array_elements(coalesce(v_input.results, '[]'::jsonb)) loop
        if jsonb_typeof(v_result) <> 'object'
          or (coalesce((v_result ->> 'approved')::boolean, false)
            and (nullif(btrim(v_result ->> 'value'), '') is null or nullif(btrim(v_result ->> 'label'), '') is null)) then
          raise exception 'project_case_study_result_invalid' using errcode = '22023';
        end if;
      end loop;
      v_approved_at := statement_timestamp();
      v_approved_by := p_actor_user_id;
      v_after_publication := jsonb_set(v_after_publication, '{caseStudyApproved}', 'true'::jsonb);
    else
      v_approved_at := v_before.case_study_approved_at;
      v_approved_by := v_before.case_study_approved_by;
      v_after_publication := jsonb_set(
        v_after_publication,
        '{caseStudyApproved}',
        to_jsonb(v_approved_at is not null)
      );
    end if;
  end if;

  update public.projects
  set client_id = v_input.client_id,
      title = v_input.title,
      slug = v_input.slug,
      category = v_input.category,
      tags = v_input.tags,
      description = v_input.description,
      description_en = v_input.description_en,
      description_de = v_input.description_de,
      image = v_input.image,
      live_url = v_input.live_url,
      code_url = v_input.code_url,
      featured = v_input.featured,
      portfolio_visible = coalesce(v_input.portfolio_visible, false),
      case_study_published = coalesce(v_input.case_study_published, false),
      client_label = v_input.client_label,
      project_role = v_input.project_role,
      project_duration = v_input.project_duration,
      completed_at = v_input.completed_at,
      challenge = v_input.challenge,
      approach = v_input.approach,
      solution = v_input.solution,
      outcome = v_input.outcome,
      deliverables = v_input.deliverables,
      gallery_images = v_input.gallery_images,
      results = v_input.results,
      seo_title = v_input.seo_title,
      seo_description = v_input.seo_description,
      project_scope = v_input.project_scope,
      key_decisions = v_input.key_decisions,
      client_disclosure_status = coalesce(v_input.client_disclosure_status, 'pending'),
      case_study_links_approved = coalesce(v_input.case_study_links_approved, false),
      case_study_timeline_approved = coalesce(v_input.case_study_timeline_approved, false),
      outcome_approved = coalesce(v_input.outcome_approved, false),
      related_service_paths = coalesce(v_input.related_service_paths, '{}'),
      case_study_approved_at = v_approved_at,
      case_study_approved_by = v_approved_by
  where organization_id = p_organization_id
    and id = p_project_id
  returning * into v_saved;

  if v_publication_changed
    or (v_before.case_study_approved_at is null) is distinct from (v_saved.case_study_approved_at is null) then
    insert into public.audit_logs (
      organization_id, actor_user_id, action, entity_type, entity_id, payload
    ) values (
      p_organization_id, p_actor_user_id, 'project.publication_changed',
      'project', v_saved.id::text,
      jsonb_build_object('before', v_before_publication, 'after', v_after_publication)
    );
  end if;

  if v_approval_contract and v_case_content_changed then
    v_sensitive_fields := array_remove(array[
      case when v_before.client_label is distinct from v_input.client_label then 'clientLabel' end,
      case when v_before.client_disclosure_status is distinct from v_input.client_disclosure_status then 'clientDisclosureStatus' end,
      case when v_before.live_url is distinct from v_input.live_url then 'liveUrl' end,
      case when v_before.code_url is distinct from v_input.code_url then 'codeUrl' end,
      case when v_before.project_duration is distinct from v_input.project_duration then 'projectDuration' end,
      case when v_before.completed_at is distinct from v_input.completed_at then 'completedAt' end,
      case when v_before.challenge is distinct from v_input.challenge then 'context' end,
      case when v_before.project_role is distinct from v_input.project_role then 'projectRole' end,
      case when v_before.project_scope is distinct from v_input.project_scope then 'projectScope' end,
      case when v_before.key_decisions is distinct from v_input.key_decisions then 'keyDecisions' end,
      case when v_before.outcome is distinct from v_input.outcome then 'outcome' end,
      case when v_before.results is distinct from v_input.results then 'results' end,
      case when v_before.related_service_paths is distinct from v_input.related_service_paths then 'relatedServicePaths' end,
      case when v_before.case_study_links_approved is distinct from v_input.case_study_links_approved then 'linksApproval' end,
      case when v_before.case_study_timeline_approved is distinct from v_input.case_study_timeline_approved then 'timelineApproval' end,
      case when v_before.outcome_approved is distinct from v_input.outcome_approved then 'outcomeApproval' end,
      case when v_before.title is distinct from v_input.title then 'title' end,
      case when v_before.description is distinct from v_input.description then 'description' end,
      case when v_before.image is distinct from v_input.image then 'image' end,
      case when v_before.approach is distinct from v_input.approach then 'approach' end,
      case when v_before.solution is distinct from v_input.solution then 'solution' end,
      case when v_before.deliverables is distinct from v_input.deliverables then 'deliverables' end,
      case when v_before.gallery_images is distinct from v_input.gallery_images then 'galleryImages' end,
      case when v_before.seo_title is distinct from v_input.seo_title then 'seoTitle' end,
      case when v_before.seo_description is distinct from v_input.seo_description then 'seoDescription' end
    ], null);

    insert into public.audit_logs (
      organization_id, actor_user_id, action, entity_type, entity_id, payload
    ) values (
      p_organization_id, p_actor_user_id, 'project.case_study_sensitive_changed',
      'project', v_saved.id::text,
      jsonb_build_object(
        'fields', to_jsonb(v_sensitive_fields),
        'beforeApproved', v_before.case_study_approved_at is not null,
        'afterApproved', v_saved.case_study_approved_at is not null
      )
    );
  end if;

  return to_jsonb(v_saved);
end;
$$;

revoke all on function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  to service_role;

comment on function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb) is
  'Transition RPC: atomically saves project approvals for the new contract while preserving private legacy writes until activation.';

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id bigint references public.clients(id) on delete set null,
  project_id bigint references public.projects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id bigint references public.clients(id) on delete set null,
  number text not null,
  title text not null,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'CHF',
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  issued_at date,
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  unique (organization_id, number)
);

create table if not exists public.invoices (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id bigint references public.clients(id) on delete set null,
  quote_id bigint references public.quotes(id) on delete set null,
  number text not null,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'CHF',
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issued_at date,
  due_at date,
  paid_at date,
  notes text,
  document_type text not null default 'invoice' check (document_type in ('invoice', 'credit_note')),
  credited_invoice_id bigint references public.invoices(id) on delete restrict,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, number)
);

create table if not exists public.invoice_payments (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id bigint not null references public.invoices(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'CHF',
  method text not null default 'bank_transfer' check (method in ('bank_transfer', 'swiss_qr', 'twint', 'cash', 'other')),
  paid_at date not null default current_date,
  reference text,
  notes text,
  provider text check (provider is null or provider in ('stripe')),
  provider_payment_id text,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id bigint references public.clients(id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  meeting_url text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.application_errors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  source text not null check (source in ('client', 'server')),
  severity text not null default 'error' check (severity in ('warning', 'error', 'fatal')),
  message text not null,
  stack text,
  path text,
  fingerprint text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_projects_organization_id on public.projects(organization_id);
create index if not exists idx_projects_portfolio_visible on public.projects(organization_id, portfolio_visible) where portfolio_visible = true;
create index if not exists idx_projects_case_study_published on public.projects(organization_id, case_study_published) where case_study_published = true;
create index if not exists idx_articles_organization_id on public.articles(organization_id);
create index if not exists idx_reviews_organization_id on public.reviews(organization_id);
create index if not exists idx_marketing_events_organization_id on public.marketing_events(organization_id);
create index if not exists idx_contact_messages_organization_id on public.contact_messages(organization_id);
create index if not exists idx_contact_messages_status on public.contact_messages(status);
create index if not exists idx_contact_messages_tags_gin on public.contact_messages using gin(tags);
create index if not exists idx_org_memberships_user_id on public.organization_memberships(user_id);
create index if not exists idx_org_memberships_org_id on public.organization_memberships(organization_id);
create index if not exists idx_clients_organization_id on public.clients(organization_id);
create index if not exists idx_tasks_organization_id on public.tasks(organization_id);
create index if not exists idx_tasks_client_id on public.tasks(client_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_audit_logs_organization_id on public.audit_logs(organization_id);
create index if not exists idx_audit_logs_client_id on public.audit_logs(client_id);
create index if not exists idx_quotes_organization_id on public.quotes(organization_id);
create index if not exists idx_invoices_organization_id on public.invoices(organization_id);
create index if not exists idx_invoices_credited_invoice_id on public.invoices(organization_id, credited_invoice_id) where credited_invoice_id is not null;
create unique index if not exists idx_invoices_org_id_id_unique on public.invoices(organization_id, id);
create index if not exists idx_invoice_payments_invoice_id on public.invoice_payments(organization_id, invoice_id, paid_at desc);
create unique index if not exists idx_invoice_payments_provider_payment_unique on public.invoice_payments(organization_id, provider, provider_payment_id) where provider is not null and provider_payment_id is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_credited_org_fk') then
    alter table public.invoices add constraint invoices_credited_org_fk foreign key (organization_id, credited_invoice_id) references public.invoices(organization_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoice_payments_org_invoice_fk') then
    alter table public.invoice_payments add constraint invoice_payments_org_invoice_fk foreign key (organization_id, invoice_id) references public.invoices(organization_id, id) on delete cascade;
  end if;
end $$;
create index if not exists idx_appointments_organization_id on public.appointments(organization_id);
create index if not exists idx_appointments_starts_at on public.appointments(starts_at);
create index if not exists idx_application_errors_created_at on public.application_errors(created_at desc);
create index if not exists idx_application_errors_org_unresolved on public.application_errors(organization_id, created_at desc) where resolved_at is null;
create index if not exists idx_application_errors_fingerprint on public.application_errors(fingerprint, created_at desc);

alter table public.projects enable row level security;
alter table public.articles enable row level security;
alter table public.reviews enable row level security;
alter table public.marketing_events enable row level security;
alter table public.contact_messages enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.audit_logs enable row level security;
alter table public.clients enable row level security;
alter table public.tasks enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.appointments enable row level security;
alter table public.application_errors enable row level security;

revoke all on table public.application_errors from anon, authenticated;
grant all on table public.application_errors to service_role;
revoke all on table public.invoice_payments from anon, authenticated;
grant all on table public.invoice_payments to service_role;
