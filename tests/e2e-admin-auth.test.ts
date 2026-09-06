import { describe, expect, it } from 'vitest'
import { generateTotpCode } from '../e2e/helpers/admin-auth'

describe('admin E2E TOTP helper', () => {
  it('matches the RFC 6238 SHA-1 vector truncated to six digits', () => {
    expect(generateTotpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59_000)).toBe('287082')
  })

  it('accepts grouped lowercase Base32 secrets', () => {
    expect(generateTotpCode('gezd-gnbv gy3tqojq gezdgnbvgy3tqojq', 59_000)).toBe('287082')
  })

  it('rejects malformed secrets without including them in the error', () => {
    expect(() => generateTotpCode('not_a_secret!')).toThrow('valid Base32 secret')
  })
})
