alter table public.projects
  alter column portfolio_visible set default false;

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
  v_publication_changed boolean;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'project_payload_invalid' using errcode = '22023';
  end if;

  v_input := jsonb_populate_record(null::public.projects, p_payload);
  v_after_publication := jsonb_build_object(
    'portfolioVisible', coalesce(v_input.portfolio_visible, false),
    'caseStudyPublished', coalesce(v_input.case_study_published, false)
  );

  if p_project_id is null then
    if (coalesce(v_input.portfolio_visible, false) or coalesce(v_input.case_study_published, false))
      and p_actor_role not in ('owner', 'admin') then
      raise exception 'project_publication_forbidden' using errcode = '42501';
    end if;

    insert into public.projects (
      organization_id, client_id, title, slug, category, tags, description,
      description_en, description_de, image, live_url, code_url, featured,
      portfolio_visible, case_study_published, client_label, project_role,
      project_duration, completed_at, challenge, approach, solution, outcome,
      deliverables, gallery_images, results, seo_title, seo_description
    ) values (
      p_organization_id, v_input.client_id, v_input.title, v_input.slug,
      v_input.category, v_input.tags, v_input.description, v_input.description_en,
      v_input.description_de, v_input.image, v_input.live_url, v_input.code_url,
      v_input.featured, coalesce(v_input.portfolio_visible, false),
      coalesce(v_input.case_study_published, false), v_input.client_label,
      v_input.project_role, v_input.project_duration, v_input.completed_at,
      v_input.challenge, v_input.approach, v_input.solution, v_input.outcome,
      v_input.deliverables, v_input.gallery_images, v_input.results,
      v_input.seo_title, v_input.seo_description
    )
    returning * into v_saved;

    insert into public.audit_logs (
      organization_id, actor_user_id, action, entity_type, entity_id, payload
    ) values (
      p_organization_id, p_actor_user_id, 'project.publication_changed',
      'project', v_saved.id::text,
      jsonb_build_object('before', null, 'after', v_after_publication)
    );

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
  v_publication_changed := v_before.portfolio_visible is distinct from coalesce(v_input.portfolio_visible, false)
    or v_before.case_study_published is distinct from coalesce(v_input.case_study_published, false);

  if v_publication_changed and p_actor_role not in ('owner', 'admin') then
    raise exception 'project_publication_forbidden' using errcode = '42501';
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
      seo_description = v_input.seo_description
  where organization_id = p_organization_id
    and id = p_project_id
  returning * into v_saved;

  if v_publication_changed then
    insert into public.audit_logs (
      organization_id, actor_user_id, action, entity_type, entity_id, payload
    ) values (
      p_organization_id, p_actor_user_id, 'project.publication_changed',
      'project', v_saved.id::text,
      jsonb_build_object('before', v_before_publication, 'after', v_after_publication)
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
  'Locks and saves one organization-scoped project, enforces publication roles and records publication audit changes atomically.';

comment on column public.projects.portfolio_visible is
  'Controls whether the project card is rendered in the public portfolio. Independent from case-study publication.';
