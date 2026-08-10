export default defineEventHandler(async (event) => {
  const { org, user, client } = await requirePortalClient(event)
  const activatedAt = client.portal_activated_at || new Date().toISOString()
  const { data, error } = await getSupabaseAdmin().from('clients').update({
    portal_user_id: user.id,
    portal_activated_at: activatedAt,
    portal_access_disabled_at: null,
  }).eq('organization_id', org.id).eq('id', client.id).select('id,portal_activated_at').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({ organizationId: org.id, actorUserId: user.id, action: 'client.portal_activated', entityType: 'client', entityId: client.id, clientId: client.id })
  return { activated: true, activatedAt: data.portal_activated_at }
})
