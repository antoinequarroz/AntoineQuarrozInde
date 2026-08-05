import { describe, expect, it } from 'vitest'
import { isQrIban, isValidSwissIban, normalizeIban, validateQrReference } from '../server/utils/typstBilling'

describe('QR-facture suisse', () => {
  it('normalise et valide un IBAN suisse', () => {
    expect(normalizeIban('CH93 0076 2011 6238 5295 7')).toBe('CH9300762011623852957')
    expect(isValidSwissIban('CH93 0076 2011 6238 5295 7')).toBe(true)
    expect(isValidSwissIban('CH00 0000 0000 0000 0000 0')).toBe(false)
  })

  it('refuse une référence QRR sur un IBAN bancaire ordinaire', () => {
    expect(isQrIban('CH93 0076 2011 6238 5295 7')).toBe(false)
    expect(validateQrReference('CH93 0076 2011 6238 5295 7', 'QRR', '210000000003139471430009017')).toBeNull()
  })

  it('autorise un paiement sans référence', () => {
    expect(validateQrReference('CH93 0076 2011 6238 5295 7', 'NON', null)).toEqual({ type: 'NON', reference: null })
  })
})
