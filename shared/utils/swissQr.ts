export type SwissQrReferenceType = 'NON' | 'SCOR' | 'QRR'

const MODULO_10_RECURSIVE_TABLE = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5] as const

export function isSwissQrReferenceType(value: unknown): value is SwissQrReferenceType {
  return value === 'NON' || value === 'SCOR' || value === 'QRR'
}

function mod97(value: string) {
  let remainder = 0
  for (const character of value) {
    const chunk = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character
    for (const digit of chunk) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

function hasValidModulo10RecursiveChecksum(value: string) {
  let carry = 0
  for (const digit of value) {
    carry = MODULO_10_RECURSIVE_TABLE[(carry + Number(digit)) % 10] ?? -1
  }
  return carry === 0
}

export function normalizeIban(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

export function generateScorReference(seed: string | number) {
  const creditorReference = String(seed).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-21) || 'FACTURE'
  const checksum = String(98 - mod97(`${creditorReference}RF00`)).padStart(2, '0')
  return `RF${checksum}${creditorReference}`
}

export function isValidSwissIban(value: string) {
  const iban = normalizeIban(value)
  if (!/^(CH|LI)\d{7}[A-Z0-9]{12}$/.test(iban)) return false
  return mod97(`${iban.slice(4)}${iban.slice(0, 4)}`) === 1
}

export function isQrIban(value: string) {
  const iban = normalizeIban(value)
  if (!isValidSwissIban(iban)) return false
  const iid = Number(iban.slice(4, 9))
  return iid >= 30000 && iid <= 31999
}

export function getQrReferenceError(
  iban: string,
  referenceType: SwissQrReferenceType,
  reference?: string | null,
) {
  if (referenceType === 'NON') return null

  const normalizedReference = String(reference || '').replace(/\s+/g, '').toUpperCase()
  if (!isValidSwissIban(iban)) {
    return 'Ajoute d’abord un IBAN suisse valide dans le profil de facturation.'
  }

  if (referenceType === 'QRR') {
    if (!isQrIban(iban)) return 'Une référence QRR nécessite un QR-IBAN (IID 30000 à 31999).'
    if (!/^\d{27}$/.test(normalizedReference)) return 'La référence QRR doit contenir exactement 27 chiffres.'
    if (!hasValidModulo10RecursiveChecksum(normalizedReference)) return 'La clé de contrôle de la référence QRR est invalide.'
    return null
  }

  if (isQrIban(iban)) return 'Une référence SCOR nécessite un IBAN standard, pas un QR-IBAN.'
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(normalizedReference)) {
    return 'La référence SCOR doit commencer par RF et contenir au maximum 25 caractères.'
  }
  if (mod97(`${normalizedReference.slice(4)}${normalizedReference.slice(0, 4)}`) !== 1) {
    return 'La clé de contrôle de la référence SCOR est invalide.'
  }
  return null
}

export function validateQrReference(
  iban: string,
  referenceType: SwissQrReferenceType,
  reference?: string | null,
) {
  if (getQrReferenceError(iban, referenceType, reference)) return null
  if (referenceType === 'NON') return { type: 'NON' as const, reference: null }
  return {
    type: referenceType,
    reference: String(reference || '').replace(/\s+/g, '').toUpperCase(),
  }
}
