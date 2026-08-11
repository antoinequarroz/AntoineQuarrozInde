alter table public.invoice_payments
  add column if not exists bank_import_fingerprint text;

alter table public.invoice_payments
  drop constraint if exists invoice_payments_bank_import_fingerprint_check;
alter table public.invoice_payments
  add constraint invoice_payments_bank_import_fingerprint_check
  check (
    bank_import_fingerprint is null
    or bank_import_fingerprint ~ '^[0-9a-f]{64}$'
  );

create unique index if not exists idx_invoice_payments_bank_import_unique
  on public.invoice_payments(organization_id, bank_import_fingerprint)
  where bank_import_fingerprint is not null;

comment on column public.invoice_payments.bank_import_fingerprint is
  'Server-computed SHA-256 fingerprint preventing duplicate bank statement reconciliation within one organization.';

create or replace function public.record_invoice_payment_atomic(
  p_organization_id uuid,
  p_invoice_id bigint,
  p_amount_cents integer,
  p_currency text,
  p_method text,
  p_paid_at date,
  p_reference text,
  p_notes text,
  p_bank_import_fingerprint text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invoice public.invoices%rowtype;
  v_payment public.invoice_payments%rowtype;
  v_paid_before bigint;
  v_paid_after bigint;
  v_total_cents bigint;
  v_status text;
begin
  select *
  into v_invoice
  from public.invoices
  where organization_id = p_organization_id
    and id = p_invoice_id
  for update;

  if not found then
    raise exception 'invoice_not_found' using errcode = 'P0002';
  end if;
  if v_invoice.status = 'cancelled' then
    raise exception 'invoice_cancelled' using errcode = 'P0001';
  end if;
  if p_currency <> v_invoice.currency then
    raise exception 'currency_mismatch' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount_cents) filter (where voided_at is null), 0)
  into v_paid_before
  from public.invoice_payments
  where organization_id = p_organization_id
    and invoice_id = p_invoice_id;

  v_total_cents := coalesce(v_invoice.total_cents, v_invoice.amount_cents, 0);
  if v_paid_before + p_amount_cents > v_total_cents then
    raise exception 'payment_exceeds_balance:%', greatest(v_total_cents - v_paid_before, 0) using errcode = 'P0001';
  end if;

  insert into public.invoice_payments (
    organization_id, invoice_id, amount_cents, currency, method, paid_at,
    reference, notes, bank_import_fingerprint
  ) values (
    p_organization_id, p_invoice_id, p_amount_cents, v_invoice.currency, p_method, p_paid_at,
    p_reference, p_notes, p_bank_import_fingerprint
  )
  returning * into v_payment;

  v_paid_after := v_paid_before + p_amount_cents;
  v_status := case
    when v_paid_after >= v_total_cents and v_total_cents > 0 then 'paid'
    when v_invoice.due_at is not null and v_invoice.due_at < current_date then 'overdue'
    else 'sent'
  end;

  update public.invoices
  set status = v_status,
      paid_at = case when v_status = 'paid' then p_paid_at else null end,
      locked_at = now()
  where organization_id = p_organization_id
    and id = p_invoice_id;

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'paidAmountCents', v_paid_after,
    'status', v_status
  );
end;
$$;

revoke all on function public.record_invoice_payment_atomic(uuid, bigint, integer, text, text, date, text, text, text) from public, anon, authenticated;
grant execute on function public.record_invoice_payment_atomic(uuid, bigint, integer, text, text, date, text, text, text) to service_role;

comment on function public.record_invoice_payment_atomic(uuid, bigint, integer, text, text, date, text, text, text) is
  'Locks one organization-scoped invoice, validates its remaining balance, records one payment and updates accounting status atomically.';
