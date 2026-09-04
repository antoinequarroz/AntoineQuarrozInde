do $$
begin
  if exists (
    select 1
    from public.projects
    where case_study_published is distinct from (case_study_approved_at is not null)
  ) then
    raise exception 'project_case_study_activation_preflight_failed' using errcode = '23514';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'projects_case_study_publication_matches_approval'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_case_study_publication_matches_approval
      check (case_study_published = (case_study_approved_at is not null))
      not valid;
  end if;
end;
$$;

alter table public.projects
  validate constraint projects_case_study_publication_matches_approval;

create or replace function public.enforce_project_case_study_activation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case_content_changed boolean := false;
  v_is_new_approval boolean := false;
  v_requires_audited_rpc boolean := false;
  v_result jsonb;
begin
  if tg_op = 'UPDATE' then
    v_is_new_approval := old.case_study_published is false
      or old.case_study_approved_at is null;
    v_case_content_changed := row(
      new.title, new.slug, new.category, new.tags, new.description,
      new.image, new.live_url, new.code_url, new.client_label,
      new.client_disclosure_status, new.project_role, new.project_duration,
      new.case_study_timeline_approved, new.completed_at, new.challenge,
      new.project_scope, new.key_decisions, new.approach, new.solution,
      new.outcome, new.outcome_approved, new.case_study_links_approved,
      new.related_service_paths, new.deliverables, new.gallery_images,
      new.results, new.seo_title, new.seo_description
    ) is distinct from row(
      old.title, old.slug, old.category, old.tags, old.description,
      old.image, old.live_url, old.code_url, old.client_label,
      old.client_disclosure_status, old.project_role, old.project_duration,
      old.case_study_timeline_approved, old.completed_at, old.challenge,
      old.project_scope, old.key_decisions, old.approach, old.solution,
      old.outcome, old.outcome_approved, old.case_study_links_approved,
      old.related_service_paths, old.deliverables, old.gallery_images,
      old.results, old.seo_title, old.seo_description
    );

    v_requires_audited_rpc := new.portfolio_visible is distinct from old.portfolio_visible
      or new.case_study_published is distinct from old.case_study_published
      or new.case_study_approved_at is distinct from old.case_study_approved_at
      or new.case_study_approved_by is distinct from old.case_study_approved_by
      or ((old.case_study_published or new.case_study_published) and v_case_content_changed);

    if old.case_study_published
      and old.case_study_approved_at is not null
      and new.case_study_published
      and (
        v_case_content_changed
        or new.case_study_approved_at is distinct from old.case_study_approved_at
        or new.case_study_approved_by is distinct from old.case_study_approved_by
      ) then
      raise exception 'project_case_study_locked' using errcode = '40001';
    end if;
  else
    v_is_new_approval := true;
    v_requires_audited_rpc := new.portfolio_visible
      or new.case_study_published
      or new.case_study_approved_at is not null
      or new.case_study_approved_by is not null;
  end if;

  if v_requires_audited_rpc
    and current_setting('app.project_publication_audit', true)
      is distinct from 'save_project_with_publication_audit' then
    raise exception 'project_publication_requires_audited_rpc' using errcode = '42501';
  end if;

  if new.case_study_published then
    if new.case_study_approved_at is null or new.case_study_approved_by is null then
      raise exception 'project_case_study_approval_required' using errcode = '22023';
    end if;
    if nullif(btrim(new.image), '') is null then
      raise exception 'project_case_study_image_required' using errcode = '22023';
    end if;
    if nullif(btrim(new.live_url), '') is null then
      raise exception 'project_case_study_live_url_required' using errcode = '22023';
    end if;
    if nullif(btrim(new.challenge), '') is null then
      raise exception 'project_case_study_context_required' using errcode = '22023';
    end if;
    if nullif(btrim(new.project_role), '') is null then
      raise exception 'project_case_study_role_required' using errcode = '22023';
    end if;
    if nullif(btrim(new.project_scope), '') is null then
      raise exception 'project_case_study_scope_required' using errcode = '22023';
    end if;
    if nullif(btrim(new.key_decisions), '') is null then
      raise exception 'project_case_study_decisions_required' using errcode = '22023';
    end if;
    if nullif(btrim(new.outcome), '') is null or not new.outcome_approved then
      raise exception 'project_case_study_approved_outcome_required' using errcode = '22023';
    end if;
    if new.client_disclosure_status not in ('anonymous', 'approved') then
      raise exception 'project_case_study_disclosure_required' using errcode = '22023';
    end if;
    if new.client_disclosure_status = 'approved'
      and nullif(btrim(new.client_label), '') is null then
      raise exception 'project_case_study_client_label_required' using errcode = '22023';
    end if;
    if cardinality(new.related_service_paths) = 0 then
      raise exception 'project_case_study_service_required' using errcode = '22023';
    end if;

    for v_result in select value from jsonb_array_elements(new.results) loop
      if jsonb_typeof(v_result) <> 'object'
        or not (v_result ? 'approved')
        or jsonb_typeof(v_result -> 'approved') <> 'boolean'
        or (coalesce((v_result ->> 'approved')::boolean, false)
          and (nullif(btrim(v_result ->> 'value'), '') is null
            or nullif(btrim(v_result ->> 'label'), '') is null)) then
        raise exception 'project_case_study_result_invalid' using errcode = '22023';
      end if;
    end loop;

    if v_is_new_approval and not exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = new.organization_id
        and membership.user_id = new.case_study_approved_by
        and membership.role in ('owner', 'admin')
    ) then
      raise exception 'project_case_study_approver_forbidden' using errcode = '42501';
    end if;
  elsif new.case_study_approved_at is not null or new.case_study_approved_by is not null then
    raise exception 'project_case_study_draft_approval_forbidden' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_project_case_study_activation()
  from public, anon, authenticated;
