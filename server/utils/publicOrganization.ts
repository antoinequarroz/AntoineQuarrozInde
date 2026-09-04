export async function resolveCanonicalPublicOrganizationId() {
  const config = useRuntimeConfig()
  const slug = String(config.public.defaultOrganizationSlug || '').trim()
  if (!slug) return null

  const { data, error } = await getSupabaseAdmin()
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data?.id ? String(data.id) : null
}
