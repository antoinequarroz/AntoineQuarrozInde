begin;
select no_plan();
insert into public.organizations(id,name,slug) values
 ('00000000-0000-0000-0000-000000000a01','Automatic media tests','automatic-media-tests'),
 ('00000000-0000-0000-0000-000000000a02','Other automatic media tenant','other-automatic-media');

select ok(not has_function_privilege('anon','public.approve_social_post(uuid,uuid,integer,text,timestamptz)','EXECUTE')
 and not has_function_privilege('authenticated','public.approve_social_post(uuid,uuid,integer,text,timestamptz)','EXECUTE')
 and has_function_privilege('service_role','public.approve_social_post(uuid,uuid,integer,text,timestamptz)','EXECUTE'),
 'only the backend can approve automatic publication');
select ok((select not prosecdef from pg_proc where oid='public.approve_social_post(uuid,uuid,integer,text,timestamptz)'::regprocedure),
 'approval remains security invoker');
select ok(not has_function_privilege('authenticated','public.social_post_fingerprint(public.social_posts)','EXECUTE'),
 'fingerprinting is private to the backend');

insert into public.social_posts(id,organization_id,platform,source_key,article_title,article_url,content,media_images)
select id::uuid,'00000000-0000-0000-0000-000000000a01',platform,source_key,'Test',
 'https://www.antoinequarroz.ch/','Caption',images::jsonb
from (values
 ('00000000-0000-0000-0000-000000000a11','linkedin','li-carousel','[{"url":"https://www.antoinequarroz.ch/social/01.jpg","alt":"Café ☕"},{"url":"https://www.antoinequarroz.ch/social/02.jpg","alt":"Contact"}]'),
 ('00000000-0000-0000-0000-000000000a12','x','x-image','[{"url":"https://www.antoinequarroz.ch/social/x.jpg","alt":"Example"}]'),
 ('00000000-0000-0000-0000-000000000a13','instagram','ig-carousel','[{"url":"https://www.antoinequarroz.ch/social/01.jpg","alt":"Example"},{"url":"https://www.antoinequarroz.ch/social/02.jpg","alt":"Contact"}]'),
 ('00000000-0000-0000-0000-000000000a14','instagram','ig-text','[]'),
 ('00000000-0000-0000-0000-000000000a15','linkedin','li-pdf','[]'),
 ('00000000-0000-0000-0000-000000000a16','linkedin','li-text','[]'),
 ('00000000-0000-0000-0000-000000000a17','linkedin','li-manual','[{"url":"https://www.antoinequarroz.ch/social/01.jpg","alt":"Example"}]'),
 ('00000000-0000-0000-0000-000000000a18','instagram','ig-manual','[{"url":"https://www.antoinequarroz.ch/social/01.jpg","alt":"Example"}]'),
 ('00000000-0000-0000-0000-000000000a19','linkedin','li-future','[]')
) as fixtures(id,platform,source_key,images);
update public.social_posts set media_kind='document',media_url='https://www.antoinequarroz.ch/social/test.pdf',media_title='PDF'
where id='00000000-0000-0000-0000-000000000a15';
update public.social_posts set status='approved' where id in
 ('00000000-0000-0000-0000-000000000a17','00000000-0000-0000-0000-000000000a18');

select is((select count(*) from public.social_posts where publication_mode='manual' and approved_version is null and approval_fingerprint is null),9::bigint,
 'new and manually approved image posts carry no implicit automatic consent');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a17',1)),0::bigint,
 'legacy LinkedIn image review cannot be claimed');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a18',1)),0::bigint,
 'legacy Instagram image review cannot be claimed');
select throws_ok($$update public.social_posts set publication_mode='automatic',publish_after=now() where id='00000000-0000-0000-0000-000000000a17'$$,
 '23514',null,'switching the mode without content-bound approval is rejected');

select is((select count(*) from public.approve_social_post('00000000-0000-0000-0000-000000000a02','00000000-0000-0000-0000-000000000a11',1,'Un café ☕',now())),0::bigint,
 'foreign tenant cannot approve an existing post');
