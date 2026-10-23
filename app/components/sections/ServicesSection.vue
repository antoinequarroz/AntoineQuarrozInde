<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { track } = useMarketing()

type ServiceKey = 'vitrine' | 'mobile' | 'cms'

const activeService = ref<ServiceKey>('vitrine')
const interaction = ref<'pointer' | 'keyboard'>('pointer')

const serviceFeatures: Record<string, Record<ServiceKey, string[]>> = {
  fr: {
    vitrine: ['Design sur mesure', '100% responsive', 'Optimisation SEO', 'Performances maximales'],
    mobile: ['iOS & Android', 'UI/UX soigné', 'Push notifications', 'Disponible hors ligne'],
    cms: ['Interface intuitive', 'Sur mesure', 'Multi-utilisateurs', 'Évolutif'],
  },
  en: {
    vitrine: ['Custom design', '100% responsive', 'SEO optimization', 'Maximum performance'],
    mobile: ['iOS & Android', 'Polished UI/UX', 'Push notifications', 'Offline ready'],
    cms: ['Intuitive interface', 'Fully custom', 'Multi-user', 'Scalable'],
  },
  de: {
    vitrine: ['Individuelles Design', '100% responsive', 'SEO-Optimierung', 'Maximale Performance'],
    mobile: ['iOS & Android', 'Durchdachtes UI/UX', 'Push-Benachrichtigungen', 'Offline-fähig'],
    cms: ['Intuitive Oberfläche', 'Maßgeschneidert', 'Multi-User', 'Skalierbar'],
  },
}

const previewCopy = computed(() => {
  if (locale.value === 'en') return {
    vitrine: { caption: 'PhysioBaur', detail: 'A website for a physiotherapy practice', alt: 'The PhysioBaur website, created for a physiotherapy practice in Sion' },
    cms: { caption: 'A website you can manage', detail: 'Demonstration with sample data', alt: 'Demonstration of the website administration dashboard with sample data' },
    mobile: { caption: 'LifXP', detail: 'iOS app · beta version', alt: 'Preview of the LifXP mobile app, currently in beta' },
  }
  if (locale.value === 'de') return {
    vitrine: { caption: 'PhysioBaur', detail: 'Eine Website für eine Physiotherapiepraxis', alt: 'Die Website von PhysioBaur, gestaltet für eine Physiotherapiepraxis in Sitten' },
    cms: { caption: 'Ihre Website selbst verwalten', detail: 'Demonstration mit Beispieldaten', alt: 'Demonstration des Website-Verwaltungsbereichs mit Beispieldaten' },
    mobile: { caption: 'LifXP', detail: 'iOS-App · Betaversion', alt: 'Einblick in die mobile App LifXP, derzeit in der Betaphase' },
  }
  return {
    vitrine: { caption: 'PhysioBaur', detail: 'Un site pour un cabinet de physiothérapie', alt: 'Le site PhysioBaur, réalisé pour un cabinet de physiothérapie à Sion' },
    cms: { caption: 'Un site que vous pouvez piloter', detail: 'Démonstration avec des données fictives', alt: 'Démonstration du tableau de bord de l’administration du site avec des données fictives' },
    mobile: { caption: 'LifXP', detail: 'Application iOS · version bêta', alt: 'Aperçu de l’application mobile LifXP, actuellement en version bêta' },
  }
})

const services = computed(() => {
  const features = serviceFeatures[locale.value] ?? serviceFeatures.fr!
  return [
    { key: 'vitrine' as const, image: '/service-previews/physiobaur.webp', features: features.vitrine },
    { key: 'cms' as const, image: '/service-previews/dashboard-demo.webp', features: features.cms },
    { key: 'mobile' as const, image: '/portfolio-previews/lifxp-0b05f10e-800.webp', features: features.mobile },
  ].map(service => ({
    ...service,
    title: t(`services.${service.key}.title`),
    preview: previewCopy.value[service.key],
  }))
})

