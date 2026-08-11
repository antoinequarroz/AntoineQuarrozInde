alter table public.invoices
  add column if not exists reminders_paused boolean not null default false,
  add column if not exists reminder_level smallint not null default 0 check (reminder_level between 0 and 3);

create index if not exists invoices_reminders_due_idx
  on public.invoices(organization_id, reminders_paused, due_at)
  where status in ('sent', 'overdue');

comment on column public.invoices.reminders_paused is 'Operator-controlled pause for automated payment reminders.';
comment on column public.invoices.reminder_level is 'Highest overdue reminder milestone successfully sent (0..3).';
