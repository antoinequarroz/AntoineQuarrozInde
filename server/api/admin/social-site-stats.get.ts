export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const config = useRuntimeConfig()
  // The PostHog project is a single-site credential, not a shared tenant source.
  if (org.slug !== String(config.public.defaultOrganizationSlug)) {
    return socialSiteResponse(null, false, false)
  }
  const apiKey = String(config.posthogPersonalApiKey || '')
  const projectId = String(config.posthogProjectId || '')
  if (!apiKey || !projectId) return socialSiteResponse(null, false, false)
  try {
    const result = await $fetch<{ results?: unknown[][] }>(`https://eu.posthog.com/api/projects/${encodeURIComponent(projectId)}/query/`, {
      method: 'POST', timeout: 15_000, headers: { authorization: `Bearer ${apiKey}` },
      body: { query: { kind: 'HogQLQuery', query: SOCIAL_SITE_QUERY }, name: 'site_admin_social_30d', refresh: 'blocking' },
    })
    return socialSiteResponse(result.results, true, true)
  }
  catch { return socialSiteResponse(null, false, true) }
})
