import { normalizeContractPayload } from '../utils/clientContract'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody<Record<string, any>>(event)
  const payload = normalizeContractPayload(body)
  const supabase = getSupabaseAdmin()
  const { data: client } = await supabase.from('clients').select('id').eq('organization_id', org.id).eq('id', payload.client_id).maybeSingle()
  if (!client) throw createError({ statusCode: 400, message: 'Le client sélectionné est introuvable.' })
  const { data, error } = await supabase.from('contracts').insert({ organization_id: org.id, ...payload }).select('*').single()
  if (error) throw createError({ statusCode: error.code === '23505' ? 409 : 500, message: error.code === '23505' ? 'Ce numéro et cette version existent déjà.' : error.message })
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'contract.create', entityType: 'contract', entityId: data.id, clientId: data.client_id, payload: { number: data.number, version: data.version } })
  return data
})
