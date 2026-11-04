import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LangSwitcher from '../app/components/ui/LangSwitcher.vue'
export default { title: 'Interface/Sélecteur de langue', component: LangSwitcher, decorators: [() => ({ template: '<div style="min-height:220px;display:flex;justify-content:center"><story /></div>' })], parameters: { docs: { description: { component: 'Menu réel ; les routes sont simulées. Utiliser le globe Storybook pour traduire réellement les composants.' } } } } satisfies Meta<typeof LangSwitcher>
export const Francais: StoryObj<typeof LangSwitcher> = {}
export const English: StoryObj<typeof LangSwitcher> = { globals: { locale: 'en' } }
