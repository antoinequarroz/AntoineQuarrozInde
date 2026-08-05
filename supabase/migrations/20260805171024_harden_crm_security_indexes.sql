-- Keep the platform event trigger functional without exposing its SECURITY
-- DEFINER function through the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Cover the foreign keys used by the CRM, project and billing workflows.
create index if not exists idx_admin_saved_views_user_id on public.admin_saved_views(user_id);
create index if not exists idx_appointments_client_id on public.appointments(client_id);
create index if not exists idx_audit_logs_actor_user_id on public.audit_logs(actor_user_id);
create index if not exists idx_audit_logs_client_id on public.audit_logs(client_id);
create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_quote_id on public.invoices(quote_id);
create index if not exists idx_quotes_client_id on public.quotes(client_id);
create index if not exists idx_tasks_client_id on public.tasks(client_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
