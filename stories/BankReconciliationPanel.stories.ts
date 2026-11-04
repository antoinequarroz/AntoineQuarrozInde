import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn, expect, userEvent, within, waitFor } from 'storybook/test'
import BankReconciliationPanel from '../app/components/admin/BankReconciliationPanel.vue'
export default { title: 'Administration/Rapprochement bancaire', component: BankReconciliationPanel, args: { onClose: fn(), onReconciled: fn() }, parameters: { docs: { description: { component: 'Analyse CSV/CAMT réelle dans le navigateur. Facture DEMO-2026-001, CHF 1200. Les confirmations sont simulées. Utiliser exclusivement un fichier fictif.' } } } } satisfies Meta<typeof BankReconciliationPanel>
export const Import: StoryObj<typeof BankReconciliationPanel> = {}
export const AucuneFacture: StoryObj<typeof BankReconciliationPanel> = { parameters: { demo: { empty: true } } }
export const Chargement: StoryObj<typeof BankReconciliationPanel> = { parameters: { demo: { loading: true } } }
export const Erreur: StoryObj<typeof BankReconciliationPanel> = { parameters: { demo: { error: true } } }

export const ConfirmationSimulee: StoryObj<typeof BankReconciliationPanel> = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const input = await canvas.findByLabelText('Importer un relevé bancaire')
    await userEvent.upload(input, new File(['Date;Montant;Devise;Reference;Description\n2026-09-01;1200.00;CHF;DEMO-2026-001;Atelier Démo'], 'releve-demo.csv', { type: 'text/csv' }))
    const confirm = await canvas.findByRole('button', { name: 'Confirmer', exact: true })
    await expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    await waitFor(() => expect(args.onReconciled).toHaveBeenCalled())
    await expect(await canvas.findByRole('button', { name: 'Confirmé', exact: true })).toBeDisabled()
  },
}
