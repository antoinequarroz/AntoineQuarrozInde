alter table public.projects
  add column if not exists case_study_published boolean not null default false,
  add column if not exists client_label text,
  add column if not exists project_role text,
  add column if not exists project_duration text,
  add column if not exists completed_at date,
  add column if not exists challenge text,
  add column if not exists approach text,
  add column if not exists solution text,
  add column if not exists outcome text,
  add column if not exists deliverables text[] not null default '{}',
  add column if not exists gallery_images text[] not null default '{}',
  add column if not exists results jsonb not null default '[]'::jsonb
    check (jsonb_typeof(results) = 'array'),
  add column if not exists seo_title text,
  add column if not exists seo_description text;

create index if not exists idx_projects_case_study_published
  on public.projects(organization_id, case_study_published)
  where case_study_published = true;

comment on column public.projects.case_study_published is 'Controls whether the public case-study route and portfolio link are enabled.';
comment on column public.projects.client_label is 'Public client attribution only; never populated from private CRM data automatically.';
comment on column public.projects.results is 'Optional verified results as an array of {value,label} objects.';
