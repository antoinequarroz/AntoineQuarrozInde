import { Lumail } from 'lumail'

export type AppEmailInput = {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string | string[]
  idempotencyKey?: string
  tags?: Array<{ name: string, value: string }>
}

export type AppEmailResult = {
  emailId: string | null
  provider: 'lumail'
}

const DEFAULT_FROM = 'info@antoinequarroz.ch'

export function isEmailConfigured(config = useRuntimeConfig()) {
  return Boolean(config.lumailApiKey)
}

export async function sendAppEmail(input: AppEmailInput): Promise<AppEmailResult> {
  const config = useRuntimeConfig()
  const from = input.from || String(config.emailFrom || DEFAULT_FROM)
  if (!config.lumailApiKey) throw createError({ statusCode: 503, message: 'Le service e-mail Lumail n’est pas configuré.' })

  const lumail = new Lumail({ apiKey: config.lumailApiKey })
  const { data, error } = await lumail.emails.send({
    to: input.to,
    from,
    subject: input.subject,
    html: input.html,
    markdown: input.html ? undefined : input.text,
    text: input.text,
    reply_to: input.replyTo,
    tags: input.tags,
  }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey.slice(0, 256) } : undefined)

  if (error) throw createError({ statusCode: 502, message: error.message || 'L’e-mail n’a pas pu être envoyé avec Lumail.' })
  return { emailId: data?.id || null, provider: 'lumail' }
}
