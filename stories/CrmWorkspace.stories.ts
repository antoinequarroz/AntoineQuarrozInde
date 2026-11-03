import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CrmWorkspace from '../app/components/admin/CrmWorkspace.vue'
export default { title: 'Administration/Espace CRM', component: CrmWorkspace, parameters: { docs: { description: { component: 'Écran réel avec stores fictifs isolés pour chaque exemple. Les changements restent en mémoire ; aucune relance ni donnée client réelle.' } } } } satisfies Meta<typeof CrmWorkspace>
export const AvecContacts: StoryObj<typeof CrmWorkspace> = {}
export const Vide: StoryObj<typeof CrmWorkspace> = { parameters: { demo: { empty: true } } }
export const Chargement: StoryObj<typeof CrmWorkspace> = { parameters: { demo: { loading: true } } }
export const Erreur: StoryObj<typeof CrmWorkspace> = { parameters: { demo: { error: true } } }
