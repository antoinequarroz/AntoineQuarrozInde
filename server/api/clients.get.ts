export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const mode = String(query.mode || '')
  const page = Math.max(Number(query.page) || 1, 1)
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100)
  const q = String(query.q || '').trim()
  const status = String(query.status || 'all')
  const sort = String(query.sort || 'created_at')
  const order = String(query.order || 'desc') === 'asc'
  const hideLeads = String(query.hideLeads || '') === '1'
  const rangeFrom = (page - 1) * pageSize
  const rangeTo = rangeFrom + pageSize - 1

  let builder = supabase
    .from('clients')
    .select('*', mode === 'page' ? { count: 'exact' } : undefined)
    .eq('organization_id', org.id)

  if (status === 'lead' || status === 'active' || status === 'inactive') {
    builder = builder.eq('status', status)
  }

  if (hideLeads) {
    builder = builder.neq('status', 'lead')
  }

  if (q) {
    const escaped = q.replaceAll('%', '\\%').replaceAll('_', '\\_')
    builder = builder.or(`name.ilike.%${escaped}%,company.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`)
  }

  const sortable = new Set(['created_at', 'name', 'email', 'status'])
  const sortColumn = sortable.has(sort) ? sort : 'created_at'
  builder = builder.order(sortColumn, { ascending: order })

  if (mode === 'page') {
    builder = builder.range(rangeFrom, rangeTo)
  }

  const { data, error, count } = await builder

  if (error) throw createError({ statusCode: 500, message: error.message })

  if (mode === 'page') {
    return {
      items: (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        company: row.company,
        email: row.email,
        phone: row.phone,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at?.slice(0, 10) ?? '',
      })),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  return data ?? []
})
