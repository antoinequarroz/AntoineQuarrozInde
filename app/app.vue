<script setup lang="ts">
import { resolvePublicSocialImage } from '~~/shared/utils/publicSeoIdentity'

const { locale, t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const defaultSocialImage = computed(() => resolvePublicSocialImage(
  String(runtimeConfig.public.siteUrl),
).url)

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

useSeoMeta({
  ogImage: () => defaultSocialImage.value,
  ogImageAlt: () => t('seo.social.default_image_alt'),
  twitterCard: 'summary_large_image',
  twitterImage: () => defaultSocialImage.value,
  twitterImageAlt: () => t('seo.social.default_image_alt'),
})
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
