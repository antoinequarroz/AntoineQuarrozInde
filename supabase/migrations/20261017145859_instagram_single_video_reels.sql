-- ANT-42: permit a standalone Instagram video without changing legacy carousels,
-- approval fingerprints, publication state, storage permissions or scheduled dates.
create or replace function public.valid_social_media_items(items jsonb, platform text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(items) is distinct from 'array' then return false; end if;
  if jsonb_array_length(items) = 0 then return true; end if;
  if platform <> 'instagram' or jsonb_array_length(items) > 10 then return false; end if;
  -- A single video is a Reel. A single image keeps its existing media_images path.
  if jsonb_array_length(items) = 1 and (items->0->>'type') is distinct from 'video' then return false; end if;
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

