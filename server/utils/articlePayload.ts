export function articlePayload(body: Record<string, unknown>) {
  const published = body.published ?? false
  if (typeof published !== 'boolean') {
    throw createError({ statusCode: 400, message: 'published must be a boolean' })
  }

  return {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
    content: body.content,
    cover_image: body.coverImage ?? null,
    published,
    tags: body.tags ?? [],
    read_time: Number(body.readTime ?? 5),
  }
}
