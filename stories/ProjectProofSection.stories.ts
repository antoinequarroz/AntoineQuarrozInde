import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ProjectProofSection from '../app/components/sections/ProjectProofSection.vue'
export default { title: 'Vitrine/Preuve projet animée', component: ProjectProofSection, parameters: { layout: 'fullscreen', docs: { description: { component: 'Section pilotée par le défilement : faire défiler le canevas pour voir la séquence.' } } } } satisfies Meta<typeof ProjectProofSection>
export const Standard: StoryObj<typeof ProjectProofSection> = {}
export const English: StoryObj<typeof ProjectProofSection> = { globals: { locale: 'en' } }
