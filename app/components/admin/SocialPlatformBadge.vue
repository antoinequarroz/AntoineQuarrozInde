<script setup lang="ts">
import type { EditorialSocialPlatform } from '../../../shared/types/socialEditorial'
import { socialPlatformLabel } from '~/utils/socialCalendar'

withDefaults(defineProps<{ platform: EditorialSocialPlatform, compact?: boolean }>(), { compact: false })
</script>

<template>
  <span class="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-gray-800 dark:text-gray-100" :class="compact ? 'text-[11px]' : 'text-sm'">
    <AdminSocialPlatformIcon :platform="platform" :compact="compact" />
    <span class="min-w-0 break-words">{{ socialPlatformLabel(platform) }}</span>
  </span>
</template>
