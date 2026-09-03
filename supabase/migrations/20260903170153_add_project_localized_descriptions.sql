alter table public.projects
  add column if not exists description_en text,
  add column if not exists description_de text;

comment on column public.projects.description_en is 'Optional English portfolio description. The French description remains the fallback.';
comment on column public.projects.description_de is 'Optional German portfolio description. The French description remains the fallback.';
