<script setup lang="ts">
const { t } = useI18n()
const year = new Date().getFullYear()

const socials = [
  { name: 'GitHub', href: 'https://github.com/antoinequarroz', icon: 'github' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/antoine-quarroz-376020187/', icon: 'linkedin' },
]

const navLinks = computed(() => [
  { key: 'about', href: '/#about' },
  { key: 'services', href: '/#services' },
  { key: 'portfolio', href: '/#portfolio' },
  { key: 'blog', href: '/#blog' },
  { key: 'contact', href: '/#contact' },
])

const stack = ['Vue 3 / Nuxt', 'TypeScript', 'Flutter', 'Tailwind CSS', 'Supabase']

const localSeoLinks = [
  { label: 'Developpeur web Valais', href: '/developpeur-web-valais' },
  { label: 'Creation site internet Valais', href: '/creation-site-internet-valais' },
  { label: 'Refonte site web Valais', href: '/refonte-site-web-valais' },
  { label: 'Application mobile Valais', href: '/application-mobile-valais' },
]
</script>

<template>
  <footer class="relative overflow-hidden pb-6 pt-10 md:pb-8 md:pt-16">
    <!-- Glow blobs -->
    <div class="pointer-events-none absolute inset-0 select-none">
      <div class="absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
      <div class="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-3xl" />
      <div class="absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
    </div>

    <div class="section-container relative">
      <!-- Glass card -->
      <div class="relative overflow-hidden rounded-3xl border border-violet-500/15 bg-white/80 p-5 md:p-12 shadow-2xl shadow-violet-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <!-- Top shine -->
        <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
        <!-- Inner corner glow -->
        <div class="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div class="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-fuchsia-500/8 blur-3xl" />

        <div class="relative grid gap-8 md:gap-12 md:grid-cols-[1fr_auto]">

          <!-- ─── Brand + tagline + socials ─── -->
          <div>
            <NuxtLink to="/" class="flex w-fit items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-glow-sm">
                <span class="font-display text-sm font-bold text-white">AQ</span>
              </div>
              <span class="font-display font-semibold text-gray-900 dark:text-white">Antoine Quarroz</span>
            </NuxtLink>

            <p class="mt-4 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-white/50">
              {{ t('footer.tagline') }}
            </p>

            <!-- Socials -->
            <div class="mt-6 flex gap-2.5">
              <a
                v-for="social in socials"
                :key="social.name"
                :href="social.href"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="social.name"
                class="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-50 text-violet-600 transition-all duration-200 hover:border-violet-500/40 hover:bg-violet-100 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:border-violet-400/30 dark:hover:text-violet-400"
              >
                <!-- GitHub -->
                <svg v-if="social.icon === 'github'" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                <!-- LinkedIn -->
                <svg v-else-if="social.icon === 'linkedin'" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          <!-- ─── Nav columns ─── -->
          <nav class="grid grid-cols-1 gap-8 sm:grid-cols-4 sm:gap-8">

            <!-- Navigation -->
            <div>
              <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500 dark:text-violet-400">
                {{ t('footer.col_nav') }}
              </p>
              <ul class="space-y-3">
                <li v-for="link in navLinks" :key="link.key">
                  <a
                    :href="link.href"
                    class="text-sm text-gray-600 transition-colors hover:text-violet-600 dark:text-white/60 dark:hover:text-violet-400"
                  >
                    {{ t(`nav.${link.key}`) }}
                  </a>
                </li>
              </ul>
            </div>

            <!-- Stack -->
            <div>
              <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-500 dark:text-fuchsia-400">
                Stack
              </p>
              <ul class="space-y-3">
                <li
                  v-for="tech in stack"
                  :key="tech"
                  class="text-sm text-gray-600 dark:text-white/60"
                >
                  {{ tech }}
                </li>
              </ul>
            </div>

            <!-- Contact -->
            <div>
              <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-500 dark:text-cyan-400">
                {{ t('footer.col_contact') }}
              </p>
              <ul class="space-y-3">
                <li>
                  <a
                    href="mailto:info@antoinequarroz.ch"
                    class="text-sm text-gray-600 transition-colors hover:text-violet-600 dark:text-white/60 dark:hover:text-violet-400"
                  >
                    antoine@quarroz.dev
                  </a>
                </li>
                <li class="text-sm text-gray-600 dark:text-white/60">
                  Valais, Suisse
                </li>
                <li class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-white/60">
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
                  {{ t('contact.info.availability') }}
                </li>
              </ul>
            </div>

            <!-- Local SEO -->
            <div>
              <p class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500 dark:text-violet-400">
                Local
              </p>
              <ul class="space-y-3">
                <li v-for="item in localSeoLinks" :key="item.href">
                  <NuxtLink
                    :to="item.href"
                    class="text-sm text-gray-600 transition-colors hover:text-violet-600 dark:text-white/60 dark:hover:text-violet-400"
                  >
                    {{ item.label }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <!-- Divider -->
        <div class="relative my-8 h-px bg-gradient-to-r from-violet-500/20 via-fuchsia-400/10 to-transparent" />

        <!-- Bottom bar -->
        <div class="relative flex flex-col items-center justify-between gap-2 text-xs text-gray-400 dark:text-white/30 sm:flex-row">
          <span>© {{ year }} Antoine Quarroz · {{ t('footer.rights') }}</span>
          <span>{{ t('footer.made_with') }}</span>
        </div>
      </div>
    </div>
  </footer>
</template>
