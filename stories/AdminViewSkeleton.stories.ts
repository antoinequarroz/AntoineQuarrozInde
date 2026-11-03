import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AdminViewSkeleton from '../app/components/admin/AdminViewSkeleton.vue'
const meta = { title: 'Administration/Chargement', component: AdminViewSkeleton, args: { label: 'Chargement des projets', variant: 'table' } } satisfies Meta<typeof AdminViewSkeleton>
export default meta
type Story = StoryObj<typeof meta>
export const Tableau: Story = {}
export const Pipeline: Story = { args: { variant: 'pipeline' } }
export const Detail: Story = { args: { variant: 'detail' } }
