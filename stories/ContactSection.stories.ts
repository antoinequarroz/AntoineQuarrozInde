import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within, waitFor } from 'storybook/test'
import ContactSection from '../app/components/sections/ContactSection.vue'
export default { title: 'Vitrine/Contact', component: ContactSection, parameters: { layout: 'fullscreen', docs: { description: { component: 'Formulaire réel ; validation native, succès et erreur simulés. Aucun email envoyé, aucun CAPTCHA ou tracking chargé.' } } } } satisfies Meta<typeof ContactSection>
export const EnvoiSimule: StoryObj<typeof ContactSection> = {}
export const EnvoiEnCours: StoryObj<typeof ContactSection> = { globals: { locale: 'fr' }, parameters: { demo: { loading: true } }, play: async ({ canvasElement }) => { await submitDemo(canvasElement); await expect(within(canvasElement).getByRole('button', { name: /Envoi/ })).toBeDisabled() } }
export const ErreurEnvoi: StoryObj<typeof ContactSection> = { globals: { locale: 'fr' }, parameters: { demo: { error: true } }, play: async ({ canvasElement }) => { await submitDemo(canvasElement); await waitFor(() => expect(within(canvasElement).getByText(/Erreur lors de l.envoi/)).toBeVisible()) } }

async function submitDemo(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  // The form only appears after the visitor opens it from the call to action.
  await userEvent.click(canvas.getByRole('button', { name: 'Recevoir un premier avis' }))
  await userEvent.type(await canvas.findByLabelText(/votre nom/i), 'Camille Démo')
  await userEvent.type(canvas.getByLabelText(/votre email/i), 'demo@example.invalid')
  await userEvent.type(canvas.getByLabelText(/quel problème souhaitez-vous résoudre/i), 'Message fictif pour vérifier le formulaire dans Storybook.')
  await userEvent.click(canvas.getByRole('button', { name: 'Envoyer le message' }))
}
export const Succes: StoryObj<typeof ContactSection> = { globals: { locale: 'fr' }, play: async ({ canvasElement }) => { await submitDemo(canvasElement); await waitFor(() => expect(within(canvasElement).getByText(/Message envoyé !/)).toBeVisible()) } }
