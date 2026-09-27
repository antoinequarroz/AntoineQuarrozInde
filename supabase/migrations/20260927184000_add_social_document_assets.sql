alter table public.social_posts
  add column if not exists media_kind text,
  add column if not exists media_url text,
  add column if not exists media_title text;

alter table public.social_posts
  add constraint social_posts_media_check check (
    (
      media_kind is null
      and media_url is null
      and media_title is null
    )
    or (
      platform = 'linkedin'
      and media_kind = 'document'
      and media_url like 'https://www.antoinequarroz.ch/social/%.pdf'
      and char_length(media_url) <= 500
      and char_length(media_title) between 1 and 180
    )
  );

comment on column public.social_posts.media_kind is
  'Optional approved LinkedIn media type. Document posts use a public PDF uploaded by Hermes.';
