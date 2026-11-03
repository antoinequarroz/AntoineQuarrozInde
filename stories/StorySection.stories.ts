import type { Meta, StoryObj } from '@storybook/vue3-vite'
import StorySection from '../app/components/sections/StorySection.vue'
export default { title: 'Vitrine/Présentation narrative', component: StorySection, parameters: { layout: 'fullscreen', docs: { description: { component: 'Présentation narrative réelle du site, animée par le défilement. Les textes éditoriaux publics du composant sont conservés.' } } } } satisfies Meta<typeof StorySection>
export const Defilement: StoryObj<typeof StorySection> = {}
export const English: StoryObj<typeof StorySection> = { globals: { locale: 'en' } }
