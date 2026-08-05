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

const viewerReady = ref(false)
const sceneLoaded = ref(false)
const loadFailed = ref(false)
let frameId: number | null = null
let idleId: number | null = null
let fallbackTimer: ReturnType<typeof setTimeout> | null = null
let disposed = false

async function loadViewer() {
  try {
    await import('@splinetool/viewer')
    if (!disposed) viewerReady.value = true
  }
  catch {
    if (!disposed) loadFailed.value = true
  }
}

function scheduleViewer() {
  frameId = window.requestAnimationFrame(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }).connection
    const constrained = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ''))
    const timeout = constrained ? 1600 : 650
    const activate = () => { void loadViewer() }

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(activate, { timeout })
    }
    else {
      fallbackTimer = setTimeout(activate, 0)
    }
  })
}

onMounted(scheduleViewer)

onBeforeUnmount(() => {
  disposed = true
  if (frameId !== null) window.cancelAnimationFrame(frameId)
  if (idleId !== null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
  if (fallbackTimer) clearTimeout(fallbackTimer)
})
</script>

<template>
  <ClientOnly>
    <div :class="['spline-shell overflow-hidden bg-black', props.className, props.opacityClass]" aria-hidden="true">
      <spline-viewer
        v-if="viewerReady"
        :url="props.sceneUrl"
        class="h-full w-full"
        loading="eager"
        loading-anim-type="none"
        events-target="local"
        unloadable
        @load-start="sceneLoaded = false"
        @load-complete="sceneLoaded = true"
        @context-loss="sceneLoaded = false"
      />

      <div
        v-if="!loadFailed"
        class="pointer-events-none absolute inset-0 grid place-items-center bg-black transition-opacity duration-500"
        :class="sceneLoaded ? 'opacity-0' : 'opacity-100'"
      >
        <svg v-if="!sceneLoaded" class="h-6 w-6 animate-spin text-white/70" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.96 7.96 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z" />
        </svg>
      </div>
      <div v-else class="absolute inset-0 bg-black" />
    </div>
    <template #fallback>
      <div :class="['bg-black', props.className, props.opacityClass]" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.spline-shell {
  contain: layout paint style;
}

spline-viewer {
  display: block;
  contain: strict;
}
</style>
