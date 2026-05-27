<script setup lang="ts">
const { t } = useI18n()
const colorMode = useColorMode()
const isMobile = useMediaQuery('(max-width: 767px)')

watchEffect(() => {
  if (isMobile.value && colorMode.preference !== 'dark') {
    colorMode.preference = 'dark'
  }
})
</script>

<template>
  <div>
    <LayoutAppHeader />
    <main>
      <slot />
    </main>
    <a
      href="/#contact"
      class="md:hidden fixed bottom-[max(0.9rem,env(safe-area-inset-bottom))] left-3 right-3 z-40 btn-primary justify-center py-3 text-sm shadow-glow"
    >
      {{ t('hero.cta_primary') }}
    </a>
    <LayoutAppFooter />
  </div>
</template>
