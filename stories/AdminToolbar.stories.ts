import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AdminToolbar from '../app/components/admin/AdminToolbar.vue'
const meta = { title: 'Administration/Barre d’outils', component: AdminToolbar } satisfies Meta<typeof AdminToolbar>
export default meta
export const Recherche: StoryObj<typeof meta> = { render: () => ({ components: { AdminToolbar }, template: '<AdminToolbar><label class="flex flex-col gap-1"><span class="text-sm font-medium">Rechercher un projet</span><input class="admin-input" placeholder="Nom du projet" /></label><label class="flex flex-col gap-1"><span class="text-sm font-medium">Statut</span><select class="admin-input"><option>Tous les statuts</option><option>En cours</option><option>Terminé</option></select></label><button class="admin-btn-primary">Nouveau projet</button></AdminToolbar>' }) }
