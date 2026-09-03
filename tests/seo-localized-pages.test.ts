import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const servers: ReturnType<typeof createServer>[] = []
const unixIt = process.platform === 'win32' ? it.skip : it

const locales = [
  { prefix: '', lang: 'fr-CH', title: 'Antoine Quarroz — Développeur Web Freelance en Valais', description: 'Développeur web freelance basé en Valais, Antoine Quarroz conçoit des sites, applications mobiles et CMS sur mesure en Suisse et à distance.' },
  { prefix: '/en', lang: 'en-US', title: 'Antoine Quarroz — Freelance Web Developer in Valais', description: 'Freelance web developer based in Valais, Antoine Quarroz builds custom websites, mobile apps and CMS solutions for clients in Switzerland and worldwide.' },
  { prefix: '/de', lang: 'de-CH', title: 'Antoine Quarroz — Freelance-Webentwickler im Wallis', description: 'Antoine Quarroz ist Freelance-Webentwickler im Wallis und entwickelt individuelle Websites, mobile Apps und CMS-Lösungen für Kunden in der Schweiz und weltweit.' },
]

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })))
})

function localizedPath(prefix: string, basePath: string) {
  if (basePath === '/') return prefix || '/'
  return `${prefix}${basePath}`
}

function fixture(origin: string, requestPath: string) {
  const locale = requestPath === '/en' || requestPath.startsWith('/en/')
    ? locales[1]
    : requestPath === '/de' || requestPath.startsWith('/de/')
      ? locales[2]
      : locales[0]
  const basePath = requestPath.replace(/^\/(en|de)(?=\/|$)/, '') || '/'
  const isHome = basePath === '/'
  const title = isHome ? locale.title : `${basePath.slice(1)} — Antoine Quarroz`
  const description = isHome ? locale.description : `Localized legal description for ${locale.lang}`
  const alternates = [
    ...locales.map(item => `<link rel="alternate" hreflang="${item.lang}" href="${origin}${localizedPath(item.prefix, basePath)}">`),
    `<link rel="alternate" hreflang="x-default" href="${origin}${localizedPath('', basePath)}">`,
  ].join('')
  const languageLinks = locales
    .filter(item => item.lang !== locale.lang)
    .map(item => `<a href="${localizedPath(item.prefix, basePath)}" lang="${item.lang}">${item.lang}</a>`)
    .join('')

  return `<!doctype html><html lang="${locale.lang}"><head><title>${title}</title><meta name="description" content="${description}">${isHome ? `<meta property="og:url" content="${origin}${requestPath}">` : ''}<link rel="canonical" href="${origin}${requestPath}">${alternates}</head><body>${languageLinks}</body></html>`
}

async function listen(mutate: (path: string, html: string) => string = (_path, html) => html) {
  let origin = ''
  const server = createServer((request, response) => {
    const path = request.url || '/'
    response.setHeader('Content-Type', 'text/html; charset=UTF-8')
    response.end(mutate(path, fixture(origin, path)))
  })
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP port')
  origin = `http://127.0.0.1:${address.port}`
  return origin
}

function runProof(origin: string) {
  return execFileAsync('bash', ['scripts/ops/verify-localized-pages.sh', origin], { cwd: process.cwd() })
}

