create unique index if not exists projects_organization_id_id_unique
  on public.projects (organization_id, id);

create table if not exists public.project_case_study_localizations (
  project_id bigint not null,
  organization_id uuid not null,
  locale text not null,
  project_role text,
  project_duration text,
  challenge text,
  project_scope text,
  key_decisions text,
  approach text,
  solution text,
  outcome text,
  deliverables text[] not null default '{}',
  results jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, locale),
  constraint project_case_study_localizations_project_tenant_fk
    foreign key (organization_id, project_id)
    references public.projects (organization_id, id)
    on delete cascade,
  constraint project_case_study_localizations_locale_allowed
    check (locale in ('fr', 'en', 'de')),
  constraint project_case_study_localizations_project_role_length
    check (project_role is null or char_length(project_role) <= 180),
  constraint project_case_study_localizations_project_duration_length
    check (project_duration is null or char_length(project_duration) <= 120),
  constraint project_case_study_localizations_challenge_length
    check (challenge is null or char_length(challenge) <= 4000),
  constraint project_case_study_localizations_project_scope_length
    check (project_scope is null or char_length(project_scope) <= 6000),
  constraint project_case_study_localizations_key_decisions_length
    check (key_decisions is null or char_length(key_decisions) <= 6000),
  constraint project_case_study_localizations_approach_length
    check (approach is null or char_length(approach) <= 6000),
  constraint project_case_study_localizations_solution_length
    check (solution is null or char_length(solution) <= 6000),
  constraint project_case_study_localizations_outcome_length
    check (outcome is null or char_length(outcome) <= 4000),
  constraint project_case_study_localizations_deliverables_shape
    check (
      cardinality(deliverables) <= 20
      and array_position(deliverables, null) is null
    ),
  constraint project_case_study_localizations_results_shape
    check (jsonb_typeof(results) = 'array' and jsonb_array_length(results) <= 6)
);

comment on table public.project_case_study_localizations is
  'Private FR/EN/DE case-study drafts. Public exposure is controlled separately by a future per-locale publication contract.';
comment on column public.project_case_study_localizations.updated_by is
  'Last authenticated owner or administrator who changed this locale through the audited project RPC.';

create index if not exists idx_project_case_study_localizations_organization
  on public.project_case_study_localizations (organization_id, project_id, locale);

alter table public.project_case_study_localizations enable row level security;
revoke all on table public.project_case_study_localizations from public, anon, authenticated;
grant select, insert, update, delete on table public.project_case_study_localizations to service_role;

insert into public.project_case_study_localizations (
  project_id,
  organization_id,
  locale,
  project_role,
  project_duration,
  challenge,
  project_scope,
  key_decisions,
  approach,
  solution,
  outcome,
  deliverables,
  results,
  updated_at
)
select
  project.id,
  project.organization_id,
  'fr',
  project.project_role,
  project.project_duration,
  project.challenge,
  project.project_scope,
  project.key_decisions,
  project.approach,
  project.solution,
  project.outcome,
  project.deliverables,
  project.results,
  project.updated_at
from public.projects project
where project.organization_id is not null
  and (
    project.project_role is not null
    or project.project_duration is not null
    or project.challenge is not null
    or project.project_scope is not null
    or project.key_decisions is not null
    or project.approach is not null
    or project.solution is not null
    or project.outcome is not null
    or cardinality(project.deliverables) > 0
    or jsonb_array_length(project.results) > 0
  )
on conflict (project_id, locale) do nothing;

drop function if exists public.save_project_with_localizations_transition(
  uuid, bigint, uuid, text, jsonb
);

alter function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  rename to save_project_with_localizations_transition;

