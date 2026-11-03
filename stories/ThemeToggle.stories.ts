import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import ThemeToggle from '../app/components/ui/ThemeToggle.vue'
export default { title: 'Interface/Sélecteur de thème', component: ThemeToggle } satisfies Meta<typeof ThemeToggle>
export const Interactif: StoryObj<typeof ThemeToggle> = { play: async ({ canvasElement }) => { const button = await within(canvasElement).findByRole('button'); const before = button.getAttribute('aria-label'); await userEvent.click(button); await expect(button.getAttribute('aria-label')).not.toBe(before); await userEvent.click(button) } }
