<script setup lang="ts">
const { locale } = useI18n()

const sectionRef = shallowRef<HTMLElement | null>(null)
const stageRef = shallowRef<HTMLElement | null>(null)

let animationFrame = 0
let observer: IntersectionObserver | null = null
let motionQuery: MediaQueryList | null = null
let isVisible = false

const copy = computed(() => {
  if (locale.value === 'en') return { number: '15+', title: 'custom tools for your SME' }
  if (locale.value === 'de') return { number: '15+', title: 'massgeschneiderte Tools für Ihr KMU' }
  return { number: '+15', title: 'outils sur mesure pour votre PME' }
})

const screens = [
  { light: '/showcase-tools/dashboard.png', dark: '/showcase-tools/dashboard-dark.png', alt: 'Tableau de bord de pilotage' },
  { light: '/showcase-tools/crm.png', dark: '/showcase-tools/crm-dark.png', alt: 'Interface CRM et prospection' },
  { light: '/showcase-tools/facturation.png', dark: '/showcase-tools/facturation-dark.png', alt: 'Tableau de bord de facturation' },
  { light: '/showcase-tools/devis.png', dark: '/showcase-tools/devis-dark.png', alt: 'Gestion des devis' },
  { light: '/showcase-tools/analyse.png', dark: '/showcase-tools/analyse-dark.png', alt: 'Analyse des performances' },
]

