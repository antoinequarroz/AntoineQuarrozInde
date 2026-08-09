export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event, { requireAuth: true, minRole: 'viewer' })
  const projectId = Number(getQuery(event).projectId)
  if (!Number.isInteger(projectId) || projectId <= 0) throw createError({ statusCode: 400, message: 'Projet invalide.' })
  const supabase = getSupabaseAdmin()
  const projectQuery = supabase.from('projects').select('*').eq('organization_id', org.id).eq('id', projectId).single()
  const [project, milestones, timeEntries, notes, deliverables, tasks, quotes, invoices] = await Promise.all([
    projectQuery,
    supabase.from('project_milestones').select('*').eq('organization_id', org.id).eq('project_id', projectId).order('due_at'),
    supabase.from('project_time_entries').select('*').eq('organization_id', org.id).eq('project_id', projectId).order('worked_at', { ascending: false }),
    supabase.from('project_notes').select('*').eq('organization_id', org.id).eq('project_id', projectId).order('occurred_at', { ascending: false }),
    supabase.from('project_deliverables').select('*').eq('organization_id', org.id).eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('id,title,status,priority,due_date').eq('organization_id', org.id).eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('quotes').select('id,number,status,total_cents,amount_cents,currency').eq('organization_id', org.id).eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('id,number,status,total_cents,amount_cents,currency,document_type').eq('organization_id', org.id).eq('project_id', projectId).order('created_at', { ascending: false }),
  ])
  const error = project.error || milestones.error || timeEntries.error || notes.error || deliverables.error || tasks.error || quotes.error || invoices.error
  if (error) throw createError({ statusCode: project.error?.code === 'PGRST116' ? 404 : 500, message: error.message })
  const minutes = (timeEntries.data || []).reduce((sum, entry) => sum + Number(entry.minutes || 0), 0)
  const invoiceRows = invoices.data || []
  const invoiceIds = invoiceRows.map(invoice => invoice.id)
  const payments = invoiceIds.length
    ? await supabase.from('invoice_payments').select('invoice_id,amount_cents,voided_at').eq('organization_id', org.id).in('invoice_id', invoiceIds)
    : { data: [], error: null }
  if (payments.error) throw createError({ statusCode: 500, message: payments.error.message })

  const signByInvoice = new Map(invoiceRows.map(invoice => [invoice.id, invoice.document_type === 'credit_note' ? -1 : 1]))
  const quotedCents = (quotes.data || [])
    .filter(quote => quote.status === 'accepted')
    .reduce((sum, quote) => sum + Number(quote.total_cents ?? quote.amount_cents ?? 0), 0)
  const invoicedCents = invoiceRows
    .filter(invoice => invoice.status !== 'cancelled')
    .reduce((sum, invoice) => sum + (signByInvoice.get(invoice.id) || 1) * Number(invoice.total_cents ?? invoice.amount_cents ?? 0), 0)
  const collectedCents = (payments.data || [])
    .filter(payment => !payment.voided_at)
    .reduce((sum, payment) => sum + (signByInvoice.get(payment.invoice_id) || 1) * Number(payment.amount_cents || 0), 0)
  const finance = computeProjectFinance({
    budgetCents: Number(project.data.budget_cents || 0),
    internalHourlyCostCents: Number(project.data.internal_hourly_cost_cents || 0),
    trackedMinutes: minutes,
    quotedCents,
    invoicedCents,
    collectedCents,
  })

  return {
    project: project.data,
    milestones: milestones.data || [],
    timeEntries: timeEntries.data || [],
    notes: notes.data || [],
    deliverables: deliverables.data || [],
    tasks: tasks.data || [],
    quotes: quotes.data || [],
    invoices: invoiceRows,
    totals: { minutes, finance },
  }
})
