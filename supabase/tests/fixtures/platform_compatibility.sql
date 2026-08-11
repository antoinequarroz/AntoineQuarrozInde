-- Supabase production already provides this event-trigger function. The local
-- migration replay needs only its signature so the historical privilege
-- hardening migration can be applied exactly as committed.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- No-op in the disposable preflight database.
end;
$$;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;
