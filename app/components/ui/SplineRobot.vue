<script setup lang="ts">
interface Props {
  sceneUrl?: string
  className?: string
  opacityClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  sceneUrl: 'https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode',
  className: '',
  opacityClass: 'opacity-100',
})

const rootRef = ref<HTMLElement | null>(null)
const viewerReady = ref(false)
const shouldLoad = ref(false)
let observer: IntersectionObserver | null = null
let idleId: number | null = null
let fallbackTimer: ReturnType<typeof setTimeout> | null = null

function connectionIsConstrained() {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection
  return Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ''))
}

function scheduleViewer() {
  if (shouldLoad.value || connectionIsConstrained() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const activate = () => { shouldLoad.value = true }
  if ('requestIdleCallback' in window) {
    idleId = window.requestIdleCallback(activate, { timeout: 1800 })
  }
  else {
    fallbackTimer = setTimeout(activate, 650)
  }
}

async function loadViewer() {
  try {
    await import('@splinetool/viewer')
    viewerReady.value = true
  }
  catch {
    viewerReady.value = false
  }
}

watch(shouldLoad, (load) => {
  if (load) void loadViewer()
})

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return
    observer?.disconnect()
    scheduleViewer()
  }, { rootMargin: '20% 0px' })
  if (rootRef.value) observer.observe(rootRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (idleId !== null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
  if (fallbackTimer) clearTimeout(fallbackTimer)
})
</script>

<template>
  <ClientOnly>
    <div ref="rootRef" :class="['pointer-events-none overflow-hidden', props.className, props.opacityClass]" aria-hidden="true">
      <div class="absolute inset-0 spline-fallback">
        <svg class="absolute left-[62%] top-1/2 h-[66%] w-auto -translate-x-1/2 -translate-y-1/2 text-violet-200/15" viewBox="0 0 220 310" fill="none" aria-hidden="true">
          <rect x="49" y="70" width="122" height="105" rx="48" stroke="currentColor" stroke-width="4" />
          <path d="M84 70V43m52 27V43M71 191l-19 77m97-77 19 77M51 122 21 188m148-66 30 66" stroke="currentColor" stroke-width="5" stroke-linecap="round" />
          <circle cx="86" cy="117" r="8" fill="currentColor" />
          <circle cx="134" cy="117" r="8" fill="currentColor" />
          <path d="M84 148c17 10 35 10 52 0" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
        </svg>
      </div>
      <spline-viewer v-if="viewerReady" :url="props.sceneUrl" class="relative h-full w-full" loading-anim-type="none" />
    </div>
    <template #fallback>
      <div :class="['pointer-events-none spline-fallback', props.className, props.opacityClass]" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.spline-fallback {
  background:
    radial-gradient(circle at 64% 48%, rgb(124 58 237 / 0.28), transparent 24%),
    radial-gradient(circle at 76% 62%, rgb(34 211 238 / 0.14), transparent 18%);
}
</style>
