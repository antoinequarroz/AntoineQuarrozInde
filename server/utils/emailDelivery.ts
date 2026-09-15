import type { CommercialLocale, CommercialTemplateKey } from './commercialEmailTemplates'

export type DeliveryCategory = 'transactional' | 'marketing'
type DeliveryDependencies = { supabase?: any, send?: typeof sendAppEmail }
type DeliveryTemplateKey = CommercialTemplateKey | 'contact_notification'

export function emailDeliveryErrorCode(error: unknown) {
  const value = error as { statusCode?: number, name?: string, message?: string }
  if (value?.statusCode === 503) return 'not_configured'
  if (/timeout|abort/i.test(`${value?.name || ''} ${value?.message || ''}`)) return 'timeout_ambiguous'
  if (value?.statusCode === 502) return 'provider_rejected'
  return 'network_error'
}

export async function sendTrackedEmail(input: {
  organizationId: string
  clientId?: number | null
  category: DeliveryCategory
  templateKey: DeliveryTemplateKey
  locale: CommercialLocale
  recipient: string
  entityType?: 'quote' | 'invoice' | 'payment' | 'contact_message'
  entityId?: string | number | null
  idempotencyKey: string
  subject: string
  text: string
  html: string
  replyTo?: string | string[]
  beforeSend?: (deliveryId: number) => Promise<boolean>
}, dependencies: DeliveryDependencies = {}) {
  const supabase = dependencies.supabase || getSupabaseAdmin()
  const send = dependencies.send || sendAppEmail
  let suppressed = false
  if (input.category === 'marketing' && input.clientId) {
    const { data: client, error } = await supabase.from('clients').select('marketing_opt_out_at').eq('organization_id', input.organizationId).eq('id', input.clientId).maybeSingle()
    if (error) throw createError({ statusCode: 500, message: 'Impossible de vérifier la préférence e-mail.' })
    suppressed = Boolean(client?.marketing_opt_out_at)
  }

  const delivery = {
    organization_id: input.organizationId,
    client_id: input.clientId || null,
    category: input.category,
    template_key: input.templateKey,
    locale: input.locale,
    recipient: input.recipient.trim().toLowerCase(),
    entity_type: input.entityType || null,
    entity_id: input.entityId == null ? null : String(input.entityId),
    idempotency_key: input.idempotencyKey.slice(0, 256),
    status: suppressed ? 'suppressed' : 'pending',
    error_code: suppressed ? 'marketing_opt_out' : null,
  }
  const { data: reserved, error: reserveError } = await supabase.from('email_deliveries').insert(delivery).select('id,status,provider_id').maybeSingle()
  if (reserveError) {
    if (reserveError.code === '23505') {
      const { data: existing, error } = await supabase.from('email_deliveries').select('id,status,provider_id').eq('organization_id', input.organizationId).eq('idempotency_key', delivery.idempotency_key).single()
      if (error) throw createError({ statusCode: 500, message: 'Impossible de relire la livraison idempotente.' })
      if (existing.status === 'sent' || existing.status === 'suppressed') return { status: existing.status, duplicate: true, emailId: existing.provider_id || null }
      throw createError({ statusCode: 409, message: existing.status === 'uncertain' ? 'Cet envoi doit être vérifié avant toute nouvelle tentative.' : 'Cet envoi nécessite une reprise contrôlée.' })
    }
    throw createError({ statusCode: 500, message: 'Impossible de réserver la livraison.' })
  }
  if (!reserved) throw createError({ statusCode: 500, message: 'Impossible de réserver la livraison.' })
  if (suppressed) return { status: 'suppressed' as const, duplicate: false, emailId: null }
  if (input.beforeSend && !(await input.beforeSend(reserved.id))) {
    return { status: 'suppressed' as const, duplicate: false, emailId: null }
  }

  let result: Awaited<ReturnType<typeof sendAppEmail>>
  try {
    result = await send({ to: input.recipient, subject: input.subject, text: input.text, html: input.html, replyTo: input.replyTo, idempotencyKey: delivery.idempotency_key, tags: [{ name: 'category', value: input.templateKey }] })
  }
  catch (error) {
    const code = emailDeliveryErrorCode(error)
    await supabase.from('email_deliveries').update({ status: code === 'timeout_ambiguous' ? 'uncertain' : 'failed', error_code: code, last_attempt_at: new Date().toISOString() }).eq('organization_id', input.organizationId).eq('id', reserved.id).eq('status', 'pending')
    throw error
  }
  const providerId = result.emailId || `accepted:${reserved.id}`
  const { error: updateError } = await supabase.from('email_deliveries').update({ status: 'sent', provider_id: providerId, sent_at: new Date().toISOString(), error_code: null }).eq('organization_id', input.organizationId).eq('id', reserved.id)
  if (updateError) throw createError({ statusCode: 500, message: 'L’e-mail a été accepté mais son suivi doit être vérifié.' })
  return { status: 'sent' as const, duplicate: false, emailId: result.emailId }
}

