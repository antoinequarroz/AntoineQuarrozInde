begin;

select plan(4);

select is(
  (select public from storage.buckets where id = 'media'),
  true,
  'media bucket is public for generated public URLs'
);

select is(
  (select file_size_limit from storage.buckets where id = 'media'),
  5242880::bigint,
  'media bucket limits objects to 5 MiB'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'media'),
  array['image/jpeg', 'image/png', 'image/webp']::text[],
  'media bucket only accepts the supported raster image types'
);

select is(
  (select name from storage.buckets where id = 'media'),
  'media',
  'media bucket keeps its stable identifier and name'
);

select * from finish();

rollback;