grant execute on function public.enforce_project_case_study_activation()
  to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgname = 'enforce_project_case_study_activation'
      and tgrelid = 'public.projects'::regclass
      and not tgisinternal
  ) then
    create trigger enforce_project_case_study_activation
      before insert or update on public.projects
      for each row execute function public.enforce_project_case_study_activation();
  end if;
end;
$$;

drop function if exists public.save_project_with_publication_audit_transition(
  uuid, bigint, uuid, text, jsonb
);

alter function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  rename to save_project_with_publication_audit_transition;

revoke all on function public.save_project_with_publication_audit_transition(uuid, bigint, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_project_with_publication_audit_transition(uuid, bigint, uuid, text, jsonb)
  to service_role;

comment on function public.save_project_with_publication_audit_transition(uuid, bigint, uuid, text, jsonb) is
  'Internal transition implementation. The activated public RPC derives membership and opens the audited write guard.';

create function public.save_project_with_publication_audit(
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
  v_actor_role text;
  v_before_approved boolean := false;
  v_after_approved boolean;
  v_previous_guard text;
  v_result jsonb;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'project_payload_invalid' using errcode = '22023';
  end if;
  if p_actor_user_id is null then
    raise exception 'project_actor_membership_required' using errcode = '42501';
  end if;

  select membership.role
  into v_actor_role
  from public.organization_memberships membership
  where membership.organization_id = p_organization_id
    and membership.user_id = p_actor_user_id;

  if not found then
    raise exception 'project_actor_membership_required' using errcode = '42501';
  end if;

  if p_project_id is not null then
    select project.case_study_approved_at is not null
    into v_before_approved
    from public.projects project
    where project.organization_id = p_organization_id
      and project.id = p_project_id
    for update;

    if not found then
      raise exception 'project_not_found' using errcode = 'P0002';
    end if;
  end if;

  if not (p_payload ? 'client_disclosure_status')
    or not (p_payload ? 'case_study_approval_confirmed')
    or jsonb_typeof(p_payload -> 'case_study_approval_confirmed') <> 'boolean' then
    raise exception 'project_case_study_contract_required' using errcode = '22023';
  end if;

  v_previous_guard := current_setting('app.project_publication_audit', true);
  perform set_config(
    'app.project_publication_audit',
    'save_project_with_publication_audit',
    true
  );

  begin
    v_result := public.save_project_with_publication_audit_transition(
      p_organization_id,
      p_project_id,
      p_actor_user_id,
      v_actor_role,
      p_payload
    );

    v_after_approved := nullif(v_result ->> 'case_study_approved_at', '') is not null;
    if v_before_approved is distinct from v_after_approved then
      insert into public.audit_logs (
        organization_id, actor_user_id, action, entity_type, entity_id, payload
      ) values (
        p_organization_id,
        p_actor_user_id,
        'project.case_study_approval_changed',
        'project',
        v_result ->> 'id',
        jsonb_build_object(
          'before', jsonb_build_object('caseStudyApproved', v_before_approved),
          'after', jsonb_build_object('caseStudyApproved', v_after_approved)
        )
      );
    end if;
  exception when others then
    perform set_config(
      'app.project_publication_audit',
      coalesce(v_previous_guard, ''),
      true
    );
    raise;
  end;

  perform set_config(
    'app.project_publication_audit',
    coalesce(v_previous_guard, ''),
    true
  );
  return v_result;
end;
$$;

revoke all on function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  to service_role;

comment on function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb) is
  'Activated RPC: derives organization membership, serializes project writes, enforces approved case studies and records audits atomically.';
