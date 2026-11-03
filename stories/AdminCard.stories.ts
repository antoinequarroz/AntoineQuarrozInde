import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AdminCard from '../app/components/admin/AdminCard.vue'
const meta = { title: 'Administration/Carte', component: AdminCard } satisfies Meta<typeof AdminCard>
export default meta
type Story = StoryObj<typeof meta>
export const Contenu: Story = { render: () => ({ components: { AdminCard }, template: '<AdminCard><h2 class="font-display text-xl font-semibold">Projet de démonstration</h2><p class="mt-2 text-gray-500 dark:text-gray-400">Une carte regroupe un objectif et sa prochaine action.</p><button class="admin-btn-primary mt-4">Consulter le projet</button></AdminCard>' }) }
export const TexteLong: Story = { render: () => ({ components: { AdminCard }, template: '<AdminCard><h2 class="font-display text-xl font-semibold">Refonte du site et accompagnement éditorial de l’association de démonstration</h2><p class="mt-2">Ce contenu long permet de vérifier les retours à la ligne et la lisibilité sur mobile. La carte conserve ses marges et s’adapte à son parent.</p></AdminCard>' }) }
