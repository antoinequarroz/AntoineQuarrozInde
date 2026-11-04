import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import AppImageUpload from '../app/components/ui/AppImageUpload.vue'
export default { title: 'Interface/Import d’image', component: AppImageUpload, args: { modelValue: null }, render: args => ({ components: { AppImageUpload }, setup() { const image = ref(args.modelValue); return { image } }, template: '<div class="max-w-md"><AppImageUpload v-model="image" /><p class="mt-3 text-sm">Le fichier reste dans ce navigateur ; aucun stockage distant.</p></div>' }), parameters: { docs: { description: { component: 'Le redimensionnement réel fonctionne ; l’API simulée retourne l’image locale. Ne pas utiliser de document confidentiel pour une démonstration partagée.' } } } } satisfies Meta<typeof AppImageUpload>
export const Vide: StoryObj<typeof AppImageUpload> = {}
export const AvecImage: StoryObj<typeof AppImageUpload> = { args: { modelValue: '/demo-project.svg' } }
