import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AdminEmptyState from '../app/components/admin/AdminEmptyState.vue'
const meta = { title: 'Administration/État vide', component: AdminEmptyState, args: { title: 'Aucun projet pour le moment', body: 'Crée ton premier projet pour commencer le suivi.' } } satisfies Meta<typeof AdminEmptyState>
export default meta
type Story = StoryObj<typeof meta>
export const PremierUsage: Story = {}
export const RechercheSansResultat: Story = { args: { title: 'Aucun résultat', body: 'Essaie un autre terme ou retire un filtre.' } }
export const AvecAction: Story = { render: args => ({ components: { AdminEmptyState }, setup: () => ({ args }), template: '<AdminEmptyState v-bind="args"><button class="admin-btn-primary mt-4">Créer un projet</button></AdminEmptyState>' }) }