describe('AQ-SEO-004 localized public pages', () => {
  it('keeps approved homepage SEO copy in all three locale catalogs', async () => {
    const [fr, en, de] = await Promise.all([
      readFile('i18n/locales/fr.json', 'utf8').then(JSON.parse),
      readFile('i18n/locales/en.json', 'utf8').then(JSON.parse),
      readFile('i18n/locales/de.json', 'utf8').then(JSON.parse),
    ])

    expect(fr.seo.home.title).toBe(locales[0].title)
    expect(en.seo.home.title).toBe(locales[1].title)
    expect(de.seo.home.title).toBe(locales[2].title)
    expect(fr.seo.home.description).toBe(locales[0].description)
    expect(en.seo.home.description).toBe(locales[1].description)
    expect(de.seo.home.description).toBe(locales[2].description)
  })

  it('derives homepage metadata and navigation from the active locale', async () => {
    const [page, header, footer] = await Promise.all([
      readFile('app/pages/index.vue', 'utf8'),
      readFile('app/components/layout/AppHeader.vue', 'utf8'),
      readFile('app/components/layout/AppFooter.vue', 'utf8'),
    ])

    expect(page).toContain("title: () => t('seo.home.title')")
    expect(page).toContain('ogUrl: () => canonicalUrl.value')
    expect(page).toContain("{ rel: 'canonical', href: canonicalUrl.value }")
    expect(page).toContain("<SectionsPortfolioSection v-if=\"locale === 'fr'\"")
    expect(page).toContain("...(locale.value === 'fr' ? [")
    expect(page).toContain('`index-data-${locale.value}`')
    expect(page).not.toContain("name: 'keywords'")
    expect(header).toContain('useLocalePath()')
    expect(header).not.toContain("href: '/#")
    expect(footer).toContain("locale.value === 'fr'")
  })

  it('uses native, crawlable language links and approved localized microcopy', async () => {
    const [switcher, about, services, blog, contact] = await Promise.all([
      readFile('app/components/ui/LangSwitcher.vue', 'utf8'),
      readFile('app/components/sections/AboutSection.vue', 'utf8'),
      readFile('app/components/sections/ServicesSection.vue', 'utf8'),
      readFile('app/components/sections/BlogSection.vue', 'utf8'),
      readFile('app/components/sections/ContactSection.vue', 'utf8'),
    ])

    expect(switcher).toContain('<details')
    expect(switcher).toContain('useSwitchLocalePath()')
    expect(switcher).toContain('<NuxtLink')
    expect(switcher).not.toContain('setLocale')
    expect(about).toContain("t('about.photo_soon')")
    expect(about).not.toContain('>Photo à venir<')
    expect(services).toContain("v-if=\"locale === 'fr'\"")
    expect(blog).toContain("v-if=\"locale === 'fr' && articles.length\"")
    expect(contact).toContain("t('contact.quick_reply_at')")
  })

  it('runs the localized proof after the existing production SEO proofs', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')
    const robotsProof = 'bash scripts/ops/verify-openai-robots-policy.sh https://www.antoinequarroz.ch'
    const localizedProof = 'bash scripts/ops/verify-localized-pages.sh https://www.antoinequarroz.ch'

    expect(workflow).toContain(localizedProof)
    expect(workflow.indexOf(robotsProof)).toBeLessThan(workflow.indexOf(localizedProof))
  })

  unixIt('accepts reciprocal localized home and legal pages', async () => {
    const origin = await listen()
    const result = await runProof(origin)
    expect(result.stdout).toContain('Localized home and legal pages are valid')
  })

  unixIt.each([
    ['wrong html language', (path: string, html: string) => path === '/en' ? html.replace('lang="en-US"', 'lang="fr-CH"') : html],
    ['foreign canonical', (path: string, html: string) => path === '/de' ? html.replace(/(<link rel="canonical" href="https?:\/\/[^"/]+)\/de">/, '$1/">') : html],
    ['missing reciprocal alternate', (path: string, html: string) => path === '/en/confidentialite' ? html.replace(/<link rel="alternate" hreflang="de-CH"[^>]+>/, '') : html],
    ['missing language href', (path: string, html: string) => path === '/conditions-utilisation' ? html.replace('<a href="/en/conditions-utilisation"', '<a data-href="/en/conditions-utilisation"') : html],
    ['foreign homepage copy', (path: string, html: string) => path === '/en' ? html.replace(locales[1].title, locales[0].title) : html],
    ['wrong Open Graph URL', (path: string, html: string) => path === '/de' ? html.replace(/(<meta property="og:url" content="https?:\/\/[^"/]+)\/de">/, '$1/">') : html],
  ])('rejects localized inconsistency: %s', async (_name, mutate) => {
    const origin = await listen(mutate)
    await expect(runProof(origin)).rejects.toMatchObject({ code: 1 })
  })

  unixIt('rejects unsafe origins and unavailable destinations', async () => {
    await expect(runProof('https://user@example.com')).rejects.toMatchObject({ code: 64 })
    await expect(runProof('http://127.0.0.1:9')).rejects.toMatchObject({ code: 7 })
  })
})
