alter table public.projects
  add column if not exists project_scope text,
  add column if not exists key_decisions text,
  add column if not exists client_disclosure_status text not null default 'pending',
  add column if not exists case_study_links_approved boolean not null default false,
  add column if not exists case_study_timeline_approved boolean not null default false,
  add column if not exists outcome_approved boolean not null default false,
  add column if not exists related_service_paths text[] not null default '{}',
  add column if not exists case_study_approved_at timestamptz,
  add column if not exists case_study_approved_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'projects_client_disclosure_status_allowed'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_client_disclosure_status_allowed
      check (client_disclosure_status in ('pending', 'anonymous', 'approved'));
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'projects_related_service_paths_allowed'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_related_service_paths_allowed
      check (
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
      );
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'projects_case_study_approval_pair'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_case_study_approval_pair
      check (
        (case_study_approved_at is null and case_study_approved_by is null)
        or (case_study_approved_at is not null and case_study_approved_by is not null)
      );
  end if;
end;
$$;

comment on column public.projects.project_scope is
  'French case-study scope. Required only when the detailed case study is approved for publication.';
comment on column public.projects.key_decisions is
  'French case-study decisions. Required only when the detailed case study is approved for publication.';
comment on column public.projects.client_disclosure_status is
  'Human disclosure decision: pending stays private, anonymous hides attribution, approved permits client_label.';
comment on column public.projects.related_service_paths is
  'Human-selected public service routes related to an approved case study.';
comment on column public.projects.case_study_approved_at is
  'Server-controlled timestamp of the final approval for the currently published case-study content.';
comment on column public.projects.case_study_approved_by is
  'Authenticated owner or administrator who approved the currently published case-study content.';
comment on column public.projects.results is
  'Private case-study measures as {value,label,measurementContext,evidenceNote,approved}; public serializers remove private evidence.';

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
