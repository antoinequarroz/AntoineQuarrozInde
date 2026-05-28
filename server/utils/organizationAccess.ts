type OrgRole = 'owner' | 'admin' | 'manager' | 'viewer' | 'client'

type OrganizationRow = {
  id: string
  name: string
  slug: string
}

type MembershipRow = {
  organization_id: string
  role: OrgRole
  organizations: OrganizationRow | OrganizationRow[] | null
}

const roleWeight: Record<OrgRole, number> = {
  owner: 50,
  admin: 40,
  manager: 30,
  viewer: 20,
  client: 10,
}

function pickOrganization(organizations: OrganizationRow | OrganizationRow[] | null): OrganizationRow | null {
  if (!organizations) return null
  return Array.isArray(organizations) ? (organizations[0] ?? null) : organizations
}

export async function getUserFromBearer(event: any) {
  const authHeader = getHeader(event, 'authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return null

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return null

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function resolveOrganizationContext(
  event: any,
  options?: {
    requireAuth?: boolean
    minRole?: OrgRole
    requireWriteAccess?: boolean
  },
) {
  const requireAuth = Boolean(options?.requireAuth)
  const minRole = options?.minRole || (options?.requireWriteAccess ? 'manager' : undefined)

  const user = await getUserFromBearer(event)
  if (requireAuth && !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const requestedOrgId = String(getHeader(event, 'x-organization-id') || '').trim()
  const supabase = getSupabaseAdmin()

  if (user) {
    let query = supabase
      .from('organization_memberships')
      .select('organization_id, role, organizations(id, name, slug)')
      .eq('user_id', user.id)

    if (requestedOrgId) query = query.eq('organization_id', requestedOrgId)

    const { data, error } = await query
    if (error) throw createError({ statusCode: 500, message: error.message })
    const memberships = (data || []) as MembershipRow[]
    if (!memberships.length) {
      throw createError({ statusCode: 403, message: 'No organization membership found' })
    }

    memberships.sort((a, b) => roleWeight[b.role] - roleWeight[a.role])
    const selected = memberships[0]
    const org = pickOrganization(selected.organizations)
    if (!org) throw createError({ statusCode: 500, message: 'Organization not found' })

    if (minRole && roleWeight[selected.role] < roleWeight[minRole]) {
      throw createError({ statusCode: 403, message: 'Insufficient role for this action' })
    }

    event.context.org = {
      id: selected.organization_id,
      role: selected.role,
      name: org.name,
      slug: org.slug,
    }
    event.context.user = user
    return event.context.org
  }

  const config = useRuntimeConfig()
  const publicOrgSlug = config.public.defaultOrganizationSlug || ''
  if (!publicOrgSlug) return null

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', publicOrgSlug)
    .maybeSingle()

  if (orgError) throw createError({ statusCode: 500, message: orgError.message })
  if (!org) return null

  event.context.org = {
    id: org.id,
    role: null,
    name: org.name,
    slug: org.slug,
  }
  return event.context.org
}
