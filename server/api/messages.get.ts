export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const email = String(getQuery(event).email || '').trim().toLowerCase()

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('contact_messages')
    .select('id,name,email,subject,message,status,tags,replied_at,created_at')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  if (email) query = query.ilike('email', email)

  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return (data || []).map(item => ({
    id: Number(item.id),
    name: item.name,
    email: item.email,
    subject: item.subject,
    message: item.message,
    status: item.status,
    tags: item.tags || [],
    repliedAt: item.replied_at,
    createdAt: item.created_at,
  }))
})