const localZones = computed(() => locale.value === 'de'
  ? 'Wallis, Sitten, Siders, Martigny, Val d’Herens, Val d’Anniviers'
  : 'Valais, Sion, Sierre, Martigny, Val d’Herens, Val d’Anniviers')

function activateService(key: ServiceKey, input: 'pointer' | 'keyboard') {
  interaction.value = input
  activeService.value = key
}

function onPointerEnter(event: PointerEvent, key: ServiceKey) {
  // Touch selection happens on click, never through a sticky hover state.
  if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    // Incidental pointer movement must not hide a keyboard user's current action.
    const currentPanel = document.getElementById(`service-panel-${activeService.value}`)
    if (currentPanel?.contains(document.activeElement)) return
    activateService(key, 'pointer')
  }
}

function onTabFocus(event: FocusEvent, key: ServiceKey) {
  if ((event.target as HTMLElement).matches(':focus-visible')) activateService(key, 'keyboard')
}

function onTabKeydown(event: KeyboardEvent, index: number) {
  let nextIndex: number
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % services.value.length
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index + services.value.length - 1) % services.value.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = services.value.length - 1
  else return

  event.preventDefault()
  const next = services.value[nextIndex]!
  activateService(next.key, 'keyboard')
  document.getElementById(`service-tab-${next.key}`)?.focus()
}

function selectService(service: { key: ServiceKey }) {
  const title = t(`services.${service.key}.title`)
  track('services_cta_click', { service: service.key })
  window.dispatchEvent(new CustomEvent('aq:service-selected', {
    detail: { key: service.key, title },
  }))
}
</script>

