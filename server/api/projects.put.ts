export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) throw createError({ statusCode: 400, message: 'Missing project id' })

  const supabase = getSupabaseAdmin()
  const payload = projectPayload(body, org.id)

  const { data, error } = await supabase
    .rpc('save_project_with_publication_audit', {
      p_organization_id: org.id,
      p_project_id: id,
      p_actor_user_id: user?.id ?? null,
      // Kept only for the stable RPC signature. The activated database RPC
      // derives the authoritative role from organization_memberships.
      p_actor_role: null,
      p_payload: payload,
    })

  if (error) {
    throw projectPublicationRpcError(error)
  }

  return data
})
