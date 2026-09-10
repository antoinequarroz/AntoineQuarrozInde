do $$
declare
  legacy_slug constant text := 'que-préparer-avant-de-créer-un-site-vitrine-en-valais-?';
  safe_slug constant text := 'que-preparer-avant-de-creer-un-site-vitrine-en-valais';
  reference_slug constant text := 'préparer-la-création-d’un-site-vitrine-en-valais-:-la-checklist';
begin
  if exists (
    select 1
    from public.articles
    where slug = legacy_slug
  ) then
    if exists (
      select 1
      from public.articles
      where slug = safe_slug
    ) then
      raise exception 'Cannot repair legacy article slug: target slug already exists';
    end if;

    update public.articles
    set slug = safe_slug
    where slug = legacy_slug;
  end if;

  update public.articles as target
  set cover_image = reference.cover_image
  from public.articles as reference
  where target.slug = safe_slug
    and target.cover_image is null
    and reference.slug = reference_slug
    and reference.cover_image is not null;
end
$$;
