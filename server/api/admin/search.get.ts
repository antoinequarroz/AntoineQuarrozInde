type SearchResult = {
  key: string
  label: string
  sub: string
  to: string
}

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const query = String(getQuery(event).q || '').trim()
  const limit = Math.min(Math.max(Number(getQuery(event).limit) || 10, 1), 20)

  if (!query) return []

  const ilike = `%${query.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`

  const [
    clientsRes,
    tasksRes,
    quotesRes,
    invoicesRes,
    projectsRes,
    articlesRes,
  ] = await Promise.all([
    supabase.from('clients')
      .select('id,name,email')
      .eq('organization_id', org.id)
      .or(`name.ilike.${ilike},company.ilike.${ilike},email.ilike.${ilike}`)
      .limit(5),
    supabase.from('tasks')
      .select('id,title,status')
      .eq('organization_id', org.id)
      .or(`title.ilike.${ilike},description.ilike.${ilike}`)
      .limit(5),
    supabase.from('quotes')
      .select('id,number,title,status')
      .eq('organization_id', org.id)
      .or(`number.ilike.${ilike},title.ilike.${ilike}`)
      .limit(5),
    supabase.from('invoices')
      .select('id,number,status,notes')
      .eq('organization_id', org.id)
      .or(`number.ilike.${ilike},notes.ilike.${ilike}`)
      .limit(5),
    supabase.from('projects')
      .select('id,title,category,tags')
      .eq('organization_id', org.id)
      .or(`title.ilike.${ilike},description.ilike.${ilike}`)
      .limit(5),
    supabase.from('articles')
      .select('id,title,published,tags')
      .eq('organization_id', org.id)
      .or(`title.ilike.${ilike},excerpt.ilike.${ilike}`)
      .limit(5),
  ])

  const errors = [
    clientsRes.error,
    tasksRes.error,
    quotesRes.error,
    invoicesRes.error,
    projectsRes.error,
    articlesRes.error,
  ].filter(Boolean)

  if (errors.length) {
    throw createError({ statusCode: 500, message: errors[0]!.message })
  }

  const results: SearchResult[] = [
    ...((clientsRes.data || []).map(item => ({
      key: `client-${item.id}`,
      label: item.name,
      sub: `Client · ${item.email}`,
      to: `/admin/clients/${item.id}`,
    }))),
    ...((tasksRes.data || []).map(item => ({
      key: `task-${item.id}`,
      label: item.title,
      sub: `Tache · ${item.status}`,
      to: `/admin/tasks?taskId=${item.id}`,
    }))),
    ...((quotesRes.data || []).map(item => ({
      key: `quote-${item.id}`,
      label: `${item.number} · ${item.title}`,
      sub: `Devis · ${item.status}`,
      to: `/admin/quotes?quoteId=${item.id}`,
    }))),
    ...((invoicesRes.data || []).map(item => ({
      key: `invoice-${item.id}`,
      label: item.number,
      sub: `Facture · ${item.status}`,
      to: `/admin/invoices?invoiceId=${item.id}`,
    }))),
    ...((projectsRes.data || []).map(item => ({
      key: `project-${item.id}`,
      label: item.title,
      sub: `Projet · ${item.category}`,
      to: `/admin/projects?editId=${item.id}`,
    }))),
    ...((articlesRes.data || []).map(item => ({
      key: `article-${item.id}`,
      label: item.title,
      sub: `Article · ${item.published ? 'publie' : 'brouillon'}`,
      to: `/admin/articles?editId=${item.id}`,
    }))),
  ]

  return results.slice(0, limit)
})
