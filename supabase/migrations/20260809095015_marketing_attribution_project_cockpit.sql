alter table public.contact_messages
  add column if not exists landing_path text,
  add column if not exists referrer_host text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text;

alter table public.clients
  add column if not exists acquisition_source text,
  add column if not exists acquisition_medium text,
  add column if not exists acquisition_campaign text;

alter table public.projects
  add column if not exists workflow_status text not null default 'planning'
    check (workflow_status in ('planning', 'active', 'review', 'delivered', 'paused')),
  add column if not exists starts_at date,
  add column if not exists target_at date;

create table if not exists public.project_milestones (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  due_at date,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'done', 'blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.project_time_entries (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  task_id bigint references public.tasks(id) on delete set null,
  description text not null check (char_length(description) between 1 and 500),
  minutes integer not null check (minutes between 1 and 1440),
  worked_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.project_notes (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'meeting')),
  title text not null check (char_length(title) between 1 and 180),
  content text not null check (char_length(content) between 1 and 10000),
  occurred_at timestamptz not null default now(),
  client_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.project_deliverables (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  url text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'delivered', 'approved')),
  client_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists projects_org_id_id_unique on public.projects(organization_id, id);
create unique index if not exists tasks_org_id_id_unique on public.tasks(organization_id, id);
create index if not exists contact_messages_attribution_idx on public.contact_messages(organization_id, utm_source, created_at desc);
create index if not exists project_milestones_project_idx on public.project_milestones(organization_id, project_id, due_at);
create index if not exists project_time_entries_project_idx on public.project_time_entries(organization_id, project_id, worked_at desc);
create index if not exists project_notes_project_idx on public.project_notes(organization_id, project_id, occurred_at desc);
create index if not exists project_deliverables_project_idx on public.project_deliverables(organization_id, project_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'project_milestones_org_project_fk') then
    alter table public.project_milestones add constraint project_milestones_org_project_fk
      foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'project_time_entries_org_project_fk') then
    alter table public.project_time_entries add constraint project_time_entries_org_project_fk
      foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'project_time_entries_org_task_fk') then
    alter table public.project_time_entries add constraint project_time_entries_org_task_fk
      foreign key (organization_id, task_id) references public.tasks(organization_id, id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'project_notes_org_project_fk') then
    alter table public.project_notes add constraint project_notes_org_project_fk
      foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'project_deliverables_org_project_fk') then
    alter table public.project_deliverables add constraint project_deliverables_org_project_fk
      foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade;
  end if;
end $$;

alter table public.project_milestones enable row level security;
alter table public.project_time_entries enable row level security;
alter table public.project_notes enable row level security;
alter table public.project_deliverables enable row level security;

revoke all on table public.project_milestones, public.project_time_entries, public.project_notes, public.project_deliverables from anon, authenticated;
grant all on table public.project_milestones, public.project_time_entries, public.project_notes, public.project_deliverables to service_role;

comment on table public.project_milestones is 'Server-only project cockpit milestones.';
comment on table public.project_time_entries is 'Server-only project time log.';
comment on table public.project_notes is 'Server-only meeting notes and internal project notes.';
comment on table public.project_deliverables is 'Server-only deliverables exposed to clients only by explicit API filtering.';
