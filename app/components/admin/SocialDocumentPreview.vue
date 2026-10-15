<script setup lang="ts">
import { createSocialDocumentPreviewLoader, socialDocumentManifestUrl, type SocialDocumentPage } from '~/utils/socialDocumentPreview'

const props = defineProps<{ url: string, title: string }>()
const pages = ref<SocialDocumentPage[]>([])
const state = ref<'loading' | 'ready' | 'unavailable'>('loading')
const pdfHref = computed(() => {
  try { socialDocumentManifestUrl(props.url); return props.url }
  catch { return null }
})
const loader = createSocialDocumentPreviewLoader((url, { signal }) => $fetch(url, { signal, timeout: 5000, retry: 0 }))
function onPageError(src: string) {
  if (pages.value.some(page => page.src === src)) state.value = 'unavailable'
}
watch(() => props.url, async (url) => {
  pages.value = []
  state.value = 'loading'
  const result = await loader.load(url)
  if (result.state === 'stale') return
  pages.value = result.pages
  state.value = result.state
}, { immediate: true })
onBeforeUnmount(() => loader.cancel())
</script>

<template>
  <section class="mt-4 overflow-hidden rounded-xl border border-violet-200/80 bg-violet-50/60 dark:border-violet-400/20 dark:bg-violet-500/[0.06]" aria-label="Carrousel LinkedIn joint">
    <div class="flex items-center justify-between gap-3 border-b border-violet-200/70 px-4 py-3 dark:border-violet-400/15">
      <div class="min-w-0">
        <span class="inline-flex rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">Carrousel joint</span>
        <p class="mt-2 truncate text-sm font-semibold text-gray-950 dark:text-white">{{ title }}</p>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">PDF feuilletable · joint après autorisation de publication</p>
      </div>
      <a v-if="pdfHref" :href="pdfHref" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-[.96] dark:border-violet-400/20 dark:bg-white/[0.05] dark:text-violet-200">Ouvrir le PDF ↗</a>
    </div>
    <div class="bg-white/80 p-4 dark:bg-[#0b0b11]" :aria-label="`Aperçu du carrousel ${title}`">
      <p v-if="state === 'loading'" role="status" class="text-sm text-gray-600 dark:text-gray-300">Chargement de l’aperçu du carrousel…</p>
      <template v-else-if="state === 'ready'">
        <div class="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500" tabindex="0" :aria-label="`Feuilleter les ${pages.length} pages du carrousel`">
          <figure v-for="(page, index) in pages" :key="page.src" class="w-[min(78vw,18rem)] shrink-0 snap-center overflow-hidden rounded-xl border border-gray-200 bg-[#07070d] shadow-sm dark:border-white/[0.1]">
            <a :href="page.src" target="_blank" rel="noopener noreferrer" :aria-label="`Ouvrir la page ${index + 1} sur ${pages.length} en grand`" class="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-500">
              <img :src="page.src" :alt="page.alt" class="block h-auto w-full object-contain" :loading="index === 0 ? 'eager' : 'lazy'" @error="onPageError(page.src)">
            </a>
            <figcaption class="border-t border-white/10 px-3 py-2 text-right text-xs font-semibold tabular-nums text-white">{{ index + 1 }} / {{ pages.length }}</figcaption>
          </figure>
        </div>
        <p class="mt-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Fais défiler horizontalement pour relire les {{ pages.length }} pages avant publication.</p>
      </template>
      <p v-else role="status" class="text-sm leading-6 text-gray-600 dark:text-gray-300">Aperçu indisponible. Ouvre le PDF pour relire le carrousel avant de valider.</p>
    </div>
  </section>
</template>
