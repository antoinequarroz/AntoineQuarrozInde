import type { Meta, StoryObj } from '@storybook/vue3-vite'
import HeroSection from '../app/components/sections/HeroSection.vue'
export default { title: 'Vitrine/Accueil', component: HeroSection, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof HeroSection>
export const Standard: StoryObj<typeof HeroSection> = {}
export const VarianteB: StoryObj<typeof HeroSection> = { parameters: { demo: { variant: 'B' } } }
