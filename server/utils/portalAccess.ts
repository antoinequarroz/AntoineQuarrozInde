export async function requirePortalClient(event: any) {
  const org = await resolveOrganizationContext(event, { requireAuth: true, minRole: 'client' })
  const user = event.context.user
  if (!user?.id || !user?.email) throw createError({ statusCode: 403, message: 'Identité utilisateur incomplète.' })

  const supabase = getSupabaseAdmin()
  const { data: linkedClient, error: linkedError } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', org.id)
    .eq('portal_user_id', user.id)
    .maybeSingle()
  if (linkedError) throw createError({ statusCode: 500, message: linkedError.message })

  let client = linkedClient
  if (!client) {
    const { data: emailClient, error: emailError } = await supabase.from('clients')
      .select('*')
      .eq('organization_id', org.id)
      .is('portal_user_id', null)
      .ilike('email', user.email)
      .maybeSingle()
    if (emailError) throw createError({ statusCode: 500, message: emailError.message })
    client = emailClient
    if (client) {
      const { data: linked, error: linkError } = await supabase.from('clients').update({ portal_user_id: user.id, portal_activated_at: client.portal_activated_at || new Date().toISOString() })
        .eq('organization_id', org.id).eq('id', client.id).is('portal_user_id', null).select('*').maybeSingle()
      if (linkError) throw createError({ statusCode: 500, message: linkError.message })
      client = linked
    }
  }
  if (!client) throw createError({ statusCode: 403, message: 'Aucune fiche client liée à ce compte.' })
  if (client.portal_access_disabled_at) throw createError({ statusCode: 403, message: 'Cet accès portail a été suspendu. Contactez Antoine.' })
  return { org, user, client }
}
