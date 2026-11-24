import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BookingCalendar from '../app/components/ui/BookingCalendar.vue'
export default { title: 'Interface/Prise de rendez-vous', component: BookingCalendar, parameters: { docs: { description: { component: 'Affichage réel, réservation et liens externes neutralisés dans le catalogue.' } } } } satisfies Meta<typeof BookingCalendar>
export const SurDemande: StoryObj<typeof BookingCalendar> = {}
export const LienConfigure: StoryObj<typeof BookingCalendar> = { parameters: { demo: { calLink: 'https://cal.com/demo' } } }
export const English: StoryObj<typeof BookingCalendar> = { globals: { locale: 'en' } }
