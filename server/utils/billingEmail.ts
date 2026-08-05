import { Resend } from 'resend'
import { buildBillingDocument } from './billingDocument'

type BillingEmailKind = 'quote' | 'invoice'

export async function sendBillingEmail(input: {
  kind: BillingEmailKind
  organizationId: string
  documentId: number
  recipientEmail: string
  recipientName: string
}) {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) {
    throw createError({ statusCode: 503, message: 'Le service email n’est pas configuré.' })
  }

  const supabase = getSupabaseAdmin()
  const table = input.kind === 'quote' ? 'quotes' : 'invoices'
  const itemsTable = input.kind === 'quote' ? 'quote_items' : 'invoice_items'
  const itemForeignKey = input.kind === 'quote' ? 'quote_id' : 'invoice_id'
  const [{ data: document, error }, { data: organization }] = await Promise.all([
    supabase.from(table).select('*').eq('organization_id', input.organizationId).eq('id', input.documentId).single(),
    supabase.from('organizations').select('*').eq('id', input.organizationId).single(),
  ])
  if (error || !document) throw createError({ statusCode: 404, message: 'Document introuvable.' })

  const [{ data: client }, { data: items }] = await Promise.all([
    supabase.from('clients').select('*').eq('organization_id', input.organizationId).eq('id', document.client_id).single(),
    supabase.from(itemsTable).select('*').eq('organization_id', input.organizationId).eq(itemForeignKey, input.documentId).order('position', { ascending: true }),
  ])
  if (!client) throw createError({ statusCode: 400, message: 'Le client associé est introuvable.' })

  const { pdf, engine } = await buildBillingDocument({
    kind: input.kind,
    document,
    organization: organization || {},
    client,
    items: items || [],
  })
  const label = input.kind === 'quote' ? 'devis' : 'facture'
  const capitalized = input.kind === 'quote' ? 'Devis' : 'Facture'
  const subjectSuffix = input.kind === 'quote' && document.title ? ` – ${document.title}` : ''
  const resend = new Resend(config.resendApiKey)
  const { data, error: sendError } = await resend.emails.send({
    from: 'Antoine Quarroz <info@antoinequarroz.ch>',
    to: input.recipientEmail,
    subject: `${capitalized} ${document.number}${subjectSuffix}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;line-height:1.6">
        <p>Bonjour ${escapeEmailHtml(input.recipientName)},</p>
        <p>Vous trouverez en pièce jointe ${input.kind === 'quote' ? 'le devis' : 'la facture'} <strong>${escapeEmailHtml(document.number)}</strong>.</p>
        <p>${input.kind === 'quote' ? 'Je reste volontiers disponible pour toute question ou adaptation.' : 'Merci pour votre confiance.'}</p>
        <p>Cordialement,<br><strong>Antoine Quarroz</strong></p>
      </div>`,
    attachments: [{ filename: `${label}-${document.number}.pdf`, content: pdf }],
  })
  if (sendError) throw createError({ statusCode: 502, message: sendError.message || 'Échec de l’envoi.' })
  return { emailId: data?.id || null, engine, document }
}

function escapeEmailHtml(value: unknown) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
