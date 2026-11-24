import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn, expect, userEvent, within } from 'storybook/test'
import InvoiceList from '../app/components/portal/InvoiceList.vue'
import { invoice, money, remainingCents, canPay } from './fixtures'
const meta = { title: 'Portail client/Factures', component: InvoiceList, args: { invoices: [invoice], payingId: null, money, remainingCents, canPay, statusLabel: { sent: 'À régler', paid: 'Réglée' }, onPay: fn(), onDownload: fn() }, parameters: { docs: { description: { component: 'Factures fictives. Les boutons émettent uniquement des événements ; aucun paiement ou téléchargement réel.' } } } } satisfies Meta<typeof InvoiceList>
export default meta
type Story = StoryObj<typeof meta>
export const ARegler: Story = { play: async ({ canvasElement, args }) => { const canvas = within(canvasElement); await userEvent.click(canvas.getByRole('button', { name: 'Payer avec TWINT' })); await expect(args.onPay).toHaveBeenCalledWith(invoice) } }
export const Vide: Story = { args: { invoices: [] } }
export const Reglee: Story = { args: { invoices: [{ ...invoice, status: 'paid', paid_cents: 125000 }] } }
export const PaiementEnCours: Story = { args: { payingId: invoice.id } }
export const PaiementPartiel: Story = { args: { invoices: [{ ...invoice, paid_cents: 25000 }] } }
export const LimiteTwint: Story = { args: { invoices: [{ ...invoice, total_cents: 650000 }] } }
export const Avoir: Story = { args: { invoices: [{ ...invoice, number: 'DEMO-A-001', document_type: 'credit_note', total_cents: -20000 }] } }
