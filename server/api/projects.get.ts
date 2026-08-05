export default defineEventHandler(async (event) => {
  const org = await resolveOrganizationContext(event)
  const supabase = getSupabaseAdmin()
  const columns = org?.role
    ? '*'
    : 'id,organization_id,title,slug,category,tags,description,image,live_url,code_url,featured,case_study_published,client_label,project_role,project_duration,completed_at,challenge,approach,solution,outcome,deliverables,gallery_images,results,seo_title,seo_description,created_at'
  let query = supabase
    .from('projects')
    .select(columns)
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
