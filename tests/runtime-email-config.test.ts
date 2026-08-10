import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('production email runtime configuration', () => {
  it('maps the operator Resend key to the Nuxt runtime override', () => {
    const compose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8')

    expect(compose).toContain('NUXT_RESEND_API_KEY: ${RESEND_API_KEY:-}')
  })
})
