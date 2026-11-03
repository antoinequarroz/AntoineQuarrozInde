-- ANT-49: a single LinkedIn video can be reviewed and downloaded in the admin.
-- No new publishing capability, storage permission or approval is granted.
create or replace function public.valid_social_media_items(items jsonb, platform text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(items) is distinct from 'array' then return false; end if;
  if jsonb_array_length(items) = 0 then return true; end if;
  if platform = 'linkedin' then
    if jsonb_array_length(items) <> 1 or (items->0->>'type') is distinct from 'video' then return false; end if;
  elsif platform = 'instagram' then
    if jsonb_array_length(items) > 10 then return false; end if;
    if jsonb_array_length(items) = 1 and (items->0->>'type') is distinct from 'video' then return false; end if;
  else
    return false;
  end if;
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

-- Fail closed even if a caller invokes the approval RPC directly. Saving or
-- manually reviewing a LinkedIn video cannot put it in the automatic queue.
alter table public.social_posts add constraint social_posts_linkedin_video_manual_check
  check (platform <> 'linkedin' or media_items = '[]'::jsonb or publication_mode = 'manual');
