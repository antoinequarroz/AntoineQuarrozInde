#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"

if [[ ! "$base_url" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]]; then
  echo "Expected an HTTP(S) origin URL without a path, query or credentials." >&2
  exit 64
fi

node - "${base_url%/}" <<'NODE'
const origin = process.argv[2]
const expectedIdentity = {
  name: 'Antoine Quarroz',
  email: 'mailto:info@antoinequarroz.ch',
  telephone: '+41791576450',
  address: {
    streetAddress: 'Rue de l’Evouette 5',
    postalCode: '1969',
    addressLocality: 'Saint-Martin',
    addressRegion: 'Valais',
    addressCountry: 'CH',
  },
  profiles: [
    'https://github.com/antoinequarroz',
    'https://www.linkedin.com/in/antoine-quarroz-376020187/',
  ],
}

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
  return result
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))]
    .map(match => attributes(match[0]))
}

async function fetchChecked(url, expectedType) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: expectedType === 'image' ? { Range: 'bytes=0-0' } : undefined,
    })
    if (!response.ok) fail(`${url}: unexpected HTTP ${response.status}.`)
    const contentType = response.headers.get('content-type')?.toLowerCase() || ''
    if (expectedType === 'image') {
      if (!contentType.startsWith('image/')) fail(`${url}: expected an image content type.`)
      await response.body?.cancel()
      return ''
    }
    if (expectedType === 'xml' && !/(?:xml|text\/plain)/.test(contentType)) {
      fail(`${url}: expected an XML content type.`)
    }
    if (expectedType === 'html' && !contentType.includes('text/html')) {
      fail(`${url}: expected an HTML content type.`)
    }
    return await response.text()
  }
  catch (error) {
    fail(`${url}: ${error instanceof Error ? error.message : 'request failed'}.`)
  }
  finally {
    clearTimeout(timeout)
  }
}

function oneMeta(html, key) {
  const matches = tags(html, 'meta').filter(meta => meta.property === key || meta.name === key)
  if (matches.length !== 1 || !matches[0].content?.trim()) {
    fail(`Expected exactly one non-empty ${key} meta tag.`)
  }
  return matches[0].content.trim()
}

function assertSafeImageUrl(value, pageUrl) {
  let image
  try {
    image = new URL(value)
  }
  catch {
    fail(`${pageUrl}: social image must be absolute.`)
  }
  const canonical = new URL(origin)
  const sameOrigin = image.origin === canonical.origin
  const approvedSupabaseMedia = image.protocol === 'https:'
    && /^[a-z0-9-]+\.supabase\.co$/i.test(image.hostname)
    && image.pathname.startsWith('/storage/v1/object/public/media/')
  if (
    image.username
    || image.password
    || image.hash
    || (!sameOrigin && !approvedSupabaseMedia)
    || (image.protocol !== 'https:' && !(sameOrigin && canonical.protocol === 'http:'))
  ) {
    fail(`${pageUrl}: social image target is not approved.`)
  }
  return image.href
}

function parseJsonLd(html) {
  const values = []
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = attributes(`<script ${match[1]}>`)
    if (attrs.type !== 'application/ld+json') continue
    try {
      values.push(JSON.parse(decode(match[2].trim())))
    }
    catch {
      fail('Homepage contains invalid JSON-LD.')
    }
  }
  return values
}

function visibleDocument(html) {
  return decode(html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function assertIdentity(homeHtml) {
  const nodes = parseJsonLd(homeHtml).flatMap(value => Array.isArray(value?.['@graph']) ? value['@graph'] : [value])
  const person = nodes.find(node => node?.['@id'] === `${origin}/#person` && node?.['@type'] === 'Person')
  const business = nodes.find(node => node?.['@id'] === `${origin}/#business` && node?.['@type'] === 'ProfessionalService')
  if (!person || !business) fail('Homepage must expose the canonical Person and ProfessionalService nodes.')

  for (const node of [person, business]) {
    if (node.name !== expectedIdentity.name || node.email !== expectedIdentity.email || node.telephone !== expectedIdentity.telephone) {
      fail(`${node['@type']}: public contact identity diverges.`)
    }
    if (JSON.stringify(node.address) !== JSON.stringify({ '@type': 'PostalAddress', ...expectedIdentity.address })) {
      fail(`${node['@type']}: postal address diverges.`)
    }
    if (JSON.stringify(node.sameAs) !== JSON.stringify(expectedIdentity.profiles)) {
      fail(`${node['@type']}: approved profiles diverge.`)
    }
  }

  const visible = visibleDocument(homeHtml)
  for (const value of [expectedIdentity.name, 'info@antoinequarroz.ch', '+41 79 157 64 50', ...Object.values(expectedIdentity.address).filter(value => value !== 'CH')]) {
    if (!visible.includes(value)) fail(`Homepage visible content is missing: ${value}.`)
  }
  const anchors = tags(homeHtml, 'a')
  for (const href of [expectedIdentity.email, 'tel:+41791576450', ...expectedIdentity.profiles]) {
    if (!anchors.some(anchor => anchor.href === href)) fail(`Homepage is missing the visible link ${href}.`)
  }
}

async function main() {
  const sitemap = await fetchChecked(`${origin}/sitemap.xml`, 'xml')
  const locations = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map(match => decode(match[1].trim()))
  if (!locations.includes(`${origin}/`)) fail('Sitemap does not contain the canonical homepage.')
  if (new Set(locations).size !== locations.length) fail('Sitemap contains duplicate locations.')

  const pages = []
  for (const location of locations) {
    let url
    try {
      url = new URL(location)
    }
    catch {
      fail(`Sitemap contains an invalid location: ${location}.`)
    }
    if (url.origin !== origin || url.username || url.password || url.hash) {
      fail(`Sitemap location is outside the canonical origin: ${location}.`)
    }
    pages.push({ url: location, html: await fetchChecked(location, 'html') })
  }

  const imageUrls = new Set()
  for (const page of pages) {
    const ogImage = assertSafeImageUrl(oneMeta(page.html, 'og:image'), page.url)
    const twitterImage = assertSafeImageUrl(oneMeta(page.html, 'twitter:image'), page.url)
    const ogAlt = oneMeta(page.html, 'og:image:alt')
    const twitterAlt = oneMeta(page.html, 'twitter:image:alt')
    if (ogImage !== twitterImage) fail(`${page.url}: Open Graph and Twitter images diverge.`)
    if (ogAlt !== twitterAlt) fail(`${page.url}: Open Graph and Twitter image alts diverge.`)
    imageUrls.add(ogImage)
  }

  const home = pages.find(page => page.url === `${origin}/`)
  assertIdentity(home.html)

  for (const imageUrl of imageUrls) await fetchChecked(imageUrl, 'image')
  process.stdout.write(`Identity and social previews are valid on ${pages.length} indexable pages at ${origin}.\n`)
}

main().catch(error => fail(error instanceof Error ? error.message : 'Unexpected verification failure.'))
NODE
