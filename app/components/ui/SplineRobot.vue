<script setup lang="ts">
import { decideSplineLoading, supportsWebGL } from '~/utils/splineLoading'

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
const motionReduced = ref(false)
type SplineState = 'fallback-ssr' | 'loading' | 'ready' | 'fallback-motion' | 'fallback-network' | 'fallback-unsupported' | 'fallback-error'
const state = ref<SplineState>('fallback-ssr')
let frameId: number | null = null
let idleId: number | null = null
let fallbackTimer: ReturnType<typeof setTimeout> | null = null
let sceneTimer: ReturnType<typeof setTimeout> | null = null
let motionQuery: MediaQueryList | null = null
let disposed = false
const isSmallViewport = ref(false)

function clearSceneTimer() {
  if (sceneTimer) clearTimeout(sceneTimer)
  sceneTimer = null
}

function useFallback(reason: Exclude<SplineState, 'fallback-ssr' | 'loading' | 'ready'>) {
  clearSceneTimer()
  viewerReady.value = false
  state.value = reason
}

function startSceneTimer() {
  clearSceneTimer()
  sceneTimer = setTimeout(() => {
    if (!disposed && state.value === 'loading') useFallback('fallback-error')
  }, 8_000)
}

async function loadViewer() {
  try {
    await import('@splinetool/viewer')
    if (!disposed && state.value === 'loading') {
      viewerReady.value = true
      startSceneTimer()
    }
  }
  catch {
    if (!disposed) useFallback('fallback-error')
  }
}

function scheduleViewer() {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean, effectiveType?: string }
  }).connection
  const decision = decideSplineLoading({
    reducedMotion: motionReduced.value,
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
    webglSupported: supportsWebGL(),
  })
  if (!decision.load) {
    useFallback(`fallback-${decision.reason}`)
    return
  }
  state.value = 'loading'
  const activationDelay = isSmallViewport.value ? 1_200 : 0
  fallbackTimer = setTimeout(() => {
    frameId = window.requestAnimationFrame(() => {
      const activate = () => { void loadViewer() }

      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(activate, { timeout: isSmallViewport.value ? 1_800 : 650 })
      }
      else {
        activate()
      }
    })
  }, activationDelay)
}

function handleMotionChange(event: MediaQueryListEvent) {
  motionReduced.value = event.matches
  if (event.matches) useFallback('fallback-motion')
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionReduced.value = motionQuery.matches
  isSmallViewport.value = window.matchMedia('(max-width: 639px)').matches
  motionQuery.addEventListener('change', handleMotionChange)
  scheduleViewer()
})

onBeforeUnmount(() => {
  disposed = true
  if (frameId !== null) window.cancelAnimationFrame(frameId)
  if (idleId !== null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
  if (fallbackTimer) clearTimeout(fallbackTimer)
  clearSceneTimer()
  motionQuery?.removeEventListener('change', handleMotionChange)
})
</script>

<template>
  <ClientOnly>
    <div :class="['spline-shell overflow-hidden bg-black', props.className, props.opacityClass]" :data-spline-state="state" aria-hidden="true">
      <div class="spline-static absolute inset-0 bg-black" />
      <spline-viewer
        v-if="viewerReady && (state === 'loading' || state === 'ready')"
        :url="props.sceneUrl"
        class="h-full w-full"
        loading="lazy"
        loading-anim-type="none"
        events-target="local"
        unloadable
        @load-start="startSceneTimer"
        @load-complete="clearSceneTimer(); state = 'ready'"
        @error="useFallback('fallback-error')"
        @context-loss="useFallback('fallback-error')"
      />

      <div
        v-if="state === 'loading'"
        class="pointer-events-none absolute inset-0 grid place-items-center bg-black/15 transition-opacity duration-500"
      >
        <svg class="h-6 w-6 animate-spin text-white/70" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.96 7.96 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z" />
        </svg>
      </div>
    </div>
    <template #fallback>
      <div :class="['spline-static bg-black', props.className, props.opacityClass]" data-spline-state="fallback-ssr" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.spline-shell {
  contain: layout paint style;
}

.spline-static {
  background:
    radial-gradient(circle at 58% 42%, rgb(124 58 237 / 18%), transparent 32%),
    radial-gradient(circle at 68% 58%, rgb(34 211 238 / 10%), transparent 28%),
    #000;
}

spline-viewer {
  position: relative;
  display: block;
  contain: strict;
}
</style>
