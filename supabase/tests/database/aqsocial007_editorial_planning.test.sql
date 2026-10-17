begin;
select no_plan();

select has_column('public', 'social_posts', 'planned_at', 'social drafts expose independent editorial intent');
select col_type_is('public', 'social_posts', 'planned_at', 'timestamp with time zone', 'editorial instants retain an explicit timezone');
select ok(not has_table_privilege('anon', 'public.social_posts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.social_posts', 'UPDATE'),
  'editorial planning does not expose the private queue to browser roles');

insert into public.organizations(id, name, slug) values
  ('00000000-0000-0000-0000-000000000c01', 'Editorial planning tests', 'editorial-planning-tests');
insert into public.social_posts(id, organization_id, platform, source_key, article_title, article_url, content)
values ('00000000-0000-0000-0000-000000000c11', '00000000-0000-0000-0000-000000000c01', 'x',
  'editorial-planning-example', 'Example', 'https://www.antoinequarroz.ch/', 'Original text');

select is((select planned_at from public.social_posts where id='00000000-0000-0000-0000-000000000c11'), null::timestamptz,
  'existing draft behavior starts without a guessed editorial date');
update public.social_posts set planned_at=now()-interval '1 hour', version=2
where id='00000000-0000-0000-0000-000000000c11';
select ok((select status='draft' and content='Original text' and publication_mode='manual'
  and publish_after is null and approved_version is null and approval_fingerprint is null
  from public.social_posts where id='00000000-0000-0000-0000-000000000c11'),
  'a due editorial date preserves content and carries no publishing consent');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000c01',
  '00000000-0000-0000-0000-000000000c11', 2)), 0::bigint, 'the publisher cannot claim a draft merely because its plan is due');

select is((select count(*) from public.approve_social_post('00000000-0000-0000-0000-000000000c01',
  '00000000-0000-0000-0000-000000000c11', 2, 'Reviewed text', now()+interval '3 days')), 1::bigint,
  'the existing explicit approval still accepts a chosen future instant');
select ok((select planned_at < now() and publish_after > now() and status='approved'
  and approval_fingerprint=public.social_post_fingerprint(social_posts)
  from public.social_posts where id='00000000-0000-0000-0000-000000000c11'),
  'editorial intent remains independent from the approved publication time and fingerprint');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000c01',
  '00000000-0000-0000-0000-000000000c11', 3)), 0::bigint,
  'a past editorial plan cannot advance the actual approved schedule');

select * from finish();
rollback;
