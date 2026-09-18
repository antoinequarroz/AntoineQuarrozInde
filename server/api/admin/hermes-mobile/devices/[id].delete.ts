export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  if (!['owner', 'admin'].includes(org.role)) throw createError({ statusCode: 403, message: 'Accès réservé à l’administrateur.' })
  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 400, message: 'Identifiant invalide.' })
  const { data, error } = await getSupabaseAdmin().from('hermes_mobile_devices')
    .update({ revoked_at: new Date().toISOString() }).eq('organization_id', org.id).eq('id', id).is('revoked_at', null)
    .select('id').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Révocation impossible.' })
  if (!data) throw createError({ statusCode: 404, message: 'Appareil déjà révoqué ou introuvable.' })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'hermes.mobile.device.revoked', entityType: 'hermes_mobile_device', entityId: id })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return { revoked: true }
})
