import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { contractSnapshot, hashContractSnapshot } from '../server/utils/clientContract'
import { buildClientContractPdf } from '../server/utils/clientContractPdf'

const contract = {
  number: 'CTR-2026-0001', version: 1, title: 'Application métier', effective_date: '2026-10-01', starts_at: '2026-10-01', ends_at: null,
  scope: 'Créer une application métier.', deliverables: ['Cadrage', 'Application'], provider_obligations: 'Réaliser.', client_obligations: 'Valider.',
  payment_terms: 'Selon devis.', change_management: 'Accord écrit.', intellectual_property: 'Transfert après paiement.', confidentiality: 'Confidentiel.',
  data_protection: 'Droit applicable.', warranty_support: 'Correction des anomalies.', liability: 'Dommages directs.', termination: 'Notification écrite.',
  governing_law: 'Droit suisse', jurisdiction: 'Valais, Suisse', special_terms: '',
}
const organization = { name: 'Antoine Quarroz', billing_name: 'Antoine Quarroz', billing_city: 'Sion', billing_country: 'CH' }
const client = { name: 'Marie Exemple', company: 'Exemple SA', email: 'marie@example.ch', billing_city: 'Sierre', billing_country: 'CH' }

describe('client contracts', () => {
  it('freezes deterministic client-visible terms with a SHA-256 fingerprint', () => {
    const snapshot = contractSnapshot(contract, organization, client)
    expect(hashContractSnapshot(snapshot)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashContractSnapshot(snapshot)).toBe(hashContractSnapshot(structuredClone(snapshot)))
    expect(snapshot.contract.deliverables).toEqual(['Cadrage', 'Application'])
  })

  it('generates a readable multi-section PDF from the frozen snapshot', async () => {
    const pdf = await buildClientContractPdf(contractSnapshot(contract, organization, client))
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(2_000)
  })

  it('keeps sent terms immutable and portal decisions auditable in the database', () => {
    const sql = readFileSync(new URL('../supabase/migrations/20260925182500_add_client_contracts.sql', import.meta.url), 'utf8')
    expect(sql).toContain("status in ('draft', 'sent', 'signed', 'declined', 'cancelled')")
    expect(sql).toContain('snapshot_hash')
    expect(sql).toContain('acceptance_ip')
    expect(sql).toContain('contracts_signature_complete')
  })
})
