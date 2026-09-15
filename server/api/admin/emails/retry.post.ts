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
  if (!delivery.client_id) throw createError({ statusCode: 409, message: 'Le destinataire lié n’existe plus.' })

  const { data: client } = await supabase.from('clients').select('id,name,email,preferred_locale').eq('organization_id', org.id).eq('id', delivery.client_id).maybeSingle()
  if (!client?.email || client.email.trim().toLowerCase() !== delivery.recipient.trim().toLowerCase()) throw createError({ statusCode: 409, message: 'Le destinataire a changé; crée un nouvel envoi.' })

  let documentNumber = ''
  if (delivery.entity_type === 'quote') {
    const { data } = await supabase.from('quotes').select('number,status').eq('organization_id', org.id).eq('id', Number(delivery.entity_id)).maybeSingle()
    if (delivery.template_key === 'quote_reminder' && data?.status !== 'sent') throw createError({ statusCode: 409, message: 'Ce devis ne doit plus être relancé.' })
    documentNumber = data?.number || ''
  }
  else if (delivery.entity_type === 'invoice') {
    const { data } = await supabase.from('invoices').select('number,status,total_cents,amount_cents,reminders_paused').eq('organization_id', org.id).eq('id', Number(delivery.entity_id)).maybeSingle()
    if (delivery.template_key === 'invoice_reminder') {
      const { data: payments } = await supabase.from('invoice_payments').select('amount_cents,voided_at').eq('organization_id', org.id).eq('invoice_id', Number(delivery.entity_id))
      const paid = (payments || []).filter(payment => !payment.voided_at).reduce((total, payment) => total + Number(payment.amount_cents), 0)
      if (!data || !['sent', 'overdue'].includes(data.status) || data.reminders_paused || Number(data.total_cents ?? data.amount_cents ?? 0) - paid <= 0) throw createError({ statusCode: 409, message: 'Cette facture ne doit plus être relancée.' })
    }
    documentNumber = data?.number || ''
  }
  else if (delivery.entity_type === 'payment') {
    const { data: payment } = await supabase.from('invoice_payments').select('invoice_id').eq('organization_id', org.id).eq('id', Number(delivery.entity_id)).maybeSingle()
    if (payment?.invoice_id) {
      const { data } = await supabase.from('invoices').select('number').eq('organization_id', org.id).eq('id', payment.invoice_id).maybeSingle()
      documentNumber = data?.number || ''
    }
  }
  if (!documentNumber) throw createError({ statusCode: 409, message: 'Le document lié n’existe plus.' })

  const siteUrl = String(useRuntimeConfig().public.siteUrl || 'https://www.antoinequarroz.ch').replace(/\/$/, '')
  const content = buildCommercialEmail({ template: delivery.template_key, locale: delivery.locale, recipientName: client.name, documentNumber, portalUrl: `${siteUrl}/portal` })
  return await retryTrackedEmail({ organizationId: org.id, deliveryId, recipient: delivery.recipient, subject: content.subject, text: content.text, html: content.html })
})
