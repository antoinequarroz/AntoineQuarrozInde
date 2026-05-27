<script setup lang="ts">
const { t } = useI18n()
const year = new Date().getFullYear()

const socials = [
  { name: 'GitHub', href: 'https://github.com/antoinequarroz', icon: 'github' },
  { name: 'LinkedIn', href: 'https://linkedin.com/in/antoinequarroz', icon: 'linkedin' },
]

const navLinks = computed(() => [
  { key: 'about', href: '/#about' },
  { key: 'services', href: '/#services' },
  { key: 'portfolio', href: '/#portfolio' },
  { key: 'contact', href: '/#contact' },
])
</script>

<template>
  <footer class="relative overflow-hidden border-t border-gray-200/50 dark:border-white/10 bg-[#f7f7fb] dark:bg-[#05050c]">
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl bg-violet-500/15 dark:bg-violet-500/20" />
      <div class="absolute -bottom-28 -right-20 w-72 h-72 rounded-full blur-3xl bg-cyan-500/12 dark:bg-cyan-500/15" />
    </div>

    <div class="section-container relative py-16 md:py-20">
      <div class="text-center md:text-left">
        <p class="text-xs tracking-[0.2em] uppercase text-gray-500 dark:text-gray-400">Let's Build</p>
        <h2 class="mt-3 font-display font-bold text-4xl md:text-6xl lg:text-7xl leading-[0.95] text-gray-900 dark:text-white">
          <span class="text-gradient">Digital Work</span>
          <span class="block text-gradient">That People Remember</span>
        </h2>
      </div>

      <div class="mt-10 grid md:grid-cols-3 gap-8 items-start">
        <div>
          <NuxtLink to="/" class="flex items-center gap-2.5 group w-fit">
            <div class="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-sm">
              <span class="font-display font-bold text-white text-sm">AQ</span>
            </div>
            <span class="font-display font-semibold text-gray-900 dark:text-white">
              <span class="text-gradient">Antoine Quarroz</span>
            </span>
          </NuxtLink>
          <p class="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs">{{ t('footer.tagline') }}</p>
        </div>

        <nav class="flex flex-wrap gap-x-6 gap-y-2 md:justify-center">
          <a
            v-for="link in navLinks"
            :key="link.key"
            :href="link.href"
            class="text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            {{ t(`nav.${link.key}`) }}
          </a>
        </nav>

        <div class="flex items-center gap-3 md:justify-end">
          <a
            v-for="social in socials"
            :key="social.name"
            :href="social.href"
            target="_blank"
            rel="noopener noreferrer"
            class="w-9 h-9 rounded-xl flex items-center justify-center
                   bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400
                   hover:bg-violet-100 dark:hover:bg-violet-500/20 hover:text-violet-600 dark:hover:text-violet-400
                   transition-all duration-200"
            :aria-label="social.name"
          >
            <!-- GitHub -->
            <svg v-if="social.icon === 'github'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            <!-- LinkedIn -->
            <svg v-else-if="social.icon === 'linkedin'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </div>

      <div class="mt-10 pt-6 border-t border-gray-200/60 dark:border-white/10 flex items-center justify-center text-xs text-gray-400">
        <span>© {{ year }} Antoine Quarroz. {{ t('footer.rights') }}</span>
      </div>
    </div>
  </footer>
</template>
