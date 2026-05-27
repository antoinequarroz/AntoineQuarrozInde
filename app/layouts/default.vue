<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <LayoutAppHeader />
    <main>
      <slot />
    </main>
    <a
      href="/#contact"
      class="md:hidden fixed bottom-4 left-4 right-4 z-40 btn-primary justify-center py-3.5 shadow-glow"
    >
      {{ t('hero.cta_primary') }}
    </a>
    <LayoutAppFooter />
  </div>
</template>
