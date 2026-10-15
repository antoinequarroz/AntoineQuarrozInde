import { supportsInstagramMixed } from '../../utils/socialMedia'

export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_REQUEST_BYTES)
  const organization = await resolveHermesOrganization()
  const supabase = getSupabaseAdmin()
  const action = String(body.action || '')
  if (action === 'readiness') {
    const platform = validateSocialPlatform(body.platform)
    const state = ['ready', 'blocked', 'unknown'].includes(String(body.state)) ? String(body.state) : 'unknown'
    const message = String(body.message || '').trim().slice(0, 300)
    if (!message) throw createError({ statusCode: 400, message: 'Message requis.' })
    const { error } = await supabase.from('social_platform_connections').upsert({
      organization_id: organization.id, platform, state, message, checked_at: new Date().toISOString(),
      ...(state === 'ready' ? { last_success_at: new Date().toISOString() } : {}),
    }, { onConflict: 'organization_id,platform' })
    if (error) throw createError({ statusCode: 500, message: error.message })
    return { ok: true }
  }
  const id = typeof body.id === 'string' ? body.id : ''
  const version = validateExpectedVersion(body.version)
  if (!id) throw createError({ statusCode: 400, message: 'Identifiant requis.' })
  if (action === 'claim') {
    if (!supportsInstagramMixed(event)) {
      const { data: candidate, error: candidateError } = await supabase.from('social_posts').select('media_items')
        .eq('organization_id', organization.id).eq('id', id).maybeSingle()
      if (candidateError) throw createError({ statusCode: 500, message: 'Publication indisponible.' })
      if (candidate?.media_items?.length) throw createError({ statusCode: 409, message: 'Ce carrousel nécessite un publisher compatible instagram-mixed-v1.' })
    }
    const { data, error } = await supabase.rpc('claim_social_post', {
      p_organization_id: organization.id, p_post_id: id, p_expected_version: version,
    })
    if (error) throw createError({ statusCode: 500, message: error.message })
    const post = data?.[0]
    if (!post) throw createError({ statusCode: 409, message: 'Publication déjà prise ou modifiée.' })
    return { post }
  }
  if (action === 'preflight_fail') {
    const { data, error } = await supabase.from('social_posts').update({
      last_error: cleanSocialError(body.error), updated_at: new Date().toISOString(),
    }).eq('organization_id', organization.id).eq('id', id).eq('status', 'approved')
      .eq('publication_mode', 'automatic').eq('version', version).select('id,status,version').maybeSingle()
    if (error) throw createError({ statusCode: 500, message: 'Le blocage n’a pas pu être enregistré.' })
    if (!data) throw createError({ statusCode: 409, message: 'Le brouillon a changé.' })
    return { post: data }
  }
  if (!['complete', 'fail'].includes(action)) throw createError({ statusCode: 400, message: 'Action invalide.' })
  if (action === 'complete') {
    const externalId = String(body.externalPostId || '').trim()
    if (!externalId) throw createError({ statusCode: 400, message: 'Identifiant de publication manquant.' })
    if (!String(body.externalPostUrl || '').startsWith('https://')) {
      // A confirmed Instagram media ID is already a successful write. A failed
      // permalink lookup must not turn it into a retryable failed publication.
      const { data: current } = await supabase.from('social_posts').select('platform')
        .eq('organization_id', organization.id).eq('id', id).eq('status', 'publishing')
        .eq('publication_mode', 'automatic').eq('version', version).maybeSingle()
      if (current?.platform !== 'instagram' || !/^\d{1,30}$/.test(externalId) || body.externalPostUrl) {
        throw createError({ statusCode: 400, message: 'Reçu public de publication manquant.' })
      }
    }
  }
  const updates = action === 'complete'
    ? {
        status: 'published', external_post_id: String(body.externalPostId || '').slice(0, 300) || null,
        external_post_url: String(body.externalPostUrl || '').slice(0, 1000) || null,
        published_at: new Date().toISOString(), last_error: null,
      }
    : { status: 'failed', last_error: cleanSocialError(body.error) }
  const { data, error } = await supabase.from('social_posts').update({
    ...updates, version: version + 1, updated_at: new Date().toISOString(),
  }).eq('organization_id', organization.id).eq('id', id).eq('status', 'publishing').eq('version', version)
    .in('platform', ['linkedin', 'x', 'instagram']).eq('publication_mode', 'automatic')
    .select('id,status,version').maybeSingle()
  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 409, message: 'État de publication incompatible.' })
  return { post: data }
})
