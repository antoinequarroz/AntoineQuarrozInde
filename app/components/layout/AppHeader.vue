<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const scrollY = useWindowScroll().y
const isScrolled = computed(() => scrollY.value > 70)

const isMenuOpen = ref(false)

const menuLabels = computed(() => ({
  open: t('nav.open_menu'),
  close: t('nav.close_menu'),
  title: t('nav.mobile_menu'),
}))

const navLinks = computed(() => [
  { key: 'home', href: `${localePath('/')}#hero` },
  { key: 'about', href: `${localePath('/')}#about` },
  { key: 'services', href: `${localePath('/')}#services` },
  { key: 'portfolio', href: `${localePath('/')}#portfolio` },
  ...(locale.value === 'fr' ? [{ key: 'blog', href: `${localePath('/')}#blog` }] : []),
  { key: 'contact', href: `${localePath('/')}#contact` },
])

function closeMenu() {
  isMenuOpen.value = false
}

const { dialogRef, handleDialogKeydown } = useAccessibleDialog(
  isMenuOpen,
  closeMenu,
  '[data-menu-first]',
)

watch(isMenuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-[padding] duration-500"
    :class="isScrolled ? 'py-1 md:py-2' : 'py-1.5 md:py-3'"
  >
    <div class="section-container flex justify-center">
      <div
        class="w-full max-w-4xl grid grid-cols-[auto_1fr_auto] items-center gap-1 md:gap-3 rounded-full border px-2 max-[390px]:px-1.5 sm:px-5 py-1 md:py-2.5 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300"
        :class="isScrolled
          ? 'bg-white/92 dark:bg-surface-dark/92 border-gray-200/70 dark:border-white/10 backdrop-blur-xl shadow-lg shadow-violet-500/10'
          : 'bg-white/12 dark:bg-white/5 border-white/25 dark:border-white/15 backdrop-blur-md'"
      >
        <!-- Left -->
        <div class="flex items-center gap-2.5">
          <NuxtLink :to="localePath('/')" :aria-label="`${t('nav.home')} — Antoine Quarroz`" class="h-11 w-11 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-sm">
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
        <div class="justify-self-end flex items-center gap-1.5 md:gap-2">
          <UiLangSwitcher />
          <UiThemeToggle />
          <a
            :href="`${localePath('/')}#contact`"
            class="hidden md:inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            :class="isScrolled ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-white text-black hover:bg-white/90'"
          >
            {{ t('nav.contact') }}
          </a>
          <button
            id="mobile-menu-trigger"
            class="md:hidden h-11 w-11 rounded-full flex items-center justify-center transition-colors"
            :class="isScrolled ? 'bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200' : 'bg-white/15 text-white'"
            :aria-label="isMenuOpen ? menuLabels.close : menuLabels.open"
            :aria-expanded="isMenuOpen"
            aria-controls="mobile-navigation"
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
        id="mobile-navigation"
        ref="dialogRef"
        class="md:hidden fixed inset-0 z-50 backdrop-blur-2xl bg-[#07070f]/96"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
        tabindex="-1"
        @keydown="handleDialogKeydown"
      >
        <div class="section-container h-full flex flex-col pt-5 pb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-sm">
                <span class="font-display font-bold text-white text-sm">AQ</span>
              </div>
              <div>
                <div id="mobile-menu-title" class="font-display font-semibold text-white"><span class="text-gradient">{{ menuLabels.title }}</span></div>
                <div class="hidden sm:block text-xs text-gray-500 dark:text-gray-400">{{ t('footer.tagline') }}</div>
              </div>
            </div>
            <button
              class="w-11 h-11 rounded-xl flex items-center justify-center transition-colors bg-white/10 text-white hover:bg-white/20"
              :aria-label="menuLabels.close"
              @click="closeMenu"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="mt-4 flex items-center gap-2">
            <UiLangSwitcher />
            <UiThemeToggle />
          </div>

          <nav class="flex-1 flex flex-col justify-center gap-2 mt-5">
            <a
              v-for="(link, idx) in navLinks"
              :key="link.href"
              :href="link.href"
              class="px-4 py-3.5 rounded-xl text-xl max-[390px]:text-lg font-display font-semibold
                     transition-[background-color,color,transform] duration-200 text-white/90 hover:bg-white/10 hover:text-white"
              :data-menu-first="idx === 0 ? '' : undefined"
              :style="{ transitionDelay: `${idx * 40}ms` }"
              @click="closeMenu"
            >
              {{ t(`nav.${link.key}`) }}
            </a>
          </nav>

          <a :href="`${localePath('/')}#contact`" class="btn-primary w-full justify-center py-4 text-base" @click="closeMenu">
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
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.menu-icon-enter-from,
.menu-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}
</style>
