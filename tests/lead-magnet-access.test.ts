import { describe, expect, it } from 'vitest'
import { createLeadMagnetToken, verifyLeadMagnetToken } from '../server/utils/leadMagnetAccess'

describe('lead magnet download access', () => {
  const secret = 'test-secret-with-enough-entropy'
  const now = new Date('2026-09-27T10:00:00.000Z').getTime()

  it('accepts a signed link for the requested resource during 24 hours', () => {
    const token = createLeadMagnetToken('checklist-ia-pme', secret, now)
    expect(verifyLeadMagnetToken(token, 'checklist-ia-pme', secret, now + 23 * 60 * 60 * 1000)).toBe(true)
  })

  it('rejects another resource, a modified token and an expired link', () => {
    const token = createLeadMagnetToken('checklist-ia-pme', secret, now)
    expect(verifyLeadMagnetToken(token, 'other-resource', secret, now)).toBe(false)
    expect(verifyLeadMagnetToken(`${token}x`, 'checklist-ia-pme', secret, now)).toBe(false)
    expect(verifyLeadMagnetToken(token, 'checklist-ia-pme', secret, now + 24 * 60 * 60 * 1000 + 1)).toBe(false)
  })
})
