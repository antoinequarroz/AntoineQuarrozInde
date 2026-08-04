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

async function loadViewer() {
  await import('@splinetool/viewer')
  viewerReady.value = true
}

onMounted(() => {
  void loadViewer()
})
</script>

<template>
  <ClientOnly>
    <div :class="['pointer-events-none', props.className, props.opacityClass]">
      <spline-viewer v-if="viewerReady" :url="props.sceneUrl" class="w-full h-full" loading-anim-type="none" />
    </div>
    <template #fallback>
      <div :class="['pointer-events-none', props.className, props.opacityClass]" />
    </template>
  </ClientOnly>
</template>
