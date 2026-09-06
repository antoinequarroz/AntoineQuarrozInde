import { Resend } from 'resend'

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const MIN_FORM_FILL_MS = 1200
const MAX_NAME_LENGTH = 120
const MAX_SUBJECT_LENGTH = 180
const MAX_MESSAGE_LENGTH = 10_000
// A JavaScript character may occupy up to four UTF-8 bytes. Keep enough room
// for the documented 10,000-character message plus the remaining JSON fields.
const MAX_CONTACT_REQUEST_BYTES = 48 * 1024
const contactRequests = createBoundedRateLimiter({
  windowMs: RATE_WINDOW_MS,
  maxRequests: RATE_LIMIT_MAX,
  maxKeys: 500,
})

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  if (!contactRequests.isAllowed(ip, now)) {
    throw createError({ statusCode: 429, message: 'Trop de requetes, reessayez plus tard.' })
  }

  const body = await readJsonBodyLimited(event, MAX_CONTACT_REQUEST_BYTES)
  const { name, email, subject, message, website, startedAt, turnstileToken, attribution } = body

  if (!name || !email || !message) {
    throw createError({ statusCode: 400, message: 'Champs requis manquants' })
  }
  const normalizedName = String(name).trim()
  const normalizedEmail = String(email).trim().toLowerCase()
  const normalizedSubject = String(subject || '').trim()
  const normalizedMessage = String(message).trim()
  if (!normalizedName || normalizedName.length > MAX_NAME_LENGTH) {
    throw createError({ statusCode: 400, message: 'Le nom est invalide.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw createError({ statusCode: 400, message: 'L’adresse e-mail est invalide.' })
  }
  if (normalizedSubject.length > MAX_SUBJECT_LENGTH || !normalizedMessage || normalizedMessage.length > MAX_MESSAGE_LENGTH) {
    throw createError({ statusCode: 400, message: 'Le message est vide ou trop long.' })
  }
  if (website && String(website).trim().length > 0) {
    throw createError({ statusCode: 400, message: 'Requete invalide' })
  }

  const started = Number(startedAt)
  if (!Number.isFinite(started) || now - started < MIN_FORM_FILL_MS) {
    throw createError({ statusCode: 400, message: 'Soumission trop rapide' })
  }

  const config = useRuntimeConfig()
  const cleanAttribution = leadAttributionPayload(attribution)
  const acquisitionChannel = leadAcquisitionChannel(attribution)

  if (config.turnstileSecretKey) {
    if (!turnstileToken || typeof turnstileToken !== 'string') {
      throw createError({ statusCode: 400, message: 'Validation anti-bot manquante' })
    }

    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: config.turnstileSecretKey,
        response: turnstileToken,
        remoteip: ip,
      }),
    })

    const verifyData = await verifyResponse.json() as { success?: boolean }
    if (!verifyData?.success) {
      throw createError({ statusCode: 400, message: 'Echec de validation anti-bot' })
    }
  }

  // If no API key configured, return success anyway (dev mode)
  if (!config.resendApiKey) {
    console.warn('[contact] RESEND_API_KEY not set — email not actually sent')
    return { success: true, acquisitionChannel }
  }

  const org = await resolveOrganizationContext(event)
  const resend = new Resend(config.resendApiKey)
  const supabase = getSupabaseAdmin()

  const safeSubject = normalizedSubject || 'Nouveau message'
  const safeName = escapeHtml(normalizedName)
  const safeEmail = escapeHtml(normalizedEmail)
  const safeMessage = escapeHtml(normalizedMessage)
  const safeSubjectHtml = escapeHtml(safeSubject)

  const { error: saveError } = await supabase.from('contact_messages').insert({
    organization_id: org?.id ?? null,
    name: normalizedName,
    email: normalizedEmail,
    subject: safeSubject,
    message: normalizedMessage,
    status: 'new',
    ...cleanAttribution,
  })
  if (saveError) {
    console.warn('[contact] unable to persist contact_messages:', saveError.message)
  }

  let linkedClientId: number | null = null
  if (org?.id) {
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id,name,email,status')
      .eq('organization_id', org.id)
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (existingClient) {
      linkedClientId = Number(existingClient.id)
    } else {
      const { data: createdClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          organization_id: org.id,
          name: normalizedName,
          company: null,
          email: normalizedEmail,
          phone: null,
          status: 'lead',
          notes: `Lead créé automatiquement depuis le formulaire de contact.\nSujet: ${safeSubject}\n\n${normalizedMessage}`,
          acquisition_source: cleanAttribution.utm_source || cleanAttribution.referrer_host || 'direct',
          acquisition_medium: cleanAttribution.utm_medium,
          acquisition_campaign: cleanAttribution.utm_campaign,
        })
        .select('id,name,email,status')
        .single()

      if (clientError) {
        console.warn('[contact] unable to create lead client:', clientError.message)
      } else if (createdClient) {
        linkedClientId = Number(createdClient.id)
        await logAudit({
          organizationId: org.id,
          action: 'lead_created_from_contact',
          entityType: 'client',
          entityId: createdClient.id,
          clientId: linkedClientId,
          payload: {
            name: createdClient.name,
            email: createdClient.email,
            status: createdClient.status,
            source: 'contact_form',
            subject: safeSubject,
          },
        })
      }
    }
  }

  const { error } = await resend.emails.send({
    from: 'Portfolio <info@antoinequarroz.ch>',
    to: config.contactEmail,
    replyTo: normalizedEmail,
    subject: `[Portfolio] ${safeSubject}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#7c3aed">Nouveau message depuis le portfolio</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b7280;width:100px">De</td><td style="padding:8px 0;font-weight:600">${safeName}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Sujet</td><td style="padding:8px 0">${safeSubjectHtml}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
        <p style="color:#374151;line-height:1.6;white-space:pre-wrap">${safeMessage}</p>
      </div>
    `,
  })

  if (error) {
    throw createError({ statusCode: 500, message: 'Erreur lors de l\'envoi' })
  }

  return { success: true, clientId: linkedClientId, acquisitionChannel }
})
