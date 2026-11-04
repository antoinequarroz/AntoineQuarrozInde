import type { Meta, StoryObj } from '@storybook/vue3-vite'
import HeroSplineSection from '../app/components/sections/HeroSplineSection.vue'
export default { title: 'Vitrine/Accueil avec robot', component: HeroSplineSection, parameters: { layout: 'fullscreen', docs: { description: { component: 'Scène Spline publique chargée selon les capacités de l’appareil. Le repli illustré est utilisé sur mobile, réseau réduit ou erreur.' } } } } satisfies Meta<typeof HeroSplineSection>
export const Standard: StoryObj<typeof HeroSplineSection> = {}
