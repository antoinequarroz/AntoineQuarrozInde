import { normalizeBillingItems } from '../../utils/billing'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const cadence = String(body.cadence || '')
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw createError({ statusCode: 400, message: 'Ajoute entre 1 et 50 lignes facturables.' })
  const items = normalizeBillingItems(body.items)
  if (!['monthly', 'quarterly', 'yearly'].includes(cadence)) throw createError({ statusCode: 400, message: 'Cadence invalide.' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.nextIssueDate || ''))) throw createError({ statusCode: 400, message: 'Prochaine date invalide.' })
  if (!items.length || items.some(item => item.label.length > 200 || (item.description?.length || 0) > 2_000 || item.quantity > 10_000 || item.unit_price_cents > 100_000_000 || item.tax_rate > 100)) throw createError({ statusCode: 400, message: 'Une ligne facturable est invalide ou trop volumineuse.' })
  const storedItems = items.map(item => ({ label: item.label, description: item.description, quantity: item.quantity, unitPriceCents: item.unit_price_cents, taxRate: item.tax_rate }))
  const payload = { organization_id: org.id, client_id: Number(body.clientId) || null, project_id: Number(body.projectId) || null, name: String(body.name || '').trim(), cadence, next_issue_date: body.nextIssueDate, payment_terms_days: Math.min(365, Math.max(0, Number(body.paymentTermsDays ?? 30))), currency: body.currency === 'EUR' ? 'EUR' : 'CHF', items: storedItems, notes: String(body.notes || '').trim().slice(0, 5_000) || null, active: true }
  if (!payload.name || !payload.client_id) throw createError({ statusCode: 400, message: 'Nom et client obligatoires.' })
  const { data, error } = await getSupabaseAdmin().from('recurring_invoice_profiles').insert(payload).select('*').single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  await logAudit({ organizationId: org.id, actorUserId: user?.id, action: 'recurring_invoice.created', entityType: 'recurring_invoice_profile', entityId: data.id, clientId: data.client_id, payload: { cadence, nextIssueDate: data.next_issue_date } })
  return data
})
