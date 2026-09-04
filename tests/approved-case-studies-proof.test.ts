import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { promisify } from 'node:util'

import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const servers: ReturnType<typeof createServer>[] = []
const script = 'scripts/ops/verify-approved-case-studies.sh'

type Variant =
  | 'valid'
  | 'empty'
  | 'multiple'
  | 'private-field'
  | 'missing-section'
  | 'missing-service'
  | 'extra-sitemap'
  | 'redirect-detail'
  | 'oversized'

function project(slug = 'cas-approuve') {
  return {
    id: slug,
    title: `Étude ${slug}`,
    slug,
    category: 'web',
    tags: ['Nuxt'],
    description: 'Résumé vérifié',
    image: '/case.webp',
    live_url: null,
    code_url: null,
    case_study_live_url: null,
    case_study_code_url: null,
    featured: false,
    portfolio_visible: false,
    case_study_published: true,
    case_study_published_at: '2026-09-04T12:00:00.000Z',
    client_label: null,
    project_role: 'Conception et développement',
    project_duration: null,
    completed_at: null,
    challenge: 'Contexte vérifié',
    project_scope: 'Périmètre vérifié',
    key_decisions: 'Décisions vérifiées',
    approach: null,
    solution: null,
    outcome: 'Résultat qualitatif vérifié',
    related_service_paths: ['/developpeur-web-valais'],
    deliverables: [],
    gallery_images: [],
    results: [{ value: '1', label: 'livraison', measurementContext: null }],
    seo_title: null,
    seo_description: null,
    updated_at: '2026-09-04T12:00:00.000Z',
    created_at: '2026-09-04T12:00:00.000Z',
  }
}

async function serve(variant: Variant) {
  const projects = variant === 'empty'
    ? []
    : variant === 'multiple'
      ? [project('cas-un'), project('cas-deux')]
      : [project()]

  if (variant === 'private-field') {
    Object.assign(projects[0]!.results[0]!, { evidenceNote: 'secret' })
  }
  if (variant === 'missing-service') projects[0]!.related_service_paths = []

  const server = createServer((request, response) => {
    const address = server.address()
    const origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
    const casePaths = projects.map(item => `/projets/${item.slug}`)
    response.setHeader('cache-control', 'no-store')

    if (request.url === '/api/projects') {
      response.setHeader('content-type', 'application/json')
      if (variant === 'oversized') {
        response.setHeader('content-length', String(1024 * 1024 + 1))
        response.end('[]')
      }
      else {
        response.end(JSON.stringify(projects))
      }
      return
    }
    if (request.url === '/sitemap.xml') {
      response.setHeader('content-type', 'application/xml')
      const paths = variant === 'extra-sitemap' ? [...casePaths, '/projets/non-approuve'] : casePaths
      response.end(`<?xml version="1.0"?><urlset>${paths.map(path => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`)
      return
    }
    if (request.url === '/cas-clients-valais') {
      response.setHeader('content-type', 'text/html')
      response.end(casePaths.map((path, index) => `<article><a href="${path}">Cas</a><a href="${projects[index]!.related_service_paths[0] || '/absent'}">Service</a></article>`).join(''))
      return
    }
    const matched = projects.find(item => request.url === `/projets/${item.slug}`)
    if (matched) {
      if (variant === 'redirect-detail') {
        response.statusCode = 302
        response.setHeader('location', '/')
        response.end()
        return
      }
      response.setHeader('content-type', 'text/html')
      const markers = ['context', 'role', 'scope', 'decisions', 'results']
        .filter(marker => variant !== 'missing-section' || marker !== 'scope')
        .map(marker => `<section data-case-study-section="${marker}">${marker}</section>`)
        .join('')
      response.end(`${markers}<section data-case-study-services><a href="/developpeur-web-valais">Service</a></section>`)
      return
    }
    response.statusCode = 404
    response.setHeader('content-type', 'text/plain')
    response.end('Not found')
  })
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test port')
  return `http://127.0.0.1:${address.port}`
}

async function run(origin: string) {
  return execFileAsync('bash', [script, origin], { cwd: process.cwd() })
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })))
})

describe('AQ-SEO-012 anonymous approved case-study proof', () => {
  it.each(['valid', 'empty', 'multiple'] as const)('accepts the %s public state', async (variant) => {
    const origin = await serve(variant)
    await expect(run(origin)).resolves.toMatchObject({ stdout: expect.stringContaining('proof passed') })
  })

  it.each([
    'private-field',
    'missing-section',
    'missing-service',
    'extra-sitemap',
    'redirect-detail',
    'oversized',
  ] as const)('rejects the %s public state', async (variant) => {
    const origin = await serve(variant)
    await expect(run(origin)).rejects.toMatchObject({ code: 1 })
  })

  it('rejects unsafe origins before making a request', async () => {
    await expect(run('https://user:secret@example.com')).rejects.toMatchObject({ code: 64 })
  })
})
