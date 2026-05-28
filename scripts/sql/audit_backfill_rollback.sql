delete from public.audit_logs
where coalesce(payload->>'source', '') = 'backfill';
