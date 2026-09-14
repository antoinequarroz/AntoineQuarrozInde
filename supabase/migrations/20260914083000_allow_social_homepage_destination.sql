alter table public.social_posts
  drop constraint social_posts_article_url_check;

alter table public.social_posts
  add constraint social_posts_article_url_check check (
    (
      article_url = 'https://www.antoinequarroz.ch/'
      or article_url like 'https://www.antoinequarroz.ch/blog/%'
    )
    and char_length(article_url) <= 500
  );
