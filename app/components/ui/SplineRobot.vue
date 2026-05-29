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

onMounted(() => {
  if (document.querySelector('script[data-spline-viewer]')) return
  const script = document.createElement('script')
  script.src = 'https://unpkg.com/@splinetool/viewer@latest/build/spline-viewer.js'
  script.type = 'module'
  script.setAttribute('data-spline-viewer', 'true')
  document.head.appendChild(script)
})
</script>

<template>
  <ClientOnly>
    <div :class="['pointer-events-none', props.className, props.opacityClass]">
      <spline-viewer :url="props.sceneUrl" class="w-full h-full" loading-anim-type="none" />
    </div>
    <template #fallback>
      <div :class="['pointer-events-none', props.className, props.opacityClass]" />
    </template>
  </ClientOnly>
</template>
