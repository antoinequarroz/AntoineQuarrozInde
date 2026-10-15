-- ANT-30: additive ordered Instagram media; image-only and PDF contracts remain intact.
alter table public.social_posts add column media_items jsonb not null default '[]'::jsonb;

create function public.valid_social_media_items(items jsonb, platform text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(items) is distinct from 'array' then return false; end if;
  if jsonb_array_length(items) = 0 then return true; end if;
  if platform <> 'instagram' or jsonb_array_length(items) not between 2 and 10 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'type') is distinct from 'string'
      or jsonb_typeof(item->'url') is distinct from 'string'
      or jsonb_typeof(item->'alt') is distinct from 'string'
      or item->>'type' not in ('image','video')
      or char_length(item->>'url') not between 1 and 500
      or item->>'url' !~ '^https://[^[:space:]?#@]+$'
      or position('?' in item->>'url') > 0 or position('#' in item->>'url') > 0
      or (item->>'type' = 'image' and item->>'url' !~* '\.(jpg|jpeg)$')
      or (item->>'type' = 'video' and item->>'url' !~* '^https://[^/?#@]+/storage/v1/object/public/social-videos/uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4$')
      or char_length(btrim(item->>'alt')) not between 1 and 500
      or item - 'type' - 'url' - 'alt' <> '{}'::jsonb
    then return false; end if;
  end loop;
  return (select count(*) = count(distinct value->>'url') from jsonb_array_elements(items));
end;
$$;
revoke all on function public.valid_social_media_items(jsonb,text) from public, anon, authenticated;
grant execute on function public.valid_social_media_items(jsonb,text) to service_role;

alter table public.social_posts add constraint social_posts_media_items_check check (
  public.valid_social_media_items(media_items,platform)
  and (media_items = '[]'::jsonb or (media_images = '[]'::jsonb and media_kind is null))
);

-- Immutable upload paths; no client write policy is added. Existing image bucket
-- restrictions are deliberately unchanged.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('social-videos','social-videos',true,20971520,array['video/mp4']::text[])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Legacy fingerprints are byte-for-byte identical when media_items is empty.
-- Mixed-capable publishers append this domain-separated suffix in array order.
create or replace function public.social_post_fingerprint(p_post public.social_posts)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare field text; item jsonb; payload text := '';
begin
  if p_post.approved_version is null then return null; end if;
  foreach field in array array[
    p_post.organization_id::text,p_post.id::text,p_post.platform,p_post.content,p_post.article_url,
    coalesce(p_post.media_kind,''),coalesce(p_post.media_url,''),coalesce(p_post.media_title,''),
    p_post.approved_version::text,jsonb_array_length(p_post.media_images)::text
  ] loop
    payload := payload || octet_length(convert_to(field,'UTF8'))::text || ':' || field;
  end loop;
  for item in select value from jsonb_array_elements(p_post.media_images) loop
    foreach field in array array[item->>'url',item->>'alt'] loop
      payload := payload || octet_length(convert_to(field,'UTF8'))::text || ':' || field;
    end loop;
  end loop;
  if p_post.media_items <> '[]'::jsonb then
    foreach field in array array['instagram-mixed-v1',jsonb_array_length(p_post.media_items)::text] loop
      payload := payload || octet_length(convert_to(field,'UTF8'))::text || ':' || field;
    end loop;
    for item in select value from jsonb_array_elements(p_post.media_items) loop
      foreach field in array array[item->>'type',item->>'url',item->>'alt'] loop
        payload := payload || octet_length(convert_to(field,'UTF8'))::text || ':' || field;
      end loop;
    end loop;
  end if;
  return encode(sha256(convert_to(payload,'UTF8')),'hex');
end;
$$;
revoke all on function public.social_post_fingerprint(public.social_posts) from public, anon, authenticated;
grant execute on function public.social_post_fingerprint(public.social_posts) to service_role;

alter table public.social_posts drop constraint social_posts_automatic_approval_check;
alter table public.social_posts add constraint social_posts_automatic_approval_check check (
  publication_mode <> 'automatic' or status not in ('approved','publishing') or (
    publish_after is not null and approved_version is not null and approval_fingerprint is not null
    and approval_fingerprint = public.social_post_fingerprint(social_posts)
    and (platform <> 'instagram' or media_images <> '[]'::jsonb or media_items <> '[]'::jsonb)
  )
);

create or replace function public.approve_social_post(
  p_organization_id uuid,p_post_id uuid,p_expected_version integer,p_content text,p_publish_after timestamptz
) returns setof public.social_posts
language plpgsql security invoker set search_path = '' as $$
declare post public.social_posts;
begin
  select * into post from public.social_posts
  where organization_id=p_organization_id and id=p_post_id and version=p_expected_version
    and (status in ('draft','failed') or (status='approved' and publication_mode='manual'))
  for update;
  if not found then return; end if;
  if p_publish_after is null then raise exception 'Automatic publication requires a schedule' using errcode='22023'; end if;
  if post.platform='instagram' and post.media_images='[]'::jsonb and post.media_items='[]'::jsonb then
    raise exception 'Instagram automatic publication requires media' using errcode='22023';
  end if;
  post.content:=p_content; post.status:='approved'; post.publication_mode:='automatic';
  post.publish_after:=p_publish_after; post.version:=post.version+1; post.approved_version:=post.version;
  post.approval_fingerprint:=public.social_post_fingerprint(post);
  return query update public.social_posts set content=post.content,status=post.status,publication_mode=post.publication_mode,
    publish_after=post.publish_after,version=post.version,approved_version=post.approved_version,
    approval_fingerprint=post.approval_fingerprint,updated_at=now(),last_error=null
  where organization_id=p_organization_id and id=p_post_id returning *;
end;
$$;
revoke all on function public.approve_social_post(uuid,uuid,integer,text,timestamptz) from public,anon,authenticated;
grant execute on function public.approve_social_post(uuid,uuid,integer,text,timestamptz) to service_role;

create or replace function public.claim_social_post(p_organization_id uuid,p_post_id uuid,p_expected_version integer)
returns setof public.social_posts language sql security invoker set search_path = '' as $$
  update public.social_posts as post set status='publishing',version=version+1,updated_at=now(),last_error=null
  where organization_id=p_organization_id and id=p_post_id and platform in ('linkedin','x','instagram')
    and status='approved' and publication_mode='automatic' and approved_version is not null
    and approval_fingerprint=public.social_post_fingerprint(post)
    and (platform<>'instagram' or media_images<>'[]'::jsonb or media_items<>'[]'::jsonb)
    and publish_after is not null and publish_after<=now() and version=p_expected_version
  returning *;
$$;
revoke all on function public.claim_social_post(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_social_post(uuid,uuid,integer) to service_role;
