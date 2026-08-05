export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (org?.id) query = query.eq('organization_id', org.id)
  const { data, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (org?.role) return data ?? []

  return (data ?? []).map(project => project.case_study_published
    ? project
    : {
        ...project,
        client_label: null,
        project_role: null,
        project_duration: null,
        completed_at: null,
        challenge: null,
        approach: null,
        solution: null,
        outcome: null,
        deliverables: [],
        gallery_images: [],
        results: [],
        seo_title: null,
        seo_description: null,
      })
})
