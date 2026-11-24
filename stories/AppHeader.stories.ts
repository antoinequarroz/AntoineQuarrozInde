import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppHeader from '../app/components/layout/AppHeader.vue'
export default { title: 'Navigation/En-tête', component: AppHeader, parameters: { layout: 'fullscreen', docs: { description: { component: 'Navigation réelle du site. Ouvrir le menu sur une largeur mobile ; liens neutralisés.' } } }, decorators: [() => ({ template: '<div style="min-height:420px"><story /></div>' })] } satisfies Meta<typeof AppHeader>
export const Standard: StoryObj<typeof AppHeader> = {}
export const English: StoryObj<typeof AppHeader> = { globals: { locale: 'en' } }
