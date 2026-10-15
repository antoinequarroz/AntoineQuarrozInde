-- ANT-29: an explicit, content-bound approval is required for automatic delivery.
-- Existing manual image/Instagram reviews must never become publication consent.
alter table public.social_posts
  add column publication_mode text not null default 'manual'
    check (publication_mode in ('manual', 'automatic')),
  add column approved_version integer check (approved_version > 0 and approved_version <= version),
  add column approval_fingerprint text check (approval_fingerprint ~ '^[0-9a-f]{64}$');

-- Length prefixes count UTF-8 bytes, matching the publisher even for accents and
-- emoji. Use the built-in SHA256, independent of pgcrypto's installation schema.
create function public.social_post_fingerprint(p_post public.social_posts)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare
  field text;
  image jsonb;
  payload text := '';
begin
  if p_post.approved_version is null then return null; end if;
  foreach field in array array[
    p_post.organization_id::text, p_post.id::text, p_post.platform,
    p_post.content, p_post.article_url, coalesce(p_post.media_kind, ''),
    coalesce(p_post.media_url, ''), coalesce(p_post.media_title, ''),
    p_post.approved_version::text, jsonb_array_length(p_post.media_images)::text
  ] loop
    payload := payload || octet_length(convert_to(field, 'UTF8'))::text || ':' || field;
  end loop;
  for image in select value from jsonb_array_elements(p_post.media_images) loop
    foreach field in array array[image->>'url', image->>'alt'] loop
      payload := payload || octet_length(convert_to(field, 'UTF8'))::text || ':' || field;
    end loop;
  end loop;
  return encode(sha256(convert_to(payload, 'UTF8')), 'hex');
end;
$$;
revoke all on function public.social_post_fingerprint(public.social_posts) from public, anon, authenticated;
grant execute on function public.social_post_fingerprint(public.social_posts) to service_role;

-- Preserve approvals already made through the former text/PDF publisher. The
-- preceding migration excluded images/Instagram, so these are the only legacy
-- approvals that already carried consent to automatic delivery.
update public.social_posts
set publication_mode = 'automatic', approved_version = version
where platform in ('linkedin', 'x')
  and media_images = '[]'::jsonb
  and status in ('approved', 'publishing')
  and publish_after is not null;
update public.social_posts as post
set approval_fingerprint = public.social_post_fingerprint(post)
where publication_mode = 'automatic';

alter table public.social_posts drop constraint social_posts_publish_after_check;
alter table public.social_posts drop constraint social_posts_images_manual_check;
alter table public.social_posts drop constraint social_posts_instagram_manual_check;
alter table public.social_posts add constraint social_posts_manual_publication_check check (
  publication_mode <> 'manual'
  or (status <> 'publishing' and (status <> 'approved' or publish_after is null))
);
alter table public.social_posts add constraint social_posts_automatic_approval_check check (
  publication_mode <> 'automatic' or status not in ('approved', 'publishing') or (
    publish_after is not null
    and approved_version is not null
    and approval_fingerprint is not null
    and approval_fingerprint = public.social_post_fingerprint(social_posts)
    and (platform <> 'instagram' or media_images <> '[]'::jsonb)
  )
);

-- Status/version checks and the approval snapshot share a lock: an edit racing
-- with approval cannot authorize an unseen revision. Zero rows means conflict.
create function public.approve_social_post(
  p_organization_id uuid, p_post_id uuid, p_expected_version integer,
  p_content text, p_publish_after timestamptz
) returns setof public.social_posts
language plpgsql security invoker set search_path = '' as $$
declare post public.social_posts;
begin
  select * into post from public.social_posts
  where organization_id = p_organization_id and id = p_post_id
    and version = p_expected_version
    and (status in ('draft', 'failed') or (status = 'approved' and publication_mode = 'manual'))
  for update;
  if not found then return; end if;
  if p_publish_after is null then
    raise exception 'Automatic publication requires a schedule' using errcode = '22023';
  end if;
  if post.platform = 'instagram' and post.media_images = '[]'::jsonb then
    raise exception 'Instagram automatic publication requires images' using errcode = '22023';
  end if;
  post.content := p_content;
  post.status := 'approved';
  post.publication_mode := 'automatic';
  post.publish_after := p_publish_after;
  post.version := post.version + 1;
  post.approved_version := post.version;
  post.approval_fingerprint := public.social_post_fingerprint(post);
  return query update public.social_posts
  set content = post.content, status = post.status, publication_mode = post.publication_mode,
    publish_after = post.publish_after, version = post.version,
    approved_version = post.approved_version, approval_fingerprint = post.approval_fingerprint,
    updated_at = now(), last_error = null
  where organization_id = p_organization_id and id = p_post_id
  returning *;
end;
$$;
revoke all on function public.approve_social_post(uuid, uuid, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.approve_social_post(uuid, uuid, integer, text, timestamptz) to service_role;

create or replace function public.claim_social_post(
  p_organization_id uuid, p_post_id uuid, p_expected_version integer
) returns setof public.social_posts
language sql security invoker set search_path = '' as $$
  update public.social_posts as post
  set status = 'publishing', version = version + 1, updated_at = now(), last_error = null
  where organization_id = p_organization_id and id = p_post_id
    and platform in ('linkedin', 'x', 'instagram')
    and status = 'approved' and publication_mode = 'automatic'
    and approved_version is not null
    and approval_fingerprint = public.social_post_fingerprint(post)
    and (platform <> 'instagram' or media_images <> '[]'::jsonb)
    and publish_after is not null and publish_after <= now()
    and version = p_expected_version
  returning *;
$$;
revoke all on function public.claim_social_post(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_social_post(uuid, uuid, integer) to service_role;

alter table public.social_platform_connections drop constraint social_platform_connections_platform_check;
alter table public.social_platform_connections add constraint social_platform_connections_platform_check
  check (platform in ('linkedin', 'x', 'instagram'));