export async function retryTrackedEmail(input: {
  organizationId: string
  deliveryId: number
  recipient: string
  subject: string
  text: string
  html: string
  replyTo?: string | string[]
  beforeSend?: (deliveryId: number) => Promise<boolean>
}, dependencies: DeliveryDependencies = {}) {
  const supabase = dependencies.supabase || getSupabaseAdmin()
  const send = dependencies.send || sendAppEmail
  const { data: delivery, error: claimError } = await supabase
    .from('email_deliveries')
    .select('id,idempotency_key,template_key,attempt_count')
    .eq('organization_id', input.organizationId)
    .eq('id', input.deliveryId)
    .eq('status', 'failed')
    .lt('attempt_count', 20)
    .maybeSingle()
  if (claimError) throw createError({ statusCode: 500, message: 'Impossible de réserver la nouvelle tentative.' })
  if (!delivery) throw createError({ statusCode: 409, message: 'Cet envoi ne peut pas être relancé.' })

  if (input.beforeSend && !(await input.beforeSend(delivery.id))) {
    return { status: 'suppressed' as const, emailId: null }
  }
  if (!input.beforeSend) {
    const { data: claimed, error: attemptError } = await supabase.from('email_deliveries').update({ status: 'pending', error_code: null, last_attempt_at: new Date().toISOString(), attempt_count: Number(delivery.attempt_count) + 1 }).eq('organization_id', input.organizationId).eq('id', delivery.id).eq('status', 'failed').select('id').maybeSingle()
    if (attemptError) throw createError({ statusCode: 500, message: 'Impossible de comptabiliser la nouvelle tentative.' })
    if (!claimed) throw createError({ statusCode: 409, message: 'Cet envoi est déjà en cours de reprise.' })
  }
  let result: Awaited<ReturnType<typeof sendAppEmail>>
  try {
    result = await send({ to: input.recipient, subject: input.subject, text: input.text, html: input.html, replyTo: input.replyTo, idempotencyKey: delivery.idempotency_key, tags: [{ name: 'category', value: delivery.template_key }] })
  }
  catch (error) {
    const code = emailDeliveryErrorCode(error)
    await supabase.from('email_deliveries').update({ status: code === 'timeout_ambiguous' ? 'uncertain' : 'failed', error_code: code, last_attempt_at: new Date().toISOString() }).eq('organization_id', input.organizationId).eq('id', delivery.id).eq('status', 'pending')
    throw error
  }
  const providerId = result.emailId || `accepted:${delivery.id}`
  const { error } = await supabase.from('email_deliveries').update({ status: 'sent', provider_id: providerId, sent_at: new Date().toISOString(), error_code: null }).eq('organization_id', input.organizationId).eq('id', delivery.id).eq('status', 'pending')
  if (error) throw createError({ statusCode: 500, message: 'L’e-mail a été accepté mais son suivi doit être vérifié.' })
  return { status: 'sent' as const, emailId: result.emailId }
}
