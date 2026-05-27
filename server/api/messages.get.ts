export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('contact_messages')
    .select('id,name,email,subject,message,status,replied_at,created_at')
    .order('created_at', { ascending: false })

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
    repliedAt: item.replied_at,
    createdAt: item.created_at,
  }))
})
