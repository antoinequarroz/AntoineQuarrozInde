<script setup lang="ts">
import type { SocialPost } from '../../../shared/types/socialEditorial'
import { socialPlatformLabel, socialPostMedia } from '~/utils/socialCalendar'
const props = defineProps<{ post: SocialPost }>()
const index = ref(0)
const media = computed(() => socialPostMedia(props.post))
const item = computed(() => media.value[index.value])
watch(() => props.post.id, () => { index.value = 0 })
watch(() => media.value.length, () => { index.value = Math.min(index.value, Math.max(0, media.value.length - 1)) })
</script>

<template>
  <section :aria-label="`Aperçu ${socialPlatformLabel(post.platform)}`" class="min-w-0 space-y-3">
    <div class="flex items-center justify-between gap-2"><h3 class="text-sm font-semibold">Aperçu {{ socialPlatformLabel(post.platform) }}</h3><span class="text-xs text-gray-500">Rendu indicatif</span></div>
    <article class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#101016]">
      <div class="flex items-center gap-3 p-4"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-600 text-sm font-bold text-white" aria-hidden="true">AQ</span><div><p class="text-sm font-semibold">Antoine Quarroz</p><p class="text-xs text-gray-500">{{ socialPlatformLabel(post.platform) }}</p></div></div>
      <p v-if="post.platform !== 'instagram'" class="whitespace-pre-wrap break-words px-4 pb-4 text-sm leading-6">{{ post.content }}</p>
      <div v-if="item" class="relative bg-gray-100 dark:bg-black/40">
        <img v-if="item.type === 'image'" :key="item.url" :src="item.url" :alt="item.alt" class="max-h-[32rem] w-full object-contain">
        <video v-else :key="`video-${item.url}`" :src="item.url" controls playsinline preload="metadata" :aria-label="item.alt || 'Vidéo du post'" class="max-h-[32rem] w-full" />
        <p v-if="media.length > 1" class="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs tabular-nums text-white">{{ index + 1 }} / {{ media.length }}</p>
      </div>
      <div v-if="media.length > 1" class="flex items-center justify-between gap-3 border-t border-gray-100 px-3 py-2 dark:border-white/10"><button type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-30" :disabled="index === 0" aria-label="Média précédent de l’aperçu" @click="index--">← Précédent</button><button type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-30" :disabled="index >= media.length - 1" aria-label="Média suivant de l’aperçu" @click="index++">Suivant →</button></div>
      <AdminSocialDocumentPreview v-if="post.media_kind === 'document' && post.media_url" :url="post.media_url" :title="post.media_title || 'Carrousel LinkedIn'" />
      <p v-if="post.platform === 'instagram'" class="whitespace-pre-wrap break-words p-4 text-sm leading-6">{{ post.content }}</p>
      <p v-if="!media.length && post.media_kind !== 'document'" class="border-t border-gray-100 p-4 text-xs text-gray-500 dark:border-white/10">Publication texte · aucun média joint</p>
    </article>
    <p class="text-xs leading-5 text-gray-500 dark:text-gray-400">Vérifie le texte, l’ordre des médias et leur cadrage. La plateforme peut adapter leur affichage.</p>
  </section>
</template>
