<script setup lang="ts">
import type { SocialPost } from '../../../shared/types/socialEditorial'
import { calendarDays, socialPostCalendarIso } from '~/utils/socialCalendar'
import { zurichDateKey } from '../../../shared/utils/socialDateTime'
const props = defineProps<{ posts: SocialPost[], anchor: string, view: 'week' | 'month' }>()
defineEmits<{ open: [post: SocialPost] }>()
const days = computed(() => calendarDays(props.anchor, props.view))
const today = computed(() => zurichDateKey(new Date().toISOString()))
const sorted = computed(() => [...props.posts].filter(post => socialPostCalendarIso(post)).sort((a, b) => Date.parse(socialPostCalendarIso(a)!) - Date.parse(socialPostCalendarIso(b)!)))
const postsByDay = computed(() => {
  const result = new Map<string, SocialPost[]>()
  for (const post of sorted.value) {
    const key = zurichDateKey(socialPostCalendarIso(post)!)
    result.set(key, [...(result.get(key) || []), post])
  }
  return result
})
const visibleAgendaDays = computed(() => days.value.filter(day => props.view === 'week' || day.slice(0, 7) === props.anchor.slice(0, 7)))
function label(day: string, full = false) {
  return new Intl.DateTimeFormat('fr-CH', { timeZone: 'UTC', weekday: full ? 'long' : 'short', day: 'numeric', month: full ? 'long' : undefined }).format(new Date(`${day}T12:00:00Z`))
}
</script>

<template>
  <section aria-label="Calendrier éditorial" class="min-w-0">
    <div class="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 md:block">
      <div class="grid grid-cols-7 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.03]" aria-hidden="true"><p v-for="day in ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.']" :key="day" class="px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">{{ day }}</p></div>
      <div class="grid grid-cols-7 bg-gray-100 dark:bg-white/[0.05]">
        <section v-for="day in days" :key="day" :aria-label="label(day, true)" class="min-w-0 border-b border-r border-gray-200 bg-white p-2 dark:border-white/[0.07] dark:bg-[#111118]" :class="[view === 'week' ? 'min-h-80' : 'min-h-40', view === 'month' && day.slice(0, 7) !== anchor.slice(0, 7) ? 'bg-gray-50/80 dark:bg-[#0d0d13]' : '']">
          <h3 class="mb-3 flex h-7 items-center text-xs font-semibold"><time :datetime="day" :aria-current="day === today ? 'date' : undefined" class="rounded-md px-2 py-1" :class="day === today ? 'bg-violet-600 text-white' : 'text-gray-500 dark:text-gray-400'">{{ view === 'week' ? label(day) : Number(day.slice(-2)) }}</time></h3>
          <div class="space-y-2"><AdminSocialPostTile v-for="post in postsByDay.get(day) || []" :key="post.id" :post="post" :compact="view === 'month'" @open="$emit('open', $event)" /></div>
        </section>
      </div>
    </div>
    <div class="space-y-5 md:hidden" aria-label="Agenda mobile">
      <section v-for="day in visibleAgendaDays" :key="day" :aria-label="label(day, true)"><h3 class="mb-2 flex items-center gap-2 text-sm font-semibold capitalize"><span v-if="day === today" class="h-2 w-2 rounded-full bg-violet-500" aria-hidden="true" /><time :datetime="day" :aria-current="day === today ? 'date' : undefined">{{ label(day, true) }}</time></h3><div v-if="postsByDay.get(day)?.length" class="space-y-2"><AdminSocialPostTile v-for="post in postsByDay.get(day)" :key="post.id" :post="post" compact @open="$emit('open', $event)" /></div><p v-else class="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-white/10">Aucune publication prévue</p></section>
    </div>
  </section>
</template>
