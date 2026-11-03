import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AboutVideo from '../app/components/sections/AboutVideo.vue'
import VideoScrollHero from '../app/components/ui/VideoScrollHero.vue'
export default { title: 'Vitrine/Présentation vidéo', component: AboutVideo, parameters: { layout: 'fullscreen', docs: { description: { component: 'La vidéo de présentation n’est pas copiée dans le catalogue : le lecteur affiche son état d’erreur, ce qui permet de le vérifier.' } } } } satisfies Meta<typeof AboutVideo>
export const Lecteur: StoryObj<typeof AboutVideo> = { render: () => ({ components: { AboutVideo }, template: '<div class="mx-auto max-w-3xl p-8"><AboutVideo /></div>' }) }
export const HeroDefilement: StoryObj<typeof AboutVideo> = { render: () => ({ components: { VideoScrollHero }, template: '<VideoScrollHero><div class="flex h-full items-center justify-center bg-violet-950 text-2xl font-bold text-white">Média de démonstration</div></VideoScrollHero>' }) }
