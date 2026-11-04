import { setup, type Preview } from '@storybook/vue3-vite'
import { defineComponent, h, provide, watchEffect } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import { i18n, demoKey, createDemo } from './runtime'
import { withThemeByClassName } from '@storybook/addon-themes'
import '../app/assets/css/main.css'
import './preview.css'

// Navigation is intentionally inert: stories never open authenticated app routes.
setup((app) => {
  app.use(i18n)
  app.use(MotionPlugin)
  const components = import.meta.glob([
    '../app/components/ui/{LangSwitcher,ThemeToggle,AppImageUpload,CardStack,BookingCalendar,SplineRobot}.vue',
    '../app/components/ui/VideoScrollHero.vue',
    '../app/components/sections/{ProjectHelixCarousel,AboutVideo}.vue',
    '../app/components/admin/{Icon,SocialPostTile,SocialPlatformBadge,SocialPlatformIcon,SocialDocumentPreview}.vue',
  ], { eager: true, import: 'default' })
  for (const [path, component] of Object.entries(components)) {
    const parts = path.replace('../app/components/', '').replace('.vue', '').split('/')
    app.component(parts.map(part => part[0]!.toUpperCase() + part.slice(1)).join(''), component as any)
  }
  app.component('ClientOnly', defineComponent({ setup(_, { slots }) { return () => slots.default?.() } }))
  app.component('NuxtLink', defineComponent({
    inheritAttrs: false,
    props: ['to'],
    setup(_, { slots, attrs }) {
      return () => h('a', { ...attrs, href: '#', onClick: (event: Event) => event.preventDefault() }, slots.default?.())
    },
  }))
})
// All outbound anchor navigation is local to the demonstration, including mail/calendar links.
document.addEventListener('click', event => {
  if ((event.target as Element)?.closest?.('[data-aq-demo] a')) event.preventDefault()
}, true)
const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: { locale: { description: 'Langue du composant', toolbar: { icon: 'globe', items: [{ value: 'fr', title: 'Français' }, { value: 'en', title: 'English' }, { value: 'de', title: 'Deutsch' }], dynamicTitle: true } } },
  initialGlobals: { locale: 'fr' },
  decorators: [withThemeByClassName({ themes: { Clair: '', Sombre: 'dark' }, defaultTheme: 'Clair' }), (story, context) => ({
    components: { story },
    setup() {
      provide(demoKey, createDemo(context.parameters.demo))
      watchEffect(() => { i18n.global.locale.value = context.globals.locale || 'fr' })
      return {}
    },
    template: '<div data-aq-demo><p class="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100">Atelier AQ · Démonstration isolée · Actions métier simulées</p><story /></div>',
  })],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    a11y: { test: 'error' },
    options: { storySort: { order: ['Bienvenue', 'Fondations', 'Navigation', 'Vitrine', 'Administration', 'Interface', 'Portail client', 'Effets visuels'] } },
    docs: { toc: true },
  },
}
export default preview
