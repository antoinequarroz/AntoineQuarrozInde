export type AnalyticsTraffic = 'production' | 'test' | 'unclassified'

// Classification only. These private inputs must never be sent to analytics.
export function classifyBusinessIdentity(identity?: { name?: unknown, email?: unknown } | null): AnalyticsTraffic {
  if (!identity || (!identity.name && !identity.email)) return 'unclassified'
  const name = String(identity.name || '').normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const email = String(identity.email || '').toLowerCase()
  if (/(^|\W)(test|e2e|recette|fixture|demo)(\W|$)/i.test(name)
    || /(^|[+._-])(test|e2e|fixture)([+._@-]|$)/i.test(email)
    || /@(example\.(com|org|net|invalid)|[^@]+\.(invalid|test|localhost))$/i.test(email)) return 'test'
  return 'production'
}

export function excludeInternalVisit(input: { staff: boolean, webdriver: boolean, userAgent: string, optedOut: boolean }) {
  return input.staff || input.webdriver || input.optedOut || /HeadlessChrome|Playwright|Puppeteer/i.test(input.userAgent)
}
