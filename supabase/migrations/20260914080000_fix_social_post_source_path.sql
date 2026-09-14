alter table public.social_posts
  drop constraint social_posts_source_path_check;

alter table public.social_posts
  add constraint social_posts_source_path_check check (
    source_path is null
    or source_path ~ '^seo/social/a-valider/[A-Za-z0-9._/-]+\.md$'
  );
