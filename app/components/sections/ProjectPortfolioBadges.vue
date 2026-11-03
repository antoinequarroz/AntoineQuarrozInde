<script setup lang="ts">
import type { Project } from '~/types'
import { getProjectPresentation } from '~/utils/projectPresentation'

const props = defineProps<{ project: Project }>()
const { t } = useI18n()
const presentation = computed(() => getProjectPresentation(props.project))
</script>

<template>
  <div v-if="presentation.kind || presentation.inDevelopment" data-project-badges class="flex flex-wrap items-center gap-1.5">
    <span
      v-if="presentation.kind"
      :data-project-kind="presentation.kind"
      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-4"
      :class="presentation.kind === 'client'
        ? 'bg-violet-500/10 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200'
        : 'bg-gray-950/[0.05] text-gray-600 dark:bg-white/[0.07] dark:text-gray-300'"
    >
      {{ t(`portfolio.project_kind.${presentation.kind}`) }}
    </span>
    <span
      v-if="presentation.inDevelopment"
      data-project-development
      class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium leading-4 text-amber-900 dark:bg-amber-300/10 dark:text-amber-200"
    >
      <span aria-hidden="true" class="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {{ t('portfolio.in_development') }}
    </span>
  </div>
</template>
