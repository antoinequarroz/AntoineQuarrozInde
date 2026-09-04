#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"

if [[ ! "$base_url" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]]; then
  echo "Expected an HTTP(S) origin URL without a path, query or credentials." >&2
  exit 64
fi

node - "${base_url%/}" <<'NODE'
const origin = process.argv[2]
const requiredServicePaths = [
  '/developpeur-web-valais',
  '/creation-site-internet-valais',
  '/refonte-site-web-valais',
  '/application-mobile-valais',
]
const forbiddenServiceProperties = new Set([
  'aggregateRating',
  'availableChannel',
  'availability',
  'hasOfferCatalog',
  'hoursAvailable',
  'offers',
  'price',
  'priceCurrency',
  'result',
  'review',
  'reviews',
  'serviceOutput',
])

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function decode(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function attributes(tag) {
  const result = {}
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    result[match[1].toLowerCase()] = decode(match[3])
  }
  for (const match of tag.matchAll(/\s(data-[\w-]+)(?=\s|>|\/)/gi)) {
    result[match[1].toLowerCase()] ??= ''
  }
  return result
}

function textContent(value) {
  return decode(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function one(values, label, pageUrl) {
  if (values.length !== 1) fail(`${pageUrl}: expected exactly one ${label}.`)
  return values[0]
}

async function fetchChecked(url, expectedType) {
  const parsed = new URL(url)
  if (parsed.origin !== origin || parsed.username || parsed.password || parsed.search || parsed.hash) {
    fail(`${url}: URL is outside the verified origin.`)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(url, { redirect: 'manual', signal: controller.signal })
    if (!response.ok) fail(`${url}: unexpected HTTP ${response.status}.`)
    const contentType = response.headers.get('content-type')?.toLowerCase() || ''
    if (expectedType === 'xml' && !contentType.includes('xml')) fail(`${url}: expected XML.`)
    if (expectedType === 'html' && !contentType.includes('text/html')) fail(`${url}: expected HTML.`)
    const maxBytes = expectedType === 'xml' ? 2_000_000 : 4_000_000
    const declaredLength = Number(response.headers.get('content-length') || 0)
    if (declaredLength > maxBytes) fail(`${url}: response is larger than the proof limit.`)
    if (!response.body) return ''

    const reader = response.body.getReader()
    const chunks = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        fail(`${url}: response is larger than the proof limit.`)
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  }
  catch (error) {
    fail(`${url}: ${error instanceof Error ? error.message : 'request failed'}.`)
  }
  finally {
    clearTimeout(timeout)
  }
}

function discoverPaths(sitemap) {
  const paths = []
  for (const match of sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
    let url
    try {
      url = new URL(decode(match[1].trim()))
    }
    catch {
      fail('Sitemap contains an invalid URL.')
    }
    if (url.origin !== origin || url.username || url.password || url.search || url.hash) {
      fail(`Sitemap URL is outside the verified origin: ${url.href}.`)
    }
    paths.push(url.pathname)
  }
  if (!paths.length) fail('Sitemap contains no public URL.')
  if (new Set(paths).size !== paths.length) fail('Sitemap contains duplicate URLs.')
  for (const path of requiredServicePaths) {
    if (!paths.includes(path)) fail(`Sitemap is missing required service page ${path}.`)
  }
  return paths.filter(path => (
    requiredServicePaths.includes(path)
    || /^\/blog\/[^/]+$/.test(path)
    || /^\/projets\/[^/]+$/.test(path)
  ))
}

function parseJsonLdNodes(html, pageUrl) {
  const nodes = []
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = attributes(`<script ${match[1]}>`)
    if (attrs.type !== 'application/ld+json') continue
    let parsed
    try {
      parsed = JSON.parse(decode(match[2].trim()))
    }
    catch {
      fail(`${pageUrl}: invalid JSON-LD.`)
    }
    for (const document of Array.isArray(parsed) ? parsed : [parsed]) {
      if (Array.isArray(document?.['@graph'])) nodes.push(...document['@graph'])
      else nodes.push(document)
    }
  }
  return nodes
}

function canonicalFrom(html, pageUrl) {
  const matches = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(match => attributes(match[0]))
    .filter(link => link.rel === 'canonical')
  const value = one(matches, 'canonical link', pageUrl).href
  if (!value) fail(`${pageUrl}: canonical is empty.`)
  let canonical
  try {
    canonical = new URL(value)
  }
  catch {
    fail(`${pageUrl}: canonical is invalid.`)
  }
  if (canonical.href !== pageUrl || canonical.search || canonical.hash) {
    fail(`${pageUrl}: canonical URL diverges.`)
  }
  return canonical.href
}

function visibleBreadcrumb(html, pageUrl, canonical) {
  const navs = [...html.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/gi)]
    .filter(match => 'data-breadcrumbs' in attributes(`<nav ${match[1]}>`))
  const nav = one(navs, 'visible breadcrumb navigation', pageUrl)
  if (attributes(`<nav ${nav[1]}>`)['aria-label'] !== 'Fil d’Ariane') {
    fail(`${pageUrl}: breadcrumb navigation has no approved accessible name.`)
  }

  const items = [...nav[2].matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi)]
    .filter(match => 'data-breadcrumb-item' in attributes(`<li ${match[1]}>`))
    .map((match, index, values) => {
      const links = [...match[2].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
        .filter(link => 'data-breadcrumb-link' in attributes(`<a ${link[1]}>`))
      const currents = [...match[2].matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi)]
        .filter(current => 'data-breadcrumb-current' in attributes(`<span ${current[1]}>`))

      if (index < values.length - 1) {
        const link = one(links, `breadcrumb ancestor ${index + 1}`, pageUrl)
        if (currents.length) fail(`${pageUrl}: ancestor breadcrumb is marked as current.`)
        const attrs = attributes(`<a ${link[1]}>`)
        const itemUrl = new URL(attrs.href, origin)
        if (itemUrl.origin !== origin || itemUrl.search || itemUrl.hash) {
          fail(`${pageUrl}: breadcrumb ancestor URL is unsafe.`)
        }
        return { name: textContent(link[2]), item: itemUrl.href }
      }

      if (links.length) fail(`${pageUrl}: current breadcrumb must not be a link.`)
      const current = one(currents, 'current breadcrumb', pageUrl)
      if (attributes(`<span ${current[1]}>`)['aria-current'] !== 'page') {
        fail(`${pageUrl}: current breadcrumb is not announced as the page.`)
      }
      return { name: textContent(current[2]), item: canonical }
    })

  if (items.length < 2 || items.some(item => !item.name)) {
    fail(`${pageUrl}: breadcrumb trail is empty or incomplete.`)
  }
  return items
}

