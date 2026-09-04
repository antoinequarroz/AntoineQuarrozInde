-- Preserve trustworthy article freshness when the CRM submits an unchanged
-- form. Only source-backed editorial changes may advance updated_at.
create or replace function public.maintain_article_editorial_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := new.created_at;
    new.published_at := case when new.published then new.created_at else null end;
  else
    if row(
      new.organization_id,
      new.title,
      new.slug,
      new.excerpt,
      new.content,
      new.cover_image,
      new.published,
      new.author_key,
      new.tags,
      new.read_time
    ) is distinct from row(
      old.organization_id,
      old.title,
      old.slug,
      old.excerpt,
      old.content,
      old.cover_image,
      old.published,
      old.author_key,
      old.tags,
      old.read_time
    ) then
      new.updated_at := statement_timestamp();
    else
      new.updated_at := old.updated_at;
    end if;

    if new.published then
      if old.published then
        new.published_at := old.published_at;
      else
        new.published_at := statement_timestamp();
      end if;
    else
      new.published_at := null;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.maintain_article_editorial_timestamps()
  from public, anon, authenticated;
grant execute on function public.maintain_article_editorial_timestamps()
  to service_role;
