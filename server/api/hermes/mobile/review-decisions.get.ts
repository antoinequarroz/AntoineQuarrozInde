import { requireHermesMobileDevice } from '../../../utils/hermesMobileDevice'

export default defineEventHandler(async (event) => {
  const device = await requireHermesMobileDevice(event)
  const { data, error } = await getSupabaseAdmin().from('hermes_mobile_review_decisions')
    .select('id,review_id,expected_revision,expected_digest,decision,note,created_at')
    .eq('organization_id', device.organization_id).eq('status', 'pending').order('created_at', { ascending: true }).limit(100)
  if (error) throw createError({ statusCode: 500, message: 'Décisions mobiles indisponibles.' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { requests: (data || []).map(row => ({ id: row.id, reviewID: row.review_id, expectedRevision: Number(row.expected_revision), expectedDigest: row.expected_digest, decision: row.decision, note: row.note, createdAt: row.created_at })) }
})
