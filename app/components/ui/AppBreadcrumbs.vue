<script setup lang="ts">
import type { PublicBreadcrumbItem } from '~~/shared/utils/publicStructuredData'

const props = defineProps<{
  items: ReadonlyArray<PublicBreadcrumbItem>
}>()
</script>

<template>
  <nav data-breadcrumbs aria-label="Fil d’Ariane">
    <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
      <li
        v-for="(item, index) in props.items"
        :key="item.path"
        data-breadcrumb-item
        class="flex min-w-0 items-center gap-2"
      >
        <NuxtLink
          v-if="index < props.items.length - 1"
          data-breadcrumb-link
          :to="item.path"
          class="inline-flex min-h-10 items-center rounded font-medium text-violet-700 underline decoration-violet-400/50 underline-offset-4 transition-colors hover:text-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:text-violet-300 dark:hover:text-violet-100 dark:focus-visible:ring-offset-[#111118]"
        >
          {{ item.name }}
        </NuxtLink>
        <span
          v-else
          data-breadcrumb-current
          aria-current="page"
          class="min-w-0 truncate font-medium text-gray-900 dark:text-white"
        >
          {{ item.name }}
        </span>
        <span v-if="index < props.items.length - 1" aria-hidden="true" class="text-gray-400 dark:text-gray-500">/</span>
      </li>
    </ol>
  </nav>
</template>
