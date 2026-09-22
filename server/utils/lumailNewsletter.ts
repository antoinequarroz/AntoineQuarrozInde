import { Lumail } from 'lumail'

type NewsletterSubscriberInput = {
  email: string
  locale: 'fr' | 'en' | 'de'
  sourcePath: string
  consentedAt: string
}

export type LumailNewsletterSubscriber = {
  id: string | null
  status: string | null
}

export async function syncLumailNewsletterSubscriber(input: NewsletterSubscriberInput): Promise<LumailNewsletterSubscriber> {
  const config = useRuntimeConfig()
  if (!config.lumailApiKey) {
    throw createError({ statusCode: 503, message: 'La liste newsletter Lumail n’est pas configurée.' })
  }

  const lumail = new Lumail({ apiKey: String(config.lumailApiKey) })
  const subscriber = {
    email: input.email,
    tags: ['newsletter', 'blog'],
    fields: {
      locale: input.locale,
      source_article: input.sourcePath,
      consented_at: input.consentedAt,
    },
    replaceTags: false,
    resubscribe: true,
    triggerWorkflows: true,
    skipDoubleOptIn: false,
  }

  const created = await lumail.subscribers.create(subscriber)
  if (!created.error) {
    return { id: created.data?.id || null, status: created.data?.status || null }
  }

  if (created.error.statusCode === 409) {
    const updated = await lumail.subscribers.update(input.email, subscriber)
    if (!updated.error) {
      return { id: updated.data?.id || null, status: updated.data?.status || null }
    }
    throw createError({ statusCode: 502, message: updated.error.message || 'Lumail n’a pas pu mettre à jour cet abonnement.' })
  }

  throw createError({ statusCode: 502, message: created.error.message || 'Lumail n’a pas pu enregistrer cet abonnement.' })
}
