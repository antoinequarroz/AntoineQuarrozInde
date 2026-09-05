export const ACQUISITION_CHANNELS = [
  'organic_search',
  'generative_ai',
  'direct',
  'campaign',
  'unknown_referral',
] as const

export type AcquisitionChannel = typeof ACQUISITION_CHANNELS[number]

const ORGANIC_HOSTS = [
  'google.com', 'google.ch', 'google.de', 'bing.com', 'duckduckgo.com',
  'search.yahoo.com', 'ecosia.org', 'qwant.com', 'search.brave.com',
]
const GENERATIVE_HOSTS = [
  'chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'claude.ai',
  'gemini.google.com', 'copilot.microsoft.com', 'lechat.mistral.ai',
]
const ORGANIC_SOURCES = new Set(['google', 'bing', 'duckduckgo', 'yahoo', 'ecosia', 'qwant', 'brave'])
const GENERATIVE_SOURCES = new Set(['chatgpt', 'openai', 'perplexity', 'claude', 'gemini', 'copilot', 'mistral', 'lechat'])

function normalizeToken(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/^www\./, '')
}

function normalizeHost(value?: string | null) {
  const token = normalizeToken(value)
  if (!token) return ''
  try {
    const candidate = token.includes('://') ? token : `https://${token}`
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, '')
  }
  catch {
    return token.split('/')[0] || ''
  }
}

function matchesHost(host: string, known: string) {
  return host === known || host.endsWith(`.${known}`)
}

function channelForKnownValue(value: string) {
  const token = normalizeToken(value)
  const host = normalizeHost(value)
  if (GENERATIVE_SOURCES.has(token) || GENERATIVE_HOSTS.some(known => matchesHost(host, known))) return 'generative_ai' as const
  if (ORGANIC_SOURCES.has(token) || ORGANIC_HOSTS.some(known => matchesHost(host, known))) return 'organic_search' as const
  return null
}

export function classifyAcquisition(input: { utmSource?: string | null, referrerHost?: string | null }): AcquisitionChannel {
  const utmSource = normalizeToken(input.utmSource)
  if (utmSource) return channelForKnownValue(utmSource) || 'campaign'
  const referrerHost = normalizeHost(input.referrerHost)
  if (!referrerHost) return 'direct'
  return channelForKnownValue(referrerHost) || 'unknown_referral'
}

export function classifyStoredAcquisitionSource(value?: string | null): AcquisitionChannel {
  const source = normalizeToken(value)
  if (!source || source === 'direct' || source === 'non attribué') return 'direct'
  const known = channelForKnownValue(source)
  if (known) return known
  return source.includes('.') ? 'unknown_referral' : 'campaign'
}

export function isAcquisitionChannel(value: unknown): value is AcquisitionChannel {
  return typeof value === 'string' && (ACQUISITION_CHANNELS as readonly string[]).includes(value)
}
