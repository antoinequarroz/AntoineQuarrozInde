import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ProjectPortfolioGrid from '../app/components/sections/ProjectPortfolioGrid.vue'
import ProjectPortfolioBadges from '../app/components/sections/ProjectPortfolioBadges.vue'
import { demoProjects } from './catalog-fixtures'
export default { title: 'Vitrine/Portfolio en grille', component: ProjectPortfolioGrid, args: { projects: demoProjects }, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof ProjectPortfolioGrid>
export const Grille: StoryObj<typeof ProjectPortfolioGrid> = {}
export const GrilleVide: StoryObj<typeof ProjectPortfolioGrid> = { args: { projects: [] } }
export const Badges: StoryObj<typeof ProjectPortfolioGrid> = { render: () => ({ components: { ProjectPortfolioBadges }, setup: () => ({ projects: demoProjects }), template: '<div class="flex flex-col gap-4 p-8"><ProjectPortfolioBadges v-for="project in projects" :key="project.id" :project="project" /></div>' }) }
