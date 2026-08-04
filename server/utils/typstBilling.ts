import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type BillingParty = {
  name: string
  street: string
  building: string
  postalCode: string
  city: string
  country: string
  email?: string
  phone?: string
  uid?: string
}

export type TypstBillingData = {
  documentTitle: 'Devis' | 'Facture'
  number: string
  subject: string
  currency: 'CHF' | 'EUR'
  issuedAt: string
  dueAt: string
  statusLabel: string
  notes: string
  terms: string
  subtotalCents: number
  taxCents: number
  totalCents: number
  issuer: BillingParty
  client: BillingParty
  items: Array<{
    label: string
    description: string
    quantity: number
    unitPriceCents: number
    taxRate: number
    totalCents: number
  }>
  includeQr: boolean
  qr: {
    account: string
    referenceType: 'NON' | 'SCOR' | 'QRR'
    reference: string | null
    additionalInfo: string
  }
}

function mod97(value: string) {
  let remainder = 0
  for (const character of value) {
    const chunk = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character
    for (const digit of chunk) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder
}

export function normalizeIban(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
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

export function validateQrReference(
  iban: string,
  referenceType: 'NON' | 'SCOR' | 'QRR',
  reference?: string | null,
) {
  const normalizedReference = String(reference || '').replace(/\s+/g, '').toUpperCase()
  if (referenceType === 'NON') return { type: 'NON' as const, reference: null }
  if (referenceType === 'QRR') {
    if (!isQrIban(iban) || !/^\d{27}$/.test(normalizedReference)) return null
    return mod97(normalizedReference) === 0
      ? { type: 'QRR' as const, reference: normalizedReference }
      : null
  }
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(normalizedReference)) return null
  return mod97(`${normalizedReference.slice(4)}${normalizedReference.slice(0, 4)}`) === 1
    ? { type: 'SCOR' as const, reference: normalizedReference }
    : null
}

export function canGenerateTypstDocument(data: TypstBillingData) {
  const completeParty = (party: BillingParty) => Boolean(
    party.name && party.street && party.postalCode && party.city && /^[A-Z]{2}$/.test(party.country),
  )
  if (!completeParty(data.issuer) || !completeParty(data.client)) return false
  if (!['CHF', 'EUR'].includes(data.currency) || !data.items.length) return false
  if (!data.includeQr) return true
  if (!isValidSwissIban(data.qr.account)) return false
  return validateQrReference(data.qr.account, data.qr.referenceType, data.qr.reference) !== null
}

export async function buildTypstBillingPdf(data: TypstBillingData) {
  if (!canGenerateTypstDocument(data)) {
    throw new Error('Billing data is incomplete or invalid for Typst generation')
  }

  const runtimeDirectory = await mkdtemp(resolve(tmpdir(), 'aq-typst-'))
  const templateSource = resolve(process.cwd(), 'typst', 'templates', 'billing-document.typ')
  const templateTarget = resolve(runtimeDirectory, 'billing-document.typ')
  const dataTarget = resolve(runtimeDirectory, 'billing-document.json')
  const outputTarget = resolve(runtimeDirectory, 'billing-document.pdf')
  const wingetTypst = process.env.LOCALAPPDATA
    ? resolve(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'typst.exe')
    : ''
  const typstExecutable = process.env.TYPST_BIN || (wingetTypst && existsSync(wingetTypst) ? wingetTypst : 'typst')

  try {
    await copyFile(templateSource, templateTarget)
    await writeFile(dataTarget, JSON.stringify(data), 'utf8')
    await execFileAsync(typstExecutable, ['compile', '--root', runtimeDirectory, templateTarget, outputTarget], {
      cwd: runtimeDirectory,
      timeout: 30_000,
      windowsHide: true,
    })
    return await readFile(outputTarget)
  }
  finally {
    await rm(runtimeDirectory, { recursive: true, force: true })
  }
}
