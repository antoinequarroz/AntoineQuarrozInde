import { requireHermesMobileDevice } from '../../../utils/hermesMobileDevice'

export default defineEventHandler(async (event) => {
  const device = await requireHermesMobileDevice(event)
  const { data, error } = await getSupabaseAdmin().from('hermes_mobile_snapshots')
    .select('revision,payload,updated_at').eq('organization_id', device.organization_id).maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Instantané Hermes indisponible.' })
  if (!data) throw createError({ statusCode: 404, message: 'Aucun instantané Hermes disponible.' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { revision: Number(data.revision), updatedAt: data.updated_at, snapshot: data.payload }
})
