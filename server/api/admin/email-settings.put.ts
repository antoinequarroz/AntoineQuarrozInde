const QUOTE_OFFSETS = new Set([0, 1, 2, 3, 5, 7, 10, 14])
const INVOICE_OFFSETS = new Set([-60, -45, -30, -20, -14, -10, -7, -5, -3, -1, 0, 1, 2, 3, 5, 7, 10, 14])

function safeOffsets(value: unknown, allowlist: Set<number>, max: number) {
  if (!Array.isArray(value)) return null
  const offsets = [...new Set(value.map(Number))]
  if (!offsets.length || offsets.length > max || offsets.some(value => !Number.isInteger(value) || !allowlist.has(value))) return null
  return offsets.sort((a, b) => b - a)
}

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)
  const quoteOffsets = safeOffsets(body?.quoteOffsets, QUOTE_OFFSETS, 5)
  const invoiceOffsets = safeOffsets(body?.invoiceOffsets, INVOICE_OFFSETS, 8)
  if (typeof body?.automationEnabled !== 'boolean' || !quoteOffsets || !invoiceOffsets) {
    throw createError({ statusCode: 400, message: 'Les réglages de relance sont invalides.' })
  }
  const updatedAt = new Date().toISOString()
  const { data, error } = await getSupabaseAdmin().from('email_delivery_settings').upsert({
    organization_id: org.id,
    automation_enabled: body.automationEnabled,
    quote_offsets: quoteOffsets,
    invoice_offsets: invoiceOffsets,
    updated_at: updatedAt,
  }, { onConflict: 'organization_id' }).select('automation_enabled,quote_offsets,invoice_offsets,updated_at').single()
  if (error) throw createError({ statusCode: 500, message: 'Impossible d’enregistrer les réglages e-mail.' })
  return { automationEnabled: data.automation_enabled, quoteOffsets: data.quote_offsets, invoiceOffsets: data.invoice_offsets, updatedAt: data.updated_at }
})
