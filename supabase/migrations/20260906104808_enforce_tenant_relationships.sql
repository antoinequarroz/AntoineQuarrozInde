-- Every business relationship that carries an organization_id must reference
-- a parent row from the same organization. The application uses service_role
-- and therefore cannot rely on RLS to catch cross-tenant foreign keys.

create unique index if not exists clients_org_id_id_unique
  on public.clients(organization_id, id);
create unique index if not exists projects_org_id_id_unique
  on public.projects(organization_id, id);
create unique index if not exists tasks_org_id_id_unique
  on public.tasks(organization_id, id);
create unique index if not exists quotes_org_id_id_unique
  on public.quotes(organization_id, id);
create unique index if not exists invoices_org_id_id_unique
  on public.invoices(organization_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_client_org_fk') then
    alter table public.projects
      add constraint projects_client_org_fk
      foreign key (organization_id, client_id)
      references public.clients(organization_id, id)
      on delete set null (client_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_client_org_fk') then
    alter table public.tasks
      add constraint tasks_client_org_fk
      foreign key (organization_id, client_id)
      references public.clients(organization_id, id)
      on delete set null (client_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tasks_project_org_fk') then
    alter table public.tasks
      add constraint tasks_project_org_fk
      foreign key (organization_id, project_id)
      references public.projects(organization_id, id)
      on delete set null (project_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'quotes_client_org_fk') then
    alter table public.quotes
      add constraint quotes_client_org_fk
      foreign key (organization_id, client_id)
      references public.clients(organization_id, id)
      on delete set null (client_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'quotes_project_org_fk') then
    alter table public.quotes
      add constraint quotes_project_org_fk
      foreign key (organization_id, project_id)
      references public.projects(organization_id, id)
      on delete set null (project_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_client_org_fk') then
    alter table public.invoices
      add constraint invoices_client_org_fk
      foreign key (organization_id, client_id)
      references public.clients(organization_id, id)
      on delete set null (client_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_quote_org_fk') then
    alter table public.invoices
      add constraint invoices_quote_org_fk
      foreign key (organization_id, quote_id)
      references public.quotes(organization_id, id)
      on delete set null (quote_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_project_org_fk') then
    alter table public.invoices
      add constraint invoices_project_org_fk
      foreign key (organization_id, project_id)
      references public.projects(organization_id, id)
      on delete set null (project_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'appointments_client_org_fk') then
    alter table public.appointments
      add constraint appointments_client_org_fk
      foreign key (organization_id, client_id)
      references public.clients(organization_id, id)
      on delete set null (client_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'audit_logs_client_org_fk') then
    alter table public.audit_logs
      add constraint audit_logs_client_org_fk
      foreign key (organization_id, client_id)
      references public.clients(organization_id, id)
      on delete set null (client_id)
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'quote_items_quote_org_fk') then
    alter table public.quote_items
      add constraint quote_items_quote_org_fk
      foreign key (organization_id, quote_id)
      references public.quotes(organization_id, id)
      on delete cascade
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoice_items_invoice_org_fk') then
    alter table public.invoice_items
      add constraint invoice_items_invoice_org_fk
      foreign key (organization_id, invoice_id)
      references public.invoices(organization_id, id)
      on delete cascade
      not valid;
  end if;
end $$;

alter table public.projects validate constraint projects_client_org_fk;
alter table public.tasks validate constraint tasks_client_org_fk;
alter table public.tasks validate constraint tasks_project_org_fk;
alter table public.quotes validate constraint quotes_client_org_fk;
alter table public.quotes validate constraint quotes_project_org_fk;
alter table public.invoices validate constraint invoices_client_org_fk;
alter table public.invoices validate constraint invoices_quote_org_fk;
alter table public.invoices validate constraint invoices_project_org_fk;
alter table public.appointments validate constraint appointments_client_org_fk;
alter table public.audit_logs validate constraint audit_logs_client_org_fk;
alter table public.quote_items validate constraint quote_items_quote_org_fk;
alter table public.invoice_items validate constraint invoice_items_invoice_org_fk;
