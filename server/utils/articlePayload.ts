import { PUBLIC_SEO_IDENTITY } from '../../shared/utils/publicSeoIdentity'

export function articlePayload(body: Record<string, unknown>) {
  const published = body.published ?? false
  if (typeof published !== 'boolean') {
    throw createError({ statusCode: 400, message: 'published must be a boolean' })
  }

  const authorKey = body.authorKey === undefined
    ? PUBLIC_SEO_IDENTITY.key
    : body.authorKey
  if (authorKey !== PUBLIC_SEO_IDENTITY.key) {
    throw createError({ statusCode: 400, message: 'authorKey must identify an approved author' })
  }

  return {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
    content: body.content,
    cover_image: body.coverImage ?? null,
    published,
    author_key: authorKey,
    tags: body.tags ?? [],
    read_time: Number(body.readTime ?? 5),
  }
}