revoke all on function public.save_project_with_localizations_transition(uuid, bigint, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_project_with_localizations_transition(uuid, bigint, uuid, text, jsonb)
  to service_role;

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
  v_project_payload jsonb := p_payload - 'case_study_localizations';
  v_localizations jsonb := p_payload -> 'case_study_localizations';
  v_fr jsonb;
  v_locale text;
  v_input jsonb;
  v_saved jsonb;
  v_project_id bigint;
  v_existing_project public.projects%rowtype;
  v_candidate_project public.projects%rowtype;
  v_before public.project_case_study_localizations%rowtype;
  v_changed_fields text[];
  v_changes jsonb := '{}'::jsonb;
  v_localization_rows jsonb;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'project_payload_invalid' using errcode = '22023';
  end if;

  select membership.role
  into v_actor_role
  from public.organization_memberships membership
  where membership.organization_id = p_organization_id
    and membership.user_id = p_actor_user_id;

  if not found then
    raise exception 'project_actor_membership_required' using errcode = '42501';
  end if;

  if v_localizations is not null then
    if jsonb_typeof(v_localizations) <> 'object'
      or exists (
        select 1
        from jsonb_object_keys(v_localizations) as key
        where key not in ('fr', 'en', 'de')
      )
      or not (v_localizations ?& array['fr', 'en', 'de']) then
      raise exception 'project_case_study_localizations_invalid' using errcode = '22023';
    end if;

    if v_actor_role not in ('owner', 'admin') then
      raise exception 'project_case_study_localizations_forbidden' using errcode = '42501';
    end if;

    v_fr := v_localizations -> 'fr';
    if jsonb_typeof(v_fr) <> 'object' then
      raise exception 'project_case_study_localization_invalid_fr' using errcode = '22023';
    end if;

    v_project_payload := v_project_payload
      || jsonb_build_object(
        'project_role', v_fr -> 'project_role',
        'project_duration', v_fr -> 'project_duration',
        'challenge', v_fr -> 'challenge',
        'project_scope', v_fr -> 'project_scope',
        'key_decisions', v_fr -> 'key_decisions',
        'approach', v_fr -> 'approach',
        'solution', v_fr -> 'solution',
        'outcome', v_fr -> 'outcome',
        'deliverables', coalesce(v_fr -> 'deliverables', '[]'::jsonb),
        'results', coalesce(v_fr -> 'results', '[]'::jsonb)
      );
  end if;

  if v_actor_role not in ('owner', 'admin') then
    v_candidate_project := jsonb_populate_record(null::public.projects, v_project_payload);

    if p_project_id is not null then
      select *
      into v_existing_project
      from public.projects project
      where project.organization_id = p_organization_id
        and project.id = p_project_id
      for update;

      if not found then
        raise exception 'project_not_found' using errcode = 'P0002';
      end if;

      if v_existing_project.project_role is distinct from v_candidate_project.project_role
        or v_existing_project.project_duration is distinct from v_candidate_project.project_duration
        or v_existing_project.challenge is distinct from v_candidate_project.challenge
        or v_existing_project.project_scope is distinct from v_candidate_project.project_scope
        or v_existing_project.key_decisions is distinct from v_candidate_project.key_decisions
        or v_existing_project.approach is distinct from v_candidate_project.approach
        or v_existing_project.solution is distinct from v_candidate_project.solution
        or v_existing_project.outcome is distinct from v_candidate_project.outcome
        or coalesce(v_existing_project.deliverables, '{}') is distinct from coalesce(v_candidate_project.deliverables, '{}')
        or coalesce(v_existing_project.results, '[]'::jsonb) is distinct from coalesce(v_candidate_project.results, '[]'::jsonb) then
        raise exception 'project_case_study_localizations_forbidden' using errcode = '42501';
      end if;
    end if;
  end if;

  v_saved := public.save_project_with_localizations_transition(
    p_organization_id,
    p_project_id,
    p_actor_user_id,
    v_actor_role,
    v_project_payload
  );
  v_project_id := (v_saved ->> 'id')::bigint;

  if v_localizations is not null then
    for v_locale, v_input in
      select key, value from jsonb_each(v_localizations)
    loop
      if jsonb_typeof(v_input) <> 'object' then
        raise exception 'project_case_study_localization_invalid_%', v_locale using errcode = '22023';
      end if;

      v_before := null;

      select *
      into v_before
      from public.project_case_study_localizations localization
      where localization.organization_id = p_organization_id
        and localization.project_id = v_project_id
        and localization.locale = v_locale;

      v_changed_fields := array_remove(array[
        case when v_before.project_role is distinct from nullif(btrim(v_input ->> 'project_role'), '') then 'projectRole' end,
        case when v_before.project_duration is distinct from nullif(btrim(v_input ->> 'project_duration'), '') then 'projectDuration' end,
        case when v_before.challenge is distinct from nullif(btrim(v_input ->> 'challenge'), '') then 'challenge' end,
        case when v_before.project_scope is distinct from nullif(btrim(v_input ->> 'project_scope'), '') then 'projectScope' end,
        case when v_before.key_decisions is distinct from nullif(btrim(v_input ->> 'key_decisions'), '') then 'keyDecisions' end,
        case when v_before.approach is distinct from nullif(btrim(v_input ->> 'approach'), '') then 'approach' end,
        case when v_before.solution is distinct from nullif(btrim(v_input ->> 'solution'), '') then 'solution' end,
        case when v_before.outcome is distinct from nullif(btrim(v_input ->> 'outcome'), '') then 'outcome' end,
        case when coalesce(v_before.deliverables, '{}') is distinct from array(
          select jsonb_array_elements_text(coalesce(v_input -> 'deliverables', '[]'::jsonb))
        ) then 'deliverables' end,
        case when coalesce(v_before.results, '[]'::jsonb) is distinct from coalesce(v_input -> 'results', '[]'::jsonb) then 'results' end
      ], null);

      insert into public.project_case_study_localizations (
        project_id,
        organization_id,
        locale,
        project_role,
        project_duration,
        challenge,
        project_scope,
        key_decisions,
        approach,
        solution,
        outcome,
        deliverables,
        results,
        updated_by
      ) values (
        v_project_id,
        p_organization_id,
        v_locale,
        nullif(btrim(v_input ->> 'project_role'), ''),
        nullif(btrim(v_input ->> 'project_duration'), ''),
        nullif(btrim(v_input ->> 'challenge'), ''),
        nullif(btrim(v_input ->> 'project_scope'), ''),
        nullif(btrim(v_input ->> 'key_decisions'), ''),
        nullif(btrim(v_input ->> 'approach'), ''),
        nullif(btrim(v_input ->> 'solution'), ''),
        nullif(btrim(v_input ->> 'outcome'), ''),
        array(select jsonb_array_elements_text(coalesce(v_input -> 'deliverables', '[]'::jsonb))),
        coalesce(v_input -> 'results', '[]'::jsonb),
        p_actor_user_id
      )
      on conflict (project_id, locale) do update
      set project_role = excluded.project_role,
          project_duration = excluded.project_duration,
          challenge = excluded.challenge,
          project_scope = excluded.project_scope,
          key_decisions = excluded.key_decisions,
          approach = excluded.approach,
          solution = excluded.solution,
          outcome = excluded.outcome,
          deliverables = excluded.deliverables,
          results = excluded.results,
          updated_by = excluded.updated_by,
          updated_at = statement_timestamp();

      if cardinality(v_changed_fields) > 0 then
        v_changes := jsonb_set(v_changes, array[v_locale], to_jsonb(v_changed_fields), true);
      end if;
    end loop;

    if v_changes <> '{}'::jsonb then
      insert into public.audit_logs (
        organization_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        payload
      ) values (
        p_organization_id,
        p_actor_user_id,
        'project.case_study_localizations_changed',
        'project',
        v_project_id::text,
        jsonb_build_object(
          'locales', (
            select jsonb_agg(locale_key order by locale_key)
            from jsonb_object_keys(v_changes) as changed_locale(locale_key)
          ),
          'fieldsByLocale', v_changes
        )
      );
    end if;
  end if;

  select coalesce(jsonb_agg(to_jsonb(localization) order by localization.locale), '[]'::jsonb)
  into v_localization_rows
  from public.project_case_study_localizations localization
  where localization.organization_id = p_organization_id
    and localization.project_id = v_project_id;

  return jsonb_set(v_saved, '{case_study_localizations}', v_localization_rows, true);
end;
$$;

revoke all on function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb)
  to service_role;

comment on function public.save_project_with_publication_audit(uuid, bigint, uuid, text, jsonb) is
  'Atomically saves a project, its private FR/EN/DE case-study drafts and a locale-scoped audit. Membership is derived in the database.';
