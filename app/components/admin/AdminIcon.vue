<script setup lang="ts">
const props = defineProps<{
  icon: string
  class?: string
}>()
</script>

<template>
  <svg v-if="props.icon === 'grid'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
  <svg v-else-if="props.icon === 'folder'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
  <svg v-else-if="props.icon === 'file-text'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
  <svg v-else-if="props.icon === 'star'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
  <svg v-else-if="props.icon === 'map-pin'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
  <svg v-else-if="props.icon === 'mail'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
  <svg v-else-if="props.icon === 'shield'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
  <svg v-else-if="props.icon === 'users'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
  <svg v-else-if="props.icon === 'check-square'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
  <svg v-else-if="props.icon === 'file-plus'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
  <svg v-else-if="props.icon === 'receipt'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M4 3h16v18l-3-2-3 2-3-2-3 2-3-2-3 2V3z" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
  <svg v-else-if="props.icon === 'credit-card'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="15" x2="10" y2="15" />
  </svg>
  <svg v-else-if="props.icon === 'calendar'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
  <svg v-else-if="props.icon === 'trending-up'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
  <svg v-else-if="props.icon === 'zap'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
  <svg v-else-if="props.icon === 'book-open'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
    <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
  </svg>
  <svg v-else-if="props.icon === 'phone'" :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
  <svg v-else :class="props.class || 'w-4 h-4'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
    <circle cx="12" cy="12" r="9" />
  </svg>
</template>