select is((select count(*) from public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a11',2,'Un café ☕',now())),0::bigint,
 'stale approval version is rejected');
select throws_ok($$select * from public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a11',1,'Un café ☕',null)$$,
 '22023','Automatic publication requires a schedule','automatic approval requires explicit timing');
select throws_ok($$select * from public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a14',1,'Instagram text',now())$$,
 '22023','Instagram automatic publication requires media','Instagram text-only stays manual');

select is((select count(*) from public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a11',1,'Un café ☕',now()-interval '1 minute')),1::bigint,
 'explicit carousel approval atomically succeeds');
select is((select publication_mode from public.social_posts where id='00000000-0000-0000-0000-000000000a11'),'automatic',
 'approved image post is marked for automatic publication');
select ok((select version=2 and approved_version=2 and length(approval_fingerprint)=64 from public.social_posts where id='00000000-0000-0000-0000-000000000a11'),
 'approval binds the new revision and fingerprint');
select is((select approval_fingerprint from public.social_posts where id='00000000-0000-0000-0000-000000000a11'),
 'accb88a3650e1fa5975da0609181160cab6cee9ad89a46c6dc0920d844f064d7',
 'fingerprint matches the independent UTF-8 length-prefixed SHA256 test vector');
select is((select count(*) from public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a11',2,'Replacement',now())),0::bigint,
 'an automatic approved item cannot be silently reapproved');
select throws_ok($$update public.social_posts set content='Edited after approval' where id='00000000-0000-0000-0000-000000000a11'$$,
 '23514',null,'editing the caption invalidates approval');
select throws_ok($$update public.social_posts set media_images=jsonb_set(media_images,'{0,alt}','"Edited alt"') where id='00000000-0000-0000-0000-000000000a11'$$,
 '23514',null,'editing image alt text invalidates approval');
select throws_ok($$update public.social_posts set media_images=jsonb_build_array(media_images->1,media_images->0) where id='00000000-0000-0000-0000-000000000a11'$$,
 '23514',null,'reordering carousel images invalidates approval');
select throws_ok($$update public.social_posts set article_url='https://www.antoinequarroz.ch/projets/physiobaur' where id='00000000-0000-0000-0000-000000000a11'$$,
 '23514',null,'editing the destination invalidates approval');
select throws_ok($$update public.social_posts set approval_fingerprint=null where id='00000000-0000-0000-0000-000000000a11'$$,
 '23514',null,'clearing the fingerprint cannot bypass approval');
select throws_ok($$update public.social_posts set organization_id='00000000-0000-0000-0000-000000000a02' where id='00000000-0000-0000-0000-000000000a11'$$,
 '23514',null,'moving the post to another tenant invalidates approval');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a02','00000000-0000-0000-0000-000000000a11',2)),0::bigint,
 'foreign tenant cannot claim an approved image post');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a11',1)),0::bigint,
 'stale claim version is rejected');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a11',2)),1::bigint,
 'explicitly approved carousel is claimable once');
select ok((select version=3 and approved_version=2 and approval_fingerprint=public.social_post_fingerprint(social_posts) from public.social_posts where id='00000000-0000-0000-0000-000000000a11'),
 'claim preserves the approved payload while advancing its concurrency version');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a11',3)),0::bigint,
 'publishing rows cannot be reclaimed after a retry');

select is((select count(*) from public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a17',1,'Explicitly approved now',now())),1::bigint,
 'manual approval can become automatic only through a fresh explicit approval');
do $$begin
 perform public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a12',1,'X image',now());
 perform public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a13',1,'Instagram carousel',now());
 perform public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a15',1,'LinkedIn PDF',now());
 perform public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a16',1,'LinkedIn text',now());
 perform public.approve_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a19',1,'Future publication',now()+interval '1 hour');
end$$;
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a12',2)),1::bigint,'X images can publish after explicit approval');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a13',2)),1::bigint,'Instagram carousels can publish after explicit approval');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a15',2)),1::bigint,'LinkedIn PDF publication remains supported');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a16',2)),1::bigint,'LinkedIn text publication remains supported');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000a01','00000000-0000-0000-0000-000000000a19',2)),0::bigint,'future publication cannot be claimed early');
select lives_ok($$insert into public.social_platform_connections(organization_id,platform,state,message) values('00000000-0000-0000-0000-000000000a01','instagram','ready','Image publishing connected')$$,
 'Instagram readiness can be reported with existing connection isolation');
select * from finish();
rollback;
