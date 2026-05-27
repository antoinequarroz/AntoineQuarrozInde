<script setup lang="ts">
const { t, locale } = useI18n()

type ServiceKey = 'vitrine' | 'mobile' | 'cms'

const serviceFeatures: Record<string, Record<ServiceKey, string[]>> = {
  fr: {
    vitrine: ['Design sur mesure', '100% responsive', 'Optimisation SEO', 'Performances maximales'],
    mobile: ['iOS & Android', 'UI/UX soigné', 'Push notifications', 'Hors-ligne ready'],
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

const features = computed(() => {
  const lang = locale.value as 'fr' | 'en' | 'de'
  return serviceFeatures[lang] ?? serviceFeatures.fr
})

const services = computed(() => [
  { key: 'vitrine', icon: 'monitor', gradient: 'from-violet-500 to-purple-600', features: features.value.vitrine ?? [] },
  { key: 'cms', icon: 'layers', gradient: 'from-indigo-500 to-violet-600', features: features.value.cms ?? [] },
  { key: 'mobile', icon: 'smartphone', gradient: 'from-purple-500 to-fuchsia-500', features: features.value.mobile ?? [] },
])

const offerMeta = computed(() => {
  if (locale.value === 'en') {
    return { left: 'Starter', center: 'Most Requested', right: 'Scale', cta: 'Start project' }
  }
  if (locale.value === 'de') {
    return { left: 'Start', center: 'Meist gefragt', right: 'Scale', cta: 'Projekt starten' }
  }
  return { left: 'Starter', center: 'Le plus demandé', right: 'Scale', cta: 'Démarrer le projet' }
})

</script>

<template>
  <section id="services" class="section-padding section-surface">
    <div class="section-background">
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <div
        v-motion
        :initial="{ opacity: 0, y: 40 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 720 } }"
        class="section-header"
      >
        <span class="badge mb-4">{{ t('services.badge') }}</span>
        <h2 class="section-heading">
          <span class="block">{{ t('services.title').split('\n')[0] }}</span>
          <span class="block section-heading-gradient">{{ t('services.title').split('\n')[1] }}</span>
        </h2>
        <p class="section-subtitle mx-auto text-center">{{ t('services.subtitle') }}</p>
      </div>

      <div class="relative max-w-6xl mx-auto">
        <div class="hidden md:block absolute inset-x-16 top-1/2 -translate-y-1/2 h-56 bg-violet-500/12 dark:bg-violet-500/18 blur-3xl pointer-events-none" />

        <div class="grid md:grid-cols-3 gap-5 md:gap-6 lg:gap-8 items-end">
          <div
            v-for="(service, index) in services"
            :key="service.key"
            v-motion
            :initial="{ opacity: 0, y: 48, rotate: index === 0 ? -2 : (index === 2 ? 2 : 0) }"
            :visible="{ opacity: 1, y: index === 1 ? -14 : 0, rotate: index === 0 ? -2 : (index === 2 ? 2 : 0), transition: { delay: index * 110, duration: 760 } }"
            class="service-card relative group flex min-h-[24rem] md:min-h-[31rem] flex-col rounded-3xl border backdrop-blur-md transition-transform duration-500 hover:scale-[1.025]"
            :class="index === 1
              ? 'z-20 scale-[1.03] border-violet-500/25 bg-white/90 shadow-2xl shadow-violet-500/15 dark:border-violet-300/35 dark:bg-gradient-to-b dark:from-[#2a1f57] dark:via-[#1d173b] dark:to-[#1a2448] dark:shadow-[0_25px_80px_rgba(76,29,149,0.42)]'
              : 'z-10 border-violet-500/15 bg-white/78 shadow-xl shadow-violet-500/10 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-black/25'"
          >
            <div class="absolute -top-3 left-6">
              <span
                class="px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.14em] uppercase border"
                :class="index === 1
                  ? 'bg-violet-600 text-white border-violet-400/40'
                  : 'bg-white text-violet-700 border-violet-300/50 dark:bg-[#191d35] dark:text-violet-200 dark:border-violet-300/25'"
              >
                {{ index === 0 ? offerMeta.left : index === 1 ? offerMeta.center : offerMeta.right }}
              </span>
            </div>

            <div class="flex h-full flex-col p-5 md:p-8 md:pt-9">
              <div
                class="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-glow-sm transition-shadow duration-500"
                :class="`bg-gradient-to-br ${service.gradient} ${index === 1 ? 'group-hover:shadow-glow' : ''}`"
              >
                <svg v-if="service.icon === 'monitor'" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <svg v-else-if="service.icon === 'smartphone'" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <svg v-else class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>

              <h3 class="mb-3 font-display text-xl font-bold text-gray-950 dark:text-white">
                {{ t(`services.${service.key}.title`) }}
              </h3>
              <p class="mb-6 flex-1 text-sm leading-relaxed text-gray-700 dark:text-white/80">
                {{ t(`services.${service.key}.description`) }}
              </p>

              <ul class="mb-6 space-y-2">
                <li
                  v-for="feature in service.features"
                  :key="feature"
                  class="flex items-center gap-2 text-sm text-gray-900 dark:text-white/90"
                >
                  <svg class="h-4 w-4 flex-shrink-0 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {{ feature }}
                </li>
              </ul>

              <a
                href="/#contact"
                class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all group/link"
                :class="index === 1
                  ? 'bg-violet-600 text-white hover:bg-violet-500'
                  : 'border border-violet-500/25 text-violet-700 hover:bg-violet-500/10 dark:border-violet-300/30 dark:text-violet-200 dark:hover:bg-violet-500/15'"
              >
                {{ offerMeta.cta }}
                <svg class="w-4 h-4 transition-transform group-hover/link:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.service-card {
  animation: serviceFloat 7s ease-in-out infinite;
}

.service-card:nth-child(2) {
  animation-delay: -1.4s;
}

.service-card:nth-child(3) {
  animation-delay: -2.8s;
}

@keyframes serviceFloat {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -8px;
  }
}

.service-card:hover {
  animation-play-state: paused;
}
</style>
