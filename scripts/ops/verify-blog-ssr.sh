#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"
readonly fallback_node_image="antoinequarroz-web:candidate"

proof_dir="$(mktemp -d)"
readonly proof_dir

cleanup() {
  rm -rf -- "$proof_dir"
}
trap cleanup EXIT

run_node() {
  local argument="$1"

  if command -v node >/dev/null 2>&1; then
    node - "$argument"
    return
  fi

  if ! command -v docker >/dev/null 2>&1 \
    || ! docker image inspect "$fallback_node_image" >/dev/null 2>&1; then
    echo "Node.js is required locally or in ${fallback_node_image}." >&2
    return 69
  fi

  if [[ "$argument" == "$proof_dir" ]]; then
    argument='/proof'
  fi

  docker run --rm -i --network none \
    --mount "type=bind,source=${proof_dir},target=/proof,readonly" \
    "$fallback_node_image" node - "$argument"
}

origin="$({ run_node "$base_url" <<'NODE'
const value = process.argv[2]
try {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)
    || url.username || url.password || url.pathname !== '/'
    || url.search || url.hash || (value !== url.origin && value !== `${url.origin}/`)) {
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

fetch_proof() {
  local path="$1"
  local name="$2"
  local status
  status="$(curl --silent --show-error --path-as-is \
    --connect-timeout 3 --max-time 15 --max-redirs 0 \
    --proto '=http,https' --proto-redir '=http,https' \
    --output "${proof_dir}/${name}.body" \
    --write-out '%{http_code}' \
    "${origin}${path}")"
  if [[ "$status" != '200' ]]; then
    echo "${path}: expected HTTP 200, got ${status}." >&2
    exit 1
  fi
}

fetch_proof '/api/public/articles' 'articles'
fetch_proof '/blog' 'blog'

run_node "$proof_dir" <<'NODE'
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const proofDir = process.argv[2]

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function read(name) {
  return readFileSync(join(proofDir, `${name}.body`), 'utf8')
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function escapeAttribute(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const expectedKeys = [
  'cover_image', 'created_at', 'excerpt', 'published_at',
  'read_time', 'slug', 'tags', 'title',
].sort()
const forbiddenMarkers = [
  'organization_id', 'content', 'published', 'internal_note',
  'workflow_status', 'access_token', 'authorization',
]

let articles
try {
  articles = JSON.parse(read('articles'))
}
catch (error) {
  fail(`/api/public/articles returned invalid JSON: ${error.message}`)
}
if (!Array.isArray(articles)) fail('/api/public/articles must return an array.')

const html = read('blog')
const visibleHtml = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
const visibleText = decodeHtml(visibleHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())

const payloadMatch = html.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
if (!payloadMatch) fail('The server-rendered page has no Nuxt payload.')

let serializedPayload
try {
  serializedPayload = JSON.parse(payloadMatch[1])
}
catch (error) {
  fail(`The Nuxt payload is invalid JSON: ${error.message}`)
}
if (!Array.isArray(serializedPayload)) fail('The Nuxt payload must use the expected serialized array format.')

const decodedReferences = new Map()
function decodeReference(index) {
  if (index === -1) return undefined
  if (index === -2) return Number.NaN
  if (index === -3) return Number.POSITIVE_INFINITY
  if (index === -4) return Number.NEGATIVE_INFINITY
  if (!Number.isInteger(index) || index < 0 || index >= serializedPayload.length) {
    fail(`The Nuxt payload contains an invalid reference: ${index}.`)
  }
  if (decodedReferences.has(index)) return decodedReferences.get(index)

  const value = serializedPayload[index]
  if (value === null || typeof value !== 'object') return value

  if (Array.isArray(value)) {
    if (typeof value[0] === 'string' && ['Reactive', 'ShallowReactive', 'Ref', 'ShallowRef'].includes(value[0])) {
      const decoded = decodeReference(value[1])
      decodedReferences.set(index, decoded)
      return decoded
    }
    if (value[0] === 'Set') {
      const decoded = value.slice(1).map(item => decodeReference(item))
      decodedReferences.set(index, decoded)
      return decoded
    }
    const decoded = []
    decodedReferences.set(index, decoded)
    decoded.push(...value.map(item => typeof item === 'number' ? decodeReference(item) : item))
    return decoded
  }

  const decoded = {}
  decodedReferences.set(index, decoded)
  for (const [key, reference] of Object.entries(value)) {
    decoded[key] = typeof reference === 'number' ? decodeReference(reference) : reference
  }
  return decoded
}

const decodedPayload = decodeReference(0)
const payloadArticles = decodedPayload?.data?.['public-blog-articles']
if (!Array.isArray(payloadArticles)) fail('The Nuxt payload has no public blog article list.')
if (JSON.stringify(payloadArticles) !== JSON.stringify(articles)) {
  fail('The Nuxt payload article list differs from the canonical public API.')
}

const forbiddenPayloadFields = new Set([
  'organization_id', 'content', 'published', 'internal_note',
  'workflow_status', 'access_token', 'accessToken', 'refresh_token',
  'refreshToken', 'userEmail', 'organizations', 'currentOrganizationId',
  'authorization',
])
const visitedPayloadValues = new Set()
function inspectPayload(value) {
  if (!value || typeof value !== 'object' || visitedPayloadValues.has(value)) return
  visitedPayloadValues.add(value)
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenPayloadFields.has(key)) fail(`The Nuxt payload exposed forbidden field ${key}.`)
    inspectPayload(child)
  }
}
inspectPayload(decodedPayload)

const piniaAuthState = decodedPayload?.pinia?.auth || decodedPayload?.state?.pinia?.auth
if (piniaAuthState && typeof piniaAuthState === 'object' && Object.keys(piniaAuthState).length > 0) {
  fail('The Nuxt payload serialized authenticated Pinia state on the public blog.')
}

const renderedArticleCount = (visibleHtml.match(/<article\b/gi) || []).length
if (renderedArticleCount !== articles.length) {
  fail(`The visible SSR HTML contains ${renderedArticleCount} article card(s), expected ${articles.length}.`)
}

for (const article of articles) {
  const keys = Object.keys(article).sort()
  if (keys.join(',') !== expectedKeys.join(',')) {
    fail(`Unexpected public article fields for ${article.slug || '(missing slug)'}: ${keys.join(',')}.`)
  }
  if (typeof article.title !== 'string' || !article.title.trim()
    || typeof article.slug !== 'string' || !article.slug.trim()
    || typeof article.excerpt !== 'string'
    || typeof article.created_at !== 'string'
    || !Array.isArray(article.tags)
    || typeof article.read_time !== 'number') {
    fail(`Invalid public article summary for ${article.slug || '(missing slug)'}.`)
  }

  const path = `/blog/${encodeURIComponent(article.slug.trim())}`
  const hrefPattern = new RegExp(`href=["']${escapeAttribute(path)}["']`)
  if (!hrefPattern.test(visibleHtml)) fail(`Published article has no SSR link: ${path}.`)
  if (!visibleText.includes(article.title.trim())) fail(`Published article title is absent from visible SSR HTML: ${article.slug}.`)
  if (article.excerpt.trim() && !visibleText.includes(article.excerpt.trim())) {
    fail(`Published article excerpt is absent from visible SSR HTML: ${article.slug}.`)
  }
  const date = article.published_at || article.created_at
  const datePattern = new RegExp(`<time[^>]+datetime=["']${escapeAttribute(date)}["']`)
  if (!datePattern.test(visibleHtml)) fail(`Published article date is absent from visible SSR HTML: ${article.slug}.`)
}

if (articles.length === 0) {
  if (!visibleText.includes('Premiers articles bientôt disponibles')) {
    fail('The server-rendered empty blog state is missing.')
  }
}
else if (visibleText.includes('Premiers articles bientôt disponibles')) {
  fail('The blog rendered a false empty state despite published articles.')
}

for (const marker of forbiddenMarkers) {
  if (articles.some(article => Object.hasOwn(article, marker))) {
    fail(`/api/public/articles exposed forbidden field ${marker}.`)
  }
}

process.stdout.write(`Blog SSR is complete: ${articles.length} published article(s) rendered with crawlable links.\n`)
NODE
