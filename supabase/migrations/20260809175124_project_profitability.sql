alter table public.projects
  add column if not exists budget_cents integer not null default 0 check (budget_cents >= 0),
  add column if not exists internal_hourly_cost_cents integer not null default 0 check (internal_hourly_cost_cents >= 0);

alter table public.quotes
  add column if not exists project_id bigint;

alter table public.invoices
  add column if not exists project_id bigint;

create unique index if not exists quotes_org_id_id_unique on public.quotes(organization_id, id);
create unique index if not exists invoices_org_id_id_unique on public.invoices(organization_id, id);
create index if not exists quotes_project_idx on public.quotes(organization_id, project_id, created_at desc);
create index if not exists invoices_project_idx on public.invoices(organization_id, project_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quotes_org_project_fk') then
    alter table public.quotes add constraint quotes_org_project_fk
      foreign key (organization_id, project_id)
      references public.projects(organization_id, id)
      on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_org_project_fk') then
    alter table public.invoices add constraint invoices_org_project_fk
      foreign key (organization_id, project_id)
      references public.projects(organization_id, id)
      on delete set null;
  end if;
end $$;

comment on column public.projects.budget_cents is 'Pre-tax project budget used for forecast profitability.';
comment on column public.projects.internal_hourly_cost_cents is 'Internal hourly cost used with tracked time; never exposed publicly.';
comment on column public.quotes.project_id is 'Optional tenant-safe link to the delivered project.';
comment on column public.invoices.project_id is 'Optional tenant-safe link used for project revenue attribution.';
