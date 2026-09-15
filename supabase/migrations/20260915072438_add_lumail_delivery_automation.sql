alter table public.clients
  add column if not exists preferred_locale text not null default 'fr'
    check (preferred_locale in ('fr', 'en', 'de')),
  add column if not exists marketing_opt_out_at timestamptz;

create table if not exists public.email_delivery_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  automation_enabled boolean not null default true,
  quote_offsets integer[] not null default '{3,0}',
  invoice_offsets integer[] not null default '{2,0,-3,-10,-20}',
  updated_at timestamptz not null default now(),
  check (cardinality(quote_offsets) between 1 and 5),
  check (cardinality(invoice_offsets) between 1 and 8),
  check (quote_offsets <@ array[0,1,2,3,5,7,10,14]),
  check (invoice_offsets <@ array[-60,-45,-30,-20,-14,-10,-7,-5,-3,-1,0,1,2,3,5,7,10,14])
);

create table if not exists public.email_deliveries (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id bigint,
  category text not null check (category in ('transactional', 'marketing')),
  template_key text not null check (template_key in ('quote_available', 'invoice_available', 'payment_received', 'quote_reminder', 'invoice_reminder')),
  locale text not null check (locale in ('fr', 'en', 'de')),
  recipient text not null check (length(recipient) between 3 and 320),
  entity_type text check (entity_type in ('quote', 'invoice', 'payment')),
  entity_id text,
  idempotency_key text not null check (length(idempotency_key) between 1 and 256),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'uncertain', 'suppressed')),
  provider_id text,
  attempt_count smallint not null default 1 check (attempt_count between 1 and 20),
  error_code text check (error_code in ('not_configured', 'provider_rejected', 'network_error', 'timeout_ambiguous', 'marketing_opt_out', 'no_longer_eligible', 'unknown')),
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  send_claimed_at timestamptz,
  sent_at timestamptz,
  constraint email_deliveries_org_key_unique unique (organization_id, idempotency_key),
  constraint email_deliveries_client_tenant_fk foreign key (organization_id, client_id)
    references public.clients(organization_id, id) on delete set null (client_id),
  check ((status = 'sent') = (sent_at is not null)),
  check (status <> 'sent' or provider_id is not null)
);

create index if not exists email_deliveries_org_created_idx
  on public.email_deliveries(organization_id, created_at desc);
create index if not exists email_deliveries_org_status_idx
  on public.email_deliveries(organization_id, status, created_at desc);

alter table public.email_delivery_settings enable row level security;
alter table public.email_deliveries enable row level security;
revoke all on table public.email_delivery_settings, public.email_deliveries from anon, authenticated;
grant all on table public.email_delivery_settings, public.email_deliveries to service_role;
grant usage, select on sequence public.email_deliveries_id_seq to service_role;

create or replace function public.claim_email_reminder_delivery(
  p_organization_id uuid,
  p_delivery_id bigint,
  p_retry boolean default false,
  p_expected_due_date date default null
)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_delivery public.email_deliveries%rowtype;
  v_eligible boolean := false;
begin
  select * into v_delivery
  from public.email_deliveries
  where organization_id = p_organization_id and id = p_delivery_id
  for update;

  if not found
    or v_delivery.template_key not in ('quote_reminder', 'invoice_reminder')
    or v_delivery.entity_id is null
    or v_delivery.entity_id !~ '^[0-9]+$'
    or (p_retry and (v_delivery.status <> 'failed' or v_delivery.attempt_count >= 20))
    or (not p_retry and (v_delivery.status <> 'pending' or v_delivery.send_claimed_at is not null)) then
    return 'conflict';
  end if;

  if v_delivery.template_key = 'quote_reminder' then
    select exists (
      select 1
      from public.quotes q
      join public.clients c
        on c.organization_id = q.organization_id and c.id = q.client_id
      where q.organization_id = p_organization_id
        and q.id = v_delivery.entity_id::bigint
        and q.client_id = v_delivery.client_id
        and q.status = 'sent'
        and (p_expected_due_date is null or q.valid_until = p_expected_due_date)
        and lower(trim(c.email)) = lower(trim(v_delivery.recipient))
    ) into v_eligible;
  else
    select exists (
      select 1
      from public.invoices i
      join public.clients c
        on c.organization_id = i.organization_id and c.id = i.client_id
      where i.organization_id = p_organization_id
        and i.id = v_delivery.entity_id::bigint
        and i.client_id = v_delivery.client_id
        and i.status in ('sent', 'overdue')
        and not coalesce(i.reminders_paused, false)
        and (p_expected_due_date is null or i.due_at = p_expected_due_date)
        and lower(trim(c.email)) = lower(trim(v_delivery.recipient))
        and coalesce(i.total_cents, i.amount_cents, 0) > coalesce((
          select sum(ip.amount_cents)
          from public.invoice_payments ip
          where ip.organization_id = p_organization_id
            and ip.invoice_id = i.id
            and ip.voided_at is null
        ), 0)
    ) into v_eligible;
  end if;

  if not v_eligible then
    update public.email_deliveries
    set status = 'suppressed', error_code = 'no_longer_eligible', last_attempt_at = now()
    where organization_id = p_organization_id and id = p_delivery_id;
    return 'ineligible';
  end if;

  update public.email_deliveries
  set status = 'pending',
      error_code = null,
      last_attempt_at = now(),
      send_claimed_at = now(),
      attempt_count = case when p_retry then attempt_count + 1 else attempt_count end
  where organization_id = p_organization_id and id = p_delivery_id;
  return 'claimed';
end;
$$;

revoke all on function public.claim_email_reminder_delivery(uuid, bigint, boolean, date) from public, anon, authenticated;
grant execute on function public.claim_email_reminder_delivery(uuid, bigint, boolean, date) to service_role;

comment on table public.email_deliveries is 'Tenant-scoped Lumail delivery metadata. Email bodies and provider errors are deliberately excluded.';
comment on column public.email_deliveries.error_code is 'Closed operational code; never a raw provider response or stack trace.';
comment on column public.email_deliveries.send_claimed_at is 'Linearization boundary: the reminder became eligible and its provider send started logically.';
