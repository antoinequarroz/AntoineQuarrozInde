#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"

validate_base_url() {
  local value="$1"
  [[ "$value" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]]
}

if ! validate_base_url "$base_url"; then
  echo "Expected an HTTP(S) origin URL without a path, query or credentials." >&2
  exit 64
fi

readonly origin="${base_url%/}"
pages_dir="$(mktemp -d)"
readonly pages_dir

cleanup() {
  rm -rf -- "$pages_dir"
}
trap cleanup EXIT

readonly paths=(
  '/'
  '/en'
  '/de'
  '/mentions-legales'
  '/en/mentions-legales'
  '/de/mentions-legales'
  '/confidentialite'
  '/en/confidentialite'
  '/de/confidentialite'
  '/conditions-utilisation'
  '/en/conditions-utilisation'
  '/de/conditions-utilisation'
)

for index in "${!paths[@]}"; do
  curl --fail --silent --show-error --max-time 12 \
    "${origin}${paths[$index]}" > "${pages_dir}/${index}.html"
done

node - "$pages_dir" "$origin" <<'NODE'
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const [pagesDir, origin] = process.argv.slice(2)
const locales = [
  { prefix: '', lang: 'fr-CH' },
  { prefix: '/en', lang: 'en-US' },
  { prefix: '/de', lang: 'de-CH' },
]
const pagePaths = ['/', '/mentions-legales', '/confidentialite', '/conditions-utilisation']
const homeCopy = {
  'fr-CH': {
    title: 'Antoine Quarroz — Développeur Web Freelance en Valais',
    description: 'Développeur web freelance basé en Valais, Antoine Quarroz conçoit des sites, applications mobiles et CMS sur mesure en Suisse et à distance.',
  },
  'en-US': {
    title: 'Antoine Quarroz — Freelance Web Developer in Valais',
    description: 'Freelance web developer based in Valais, Antoine Quarroz builds custom websites, mobile apps and CMS solutions for clients in Switzerland and worldwide.',
  },
  'de-CH': {
    title: 'Antoine Quarroz — Freelance-Webentwickler im Wallis',
    description: 'Antoine Quarroz ist Freelance-Webentwickler im Wallis und entwickelt individuelle Websites, mobile Apps und CMS-Lösungen für Kunden in der Schweiz und weltweit.',
  },
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
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => attributes(match[0]))
}

function preferredPath(prefix, pagePath) {
  if (pagePath === '/') return prefix || '/'
  return `${prefix}${pagePath}`
}

const pages = []
let fileIndex = 0
for (const pagePath of pagePaths) {
  for (const locale of locales) {
    const path = preferredPath(locale.prefix, pagePath)
    pages.push({
      path,
      pagePath,
      locale,
      html: readFileSync(join(pagesDir, `${fileIndex++}.html`), 'utf8'),
    })
  }
}

// The shell fetch order is home locales first, then each legal family.
pages.sort((left, right) => {
  const fetchPaths = [
    '/', '/en', '/de',
    '/mentions-legales', '/en/mentions-legales', '/de/mentions-legales',
    '/confidentialite', '/en/confidentialite', '/de/confidentialite',
    '/conditions-utilisation', '/en/conditions-utilisation', '/de/conditions-utilisation',
  ]
  return fetchPaths.indexOf(left.path) - fetchPaths.indexOf(right.path)
})
for (let index = 0; index < pages.length; index += 1) {
  pages[index].html = readFileSync(join(pagesDir, `${index}.html`), 'utf8')
}

for (const page of pages) {
  const expectedUrl = `${origin}${page.path}`
  const htmlTag = tags(page.html, 'html')[0]
  if (!htmlTag || htmlTag.lang !== page.locale.lang) {
    fail(`${page.path}: expected html lang ${page.locale.lang}.`)
  }

  const titleMatch = page.html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  const title = decode(titleMatch?.[1]?.trim())
  const descriptions = tags(page.html, 'meta').filter(tag => tag.name === 'description')
  if (!title || descriptions.length !== 1 || !descriptions[0].content?.trim()) {
    fail(`${page.path}: expected one non-empty title and description.`)
  }

  const links = tags(page.html, 'link')
  const canonicals = links.filter(link => link.rel === 'canonical')
  if (canonicals.length !== 1 || canonicals[0].href !== expectedUrl) {
    fail(`${page.path}: expected self-canonical ${expectedUrl}.`)
  }

  const expectedAlternates = new Map([
    ['fr-CH', `${origin}${preferredPath('', page.pagePath)}`],
    ['en-US', `${origin}${preferredPath('/en', page.pagePath)}`],
    ['de-CH', `${origin}${preferredPath('/de', page.pagePath)}`],
    ['x-default', `${origin}${preferredPath('', page.pagePath)}`],
  ])
  const alternates = links.filter(link => link.rel === 'alternate')
  if (alternates.length !== expectedAlternates.size) {
    fail(`${page.path}: expected four reciprocal alternates.`)
  }
  for (const [lang, href] of expectedAlternates) {
    const matches = alternates.filter(link => link.hreflang === lang && link.href === href)
    if (matches.length !== 1) fail(`${page.path}: invalid ${lang} alternate.`)
  }

  const anchors = tags(page.html, 'a')
  for (const locale of locales.filter(item => item.lang !== page.locale.lang)) {
    const target = preferredPath(locale.prefix, page.pagePath)
    if (!anchors.some(anchor => anchor.href === target && anchor.lang === locale.lang)) {
      fail(`${page.path}: missing crawlable language link to ${target}.`)
    }
  }

  if (page.pagePath === '/') {
    const expectedCopy = homeCopy[page.locale.lang]
    if (title !== expectedCopy.title || descriptions[0].content !== expectedCopy.description) {
      fail(`${page.path}: homepage title or description does not match its locale.`)
    }
    const openGraphUrls = tags(page.html, 'meta').filter(tag => tag.property === 'og:url')
    if (openGraphUrls.length !== 1 || openGraphUrls[0].content !== expectedUrl) {
      fail(`${page.path}: expected localized og:url ${expectedUrl}.`)
    }
    if (page.locale.lang !== 'fr-CH') {
      const visibleMarkup = page.html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      if (!/\bid=["']portfolio["']/i.test(visibleMarkup)) {
        fail(`${page.path}: localized portfolio section is missing.`)
      }
      if (/\bid=["']blog["']/i.test(visibleMarkup)) {
        fail(`${page.path}: unapproved French blog section is exposed.`)
      }
      if (/href=["']\/(?:creation-site-internet-valais|application-mobile-valais)["']/i.test(visibleMarkup)) {
        fail(`${page.path}: French-only service link is exposed.`)
      }
      const withoutMarkedFrenchFallbacks = visibleMarkup.replace(
        /<([a-z][\w-]*)\b[^>]*\blang=["']fr["'][^>]*>[\s\S]*?<\/\1>/gi,
        '',
      )
      if (visibleMarkup.includes('Photo à venir') || visibleMarkup.includes('Réponse rapide sur')
        || withoutMarkedFrenchFallbacks.includes('Respire est une app')
        || withoutMarkedFrenchFallbacks.includes('Rallye Team Quarroz est')) {
        fail(`${page.path}: untranslated French microcopy is exposed.`)
      }
    }
  }
}
NODE

echo "Localized home and legal pages are valid on ${origin}."
