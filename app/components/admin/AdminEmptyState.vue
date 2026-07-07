<script setup lang="ts">
defineProps<{
  title: string
  body?: string
}>()
</script>

<template>
  <div class="admin-empty-state">
    <p class="admin-empty-title">{{ title }}</p>
    <p v-if="body" class="admin-empty-body">{{ body }}</p>
    <slot />
  </div>
</template>
