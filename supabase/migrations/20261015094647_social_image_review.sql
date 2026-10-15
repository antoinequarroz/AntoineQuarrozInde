-- Ordered review attachments. Images deliberately stay out of text/PDF delivery.
alter table public.social_posts add column media_images jsonb not null default '[]'::jsonb;

create function public.valid_social_images(images jsonb, platform text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare image jsonb;
begin
  if jsonb_typeof(images) <> 'array' then return false; end if;
  if jsonb_array_length(images) > (case when platform = 'x' then 4 else 10 end) then return false; end if;
  for image in select value from jsonb_array_elements(images) loop
    if jsonb_typeof(image) <> 'object'
      or jsonb_typeof(image->'url') is distinct from 'string'
      or jsonb_typeof(image->'alt') is distinct from 'string'
      or char_length(image->>'url') not between 1 and 500
      or image->>'url' !~ '^https://[^[:space:]]+\.(png|jpg|jpeg|webp)$'
      or char_length(btrim(image->>'alt')) not between 1 and 500
    then return false; end if;
  end loop;
  return (select count(*) = count(distinct value->>'url') from jsonb_array_elements(images));
end;
$$;
alter table public.social_posts add constraint social_posts_images_check
  check (public.valid_social_images(media_images, platform) and (media_images = '[]'::jsonb or media_kind is null));
alter table public.social_posts drop constraint social_posts_publish_after_check;
alter table public.social_posts add constraint social_posts_publish_after_check
  check (platform = 'instagram' or media_images <> '[]'::jsonb or status not in ('approved', 'publishing') or publish_after is not null);
alter table public.social_posts add constraint social_posts_images_manual_check
  check (media_images = '[]'::jsonb or (publish_after is null and status <> 'publishing'));

create or replace function public.claim_social_post(
  p_organization_id uuid, p_post_id uuid, p_expected_version integer
) returns setof public.social_posts
language sql security invoker set search_path = '' as $$
  update public.social_posts
  set status = 'publishing', version = version + 1, updated_at = now(), last_error = null
  where organization_id = p_organization_id and id = p_post_id
    and platform in ('linkedin', 'x') and status = 'approved'
    and media_images = '[]'::jsonb
    and publish_after is not null and publish_after <= now()
    and version = p_expected_version
  returning *;
$$;
revoke all on function public.claim_social_post(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_social_post(uuid, uuid, integer) to service_role;

-- Case studies are first-class editorial destinations.
alter table public.social_posts drop constraint social_posts_article_url_check;
alter table public.social_posts add constraint social_posts_article_url_check check (
  (article_url = 'https://www.antoinequarroz.ch/'
   or article_url like 'https://www.antoinequarroz.ch/blog/%'
   or article_url like 'https://www.antoinequarroz.ch/ressources/%'
   or article_url like 'https://www.antoinequarroz.ch/projets/%')
  and char_length(article_url) <= 500
);
