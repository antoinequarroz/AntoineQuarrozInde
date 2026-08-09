export async function requirePortalClient(event: any) {
  const org = await resolveOrganizationContext(event, { requireAuth: true, minRole: 'client' })
  const user = event.context.user
  if (!user?.email) throw createError({ statusCode: 403, message: 'Adresse e-mail utilisateur manquante.' })

  const { data: client, error } = await getSupabaseAdmin()
    .from('clients')
    .select('*')
    .eq('organization_id', org.id)
    .ilike('email', user.email)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!client) throw createError({ statusCode: 403, message: 'Aucune fiche client liée à ce compte.' })
  return { org, user, client }
}
