<script setup lang="ts">
import {
  PUBLIC_COUNTRY_LABELS,
  PUBLIC_SEO_IDENTITY,
  type PublicSeoLocale,
} from '~~/shared/utils/publicSeoIdentity'

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const year = new Date().getFullYear()
const contactCountry = computed(() => PUBLIC_COUNTRY_LABELS[locale.value as PublicSeoLocale] ?? PUBLIC_COUNTRY_LABELS.fr)
const socials = PUBLIC_SEO_IDENTITY.profiles
const hasInlineNewsletter = computed(() => /^\/(?:en\/|de\/)?blog\/[^/]+\/?$/.test(route.path))
const footerCopy = computed(() => locale.value === 'en' ? {
  available: 'Available for new projects',
  location: 'Based in Valais · Working remotely',
  technologies: 'Technologies',
} : locale.value === 'de' ? {
  available: 'Verfügbar für neue Projekte',
  location: 'Im Wallis · Remote verfügbar',
  technologies: 'Technologien',
} : {
  available: 'Disponible pour de nouveaux projets',
  location: 'Basé en Valais · Disponible à distance',
  technologies: 'Technologies',
})

const navLinks = computed(() => [
  { key: 'about', href: `${localePath('/')}#about` },
  { key: 'services', href: `${localePath('/')}#services` },
  { key: 'portfolio', href: `${localePath('/')}#portfolio` },
  ...(locale.value === 'fr' ? [{ key: 'blog', href: `${localePath('/')}#blog` }] : []),
  { key: 'contact', href: `${localePath('/')}#contact` },
])

const stack = [
  { label: 'Vue 3', icons: ['vue'] },
  { label: 'Nuxt', icons: ['nuxt'] },
  { label: 'React', icons: ['react'] },
  { label: 'Next.js', icons: ['nextjs'] },
  { label: 'SwiftUI', icons: ['swiftui'] },
  { label: 'Flutter', icons: ['flutter'] },
  { label: 'Dart', icons: ['dart'] },
  { label: 'Rust', icons: ['rust'] },
  { label: 'Supabase', icons: ['supabase'] },
] as const

const localSeoLinks = [
  { label: 'Cas clients en Valais', href: '/cas-clients-valais' },
  { label: 'Développeur web en Valais', href: '/developpeur-web-valais' },
  { label: 'Création de site en Valais', href: '/creation-site-internet-valais' },
  { label: 'Refonte de site en Valais', href: '/refonte-site-web-valais' },
  { label: 'Application mobile en Valais', href: '/application-mobile-valais' },
]
</script>

