import { randomUUID } from 'node:crypto'

export type ClientPortalAccessAction = 'invite' | 'resend' | 'reset' | 'disable' | 'enable'

function statusFor(client: any) {
  if (client.portal_access_disabled_at) return 'disabled'
  if (client.portal_activated_at) return 'active'
  if (client.portal_user_id || client.portal_invited_at) return 'invited'
  return 'not_invited'
}

async function ensureClientMembership(supabase: any, organizationId: string, userId: string) {
  const { data: membership, error } = await supabase.from('organization_memberships')
    .select('id,role').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (membership && membership.role !== 'client') {
    throw createError({ statusCode: 409, message: 'Ce compte possède déjà un rôle interne dans cette organisation.' })
  }
  if (!membership) {
    const { error: insertError } = await supabase.from('organization_memberships').insert({ organization_id: organizationId, user_id: userId, role: 'client' })
    if (insertError) throw createError({ statusCode: 500, message: insertError.message })
  }
}

async function findAuthUser(supabase: any, client: any) {
  if (client.portal_user_id) {
    const { data, error } = await supabase.auth.admin.getUserById(client.portal_user_id)
    if (!error && data.user) return data.user
  }
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1_000 })
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data.users.find((user: any) => user.email?.toLowerCase() === client.email.toLowerCase()) || null
}

export async function manageClientPortalAccess(event: any, forcedAction?: ClientPortalAccessAction) {
  const { org, user } = await requireAdmin(event)
  const body = await readBody<{ clientId?: number, action?: ClientPortalAccessAction }>(event)
  const clientId = Number(body.clientId)
  const action = forcedAction || body.action || 'invite'
  if (!Number.isInteger(clientId) || clientId <= 0) throw createError({ statusCode: 400, message: 'Client manquant.' })
  if (!['invite', 'resend', 'reset', 'disable', 'enable'].includes(action)) throw createError({ statusCode: 400, message: 'Action d’accès invalide.' })

  const supabase = getSupabaseAdmin()
  const { data: client, error: clientError } = await supabase.from('clients')
    .select('id,email,name,portal_user_id,portal_invited_at,portal_activated_at,portal_access_disabled_at')
    .eq('organization_id', org.id).eq('id', clientId).single()
  if (clientError || !client) throw createError({ statusCode: 404, message: 'Client introuvable.' })
  if (!client.email) throw createError({ statusCode: 400, message: 'Ajoute une adresse e-mail au client.' })

  const authUser = await findAuthUser(supabase, client)
  if (action === 'disable') {
    if (!authUser) throw createError({ statusCode: 409, message: 'Aucun accès portail n’est associé à ce client.' })
    const { data: membership, error: membershipError } = await supabase.from('organization_memberships')
      .select('id,role').eq('organization_id', org.id).eq('user_id', authUser.id).maybeSingle()
    if (membershipError) throw createError({ statusCode: 500, message: membershipError.message })
    if (membership?.role && membership.role !== 'client') throw createError({ statusCode: 409, message: 'Ce compte interne ne peut pas être suspendu depuis une fiche client.' })
    if (membership) {
      const { error: deleteError } = await supabase.from('organization_memberships').delete().eq('id', membership.id).eq('organization_id', org.id)
      if (deleteError) throw createError({ statusCode: 500, message: deleteError.message })
    }
    const disabledAt = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase.from('clients').update({ portal_user_id: authUser.id, portal_access_disabled_at: disabledAt })
      .eq('organization_id', org.id).eq('id', client.id).select('*').single()
    if (updateError) throw createError({ statusCode: 500, message: updateError.message })
    await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'client.portal_access_disabled', entityType: 'client', entityId: client.id, clientId: client.id, payload: { user_id: authUser.id } })
    return { status: statusFor(updated), email: client.email, client: updated }
  }

  if (action === 'enable') {
    if (!authUser) throw createError({ statusCode: 409, message: 'Réinvite ce client pour recréer son accès.' })
    await ensureClientMembership(supabase, org.id, authUser.id)
    const { data: updated, error: updateError } = await supabase.from('clients').update({ portal_user_id: authUser.id, portal_access_disabled_at: null })
      .eq('organization_id', org.id).eq('id', client.id).select('*').single()
    if (updateError) throw createError({ statusCode: 500, message: updateError.message })
    await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'client.portal_access_enabled', entityType: 'client', entityId: client.id, clientId: client.id, payload: { user_id: authUser.id } })
    return { status: statusFor(updated), email: client.email, client: updated }
  }

  if (action === 'reset' && !authUser) throw createError({ statusCode: 409, message: 'Invite d’abord ce client dans le portail.' })
  const config = useRuntimeConfig()
  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')
  const linkType = authUser?.confirmed_at || action === 'reset' ? 'recovery' : 'invite'
  const linkResult = linkType === 'recovery'
    ? await supabase.auth.admin.generateLink({ type: 'recovery', email: client.email, options: { redirectTo: `${siteUrl}/portal/setup` } })
    : await supabase.auth.admin.generateLink({ type: 'invite', email: client.email, options: { redirectTo: `${siteUrl}/portal/setup`, data: { name: client.name } } })
  const { data: linkData, error: linkError } = linkResult
  if (linkError || !linkData.user || !linkData.properties?.action_link) {
    throw createError({ statusCode: 502, message: linkError?.message || 'Le lien d’accès n’a pas pu être créé.' })
  }

  await ensureClientMembership(supabase, org.id, linkData.user.id)
  const invitedAt = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase.from('clients').update({
    portal_user_id: linkData.user.id,
    portal_invited_at: invitedAt,
    portal_access_disabled_at: null,
  }).eq('organization_id', org.id).eq('id', client.id).select('*').single()
  if (updateError) throw createError({ statusCode: 500, message: updateError.message })

  const isRecovery = linkType === 'recovery'
  const emailResult = await sendTransactionalEmail({
    to: client.email,
    subject: isRecovery ? 'Réinitialisez votre accès client' : 'Votre espace client Antoine Quarroz est prêt',
    html: portalEmailLayout({
      preview: isRecovery ? 'Créez un nouveau mot de passe pour votre espace client.' : 'Activez votre espace client sécurisé.',
      title: isRecovery ? 'Réinitialisez votre accès' : `Bienvenue ${client.name}`,
      body: `<p>Bonjour ${escapeEmailHtml(client.name)},</p><p>${isRecovery ? 'Utilisez le bouton ci-dessous pour choisir un nouveau mot de passe.' : 'Votre espace sécurisé réunit vos projets, devis, livrables, factures et paiements.'}</p><p>Ce lien est personnel et temporaire.</p>`,
      actionLabel: isRecovery ? 'Choisir un nouveau mot de passe' : 'Activer mon espace client',
      actionUrl: linkData.properties.action_link,
    }),
    idempotencyKey: `portal-${linkType}-${client.id}-${randomUUID()}`,
    tags: [{ name: 'category', value: 'client_access' }],
  })
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: isRecovery ? 'client.portal_recovery_sent' : 'client.portal_invite_sent', entityType: 'client', entityId: client.id, clientId: client.id, payload: { email: client.email, email_id: emailResult.emailId, user_id: linkData.user.id } })
  return { status: statusFor(updated), email: client.email, client: updated }
}
