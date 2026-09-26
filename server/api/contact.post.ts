import { buildContactNotification, ContactSubmissionError, contactPayloadFingerprint, isValidMailbox, normalizeContactSubmission } from '../utils/contactSubmission'
import { emailDeliveryErrorCode, sendTrackedEmail } from '../utils/emailDelivery'
import { isEmailConfigured } from '../utils/emailTransport'

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const MIN_FORM_FILL_MS = 1200
// A JavaScript character may occupy up to four UTF-8 bytes. Keep enough room
// for the documented 10,000-character message plus the remaining JSON fields.
const MAX_CONTACT_REQUEST_BYTES = 48 * 1024
const contactRequests = createBoundedRateLimiter({
  windowMs: RATE_WINDOW_MS,
  maxRequests: RATE_LIMIT_MAX,
  maxKeys: 500,
})

function publicContactError(statusCode: number, message: string) {
  return createError({ statusCode, message })
}

export default defineEventHandler(async (event) => {
  const correlationId = resolveCommercialCorrelationId(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  if (!contactRequests.isAllowed(ip, now)) {
    throw publicContactError(429, 'Trop de requêtes, réessayez plus tard.')
  }

  const body = await readJsonBodyLimited(event, MAX_CONTACT_REQUEST_BYTES)
  let contact: ReturnType<typeof normalizeContactSubmission>
  try {
    contact = normalizeContactSubmission(body)
  }
  catch (error) {
    if (error instanceof ContactSubmissionError) {
      throw publicContactError(400, 'Le formulaire contient une valeur invalide.')
    }
    throw error
  }

  const started = Number(body.startedAt)
  if (!Number.isFinite(started) || now - started < MIN_FORM_FILL_MS) {
    throw publicContactError(400, 'Soumission trop rapide.')
  }

  const config = useRuntimeConfig()
  if (config.turnstileSecretKey) {
    if (!body.turnstileToken || typeof body.turnstileToken !== 'string') {
      throw publicContactError(400, 'Validation anti-bot manquante.')
    }

    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: config.turnstileSecretKey,
        response: body.turnstileToken,
        remoteip: ip,
      }),
    })
    const verifyData = await verifyResponse.json() as { success?: boolean }
    if (!verifyData?.success) throw publicContactError(400, 'Échec de validation anti-bot.')
  }

  const org = await resolveOrganizationContext(event)
  if (!org?.id) throw publicContactError(503, 'Le service de contact est temporairement indisponible.')

  const supabase = getSupabaseAdmin()
  const cleanAttribution = leadAttributionPayload(body.attribution)
  const acquisitionChannel = leadAcquisitionChannel(body.attribution)
  const lastAcquisitionChannel = leadLastAcquisitionChannel(body.attribution)
  const fingerprint = contactPayloadFingerprint(contact)

  const { data: insertedMessage, error: saveError } = await supabase
    .from('contact_messages')
    .insert({
      organization_id: org.id,
      submission_id: contact.submissionId,
      payload_fingerprint: fingerprint,
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
      message: contact.message,
      locale: contact.locale,
      budget: contact.budget,
      timeline: contact.timeline,
      notification_status: 'pending',
      status: 'new',
      ...cleanAttribution,
    })
    .select('id,payload_fingerprint,notification_status,notification_provider_id')
    .single()

  let messageRow = insertedMessage
  if (saveError?.code === '23505') {
    const { data: existing, error } = await supabase
      .from('contact_messages')
      .select('id,payload_fingerprint,notification_status,notification_provider_id')
      .eq('organization_id', org.id)
      .eq('submission_id', contact.submissionId)
      .maybeSingle()
    if (error || !existing || existing.payload_fingerprint !== fingerprint) {
      throw publicContactError(409, 'Cette soumission ne peut pas être rejouée.')
    }
    if (existing.notification_status === 'sent') {
      return { success: true, duplicate: true, acquisitionChannel }
    }
    throw publicContactError(409, existing.notification_status === 'uncertain'
      ? 'La livraison précédente doit être vérifiée avant une nouvelle tentative.'
      : 'Cette demande est déjà enregistrée et sa notification nécessite une reprise contrôlée.')
  }
  if (saveError || !messageRow) {
    console.warn('[contact] unable to persist contact message', { correlationId, code: saveError?.code || 'missing_row' })
    throw publicContactError(500, 'Le message ne peut pas être enregistré pour le moment.')
  }

  let linkedClientId: number | null = null
  const { data: existingClient, error: existingClientError } = await supabase
    .from('clients')
    .select('id,name,email,status,company')
    .eq('organization_id', org.id)
    .ilike('email', contact.email)
    .maybeSingle()

  if (existingClientError) {
    console.warn('[contact] unable to look up lead', { correlationId })
  }
  else if (existingClient) {
    linkedClientId = Number(existingClient.id)
    const { error: attributionUpdateError } = await supabase.from('clients').update({
      ...(contact.company && !existingClient.company ? { company: contact.company } : {}),
      last_acquisition_source: cleanAttribution.last_utm_source || cleanAttribution.last_referrer_host || 'direct',
      last_acquisition_medium: cleanAttribution.last_utm_medium,
      last_acquisition_campaign: cleanAttribution.last_utm_campaign,
    }).eq('organization_id', org.id).eq('id', linkedClientId)
    if (attributionUpdateError) console.warn('[contact] unable to update last-touch attribution', { correlationId })
    await recordCommercialWorkflowEvent({
      event,
      correlationId,
      organizationId: org.id,
      stage: 'lead',
      outcome: 'recovered',
      entityType: 'client',
      entityId: linkedClientId,
      clientId: linkedClientId,
      code: 'lead_already_exists',
    })
  }
  else {
    const { data: createdClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        organization_id: org.id,
        name: contact.name,
        company: contact.company,
        email: contact.email,
        phone: null,
        status: 'lead',
        notes: `Lead créé automatiquement depuis le formulaire de contact.\nSujet: ${contact.subject}\n\n${contact.message}`,
        acquisition_source: cleanAttribution.utm_source || cleanAttribution.referrer_host || 'direct',
        acquisition_medium: cleanAttribution.utm_medium,
        acquisition_campaign: cleanAttribution.utm_campaign,
        last_acquisition_source: cleanAttribution.last_utm_source || cleanAttribution.last_referrer_host || 'direct',
        last_acquisition_medium: cleanAttribution.last_utm_medium,
        last_acquisition_campaign: cleanAttribution.last_utm_campaign,
      })
      .select('id,name,email,status')
      .single()

    if (clientError) {
      console.warn('[contact] unable to create lead client', { correlationId })
      await recordCommercialWorkflowEvent({
        event,
        correlationId,
        organizationId: org.id,
        stage: 'lead',
        outcome: 'failure',
        entityType: 'client',
        code: 'lead_creation_failed',
      })
    }
    else if (createdClient) {
      linkedClientId = Number(createdClient.id)
      await logAudit({
        organizationId: org.id,
        action: 'lead_created_from_contact',
        entityType: 'client',
        entityId: createdClient.id,
        clientId: linkedClientId,
        payload: { name: createdClient.name, email: createdClient.email, status: createdClient.status, source: 'contact_form', subject: contact.subject },
      })
      await recordCommercialWorkflowEvent({
        event,
        correlationId,
        organizationId: org.id,
        stage: 'lead',
        outcome: 'success',
        entityType: 'client',
        entityId: linkedClientId,
        clientId: linkedClientId,
      })
      await capturePostHogBusinessEvent({
        event: 'crm_lead_created',
        origin: 'contact_submission',
        organizationId: org.id,
        entityType: 'client',
        entityId: linkedClientId,
        clientId: linkedClientId,
        channel: acquisitionChannel,
        lastChannel: lastAcquisitionChannel,
      })
    }
  }

  if (linkedClientId) {
    const { error } = await supabase.from('contact_messages').update({ client_id: linkedClientId }).eq('organization_id', org.id).eq('id', messageRow.id)
    if (error) console.warn('[contact] unable to link contact message to lead', { correlationId })
  }

  const recipient = String(config.contactEmail || '').trim().toLowerCase()
  if (!isEmailConfigured(config) || !isValidMailbox(recipient)) {
    const errorCode = isEmailConfigured(config) ? 'invalid_recipient' : 'not_configured'
    await supabase.from('contact_messages').update({ notification_status: 'failed', notification_error_code: errorCode }).eq('organization_id', org.id).eq('id', messageRow.id)
    console.error('[contact] notification configuration unavailable', { correlationId, code: errorCode })
    throw publicContactError(503, 'Le message est enregistré, mais la notification e-mail est temporairement indisponible.')
  }

  const notification = buildContactNotification(contact)
  try {
    const delivery = await sendTrackedEmail({
      organizationId: org.id,
      category: 'transactional',
      templateKey: 'contact_notification',
      locale: contact.locale,
      recipient,
      entityType: 'contact_message',
      entityId: messageRow.id,
      idempotencyKey: `contact:${contact.submissionId}`,
      subject: notification.subject,
      text: notification.text,
      html: notification.html,
      replyTo: contact.email,
    })
    const { error } = await supabase.from('contact_messages').update({
      notification_status: 'sent',
      notification_provider_id: delivery.emailId,
      notification_error_code: null,
    }).eq('organization_id', org.id).eq('id', messageRow.id)
    if (error) console.warn('[contact] Lumail accepted the notification but message tracking could not be updated', { correlationId })
  }
  catch (error) {
    const code = emailDeliveryErrorCode(error)
    await supabase.from('contact_messages').update({
      notification_status: code === 'timeout_ambiguous' ? 'uncertain' : 'failed',
      notification_error_code: code,
    }).eq('organization_id', org.id).eq('id', messageRow.id)
    console.error('[contact] notification failed', { correlationId, code })
    throw publicContactError(code === 'timeout_ambiguous' ? 409 : 502, 'Le message est enregistré, mais sa notification e-mail n’a pas abouti.')
  }

  return { success: true, clientId: linkedClientId, acquisitionChannel }
})