<template>
  <section id="services" class="services-section section-padding section-surface" aria-labelledby="services-title">
    <div class="services-gradient" aria-hidden="true" />

    <div class="section-container relative z-10">
      <div class="section-header">
        <span class="badge mb-4">{{ t('services.badge') }}</span>
        <h2 id="services-title" class="section-heading">
          <span class="block">{{ t('services.title').split('\n')[0] }}</span>
          <span class="block section-heading-gradient">{{ t('services.title').split('\n')[1] }}</span>
        </h2>
        <p class="section-subtitle mx-auto text-center">{{ t('services.subtitle') }}</p>
        <p class="mt-3 max-w-xl text-center text-sm leading-relaxed text-gray-600 dark:text-white/65">
          {{ t('services.choice_help') }}
        </p>
        <p class="mt-3 text-xs text-gray-500 dark:text-white/55 text-center">
          {{ t('services.areas') }}: {{ localZones }}
        </p>
        <div v-if="locale === 'fr'" class="mt-3 flex flex-wrap justify-center gap-2">
          <NuxtLink to="/creation-site-internet-valais" class="service-seo-link inline-flex min-h-11 items-center rounded-lg border border-violet-500/20 px-3 py-1.5 text-xs text-violet-700 dark:text-violet-200">
            Sites web en Valais
          </NuxtLink>
          <NuxtLink to="/application-mobile-valais" class="service-seo-link inline-flex min-h-11 items-center rounded-lg border border-violet-500/20 px-3 py-1.5 text-xs text-violet-700 dark:text-violet-200">
            Apps mobiles en Valais
          </NuxtLink>
          <NuxtLink to="/audit-ia-pme" class="service-seo-link inline-flex min-h-11 items-center rounded-lg border border-cyan-500/25 px-3 py-1.5 text-xs text-cyan-800 dark:text-cyan-200">
            Audit IA pour PME
          </NuxtLink>
        </div>
      </div>

      <div class="services-slideshow" :data-service-motion="interaction">
        <div class="services-selector" role="tablist" :aria-label="t('services.badge')" aria-orientation="vertical">
          <button
            v-for="(service, index) in services"
            :id="`service-tab-${service.key}`"
            :key="service.key"
            type="button"
            role="tab"
            :data-service-tab="service.key"
            :aria-selected="activeService === service.key"
            :aria-controls="`service-panel-${service.key}`"
            :tabindex="activeService === service.key ? 0 : -1"
            class="services-tab"
            :class="{ 'is-active': activeService === service.key }"
            @pointerenter="onPointerEnter($event, service.key)"
            @click="activateService(service.key, $event.detail === 0 ? 'keyboard' : 'pointer')"
            @focus="onTabFocus($event, service.key)"
            @keydown="onTabKeydown($event, index)"
          >
            <span class="services-tab__intent">{{ t(`services.${service.key}.intent`) }}</span>
            <span class="sr-only">{{ service.title }}</span>
            <span class="services-tab__title" aria-hidden="true">
              <span v-for="(word, wordIndex) in service.title.split(' ')" :key="wordIndex" class="services-tab__word">
                <span v-for="(character, characterIndex) in Array.from(word)" :key="characterIndex" class="services-tab__letter" :style="{ '--letter-delay': `${Math.min(characterIndex * 8 + wordIndex * 20, 65)}ms` }">
                  <span class="services-tab__letter-base">{{ character }}</span>
                  <span class="services-tab__letter-active">{{ character }}</span>
                </span>
              </span>
            </span>
            <svg class="services-tab__arrow" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div class="services-previews">
          <article
            v-for="service in services"
            :id="`service-panel-${service.key}`"
            :key="service.key"
            role="tabpanel"
            :data-service-panel="service.key"
            :aria-labelledby="`service-tab-${service.key}`"
            :aria-hidden="activeService !== service.key"
            :inert="activeService !== service.key"
            tabindex="0"
            class="services-preview"
            :class="{ 'is-active': activeService === service.key }"
          >
            <figure class="services-preview__figure" :class="`services-preview__figure--${service.key}`">
              <div class="services-preview__image-wrap" data-service-artwork>
                <img
                  :src="service.image"
                  :alt="service.preview.alt"
                  width="1440"
                  height="1000"
                  loading="lazy"
                  decoding="async"
                  class="services-preview__image"
                >
              </div>
              <figcaption class="services-preview__caption">
                <span>{{ service.preview.caption }}</span>
                <span>{{ service.preview.detail }}</span>
              </figcaption>
            </figure>

            <div class="services-preview__body">
              <p class="services-preview__description">{{ t(`services.${service.key}.description`) }}</p>
              <p class="services-preview__audience">
                <span>{{ t('services.best_for') }}</span> {{ t(`services.${service.key}.best_for`) }}
              </p>
              <ul class="services-preview__features">
                <li v-for="feature in service.features" :key="feature">
                  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                    <path d="m5 12 4 4L19 6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  {{ feature }}
                </li>
              </ul>
              <a :href="`${localePath('/')}#contact-form`" :data-service-cta="service.key" class="services-preview__cta" @click="selectService(service)">
                {{ t('services.choose') }}
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.services-section { isolation: isolate; background: #f8f7ff; }
:global(.dark .services-section) { background: #0f0f1a; }

.services-gradient {
  position: absolute;
  z-index: -1;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 82% 52%, rgb(168 85 247 / 0.14), transparent 48%),
    radial-gradient(ellipse at 22% 80%, rgb(124 58 237 / 0.09), transparent 42%),
    linear-gradient(160deg, transparent 10%, rgb(192 132 252 / 0.08) 55%, transparent 95%);
}
:global(.dark .services-gradient) {
  background:
    radial-gradient(ellipse at 83% 50%, rgb(124 58 237 / 0.26), transparent 47%),
    radial-gradient(ellipse at 19% 85%, rgb(168 85 247 / 0.13), transparent 42%),
    linear-gradient(155deg, #0f0f1a 5%, #151023 55%, #0f0f1a 100%);
}

.services-slideshow {
  display: grid;
  max-width: 72rem;
  grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
  align-items: center;
  gap: clamp(2rem, 5vw, 5rem);
  margin: 0 auto;
}
.services-selector { display: flex; min-width: 0; flex-direction: column; gap: 0.5rem; }
.services-tab {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 7.5rem;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 1.25rem 2.4rem 1.25rem 1.35rem;
  border: 0;
  border-left: 2px solid rgb(124 58 237 / 0.12);
  border-radius: 0 1.15rem 1.15rem 0;
  color: #686277;
  background: transparent;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 180ms ease-out, border-color 180ms ease-out;
}
.services-tab.is-active { border-left-color: #7c3aed; background: linear-gradient(90deg, rgb(124 58 237 / 0.09), transparent 88%); }
.services-tab__intent { font-size: 0.75rem; font-weight: 500; line-height: 1.25; }
.services-tab.is-active .services-tab__intent { color: #6d28d9; }
.services-tab__title {
  display: flex;
  flex-wrap: wrap;
  gap: 0.05em 0.22em;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: clamp(1.7rem, 2.7vw, 2.8rem);
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.045em;
}
.services-tab__word { display: inline-flex; white-space: nowrap; }
.services-tab__letter { position: relative; display: inline-block; overflow: hidden; }
.services-tab__letter-base, .services-tab__letter-active {
  display: inline-block;
  transition: transform 175ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transition-delay: var(--letter-delay, 0ms);
}
.services-tab__letter-active { position: absolute; inset: 0; color: #7c3aed; transform: translateY(110%); }
.services-tab.is-active .services-tab__letter-base { transform: translateY(-110%); }
.services-tab.is-active .services-tab__letter-active { transform: translateY(0); }
.services-tab__arrow {
  position: absolute;
  right: 0.9rem;
  top: 50%;
  color: #7c3aed;
  opacity: 0;
  transform: translate(-5px, -50%);
  transition: opacity 160ms ease-out, transform 180ms ease-out;
}
.services-tab.is-active .services-tab__arrow { opacity: 1; transform: translate(0, -50%); }
:global(.dark .services-tab) { color: #b8b2c8; border-left-color: rgb(196 181 253 / 0.14); }
:global(.dark .services-tab.is-active) { border-left-color: #a78bfa; background: linear-gradient(90deg, rgb(124 58 237 / 0.16), transparent 90%); }
:global(.dark .services-tab.is-active .services-tab__intent) { color: #c4b5fd; }
:global(.dark .services-tab__letter-active) { color: #c4b5fd; }
:global(.dark .services-tab__arrow) { color: #c4b5fd; }

.services-previews { display: grid; min-width: 0; }
.services-preview {
  grid-area: 1 / 1;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(124 58 237 / 0.13);
  border-radius: 1.5rem;
  background: rgb(255 255 255 / 0.88);
  box-shadow: 0 20px 65px rgb(76 29 149 / 0.09);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 240ms ease-out, visibility 0s linear 240ms;
}
.services-preview.is-active { visibility: visible; opacity: 1; pointer-events: auto; transition-delay: 0s; }
:global(.dark .services-preview) { border-color: rgb(196 181 253 / 0.18); background: #13131f; box-shadow: 0 24px 70px rgb(0 0 0 / 0.24); }
.services-preview__figure { margin: 0; }
.services-preview__image-wrap { position: relative; aspect-ratio: 1.62; overflow: hidden; background: #ede9fe; }
.services-preview__image { width: 100%; height: 100%; object-fit: cover; object-position: top center; transform: scale(1.025); transition: transform 260ms ease-out; }
.services-preview.is-active .services-preview__image { transform: scale(1); }
.services-preview__figure--mobile .services-preview__image { object-position: center; }
:global(.dark .services-preview__image-wrap) { background: #080810; }
.services-preview__caption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 1rem;
  padding: 0.85rem 1.35rem;
  border-bottom: 1px solid rgb(124 58 237 / 0.1);
  color: #61596e;
  font-size: 0.7rem;
  line-height: 1.45;
}
.services-preview__caption span:first-child { color: #322343; font-weight: 600; }
:global(.dark .services-preview__caption) { color: #b2a8c3; border-bottom-color: rgb(196 181 253 / 0.1); }
:global(.dark .services-preview__caption span:first-child) { color: #e9ddff; }
.services-preview__body { padding: 1.4rem 1.5rem 1.5rem; }
.services-preview__description { margin: 0; color: #342d40; font-size: 0.9rem; line-height: 1.65; }
.services-preview__audience { margin: 0.85rem 0 0; color: #706778; font-size: 0.78rem; line-height: 1.55; }
.services-preview__audience span { color: #51475e; font-weight: 600; }
.services-preview__features { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem 1rem; margin: 1.2rem 0 1.4rem; padding: 0; list-style: none; }
.services-preview__features li { display: flex; align-items: flex-start; gap: 0.45rem; color: #4e455a; font-size: 0.75rem; line-height: 1.45; }
.services-preview__features svg { flex-shrink: 0; margin-top: 0.08rem; color: #7c3aed; }
:global(.dark .services-preview__description) { color: #e0d9ea; }
:global(.dark .services-preview__audience) { color: #b4abc1; }
:global(.dark .services-preview__audience span) { color: #d0c6df; }
:global(.dark .services-preview__features li) { color: #d1c7e0; }
:global(.dark .services-preview__features svg) { color: #b59af8; }
.services-preview__cta {
  display: inline-flex;
  min-height: 2.75rem;
  justify-content: center;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 1rem;
  border-radius: 0.8rem;
  background: linear-gradient(125deg, #7c3aed, #9333ea);
  color: white;
  font-size: 0.82rem;
  font-weight: 600;
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
.services-preview__cta:active { transform: scale(0.97); }
.services-tab:focus-visible, .services-preview:focus-visible, .services-preview__cta:focus-visible, .service-seo-link:focus-visible { outline: 2px solid #8b5cf6; outline-offset: 5px; }
.services-slideshow[data-service-motion="keyboard"] .services-tab,
.services-slideshow[data-service-motion="keyboard"] .services-tab__letter-base,
.services-slideshow[data-service-motion="keyboard"] .services-tab__letter-active,
.services-slideshow[data-service-motion="keyboard"] .services-tab__arrow,
.services-slideshow[data-service-motion="keyboard"] .services-preview,
.services-slideshow[data-service-motion="keyboard"] .services-preview__image { transition: none; }

@media (hover: hover) and (pointer: fine) {
  .services-tab:not(.is-active):hover { background: rgb(124 58 237 / 0.04); }
  .services-preview__cta:hover { opacity: 0.9; }
}
@media (max-width: 767px) {
  .services-slideshow { grid-template-columns: minmax(0, 1fr); gap: 1.5rem; max-width: 35rem; }
  .services-selector { gap: 0; }
  .services-tab { min-height: 5.1rem; gap: 0.4rem; padding: 0.85rem 2.25rem 0.85rem 1rem; border-radius: 0 0.8rem 0.8rem 0; }
  .services-tab__title { font-size: clamp(1.35rem, 5.6vw, 2rem); }
  .services-tab__intent { font-size: 0.7rem; }
  .services-preview { border-radius: 1.15rem; }
  .services-preview__body { padding: 1.1rem; }
  .services-preview__caption { padding: 0.75rem 1.1rem; }
  .services-preview__description { font-size: 0.86rem; }
  .services-preview__features { gap: 0.65rem 0.75rem; }
  .services-preview__cta { width: 100%; }
}
@media (max-width: 359px) {
  .services-preview__features { grid-template-columns: minmax(0, 1fr); }
  .services-preview__caption { gap: 0.25rem; }
}
@media (prefers-reduced-motion: reduce) {
  .services-tab, .services-tab__letter-base, .services-tab__letter-active, .services-tab__arrow,
  .services-preview, .services-preview__image, .services-preview__cta { transition: none !important; }
  .services-preview__image, .services-preview__cta:active { transform: none; }
}
</style>
