<script setup lang="ts">
const isEnabled = ref(false)
const isPressed = ref(false)
const isInteractive = ref(false)
const pointer = reactive({ x: 0, y: 0 })
const follower = reactive({ x: 0, y: 0 })

let rafId = 0

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  '[role="button"]',
  'input',
  'select',
  'textarea',
  'label[for]',
  '[data-cursor="interactive"]',
].join(',')

function step() {
  follower.x += (pointer.x - follower.x) * 0.18
  follower.y += (pointer.y - follower.y) * 0.18
  rafId = requestAnimationFrame(step)
}

function onMove(event: PointerEvent) {
  pointer.x = event.clientX
  pointer.y = event.clientY

  const target = document.elementFromPoint(event.clientX, event.clientY)
  isInteractive.value = !!target?.closest(INTERACTIVE_SELECTOR)
}

function onDown() {
  isPressed.value = true
}

function onUp() {
  isPressed.value = false
}

onMounted(() => {
  const canHover = window.matchMedia('(any-hover: hover)').matches
  const hasFinePointer = window.matchMedia('(any-pointer: fine)').matches
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isTouchDevice = navigator.maxTouchPoints > 0
  const ua = navigator.userAgent || ''
  const isMobileUA = /Android|iPhone|iPad|iPod|Windows Phone|webOS/i.test(ua)
  const isMobileOrTablet = isTouchDevice && isMobileUA

  if ((!canHover && !hasFinePointer) || prefersReducedMotion || isMobileOrTablet) return

  isEnabled.value = true
  document.documentElement.classList.add('custom-cursor-active')

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })

  rafId = requestAnimationFrame(step)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  document.documentElement.classList.remove('custom-cursor-active')
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerdown', onDown)
  window.removeEventListener('pointerup', onUp)
})
</script>

<template>
  <div v-if="isEnabled" aria-hidden="true" class="custom-cursor-layer">
    <div
      class="custom-cursor-ring"
      :class="{
        'is-interactive': isInteractive,
        'is-pressed': isPressed,
      }"
      :style="{
        transform: `translate3d(${follower.x}px, ${follower.y}px, 0)`,
      }"
    />
    <div
      class="custom-cursor-dot"
      :class="{
        'is-interactive': isInteractive,
        'is-pressed': isPressed,
      }"
      :style="{
        transform: `translate3d(${pointer.x}px, ${pointer.y}px, 0)`,
      }"
    />
  </div>
</template>
