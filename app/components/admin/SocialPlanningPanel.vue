<script setup lang="ts">
import type { SocialPost } from '../../../shared/types/socialEditorial'
import { canMoveSocialPost } from '~/utils/socialCalendarMove'

defineProps<{
  posts: SocialPost[]
  rejectedCount: number
  showRejected: boolean
  moveDisabled?: boolean
  draggingId?: string | null
  hovered?: boolean
}>()
defineEmits<{
  open: [post: SocialPost]
  move: [post: SocialPost]
  remove: [post: SocialPost]
  restore: [post: SocialPost]
  'show-rejected': []
  'show-active': []
  'drag-start': [post: SocialPost, event: DragEvent]
  'drag-end': []
}>()
</script>

<template>
  <aside
    class="relative flex min-w-0 flex-col self-start overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#111118] 2xl:sticky 2xl:top-24"
    :class="hovered ? 'ring-2 ring-inset ring-violet-500 dark:ring-violet-400' : ''"
    :aria-label="showRejected ? 'Refusés' : 'À planifier'"
    data-calendar-unplanned
  >
    <header class="shrink-0 border-b border-gray-200 px-4 pb-3 pt-4 dark:border-white/[0.07]">
      <div class="flex items-center justify-between gap-3">
        <h2 class="flex items-center gap-2 font-display text-base font-semibold text-gray-950 dark:text-white">
          <AdminIcon :icon="showRejected ? 'folder' : 'calendar'" class="h-4 w-4 text-violet-600 dark:text-violet-300" aria-hidden="true" />
          {{ showRejected ? 'Refusés' : 'À planifier' }}
        </h2>
        <span class="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-violet-800 dark:bg-violet-500/15 dark:text-violet-200" aria-live="polite">{{ posts.length }}</span>
      </div>
      <p class="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{{ showRejected ? 'Ces contenus sont conservés. Restaure un brouillon pour le préparer à nouveau.' : hovered ? 'Dépose ici pour retirer la date souhaitée.' : 'Choisis une date ou glisse un brouillon dans le calendrier.' }}</p>
    </header>
    <div
      data-planning-list
      role="region"
      :aria-label="showRejected ? 'Liste des publications refusées' : 'Liste des brouillons à planifier'"
      tabindex="0"
      class="social-planning-list min-h-0 overflow-y-auto overscroll-contain p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-violet-500"
    >
      <div class="grid items-start gap-3 sm:grid-cols-2 2xl:grid-cols-1">
        <AdminSocialPostTile
          v-for="post in posts" :key="post.id" :post="post" compact planning
          :movable="canMoveSocialPost(post)" :removable="canMoveSocialPost(post)"
          :restorable="post.status === 'rejected'" :move-disabled="moveDisabled" :dragging="draggingId === post.id"
          @open="$emit('open', $event)" @move="$emit('move', $event)" @remove="$emit('remove', $event)" @restore="$emit('restore', $event)"
          @drag-start="(post, event) => $emit('drag-start', post, event)" @drag-end="$emit('drag-end')"
        />
      </div>
      <div v-if="!posts.length" class="px-3 py-7 text-center">
        <AdminIcon :icon="showRejected ? 'folder' : 'check-square'" class="mx-auto mb-3 h-6 w-6 text-violet-500 dark:text-violet-300" aria-hidden="true" />
        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ showRejected ? 'Aucun contenu refusé' : 'Tout est à sa place' }}</p>
        <p class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{{ showRejected ? 'Les brouillons retirés apparaîtront ici.' : 'Aucun brouillon sans date pour ces filtres.' }}</p>
      </div>
    </div>
    <footer class="shrink-0 border-t border-gray-200 px-3 pb-3 pt-2 dark:border-white/[0.07]">
      <button v-if="showRejected" type="button" class="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-violet-300 dark:hover:bg-violet-500/10" :disabled="moveDisabled" @click="$emit('show-active')">Revenir aux brouillons</button>
      <button v-else-if="rejectedCount" type="button" class="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-xs text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-gray-400 dark:hover:bg-white/[0.04]" :disabled="moveDisabled" @click="$emit('show-rejected')"><span>Voir les refusés ({{ rejectedCount }})</span><span aria-hidden="true">→</span></button>
      <p v-if="!showRejected" class="px-1 pt-1 text-[11px] leading-4 text-gray-500 dark:text-gray-400">Ta validation reste nécessaire avant tout envoi.</p>
    </footer>
  </aside>
</template>

<style scoped>
.social-planning-list {
  max-height: min(32rem, 60dvh);
  scrollbar-width: thin;
  scrollbar-color: #a78bfa transparent;
  scrollbar-gutter: stable;
}
@media (min-width: 1536px) {
  .social-planning-list { max-height: min(36rem, max(12rem, calc(100dvh - 22rem))); }
}
</style>
