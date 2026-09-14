begin;

select plan(18);

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and tablename = 'invoices'
      and indexname = 'invoices_organization_quote_unique'
      and indexdef like '%UNIQUE INDEX%'
      and indexdef like '%(organization_id, quote_id)%'
      and indexdef like '%quote_id IS NOT NULL%'
  ),
  'one tenant quote can be linked to at most one invoice'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'convert_quote_to_invoice_atomic'
      and not p.prosecdef
      and coalesce(array_to_string(p.proconfig, ','), '')
        in ('search_path=', 'search_path=""')
  ),
  'quote conversion is security invoker with an empty search path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.convert_quote_to_invoice_atomic(uuid,bigint)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.convert_quote_to_invoice_atomic(uuid,bigint)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.convert_quote_to_invoice_atomic(uuid,bigint)',
    'EXECUTE'
  ),
  'only the service role can execute quote conversion'
);

insert into public.organizations (id, name, slug)
values
  ('00000000-0000-0000-0000-000000009064', 'AQ-064 tenant A', 'aq-064-tenant-a'),
  ('00000000-0000-0000-0000-000000019064', 'AQ-064 tenant B', 'aq-064-tenant-b');

insert into public.clients (organization_id, name, email)
values
  ('00000000-0000-0000-0000-000000009064', 'Client A', 'client-a@aq064.test'),
  ('00000000-0000-0000-0000-000000019064', 'Client B', 'client-b@aq064.test');

insert into public.quotes (
  organization_id, client_id, number, title, amount_cents, currency, status,
  issued_at, valid_until, notes, subtotal_cents, tax_cents, total_cents
)
values
  (
    '00000000-0000-0000-0000-000000009064',
    (select id from public.clients where email = 'client-a@aq064.test'),
    'DEV-2026-9064', 'Sent quote', 10810, 'CHF', 'sent',
    current_date, current_date + 30, 'Paiement : 15 jours', 10000, 810, 10810
  ),
  (
    '00000000-0000-0000-0000-000000009064',
    (select id from public.clients where email = 'client-a@aq064.test'),
    'DEV-2026-9065', 'Draft quote', 1000, 'CHF', 'draft',
    current_date, current_date + 30, null, 1000, 0, 1000
  ),
  (
    '00000000-0000-0000-0000-000000009064',
    (select id from public.clients where email = 'client-a@aq064.test'),
    'DEV-2026-9066', 'Rejected quote', 1000, 'CHF', 'rejected',
    current_date, current_date + 30, null, 1000, 0, 1000
  ),
  (
    '00000000-0000-0000-0000-000000009064',
    (select id from public.clients where email = 'client-a@aq064.test'),
    'DEV-2026-9067', 'Atomic failure quote', 1000, 'CHF', 'sent',
    current_date, current_date + 30, null, 1000, 0, 1000
  );

insert into public.quote_items (
  organization_id, quote_id, position, label, description,
  quantity, unit_price_cents, tax_rate, total_cents
)
values
  (
    '00000000-0000-0000-0000-000000009064',
    (select id from public.quotes where number = 'DEV-2026-9064'),
    0, 'Audit', 'Audit UX', 1, 4000, 8.1, 4324
  ),
  (
    '00000000-0000-0000-0000-000000009064',
    (select id from public.quotes where number = 'DEV-2026-9064'),
    1, 'Développement', null, 1, 6000, 8.1, 6486
  ),
  (
    '00000000-0000-0000-0000-000000009064',
    (select id from public.quotes where number = 'DEV-2026-9067'),
    0, 'FAIL_ATOMIC', null, 1, 1000, 0, 1000
  );

select throws_ok(
  $$
    select public.convert_quote_to_invoice_atomic(
      '00000000-0000-0000-0000-000000019064',
      (select id from public.quotes where number = 'DEV-2026-9064')
    )
  $$,
  'P0002',
  null,
  'a quote cannot be converted through another tenant'
);

select throws_ok(
  $$
    select public.convert_quote_to_invoice_atomic(
      '00000000-0000-0000-0000-000000009064',
      (select id from public.quotes where number = 'DEV-2026-9065')
    )
  $$,
  'P0001',
  null,
  'a draft quote cannot be converted'
);

