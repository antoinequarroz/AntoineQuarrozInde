begin;
select plan(8);
insert into public.organizations (id,name,slug) values ('00000000-0000-0000-0000-000000000901','Image tests','image-tests');
insert into public.social_posts (id,organization_id,platform,source_key,article_title,article_url,content,status,media_images)
values ('00000000-0000-0000-0000-000000000911','00000000-0000-0000-0000-000000000901','linkedin','images','Images','https://www.antoinequarroz.ch/','Caption','approved','[{"url":"https://www.antoinequarroz.ch/social/01.jpg","alt":"Home"}]');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000901','00000000-0000-0000-0000-000000000911',1)),0::bigint,'approved images cannot be claimed');
select throws_ok($$update public.social_posts set publish_after=now() where id='00000000-0000-0000-0000-000000000911'$$,'23514',null,'images cannot be scheduled');
select throws_ok($$update public.social_posts set status='publishing' where id='00000000-0000-0000-0000-000000000911'$$,'23514',null,'images cannot publish automatically');
select ok(not public.valid_social_images('[{"url":"https://example.com/a.jpg"}]','linkedin'),'alt required');
select ok(not public.valid_social_images('{}','linkedin'),'array required');
select ok(not public.valid_social_images('[{"url":"https://example.com/a.jpg","alt":"a"},{"url":"https://example.com/a.jpg","alt":"b"}]','linkedin'),'duplicates rejected');
select ok(public.valid_social_images('[]','x'),'empty attachments valid');
select ok(not has_table_privilege('authenticated','public.social_posts','UPDATE'),'browser cannot bypass review endpoints');
select * from finish();
rollback;
