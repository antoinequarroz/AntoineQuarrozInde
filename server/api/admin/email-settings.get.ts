const DEFAULTS = { automationEnabled: true, quoteOffsets: [3, 0], invoiceOffsets: [2, 0, -3, -10, -20] }

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const { data, error } = await getSupabaseAdmin().from('email_delivery_settings').select('automation_enabled,quote_offsets,invoice_offsets,updated_at').eq('organization_id', org.id).maybeSingle()
  if (error) throw createError({ statusCode: 500, message: 'Impossible de charger les réglages e-mail.' })
  return data
    ? { automationEnabled: data.automation_enabled, quoteOffsets: data.quote_offsets, invoiceOffsets: data.invoice_offsets, updatedAt: data.updated_at }
    : { ...DEFAULTS, updatedAt: null }
})