function assertBreadcrumb(nodes, visibleItems, pageUrl, canonical) {
  const breadcrumb = one(nodes.filter(node => node?.['@type'] === 'BreadcrumbList'), 'BreadcrumbList object', pageUrl)
  const structuredItems = breadcrumb.itemListElement
  if (!Array.isArray(structuredItems) || structuredItems.length !== visibleItems.length) {
    fail(`${pageUrl}: BreadcrumbList length diverges from the visible trail.`)
  }
  structuredItems.forEach((item, index) => {
    const visible = visibleItems[index]
    if (item?.['@type'] !== 'ListItem'
      || item.position !== index + 1
      || item.name !== visible.name
      || item.item !== visible.item) {
      fail(`${pageUrl}: BreadcrumbList item ${index + 1} diverges from the visible trail.`)
    }
  })
  if (structuredItems.at(-1)?.item !== canonical) {
    fail(`${pageUrl}: final BreadcrumbList URL diverges from the canonical.`)
  }
}

function markedText(html, attribute, pageUrl) {
  const pattern = new RegExp(`<[^>]+\\b${attribute}(?:=(?:"[^"]*"|'[^']*'))?[^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi')
  return textContent(one([...html.matchAll(pattern)], attribute, pageUrl)[1])
}

function assertNoForbiddenProperty(value, pageUrl) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach(item => assertNoForbiddenProperty(item, pageUrl))
    return
  }
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenServiceProperties.has(key)) {
      fail(`${pageUrl}: Service contains forbidden property ${key}.`)
    }
    assertNoForbiddenProperty(nested, pageUrl)
  }
}

function assertService(nodes, html, pageUrl, canonical) {
  const service = one(nodes.filter(node => node?.['@type'] === 'Service'), 'Service object', pageUrl)
  const visibleName = markedText(html, 'data-service-name', pageUrl)
  const visibleDescription = markedText(html, 'data-service-description', pageUrl)
  const visible = textContent(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' '))

  if (service['@id'] !== `${canonical}#service`
    || service.name !== visibleName
    || service.serviceType !== visibleName
    || service.description !== visibleDescription
    || service.url !== canonical
    || service.mainEntityOfPage?.['@id'] !== canonical) {
    fail(`${pageUrl}: Service identity or visible content diverges.`)
  }
  if (service.provider?.['@type'] !== 'ProfessionalService'
    || service.provider?.['@id'] !== `${origin}/#business`
    || service.provider?.name !== 'Antoine Quarroz'
    || service.provider?.url !== `${origin}/`
    || !visible.includes('Antoine Quarroz')) {
    fail(`${pageUrl}: Service provider diverges from the visible public identity.`)
  }
  if (service.areaServed?.['@type'] !== 'AdministrativeArea'
    || service.areaServed?.name !== 'Valais'
    || !visible.includes('Valais')) {
    fail(`${pageUrl}: Service area diverges from the visible page.`)
  }
  assertNoForbiddenProperty(service, pageUrl)
}

async function main() {
  const paths = discoverPaths(await fetchChecked(`${origin}/sitemap.xml`, 'xml'))
  let serviceCount = 0
  let deepContentCount = 0

  for (const path of paths) {
    const pageUrl = `${origin}${path}`
    const html = await fetchChecked(pageUrl, 'html')
    const canonical = canonicalFrom(html, pageUrl)
    const nodes = parseJsonLdNodes(html, pageUrl)
    const visibleItems = visibleBreadcrumb(html, pageUrl, canonical)
    assertBreadcrumb(nodes, visibleItems, pageUrl, canonical)

    if (requiredServicePaths.includes(path)) {
      assertService(nodes, html, pageUrl, canonical)
      serviceCount += 1
    }
    else {
      deepContentCount += 1
    }
  }

  process.stdout.write(`Service and breadcrumb data is valid on ${serviceCount} service page(s) and ${deepContentCount} deep content page(s) at ${origin}.\n`)
}

main().catch(error => fail(error instanceof Error ? error.message : 'Unexpected verification failure.'))
NODE
