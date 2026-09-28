<script setup lang="ts">
const { locale } = useI18n()

const sectionRef = shallowRef<HTMLElement | null>(null)
const stageRef = shallowRef<HTMLElement | null>(null)

let animationFrame = 0
let observer: IntersectionObserver | null = null
let motionQuery: MediaQueryList | null = null
let isVisible = false
let pointerX = 0
let pointerY = 0

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

const movements = [
  { enterX: 230, enterY: 90, driftX: -26, driftY: -34, pointer: -12 },
  { enterX: 0, enterY: 180, driftX: 12, driftY: -24, pointer: 6 },
  { enterX: -240, enterY: 100, driftX: 28, driftY: -32, pointer: 12 },
  { enterX: 210, enterY: -150, driftX: -20, driftY: 34, pointer: -8 },
  { enterX: -220, enterY: -160, driftX: 22, driftY: 38, pointer: 9 },
]

function clamp(value: number) {
  return Math.min(1, Math.max(0, value))
}

function renderScene() {
  animationFrame = 0
  if (!sectionRef.value || !stageRef.value || !isVisible) return

  const reducedMotion = Boolean(motionQuery?.matches)
  const rect = sectionRef.value.getBoundingClientRect()
  const viewport = Math.max(1, window.innerHeight)
  const travel = Math.max(1, rect.height - viewport)
  const progress = reducedMotion ? 0.65 : clamp(-rect.top / travel)
  const revealProgress = clamp((progress + 0.08) / 0.58)
  const reveal = 1 - Math.pow(1 - revealProgress, 3)
  const drift = reducedMotion ? 0 : (progress - 0.5) * 2

  stageRef.value.querySelectorAll<HTMLElement>('.tool-showcase__screen').forEach((screen, index) => {
    const movement = movements[index] ?? movements[0]!
    const x = (1 - reveal) * movement.enterX + drift * movement.driftX + pointerX * movement.pointer
    const y = (1 - reveal) * movement.enterY + drift * movement.driftY + pointerY * movement.pointer * 0.6
    screen.style.setProperty('--screen-x', `${x.toFixed(2)}px`)
    screen.style.setProperty('--screen-y', `${y.toFixed(2)}px`)
    screen.style.setProperty('--screen-scale', `${(0.74 + reveal * 0.26).toFixed(4)}`)
    screen.style.setProperty('--screen-opacity', `${(0.08 + reveal * 0.92).toFixed(4)}`)
  })

  stageRef.value.style.setProperty('--title-opacity', `${clamp((progress + 0.08) / 0.3).toFixed(4)}`)
}

function scheduleRender() {
  if (!animationFrame) animationFrame = window.requestAnimationFrame(renderScene)
}

function onPointerMove(event: PointerEvent) {
  if (!sectionRef.value || event.pointerType === 'touch' || motionQuery?.matches) return
  const rect = sectionRef.value.getBoundingClientRect()
  pointerX = clamp((event.clientX - rect.left) / rect.width) * 2 - 1
  pointerY = clamp((event.clientY - rect.top) / rect.height) * 2 - 1
  scheduleRender()
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
    @pointermove="onPointerMove"
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
  height: 150svh;
  min-height: 940px;
}

.tool-showcase__stage {
  --title-opacity: 0;
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
  font-size: clamp(2.1rem, 4.6vw, 4.7rem);
  font-weight: 750;
  line-height: 0.98;
  letter-spacing: -0.05em;
  text-align: center;
  opacity: var(--title-opacity);
  transform: translate(-50%, -50%);
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
  perspective: 1400px;
}

.tool-showcase__screen {
  --screen-x: 0px;
  --screen-y: 0px;
  --screen-scale: 1;
  --screen-opacity: 1;
  position: absolute;
  width: clamp(195px, 20vw, 320px);
  aspect-ratio: 1.48;
  overflow: hidden;
  margin: 0;
  border: 1px solid rgb(148 163 184 / 0.22);
  border-radius: 1.15rem;
  background: rgb(255 255 255);
  box-shadow: 0 30px 85px rgb(15 23 42 / 0.22), 0 0 0 1px rgb(255 255 255 / 0.1);
  opacity: var(--screen-opacity);
  transform: translate3d(var(--screen-x), var(--screen-y), 0) scale(var(--screen-scale));
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

.tool-showcase__screen--1 {
  top: 18%;
  left: 1%;
  rotate: -8deg;
}

.tool-showcase__screen--1 .tool-showcase__image { transform: scale(1.01); }

.tool-showcase__screen--2 {
  top: 5%;
  left: 50%;
  width: clamp(175px, 17vw, 270px);
  margin-left: clamp(-88px, -8.5vw, -135px);
  rotate: 2deg;
}

.tool-showcase__screen--3 {
  top: 20%;
  right: 0;
  rotate: 8deg;
}

.tool-showcase__screen--4 {
  bottom: 3%;
  left: 9%;
  width: clamp(235px, 25vw, 400px);
  rotate: 6deg;
}

.tool-showcase__screen--5 {
  right: 7%;
  bottom: 2%;
  width: clamp(235px, 25vw, 405px);
  rotate: -6deg;
}

@media (max-width: 1023px) and (min-width: 768px) {
  .tool-showcase__screen { width: clamp(165px, 23vw, 230px); }
  .tool-showcase__screen--4,
  .tool-showcase__screen--5 { width: clamp(210px, 29vw, 300px); }
  .tool-showcase__screen--4 { left: 2%; }
  .tool-showcase__screen--5 { right: 2%; }
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
