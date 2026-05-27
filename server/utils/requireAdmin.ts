export async function requireAdmin(event: any) {
  const authHeader = getHeader(event, 'authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Missing bearer token' })
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) throw createError({ statusCode: 401, message: 'Invalid bearer token' })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  if (config.adminEmail && data.user.email !== config.adminEmail) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  return data.user
}
