import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppToast from '../app/components/ui/AppToast.vue'
import { useToast } from '../app/composables/useToast'
const meta = { title: 'Interface/Notifications', component: AppToast, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof AppToast>
export default meta
export const Interactif: StoryObj<typeof meta> = { render: () => ({ components: { AppToast }, setup() { const toast = useToast(); return { toast } }, template: '<div class="p-8 min-h-[320px]"><h2 class="aq-demo-heading">Tester une notification</h2><div class="flex flex-wrap gap-3"><button class="admin-btn-primary" @click="toast.success(\'Projet de démonstration enregistré\')">Succès</button><button class="admin-btn-secondary" @click="toast.error(\'Enregistrement impossible. Réessaie.\')">Erreur</button><button class="admin-btn-secondary" @click="toast.info(\'Aucun changement à enregistrer\')">Information</button></div><AppToast /></div>' }) }
