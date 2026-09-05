<script setup lang="ts">
const { t } = useI18n()
const colorMode = useColorMode()
const isMobile = useMediaQuery('(max-width: 767px)')

onMounted(() => {
  watchEffect(() => {
    if (isMobile.value && colorMode.preference !== 'dark') {
      colorMode.preference = 'dark'
    }
  })
})
</script>

<template>
  <div>
    <a
      href="#main-content"
      class="fixed left-4 top-3 z-[100] -translate-y-24 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-violet-800 shadow-xl transition-transform duration-150 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-[#11111b] dark:text-violet-100"
    >
      {{ t('nav.skip_to_content') }}
    </a>
    <LayoutAppHeader />
    <main id="main-content" tabindex="-1">
      <slot />
    </main>
    <LayoutAppFooter />
  </div>
</template>
