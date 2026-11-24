import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ProjectHelixCarousel from '../app/components/sections/ProjectHelixCarousel.vue'
import { demoProjects } from './catalog-fixtures'
export default { title: 'Vitrine/Carrousel de projets', component: ProjectHelixCarousel, args: { projects: demoProjects, activeCategory: 'all' }, parameters: { layout: 'fullscreen', docs: { description: { component: 'Animation liée au défilement sur grand écran et navigation mobile. Faire défiler l’aperçu pour examiner l’hélice.' } } } } satisfies Meta<typeof ProjectHelixCarousel>
export const TroisProjets: StoryObj<typeof ProjectHelixCarousel> = {}
export const UnProjet: StoryObj<typeof ProjectHelixCarousel> = { args: { projects: demoProjects.slice(0, 1), activeCategory: 'web' } }
export const Vide: StoryObj<typeof ProjectHelixCarousel> = { args: { projects: [] } }
