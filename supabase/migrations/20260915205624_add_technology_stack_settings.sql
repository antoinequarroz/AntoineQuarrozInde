create table if not exists public.technology_stack_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  draft_items jsonb not null default '[]'::jsonb,
  published_items jsonb not null default '[]'::jsonb,
  draft_revision bigint not null default 1 check (draft_revision > 0),
  published_revision bigint not null default 1 check (published_revision > 0),
  updated_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  constraint technology_stack_draft_array_check check (
    jsonb_typeof(draft_items) = 'array'
    and jsonb_array_length(draft_items) <= 40
  ),
  constraint technology_stack_published_array_check check (
    jsonb_typeof(published_items) = 'array'
    and jsonb_array_length(published_items) <= 40
  )
);

comment on table public.technology_stack_settings is
  'Tenant-scoped draft and published technology stack documents.';
comment on column public.technology_stack_settings.draft_items is
  'Private editable document; never returned by public endpoints.';
comment on column public.technology_stack_settings.published_items is
  'Last explicitly published document used by public pages.';

alter table public.technology_stack_settings enable row level security;
revoke all on table public.technology_stack_settings from public, anon, authenticated;
grant all on table public.technology_stack_settings to service_role;

with initial_stack(items) as (
  values ('[
    {"key":"vue-3","label":"Vue 3","icon":"vue","level":"used","showAbout":true,"showFooter":true,"position":0},
    {"key":"nuxt","label":"Nuxt","icon":"nuxt","level":"used","showAbout":true,"showFooter":true,"position":1},
    {"key":"react","label":"React","icon":"react","level":"used","showAbout":true,"showFooter":true,"position":2},
    {"key":"next-js","label":"Next.js","icon":"nextjs","level":"used","showAbout":true,"showFooter":true,"position":3},
    {"key":"typescript","label":"TypeScript","icon":"typescript","level":"used","showAbout":true,"showFooter":false,"position":4},
    {"key":"swiftui","label":"SwiftUI","icon":"swiftui","level":"used","showAbout":true,"showFooter":true,"position":5},
    {"key":"flutter","label":"Flutter","icon":"flutter","level":"used","showAbout":true,"showFooter":true,"position":6},
    {"key":"dart","label":"Dart","icon":"dart","level":"used","showAbout":true,"showFooter":true,"position":7},
    {"key":"rust","label":"Rust","icon":"rust","level":"used","showAbout":true,"showFooter":true,"position":8},
    {"key":"supabase","label":"Supabase","icon":"supabase","level":"used","showAbout":true,"showFooter":true,"position":9},
    {"key":"postgresql","label":"PostgreSQL","icon":"postgresql","level":"used","showAbout":true,"showFooter":false,"position":10},
    {"key":"node-js","label":"Node.js","icon":"nodejs","level":"used","showAbout":true,"showFooter":false,"position":11},
    {"key":"three-js","label":"Three.js","icon":"threejs","level":"used","showAbout":true,"showFooter":false,"position":12},
    {"key":"figma","label":"Figma","icon":"figma","level":"used","showAbout":true,"showFooter":false,"position":13},
    {"key":"git","label":"Git","icon":"git","level":"used","showAbout":true,"showFooter":false,"position":14},
    {"key":"github","label":"GitHub","icon":"github","level":"used","showAbout":true,"showFooter":false,"position":15},
    {"key":"docker","label":"Docker","icon":"docker","level":"used","showAbout":true,"showFooter":false,"position":16},
    {"key":"stripe","label":"Stripe","icon":"stripe","level":"used","showAbout":true,"showFooter":false,"position":17},
    {"key":"cloudflare","label":"Cloudflare","icon":"cloudflare","level":"used","showAbout":true,"showFooter":false,"position":18},
    {"key":"caddy","label":"Caddy","icon":"caddy","level":"used","showAbout":true,"showFooter":false,"position":19}
  ]'::jsonb)
)
insert into public.technology_stack_settings (
  organization_id,
  draft_items,
  published_items
)
select organizations.id, initial_stack.items, initial_stack.items
from public.organizations
cross join initial_stack
on conflict (organization_id) do nothing;
