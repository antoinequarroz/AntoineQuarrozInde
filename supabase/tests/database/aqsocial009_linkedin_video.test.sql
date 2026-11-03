begin;
select no_plan();
insert into public.organizations(id,name,slug) values
 ('00000000-0000-0000-0000-000000000f01','LinkedIn video tests','linkedin-video-tests');

select ok(public.valid_social_media_items('[]','linkedin'),'LinkedIn text and existing image/PDF posts remain valid');
select ok(public.valid_social_media_items('[{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000f01/00000000-0000-0000-0000-000000000f02.mp4","alt":"Prototype AventureTime en 4:5"}]','linkedin'),'one immutable MP4 with a description is a valid LinkedIn attachment');
select ok(not public.valid_social_media_items('[{"type":"image","url":"https://www.antoinequarroz.ch/social/a.jpg","alt":"Image"}]','linkedin'),'LinkedIn images keep their existing media_images contract');
select ok(not public.valid_social_media_items('[{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000f01/00000000-0000-0000-0000-000000000f02.mp4","alt":"A"},{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000f01/00000000-0000-0000-0000-000000000f03.mp4","alt":"B"}]','linkedin'),'LinkedIn cannot receive two videos');
select ok(not public.valid_social_media_items('[{"type":"video","url":"https://evil.example/a.mp4","alt":"A"}]','linkedin'),'a LinkedIn video cannot bypass immutable storage paths');
select ok(not public.valid_social_media_items('[{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000f01/00000000-0000-0000-0000-000000000f02.mp4?token=secret","alt":"A"}]','linkedin'),'signed or mutable query URLs are refused');
select ok(not public.valid_social_media_items('[{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000f01/00000000-0000-0000-0000-000000000f02.mp4","alt":"A"}]','x'),'X video behavior is unchanged');

insert into public.social_posts(id,organization_id,platform,source_key,article_title,article_url,content,planned_at,media_items) values
 ('00000000-0000-0000-0000-000000000f11','00000000-0000-0000-0000-000000000f01','linkedin','linkedin-video-case','AventureTime prototype','https://www.antoinequarroz.ch/','Texte validé à conserver','2026-10-24T08:00:00Z','[{"type":"video","url":"https://project.supabase.co/storage/v1/object/public/social-videos/uploads/00000000-0000-0000-0000-000000000f01/00000000-0000-0000-0000-000000000f02.mp4","alt":"Prototype AventureTime en 4:5"}]');
select ok((select status='draft' and publication_mode='manual' and content='Texte validé à conserver' and planned_at='2026-10-24T08:00:00Z' and publish_after is null and approved_version is null and approval_fingerprint is null from public.social_posts where id='00000000-0000-0000-0000-000000000f11'),'adding the video keeps the caption, date and manual draft without consent');
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000f01','00000000-0000-0000-0000-000000000f11',1)),0::bigint,'a LinkedIn video draft cannot be claimed');
select throws_ok($$update public.social_posts set media_images='[{"url":"https://www.antoinequarroz.ch/social/a.jpg","alt":"A"}]' where id='00000000-0000-0000-0000-000000000f11'$$,'23514',null,'a LinkedIn video cannot coexist with images');
select throws_ok($$update public.social_posts set media_kind='document',media_url='https://www.antoinequarroz.ch/social/a.pdf',media_title='PDF' where id='00000000-0000-0000-0000-000000000f11'$$,'23514',null,'a LinkedIn video cannot coexist with a PDF');
select throws_ok($$update public.social_posts set publication_mode='automatic' where id='00000000-0000-0000-0000-000000000f11'$$,'23514',null,'the database refuses automatic mode even while still a draft');
select throws_ok($$select * from public.approve_social_post('00000000-0000-0000-0000-000000000f01','00000000-0000-0000-0000-000000000f11',1,'Texte relu',now()-interval '1 minute')$$,'23514',null,'the automatic approval RPC cannot bypass manual video publication');
select ok((select status='draft' and version=1 and content='Texte validé à conserver' from public.social_posts where id='00000000-0000-0000-0000-000000000f11'),'failed automatic approval leaves the draft intact');
update public.social_posts set status='approved',publication_mode='manual',version=version+1 where id='00000000-0000-0000-0000-000000000f11';
select is((select count(*) from public.claim_social_post('00000000-0000-0000-0000-000000000f01','00000000-0000-0000-0000-000000000f11',2)),0::bigint,'manual review never authorizes a background publisher');
select * from finish();
rollback;
