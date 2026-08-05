export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody<{ clientId?: number }>(event)
  if (!body.clientId) throw createError({ statusCode: 400, message: 'Client manquant' })

  const supabase = getSupabaseAdmin()
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id,email,name')
    .eq('organization_id', org.id)
    .eq('id', body.clientId)
    .single()
  if (clientError || !client) throw createError({ statusCode: 404, message: 'Client introuvable' })
  if (!client.email) throw createError({ statusCode: 400, message: 'Ajoute une adresse e-mail au client' })

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1_000 })
  if (usersError) throw createError({ statusCode: 500, message: usersError.message })
  let invitedUser = usersData.users.find(existing => existing.email?.toLowerCase() === client.email.toLowerCase())

  if (!invitedUser) {
    const config = useRuntimeConfig()
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(client.email, {
      redirectTo: `${config.public.siteUrl.replace(/\/$/, '')}/portal/setup`,
      data: { name: client.name },
    })
    if (error || !data.user) throw createError({ statusCode: 500, message: error?.message || 'Invitation impossible' })
    invitedUser = data.user
  }

  const { data: existingMembership, error: lookupError } = await supabase
    .from('organization_memberships')
    .select('id')
    .eq('organization_id', org.id)
    .eq('user_id', invitedUser.id)
    .maybeSingle()
  if (lookupError) throw createError({ statusCode: 500, message: lookupError.message })
  if (!existingMembership) {
    const { error: membershipError } = await supabase.from('organization_memberships').insert({
      organization_id: org.id,
      user_id: invitedUser.id,
      role: 'client',
    })
    if (membershipError) throw createError({ statusCode: 500, message: membershipError.message })
  }

  await logAudit({
    organizationId: org.id,
    actorUserId: user?.id,
    action: 'client.portal_invite',
    entityType: 'client',
    entityId: String(client.id),
    payload: { email: client.email },
  })
  return { invited: true, email: client.email }
})
