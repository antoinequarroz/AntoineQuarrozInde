<script setup lang="ts">
const { locale } = useI18n()

const documentLanguage = computed(() => ({
  fr: 'fr-CH',
  en: 'en-US',
  de: 'de-CH',
}[locale.value] ?? locale.value))

useHead(() => ({
  htmlAttrs: {
    lang: documentLanguage.value,
  },
}))
</script>

<template>
    <div>
        <NuxtRouteAnnouncer />
        <NuxtLayout>
            <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
        </NuxtLayout>
        <UiAppToast />
    </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
    transition:
        opacity 0.2s ease,
        transform 0.2s ease;
}
.page-enter-from {
    opacity: 0;
    transform: translateY(8px);
}
.page-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
