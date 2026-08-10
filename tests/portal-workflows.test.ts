import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('portal and project workflow boundaries', () => {
  it('isolates portal actions through the authenticated client helper', () => {
    for (const file of ['../server/api/portal/quotes/accept.post.ts', '../server/api/portal/quote-pdf.get.ts', '../server/api/portal/twint-checkout.post.ts', '../server/api/portal/twint-status.get.ts']) {
      expect(source(file)).toContain('requirePortalClient(event)')
    }
  })

  it('accepts only sent quotes through an atomic transition', () => {
    const accept = source('../server/api/portal/quotes/accept.post.ts')
    expect(accept).toContain("body.confirmed !== true")
    expect(accept).toContain(".eq('status', 'sent')")
    expect(accept).toContain('accepted_by_user_id: user.id')
  })

  it('scopes running timers to the authenticated manager', () => {
    const running = source('../server/api/project-timer.get.ts')
    const stop = source('../server/api/project-timer/stop.post.ts')
    expect(running).toContain(".eq('created_by_user_id', user.id)")
    expect(stop).toContain(".eq('created_by_user_id', user.id)")
    expect(stop).toContain(".is('stopped_at', null)")
  })

  it('matches Stripe webhooks against the server-side checkout registry', () => {
    const webhook = source('../server/api/webhooks/stripe.post.ts')
    expect(webhook).toContain(".from('payment_checkout_sessions')")
    expect(webhook).toContain('Number(checkoutSession.amount_cents) !== amountCents')
    expect(webhook).toContain('checkoutSession.organization_id !== organizationId')
  })

  it('maps the operator Stripe secrets to Nuxt runtime configuration', () => {
    const compose = source('../docker-compose.yml')
    expect(compose).toContain('NUXT_STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}')
    expect(compose).toContain('NUXT_STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-}')
  })

  it('does not expose CRM notes or deletable running timers', () => {
    const overview = source('../server/api/portal/overview.get.ts')
    const cockpit = source('../server/api/project-cockpit.get.ts')
    const removal = source('../server/api/project-cockpit.delete.ts')
    expect(overview).toContain("client: { id: client.id, name: client.name, company: client.company || null }")
    expect(cockpit).toContain("entry.entry_source !== 'timer' || entry.stopped_at")
    expect(removal).toContain("timeEntry.entry_source === 'timer' && !timeEntry.stopped_at")
  })
})
