import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AdminIcon from '../app/components/admin/AdminIcon.vue'
const icons = ['grid', 'folder', 'file-text', 'star']
const meta = { title: 'Administration/Icônes', component: AdminIcon, args: { icon: 'folder', class: 'w-8 h-8' }, argTypes: { icon: { control: 'select', options: icons } } } satisfies Meta<typeof AdminIcon>
export default meta
export const Standard: StoryObj<typeof meta> = { render: args => ({ components: { AdminIcon }, setup: () => ({ args }), template: '<div class="flex items-center gap-3"><AdminIcon v-bind="args" aria-hidden="true" /><span>{{ args.icon }}</span></div>' }) }
export const Selection: StoryObj<typeof meta> = { render: () => ({ components: { AdminIcon }, setup: () => ({ icons }), template: '<div class="flex flex-wrap gap-8"><div v-for="icon in icons" :key="icon" class="flex items-center gap-2"><AdminIcon :icon="icon" aria-hidden="true"/><span>{{ icon }}</span></div></div>' }) }
