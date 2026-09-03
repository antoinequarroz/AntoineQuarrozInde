begin;

select plan(10);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'admin_saved_views', 'quote_items', 'invoice_items', 'application_errors',
        'invoice_payments', 'project_milestones', 'project_time_entries',
        'project_notes', 'project_deliverables', 'payment_checkout_sessions',
        'recurring_invoice_profiles', 'recurring_invoice_runs'
      ])
      and c.relkind in ('r', 'p')
  ),
  12,
  'all private business tables are present after the complete migration replay'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ),
  'every public business table has row level security enabled'
);

select ok(
  not has_table_privilege('anon', 'public.invoice_payments', 'SELECT')
  and not has_table_privilege('authenticated', 'public.invoice_payments', 'SELECT'),
  'invoice payments are not readable through public Data API roles'
);

select ok(
  not has_table_privilege('anon', 'public.projects', 'SELECT')
  and not has_table_privilege('authenticated', 'public.projects', 'SELECT'),
  'projects remain accessible only through the organization-aware server API'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'portfolio_visible'
      and is_nullable = 'NO'
      and column_default = 'false'
  ),
  'new projects are private in the portfolio by default'
);

select ok(
  not has_table_privilege('anon', 'public.application_errors', 'SELECT')
  and not has_table_privilege('authenticated', 'public.application_errors', 'SELECT'),
  'application errors are not readable through public Data API roles'
);

select ok(
  not has_table_privilege('anon', 'public.recurring_invoice_profiles', 'SELECT')
  and not has_table_privilege('authenticated', 'public.recurring_invoice_profiles', 'SELECT')
  and not has_table_privilege('anon', 'public.recurring_invoice_runs', 'SELECT')
  and not has_table_privilege('authenticated', 'public.recurring_invoice_runs', 'SELECT'),
  'recurring billing automation remains server-only'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'record_invoice_payment_atomic'
      and not p.prosecdef
  ),
  'the atomic payment function remains security invoker'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.record_invoice_payment_atomic(uuid,bigint,integer,text,text,date,text,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.record_invoice_payment_atomic(uuid,bigint,integer,text,text,date,text,text,text)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.record_invoice_payment_atomic(uuid,bigint,integer,text,text,date,text,text,text)',
    'EXECUTE'
  ),
  'only the service role can execute the atomic payment function'
);

select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'invoice_payments_org_invoice_fk' and contype = 'f'
  )
  and exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'invoices_recurring_profile_org_fk' and contype = 'f'
  ),
  'critical invoice relationships retain organization-scoped foreign keys'
);

select * from finish();
rollback;
