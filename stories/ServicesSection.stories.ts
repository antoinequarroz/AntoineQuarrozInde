import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ServicesSection from '../app/components/sections/ServicesSection.vue'
export default { title: 'Vitrine/Services', component: ServicesSection, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof ServicesSection>
export const Standard: StoryObj<typeof ServicesSection> = {}
export const Deutsch: StoryObj<typeof ServicesSection> = { globals: { locale: 'de' } }
