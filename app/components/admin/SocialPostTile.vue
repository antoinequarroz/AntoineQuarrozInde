<script setup lang="ts">
import type { SocialPost } from '../../../shared/types/socialEditorial'
import { socialPlatformLabel, socialPostCalendarIso, socialPostFormat, socialPostMedia } from '~/utils/socialCalendar'
const props = defineProps<{ post: SocialPost, compact?: boolean, planning?: boolean, movable?: boolean, removable?: boolean, restorable?: boolean, moveDisabled?: boolean, dragging?: boolean }>()
defineEmits<{ open: [post: SocialPost], move: [post: SocialPost], remove: [post: SocialPost], restore: [post: SocialPost], 'drag-start': [post: SocialPost, event: DragEvent], 'drag-end': [] }>()
const firstImage = computed(() => socialPostMedia(props.post).find(item => item.type === 'image'))
const date = computed(() => {
  const iso = socialPostCalendarIso(props.post)
  return iso ? new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : ''
})
const format = computed(() => ({ image: 'Image', carousel: 'Carrousel', video: 'Vidéo', document: 'PDF', text: 'Texte' })[socialPostFormat(props.post)])
const status = computed(() => ({ draft: 'À valider', approved: props.post.publication_mode === 'automatic' ? 'Programmé' : 'Validé · manuel', publishing: 'Envoi en cours', published: 'Publié', rejected: 'Refusé', failed: 'À corriger' })[props.post.status])
</script>

<template>
  <div class="min-w-0" :class="[dragging ? 'opacity-40' : '', planning ? 'overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#181821]' : '']">
  <button type="button" class="social-post-tile group w-full min-w-0 overflow-hidden text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-violet-500" :class="[planning ? 'rounded-t-xl hover:bg-violet-50/70 dark:hover:bg-violet-500/[0.06]' : 'rounded-xl border border-gray-200 bg-white hover:border-violet-400 dark:border-white/10 dark:bg-[#181821] dark:hover:border-violet-400/60', movable && !moveDisabled ? 'cursor-grab active:cursor-grabbing' : '']" :draggable="Boolean(movable && !moveDisabled)" :disabled="moveDisabled" :data-social-post-id="post.id" :aria-label="`Ouvrir ${post.article_title} sur ${socialPlatformLabel(post.platform)}`" @click="$emit('open', post)" @dragstart="$emit('drag-start', post, $event)" @dragend="$emit('drag-end')">
    <img v-if="firstImage && !compact" :src="firstImage.url" alt="" loading="lazy" draggable="false" class="h-24 w-full border-b border-gray-100 object-cover dark:border-white/10">
    <div class="space-y-2 p-3">
      <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold"><AdminSocialPlatformBadge :platform="post.platform" compact /><time v-if="date" class="tabular-nums text-gray-500 dark:text-gray-400">{{ date }}</time></div>
      <div class="flex items-start gap-3"><p class="min-w-0 flex-1 line-clamp-3 break-words text-sm font-semibold leading-5 text-gray-900 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-200">{{ post.article_title }}</p><img v-if="firstImage && compact && planning" :src="firstImage.url" alt="" loading="lazy" draggable="false" class="mt-0.5 aspect-video w-16 shrink-0 rounded-md object-contain ring-1 ring-inset ring-black/10 dark:ring-white/10"></div>
      <div class="flex flex-wrap items-center gap-1.5 text-[10px] leading-4"><span class="rounded-md px-1.5 py-0.5" :class="post.status === 'failed' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : post.status === 'published' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300'">{{ status }}</span><span class="text-gray-500 dark:text-gray-400">{{ format }}</span></div>
    </div>
  </button>
  <div v-if="movable || removable || restorable" class="flex flex-wrap items-center gap-1" :class="planning ? 'border-t border-gray-100 px-1.5 dark:border-white/[0.06]' : 'mt-1'">
    <button v-if="movable" type="button" class="inline-flex min-h-11 max-w-full flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-violet-500 disabled:cursor-wait disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-500/10" :aria-label="`Déplacer ${post.article_title} sur ${socialPlatformLabel(post.platform)}`" :disabled="moveDisabled" @click="$emit('move', post)"><AdminIcon icon="calendar" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Déplacer</button>
    <button v-if="removable" type="button" class="inline-flex min-h-11 max-w-full flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-red-500 disabled:cursor-wait disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-300" :aria-label="`Supprimer ${post.article_title} sur ${socialPlatformLabel(post.platform)}`" :disabled="moveDisabled" @click="$emit('remove', post)"><svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>Supprimer</button>
    <button v-if="restorable" type="button" class="inline-flex min-h-11 max-w-full flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-violet-500 disabled:cursor-wait disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-500/10" :aria-label="`Restaurer ${post.article_title} sur ${socialPlatformLabel(post.platform)}`" :disabled="moveDisabled" @click="$emit('restore', post)"><AdminIcon icon="refresh-cw" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Restaurer</button>
  </div>
  </div>
</template>
