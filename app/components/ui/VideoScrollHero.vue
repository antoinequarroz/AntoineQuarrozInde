<script setup lang="ts">
// Native Vue adaptation of the supplied scroll hero; no second UI runtime.
const props = withDefaults(defineProps<{
  startScale?: number
  mobileStartScale?: number
  enableAnimations?: boolean
}>(), { startScale: 0.25, mobileStartScale: 0.65, enableAnimations: true })
const container = shallowRef<HTMLElement | null>(null)
const stage = shallowRef<HTMLElement | null>(null)
const media = shallowRef<HTMLElement | null>(null)
const canvas = shallowRef<HTMLElement | null>(null)
const controlsTarget = shallowRef<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
let motionQuery: MediaQueryList | undefined
let visible = false
let animationFrame = 0

function renderScroll() {
  animationFrame = 0
  if (!container.value || !stage.value || !media.value || !visible) return
  const disabled = !props.enableAnimations || motionQuery?.matches || window.innerHeight <= 540
  const bounds = container.value.getBoundingClientRect()
  const stickyTop = Number.parseFloat(getComputedStyle(stage.value).top) || 0
  const travel = Math.max(1, bounds.height - stage.value.offsetHeight)
  const progress = Math.min(1, Math.max(0, (stickyTop - bounds.top) / travel))
  const start = Math.min(1, Math.max(0.1, window.innerWidth < 768 ? props.mobileStartScale : props.startScale))
  // Hold the full-size picture briefly before releasing the sticky stage.
  const enlargement = Math.min(1, progress / 0.85)
  media.value.style.setProperty('--video-scroll-scale', (disabled ? 1 : start + (1 - start) * enlargement).toFixed(4))
  // Fit the unscaled image in its own grid row; controls have a separate row.
  if (canvas.value) media.value.style.setProperty('--video-scroll-height', `${canvas.value.clientHeight}px`)
  stage.value.style.setProperty('--video-scroll-heading-opacity', disabled ? '1' : String(Math.max(0, 1 - enlargement / 0.35)))
  const arrival = Math.min(1, Math.max(0, (window.innerHeight - bounds.top) / (window.innerHeight * 0.65)))
  const sceneExit = Math.min(1, enlargement / 0.42)
  stage.value.style.setProperty('--video-scroll-scene-exit', disabled ? '1' : sceneExit.toFixed(4))
  stage.value.style.setProperty('--video-scroll-scene-opacity', disabled ? '0' : ((1 - sceneExit) * arrival).toFixed(4))
  stage.value.style.setProperty('--video-scroll-entry-y', `${disabled ? 0 : (1 - arrival) * 24}px`)
}
function scheduleRender() {
  if (visible && !animationFrame) animationFrame = window.requestAnimationFrame(renderScroll)
}
watch(() => [props.startScale, props.mobileStartScale, props.enableAnimations], scheduleRender)
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', scheduleRender)
  window.addEventListener('scroll', scheduleRender, { passive: true })
  window.addEventListener('resize', scheduleRender, { passive: true })
  if (!container.value) return
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      if (visible) scheduleRender()
    })
    observer.observe(container.value)
  }
  else { visible = true; scheduleRender() }
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(scheduleRender)
    resizeObserver.observe(container.value)
    if (stage.value) resizeObserver.observe(stage.value)
    if (canvas.value) resizeObserver.observe(canvas.value)
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
  motionQuery?.removeEventListener('change', scheduleRender)
  window.removeEventListener('scroll', scheduleRender)
  window.removeEventListener('resize', scheduleRender)
  if (animationFrame) window.cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <div ref="container" class="video-scroll-hero" :class="{ 'video-scroll-hero--static': !enableAnimations }">
    <div ref="stage" class="video-scroll-hero__stage">
      <div ref="canvas" class="video-scroll-hero__canvas">
        <div class="video-scroll-hero__intro" aria-hidden="true"><slot name="intro" /></div>
        <div class="video-scroll-hero__heading"><slot name="heading" /></div>
        <div ref="media" class="video-scroll-hero__media" :style="{ '--video-scroll-start': startScale, '--video-scroll-mobile-start': mobileStartScale }">
          <slot :controls-target="controlsTarget" />
        </div>
      </div>
      <div class="video-scroll-hero__footer">
        <!-- Only the picture scales; the buttons keep usable hit areas. -->
        <div ref="controlsTarget" class="video-scroll-hero__controls" />
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-scroll-hero { position: relative; height: 200svh; }
.video-scroll-hero__stage { position: sticky; top: 4.75rem; height: calc(100svh - 4.75rem); display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 16px; padding: 12px; }
.video-scroll-hero__canvas { position: relative; min-height: 0; display: flex; align-items: center; justify-content: center; }
.video-scroll-hero__intro { position: absolute; inset: 0; overflow: hidden; pointer-events: none; opacity: var(--video-scroll-scene-opacity, 1); }
.video-scroll-hero__heading { position: absolute; top: 24px; inset-inline: 20px; text-align: center; opacity: var(--video-scroll-heading-opacity, 1); pointer-events: none; }
.video-scroll-hero__media { width: min(100%, calc(var(--video-scroll-height, calc(100svh - 12rem)) * 16 / 9)); transform: scale(var(--video-scroll-scale, var(--video-scroll-start))); transform-origin: center; }
.video-scroll-hero__footer { position: relative; width: min(600px, 100%); justify-self: center; text-align: center; }
.video-scroll-hero__controls { min-height: 104px; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 40px -24px rgb(109 40 217 / .35); }
@media (max-width: 767px) {
  .video-scroll-hero { height: 175svh; }
  .video-scroll-hero__stage { top: 4.5rem; height: calc(100svh - 4.5rem); padding-inline: 12px; }
  .video-scroll-hero__heading { top: 16px; inset-inline: 4px; }
  .video-scroll-hero__media { width: min(100%, calc(var(--video-scroll-height, calc(100svh - 12rem)) * 4 / 5)); transform: scale(var(--video-scroll-scale, var(--video-scroll-mobile-start))); }
}
.video-scroll-hero--static { height: auto; padding: 40px 12px; }
.video-scroll-hero--static .video-scroll-hero__stage { position: relative; top: 0; height: auto; display: flex; flex-direction: column; gap: 24px; padding: 0; }
.video-scroll-hero--static .video-scroll-hero__intro { display: none; }
.video-scroll-hero--static .video-scroll-hero__canvas { flex-direction: column; gap: 24px; }
.video-scroll-hero--static .video-scroll-hero__heading { position: relative; inset: auto; opacity: 1; }
.video-scroll-hero--static .video-scroll-hero__media { width: min(1600px, 100%); transform: none; }
@media (prefers-reduced-motion: reduce), (max-height: 540px) {
  .video-scroll-hero { height: auto; padding: 40px 12px; }
  .video-scroll-hero__stage { position: relative; top: 0; height: auto; display: flex; flex-direction: column; gap: 24px; padding: 0; }
  .video-scroll-hero__intro { display: none; }
  .video-scroll-hero__canvas { width: 100%; flex-direction: column; gap: 24px; }
  .video-scroll-hero__heading { position: relative; inset: auto; opacity: 1; }
  .video-scroll-hero__media { width: min(1600px, 100%); transform: none; }
}
</style>
