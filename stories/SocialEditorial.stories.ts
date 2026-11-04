import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SocialPostTile from '../app/components/admin/SocialPostTile.vue'
import SocialPostPreview from '../app/components/admin/SocialPostPreview.vue'
import SocialPlatformBadge from '../app/components/admin/SocialPlatformBadge.vue'
import SocialPlatformIcon from '../app/components/admin/SocialPlatformIcon.vue'
import SocialEditorialCalendar from '../app/components/admin/SocialEditorialCalendar.vue'
import SocialPlanningPanel from '../app/components/admin/SocialPlanningPanel.vue'
import SocialDocumentPreview from '../app/components/admin/SocialDocumentPreview.vue'
import { demoSocialPosts } from './catalog-fixtures'

export default {
  title: 'Administration/Réseaux sociaux',
  component: SocialPostTile,
  args: { post: demoSocialPosts()[0] },
  parameters: { docs: { description: { component: 'Publications fictives du calendrier éditorial. Aucune publication ni aucun appel aux réseaux.' } } },
} satisfies Meta<typeof SocialPostTile>

type Story = StoryObj<typeof SocialPostTile>
const posts = demoSocialPosts()

export const Tuile: Story = {}
export const TuileCompacte: Story = { args: { post: posts[1], compact: true, planning: true, movable: true } }
export const Badges: Story = {
  render: () => ({
    components: { SocialPlatformBadge, SocialPlatformIcon },
    template: `<div class="flex flex-wrap items-center gap-3">
      <SocialPlatformBadge platform="linkedin" /><SocialPlatformBadge platform="x" /><SocialPlatformBadge platform="instagram" />
      <SocialPlatformBadge platform="linkedin" compact /><SocialPlatformIcon platform="instagram" /><SocialPlatformIcon platform="x" compact />
    </div>`,
  }),
}
export const Apercu: Story = {
  render: () => ({ components: { SocialPostPreview }, setup: () => ({ post: posts[2] }), template: '<div class="max-w-md"><SocialPostPreview :post="post" /></div>' }),
}
export const ApercuDocument: Story = {
  render: () => ({ components: { SocialDocumentPreview }, template: '<div class="max-w-md"><SocialDocumentPreview url="/demo-carrousel.pdf" title="Carrousel de démonstration" /></div>' }),
  parameters: { docs: { description: { story: 'Aucun PDF n’est chargé dans le catalogue : l’aperçu affiche son état de repli.' } } },
}
export const CalendrierSemaine: Story = {
  render: () => ({ components: { SocialEditorialCalendar }, setup: () => ({ posts }), template: '<SocialEditorialCalendar :posts="posts" anchor="2026-11-03" view="week" />' }),
  parameters: { layout: 'fullscreen' },
}
export const CalendrierMois: Story = {
  render: () => ({ components: { SocialEditorialCalendar }, setup: () => ({ posts }), template: '<SocialEditorialCalendar :posts="posts" anchor="2026-11-03" view="month" />' }),
  parameters: { layout: 'fullscreen' },
}
export const Planification: Story = {
  render: () => ({ components: { SocialPlanningPanel }, setup: () => ({ posts }), template: '<div class="max-w-sm"><SocialPlanningPanel :posts="posts" :rejected-count="1" :show-rejected="false" /></div>' }),
}
export const PlanificationVide: Story = {
  render: () => ({ components: { SocialPlanningPanel }, template: '<div class="max-w-sm"><SocialPlanningPanel :posts="[]" :rejected-count="0" :show-rejected="false" /></div>' }),
}
