import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ReviewsSection from '../app/components/sections/ReviewsSection.vue'
export default { title: 'Vitrine/Témoignages', component: ReviewsSection, parameters: { layout: 'fullscreen', docs: { description: { component: 'Avis explicitement fictif ; aucune requête vers Google Maps.' } } } } satisfies Meta<typeof ReviewsSection>
export const AvecAvis: StoryObj<typeof ReviewsSection> = {}
export const Vide: StoryObj<typeof ReviewsSection> = { parameters: { demo: { empty: true } } }
