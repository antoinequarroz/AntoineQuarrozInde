import { HERMES_MOBILE_MAX_BYTES, validateHermesMobileSnapshot } from '../../../utils/hermesMobile'
import { requireHermesMobileDevice } from '../../../utils/hermesMobileDevice'

export default defineEventHandler(async (event) => {
  const device = await requireHermesMobileDevice(event)
  const body = await readJsonBodyLimited(event, HERMES_MOBILE_MAX_BYTES)
  const expectedRevision = body.expectedRevision
  if (!Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 0) {
    throw createError({ statusCode: 400, message: 'Révision attendue invalide.' })
  }
  const payload = validateHermesMobileSnapshot(body.snapshot)
  const supabase = getSupabaseAdmin()
  const nextRevision = Number(expectedRevision) + 1
  const now = new Date().toISOString()
  if (expectedRevision === 0) {
    const { error } = await supabase.from('hermes_mobile_snapshots').insert({
      organization_id: device.organization_id, device_id: device.id, revision: nextRevision,
      source_fetched_at: payload.sourceFetchedAt, payload, updated_at: now,
    })
    if (error) {
      if (error.code === '23505') throw createError({ statusCode: 409, message: 'Un instantané existe déjà. Relis sa révision.' })
      throw createError({ statusCode: 500, message: 'Instantané non enregistré.' })
    }
  }
  else {
    const { data, error } = await supabase.from('hermes_mobile_snapshots').update({
      device_id: device.id, revision: nextRevision, source_fetched_at: payload.sourceFetchedAt, payload, updated_at: now,
    }).eq('organization_id', device.organization_id).eq('revision', expectedRevision).select('revision').maybeSingle()
    if (error) throw createError({ statusCode: 500, message: 'Instantané non enregistré.' })
    if (!data) throw createError({ statusCode: 409, message: 'Le cockpit a changé. Relis sa révision avant de réessayer.' })
  }
  await supabase.from('hermes_mobile_devices').update({ last_seen_at: now }).eq('id', device.id)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { revision: nextRevision, updatedAt: now }
})
