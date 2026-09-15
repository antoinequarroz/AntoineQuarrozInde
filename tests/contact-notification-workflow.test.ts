import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('contact notification workflow', () => {
  it('persists the CRM message before reserving the Lumail delivery and never returns an untracked success', async () => {
    const source = await readFile('server/api/contact.post.ts', 'utf8')
    const messageInsert = source.indexOf(".from('contact_messages')")
    const trackedSend = source.indexOf('await sendTrackedEmail({')
    const finalSuccess = source.lastIndexOf('return { success: true')

    expect(messageInsert).toBeGreaterThan(-1)
    expect(trackedSend).toBeGreaterThan(messageInsert)
    expect(finalSuccess).toBeGreaterThan(trackedSend)
    expect(source).not.toMatch(/!isEmailConfigured[^\n]+return\s+\{\s*success:\s*true/)
    expect(source).toContain("idempotencyKey: `contact:${contact.submissionId}`")
    expect(source).toContain('replyTo: contact.email')
  })

  it('allows only a failed contact notification to use the controlled admin retry', async () => {
    const source = await readFile('server/api/admin/emails/retry.post.ts', 'utf8')

    expect(source).toContain("delivery.template_key === 'contact_notification'")
    expect(source).toContain("contact.notification_status !== 'failed'")
    expect(source).toContain('replyTo: normalized.email')
    expect(source).toContain("code === 'timeout_ambiguous' ? 'uncertain' : 'failed'")
  })
})
