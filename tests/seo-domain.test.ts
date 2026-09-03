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

async function listen(handler: Parameters<typeof createServer>[0]) {
  const server = createServer(handler)
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP port')
  return `http://127.0.0.1:${address.port}`
}

describe('AQ-SEO-001 canonical public domain', () => {
  it('uses the production .ch domain as the safe Nuxt fallback', async () => {
    const config = await readFile('nuxt.config.ts', 'utf8')

    expect(config).toContain("siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://www.antoinequarroz.ch'")
    expect(config).not.toContain('antoinequarroz.dev')
  })

  it('separates the apex redirect from the www reverse proxy', async () => {
    const caddyfile = await readFile('Caddyfile', 'utf8')

    expect(caddyfile).toMatch(/antoinequarroz\.ch \{\s+redir https:\/\/www\.antoinequarroz\.ch\{uri\} permanent\s+\}/)
    expect(caddyfile).toMatch(/www\.antoinequarroz\.ch \{[\s\S]*reverse_proxy web:3000[\s\S]*\}/)
    expect(caddyfile).not.toContain('antoinequarroz.ch, www.antoinequarroz.ch')
  })

  it('validates and reloads Caddy during the existing release flow', async () => {
    const deploy = await readFile('scripts/ops/deploy-release.sh', 'utf8')

    expect(deploy).toContain('docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile')
    expect(deploy).toContain('docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile')
    expect(deploy.lastIndexOf('validate_caddy_config\n')).toBeLessThan(deploy.indexOf('docker compose build web'))
    expect(deploy.lastIndexOf('wait_for_health\n')).toBeLessThan(deploy.lastIndexOf('reload_caddy_config\n'))
  })

  it('keeps the domain proof after the SHA and health proof in CI', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')
    const releaseProof = 'bash scripts/ops/verify-production-release.sh "$EXPECTED_SHA" https://www.antoinequarroz.ch'
    const domainProof = 'bash scripts/ops/verify-domain-canonicalization.sh https://antoinequarroz.ch https://www.antoinequarroz.ch'

    expect(workflow).toContain(releaseProof)
    expect(workflow).toContain(domainProof)
    expect(workflow.indexOf(releaseProof)).toBeLessThan(workflow.indexOf(domainProof))
  })

  unixIt('accepts a permanent redirect that preserves path and query', async () => {
    const canonical = await listen((_request, response) => {
      response.statusCode = 200
      response.end('ok')
    })
    const apex = await listen((request, response) => {
      response.statusCode = 308
      response.setHeader('Location', `${canonical}${request.url}`)
      response.end()
    })

    const result = await execFileAsync('bash', [
      'scripts/ops/verify-domain-canonicalization.sh',
      apex,
      canonical,
    ], { cwd: process.cwd() })

    expect(result.stdout).toContain('redirects permanently')
  })

  unixIt('rejects a non-redirecting apex', async () => {
    const canonical = await listen((_request, response) => {
      response.statusCode = 200
      response.end('ok')
    })
    const apex = await listen((_request, response) => {
      response.statusCode = 200
      response.end('not redirected')
    })

    await expect(execFileAsync('bash', [
      'scripts/ops/verify-domain-canonicalization.sh',
      apex,
      canonical,
    ], { cwd: process.cwd() })).rejects.toMatchObject({ code: 1 })
  })

  unixIt('rejects temporary or altered redirect targets', async () => {
    const canonical = await listen((_request, response) => {
      response.statusCode = 200
      response.end('ok')
    })
    const temporaryApex = await listen((request, response) => {
      response.statusCode = 302
      response.setHeader('Location', `${canonical}${request.url}`)
      response.end()
    })

    await expect(execFileAsync('bash', [
      'scripts/ops/verify-domain-canonicalization.sh',
      temporaryApex,
      canonical,
    ], { cwd: process.cwd() })).rejects.toMatchObject({ code: 1 })

    const alteredApex = await listen((_request, response) => {
      response.statusCode = 308
      response.setHeader('Location', `${canonical}/wrong-path`)
      response.end()
    })

    await expect(execFileAsync('bash', [
      'scripts/ops/verify-domain-canonicalization.sh',
      alteredApex,
      canonical,
    ], { cwd: process.cwd() })).rejects.toMatchObject({ code: 1 })
  })

  unixIt('rejects an unavailable canonical destination and unsafe URL inputs', async () => {
    const unavailableCanonical = 'http://127.0.0.1:9'
    const apex = await listen((request, response) => {
      response.statusCode = 308
      response.setHeader('Location', `${unavailableCanonical}${request.url}`)
      response.end()
    })

    await expect(execFileAsync('bash', [
      'scripts/ops/verify-domain-canonicalization.sh',
      apex,
      unavailableCanonical,
    ], { cwd: process.cwd() })).rejects.toMatchObject({ code: 7 })

    await expect(execFileAsync('bash', [
      'scripts/ops/verify-domain-canonicalization.sh',
      'https://user@example.com',
      'https://www.antoinequarroz.ch',
    ], { cwd: process.cwd() })).rejects.toMatchObject({ code: 64 })
  })
})
