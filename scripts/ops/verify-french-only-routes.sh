#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"

origin="$({ node - "$base_url" <<'NODE'
const value = process.argv[2]

try {
  const url = new URL(value)
  const acceptedValues = new Set([url.origin, `${url.origin}/`])
  if (!['http:', 'https:'].includes(url.protocol)
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
    || !acceptedValues.has(value)) {
    throw new Error('unsafe origin')
  }
  process.stdout.write(url.origin)
}
catch {
  process.stderr.write('Expected an HTTP(S) origin URL without a path, query or credentials.\n')
  process.exit(64)
}
NODE
} 2>&1)" || {
  printf '%s\n' "$origin" >&2
  exit 64
}
readonly origin

proof_dir="$(mktemp -d)"
readonly proof_dir

cleanup() {
  rm -rf -- "$proof_dir"
}
trap cleanup EXIT

readonly french_paths=(
  '/developpeur-web-valais'
  '/creation-site-internet-valais'
  '/refonte-site-web-valais'
  '/application-mobile-valais'
  '/blog'
  '/cas-clients-valais'
)

readonly dynamic_canaries=(
  '/blog/aq-seo-005-caf%C3%A9%2Farticle'
  '/projets/aq-seo-005-caf%C3%A9%2Fcase'
)

readonly proof_query='?utm_source=aq-seo-005&utm_value=a%2Fb&utm_value=c'

for index in "${!french_paths[@]}"; do
  status="$(curl --silent --show-error --path-as-is \
    --connect-timeout 3 --max-time 12 --max-redirs 0 \
    --proto '=http,https' --proto-redir '=http,https' \
    --dump-header "${proof_dir}/fr-${index}.headers" \
    --output "${proof_dir}/fr-${index}.html" \
    --write-out '%{http_code}' \
    "${origin}${french_paths[$index]}")"
  if [[ "$status" != '200' ]]; then
    echo "${french_paths[$index]}: expected HTTP 200, got ${status}." >&2
    exit 1
  fi
done

redirect_index=0
for locale in en de; do
  for french_path in "${french_paths[@]}" "${dynamic_canaries[@]}"; do
    localized_path="/${locale}${french_path}"
    status="$(curl --silent --show-error --path-as-is \
      --connect-timeout 3 --max-time 12 --max-redirs 0 \
      --proto '=http,https' --proto-redir '=http,https' \
      --dump-header "${proof_dir}/redirect-${redirect_index}.headers" \
      --output "${proof_dir}/redirect-${redirect_index}.body" \
      --write-out '%{http_code}' \
      "${origin}${localized_path}${proof_query}")"
    if [[ "$status" != '308' ]]; then
      echo "${localized_path}: expected HTTP 308 without following it, got ${status}." >&2
      exit 1
    fi
    printf '%s\n' "${french_path}${proof_query}" > "${proof_dir}/redirect-${redirect_index}.expected"
    redirect_index=$((redirect_index + 1))
  done
done

sitemap_status="$(curl --silent --show-error --path-as-is \
  --connect-timeout 3 --max-time 12 --max-redirs 0 \
  --proto '=http,https' --proto-redir '=http,https' \
  --output "${proof_dir}/sitemap.xml" \
  --write-out '%{http_code}' \
  "${origin}/sitemap.xml")"
if [[ "$sitemap_status" != '200' ]]; then
  echo "/sitemap.xml: expected HTTP 200, got ${sitemap_status}." >&2
  exit 1
fi

node - "$proof_dir" "$origin" "$redirect_index" <<'NODE'
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const [proofDir, origin, redirectCountValue] = process.argv.slice(2)
const redirectCount = Number.parseInt(redirectCountValue, 10)
const frenchPaths = [
  '/developpeur-web-valais',
  '/creation-site-internet-valais',
  '/refonte-site-web-valais',
  '/application-mobile-valais',
  '/blog',
  '/cas-clients-valais',
]

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

function relContains(tag, value) {
  return (tag.rel || '').toLowerCase().split(/\s+/).includes(value)
}

function headerValues(rawHeaders, name) {
  const expectedName = name.toLowerCase()
  return rawHeaders
    .split(/\r?\n/)
    .map(line => line.match(/^([^:]+):\s*(.*)$/))
    .filter(Boolean)
    .filter(match => match[1].toLowerCase() === expectedName)
    .map(match => match[2].trim())
}

