alter table public.projects
  add column if not exists portfolio_visible boolean;

-- Projects were all rendered in the public portfolio before this column
-- existed. Preserve that behaviour during the compatibility release so the
-- previous image remains a safe rollback target.
update public.projects
set portfolio_visible = true
where portfolio_visible is null;

alter table public.projects
  alter column portfolio_visible set default true,
  alter column portfolio_visible set not null;

create index if not exists idx_projects_portfolio_visible
  on public.projects(organization_id, portfolio_visible)
  where portfolio_visible = true;

comment on column public.projects.portfolio_visible is
  'Controls whether the project card is rendered in the public portfolio. Kept true until the activation release.';
