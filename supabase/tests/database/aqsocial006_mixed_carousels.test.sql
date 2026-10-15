begin;
select no_plan();
insert into public.organizations(id,name,slug) values
 ('00000000-0000-0000-0000-000000000b01','Mixed media tests','mixed-media-tests');

select ok(public.valid_social_media_items('[]','linkedin'),'legacy platforms retain empty media_items');
select ok(not public.valid_social_media_items('[{"type":"image","url":"https://www.antoinequarroz.ch/social/a.jpg","alt":"A"}]','instagram'),'one-item mixed carousel is rejected');
select ok(not public.valid_social_media_items('[{"type":"image","url":"https://www.antoinequarroz.ch/social/a.jpg","alt":"A"},{"type":"image","url":"https://www.antoinequarroz.ch/social/a.jpg","alt":"B"}]','instagram'),'duplicate files are rejected');
select ok(not public.valid_social_media_items('[{"type":"video","url":"https://evil.example/a.mp4","alt":"A"},{"type":"image","url":"https://www.antoinequarroz.ch/social/a.jpg","alt":"B"}]','instagram'),'video paths require the dedicated immutable upload bucket');
select is(public.social_post_fingerprint(jsonb_populate_record(null::public.social_posts,'{
 "organization_id":"00000000-0000-0000-0000-000000000a01","id":"00000000-0000-0000-0000-000000000a11",
 "platform":"instagram","content":"Un café ☕","article_url":"https://www.antoinequarroz.ch/","approved_version":2,
 "media_images":[],"media_items":[{"type":"image","url":"https://www.antoinequarroz.ch/social/01.jpg","alt":"Café ☕"},{"type":"video","url":"https://www.antoinequarroz.ch/social/02.mp4","alt":"Écran mobile"}]
}')),'0ae70fc5a5ee5971128783cf9e059a11f98b41d732ba01e03091ca80bedaca8a','mixed fingerprint matches Python including UTF-8 and order');

insert into public.social_posts(id,organization_id,platform,source_key,article_title,article_url,content,media_items) values
 ('00000000-0000-0000-0000-000000000b11','00000000-0000-0000-0000-000000000b01','instagram','mixed-case','Case','https://www.antoinequarroz.ch/','Caption','[
 {"type":"image","url":"https://www.antoinequarroz.ch/social/01.jpg","alt":"Accueil"},
 {"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000b01/00000000-0000-0000-0000-000000000b02.mp4","alt":"Démo mobile"}]');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000b01','00000000-0000-0000-0000-000000000b11',1)),0::bigint,'saving a mixed carousel does not authorize publication');
select throws_ok($$update public.social_posts set platform='x' where id='00000000-0000-0000-0000-000000000b11'$$,'23514',null,'mixed media is Instagram-only');
select throws_ok($$update public.social_posts set media_images='[{"url":"https://www.antoinequarroz.ch/social/02.jpg","alt":"Another image"}]' where id='00000000-0000-0000-0000-000000000b11'$$,'23514',null,'legacy image and mixed media cannot coexist');
select is((select count(*) from public.approve_social_post('00000000-0000-0000-0000-000000000b01','00000000-0000-0000-0000-000000000b11',1,'Caption reviewed',now()-interval '1 minute')),1::bigint,'explicit approval binds the exact mixed carousel');
select ok((select approval_fingerprint=public.social_post_fingerprint(social_posts) and approved_version=2 from public.social_posts where id='00000000-0000-0000-0000-000000000b11'),'mixed approval is content-bound');
select throws_ok($$update public.social_posts set media_items=jsonb_build_array(media_items->1,media_items->0) where id='00000000-0000-0000-0000-000000000b11'$$,'23514',null,'reordering an approved carousel invalidates approval');
select throws_ok($$update public.social_posts set media_items=jsonb_set(media_items,'{1,alt}','"Changed"') where id='00000000-0000-0000-0000-000000000b11'$$,'23514',null,'editing a video description invalidates approval');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000b01','00000000-0000-0000-0000-000000000b11',1)),0::bigint,'stale mixed claim cannot publish');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000b01','00000000-0000-0000-0000-000000000b11',2)),1::bigint,'current explicitly approved mixed carousel may be claimed');
select ok((select public is true and file_size_limit=20971520 and allowed_mime_types=array['video/mp4']::text[] from storage.buckets where id='social-videos'),'dedicated video bucket is bounded and MP4-only');
select ok((select file_size_limit=5242880 and not ('video/mp4'=any(allowed_mime_types)) from storage.buckets where id='media'),'legacy image bucket restrictions are unchanged');
select ok(not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and coalesce(qual,'')||coalesce(with_check,'') like '%social-videos%'),'no direct storage write policy grants access to video uploads');
select * from finish();
rollback;
