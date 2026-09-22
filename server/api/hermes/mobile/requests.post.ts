import { parseHermesMobileReviewDecision } from '../../../utils/hermesMobileReviewDecision'
import { requireHermesMobileDevice } from '../../../utils/hermesMobileDevice'

export default defineEventHandler(async (event) => {
  const device = await requireHermesMobileDevice(event)
  const body = parseHermesMobileReviewDecision(await readJsonBodyLimited(event, 4096))
  if (!body.id) throw createError({ statusCode: 400, message: 'Identifiant de décision manquant.' })
  const supabase = getSupabaseAdmin()
  const { data: snapshot, error: snapshotError } = await supabase.from('hermes_mobile_snapshots')
    .select('revision,payload').eq('organization_id', device.organization_id).maybeSingle()
  if (snapshotError) throw createError({ statusCode: 500, message: 'Instantané Hermes indisponible.' })
  const reviews = Array.isArray(snapshot?.payload?.reviews) ? snapshot.payload.reviews : []
  const review = reviews.find((item: any) => item?.id === body.reviewID)
  if (!snapshot || Number(snapshot.revision) !== body.expectedRevision || !review
    || review.contentVersion !== body.expectedDigest || review.decision === 'Relu') {
    return { requestID: body.id, status: 'rejected', reason: 'Le rapport a changé. Actualise avant de décider.' }
  }
  const { error } = await supabase.from('hermes_mobile_review_decisions').insert({
    id: body.id, organization_id: device.organization_id, device_id: device.id,
    review_id: body.reviewID, expected_revision: body.expectedRevision, expected_digest: body.expectedDigest,
    decision: body.decision, note: body.note, requested_by: null,
  })
  if (error?.code === '23505') {
    const { data: existing } = await supabase.from('hermes_mobile_review_decisions')
      .select('id,status,rejection_reason,handled_at').eq('id', body.id).eq('organization_id', device.organization_id).maybeSingle()
    if (existing) return { requestID: existing.id, status: existing.status === 'rejected' ? 'rejected' : 'applied', reason: existing.rejection_reason, appliedAt: existing.handled_at }
    return { requestID: body.id, status: 'rejected', reason: 'Une décision attend déjà pour ce rapport.' }
  }
  if (error) throw createError({ statusCode: 500, message: 'Décision mobile non enregistrée.' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { requestID: body.id, status: 'applied', appliedAt: new Date().toISOString() }
})
