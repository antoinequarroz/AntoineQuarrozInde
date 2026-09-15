type BillingEmailKind = 'quote' | 'invoice'

export async function sendBillingEmail(input: {
  kind: BillingEmailKind
  organizationId: string
  documentId: number
  recipientEmail: string
  recipientName: string
}) {
  const config = useRuntimeConfig()
  if (!config.lumailApiKey) throw createError({ statusCode: 503, message: 'Le service email Lumail n’est pas configuré.' })

  const supabase = getSupabaseAdmin()
  const table = input.kind === 'quote' ? 'quotes' : 'invoices'
  const { data: document, error } = await supabase
    .from(table)
    .select('*')
    .eq('organization_id', input.organizationId)
    .eq('id', input.documentId)
    .single()
  if (error || !document) throw createError({ statusCode: 404, message: 'Document introuvable.' })

  const { data: client } = await supabase.from('clients').select('id,preferred_locale').eq('organization_id', input.organizationId).eq('id', document.client_id).single()
  if (!client) throw createError({ statusCode: 400, message: 'Le client associé est introuvable.' })

  const siteUrl = String(config.public.siteUrl || 'https://www.antoinequarroz.ch').replace(/\/$/, '')
  const portalUrl = `${siteUrl}/portal#${input.kind === 'quote' ? 'devis' : 'factures'}`
  const content = buildCommercialEmail({
    template: input.kind === 'quote' ? 'quote_available' : 'invoice_available',
    locale: client.preferred_locale,
    recipientName: input.recipientName,
    documentNumber: document.number,
    portalUrl,
  })
  const email = await sendTrackedEmail({
    organizationId: input.organizationId,
    clientId: client.id,
    category: 'transactional',
    templateKey: input.kind === 'quote' ? 'quote_available' : 'invoice_available',
    recipient: input.recipientEmail,
    entityType: input.kind,
    entityId: input.documentId,
    idempotencyKey: `${input.kind}-${input.organizationId}-${input.documentId}`,
    ...content,
  })
  return { emailId: email.emailId, emailProvider: 'lumail' as const, engine: 'portal-link' as const, document }
}
