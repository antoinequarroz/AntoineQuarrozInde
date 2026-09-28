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
  { light: '/showcase-tools/dashboard.png', dark: '/showcase-tools/dashboard-dark.png', alt: 'Tableau de bord de pilotage', offset: 0 },
  { light: '/showcase-tools/crm.png', dark: '/showcase-tools/crm-dark.png', alt: 'Interface CRM et prospection', offset: 0.1 },
  { light: '/showcase-tools/facturation.png', dark: '/showcase-tools/facturation-dark.png', alt: 'Tableau de bord de facturation', offset: 0.2 },
  { light: '/showcase-tools/devis.png', dark: '/showcase-tools/devis-dark.png', alt: 'Gestion des devis', offset: 0.3 },
  { light: '/showcase-tools/analyse.png', dark: '/showcase-tools/analyse-dark.png', alt: 'Analyse des performances', offset: 0.4 },
]

const cardDuration = 0.6

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
  const staticLayout = reducedMotion || window.innerWidth < 768
  const rect = sectionRef.value.getBoundingClientRect()
  const viewport = Math.max(1, window.innerHeight)
  const travel = Math.max(1, rect.height - viewport)
  const progress = reducedMotion ? 0.5 : clamp(-rect.top / travel)
  stageRef.value.querySelectorAll<HTMLElement>('.tool-showcase__screen').forEach((screen, index) => {
    const localProgress = (progress - screens[index]!.offset) / cardDuration
    const visible = staticLayout || (localProgress >= 0 && localProgress <= 1)
    const boundedProgress = clamp(localProgress)
    let angle = 0
    let x = 0

    if (boundedProgress < 0.12) {
      const entry = boundedProgress / 0.12
      const easedEntry = 1 - (1 - entry) ** 2
      x = -52 + 52 * easedEntry
    }
    else if (boundedProgress > 0.88) {
      const exit = (boundedProgress - 0.88) / 0.12
      angle = Math.PI * 2
      x = 52 * exit ** 2
    }
    else {
      angle = ((boundedProgress - 0.12) / 0.76) * Math.PI * 2
      x = Math.sin(angle) * 31
    }

    const depthAxis = Math.cos(angle)
    const front = (depthAxis + 1) / 2
    const y = depthAxis * 18
    const scale = 0.6 + front * 0.65
    const rotateY = angle * 180 / Math.PI
    const depth = -170 + front * 340

    screen.style.setProperty('--screen-x', `${x.toFixed(2)}vw`)
    screen.style.setProperty('--screen-y', `${y.toFixed(2)}vh`)
    screen.style.setProperty('--screen-scale', scale.toFixed(4))
    screen.style.setProperty('--screen-rotate-y', `${rotateY.toFixed(2)}deg`)
    screen.style.setProperty('--screen-z', `${depth.toFixed(2)}px`)
    screen.style.setProperty('--screen-opacity', visible ? '1' : '0')
    screen.style.visibility = visible ? 'visible' : 'hidden'
    screen.style.zIndex = `${Math.round(front * 10) + 1}`
  })

  const titleOpacity = progress <= 0.22 || progress >= 0.78
    ? 0
    : progress < 0.42
      ? smoothstep(0.22, 0.42, progress)
      : progress <= 0.58
        ? 1
        : 1 - smoothstep(0.58, 0.78, progress)
  const titleScale = 0.97 + 0.03 * titleOpacity
  const titleBlur = (1 - titleOpacity) * 12
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
          <div class="tool-showcase__face tool-showcase__face--front">
            <img :src="screen.light" :alt="screen.alt" class="tool-showcase__image dark:hidden" loading="lazy" decoding="async">
            <img :src="screen.dark" alt="" class="tool-showcase__image hidden dark:block" loading="lazy" decoding="async">
          </div>
          <div class="tool-showcase__face tool-showcase__face--back" aria-hidden="true">
            <img :src="screen.light" alt="" class="tool-showcase__image dark:hidden" loading="lazy" decoding="async">
            <img :src="screen.dark" alt="" class="tool-showcase__image hidden dark:block" loading="lazy" decoding="async">
          </div>
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tool-showcase {
  height: 380svh;
  min-height: 2600px;
}

.tool-showcase__stage {
  --title-opacity: 0;
  --title-scale: 0.97;
  --title-blur: 12px;
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
  --screen-rotate-y: 0deg;
  --screen-z: 0px;
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(170px, 16vw, 280px);
  aspect-ratio: 1.6;
  margin: 0;
  opacity: var(--screen-opacity);
  transform: translate3d(calc(-50% + var(--screen-x)), calc(-50% + var(--screen-y)), var(--screen-z)) rotateY(var(--screen-rotate-y)) scale(var(--screen-scale));
  transform-style: preserve-3d;
  will-change: transform, opacity;
}

.tool-showcase__face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border: 1px solid rgb(0 0 0 / 0.1);
  border-radius: 1rem;
  background: white;
  backface-visibility: hidden;
  box-shadow: 0 30px 85px rgb(15 23 42 / 0.22), 0 0 0 1px rgb(255 255 255 / 0.1);
}

.tool-showcase__face--back { transform: rotateY(180deg); }

:global(.dark .tool-showcase__face) {
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

@media (max-width: 1023px) and (min-width: 768px) {
  .tool-showcase__screen { width: clamp(190px, 28vw, 300px); }
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
