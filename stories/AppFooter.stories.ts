import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppFooter from '../app/components/layout/AppFooter.vue'
export default { title: 'Navigation/Pied de page', component: AppFooter, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof AppFooter>
export const Standard: StoryObj<typeof AppFooter> = {}
export const Deutsch: StoryObj<typeof AppFooter> = { globals: { locale: 'de' } }
