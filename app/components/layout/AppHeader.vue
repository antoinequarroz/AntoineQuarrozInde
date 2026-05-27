<script setup lang="ts">
const { t } = useI18n()
const scrollY = useWindowScroll().y
const isScrolled = computed(() => scrollY.value > 70)

const isMenuOpen = ref(false)

const navLinks = computed(() => [
  { key: 'home', href: '/#hero' },
  { key: 'about', href: '/#about' },
  { key: 'services', href: '/#services' },
  { key: 'portfolio', href: '/#portfolio' },
  { key: 'blog', href: '/#blog' },
  { key: 'contact', href: '/#contact' },
])

function closeMenu() {
  isMenuOpen.value = false
}
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
    :class="isScrolled ? 'py-2' : 'py-3'"
  >
    <div class="section-container flex justify-center">
      <div
        class="w-full max-w-4xl grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-full border px-3 sm:px-5 py-2.5 transition-all duration-300"
        :class="isScrolled
          ? 'bg-white/92 dark:bg-surface-dark/92 border-gray-200/70 dark:border-white/10 backdrop-blur-xl shadow-lg shadow-violet-500/10'
          : 'bg-white/12 dark:bg-white/5 border-white/25 dark:border-white/15 backdrop-blur-md'"
      >
        <!-- Left -->
        <div class="flex items-center gap-2.5">
          <NuxtLink to="/" class="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-sm">
            <span class="font-display font-bold text-white text-xs">AQ</span>
          </NuxtLink>
          <span
            class="hidden sm:block font-display text-sm font-semibold transition-colors"
            :class="isScrolled ? 'text-gray-900 dark:text-white' : 'text-white/95'"
          >
            <span class="text-gradient">Antoine Quarroz</span>
          </span>
        </div>

        <!-- Center Desktop -->
        <nav class="hidden md:flex items-center justify-center gap-7">
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            class="text-sm font-medium transition-colors"
            :class="isScrolled ? 'text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400' : 'text-white/90 hover:text-white'"
          >
            {{ t(`nav.${link.key}`) }}
          </a>
        </nav>

        <!-- Right -->
        <div class="justify-self-end flex items-center gap-2">
          <UiLangSwitcher />
          <UiThemeToggle />
          <a
            href="/#contact"
            class="hidden md:inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            :class="isScrolled ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-white text-black hover:bg-white/90'"
          >
            {{ t('nav.contact') }}
          </a>
          <button
            class="md:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            :class="isScrolled ? 'bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200' : 'bg-white/15 text-white'"
            :aria-label="isMenuOpen ? 'Close menu' : 'Open menu'"
            @click="isMenuOpen = !isMenuOpen"
          >
            <Transition name="menu-icon" mode="out-in">
              <svg v-if="!isMenuOpen" key="open" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg v-else key="close" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Transition>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <Transition name="mobile-menu">
      <div
        v-if="isMenuOpen"
        class="md:hidden fixed inset-0 z-50 backdrop-blur-2xl"
        :class="isScrolled
          ? 'bg-white/95 dark:bg-[#07070f]/96'
          : 'bg-black/85 dark:bg-[#07070f]/96'"
      >
        <div class="section-container h-full flex flex-col pt-8 pb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-sm">
                <span class="font-display font-bold text-white text-sm">AQ</span>
              </div>
              <div>
                <div class="font-display font-semibold text-gray-900 dark:text-white"><span class="text-gradient">Antoine Quarroz</span></div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ t('footer.tagline') }}</div>
              </div>
            </div>
            <button
              class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              :class="isScrolled
                ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
                : 'bg-white/10 text-white hover:bg-white/20'"
              aria-label="Close menu"
              @click="closeMenu"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="mt-6 flex items-center gap-2">
            <UiLangSwitcher />
            <UiThemeToggle />
          </div>

          <nav class="flex-1 flex flex-col justify-center gap-3 mt-8">
            <a
              v-for="(link, idx) in navLinks"
              :key="link.href"
              :href="link.href"
              class="px-5 py-4 rounded-xl text-2xl font-display font-semibold
                     transition-all duration-200"
              :class="isScrolled
                ? 'text-gray-900 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                : 'text-white/90 hover:bg-white/10 hover:text-white'"
              :style="{ transitionDelay: `${idx * 40}ms` }"
              @click="closeMenu"
            >
              {{ t(`nav.${link.key}`) }}
            </a>
          </nav>

          <a href="/#contact" class="btn-primary w-full justify-center py-4 text-base" @click="closeMenu">
            {{ t('nav.contact') }}
          </a>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.menu-icon-enter-active,
.menu-icon-leave-active {
  transition: all 0.15s ease;
}
.menu-icon-enter-from,
.menu-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.3s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}
</style>