<template>
  <footer data-site-footer class="relative -mt-px overflow-hidden bg-surface-light-secondary pb-6 pt-10 dark:bg-surface-dark-secondary md:pb-8 md:pt-16">
    <div class="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
      <div data-footer-transition class="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_1px_1px,rgba(20,24,38,0.08)_1px,transparent_0)] bg-[size:34px_34px] opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] dark:opacity-20" />
      <div class="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl dark:bg-violet-600/18" />
      <div class="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-3xl dark:bg-fuchsia-600/15" />
    </div>

    <div class="section-container relative">
      <div class="relative overflow-hidden rounded-[2.25rem] border border-violet-500/15 bg-white/80 p-4 shadow-2xl shadow-violet-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6 lg:p-8">
        <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

        <BlogNewsletterSignup v-if="!hasInlineNewsletter" variant="footer" />

        <div :class="hasInlineNewsletter ? '' : 'mt-10 lg:mt-12'" class="relative grid gap-10 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.7fr)] lg:gap-14">
          <div>
            <NuxtLink :to="localePath('/')" class="flex min-h-11 w-fit items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-gray-950">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-glow-sm">
                <span class="font-display text-sm font-bold text-white">AQ</span>
              </span>
              <span>
                <span class="block font-display font-semibold text-gray-950 dark:text-white">Antoine Quarroz</span>
                <span class="block text-xs text-gray-500 dark:text-white/45">{{ footerCopy.location }}</span>
              </span>
            </NuxtLink>

            <p class="mt-5 max-w-sm text-sm leading-6 text-gray-600 dark:text-gray-300">
              {{ t('footer.tagline') }}
            </p>

            <a
              :href="`${localePath('/')}#contact`"
              class="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-[background-color,border-color,transform] duration-150 hover:border-emerald-500/35 hover:bg-emerald-100 active:scale-[0.96] dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/15"
            >
              <span class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
              {{ footerCopy.available }}
            </a>

            <div class="mt-5 flex gap-2.5">
              <a
                v-for="social in socials"
                :key="social.name"
                :href="social.href"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="social.name"
                class="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-50 text-violet-700 transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:border-violet-500/35 hover:bg-violet-100 hover:shadow-sm active:scale-[0.96] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:border-violet-400/30 dark:hover:text-violet-300"
              >
                <svg v-if="social.icon === 'github'" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                <svg v-else-if="social.icon === 'linkedin'" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          <nav class="grid grid-cols-2 gap-x-6 gap-y-9 sm:gap-x-10" :class="locale === 'fr' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
            <div>
              <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">{{ t('footer.col_nav') }}</p>
              <ul class="space-y-1">
                <li v-for="link in navLinks" :key="link.key">
                  <a :href="link.href" class="inline-flex min-h-11 min-w-11 items-center text-sm text-gray-600 transition-colors duration-150 hover:text-violet-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-white/60 dark:hover:text-violet-300">
                    {{ t(`nav.${link.key}`) }}
                  </a>
                </li>
              </ul>
            </div>

            <div v-if="locale === 'fr'">
              <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-600 dark:text-fuchsia-300">Local</p>
              <ul class="space-y-1">
                <li v-for="item in localSeoLinks" :key="item.href">
                  <NuxtLink :to="item.href" class="inline-flex min-h-11 min-w-11 items-center text-sm leading-5 text-gray-600 transition-colors duration-150 hover:text-violet-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-white/60 dark:hover:text-violet-300">
                    {{ item.label }}
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <div class="col-span-2 sm:col-span-1">
              <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{{ t('footer.col_contact') }}</p>
              <ul class="space-y-1 text-sm text-gray-600 dark:text-white/60">
                <li><a :href="PUBLIC_SEO_IDENTITY.emailHref" class="inline-flex min-h-11 items-center break-all transition-colors duration-150 hover:text-violet-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:text-violet-300">{{ PUBLIC_SEO_IDENTITY.email }}</a></li>
                <li><a :href="PUBLIC_SEO_IDENTITY.phoneHref" class="inline-flex min-h-11 items-center transition-colors duration-150 hover:text-violet-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:text-violet-300">{{ PUBLIC_SEO_IDENTITY.phone }}</a></li>
                <li class="pt-2 leading-6">
                  {{ PUBLIC_SEO_IDENTITY.address.streetAddress }}<br>
                  {{ PUBLIC_SEO_IDENTITY.address.postalCode }} {{ PUBLIC_SEO_IDENTITY.address.addressLocality }}<br>
                  {{ PUBLIC_SEO_IDENTITY.address.addressRegion }}, {{ contactCountry }}
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div class="relative mt-9 border-t border-violet-500/10 pt-7 dark:border-white/10">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-white/45">{{ footerCopy.technologies }}</p>
          <ul class="mt-4 flex flex-wrap gap-2">
            <li v-for="tech in stack" :key="tech.label" class="flex min-h-9 items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-3 text-xs font-medium text-gray-600 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
              <span class="flex shrink-0 items-center gap-1 text-fuchsia-500/80 dark:text-fuchsia-300/75">
                <UiTechnologyIcon v-for="icon in tech.icons" :key="icon" :name="icon" class="h-3.5 w-3.5" />
              </span>
              {{ tech.label }}
            </li>
          </ul>
        </div>

        <div class="relative mt-7 flex flex-col items-center justify-between gap-2 border-t border-violet-500/10 pt-5 text-xs text-gray-600 dark:border-white/10 dark:text-gray-300 sm:flex-row">
          <span>© {{ year }} Antoine Quarroz · {{ t('footer.rights') }}</span>
          <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <NuxtLink :to="localePath('/mentions-legales')" class="inline-flex min-h-11 items-center transition-colors duration-150 hover:text-violet-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:text-violet-300">{{ t('footer.legal') }}</NuxtLink>
            <NuxtLink :to="localePath('/confidentialite')" class="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors duration-150 hover:text-violet-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:text-violet-300">{{ t('footer.privacy') }}</NuxtLink>
            <NuxtLink :to="localePath('/conditions-utilisation')" class="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors duration-150 hover:text-violet-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:text-violet-300">{{ t('footer.terms') }}</NuxtLink>
            <span>{{ t('footer.made_with') }}</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
