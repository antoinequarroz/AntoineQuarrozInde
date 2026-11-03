/** Storybook-only dependencies. Never import this module from production code. */
import { inject, reactive, ref, computed, type InjectionKey } from 'vue'
import { createI18n, useI18n as useVueI18n } from 'vue-i18n'
import fr from '../i18n/locales/fr.json'
import en from '../i18n/locales/en.json'
import de from '../i18n/locales/de.json'
import { demoProjects, demoClients, demoArticles, demoReviews } from '../stories/catalog-fixtures'

export const i18n = createI18n({ legacy: false, locale: 'fr', fallbackLocale: 'fr', messages: { fr, en, de }, missingWarn: false, fallbackWarn: false })
export function useI18n() {
  return { ...useVueI18n(), locales: ref([{ code: 'fr', name: 'Français', language: 'fr-CH' }, { code: 'en', name: 'English', language: 'en' }, { code: 'de', name: 'Deutsch', language: 'de-CH' }]) }
}
export type DemoOptions = { empty?: boolean; error?: boolean; loading?: boolean; calLink?: string; variant?: string }
export function createDemo(options: DemoOptions = {}) {
  const projects = reactive(structuredClone(options.empty ? [] : demoProjects))
  const clients = reactive(structuredClone(options.empty ? [] : demoClients))
  const ensureLoaded = async () => {
    if (options.loading) return new Promise<void>(() => {})
    if (options.error) throw new Error('Erreur de démonstration')
  }
  return {
    options,
    clients: { clients, ensureLoaded, async update(id: number, patch: object) { Object.assign(clients.find(c => c.id === id) ?? {}, patch) }, async updateStatus(id: number, status: string) { Object.assign(clients.find(c => c.id === id) ?? {}, { status }) } },
    projects: { projects, portfolio: projects, ensureLoaded, byCategory: (category: string) => projects.filter(p => category === 'all' || p.category === category) },
    quotes: { quotes: [], ensureLoaded }, invoices: { invoices: [], ensureLoaded }, tasks: { tasks: [], ensureLoaded },
    articles: { published: structuredClone(options.empty ? [] : demoArticles) },
    reviews: { visible: structuredClone(options.empty ? [] : demoReviews), avgRating: options.empty ? 0 : 5 },
    googleReviews: { reviews: [], rating: 0, userRatingCount: 0 },
  }
}
export const demoKey: InjectionKey<ReturnType<typeof createDemo>> = Symbol('aq-storybook-demo')
function demo() { const value = inject(demoKey); if (!value) throw new Error('Missing Storybook demo provider'); return value }
export const useClientsStore = () => demo().clients
export const useProjectsStore = () => demo().projects
export const useQuotesStore = () => demo().quotes
export const useInvoicesStore = () => demo().invoices
export const useTasksStore = () => demo().tasks
export const useArticlesStore = () => demo().articles
export const useReviewsStore = () => demo().reviews
export const useGoogleReviewsStore = () => demo().googleReviews
export const useAuthStore = () => ({ authHeader: () => ({}) })
export const useRuntimeConfig = () => ({ public: { turnstileSiteKey: '', calLink: demo().options.calLink ?? '' } })
export const useMarketing = () => ({ variant: ref(demo().options.variant ?? 'A'), initVariant() {}, track() {} })
export const usePlausibleEvent = () => ({ trackPlausible() {} })
export const captureLeadAttribution = () => ({ utmSource: 'storybook', referrerHost: '', landingPath: '/', utmMedium: 'demo', utmCampaign: 'demo' })
export const useHead = () => undefined
/** Resolves the handler once, like a client-side Nuxt navigation; keys are ignored. */
export async function useAsyncData<T>(_key: string, handler: () => Promise<T>) {
  const data = ref<T | null>(null)
  const error = ref<unknown>(null)
  try { data.value = await handler() } catch (cause) { error.value = cause }
  return { data, error, pending: ref(false), refresh: async () => {} }
}
export const useLocalePath = () => (path: string) => path
export const useRoute = () => ({ path: '/', fullPath: '/', params: {}, query: {}, hash: '', name: 'index' })
export const useRouteBaseName = () => () => 'index'
export const useLocaleRoute = () => (_route: unknown, locale: string) => ({ fullPath: locale === 'fr' ? '/' : `/${locale}`, matched: [{}] })
export const useSwitchLocalePath = () => (locale: string) => locale === 'fr' ? '/' : `/${locale}`
export function useColorMode() {
  const preference = ref(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  return reactive({ preference: computed({ get: () => preference.value, set(value) { preference.value = value; document.documentElement.classList.toggle('dark', value === 'dark') } }), value: preference })
}
/** Each component captures its story's scenario at setup; no network implementation exists. */
export function useDemoFetch() {
  const state = demo()
  return async function demoFetch<T>(url: string, options: { method?: string; body?: any } = {}): Promise<T> {
    if (state.options.loading) return new Promise<T>(() => {})
    await new Promise(resolve => setTimeout(resolve, 120))
    if (state.options.error) throw new Error('Erreur simulée : aucun appel réseau effectué')
    const method = options.method ?? 'GET'
    if (url === '/api/articles') return (state.options.empty ? [] : state.articles.published.map((a, i) => ({ slug: a.slug, title: a.title, published: true, published_at: `2026-09-0${i + 1}T12:00:00Z` }))) as T
    if (url === '/api/contact') return { acquisitionChannel: 'demo' } as T
    if (url === '/api/admin/upload') return { url: options.body.dataUrl } as T
    if (url === '/api/admin/payment-reconciliation') return (method === 'GET' ? { invoices: state.options.empty ? [] : [{ id: 9001, number: 'DEMO-2026-001', clientName: 'Atelier Démo', balanceCents: 120000, currency: 'CHF', paymentReference: null }] } : { success: true }) as T
    if (url === '/api/admin/commercial-actions') return (method === 'GET' ? {} : options.body) as T
    if (url === '/api/admin/pipeline/reminders') return (method === 'GET' ? { candidates: [], summary: {} } : { sentCount: 0, failedCount: 0 }) as T
    throw new Error(`Route non simulée : ${url}`)
  }
}
