import { describe, expect, it } from 'vitest'
import { generateScorReference, getQrReferenceError, isQrIban, isValidSwissIban, normalizeIban, validateQrReference } from '../shared/utils/swissQr'

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

  it('valide une référence QRR avec le modulo 10 récursif', () => {
    const qrIban = 'CH44 3199 9123 0008 8901 2'
    const reference = '210000000003139471430009017'

    expect(isQrIban(qrIban)).toBe(true)
    expect(validateQrReference(qrIban, 'QRR', reference)).toEqual({ type: 'QRR', reference })
    expect(getQrReferenceError(qrIban, 'QRR', `${reference.slice(0, -1)}8`)).toContain('contrôle')
  })

  it('valide SCOR uniquement avec un IBAN standard', () => {
    const iban = 'CH93 0076 2011 6238 5295 7'
    expect(validateQrReference(iban, 'SCOR', 'RF18 5390 0754 7034')).toEqual({
      type: 'SCOR',
      reference: 'RF18539007547034',
    })
    expect(getQrReferenceError('', 'SCOR', 'RF18539007547034')).toContain('IBAN suisse valide')
  })

  it('génère une référence SCOR valide depuis le numéro de facture', () => {
    const iban = 'CH93 0076 2011 6238 5295 7'
    const reference = generateScorReference('FAC-2026-0042')

    expect(reference).toMatch(/^RF\d{2}FAC20260042$/)
    expect(validateQrReference(iban, 'SCOR', reference)).toEqual({ type: 'SCOR', reference })
  })

  it('autorise un paiement sans référence', () => {
    expect(validateQrReference('CH93 0076 2011 6238 5295 7', 'NON', null)).toEqual({ type: 'NON', reference: null })
  })
})
