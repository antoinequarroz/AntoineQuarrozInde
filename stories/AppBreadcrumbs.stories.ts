import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppBreadcrumbs from '../app/components/ui/AppBreadcrumbs.vue'
const meta = { title: 'Interface/Fil d’Ariane', component: AppBreadcrumbs, args: { items: [{ name: 'Accueil', path: '/' }, { name: 'Projets', path: '/projets' }, { name: 'Projet de démonstration', path: '/projets/demo' }] } } satisfies Meta<typeof AppBreadcrumbs>
export default meta
type Story = StoryObj<typeof meta>
export const Standard: Story = {}
export const PageUnique: Story = { args: { items: [{ name: 'Accueil', path: '/' }] } }
export const LibelleLong: Story = { args: { items: [{ name: 'Accueil', path: '/' }, { name: 'Accompagnement et création de sites en Suisse romande', path: '/demo' }] } }
