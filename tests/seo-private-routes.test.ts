import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const servers: ReturnType<typeof createServer>[] = []
const unixIt = process.platform === 'win32' ? it.skip : it

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })))
})

async function listen(headersForPath: (path: string) => Record<string, string>) {
  const server = createServer((request, response) => {
    if (request.url === '/admin/seo-proof-not-found') response.statusCode = 404
    response.writeHead(response.statusCode, headersForPath(request.url ?? '/'))
    response.end('ok')
  })
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP port')
  return `http://127.0.0.1:${address.port}`
}

describe('AQ-SEO-002 private route visibility', () => {
  it('sets noindex and nofollow on every private route family', async () => {
    const config = await readFile('nuxt.config.ts', 'utf8')
    const directive = "{ headers: { 'X-Robots-Tag': 'noindex, nofollow' } }"

    for (const route of ['/admin', '/admin/**', '/portal', '/portal/**', '/offline']) {
      expect(config).toContain(`'${route}': ${directive}`)
    }
  })

  it('does not apply the private directive globally', async () => {
    const config = await readFile('nuxt.config.ts', 'utf8')

    expect(config).not.toMatch(/['"]\/\*\*['"]:\s*\{\s*headers:\s*\{\s*['"]X-Robots-Tag['"]:\s*['"]noindex/)
  })

  it('keeps private routes out of the sitemap', async () => {
    const sitemap = await readFile('server/routes/sitemap.xml.ts', 'utf8')
    const staticPaths = sitemap.match(/const staticPaths = \[([\s\S]*?)\n  \]/)?.[1] ?? ''

    expect(staticPaths).not.toMatch(/['"]\/(?:admin|portal|offline)(?:\/|['"])/)
  })

  it('keeps private routes out of public HTML navigation', async () => {
    const [header, footer] = await Promise.all([
      readFile('app/components/layout/AppHeader.vue', 'utf8'),
      readFile('app/components/layout/AppFooter.vue', 'utf8'),
    ])

    for (const navigation of [header, footer]) {
      expect(navigation).not.toMatch(/(?:href|to)\s*=\s*["']\/(?:admin|portal|offline)(?:\/|["'])/)
    }
  })

  it('runs the private-route proof after the existing release proofs', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')
    const domainProof = 'bash scripts/ops/verify-domain-canonicalization.sh https://antoinequarroz.ch https://www.antoinequarroz.ch'
    const privateProof = 'bash scripts/ops/verify-private-noindex.sh https://www.antoinequarroz.ch'

    expect(workflow).toContain(privateProof)
    expect(workflow.indexOf(domainProof)).toBeLessThan(workflow.indexOf(privateProof))
  })

  it('samples logins, protected surfaces, offline and a missing private route', async () => {
    const script = await readFile('scripts/ops/verify-private-noindex.sh', 'utf8')

    for (const route of [
      '/admin/login',
      '/admin',
      '/admin/seo-proof-not-found',
      '/portal/login',
      '/portal',
      '/offline',
    ]) {
      expect(script).toContain(`'${route}'`)
    }
  })

  unixIt('accepts private routes carrying both directives', async () => {
    const origin = await listen(() => ({ 'X-Robots-Tag': 'noindex, nofollow' }))
    const result = await execFileAsync('bash', ['scripts/ops/verify-private-noindex.sh', origin], { cwd: process.cwd() })

    expect(result.stdout).toContain('Private routes are non-indexable')
  })

  unixIt('rejects a missing directive on any sampled route', async () => {
    const origin = await listen(path => path === '/portal' ? { 'X-Robots-Tag': 'noindex' } : { 'X-Robots-Tag': 'noindex, nofollow' })

    await expect(execFileAsync('bash', [
      'scripts/ops/verify-private-noindex.sh',
      origin,
    ], { cwd: process.cwd() })).rejects.toMatchObject({ code: 1 })
  })

  unixIt('rejects unsafe origins and unavailable destinations', async () => {
    await expect(execFileAsync('bash', [
      'scripts/ops/verify-private-noindex.sh',
      'https://user@example.com',
    ], { cwd: process.cwd() })).rejects.toMatchObject({ code: 64 })

    await expect(execFileAsync('bash', [
      'scripts/ops/verify-private-noindex.sh',
      'http://127.0.0.1:9',
    ], { cwd: process.cwd() })).rejects.toMatchObject({ code: 7 })
  })
})
