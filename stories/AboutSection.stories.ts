import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AboutSection from '../app/components/sections/AboutSection.vue'
export default { title: 'Vitrine/À propos', component: AboutSection, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof AboutSection>
export const Standard: StoryObj<typeof AboutSection> = {}
export const English: StoryObj<typeof AboutSection> = { globals: { locale: 'en' } }
