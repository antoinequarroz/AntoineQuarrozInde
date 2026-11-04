import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import ProjectCaseStudyFields from '../app/components/admin/ProjectCaseStudyFields.vue'
import { caseStudyForm } from './catalog-fixtures'
export default { title: 'Administration/Éditeur d’étude de cas', component: ProjectCaseStudyFields, args: { modelValue: caseStudyForm(), canManagePublication: true }, render: args => ({ components: { ProjectCaseStudyFields }, setup() { const model = ref(JSON.parse(JSON.stringify(args.modelValue))); return { args, model } }, template: '<ProjectCaseStudyFields v-bind="args" v-model="model" />' }), parameters: { docs: { description: { component: 'Formulaire réel, édition locale uniquement. Les règles de publication restent celles de l’application.' } } } } satisfies Meta<typeof ProjectCaseStudyFields>
export const Brouillon: StoryObj<typeof ProjectCaseStudyFields> = {}
export const SansDroitPublication: StoryObj<typeof ProjectCaseStudyFields> = { args: { canManagePublication: false } }
export const PublicationDemandee: StoryObj<typeof ProjectCaseStudyFields> = { args: { modelValue: { ...caseStudyForm(), portfolioVisible: true, caseStudyPublished: true } } }
