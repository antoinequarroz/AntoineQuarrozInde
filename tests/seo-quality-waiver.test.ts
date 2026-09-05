import { describe, expect, it } from 'vitest'
import { validateQualityWaiver } from '../scripts/seo/quality-waiver.mjs'

const now = new Date('2026-09-05T00:00:00Z')
const valid = {
  control: 'seo-lab',
  failedSha: 'a'.repeat(40),
  reason: 'Régression acceptée temporairement avec correction planifiée.',
  author: 'Antoine Quarroz',
  createdAt: '2026-09-04T23:00:00Z',
  expiresAt: '2026-09-12T00:00:00Z',
}

describe('AQ-SEO-014 human quality waiver', () => {
  it('accepts a complete, scoped and short-lived decision', () => {
    expect(validateQualityWaiver(valid, 'seo-lab', now, valid.failedSha)).toEqual({ valid: true, errors: [] })
  })

  it('rejects incomplete, mismatched, expired or long-lived decisions', () => {
    expect(validateQualityWaiver({}, 'seo-lab', now).valid).toBe(false)
    expect(validateQualityWaiver({ ...valid, control: 'crux-field' }, 'seo-lab', now).errors).toContain('control')
    expect(validateQualityWaiver(valid, 'seo-lab', now, 'b'.repeat(40)).errors).toContain('failedSha')
    expect(validateQualityWaiver({ ...valid, expiresAt: '2026-09-04T00:00:00Z' }, 'seo-lab', now).errors).toContain('expiresAt')
    expect(validateQualityWaiver({ ...valid, expiresAt: '2026-10-05T00:00:00Z' }, 'seo-lab', now).errors).toContain('expiresAt')
  })
})
