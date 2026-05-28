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
  image text,
  live_url text,
  code_url text,
  featured boolean not null default false,
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
  tags text[] not null default '{}',
  read_time integer not null default 5 check (read_time > 0),
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
  status text not null default 'new' check (status in ('new', 'replied')),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
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
  created_at timestamptz not null default now(),
  unique (organization_id, number)
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

create index if not exists idx_projects_organization_id on public.projects(organization_id);
create index if not exists idx_articles_organization_id on public.articles(organization_id);
create index if not exists idx_reviews_organization_id on public.reviews(organization_id);
create index if not exists idx_marketing_events_organization_id on public.marketing_events(organization_id);
create index if not exists idx_contact_messages_organization_id on public.contact_messages(organization_id);
create index if not exists idx_org_memberships_user_id on public.organization_memberships(user_id);
create index if not exists idx_org_memberships_org_id on public.organization_memberships(organization_id);
create index if not exists idx_clients_organization_id on public.clients(organization_id);
create index if not exists idx_tasks_organization_id on public.tasks(organization_id);
create index if not exists idx_tasks_client_id on public.tasks(client_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_quotes_organization_id on public.quotes(organization_id);
create index if not exists idx_invoices_organization_id on public.invoices(organization_id);
create index if not exists idx_appointments_organization_id on public.appointments(organization_id);
create index if not exists idx_appointments_starts_at on public.appointments(starts_at);

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
alter table public.appointments enable row level security;
