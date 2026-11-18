import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PresentationCinema from '../app/components/sections/PresentationCinema.vue'

export default {
  title: 'Vitrine/Présentation cinéma',
  component: PresentationCinema,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Section vidéo de l’accueil. La vidéo n’est pas copiée dans le catalogue : le lecteur affiche son état d’erreur.' } } },
} satisfies Meta<typeof PresentationCinema>

export const Standard: StoryObj<typeof PresentationCinema> = {}
export const English: StoryObj<typeof PresentationCinema> = { globals: { locale: 'en' } }
