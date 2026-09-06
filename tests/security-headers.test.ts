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

async function listen(headers: Record<string, string>) {
  const server = createServer((_request, response) => {
    response.writeHead(200, headers)
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

const expectedHeaders = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://challenges.cloudflare.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://plausible.io https://*.supabase.co wss://*.supabase.co https://prod.spline.design https://unpkg.com https://challenges.cloudflare.com; frame-src 'self' blob: https://challenges.cloudflare.com; worker-src 'self' blob:; media-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests",
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

describe('public security headers', () => {
  it('configures conservative protections in Caddy while allowing required application resources', async () => {
    const caddyfile = await readFile('Caddyfile', 'utf8')

    for (const [name, value] of Object.entries(expectedHeaders)) {
      expect(caddyfile).toContain(`${name} "${value}"`)
    }
    expect(caddyfile).toContain('-Server')
    expect(caddyfile).not.toContain("script-src *")
    expect(caddyfile).not.toContain("script-src 'self' https:")
    expect(caddyfile).toContain("script-src-attr 'none'")
    expect(caddyfile).toContain('https://fonts.googleapis.com')
    expect(caddyfile).toContain('https://fonts.gstatic.com')
    expect(caddyfile).toContain('https://*.supabase.co')
    expect(caddyfile).toContain('wss://*.supabase.co')
    expect(caddyfile).toContain('https://plausible.io')
    expect(caddyfile).toContain('https://prod.spline.design')
    expect(caddyfile).toContain('https://challenges.cloudflare.com')
    expect(caddyfile).toMatch(/request_body\s*\{\s*max_size 8MB\s*\}/)
  })

  it('keeps the production proof after the canonical-domain check', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8')
    const domainProof = 'bash scripts/ops/verify-domain-canonicalization.sh https://antoinequarroz.ch https://www.antoinequarroz.ch'
    const headerProof = 'bash scripts/ops/verify-security-headers.sh https://www.antoinequarroz.ch'

    expect(workflow).toContain(headerProof)
    expect(workflow.indexOf(domainProof)).toBeLessThan(workflow.indexOf(headerProof))
  })

  unixIt('accepts the complete expected header contract', async () => {
    const origin = await listen(expectedHeaders)
    const result = await execFileAsync('bash', ['scripts/ops/verify-security-headers.sh', origin])

    expect(result.stdout).toContain('Security headers are active')
  })

  unixIt('fails closed when a protection is missing', async () => {
    const { 'X-Frame-Options': _omitted, ...incompleteHeaders } = expectedHeaders
    const origin = await listen(incompleteHeaders)

    await expect(execFileAsync('bash', [
      'scripts/ops/verify-security-headers.sh',
      origin,
    ])).rejects.toMatchObject({ code: 1 })
  })
})
