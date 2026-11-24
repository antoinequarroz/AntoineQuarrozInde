import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn, expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'
import QuoteList from '../app/components/portal/QuoteList.vue'
import { quote, money, dateLabel } from './fixtures'
const meta = { title: 'Portail client/Devis', component: QuoteList, args: { quotes: [quote], confirmedIds: [], acceptingId: null, money, dateLabel, statusLabel: { sent: 'À valider', accepted: 'Accepté' }, isExpired: (q: typeof quote) => q.status === 'expired', canAccept: (q: typeof quote) => q.status === 'sent', onAccept: fn(), onDownload: fn(), onToggleConfirm: fn() }, parameters: { docs: { description: { component: 'Exemple fictif : l’acceptation est un événement local simulé et ne crée aucun engagement.' } } } } satisfies Meta<typeof QuoteList>
export default meta
type Story = StoryObj<typeof meta>
export const AValider: Story = { render: args => ({ components: { QuoteList }, setup() { const ids = ref<number[]>([]); return { args, ids, toggle: (id: number, checked: boolean) => { ids.value = checked ? [id] : []; args.onToggleConfirm(id, checked) } } }, template: '<QuoteList v-bind="args" :confirmed-ids="ids" @toggle-confirm="toggle" />' }), play: async ({ canvasElement, args }) => { const canvas = within(canvasElement); const button = canvas.getByRole('button', { name: 'Accepter le devis' }); await expect(button).toBeDisabled(); await userEvent.click(canvas.getByRole('checkbox')); await expect(button).toBeEnabled(); await userEvent.click(button); await expect(args.onAccept).toHaveBeenCalledWith(quote) } }
export const Vide: Story = { args: { quotes: [] } }
export const Accepte: Story = { args: { quotes: [{ ...quote, status: 'accepted', accepted_at: '2026-09-21' }] } }
export const Expire: Story = { args: { quotes: [{ ...quote, status: 'expired', valid_until: '2026-08-31' }] } }
export const ValidationEnCours: Story = { args: { acceptingId: quote.id, confirmedIds: [quote.id] } }
