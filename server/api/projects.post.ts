export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const payload = projectPayload(body, org.id)
  const publication = projectPublicationState(payload)
  assertCanChangeProjectPublication(org.role, null, publication)

  const { data, error } = await supabase
    .rpc('save_project_with_publication_audit', {
      p_organization_id: org.id,
      p_project_id: null,
      p_actor_user_id: user?.id ?? null,
      p_actor_role: org.role,
      p_payload: payload,
    })

  if (error) {
    throw projectPublicationRpcError(error)
  }

  return data
})
