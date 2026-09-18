import { requireHermesMobileDevice } from '../../../utils/hermesMobileDevice'

export default defineEventHandler(async (event) => {
  const device = await requireHermesMobileDevice(event)
  const { data, error } = await getSupabaseAdmin().from('hermes_mobile_snapshots')
    .select('revision,device_id').eq('organization_id', device.organization_id).maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Révision indisponible.' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { revision: data?.revision ?? 0, writerDeviceId: data?.device_id ?? null }
})
