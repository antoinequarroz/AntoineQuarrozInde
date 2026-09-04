#!/usr/bin/env bash
set -euo pipefail

readonly base_url="${1:-https://www.antoinequarroz.ch}"

node - "$base_url" <<'NODE'
const rawOrigin = process.argv[2]
const MAX_BYTES = 1024 * 1024
const ALLOWED_SERVICES = new Set([
  '/developpeur-web-valais',
  '/creation-site-internet-valais',
  '/refonte-site-web-valais',
  '/application-mobile-valais',
])
const PRIVATE_FIELDS = new Set([
  'organization_id',
  'client_id',
  'client_disclosure_status',
  'case_study_approved_at',
  'case_study_approved_by',
  'case_study_links_approved',
  'case_study_timeline_approved',
  'outcome_approved',
  'evidenceNote',
  'approved',
])

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

let origin
try {
  const url = new URL(rawOrigin)
  if (!['http:', 'https:'].includes(url.protocol)
    || url.username || url.password || url.pathname !== '/'
    || url.search || url.hash || (rawOrigin !== url.origin && rawOrigin !== `${url.origin}/`)) {
    throw new Error('unsafe origin')
  }
  origin = url.origin
}
catch {
  process.stderr.write('Expected an HTTP(S) origin URL without a path, query or credentials.\n')
  process.exit(64)
}

async function fetchBounded(path, expectedType) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  let response
  try {
    response = await fetch(`${origin}${path}`, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: expectedType },
    })
  }
  catch (error) {
    clearTimeout(timeout)
    fail(`${path}: request failed (${error.name || 'network error'}).`)
  }

  if (response.status >= 300 && response.status < 400) {
    clearTimeout(timeout)
    fail(`${path}: redirects are forbidden in the approval proof.`)
  }
  if (response.status !== 200) {
    clearTimeout(timeout)
    fail(`${path}: expected HTTP 200, got ${response.status}.`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes(expectedType)) {
    clearTimeout(timeout)
    fail(`${path}: expected ${expectedType} content, got ${contentType || 'no content type'}.`)
  }
  const advertised = Number(response.headers.get('content-length') || 0)
  if (advertised > MAX_BYTES) {
    clearTimeout(timeout)
    fail(`${path}: response exceeds the ${MAX_BYTES}-byte proof limit.`)
  }

  const chunks = []
  let size = 0
  try {
    for await (const chunk of response.body) {
      size += chunk.byteLength
      if (size > MAX_BYTES) {
        controller.abort()
        fail(`${path}: response exceeds the ${MAX_BYTES}-byte proof limit.`)
      }
      chunks.push(Buffer.from(chunk))
    }
  }
  finally {
    clearTimeout(timeout)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function parseProjects(body) {
  try {
    const value = JSON.parse(body)
    if (!Array.isArray(value)) throw new Error('expected an array')
    return value
  }
  catch (error) {
    fail(`/api/projects returned invalid JSON: ${error.message}`)
  }
}

function visit(value, path = 'project') {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`))
    return
  }
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_FIELDS.has(key)) fail(`The public projects API exposed private field ${path}.${key}.`)
    visit(child, `${path}.${key}`)
  }
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function decodeXml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function hrefPattern(path) {
  return new RegExp(`href=["']${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`)
}

async function main() {
  const [projectsBody, sitemap, hub] = await Promise.all([
    fetchBounded('/api/projects', 'application/json'),
    fetchBounded('/sitemap.xml', 'application/xml'),
    fetchBounded('/cas-clients-valais', 'text/html'),
  ])
  const projects = parseProjects(projectsBody)
  projects.forEach(project => visit(project))
  const cases = projects.filter(project => project.case_study_published === true)

  const casePaths = new Map()
  for (const project of cases) {
    const slug = String(project.slug || '').trim()
    if (!slug) fail('An approved case study has no slug.')
    const path = `/projets/${encodeURIComponent(slug)}`
    if (casePaths.has(path)) fail(`Duplicate approved case-study path: ${path}.`)
    casePaths.set(path, project)

    for (const field of ['challenge', 'project_role', 'project_scope', 'key_decisions', 'outcome']) {
      if (!nonEmpty(project[field])) fail(`${path}: approved case study is missing ${field}.`)
    }
    if (!Array.isArray(project.related_service_paths) || project.related_service_paths.length === 0) {
      fail(`${path}: approved case study has no related service.`)
    }
    const uniqueServices = new Set(project.related_service_paths)
    if (uniqueServices.size !== project.related_service_paths.length) {
      fail(`${path}: related services contain a duplicate.`)
    }
    for (const service of uniqueServices) {
      if (!ALLOWED_SERVICES.has(service)) fail(`${path}: unsupported related service ${service}.`)
    }
    if (!Array.isArray(project.results)) fail(`${path}: results must be an array.`)
    for (const [index, result] of project.results.entries()) {
      const keys = Object.keys(result).sort()
      if (!nonEmpty(result.value) || !nonEmpty(result.label)
        || keys.some(key => !['label', 'measurementContext', 'value'].includes(key))) {
        fail(`${path}: public result ${index + 1} is incomplete or exposes private metadata.`)
      }
    }
    if (!hrefPattern(path).test(hub)) fail(`${path}: missing SSR link from the case-study hub.`)
    for (const service of uniqueServices) {
      if (!hrefPattern(service).test(hub)) fail(`${path}: service ${service} is missing from the hub card.`)
    }
  }

  const sitemapProjectPaths = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/g)]
    .map(match => decodeXml(match[1].trim()))
    .filter(location => location.startsWith(`${origin}/projets/`))
    .map(location => location.slice(origin.length))
  if (new Set(sitemapProjectPaths).size !== sitemapProjectPaths.length) {
    fail('The sitemap contains a duplicate case-study location.')
  }
  for (const path of casePaths.keys()) {
    if (!sitemapProjectPaths.includes(path)) fail(`${path}: approved case study is missing from the sitemap.`)
  }
  for (const path of sitemapProjectPaths) {
    if (!casePaths.has(path)) fail(`${path}: sitemap exposed a case study absent from the approved public API.`)
  }

  for (const [path, project] of casePaths) {
    const html = await fetchBounded(path, 'text/html')
    const markers = ['context', 'role', 'scope', 'decisions', 'results']
    let cursor = -1
    for (const marker of markers) {
      const next = html.indexOf(`data-case-study-section="${marker}"`)
      if (next < 0) fail(`${path}: missing ${marker} section marker.`)
      if (next <= cursor) fail(`${path}: the five evidence sections are not in the approved order.`)
      cursor = next
    }
    if (!html.includes('data-case-study-services')) fail(`${path}: missing related-services section.`)
    for (const service of project.related_service_paths) {
      if (!hrefPattern(service).test(html)) fail(`${path}: missing detail link to ${service}.`)
    }
    for (const marker of PRIVATE_FIELDS) {
      if (html.includes(marker)) fail(`${path}: SSR output contains private marker ${marker}.`)
    }
    if (project.case_study_live_url && !html.includes(project.case_study_live_url)) {
      fail(`${path}: approved live link is absent from the detail page.`)
    }
    if (project.case_study_code_url && !html.includes(project.case_study_code_url)) {
      fail(`${path}: approved code link is absent from the detail page.`)
    }
  }

  process.stdout.write(`Approved case-study proof passed on ${origin}: ${cases.length} approved case study/studies.\n`)
}

main().catch(error => fail(error?.message || 'Unexpected approval proof failure.'))
NODE
