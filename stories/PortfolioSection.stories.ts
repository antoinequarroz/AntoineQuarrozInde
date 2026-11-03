import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PortfolioSection from '../app/components/sections/PortfolioSection.vue'
export default { title: 'Vitrine/Portfolio', component: PortfolioSection, parameters: { layout: 'fullscreen', docs: { description: { component: 'Filtres et carrousel réels avec trois projets fictifs web, mobile et CMS.' } } } } satisfies Meta<typeof PortfolioSection>
export const AvecProjets: StoryObj<typeof PortfolioSection> = {}
export const Vide: StoryObj<typeof PortfolioSection> = { parameters: { demo: { empty: true } } }
