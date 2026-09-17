// Read-only audit; deliberately separate from the publisher's approved queue.
export default defineEventHandler(async (event) => {
  requireHermesReadAccess(event)
  const query = getQuery(event)
  const cursor = query.cursor === undefined ? null : query.cursor
  if (cursor !== null && (typeof cursor !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor))) {
    throw createError({ statusCode: 400, message: 'Curseur invalide.' })
  }
  const organization = await resolveHermesOrganization()
  let request = getSupabaseAdmin().from('social_posts')
    .select('id,platform,content,version,status,external_post_id,external_post_url,published_at')
    .eq('organization_id', organization.id)
    .order('id', { ascending: true }).limit(101)
  if (cursor) request = request.gt('id', cursor)
  const { data, error } = await request
  if (error) throw createError({ statusCode: 500, message: 'Audit social indisponible.' })
  const rows = data || []
  const page = rows.slice(0, 100)
  const nextCursor = rows.length > 100 ? page[page.length - 1].id : null
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope: { organizationID: organization.id, statuses: [] },
    pagination: { cursor, nextCursor, complete: cursor === null && nextCursor === null },
    unavailableFields: ['destinationID', 'scheduledAt', 'approval', 'latestAttempt'],
    posts: page.map(row => ({
      id: row.id, platform: row.platform, content: row.content, version: row.version, status: row.status,
      destinationID: null, scheduledAt: null, approval: null, latestAttempt: null,
      receipt: row.external_post_id || row.external_post_url || row.published_at
        ? { id: row.external_post_id, url: row.external_post_url, publishedAt: row.published_at }
        : null,
    })),
  }
})
