export function articlePublicationRpcError(error: { code?: string | null, message?: string | null }) {
  const message = String(error.message || 'Unable to save article')

  if (error.code === '42501' || message.includes('article_publication_forbidden')) {
    return createError({
      statusCode: 403,
      message: 'Only an owner or administrator can change article publication',
    })
  }
  if (error.code === 'P0002' || message.includes('article_not_found')) {
    return createError({ statusCode: 404, message: 'Article not found' })
  }

  console.error('[articles] Atomic save failed', error)
  return createError({ statusCode: 500, message: 'Unable to save article' })
}
