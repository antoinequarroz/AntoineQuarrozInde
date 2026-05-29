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
    <UiCustomCursor />
    <LayoutAppHeader />
    <main>
      <slot />
    </main>
    <LayoutAppFooter />
  </div>
</template>
