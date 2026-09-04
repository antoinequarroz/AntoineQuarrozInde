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
  'Content-Security-Policy': "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

describe('public security headers', () => {
  it('configures conservative protections in Caddy without restricting application resources', async () => {
    const caddyfile = await readFile('Caddyfile', 'utf8')

    for (const [name, value] of Object.entries(expectedHeaders)) {
      expect(caddyfile).toContain(`${name} "${value}"`)
    }
    expect(caddyfile).toContain('-Server')
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
