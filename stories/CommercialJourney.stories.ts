import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CommercialJourney from '../app/components/admin/CommercialJourney.vue'
export default { title: 'Administration/Parcours commercial', component: CommercialJourney, args: { current: 'crm' }, argTypes: { current: { control: 'select', options: ['crm', 'quote', 'invoice', 'payment'] } } } satisfies Meta<typeof CommercialJourney>
export const Prospect: StoryObj<typeof CommercialJourney> = {}
export const Devis: StoryObj<typeof CommercialJourney> = { args: { current: 'quote', clientId: 9001, quoteId: 9001 } }
export const Facture: StoryObj<typeof CommercialJourney> = { args: { current: 'invoice', clientId: 9001, quoteId: 9001, invoiceId: 9001 } }
export const Paiement: StoryObj<typeof CommercialJourney> = { args: { current: 'payment', clientId: 9001, quoteId: 9001, invoiceId: 9001 } }