function clamp(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(from: number, to: number, value: number) {
  const progress = clamp((value - from) / (to - from))
  return progress * progress * (3 - 2 * progress)
}

function renderScene() {
  animationFrame = 0
  if (!sectionRef.value || !stageRef.value || !isVisible) return

  const reducedMotion = Boolean(motionQuery?.matches)
  const rect = sectionRef.value.getBoundingClientRect()
  const viewport = Math.max(1, window.innerHeight)
  const travel = Math.max(1, rect.height - viewport)
  const progress = reducedMotion ? 0.5 : clamp(-rect.top / travel)
  const orbitProgress = clamp((progress - 0.06) / 0.88)
  const visibility = smoothstep(0.04, 0.16, progress) * (1 - smoothstep(0.84, 0.97, progress))
  const orbitRotation = orbitProgress * Math.PI * 2 * 1.08

  stageRef.value.querySelectorAll<HTMLElement>('.tool-showcase__screen').forEach((screen, index) => {
    const angle = -Math.PI * 0.56 + index * (Math.PI * 2 / screens.length) + orbitRotation
    const horizontal = Math.cos(angle)
    const vertical = Math.sin(angle)
    const front = (vertical + 1) / 2
    const x = horizontal * 43
    const y = vertical * 31
    const scale = 0.5 + front * 0.76
    const rotateY = horizontal * -76
    const rotateZ = horizontal * -7
    const depth = -150 + front * 280

    screen.style.setProperty('--screen-x', `${x.toFixed(2)}vw`)
    screen.style.setProperty('--screen-y', `${y.toFixed(2)}vh`)
    screen.style.setProperty('--screen-scale', scale.toFixed(4))
    screen.style.setProperty('--screen-rotate-z', `${rotateZ.toFixed(2)}deg`)
    screen.style.setProperty('--screen-rotate-y', `${rotateY.toFixed(2)}deg`)
    screen.style.setProperty('--screen-z', `${depth.toFixed(2)}px`)
    screen.style.setProperty('--screen-opacity', `${(visibility * (0.72 + front * 0.28)).toFixed(4)}`)
    screen.style.zIndex = `${Math.round(front * 10) + 1}`
  })

  const titleOpacity = smoothstep(0.2, 0.35, progress) * (1 - smoothstep(0.7, 0.86, progress))
  const titleScale = 0.9 + smoothstep(0.22, 0.42, progress) * 0.1
  const titleBlur = (1 - smoothstep(0.22, 0.4, progress)) * 10 + smoothstep(0.72, 0.86, progress) * 10
  stageRef.value.style.setProperty('--title-opacity', titleOpacity.toFixed(4))
  stageRef.value.style.setProperty('--title-scale', titleScale.toFixed(4))
  stageRef.value.style.setProperty('--title-blur', `${titleBlur.toFixed(2)}px`)
}

function scheduleRender() {
  if (!animationFrame) animationFrame = window.requestAnimationFrame(renderScene)
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', scheduleRender)
  observer = new IntersectionObserver(([entry]) => {
    isVisible = Boolean(entry?.isIntersecting)
    if (isVisible) scheduleRender()
  }, { rootMargin: '30% 0px' })
  if (sectionRef.value) observer.observe(sectionRef.value)
  window.addEventListener('scroll', scheduleRender, { passive: true })
  window.addEventListener('resize', scheduleRender, { passive: true })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  motionQuery?.removeEventListener('change', scheduleRender)
  window.removeEventListener('scroll', scheduleRender)
  window.removeEventListener('resize', scheduleRender)
  if (animationFrame) window.cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section
    ref="sectionRef"
    aria-labelledby="tool-showcase-title"
    class="tool-showcase relative bg-surface-light-secondary dark:bg-surface-dark-secondary"
  >
    <div ref="stageRef" class="tool-showcase__stage">
      <div class="section-background" aria-hidden="true">
        <div class="tool-showcase__grid" />
        <div class="tool-showcase__glow" />
      </div>

      <h2 id="tool-showcase-title" class="tool-showcase__title">
        <span class="tool-showcase__number">{{ copy.number }}</span>
        <span>{{ copy.title }}</span>
      </h2>

      <div class="tool-showcase__screens" aria-hidden="true">
        <figure
          v-for="(screen, index) in screens"
          :key="screen.light"
          class="tool-showcase__screen"
          :class="`tool-showcase__screen--${index + 1}`"
        >
          <img :src="screen.light" :alt="screen.alt" class="tool-showcase__image dark:hidden" loading="lazy" decoding="async">
          <img :src="screen.dark" alt="" class="tool-showcase__image hidden dark:block" loading="lazy" decoding="async">
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tool-showcase {
  height: 450svh;
  min-height: 3000px;
}

.tool-showcase__stage {
  --title-opacity: 0;
  --title-scale: 0.88;
  --title-blur: 10px;
  position: sticky;
  top: 0;
  min-height: 100svh;
  overflow: hidden;
  isolation: isolate;
}

.tool-showcase__grid {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  background-image: radial-gradient(circle, rgb(100 116 139 / 0.5) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(ellipse at center, black 5%, transparent 78%);
}

.tool-showcase__glow {
  position: absolute;
  inset: 35% 0 0;
  background:
    radial-gradient(ellipse at 18% 72%, rgb(34 211 238 / 0.2), transparent 34%),
    radial-gradient(ellipse at 78% 68%, rgb(124 58 237 / 0.28), transparent 39%);
  filter: blur(28px);
}

.tool-showcase__title {
  position: absolute;
  z-index: 20;
  top: 50%;
  left: 50%;
  display: flex;
  width: min(86vw, 650px);
  flex-direction: column;
  align-items: center;
  margin: 0;
  color: rgb(17 24 39);
  font-family: var(--font-display);
  font-size: clamp(2.1rem, 4.4vw, 4.5rem);
  font-weight: 750;
  line-height: 0.98;
  letter-spacing: -0.05em;
  text-align: center;
  opacity: var(--title-opacity);
  filter: blur(var(--title-blur));
  transform: translate(-50%, -50%) scale(var(--title-scale));
  will-change: transform, opacity;
}

:global(.dark .tool-showcase__title) { color: white; }

.tool-showcase__number {
  font-size: 1.18em;
  font-weight: 900;
  color: rgb(8 145 178);
}

:global(.dark .tool-showcase__number) { color: rgb(34 211 238); }

.tool-showcase__screens {
  position: absolute;
  z-index: 10;
  inset: 0;
  max-width: 1540px;
  margin: 0 auto;
  perspective: 1050px;
  perspective-origin: 50% 50%;
}

.tool-showcase__screen {
  --screen-x: 0px;
  --screen-y: 0px;
  --screen-scale: 1;
  --screen-opacity: 1;
  --screen-rotate-z: 0deg;
  --screen-rotate-y: 0deg;
  --screen-z: 0px;
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(195px, 20vw, 320px);
  aspect-ratio: 1.48;
  overflow: hidden;
  margin: 0;
  border: 1px solid rgb(148 163 184 / 0.22);
  border-radius: 1.15rem;
  background: rgb(255 255 255);
  box-shadow: 0 30px 85px rgb(15 23 42 / 0.22), 0 0 0 1px rgb(255 255 255 / 0.1);
  opacity: var(--screen-opacity);
  transform: translate3d(calc(-50% + var(--screen-x)), calc(-50% + var(--screen-y)), var(--screen-z)) rotateZ(var(--screen-rotate-z)) rotateY(var(--screen-rotate-y)) scale(var(--screen-scale));
  transform-style: preserve-3d;
  will-change: transform, opacity;
}

:global(.dark .tool-showcase__screen) {
  border-color: rgb(255 255 255 / 0.13);
  background: rgb(11 11 18);
  box-shadow: 0 32px 90px rgb(0 0 0 / 0.48), 0 0 32px rgb(124 58 237 / 0.08);
}

.tool-showcase__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top left;
}

.tool-showcase__screen--1 .tool-showcase__image { transform: scale(1.01); }

.tool-showcase__screen--2 {
  width: clamp(175px, 17vw, 270px);
}

.tool-showcase__screen--4 {
  width: clamp(235px, 25vw, 400px);
}

.tool-showcase__screen--5 {
  width: clamp(235px, 25vw, 405px);
}

@media (max-width: 1023px) and (min-width: 768px) {
  .tool-showcase__screen { width: clamp(165px, 23vw, 230px); }
  .tool-showcase__screen--4,
  .tool-showcase__screen--5 { width: clamp(210px, 29vw, 300px); }
}

@media (max-width: 767px) {
  .tool-showcase {
    height: auto;
    min-height: 0;
    padding: 5.5rem 0;
  }

  .tool-showcase__stage {
    position: relative;
    min-height: 0;
    overflow: visible;
  }

  .tool-showcase__title {
    position: relative;
    top: auto;
    left: auto;
    width: min(100% - 2.5rem, 32rem);
    margin: 0 auto;
    font-size: clamp(2.6rem, 12vw, 4rem);
    opacity: 1;
    transform: none;
  }

  .tool-showcase__screens {
    position: relative;
    inset: auto;
    display: grid;
    grid-auto-columns: min(84vw, 350px);
    grid-auto-flow: column;
    gap: 1rem;
    margin-top: 3.5rem;
    padding: 0 1.25rem 1.25rem;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    perspective: none;
    scroll-padding-inline: 1.25rem;
    scroll-snap-type: inline mandatory;
    scrollbar-width: none;
  }

  .tool-showcase__screens::-webkit-scrollbar { display: none; }

  .tool-showcase__screen,
  .tool-showcase__screen--1,
  .tool-showcase__screen--2,
  .tool-showcase__screen--3,
  .tool-showcase__screen--4,
  .tool-showcase__screen--5 {
    position: relative;
    inset: auto;
    width: 100%;
    margin: 0;
    opacity: 1;
    rotate: 0deg;
    transform: none;
    scroll-snap-align: center;
    will-change: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tool-showcase { height: auto; min-height: 100svh; }
  .tool-showcase__stage { position: relative; }
  .tool-showcase__screen { will-change: auto; }
}
</style>
