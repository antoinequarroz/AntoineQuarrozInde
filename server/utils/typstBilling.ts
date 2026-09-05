import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { isValidSwissIban, validateQrReference } from '../../shared/utils/swissQr'

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
  documentTitle: 'Devis' | 'Facture' | 'Avoir'
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
    includeDebtor: boolean
  }
}

export function canGenerateTypstDocument(data: TypstBillingData) {
  const completeParty = (party: BillingParty) => Boolean(
    party.name && party.street && party.postalCode && party.city && /^[A-Z]{2}$/.test(party.country),
  )
  if (!data.issuer.name) return false
  if (!['CHF', 'EUR'].includes(data.currency) || !data.items.length) return false
  if (!data.includeQr) return true
  if (!completeParty(data.issuer)) return false
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
  const macTypst = process.platform === 'darwin'
    ? ['/opt/homebrew/bin/typst', '/usr/local/bin/typst'].find(candidate => existsSync(candidate)) || ''
    : ''
  const typstExecutable = process.env.TYPST_BIN
    || (wingetTypst && existsSync(wingetTypst) ? wingetTypst : '')
    || macTypst
    || 'typst'

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
