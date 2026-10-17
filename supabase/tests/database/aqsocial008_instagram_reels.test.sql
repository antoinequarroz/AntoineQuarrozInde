begin;
select no_plan();
insert into public.organizations(id,name,slug) values
 ('00000000-0000-0000-0000-000000000e01','Reel media tests','reel-media-tests');

select ok(public.valid_social_media_items('[{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000e01/00000000-0000-0000-0000-000000000e02.mp4","alt":"Vidéo verticale EnvVault"}]','instagram'),'one immutable uploaded video is a valid Instagram Reel');
select ok(not public.valid_social_media_items('[{"type":"image","url":"https://www.antoinequarroz.ch/social/a.jpg","alt":"A"}]','instagram'),'a single image keeps its legacy image attachment path');
select ok(not public.valid_social_media_items('[{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000e01/00000000-0000-0000-0000-000000000e02.mp4","alt":"A"}]','linkedin'),'standalone videos remain Instagram-only');
select ok(not public.valid_social_media_items('[{"type":"video","url":"https://evil.example/a.mp4","alt":"A"}]','instagram'),'a Reel cannot bypass immutable storage paths');
select ok(not public.valid_social_media_items('[{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000e01/00000000-0000-0000-0000-000000000e02.mp4","alt":"A","published":true}]','instagram'),'unexpected media fields remain forbidden');

insert into public.social_posts(id,organization_id,platform,source_key,article_title,article_url,content,planned_at,media_items) values
 ('00000000-0000-0000-0000-000000000e11','00000000-0000-0000-0000-000000000e01','instagram','reel-case','Reel','https://www.antoinequarroz.ch/','Caption conservée','2026-10-20T16:30:00Z','[{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000e01/00000000-0000-0000-0000-000000000e02.mp4","alt":"Vidéo verticale EnvVault"}]');
select ok((select status='draft' and publication_mode='manual' and content='Caption conservée' and planned_at='2026-10-20T16:30:00Z' and publish_after is null and approval_fingerprint is null from public.social_posts where id='00000000-0000-0000-0000-000000000e11'),'saving a Reel preserves the draft, caption and independent desired date');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000e01','00000000-0000-0000-0000-000000000e11',1)),0::bigint,'saving a Reel never authorizes publication');
select throws_ok($$update public.social_posts set media_images='[{"url":"https://www.antoinequarroz.ch/social/a.jpg","alt":"A"}]' where id='00000000-0000-0000-0000-000000000e11'$$,'23514',null,'Reels cannot coexist with legacy image attachments');
select is((select count(*) from public.approve_social_post('00000000-0000-0000-0000-000000000e01','00000000-0000-0000-0000-000000000e11',1,'Caption relue',now()-interval '1 minute')),1::bigint,'only explicit approval permits a Reel publication');
select ok((select approval_fingerprint=public.social_post_fingerprint(social_posts) and approved_version=2 and planned_at='2026-10-20T16:30:00Z' from public.social_posts where id='00000000-0000-0000-0000-000000000e11'),'approval binds the single video and keeps its desired calendar date');
select throws_ok($$update public.social_posts set media_items=jsonb_set(media_items,'{0,alt}','"Changed"') where id='00000000-0000-0000-0000-000000000e11'$$,'23514',null,'changing the reviewed video description invalidates approval');
select throws_ok($$update public.social_posts set media_items=jsonb_set(media_items,'{0,url}','"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000e01/00000000-0000-0000-0000-000000000e03.mp4"') where id='00000000-0000-0000-0000-000000000e11'$$,'23514',null,'replacing the reviewed video invalidates approval');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000e01','00000000-0000-0000-0000-000000000e11',1)),0::bigint,'a stale Reel version cannot be claimed');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000e01','00000000-0000-0000-0000-000000000e11',2)),1::bigint,'the exact explicitly approved Reel can be claimed atomically');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000e01','00000000-0000-0000-0000-000000000e11',3)),0::bigint,'the same Reel cannot be claimed twice');
select * from finish();
rollback;
