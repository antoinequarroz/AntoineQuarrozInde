-- The application accesses business data only through authenticated Nitro
-- server routes using the service role. Remove direct Data API privileges as
-- defense in depth; service_role keeps its explicit server-side access.
revoke all privileges on table
  public.admin_saved_views,
  public.appointments,
  public.articles,
  public.audit_logs,
  public.clients,
  public.contact_messages,
  public.invoice_items,
  public.invoices,
  public.marketing_events,
  public.organization_memberships,
  public.organizations,
  public.projects,
  public.quote_items,
  public.quotes,
  public.reviews,
  public.tasks
from anon, authenticated;

grant all privileges on table
  public.admin_saved_views,
  public.appointments,
  public.articles,
  public.audit_logs,
  public.clients,
  public.contact_messages,
  public.invoice_items,
  public.invoices,
  public.marketing_events,
  public.organization_memberships,
  public.organizations,
  public.projects,
  public.quote_items,
  public.quotes,
  public.reviews,
  public.tasks
to service_role;
