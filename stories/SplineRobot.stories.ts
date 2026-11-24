import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SplineRobot from '../app/components/ui/SplineRobot.vue'
export default { title: 'Effets visuels/Robot Spline', component: SplineRobot, args: { className: 'h-[500px] w-full' }, parameters: { docs: { description: { component: 'Composant réel : viewer Spline externe public, avec repli en cas de réseau indisponible ou appareil incompatible. Les préférences de mouvement réduit du système sont respectées.' } } } } satisfies Meta<typeof SplineRobot>
export const Adaptatif: StoryObj<typeof SplineRobot> = {}
export const SceneIndisponible: StoryObj<typeof SplineRobot> = { args: { sceneUrl: '/scene-demo-indisponible.splinecode' } }
