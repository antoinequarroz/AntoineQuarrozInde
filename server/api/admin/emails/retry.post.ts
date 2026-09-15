export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)
  const deliveryId = Number(body?.id)
  if (!Number.isSafeInteger(deliveryId) || deliveryId <= 0) throw createError({ statusCode: 400, message: 'Envoi invalide.' })

  const supabase = getSupabaseAdmin()
  const { data: delivery, error } = await supabase.from('email_deliveries')
    .select('id,client_id,recipient,template_key,locale,entity_type,entity_id,status,attempt_count')
    .eq('organization_id', org.id).eq('id', deliveryId).maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Impossible de charger cet envoi.' })
  if (!delivery || delivery.status !== 'failed' || Number(delivery.attempt_count) >= 20) throw createError({ statusCode: 409, message: 'Cet envoi ne peut pas être relancé.' })

  if (delivery.template_key === 'contact_notification' && delivery.entity_type === 'contact_message') {
    const { data: contact, error: contactError } = await supabase.from('contact_messages')
      .select('id,submission_id,name,email,subject,message,locale,budget,timeline,notification_status')
      .eq('organization_id', org.id)
      .eq('id', Number(delivery.entity_id))
      .maybeSingle()
    if (contactError) throw createError({ statusCode: 500, message: 'Impossible de charger le message de contact.' })
    if (!contact?.submission_id || contact.notification_status !== 'failed') throw createError({ statusCode: 409, message: 'Cette notification de contact ne peut pas être relancée.' })

    const config = useRuntimeConfig()
    const recipient = String(config.contactEmail || '').trim().toLowerCase()
    if (!isEmailConfigured(config) || !isValidMailbox(recipient)) throw createError({ statusCode: 503, message: 'La notification de contact n’est pas configurée.' })
    if (recipient !== String(delivery.recipient || '').trim().toLowerCase()) throw createError({ statusCode: 409, message: 'La boîte de réception a changé; crée une nouvelle notification.' })

    const normalized = normalizeContactSubmission({
      submissionId: contact.submission_id,
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
      message: contact.message,
      locale: contact.locale,
      budget: contact.budget,
      timeline: contact.timeline,
    })
    const content = buildContactNotification(normalized)
    try {
      const result = await retryTrackedEmail({
        organizationId: org.id,
        deliveryId,
        recipient,
        subject: content.subject,
        text: content.text,
        html: content.html,
        replyTo: normalized.email,
      })
      await supabase.from('contact_messages').update({
        notification_status: 'sent',
        notification_provider_id: result.emailId,
        notification_error_code: null,
      }).eq('organization_id', org.id).eq('id', contact.id)
      return result
    }
    catch (retryError) {
      const code = emailDeliveryErrorCode(retryError)
      await supabase.from('contact_messages').update({
        notification_status: code === 'timeout_ambiguous' ? 'uncertain' : 'failed',
        notification_error_code: code,
      }).eq('organization_id', org.id).eq('id', contact.id)
      throw retryError
    }
  }

  if (!delivery.client_id) throw createError({ statusCode: 409, message: 'Le destinataire lié n’existe plus.' })

  const { data: client } = await supabase.from('clients').select('id,name,email,preferred_locale').eq('organization_id', org.id).eq('id', delivery.client_id).maybeSingle()
  if (!client?.email || client.email.trim().toLowerCase() !== delivery.recipient.trim().toLowerCase()) throw createError({ statusCode: 409, message: 'Le destinataire a changé; crée un nouvel envoi.' })

  let documentNumber = ''
  let amountLabel: string | undefined
  if (delivery.entity_type === 'quote') {
    const { data } = await supabase.from('quotes').select('number,status').eq('organization_id', org.id).eq('id', Number(delivery.entity_id)).maybeSingle()
    if (delivery.template_key === 'quote_reminder' && data?.status !== 'sent') throw createError({ statusCode: 409, message: 'Ce devis ne doit plus être relancé.' })
    documentNumber = data?.number || ''
  }
  else if (delivery.entity_type === 'invoice') {
    const { data } = await supabase.from('invoices').select('number,status,total_cents,amount_cents,currency,reminders_paused').eq('organization_id', org.id).eq('id', Number(delivery.entity_id)).maybeSingle()
    if (delivery.template_key === 'invoice_reminder') {
      const { data: payments } = await supabase.from('invoice_payments').select('amount_cents,voided_at').eq('organization_id', org.id).eq('invoice_id', Number(delivery.entity_id))
      const paid = (payments || []).filter(payment => !payment.voided_at).reduce((total, payment) => total + Number(payment.amount_cents), 0)
      const balance = Number(data?.total_cents ?? data?.amount_cents ?? 0) - paid
      if (!data || !['sent', 'overdue'].includes(data.status) || data.reminders_paused || balance <= 0) throw createError({ statusCode: 409, message: 'Cette facture ne doit plus être relancée.' })
      amountLabel = formatCommercialAmount(balance, data.currency || 'CHF', delivery.locale)
    }
    documentNumber = data?.number || ''
  }
  else if (delivery.entity_type === 'payment') {
    const { data: payment } = await supabase.from('invoice_payments').select('invoice_id,amount_cents').eq('organization_id', org.id).eq('id', Number(delivery.entity_id)).maybeSingle()
    if (payment?.invoice_id) {
      const { data } = await supabase.from('invoices').select('number,currency').eq('organization_id', org.id).eq('id', payment.invoice_id).maybeSingle()
      documentNumber = data?.number || ''
      amountLabel = formatCommercialAmount(Number(payment.amount_cents), data?.currency || 'CHF', delivery.locale)
    }
  }
  if (!documentNumber) throw createError({ statusCode: 409, message: 'Le document lié n’existe plus.' })

  const siteUrl = String(useRuntimeConfig().public.siteUrl || 'https://www.antoinequarroz.ch').replace(/\/$/, '')
  const content = buildCommercialEmail({ template: delivery.template_key, locale: delivery.locale, recipientName: client.name, documentNumber, amountLabel, portalUrl: `${siteUrl}/portal#${delivery.entity_type === 'quote' ? 'devis' : 'factures'}` })
  const beforeSend = ['quote_reminder', 'invoice_reminder'].includes(delivery.template_key) ? async (claimedDeliveryId: number) => {
    const { data, error: claimError } = await supabase.rpc('claim_email_reminder_delivery', {
      p_organization_id: org.id,
      p_delivery_id: claimedDeliveryId,
      p_retry: true,
      p_expected_due_date: null,
    })
    if (claimError) throw createError({ statusCode: 500, message: 'Impossible de réserver atomiquement la reprise.' })
    if (data === 'conflict') throw createError({ statusCode: 409, message: 'Cet envoi est déjà en cours de reprise.' })
    return data === 'claimed'
  } : undefined
  return await retryTrackedEmail({ organizationId: org.id, deliveryId, recipient: delivery.recipient, subject: content.subject, text: content.text, html: content.html, beforeSend })
})
