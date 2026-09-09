import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isHermesReadRequestAuthorized } from '../server/utils/hermesReadAuth'

describe('Hermes read-only CRM access', () => {
  it('requires an exact bearer token', () => {
    expect(isHermesReadRequestAuthorized('Bearer shared-secret', 'shared-secret')).toBe(true)
    expect(isHermesReadRequestAuthorized('Bearer wrong-secret', 'shared-secret')).toBe(false)
    expect(isHermesReadRequestAuthorized('shared-secret', 'shared-secret')).toBe(false)
    expect(isHermesReadRequestAuthorized('Bearer ', 'shared-secret')).toBe(false)
  })

  it('keeps the Hermes endpoint GET-only and free of mutations', () => {
    const source = readFileSync(new URL('../server/api/hermes/snapshot.get.ts', import.meta.url), 'utf8')

    expect(source).toContain('requireHermesReadAccess(event)')
    expect(source).not.toMatch(/\.insert\s*\(/)
    expect(source).not.toMatch(/\.update\s*\(/)
    expect(source).not.toMatch(/\.delete\s*\(/)
    expect(source).not.toMatch(/\.upsert\s*\(/)
    expect(source).not.toContain('notes')
    expect(source).not.toContain('invoice_payments')
  })

  it('passes the private token to Nuxt only at container runtime', () => {
    const compose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8')
    const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')

    expect(compose).toContain('NUXT_HERMES_READ_TOKEN: ${HERMES_READ_TOKEN:-}')
    expect(workflow).toContain('HERMES_READ_TOKEN: ${{ secrets.HERMES_READ_TOKEN }}')
    expect(workflow).toContain('scripts/ops/install-hermes-read-token.sh')
  })
})
