<script setup lang="ts">
import type { SocialPost } from '../../../shared/types/socialEditorial'
import { socialPlatformLabel, socialPostCalendarIso, socialPostFormat, socialPostMedia } from '~/utils/socialCalendar'
const props = defineProps<{ post: SocialPost, compact?: boolean, movable?: boolean, moveDisabled?: boolean, dragging?: boolean }>()
defineEmits<{ open: [post: SocialPost], move: [post: SocialPost], 'drag-start': [post: SocialPost, event: DragEvent], 'drag-end': [] }>()
const firstImage = computed(() => socialPostMedia(props.post).find(item => item.type === 'image'))
const date = computed(() => {
  const iso = socialPostCalendarIso(props.post)
  return iso ? new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : ''
})
const format = computed(() => ({ image: 'Image', carousel: 'Carrousel', video: 'Vidéo', document: 'PDF', text: 'Texte' })[socialPostFormat(props.post)])
const status = computed(() => ({ draft: 'À valider', approved: props.post.publication_mode === 'automatic' ? 'Programmé' : 'Validé · manuel', publishing: 'Envoi en cours', published: 'Publié', rejected: 'Refusé', failed: 'À corriger' })[props.post.status])
</script>

<template>
  <div class="min-w-0" :class="dragging ? 'opacity-40' : ''">
  <button type="button" class="social-post-tile group w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-colors hover:border-violet-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-white/10 dark:bg-[#181821] dark:hover:border-violet-400/60" :class="movable && !moveDisabled ? 'cursor-grab active:cursor-grabbing' : ''" :draggable="Boolean(movable && !moveDisabled)" :disabled="moveDisabled" :data-social-post-id="post.id" :aria-label="`Ouvrir ${post.article_title} sur ${socialPlatformLabel(post.platform)}`" @click="$emit('open', post)" @dragstart="$emit('drag-start', post, $event)" @dragend="$emit('drag-end')">
    <img v-if="firstImage && !compact" :src="firstImage.url" alt="" loading="lazy" draggable="false" class="h-24 w-full border-b border-gray-100 object-cover dark:border-white/10">
    <div class="space-y-2 p-3">
      <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold"><AdminSocialPlatformBadge :platform="post.platform" compact /><time v-if="date" class="tabular-nums text-gray-500 dark:text-gray-400">{{ date }}</time></div>
      <p class="line-clamp-3 break-words text-sm font-semibold leading-5 text-gray-900 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-200">{{ post.article_title }}</p>
      <div class="flex flex-wrap items-center gap-1.5 text-[10px] leading-4"><span class="rounded-md px-1.5 py-0.5" :class="post.status === 'failed' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : post.status === 'published' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300'">{{ status }}</span><span class="text-gray-500 dark:text-gray-400">{{ format }}</span></div>
    </div>
  </button>
  <button v-if="movable" type="button" class="mt-1 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-wait disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-500/10" :aria-label="`Déplacer ${post.article_title} sur ${socialPlatformLabel(post.platform)}`" :disabled="moveDisabled" @click="$emit('move', post)"><svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01" /></svg>Déplacer</button>
  </div>
</template>
