export default defineEventHandler(async (event) => {
  const user = await getUserFromBearer(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organization_memberships')
    .select('organization_id, role, organizations(id, name, slug)')
    .eq('user_id', user.id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  const memberships = data || []
  const hasAdministrativeMembership = memberships.some((item: any) => (
    ['owner', 'admin', 'manager', 'viewer'].includes(String(item.role || ''))
  ))
  if (hasAdministrativeMembership) await requireAdminMfa(event, user)

  return memberships.map((item: any) => {
    const org = Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
    return {
      id: item.organization_id,
      role: item.role,
      name: org?.name || '',
      slug: org?.slug || '',
    }
  })
})
