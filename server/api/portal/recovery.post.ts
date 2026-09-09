import { createHash } from 'node:crypto'

const RECOVERY_WINDOW_MS = 15 * 60 * 1000
const recoveryRequestsByIp = createBoundedRateLimiter({
  windowMs: RECOVERY_WINDOW_MS,
  maxRequests: 3,
  maxKeys: 1_000,
})
const recoveryRequestsByEmail = createBoundedRateLimiter({
  windowMs: RECOVERY_WINDOW_MS,
  maxRequests: 3,
  maxKeys: 1_000,
})

const genericResponse = () => ({
  success: true,
  message: 'Si cette adresse possède un accès, un lien de réinitialisation vient d’être envoyé.',
})

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const body = await readJsonBodyLimited(event, 2 * 1024)
  const email = String(body?.email || '').trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw createError({ statusCode: 400, message: 'Saisissez une adresse e-mail valide.' })
  }

  const emailKey = createHash('sha256').update(email).digest('hex')
  if (!recoveryRequestsByIp.isAllowed(ip) || !recoveryRequestsByEmail.isAllowed(emailKey)) {
    throw createError({ statusCode: 429, message: 'Trop de demandes. Réessayez dans quelques minutes.' })
  }

  try {
    const config = useRuntimeConfig()
    if (!isEmailConfigured(config)) return genericResponse()

    const supabase = getSupabaseAdmin()
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id,name,organization_id,portal_user_id')
      .ilike('email', email)
      .not('portal_user_id', 'is', null)
      .is('portal_access_disabled_at', null)
      .limit(1)
      .maybeSingle()

    // Keep the public response identical for unknown, disabled and valid accounts.
    if (clientError || !client?.portal_user_id) return genericResponse()

    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(client.portal_user_id)
    const authEmail = String(authData?.user?.email || '').trim().toLowerCase()
    if (authError || authEmail !== email) return genericResponse()

    const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: authEmail,
      options: { redirectTo: `${siteUrl}/portal/setup` },
    })
    const actionUrl = linkData?.properties?.action_link
    if (linkError || !actionUrl) return genericResponse()

    const emailResult = await sendTransactionalEmail({
      to: email,
      subject: 'Réinitialisez votre accès client',
      html: portalEmailLayout({
        preview: 'Créez un nouveau mot de passe pour votre espace client.',
        title: 'Réinitialisez votre accès',
        body: `<p>Bonjour ${escapeEmailHtml(client.name || '')},</p><p>Utilisez le bouton ci-dessous pour choisir un nouveau mot de passe.</p><p>Ce lien est personnel et temporaire.</p>`,
        actionLabel: 'Choisir un nouveau mot de passe',
        actionUrl,
      }),
      idempotencyKey: `portal-self-recovery-${emailKey}-${Math.floor(Date.now() / RECOVERY_WINDOW_MS)}`,
      tags: [{ name: 'category', value: 'client_access' }],
    })

    await logAudit({
      organizationId: client.organization_id,
      actorUserId: null,
      action: 'client.portal_self_recovery_sent',
      entityType: 'client',
      entityId: client.id,
      clientId: client.id,
      payload: { email_id: emailResult.emailId, user_id: client.portal_user_id },
    })
  }
  catch {
    // Do not leak account existence or provider errors through this public route.
    console.error('[portal-recovery] Unable to complete recovery request')
  }

  return genericResponse()
})
