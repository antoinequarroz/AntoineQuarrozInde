import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseCamt053 } from '../shared/utils/camt053'
import { nextRecurringDate } from '../server/utils/recurringInvoices'
import { buildAccountingSummary } from '../server/utils/accountingSummary'

describe('AQ-052 to AQ-057 guardrails', () => {
  it('rejects dangerous or unrelated XML', () => {
    expect(() => parseCamt053('<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><BkToCstmrStmt/>')).toThrow(/externes/i)
    expect(() => parseCamt053('<Document/>')).toThrow(/CAMT\.053/i)
  })

  it('keeps recurring dates stable at month ends', () => {
    expect(nextRecurringDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(nextRecurringDate('2024-02-29', 'yearly')).toBe('2025-02-28')
    expect(nextRecurringDate('2026-11-30', 'quarterly')).toBe('2027-02-28')
  })

  it('nets credit notes and excludes voided payments', () => {
    const summary = buildAccountingSummary([
      { id: 0, document_type: 'invoice', status: 'draft', subtotal_cents: 90_000, tax_cents: 7_290, total_cents: 97_290 },
      { id: 1, document_type: 'invoice', status: 'sent', subtotal_cents: 10_000, tax_cents: 810, total_cents: 10_810 },
      { id: 2, document_type: 'credit_note', status: 'sent', subtotal_cents: 2_000, tax_cents: 162, total_cents: 2_162 },
    ], [
      { invoice_id: 1, quantity: 1, unit_price_cents: 10_000, tax_rate: 8.1, total_cents: 10_810 },
      { invoice_id: 2, quantity: 1, unit_price_cents: 2_000, tax_rate: 8.1, total_cents: 2_162 },
    ], [{ amount_cents: 10_810, currency: 'CHF' }, { amount_cents: 500, currency: 'CHF', voided_at: '2026-08-10' }])
    expect(summary.totals).toMatchObject({ subtotalCents: 8_000, taxCents: 648, totalCents: 8_648, creditNotesCents: 2_162 })
    expect(summary.documentCount).toBe(2)
    expect(summary.collectedByCurrency.CHF).toBe(10_810)
  })

  it('keeps every new business route private and organization scoped', async () => {
    const paths = ['../server/api/admin/recurring-invoices.get.ts', '../server/api/admin/recurring-invoices.post.ts', '../server/api/admin/recurring-invoices.put.ts', '../server/api/admin/recurring-invoices/run.post.ts', '../server/api/admin/accounting-summary.get.ts', '../server/api/admin/invoice-reminders.put.ts']
    for (const path of paths) {
      const source = await readFile(new URL(path, import.meta.url), 'utf8')
      expect(source).toContain('requireAdmin(event)')
      expect(source).toContain('org.id')
    }
    const cron = await readFile(new URL('../server/api/cron/recurring-invoices.post.ts', import.meta.url), 'utf8')
    expect(cron).toContain('timingSafeEqual')
    expect(cron).toContain('RECURRING_AUTOMATION_SECRET')
  })

  it('keeps new tables server-only with RLS and the restore drill read-only', async () => {
    const migration = await readFile(new URL('../supabase/migrations/20260810221033_add_recurring_invoices.sql', import.meta.url), 'utf8')
    expect(migration.match(/enable row level security/g)).toHaveLength(2)
    expect(migration).toContain('revoke all on public.recurring_invoice_profiles, public.recurring_invoice_runs from anon, authenticated')
    expect(migration).toContain('foreign key (organization_id, profile_id)')
    expect(migration).toContain('invoices_recurring_profile_org_fk')
    const drill = await readFile(new URL('../scripts/ops/scheduled-restore-drill.sh', import.meta.url), 'utf8')
    expect(drill).not.toMatch(/psql|supabase db reset|curl.*-X (POST|DELETE)/i)
    const backup = await readFile(new URL('../scripts/ops/backup-supabase.sh', import.meta.url), 'utf8')
    expect(backup).toContain('recurring_invoice_profiles recurring_invoice_runs')
    expect(backup).toContain('auth-users.json')
    expect(backup).not.toContain('password_hash')
  })

  it('preserves accessible labels and the non-fiscal warning', async () => {
    const accounting = await readFile(new URL('../app/pages/admin/accounting/index.vue', import.meta.url), 'utf8')
    expect(accounting).toContain('aria-label="Synthèse comptable"')
    expect(accounting).toContain('ne remplace pas une déclaration fiscale officielle')
    const reconciliation = await readFile(new URL('../app/components/admin/BankReconciliationPanel.vue', import.meta.url), 'utf8')
    expect(reconciliation).toContain('aria-label="Importer un relevé bancaire"')
  })
})
