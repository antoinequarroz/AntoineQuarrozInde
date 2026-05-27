<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()
const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const available = computed(() => locales.value.filter(l => l.code !== locale.value))

function select(code: string) {
  setLocale(code as 'fr' | 'en' | 'de')
  isOpen.value = false
}

onClickOutside(rootRef, () => { isOpen.value = false })
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
             bg-gray-100 dark:bg-gray-800/50 hover:bg-violet-100 dark:hover:bg-violet-500/20
             text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400
             transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
      @click="isOpen = !isOpen"
    >
      <span class="uppercase text-xs font-bold tracking-wider">{{ locale }}</span>
      <svg
        class="w-3 h-3 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-32 card-glass shadow-glow-sm rounded-2xl overflow-hidden z-50"
      >
        <button
          v-for="loc in available"
          :key="loc.code"
          class="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                 text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400
                 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors duration-150"
          @click="select(loc.code)"
        >
          <span class="uppercase text-xs font-bold tracking-wider text-violet-500">{{ loc.code }}</span>
          <span>{{ loc.name }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
</style>
