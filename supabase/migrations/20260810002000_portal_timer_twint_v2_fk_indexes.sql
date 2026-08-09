create index if not exists quotes_accepted_by_user_idx
  on public.quotes(accepted_by_user_id)
  where accepted_by_user_id is not null;

create index if not exists project_time_entries_created_by_user_idx
  on public.project_time_entries(created_by_user_id)
  where created_by_user_id is not null;

create index if not exists payment_checkout_sessions_invoice_fk_idx
  on public.payment_checkout_sessions(invoice_id);

create index if not exists payment_checkout_sessions_client_fk_idx
  on public.payment_checkout_sessions(client_id);

create index if not exists payment_checkout_sessions_created_by_user_idx
  on public.payment_checkout_sessions(created_by_user_id)
  where created_by_user_id is not null;
