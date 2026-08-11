export default defineEventHandler(async (event) => {
  const { org, client } = await requirePortalClient(event)
  const supabase = getSupabaseAdmin()
  const [projects, quotes, invoices] = await Promise.all([
    supabase.from('projects').select('id,title,category,description,image,live_url,workflow_status,starts_at,target_at,created_at').eq('organization_id', org.id).eq('client_id', client.id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('id,project_id,number,title,total_cents,currency,status,issued_at,valid_until,accepted_at,created_at').eq('organization_id', org.id).eq('client_id', client.id).neq('status', 'draft').order('created_at', { ascending: false }),
    supabase.from('invoices').select('id,project_id,number,total_cents,currency,status,document_type,issued_at,due_at,paid_at,created_at').eq('organization_id', org.id).eq('client_id', client.id).neq('status', 'draft').order('created_at', { ascending: false }),
  ])
  const firstError = projects.error || quotes.error || invoices.error
  if (firstError) throw createError({ statusCode: 500, message: firstError.message })

  const invoiceIds = (invoices.data || []).map(invoice => invoice.id)
  const projectIds = (projects.data || []).map(project => project.id)
  const [milestones, deliverables, projectNotes] = projectIds.length
    ? await Promise.all([
        supabase.from('project_milestones').select('id,project_id,title,due_at,status').eq('organization_id', org.id).in('project_id', projectIds).order('due_at'),
        supabase.from('project_deliverables').select('id,project_id,title,url,status').eq('organization_id', org.id).in('project_id', projectIds).eq('client_visible', true).order('created_at', { ascending: false }),
        supabase.from('project_notes').select('id,project_id,kind,title,content,occurred_at').eq('organization_id', org.id).in('project_id', projectIds).eq('client_visible', true).order('occurred_at', { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
  const projectContentError = milestones.error || deliverables.error || projectNotes.error
  if (projectContentError) throw createError({ statusCode: 500, message: projectContentError.message })
  const payments = invoiceIds.length
    ? await supabase.from('invoice_payments').select('id,invoice_id,amount_cents,currency,method,paid_at,reference,voided_at').eq('organization_id', org.id).in('invoice_id', invoiceIds).order('paid_at', { ascending: false })
    : { data: [], error: null }
  if (payments.error) throw createError({ statusCode: 500, message: payments.error.message })

  const paidByInvoice = new Map<number, number>()
  for (const payment of payments.data || []) {
    if (!payment.voided_at) paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) || 0) + Number(payment.amount_cents))
  }
  const portalInvoices = (invoices.data || []).map(invoice => ({
    ...invoice,
    paid_amount_cents: paidByInvoice.get(invoice.id) || 0,
    payments: (payments.data || []).filter(payment => payment.invoice_id === invoice.id && !payment.voided_at),
  }))

  return {
    organization: { name: org.name },
    client: { id: client.id, name: client.name, company: client.company || null },
    projects: (projects.data || []).map(project => ({
      ...project,
      milestones: (milestones.data || []).filter(item => item.project_id === project.id),
      deliverables: (deliverables.data || []).filter(item => item.project_id === project.id),
      notes: (projectNotes.data || []).filter(item => item.project_id === project.id),
    })),
    quotes: quotes.data || [],
    invoices: portalInvoices,
    payments: { twintAvailable: isTwintConfigured(useRuntimeConfig()) },
  }
})
