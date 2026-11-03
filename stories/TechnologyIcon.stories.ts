import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TechnologyIcon from '../app/components/ui/TechnologyIcon.vue'
const names = ['caddy', 'cloudflare', 'dart', 'docker', 'figma', 'flutter', 'git', 'github', 'nextjs', 'nodejs', 'nuxt', 'postgresql', 'react', 'rust', 'supabase'] as const
export default { title: 'Interface/Icônes technologies', component: TechnologyIcon, args: { name: 'nuxt' }, argTypes: { name: { control: 'select', options: names } } } satisfies Meta<typeof TechnologyIcon>
export const Une: StoryObj<typeof TechnologyIcon> = { render: args => ({ components: { TechnologyIcon }, setup: () => ({ args }), template: '<div class="p-8 text-violet-700 dark:text-violet-200"><TechnologyIcon v-bind="args" class="h-8 w-8" /></div>' }) }
export const Toutes: StoryObj<typeof TechnologyIcon> = { render: () => ({ components: { TechnologyIcon }, setup: () => ({ names }), template: '<div class="grid grid-cols-5 gap-6 p-8 text-gray-900 dark:text-white"><div v-for="name in names" :key="name" class="flex flex-col items-center gap-2 text-xs"><TechnologyIcon :name="name" class="h-8 w-8" />{{ name }}</div></div>' }) }
