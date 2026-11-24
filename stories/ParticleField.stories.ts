import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ParticleField from '../app/components/three/ParticleField.vue'
export default { title: 'Effets visuels/Particules', component: ParticleField, decorators: [() => ({ template: '<div class="relative h-[500px] overflow-hidden rounded-xl bg-gray-950"><story /><p class="pointer-events-none absolute bottom-4 left-4 text-sm text-white">Champ de particules Three.js — déplacer le pointeur</p></div>' })], parameters: { docs: { description: { component: 'Rendu Three.js réel. Nécessite WebGL ; vérifier aussi les performances sur un appareil réel.' } } } } satisfies Meta<typeof ParticleField>
export const Interactif: StoryObj<typeof ParticleField> = {}