for (let index = 0; index < frenchPaths.length; index += 1) {
  const path = frenchPaths[index]
  const expectedCanonical = `${origin}${path}`
  const html = readFileSync(join(proofDir, `fr-${index}.html`), 'utf8')
  const headers = readFileSync(join(proofDir, `fr-${index}.headers`), 'utf8')
  const links = tags(html, 'link')
  const canonicals = links.filter(link => relContains(link, 'canonical'))

  if (canonicals.length !== 1 || canonicals[0].href !== expectedCanonical) {
    fail(`${path}: expected exactly one self-canonical ${expectedCanonical}.`)
  }

  const metaRobots = tags(html, 'meta')
    .filter(meta => (meta.name || '').toLowerCase() === 'robots')
    .flatMap(meta => (meta.content || '').toLowerCase().split(/[\s,]+/))
  const headerRobots = headerValues(headers, 'x-robots-tag')
    .flatMap(value => value.toLowerCase().split(/[\s,]+/))
  if ([...metaRobots, ...headerRobots].includes('noindex')) {
    fail(`${path}: the approved French page must not declare noindex.`)
  }

  const fictionalAlternate = links.find((link) => {
    if (!relContains(link, 'alternate')) return false
    const language = (link.hreflang || '').toLowerCase()
    return language === 'en' || language.startsWith('en-')
      || language === 'de' || language.startsWith('de-')
      || link.href === `${origin}/en${path}` || link.href === `${origin}/de${path}`
      || link.href === `/en${path}` || link.href === `/de${path}`
  })
  if (fictionalAlternate) {
    fail(`${path}: found a fictional English or German alternate.`)
  }

  const fictionalLanguageLink = tags(html, 'a').find((anchor) => {
    const language = (anchor.lang || anchor.hreflang || '').toLowerCase()
    return language === 'en' || language.startsWith('en-')
      || language === 'de' || language.startsWith('de-')
      || anchor.href === `/en${path}` || anchor.href === `/de${path}`
      || anchor.href === `${origin}/en${path}` || anchor.href === `${origin}/de${path}`
  })
  if (fictionalLanguageLink) {
    fail(`${path}: found a fictional English or German language link.`)
  }
}

for (let index = 0; index < redirectCount; index += 1) {
  const headers = readFileSync(join(proofDir, `redirect-${index}.headers`), 'utf8')
  const expected = readFileSync(join(proofDir, `redirect-${index}.expected`), 'utf8').trimEnd()
  const locations = headerValues(headers, 'location')
  if (locations.length !== 1 || locations[0] !== expected) {
    fail(`Redirect ${index + 1}: expected exact internal Location ${expected}.`)
  }
  if (!locations[0].startsWith('/') || locations[0].startsWith('//')) {
    fail(`Redirect ${index + 1}: Location must remain internal and relative.`)
  }
}

const sitemap = readFileSync(join(proofDir, 'sitemap.xml'), 'utf8')
const locations = [...sitemap.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)]
  .map(match => decode(match[1].trim()))
const exactFamilies = [
  '/developpeur-web-valais',
  '/creation-site-internet-valais',
  '/refonte-site-web-valais',
  '/application-mobile-valais',
  '/blog',
  '/cas-clients-valais',
]

for (const location of locations) {
  let pathname
  try {
    pathname = new URL(location, `${origin}/`).pathname
  }
  catch {
    continue
  }

  for (const locale of ['en', 'de']) {
    const fictionalExact = exactFamilies.some(path => pathname === `/${locale}${path}`
      || pathname === `/${locale}${path}/`)
    const fictionalDynamic = pathname.startsWith(`/${locale}/blog/`)
      || pathname.startsWith(`/${locale}/projets/`)
    if (fictionalExact || fictionalDynamic) {
      fail(`/sitemap.xml: found fictional localized location ${location}.`)
    }
  }
}
NODE

echo "French-only families checked: /developpeur-web-valais, /creation-site-internet-valais, /refonte-site-web-valais, /application-mobile-valais, /blog, /blog/**, /cas-clients-valais and /projets/**."
echo "French-only route policy is valid on ${origin}: 6 French pages, 16 permanent redirects and 8 sitemap families checked."
