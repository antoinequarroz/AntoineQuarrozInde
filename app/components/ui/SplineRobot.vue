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
const loadFailed = ref(false)

async function loadViewer() {
  try {
    await import('@splinetool/viewer')
    viewerReady.value = true
  }
  catch {
    loadFailed.value = true
  }
}

onMounted(() => { void loadViewer() })
</script>

<template>
  <ClientOnly>
    <div :class="['overflow-hidden', props.className, props.opacityClass]" aria-hidden="true">
      <div v-if="!viewerReady && !loadFailed" class="absolute inset-0 grid place-items-center bg-black">
        <svg class="h-6 w-6 animate-spin text-white/80" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.96 7.96 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z" />
        </svg>
      </div>
      <div v-else-if="loadFailed" class="absolute inset-0 bg-black" />
      <spline-viewer v-else :url="props.sceneUrl" class="h-full w-full" loading-anim-type="none" />
    </div>
    <template #fallback>
      <div :class="['bg-black', props.className, props.opacityClass]" />
    </template>
  </ClientOnly>
</template>
