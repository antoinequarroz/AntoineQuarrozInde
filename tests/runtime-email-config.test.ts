import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('production email runtime configuration', () => {
  it('maps Lumail to the Nuxt runtime override', () => {
    const compose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8')

    expect(compose).toContain('NUXT_LUMAIL_API_KEY: ${LUMAIL_API_KEY:-}')
    expect(compose).not.toContain('NUXT_RESEND_API_KEY')
    expect(compose).toContain('NUXT_EMAIL_FROM: ${EMAIL_FROM:-')
  })

  it('routes billing documents and VPS alerts through Lumail', () => {
    const billing = readFileSync(new URL('../server/utils/billingEmail.ts', import.meta.url), 'utf8')
    const monitor = readFileSync(new URL('../scripts/ops/monitor.sh', import.meta.url), 'utf8')

    expect(billing).toContain("/portal#${input.kind === 'quote' ? 'devis' : 'factures'}")
    expect(billing).not.toContain('attachments:')
    expect(monitor).toContain('read_env LUMAIL_API_KEY')
    expect(monitor).toContain('https://lumail.io/api/v2/emails')
    expect(monitor).not.toContain('RESEND_API_KEY')
  })
})
