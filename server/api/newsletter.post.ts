import { NewsletterSubscriptionError, normalizeNewsletterSubscription } from '../utils/newsletterSubscription'

const newsletterRequests = createBoundedRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  maxKeys: 500,
})
const MAX_NEWSLETTER_REQUEST_BYTES = 4 * 1024
const MIN_FORM_FILL_MS = 800

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  if (!newsletterRequests.isAllowed(ip, now)) {
    throw createError({ statusCode: 429, message: 'Trop de requêtes, réessayez plus tard.' })
  }

  const body = await readJsonBodyLimited(event, MAX_NEWSLETTER_REQUEST_BYTES)
  let subscription: ReturnType<typeof normalizeNewsletterSubscription>
  try {
    subscription = normalizeNewsletterSubscription(body)
  }
  catch (error) {
    if (error instanceof NewsletterSubscriptionError) {
      throw createError({ statusCode: 400, message: 'L’inscription contient une valeur invalide.' })
    }
    throw error
  }

  const startedAt = Number(body.startedAt)
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FORM_FILL_MS) {
    throw createError({ statusCode: 400, message: 'Soumission trop rapide.' })
  }

  const org = await resolveOrganizationContext(event)
  if (!org?.id) {
    throw createError({ statusCode: 503, message: 'La newsletter est temporairement indisponible.' })
  }

  const consentedAt = new Date().toISOString()
  const lumailSubscriber = await syncLumailNewsletterSubscriber({
    ...subscription,
    consentedAt,
  })
  const supabase = getSupabaseAdmin()
  const { data: existing, error: readError } = await supabase
    .from('newsletter_subscriptions')
    .select('id,status')
    .eq('organization_id', org.id)
    .eq('email', subscription.email)
    .maybeSingle()
  if (readError) throw createError({ statusCode: 500, message: 'L’inscription ne peut pas être vérifiée.' })

  if (existing) {
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .update({
        locale: subscription.locale,
        source_path: subscription.sourcePath,
        status: 'active',
        consented_at: consentedAt,
        unsubscribed_at: null,
        updated_at: consentedAt,
        lumail_subscriber_id: lumailSubscriber.id,
        lumail_status: lumailSubscriber.status,
        lumail_synced_at: consentedAt,
      })
      .eq('organization_id', org.id)
      .eq('id', existing.id)
    if (error) throw createError({ statusCode: 500, message: 'L’inscription ne peut pas être réactivée.' })
    return { success: true, duplicate: existing.status === 'active', reactivated: existing.status !== 'active' }
  }

  const { error } = await supabase.from('newsletter_subscriptions').insert({
    organization_id: org.id,
    email: subscription.email,
    locale: subscription.locale,
    source_path: subscription.sourcePath,
    status: 'active',
    consented_at: consentedAt,
    lumail_subscriber_id: lumailSubscriber.id,
    lumail_status: lumailSubscriber.status,
    lumail_synced_at: consentedAt,
  })
  if (error?.code === '23505') return { success: true, duplicate: true }
  if (error) throw createError({ statusCode: 500, message: 'L’inscription ne peut pas être enregistrée.' })

  return { success: true, duplicate: false }
})
