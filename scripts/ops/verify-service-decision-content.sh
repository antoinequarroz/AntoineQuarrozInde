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
const expectedSections = [
  ['deliverables', 'Quels livrables sont inclus ?'],
  ['process', 'Comment se déroule le projet ?'],
  ['timeline', 'Quels délais prévoir ?'],
  ['limits', 'Quelles sont les limites ?'],
  ['next-step', 'Quelle est la prochaine étape ?'],
]
const precisionPattern = /\d|%|\b(?:chf|eur|usd|francs?|euros?)\b|[€$]/iu
const guaranteePattern = /\b(?:garanti|garantie|garanties|garantit|garantissent|garantir)\b/iu
const corruptedTextPattern = /\uFFFD|Ã.|Â.|â€|ðŸ/u

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

function discoverServicePaths(sitemap) {
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
  if (new Set(paths).size !== paths.length) fail('Sitemap contains duplicate URLs.')
  for (const path of requiredServicePaths) {
    if (!paths.includes(path)) fail(`Sitemap is missing required service page ${path}.`)
  }
  return requiredServicePaths
}

function markedMatches(html, attribute) {
  const pattern = new RegExp(`<[^>]+\\b${attribute}(?:=(?:"[^"]*"|'[^']*'))?[^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi')
  return [...html.matchAll(pattern)]
}

function markedText(html, attribute, pageUrl) {
  return textContent(one(markedMatches(html, attribute), attribute, pageUrl)[1])
}

function assertSafeCopy(value, label, pageUrl) {
  if (!value) fail(`${pageUrl}: ${label} is empty.`)
  if (precisionPattern.test(value)) fail(`${pageUrl}: ${label} contains unapproved commercial precision.`)
  if (guaranteePattern.test(value)) fail(`${pageUrl}: ${label} contains a guarantee expression.`)
  if (corruptedTextPattern.test(value)) fail(`${pageUrl}: ${label} contains corrupted text.`)
}

function assertDecisionContent(html, pageUrl) {
  const introductionMatch = one(markedMatches(html, 'data-service-introduction'), 'service introduction', pageUrl)
  const introTag = introductionMatch[0].slice(0, introductionMatch[0].indexOf('>') + 1)
  const introAttributes = attributes(introTag)
  for (const marker of ['data-service-offer', 'data-service-audience', 'data-service-area']) {
    if (!(marker in introAttributes)) fail(`${pageUrl}: service introduction is missing ${marker}.`)
  }
  const introduction = textContent(introductionMatch[1])
  assertSafeCopy(introduction, 'service introduction', pageUrl)
  if (!introduction.includes('Valais')) fail(`${pageUrl}: service introduction does not name Valais.`)

  const sections = [...html.matchAll(/<section\b([^>]*\bdata-service-section\s*=\s*(["'])(.*?)\2[^>]*)>([\s\S]*?)<\/section>/gi)]
    .map(match => ({
      key: attributes(`<section ${match[1]}>`)['data-service-section'],
      body: match[4],
      index: match.index,
    }))
  if (sections.length !== expectedSections.length) {
    fail(`${pageUrl}: expected exactly ${expectedSections.length} decision sections.`)
  }
  if (introductionMatch.index > sections[0].index) fail(`${pageUrl}: service introduction must precede decision sections.`)

  expectedSections.forEach(([key, heading], index) => {
    const section = sections[index]
    if (section.key !== key) fail(`${pageUrl}: decision section order diverges at ${key}.`)
    const headings = [...section.body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(match => textContent(match[1]))
    if (one(headings, `${key} heading`, pageUrl) !== heading) {
      fail(`${pageUrl}: ${key} heading diverges from the approved question.`)
    }
  })

  const markedCollections = [
    ['data-service-deliverable', 2],
    ['data-service-process-step', 2],
    ['data-service-limit', 1],
  ]
  for (const [marker, minimum] of markedCollections) {
    const values = markedMatches(html, marker).map(match => textContent(match[1]))
    if (values.length < minimum) fail(`${pageUrl}: ${marker} is incomplete.`)
    values.forEach(value => assertSafeCopy(value, marker, pageUrl))
  }
  for (const marker of ['data-service-timeline', 'data-service-next-step', 'data-service-proof-note']) {
    assertSafeCopy(markedText(html, marker, pageUrl), marker, pageUrl)
  }

  const proofLinks = [...html.matchAll(/<a\b[^>]*data-service-proof-link[^>]*>/gi)]
  const contactLinks = [...html.matchAll(/<a\b[^>]*data-service-contact-link[^>]*>/gi)]
  const proofHref = attributes(one(proofLinks, 'service proof link', pageUrl)[0]).href
  const contactHref = attributes(one(contactLinks, 'service contact link', pageUrl)[0]).href
  if (proofHref !== '/#portfolio') fail(`${pageUrl}: proof link is not the approved portfolio destination.`)
  if (contactHref !== '/#contact') fail(`${pageUrl}: contact link is not the approved contact destination.`)
}

async function main() {
  const paths = discoverServicePaths(await fetchChecked(`${origin}/sitemap.xml`, 'xml'))
  for (const path of paths) {
    const pageUrl = `${origin}${path}`
    assertDecisionContent(await fetchChecked(pageUrl, 'html'), pageUrl)
  }
  process.stdout.write(`Service decision content is valid on ${paths.length} service page(s) at ${origin}.\n`)
}

main().catch(error => fail(error instanceof Error ? error.message : 'Unexpected verification failure.'))
NODE
