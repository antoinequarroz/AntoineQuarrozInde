import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SocialMediaGallery from '../app/components/admin/SocialMediaGallery.vue'
import SocialImageGallery from '../app/components/admin/SocialImageGallery.vue'
import SocialNetworkInsights from '../app/components/admin/SocialNetworkInsights.vue'

const media = [{ type: 'image' as const, url: '/demo-project.svg', alt: 'Visuel de démonstration' }]

export default {
  title: 'Administration/Médias sociaux',
  component: SocialMediaGallery,
  args: { media, editable: true, platform: 'instagram' },
  parameters: { docs: { description: { component: 'Galeries de médias des publications. Les envois de fichiers restent locaux au catalogue.' } } },
} satisfies Meta<typeof SocialMediaGallery>

type Story = StoryObj<typeof SocialMediaGallery>
export const GalerieModifiable: Story = {}
export const GalerieLectureSeule: Story = { args: { editable: false } }
export const GalerieVide: Story = { args: { media: [] } }
export const GalerieImages: Story = {
  render: () => ({ components: { SocialImageGallery }, setup: () => ({ images: media }), template: '<SocialImageGallery :images="images" :editable="true" platform="linkedin" />' }),
}
export const StatistiquesIndisponibles: Story = {
  render: () => ({ components: { SocialNetworkInsights }, template: '<SocialNetworkInsights />' }),
  parameters: { demo: { error: true }, docs: { description: { story: 'Les statistiques réelles ne sont jamais lues : le panneau montre son état « Indisponible ».' } } },
}
export const StatistiquesEnChargement: Story = {
  render: () => ({ components: { SocialNetworkInsights }, template: '<SocialNetworkInsights />' }),
  parameters: { demo: { loading: true } },
}
