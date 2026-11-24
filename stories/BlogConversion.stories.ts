import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DiagnosticCta from '../app/components/blog/DiagnosticCta.vue'
import LeadMagnetSignup from '../app/components/blog/LeadMagnetSignup.vue'
import NewsletterSignup from '../app/components/blog/NewsletterSignup.vue'

export default {
  title: 'Vitrine/Blog : appels à l’action',
  component: DiagnosticCta,
  args: { context: 'diagnostic' },
  parameters: { docs: { description: { component: 'Encarts de fin d’article. Les inscriptions sont simulées et aucun e-mail n’est envoyé.' } } },
} satisfies Meta<typeof DiagnosticCta>

type Story = StoryObj<typeof DiagnosticCta>
export const Diagnostic: Story = {}
export const Site: Story = { args: { context: 'site' } }
export const Budget: Story = { args: { context: 'budget' } }
export const Refonte: Story = { args: { context: 'refonte' } }
export const ChecklistGratuite: Story = { render: () => ({ components: { LeadMagnetSignup }, template: '<LeadMagnetSignup />' }) }
export const ChecklistCompacte: Story = { render: () => ({ components: { LeadMagnetSignup }, template: '<LeadMagnetSignup compact />' }) }
export const NewsletterArticle: Story = { render: () => ({ components: { NewsletterSignup }, template: '<NewsletterSignup />' }) }
export const NewsletterPiedDePage: Story = { render: () => ({ components: { NewsletterSignup }, template: '<NewsletterSignup variant="footer" />' }) }
