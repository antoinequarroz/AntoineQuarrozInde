#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"

origin="$({ node - "$base_url" <<'NODE'
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

proof_dir="$(mktemp -d)"
readonly proof_dir

cleanup() {
  rm -rf -- "$proof_dir"
}
trap cleanup EXIT

fetch_proof() {
  local path="$1"
  local name="$2"
  local status
  status="$(curl --silent --show-error --path-as-is \
    --connect-timeout 3 --max-time 15 --max-redirs 0 \
    --proto '=http,https' --proto-redir '=http,https' \
    --dump-header "${proof_dir}/${name}.headers" \
    --output "${proof_dir}/${name}.body" \
    --write-out '%{http_code}' \
    "${origin}${path}")"
  if [[ "$status" != '200' ]]; then
    echo "${path}: expected HTTP 200, got ${status}." >&2
    exit 1
  fi
}

fetch_proof '/sitemap.xml' 'sitemap'
fetch_proof '/api/articles' 'articles'
fetch_proof '/api/projects' 'projects'
fetch_proof '/cas-clients-valais' 'case-hub'

node - "$proof_dir" "$origin" <<'NODE'
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const [proofDir, origin] = process.argv.slice(2)

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function read(name, suffix = 'body') {
  return readFileSync(join(proofDir, `${name}.${suffix}`), 'utf8')
}

function decodeXml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function normalizeDate(...values) {
  const value = values.find(item => typeof item === 'string' && item.trim())
  if (!value) fail('A published content row has no stable discovery date.')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) fail(`Invalid discovery date: ${value}.`)
  return date.toISOString()
}

function parseJson(name) {
  try {
    const value = JSON.parse(read(name))
    if (!Array.isArray(value)) throw new Error('expected an array')
    return value
  }
  catch (error) {
    fail(`/${name === 'articles' ? 'api/articles' : 'api/projects'} returned invalid JSON: ${error.message}`)
  }
}

const sitemapHeaders = read('sitemap', 'headers').toLowerCase()
if (!/^content-type:\s*application\/xml(?:;|\r?$)/m.test(sitemapHeaders)) {
  fail('/sitemap.xml must return an application/xml content type.')
}

const sitemap = read('sitemap')
if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">[\s\S]*<\/urlset>\s*$/.test(sitemap)) {
  fail('/sitemap.xml is not a complete Sitemap XML document.')
}

const urlEntries = [...sitemap.matchAll(/<url>\s*<loc>([\s\S]*?)<\/loc>([\s\S]*?)<\/url>/g)]
  .map(match => ({
    location: decodeXml(match[1].trim()),
    lastmods: [...match[2].matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/g)].map(item => decodeXml(item[1].trim())),
  }))
const locations = new Map()
for (const entry of urlEntries) {
  if (locations.has(entry.location)) fail(`Duplicate sitemap location: ${entry.location}.`)
  if (!entry.location.startsWith(`${origin}/`) && entry.location !== `${origin}/`) {
    fail(`Non-canonical sitemap location: ${entry.location}.`)
  }
  locations.set(entry.location, entry)
}

for (const path of ['/', '/blog', '/cas-clients-valais']) {
  if (!locations.has(`${origin}${path}`)) fail(`Missing required sitemap page: ${path}.`)
}
for (const location of locations.keys()) {
  if (/\/(?:admin|portal)(?:\/|$)|\/offline(?:\/|$)/.test(location)
    || /\/(?:en|de)\/(?:blog|projets|cas-clients-valais)(?:\/|$)/.test(location)) {
    fail(`Private or fictional localized sitemap location: ${location}.`)
  }
}

const articles = parseJson('articles')
const projects = parseJson('projects')
const caseHub = read('case-hub')
const forbiddenArticleFields = ['organization_id']
const forbiddenProjectFields = [
  'organization_id', 'client_id', 'workflow_status', 'starts_at', 'target_at',
  'budget_cents', 'internal_hourly_cost_cents',
]

for (const article of articles) {
  if (article.published !== true) fail(`The public articles API exposed draft ${article.slug || '(missing slug)'}.`)
  for (const field of forbiddenArticleFields) {
    if (Object.hasOwn(article, field)) fail(`The public articles API exposed ${field}.`)
  }
  const path = `/blog/${encodeURIComponent(String(article.slug || '').trim())}`
  const entry = locations.get(`${origin}${path}`)
  if (!entry) fail(`Published article missing from sitemap: ${path}.`)
  const expected = normalizeDate(article.updated_at, article.published_at, article.created_at)
  if (entry.lastmods.length !== 1 || entry.lastmods[0] !== expected) {
    fail(`Article ${path} has an incorrect or missing lastmod.`)
  }
}

for (const project of projects) {
  for (const field of forbiddenProjectFields) {
    if (Object.hasOwn(project, field)) fail(`The public projects API exposed ${field}.`)
  }
  if (project.case_study_published !== true) continue
  const path = `/projets/${encodeURIComponent(String(project.slug || '').trim())}`
  const entry = locations.get(`${origin}${path}`)
  if (!entry) fail(`Published case study missing from sitemap: ${path}.`)
  const expected = normalizeDate(project.updated_at, project.case_study_published_at, project.created_at)
  if (entry.lastmods.length !== 1 || entry.lastmods[0] !== expected) {
    fail(`Case study ${path} has an incorrect or missing lastmod.`)
  }
  if (!caseHub.includes(`href="${path}"`)) {
    fail(`Published case study has no SSR link from /cas-clients-valais: ${path}.`)
  }
}

process.stdout.write(`Sitemap discovery is complete on ${origin}: ${articles.length} article(s), ${projects.filter(item => item.case_study_published === true).length} case study/studies.\n`)
NODE
