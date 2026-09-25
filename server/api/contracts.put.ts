import { normalizeContractPayload } from '../utils/clientContract'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody<Record<string, any>>(event)
  const id = Number(body.id)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Contrat invalide.' })
  const supabase = getSupabaseAdmin()
  const { data: existing, error: readError } = await supabase.from('contracts').select('id,status,client_id').eq('organization_id', org.id).eq('id', id).maybeSingle()
  if (readError) throw createError({ statusCode: 500, message: readError.message })
  if (!existing) throw createError({ statusCode: 404, message: 'Contrat introuvable.' })
  if (existing.status !== 'draft') throw createError({ statusCode: 409, message: 'Un contrat envoyé est figé. Crée une nouvelle version pour le modifier.' })
  const payload = normalizeContractPayload(body)
  const { data, error } = await supabase.from('contracts').update({ ...payload, updated_at: new Date().toISOString() })
    .eq('organization_id', org.id).eq('id', id).eq('status', 'draft').select('*').maybeSingle()
  if (error) throw createError({ statusCode: error.code === '23505' ? 409 : 500, message: error.code === '23505' ? 'Ce numéro et cette version existent déjà.' : error.message })
  if (!data) throw createError({ statusCode: 409, message: 'Le contrat a changé. Recharge la page.' })
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'contract.update', entityType: 'contract', entityId: id, clientId: data.client_id, payload: { number: data.number, version: data.version } })
  return data
})
