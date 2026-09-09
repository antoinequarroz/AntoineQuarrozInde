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

  const { data: client } = await supabase.from('clients').select('id').eq('organization_id', input.organizationId).eq('id', document.client_id).single()
  if (!client) throw createError({ statusCode: 400, message: 'Le client associé est introuvable.' })

  const isCreditNote = input.kind === 'invoice' && document.document_type === 'credit_note'
  const capitalized = input.kind === 'quote' ? 'Devis' : isCreditNote ? 'Avoir' : 'Facture'
  const documentArticle = input.kind === 'quote' ? 'votre devis' : isCreditNote ? `votre avoir` : 'votre facture'
  const subjectSuffix = input.kind === 'quote' && document.title ? ` – ${document.title}` : ''
  const siteUrl = String(config.public.siteUrl || 'https://www.antoinequarroz.ch').replace(/\/$/, '')
  const portalUrl = `${siteUrl}/portal#${input.kind === 'quote' ? 'devis' : 'factures'}`
  const email = await sendAppEmail({
    to: input.recipientEmail,
    subject: `${capitalized} ${document.number}${subjectSuffix}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;line-height:1.6">
        <p>Bonjour ${escapeEmailHtml(input.recipientName)},</p>
        <p>${capitalized} <strong>${escapeEmailHtml(document.number)}</strong> est maintenant disponible dans votre espace client sécurisé.</p>
        <p style="margin:28px 0">
          <a href="${escapeEmailHtml(portalUrl)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700">Consulter ${documentArticle}</a>
        </p>
        <p style="font-size:14px;color:#4b5563">Connectez-vous à votre espace client pour le consulter et télécharger le PDF.</p>
        <p>${input.kind === 'quote' ? 'Je reste volontiers disponible pour toute question ou adaptation.' : 'Merci pour votre confiance.'}</p>
        <p>Cordialement,<br><strong>Antoine Quarroz</strong></p>
      </div>`,
    idempotencyKey: `${input.kind}-${input.organizationId}-${input.documentId}`,
  })
  return { emailId: email.emailId, emailProvider: email.provider, engine: 'portal-link' as const, document }
}

function escapeEmailHtml(value: unknown) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
