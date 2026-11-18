import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BlogSection from '../app/components/sections/BlogSection.vue'
export default { title: 'Vitrine/Articles', component: BlogSection, parameters: { layout: 'fullscreen', docs: { description: { component: 'Articles fictifs avec aperçu modal réel. Tester la fermeture avec Échap et le retour du focus.' } } } } satisfies Meta<typeof BlogSection>
export const AvecArticles: StoryObj<typeof BlogSection> = {}
export const Vide: StoryObj<typeof BlogSection> = { parameters: { demo: { empty: true } } }
