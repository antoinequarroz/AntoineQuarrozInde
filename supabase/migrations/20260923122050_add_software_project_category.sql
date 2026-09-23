alter table public.projects
  drop constraint if exists projects_category_check,
  drop constraint if exists projects_category_allowed;

alter table public.projects
  add constraint projects_category_allowed
  check (category in ('web', 'mobile', 'cms', 'software')) not valid;

alter table public.projects
  validate constraint projects_category_allowed;

update public.projects
set category = 'software'
where slug = 'hermes-cockpit'
  and category = 'mobile';
