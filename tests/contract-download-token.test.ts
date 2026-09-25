import { describe, expect, it } from 'vitest'
import { createContractDownloadToken, verifyContractDownloadToken } from '../server/utils/contractDownloadToken'

describe('contract download token', () => {
  const secret = 'test-secret'
  const claims = { contractId: 12, organizationId: 'org-1', expiresAt: 10_000 }

  it('round-trips valid claims', () => {
    expect(verifyContractDownloadToken(createContractDownloadToken(claims, secret), secret, 9_000)).toEqual(claims)
  })

  it('rejects expired, changed and wrongly signed tokens', () => {
    const token = createContractDownloadToken(claims, secret)
    expect(verifyContractDownloadToken(token, secret, 10_001)).toBeNull()
    expect(verifyContractDownloadToken(`${token}x`, secret, 9_000)).toBeNull()
    expect(verifyContractDownloadToken(token, 'other-secret', 9_000)).toBeNull()
  })
})
