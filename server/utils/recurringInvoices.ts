import { computeTotals, normalizeBillingItems } from './billing'
import { nextBillingNumber } from './billingWorkflow'
import { logAudit } from './audit'

export type RecurringCadence = 'monthly' | 'quarterly' | 'yearly'

export function nextRecurringDate(dateIso: string, cadence: RecurringCadence) {
  const [year, month, day] = dateIso.split('-').map(Number)
  if (!year || !month || !day) throw new Error('Date de récurrence invalide.')
  const addMonths = cadence === 'monthly' ? 1 : cadence === 'quarterly' ? 3 : 12
  const targetMonth = month - 1 + addMonths
  const targetYear = year + Math.floor(targetMonth / 12)
  const normalizedMonth = targetMonth % 12
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate()
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

export async function runRecurringInvoices(input: { organizationId: string, actorUserId?: string | null, today?: string }) {
  const today = input.today || new Date().toISOString().slice(0, 10)
  const supabase = getSupabaseAdmin()
  const { data: profiles, error } = await supabase.from('recurring_invoice_profiles').select('*').eq('organization_id', input.organizationId).eq('active', true).lte('next_issue_date', today)
  if (error) throw createError({ statusCode: 500, message: error.message })
  let generatedCount = 0
  let repairedCount = 0
  let skippedCount = 0
  for (const profile of profiles || []) {
    const scheduledDate = String(profile.next_issue_date)
    const items = normalizeBillingItems(profile.items)
    const totals = computeTotals(items)
    if (!items.length || totals.totalCents <= 0) { skippedCount += 1; continue }
    const nextDate = nextRecurringDate(scheduledDate, profile.cadence)
    const { data: existing } = await supabase.from('invoices').select('id,number').eq('organization_id', input.organizationId).eq('recurring_profile_id', profile.id).eq('recurring_scheduled_date', scheduledDate).maybeSingle()
    if (existing) {
      const { count, error: itemCountError } = await supabase.from('invoice_items').select('id', { count: 'exact', head: true }).eq('organization_id', input.organizationId).eq('invoice_id', existing.id)
      if (itemCountError) throw createError({ statusCode: 500, message: itemCountError.message })
      if (!count) {
        const { error: repairItemError } = await supabase.from('invoice_items').insert(items.map(item => ({ ...item, organization_id: input.organizationId, invoice_id: existing.id })))
        if (repairItemError) throw createError({ statusCode: 500, message: repairItemError.message })
      }
      const { error: repairRunError } = await supabase.from('recurring_invoice_runs').upsert({ organization_id: input.organizationId, profile_id: profile.id, scheduled_date: scheduledDate, invoice_id: existing.id }, { onConflict: 'organization_id,profile_id,scheduled_date' })
      if (repairRunError) throw createError({ statusCode: 500, message: repairRunError.message })
      const { error: repairProfileError } = await supabase.from('recurring_invoice_profiles').update({ next_issue_date: nextDate, last_generated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('organization_id', input.organizationId).eq('id', profile.id).eq('next_issue_date', scheduledDate)
      if (repairProfileError) throw createError({ statusCode: 500, message: repairProfileError.message })
      await logAudit({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: 'recurring_invoice.repaired', entityType: 'invoice', entityId: existing.id, clientId: profile.client_id, payload: { profileId: profile.id, scheduledDate, number: existing.number } })
      repairedCount += 1
      continue
    }
    const { data: numbers } = await supabase.from('invoices').select('number').eq('organization_id', input.organizationId)
    const number = nextBillingNumber('invoice', (numbers || []).map(row => String(row.number)))
    const due = new Date(`${scheduledDate}T12:00:00Z`)
    due.setUTCDate(due.getUTCDate() + Number(profile.payment_terms_days || 0))
    const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({ organization_id: input.organizationId, client_id: profile.client_id, project_id: profile.project_id, number, amount_cents: totals.totalCents, subtotal_cents: totals.subtotalCents, tax_cents: totals.taxCents, total_cents: totals.totalCents, currency: profile.currency, status: 'draft', issued_at: scheduledDate, due_at: due.toISOString().slice(0, 10), notes: profile.notes, document_type: 'invoice', payment_reference_type: 'NON', recurring_profile_id: profile.id, recurring_scheduled_date: scheduledDate }).select('*').single()
    if (invoiceError) {
      if (invoiceError.code === '23505') { skippedCount += 1; continue }
      throw createError({ statusCode: 500, message: invoiceError.message })
    }
    const { error: itemError } = await supabase.from('invoice_items').insert(items.map(item => ({ ...item, organization_id: input.organizationId, invoice_id: invoice.id })))
    if (itemError) {
      await supabase.from('invoices').delete().eq('organization_id', input.organizationId).eq('id', invoice.id).eq('status', 'draft')
      throw createError({ statusCode: 500, message: itemError.message })
    }
    const { error: runError } = await supabase.from('recurring_invoice_runs').upsert({ organization_id: input.organizationId, profile_id: profile.id, scheduled_date: scheduledDate, invoice_id: invoice.id }, { onConflict: 'organization_id,profile_id,scheduled_date' })
    if (runError) throw createError({ statusCode: 500, message: runError.message })
    const { error: profileError } = await supabase.from('recurring_invoice_profiles').update({ next_issue_date: nextDate, last_generated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('organization_id', input.organizationId).eq('id', profile.id).eq('next_issue_date', scheduledDate)
    if (profileError) throw createError({ statusCode: 500, message: profileError.message })
    await logAudit({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: 'recurring_invoice.generated', entityType: 'invoice', entityId: invoice.id, clientId: profile.client_id, payload: { profileId: profile.id, scheduledDate, number } })
    generatedCount += 1
  }
  return { generatedCount, repairedCount, skippedCount, generatedAt: new Date().toISOString() }
}
