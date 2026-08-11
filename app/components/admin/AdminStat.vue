<script setup lang="ts">
import AdminAdminIcon from './AdminIcon.vue'

defineProps<{
  label: string
  value: string | number
  sub?: string
  icon: string
  iconColor?: string
  iconBg?: string
  href?: string
}>()
</script>

<template>
  <component
    :is="href ? 'NuxtLink' : 'div'"
    :to="href"
    class="admin-stat"
  >
    <div class="flex items-center justify-between gap-3 mb-4">
      <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{{ label }}</span>
      <div class="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" :class="[iconBg || 'bg-violet-500/10', iconColor || 'text-violet-500']">
        <AdminAdminIcon :icon="icon" class="w-4 h-4" />
      </div>
    </div>
    <div class="font-display text-2xl sm:text-3xl font-bold leading-none text-gray-900 dark:text-white">{{ value }}</div>
    <p v-if="sub" class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{{ sub }}</p>
  </component>
</template>
