import { parseHermesMobileReviewReceipt } from '../../../../utils/hermesMobileReviewDecision'
import { requireHermesMobileDevice } from '../../../../utils/hermesMobileDevice'

export default defineEventHandler(async (event) => {
  const device = await requireHermesMobileDevice(event)
  const id = getRouterParam(event, 'id') || ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 400, message: 'Décision mobile invalide.' })
  const receipt = parseHermesMobileReviewReceipt(await readJsonBodyLimited(event, 1024))
  const now = new Date().toISOString()
  const { data, error } = await getSupabaseAdmin().from('hermes_mobile_review_decisions').update({
    status: receipt.status, rejection_reason: receipt.reason, handled_at: now,
  }).eq('id', id).eq('organization_id', device.organization_id).eq('status', 'pending')
    .select('id,status,handled_at').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Accusé mobile non enregistré.' })
  if (!data) throw createError({ statusCode: 409, message: 'Décision déjà traitée ou inconnue.' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { requestID: data.id, status: data.status, handledAt: data.handled_at }
})
