export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readBody(event)

  const id = Number(body?.id)
  const status = String(body?.status || '').trim()
  const tags = Array.isArray(body?.tags)
    ? body.tags.map((value: unknown) => String(value || '').trim().toLowerCase()).filter(Boolean)
    : []

  const allowedStatuses = new Set(['new', 'in_progress', 'replied', 'archived'])
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Message invalide' })
  }
  if (!allowedStatuses.has(status)) {
    throw createError({ statusCode: 400, message: 'Statut invalide' })
  }

  const supabase = getSupabaseAdmin()
  const patch: Record<string, any> = { status, tags }

  if (status === 'replied') {
    patch.replied_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('contact_messages')
    .update(patch)
    .eq('organization_id', org.id)
    .eq('id', id)
    .select('id,name,email,subject,message,status,tags,replied_at,created_at')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 404, message: 'Message introuvable' })

  return {
    id: Number(data.id),
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    status: data.status,
    tags: data.tags || [],
    repliedAt: data.replied_at,
    createdAt: data.created_at,
  }
})
