with ins_clients as (
  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, client_id, payload, created_at)
  select c.organization_id, null::uuid, 'client_created', 'client', c.id::text, c.id,
         jsonb_build_object('source','backfill','table','clients'),
         coalesce(c.created_at, now())
  from public.clients c
  where not exists (
    select 1 from public.audit_logs a
    where a.organization_id = c.organization_id
      and a.action = 'client_created'
      and a.entity_type = 'client'
      and a.entity_id = c.id::text
      and coalesce(a.payload->>'source','') = 'backfill'
  )
  returning 1
),
ins_tasks as (
  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, client_id, payload, created_at)
  select t.organization_id, null::uuid, 'task_created', 'task', t.id::text, t.client_id,
         jsonb_build_object('source','backfill','table','tasks'),
         coalesce(t.created_at, now())
  from public.tasks t
  where not exists (
    select 1 from public.audit_logs a
    where a.organization_id = t.organization_id
      and a.action = 'task_created'
      and a.entity_type = 'task'
      and a.entity_id = t.id::text
      and coalesce(a.payload->>'source','') = 'backfill'
  )
  returning 1
),
ins_quotes as (
  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, client_id, payload, created_at)
  select q.organization_id, null::uuid, 'quote_created', 'quote', q.id::text, q.client_id,
         jsonb_build_object('source','backfill','table','quotes'),
         coalesce(q.created_at, now())
  from public.quotes q
  where not exists (
    select 1 from public.audit_logs a
    where a.organization_id = q.organization_id
      and a.action = 'quote_created'
      and a.entity_type = 'quote'
      and a.entity_id = q.id::text
      and coalesce(a.payload->>'source','') = 'backfill'
  )
  returning 1
),
ins_invoices as (
  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, client_id, payload, created_at)
  select i.organization_id, null::uuid, 'invoice_created', 'invoice', i.id::text, i.client_id,
         jsonb_build_object('source','backfill','table','invoices'),
         coalesce(i.created_at, now())
  from public.invoices i
  where not exists (
    select 1 from public.audit_logs a
    where a.organization_id = i.organization_id
      and a.action = 'invoice_created'
      and a.entity_type = 'invoice'
      and a.entity_id = i.id::text
      and coalesce(a.payload->>'source','') = 'backfill'
  )
  returning 1
),
ins_appointments as (
  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, client_id, payload, created_at)
  select ap.organization_id, null::uuid, 'appointment_created', 'appointment', ap.id::text, ap.client_id,
         jsonb_build_object('source','backfill','table','appointments'),
         coalesce(ap.created_at, now())
  from public.appointments ap
  where not exists (
    select 1 from public.audit_logs a
    where a.organization_id = ap.organization_id
      and a.action = 'appointment_created'
      and a.entity_type = 'appointment'
      and a.entity_id = ap.id::text
      and coalesce(a.payload->>'source','') = 'backfill'
  )
  returning 1
)
select
  (select count(*) from ins_clients) as clients_inserted,
  (select count(*) from ins_tasks) as tasks_inserted,
  (select count(*) from ins_quotes) as quotes_inserted,
  (select count(*) from ins_invoices) as invoices_inserted,
  (select count(*) from ins_appointments) as appointments_inserted;
