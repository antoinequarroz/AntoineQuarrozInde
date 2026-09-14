export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()
  const dueSoonIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [
    invoicesRes,
    quotesRes,
    tasksRes,
    appointmentsRes,
    messagesRes,
    applicationErrorsRes,
    socialPostsRes,
    commercialEventsRes,
  ] = await Promise.all([
    supabase.from('invoices')
      .select('number', { count: 'exact', head: false })
      .eq('organization_id', org.id)
      .eq('status', 'overdue'),
    supabase.from('quotes')
      .select('number', { count: 'exact', head: false })
      .eq('organization_id', org.id)
      .eq('status', 'draft'),
    supabase.from('tasks')
      .select('id', { count: 'exact', head: false })
      .eq('organization_id', org.id)
      .neq('status', 'done')
      .lte('due_date', dueSoonIso),
    supabase.from('appointments')
      .select('title,starts_at')
      .eq('organization_id', org.id)
      .eq('status', 'scheduled')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(1),
    supabase.from('contact_messages')
      .select('id', { count: 'exact', head: false })
      .eq('organization_id', org.id)
      .eq('status', 'new'),
    supabase.from('application_errors')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .is('resolved_at', null),
    supabase.from('social_posts')
      .select('id,status')
      .eq('organization_id', org.id)
      .in('status', ['draft', 'failed']),
    supabase.from('audit_logs')
      .select('action,entity_type,entity_id,payload,created_at')
      .eq('organization_id', org.id)
      .in('action', ['commercial_workflow.success', 'commercial_workflow.failure', 'commercial_workflow.recovered'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const errors = [invoicesRes.error, quotesRes.error, tasksRes.error, appointmentsRes.error, messagesRes.error, applicationErrorsRes.error, socialPostsRes.error, commercialEventsRes.error].filter(Boolean)
  if (errors.length) {
    throw createError({ statusCode: 500, message: errors[0]!.message })
  }

  const alerts: Array<{ id: string, text: string, to: string }> = []
  const overdueCount = invoicesRes.count || 0
  const newMessages = messagesRes.count || 0
  const draftQuotes = quotesRes.count || 0
  const dueTasks = tasksRes.count || 0
  const nextAppointment = appointmentsRes.data?.[0]
  const applicationErrors = applicationErrorsRes.count || 0
  const socialDrafts = (socialPostsRes.data || []).filter(post => post.status === 'draft').length
  const socialFailures = (socialPostsRes.data || []).filter(post => post.status === 'failed').length
  const commercialHealth = summarizeCommercialWorkflow(commercialEventsRes.data || [])

  if (overdueCount > 0) alerts.push({ id: 'overdue', text: `${overdueCount} facture(s) en retard`, to: '/admin/invoices' })
  if (newMessages > 0) alerts.push({ id: 'messages', text: `${newMessages} nouveau(x) message(s)`, to: '/admin/messages' })
  if (draftQuotes > 0) alerts.push({ id: 'quotes', text: `${draftQuotes} devis en brouillon`, to: '/admin/quotes' })
  if (dueTasks > 0) alerts.push({ id: 'tasks', text: `${dueTasks} tache(s) a traiter sous 3 jours`, to: '/admin/tasks' })
  if (nextAppointment) alerts.push({ id: 'appt', text: `Prochain RDV: ${nextAppointment.title}`, to: '/admin/appointments' })
  if (applicationErrors > 0) alerts.push({ id: 'app-errors', text: `${applicationErrors} erreur(s) applicative(s) à traiter`, to: '/admin/errors' })
  if (socialDrafts > 0) alerts.push({ id: 'social-drafts', text: `${socialDrafts} publication(s) sociale(s) à valider`, to: '/admin/social' })
  if (socialFailures > 0) alerts.push({ id: 'social-failures', text: `${socialFailures} publication(s) sociale(s) en échec`, to: '/admin/social' })
  if (commercialHealth.totals.unresolved > 0) alerts.push({ id: 'commercial-health', text: `${commercialHealth.totals.unresolved} rupture(s) du parcours commercial à vérifier`, to: '/admin/errors' })

  return alerts
})
