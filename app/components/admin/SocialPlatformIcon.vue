<script setup lang="ts">
import { siInstagram, siX } from 'simple-icons'
import type { EditorialSocialPlatform } from '../../../shared/types/socialEditorial'

const props = withDefaults(defineProps<{ platform: EditorialSocialPlatform, compact?: boolean }>(), { compact: false })
const linkedinPath = 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'
const path = computed(() => props.platform === 'linkedin' ? linkedinPath : props.platform === 'instagram' ? siInstagram.path : siX.path)
const surface = computed(() => ({
  linkedin: 'bg-[#0a66c2] text-white',
  instagram: 'bg-gradient-to-tr from-amber-500 via-pink-600 to-violet-600 text-white',
  x: 'bg-gray-950 text-white ring-1 ring-inset ring-white/15 dark:bg-white dark:text-gray-950',
})[props.platform])
</script>

<template>
  <span class="social-platform-icon inline-flex shrink-0 items-center justify-center" :class="[surface, compact ? 'h-6 w-6 rounded-md' : 'h-8 w-8 rounded-lg']" :data-social-platform="platform" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="currentColor" :class="compact ? 'h-3 w-3' : 'h-4 w-4'" aria-hidden="true" focusable="false"><path :d="path" /></svg>
  </span>
</template>
