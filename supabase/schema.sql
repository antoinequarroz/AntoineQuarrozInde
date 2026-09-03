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
  client_label text,
  project_role text,
  project_duration text,
  completed_at date,
  challenge text,
  approach text,
  solution text,
  outcome text,
  deliverables text[] not null default '{}',
  gallery_images text[] not null default '{}',
  results jsonb not null default '[]'::jsonb check (jsonb_typeof(results) = 'array'),
  seo_title text,
  seo_description text,
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
