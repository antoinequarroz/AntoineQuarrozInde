import { parseHermesMobileReviewDecision } from '../../../utils/hermesMobileReviewDecision'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  if (!['owner', 'admin'].includes(org.role)) throw createError({ statusCode: 403, message: 'Accès réservé à l’administrateur.' })
  const body = parseHermesMobileReviewDecision(await readJsonBodyLimited(event, 2048))
  const supabase = getSupabaseAdmin()
  const { data: snapshot, error: snapshotError } = await supabase.from('hermes_mobile_snapshots')
    .select('revision,payload,device_id').eq('organization_id', org.id).maybeSingle()
  if (snapshotError) throw createError({ statusCode: 500, message: 'Relevé Hermes indisponible.' })
  if (!snapshot || Number(snapshot.revision) !== body.expectedRevision) {
    throw createError({ statusCode: 409, message: 'Le relevé du Mac a changé. Actualise avant de valider.' })
  }
  const reviews = Array.isArray(snapshot.payload?.reviews) ? snapshot.payload.reviews : []
  const review = reviews.find((item: any) => item?.id === body.reviewID)
  if (!review || review.contentVersion !== body.expectedDigest || review.decision === 'Relu') {
    throw createError({ statusCode: 409, message: 'Ce rapport a changé ou a déjà été traité sur le Mac.' })
  }
  const { data, error } = await supabase.from('hermes_mobile_review_decisions').insert({
    organization_id: org.id,
    device_id: snapshot.device_id,
    review_id: body.reviewID,
    expected_revision: body.expectedRevision,
    expected_digest: body.expectedDigest,
    decision: body.decision,
    note: body.note,
    requested_by: user.id,
  }).select('id,review_id,expected_revision,expected_digest,decision,note,status,created_at').single()
  if (error?.code === '23505') throw createError({ statusCode: 409, message: 'Une décision est déjà en attente pour ce rapport.' })
  if (error || !data) throw createError({ statusCode: 500, message: 'Décision mobile non enregistrée.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'hermes.mobile.review.requested', entityType: 'hermes_review', entityId: body.reviewID, payload: { requestId: data.id, decision: body.decision } })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { request: { id: data.id, reviewID: data.review_id, expectedRevision: Number(data.expected_revision), expectedDigest: data.expected_digest, decision: data.decision, note: data.note, status: data.status, createdAt: data.created_at } }
})
