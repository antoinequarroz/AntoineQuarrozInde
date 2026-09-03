<script setup lang="ts">
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const detailsRef = ref<HTMLDetailsElement | null>(null)

const available = computed(() => locales.value.filter(item => item.code !== locale.value))

function closeMenu() {
  detailsRef.value?.removeAttribute('open')
}
</script>

<template>
  <details ref="detailsRef" class="group relative">
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-violet-100 hover:text-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-violet-500/20 dark:hover:text-violet-400 [&::-webkit-details-marker]:hidden"
      :aria-label="t('nav.change_language')"
    >
      <span class="text-xs font-bold uppercase tracking-wider">{{ locale }}</span>
      <svg
        class="h-3 w-3 transition-transform duration-200 group-open:rotate-180"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </summary>

    <ul class="card-glass absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-2xl shadow-glow-sm">
      <li v-for="item in available" :key="item.code">
        <NuxtLink
          :to="switchLocalePath(item.code)"
          :lang="String(item.iso)"
          class="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-violet-50 hover:text-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
          @click="closeMenu"
        >
          <span class="text-xs font-bold uppercase tracking-wider text-violet-500">{{ item.code }}</span>
          <span>{{ item.name }}</span>
        </NuxtLink>
      </li>
    </ul>
  </details>
</template>
