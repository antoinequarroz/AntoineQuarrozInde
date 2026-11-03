import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import CardStack from '../app/components/ui/CardStack.vue'
import { demoCards } from './catalog-fixtures'
export default { title: 'Interface/Pile de cartes', component: CardStack, args: { items: demoCards, autoAdvance: false, onCardClick: fn() }, decorators: [() => ({ template: '<div class="overflow-hidden rounded-xl bg-gray-950 p-4"><story /></div>' })] } satisfies Meta<typeof CardStack>
type Story = StoryObj<typeof CardStack>
export const Navigation: Story = { play: async ({ canvasElement, args }) => { const canvas = within(canvasElement); await userEvent.click(canvas.getByRole('button', { name: 'Aperçu rapide' })); await expect(args.onCardClick).toHaveBeenCalledWith(demoCards[0]) } }
export const UneCarte: Story = { args: { items: demoCards.slice(0, 1) } }
export const Vide: Story = { args: { items: [] } }
export const Automatique: Story = { args: { autoAdvance: true, intervalMs: 4000 } }
