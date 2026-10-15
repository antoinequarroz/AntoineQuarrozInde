begin;
select plan(14);
insert into public.organizations (id, name, slug) values
 ('00000000-0000-0000-0000-000000000801', 'Instagram test', 'ig-test'),
 ('00000000-0000-0000-0000-000000000802', 'Other Instagram test', 'ig-other-test');
select ok(not has_table_privilege('anon','public.social_insights','SELECT') and not has_table_privilege('authenticated','public.social_insights','SELECT'), 'native statistics cannot be read by browser roles');
select ok((select relrowsecurity from pg_class where oid='public.social_insights'::regclass), 'snapshot RLS is enabled');
select ok(not has_function_privilege('authenticated','public.store_instagram_insight(uuid,timestamptz,jsonb)','EXECUTE') and has_function_privilege('service_role','public.store_instagram_insight(uuid,timestamptz,jsonb)','EXECUTE'), 'only backend can store observations');
select ok((select not prosecdef from pg_proc where oid='public.store_instagram_insight(uuid,timestamptz,jsonb)'::regprocedure), 'observation RPC is security invoker');
select lives_ok($$insert into public.social_posts(id,organization_id,platform,source_key,article_title,article_url,content,status)
values('00000000-0000-0000-0000-000000000811','00000000-0000-0000-0000-000000000801','instagram','studio-test','Test','https://www.antoinequarroz.ch/','Corrected by Antoine','approved')$$, 'Instagram text may be approved without scheduling');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000801','00000000-0000-0000-0000-000000000811',1)),0::bigint,'Instagram cannot be claimed for automatic publishing');
select throws_ok($$update public.social_posts set publish_after=now() where id='00000000-0000-0000-0000-000000000811'$$,'23514',null,'Instagram cannot acquire a publication schedule');
select throws_ok($$update public.social_posts set status='publishing' where id='00000000-0000-0000-0000-000000000811'$$,'23514',null,'Instagram cannot enter automatic publishing');
insert into public.social_posts(organization_id,platform,source_key,article_title,article_url,content,status) values('00000000-0000-0000-0000-000000000801','instagram','studio-test','Reimport','https://www.antoinequarroz.ch/','Stale studio caption','draft') on conflict(organization_id,platform,source_key) do nothing;
select is((select content from public.social_posts where id='00000000-0000-0000-0000-000000000811'),'Corrected by Antoine','reimport never overwrites edited caption');
select is((select status from public.social_posts where id='00000000-0000-0000-0000-000000000811'),'approved','reimport never undoes text approval');
select public.store_instagram_insight('00000000-0000-0000-0000-000000000801','2026-10-14T14:00:00Z','{"metrics":{"reach":1333}}');
select public.store_instagram_insight('00000000-0000-0000-0000-000000000801','2026-10-14T13:00:00Z','{"metrics":{"reach":0}}');
select is((select snapshot #>> '{metrics,reach}' from public.social_insights where organization_id='00000000-0000-0000-0000-000000000801'),'1333','out-of-order delivery preserves newer observation');
select is((select count(*) from public.social_insights where organization_id='00000000-0000-0000-0000-000000000802'),0::bigint,'foreign tenant has no observation');
insert into public.social_posts(id,organization_id,platform,source_key,article_title,article_url,content) values('00000000-0000-0000-0000-000000000812','00000000-0000-0000-0000-000000000801','linkedin','li-test','LinkedIn','https://www.antoinequarroz.ch/','Approved LinkedIn');
do $$begin perform public.approve_social_post('00000000-0000-0000-0000-000000000801','00000000-0000-0000-0000-000000000812',1,'Approved LinkedIn',now()-interval '1 minute'); end$$;
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000802','00000000-0000-0000-0000-000000000812',2)),0::bigint,'other tenant cannot claim publication');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000801','00000000-0000-0000-0000-000000000812',2)),1::bigint,'existing LinkedIn publisher still works with an explicit approval');
select * from finish();
rollback;
