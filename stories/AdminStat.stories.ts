import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AdminStat from '../app/components/admin/AdminStat.vue'
const meta = { title: 'Administration/Indicateur', component: AdminStat, args: { label: 'Projets actifs', value: 12, sub: 'Données fictives', icon: 'folder' } } satisfies Meta<typeof AdminStat>
export default meta
type Story = StoryObj<typeof meta>
export const Standard: Story = {}
export const AucunResultat: Story = { args: { value: 0, sub: 'Aucun projet actif' } }
export const Montant: Story = { args: { label: 'Facturation du mois', value: 'CHF 12’450', sub: 'Exemple de montant', icon: 'file-text' } }
export const AvecLien: Story = { args: { href: '/admin/projects', sub: 'Lien neutralisé dans le catalogue' } }