select throws_ok(
  $$
    select public.convert_quote_to_invoice_atomic(
      '00000000-0000-0000-0000-000000009064',
      (select id from public.quotes where number = 'DEV-2026-9066')
    )
  $$,
  'P0001',
  null,
  'a rejected quote cannot be converted'
);

select is(
  (
    public.convert_quote_to_invoice_atomic(
      '00000000-0000-0000-0000-000000009064',
      (select id from public.quotes where number = 'DEV-2026-9064')
    )->>'created'
  )::boolean,
  true,
  'the first confirmed conversion creates an invoice'
);

select is(
  (select status from public.quotes where number = 'DEV-2026-9064'),
  'accepted',
  'the quote is accepted in the same operation'
);

select is(
  (
    select row(amount_cents, subtotal_cents, tax_cents, total_cents, currency)
    from public.invoices
    where quote_id = (select id from public.quotes where number = 'DEV-2026-9064')
  ),
  row(10810, 10000, 810, 10810, 'CHF'::text),
  'financial values are copied from the quote'
);

select is(
  (
    select due_at - issued_at
    from public.invoices
    where quote_id = (select id from public.quotes where number = 'DEV-2026-9064')
  ),
  15,
  'bounded payment terms are preserved'
);

select is(
  (
    select count(*)::integer
    from public.invoice_items
    where invoice_id = (
      select id from public.invoices
      where quote_id = (select id from public.quotes where number = 'DEV-2026-9064')
    )
  ),
  2,
  'all quote lines are copied once'
);

select is(
  (
    public.convert_quote_to_invoice_atomic(
      '00000000-0000-0000-0000-000000009064',
      (select id from public.quotes where number = 'DEV-2026-9064')
    )->>'created'
  )::boolean,
  false,
  'a repeated conversion returns the existing invoice'
);

select is(
  (
    public.convert_quote_to_invoice_atomic(
      '00000000-0000-0000-0000-000000009064',
      (select id from public.quotes where number = 'DEV-2026-9064')
    )->'invoice'->>'id'
  )::bigint,
  (
    select id from public.invoices
    where quote_id = (select id from public.quotes where number = 'DEV-2026-9064')
  ),
  'a repeated conversion returns the same invoice id'
);

select is(
  (
    select count(*)::integer
    from public.invoices
    where quote_id = (select id from public.quotes where number = 'DEV-2026-9064')
  ),
  1,
  'only one invoice exists for the quote'
);

select throws_ok(
  $$
    insert into public.invoices (
      organization_id, client_id, quote_id, number, amount_cents, currency
    ) values (
      '00000000-0000-0000-0000-000000009064',
      (select id from public.clients where email = 'client-a@aq064.test'),
      (select id from public.quotes where number = 'DEV-2026-9064'),
      'FAC-2026-9999', 10810, 'CHF'
    )
  $$,
  '23505',
  null,
  'the database rejects a second invoice for one quote'
);

create function pg_temp.reject_atomic_test_item()
returns trigger
language plpgsql
as $$
begin
  if new.label = 'FAIL_ATOMIC' then
    raise exception 'forced_item_failure';
  end if;
  return new;
end;
$$;

create trigger reject_atomic_test_item
before insert on public.invoice_items
for each row execute function pg_temp.reject_atomic_test_item();

select throws_ok(
  $$
    select public.convert_quote_to_invoice_atomic(
      '00000000-0000-0000-0000-000000009064',
      (select id from public.quotes where number = 'DEV-2026-9067')
    )
  $$,
  'P0001',
  null,
  'an item failure aborts the conversion'
);

select is(
  (
    select count(*)::integer
    from public.invoices
    where quote_id = (select id from public.quotes where number = 'DEV-2026-9067')
  ),
  0,
  'an item failure leaves no partial invoice'
);

select is(
  (select status from public.quotes where number = 'DEV-2026-9067'),
  'sent',
  'an item failure leaves the quote unchanged'
);

select * from finish();
rollback;
