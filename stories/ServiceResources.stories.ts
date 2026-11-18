import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ServiceResources from '../app/components/blog/ServiceResources.vue'
export default { title: 'Vitrine/Guides par service', component: ServiceResources, args: { servicePath: '/creation-site-internet-valais' }, decorators: [() => ({ template: '<div class="p-8"><Suspense><story /></Suspense></div>' })], parameters: { docs: { description: { component: 'Articles fictifs reliés à la page service. Sans article du thème, la section ne s’affiche pas.' } } } } satisfies Meta<typeof ServiceResources>
export const AvecGuides: StoryObj<typeof ServiceResources> = {}
export const SansGuide: StoryObj<typeof ServiceResources> = { parameters: { demo: { empty: true } } }
