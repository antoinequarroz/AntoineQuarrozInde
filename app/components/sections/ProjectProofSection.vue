<script setup lang="ts">
import type { Project } from '~/types'

const { locale } = useI18n()
const localePath = useLocalePath()
const store = useProjectsStore()

const sectionRef = shallowRef<HTMLElement | null>(null)
const sceneRef = shallowRef<HTMLElement | null>(null)
const prefersReducedMotion = ref(false)

let animationFrame = 0
let isVisible = false
let pointerX = 0
let pointerY = 0
let observer: IntersectionObserver | null = null
let motionQuery: MediaQueryList | null = null

function updateMotionPreference() {
  prefersReducedMotion.value = Boolean(motionQuery?.matches)
  if (sceneRef.value && prefersReducedMotion.value) sceneRef.value.style.setProperty('--proof-progress', '0.7')
  else scheduleRender()
}

const copy = computed(() => {
  if (locale.value === 'en') {
    return {
      eyebrow: 'Selected projects',
      title: 'Support that moves your projects forward.',
      body: 'From the first idea to launch, I turn business needs into clear, useful and maintainable digital products.',
      count: 'projects presented',
      action: 'View project',
      all: 'Explore all projects',
    }
  }
  if (locale.value === 'de') {
    return {
      eyebrow: 'Ausgewählte Projekte',
      title: 'Begleitung, die Ihre Projekte voranbringt.',
      body: 'Von der ersten Idee bis zur Veröffentlichung übersetze ich Geschäftsanforderungen in klare, nützliche und wartbare digitale Produkte.',
      count: 'vorgestellte Projekte',
      action: 'Projekt ansehen',
      all: 'Alle Projekte entdecken',
    }
  }
  return {
    eyebrow: 'Projets sélectionnés',
    title: 'Un accompagnement qui fait avancer vos projets.',
    body: 'De la première idée à la mise en ligne, je transforme vos besoins métier en produits numériques clairs, utiles et durables.',
    count: 'projets présentés',
    action: 'Voir le projet',
    all: 'Découvrir tous les projets',
  }
})

const selectedProjects = computed(() => [...store.portfolio]
  .sort((a, b) => {
    if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  .slice(0, 5))

function projectDescription(project: Project) {
  if (locale.value === 'en' && project.descriptionEn?.trim()) return project.descriptionEn
  if (locale.value === 'de' && project.descriptionDe?.trim()) return project.descriptionDe
  return project.description
}

function renderScene() {
  animationFrame = 0
  if (!sectionRef.value || !sceneRef.value || !isVisible || prefersReducedMotion.value) return

  const rect = sectionRef.value.getBoundingClientRect()
  const viewport = Math.max(1, window.innerHeight)
  const progress = Math.min(1, Math.max(0, (viewport - rect.top) / (viewport + rect.height)))
  const easedProgress = 1 - Math.pow(1 - progress, 3)
  sceneRef.value.style.setProperty('--proof-progress', easedProgress.toFixed(4))
  sceneRef.value.style.setProperty('--proof-x-left', `${pointerX * -11}px`)
  sceneRef.value.style.setProperty('--proof-x-right', `${pointerX * 11}px`)
  sceneRef.value.style.setProperty('--proof-x-center', `${pointerX * 6}px`)
  sceneRef.value.style.setProperty('--proof-y-top', `${(1 - easedProgress) * 82 + pointerY * -7}px`)
  sceneRef.value.style.setProperty('--proof-y-bottom', `${(1 - easedProgress) * -72 + pointerY * 9}px`)
  sceneRef.value.style.setProperty('--proof-y-center', `${(1 - easedProgress) * 58 + pointerY * -5}px`)
}

function scheduleRender() {
  if (!animationFrame) animationFrame = window.requestAnimationFrame(renderScene)
}

function onPointerMove(event: PointerEvent) {
  if (!sectionRef.value || event.pointerType === 'touch') return
  const rect = sectionRef.value.getBoundingClientRect()
  pointerX = Math.min(1, Math.max(-1, ((event.clientX - rect.left) / rect.width - 0.5) * 2))
  pointerY = Math.min(1, Math.max(-1, ((event.clientY - rect.top) / rect.height - 0.5) * 2))
  scheduleRender()
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionPreference()
  motionQuery.addEventListener('change', updateMotionPreference)

  observer = new IntersectionObserver(([entry]) => {
    isVisible = Boolean(entry?.isIntersecting)
    if (isVisible) scheduleRender()
  }, { rootMargin: '25% 0px' })
  if (sectionRef.value) observer.observe(sectionRef.value)

  window.addEventListener('scroll', scheduleRender, { passive: true })
  window.addEventListener('resize', scheduleRender, { passive: true })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  motionQuery?.removeEventListener('change', updateMotionPreference)
  window.removeEventListener('scroll', scheduleRender)
  window.removeEventListener('resize', scheduleRender)
  if (animationFrame) window.cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <section
    v-if="selectedProjects.length"
    ref="sectionRef"
    aria-labelledby="project-proof-title"
    class="project-proof section-surface relative overflow-hidden py-16 sm:py-20 lg:py-28"
    @pointermove="onPointerMove"
  >
    <div class="section-background" aria-hidden="true">
      <div class="section-grid" />
      <div class="project-proof__glow" />
    </div>

    <div class="section-container relative z-10">
      <div
        ref="sceneRef"
        class="project-proof__scene"
        :style="{ '--proof-count': selectedProjects.length }"
      >
        <div class="project-proof__center">
          <span class="badge">{{ copy.eyebrow }}</span>
          <p class="mt-6 font-display text-5xl font-black tabular-nums text-gray-950 dark:text-white sm:text-6xl lg:text-7xl">
            {{ selectedProjects.length }}
          </p>
          <p class="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
            {{ copy.count }}
          </p>
          <h2 id="project-proof-title" class="mx-auto mt-6 max-w-[13ch] font-display text-3xl font-bold leading-[1.02] text-gray-950 dark:text-white sm:text-4xl lg:text-5xl">
            {{ copy.title }}
          </h2>
          <p class="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-700 dark:text-gray-300 sm:text-lg">
            {{ copy.body }}
          </p>
          <a href="#portfolio" class="btn-primary mt-7 inline-flex min-h-11 items-center gap-2">
            {{ copy.all }}
            <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div class="project-proof__orbit" aria-label="Sélection de projets">
          <NuxtLink
            v-for="(project, index) in selectedProjects"
            :key="project.id"
            :to="localePath(`/projets/${project.slug}`)"
            class="project-proof__card group"
            :class="`project-proof__card--${index + 1}`"
            :aria-label="`${copy.action} : ${project.title}`"
          >
            <div class="project-proof__media">
              <img
                v-if="project.image"
                :src="project.image"
                :alt="project.title"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              >
              <div v-else class="h-full w-full bg-gradient-brand" />
              <div class="project-proof__shade" />
            </div>
            <div class="project-proof__meta">
              <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">{{ project.category }}</span>
              <h3 class="mt-1 line-clamp-1 font-display text-base font-bold text-white sm:text-lg">{{ project.title }}</h3>
              <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-white/70">{{ projectDescription(project) }}</p>
            </div>
            <span class="project-proof__arrow" aria-hidden="true">↗</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.project-proof__scene {
  --proof-progress: 0;
  --proof-x-left: 0px;
  --proof-x-right: 0px;
  --proof-x-center: 0px;
  --proof-y-top: 82px;
  --proof-y-bottom: -72px;
  --proof-y-center: 58px;
  position: relative;
  min-height: 760px;
  isolation: isolate;
}

.project-proof__glow {
  position: absolute;
  inset: 20% 8%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 48% 50%, rgb(34 211 238 / 0.14), transparent 34%),
    radial-gradient(circle at 55% 52%, rgb(124 58 237 / 0.16), transparent 55%);
  filter: blur(36px);
}

.project-proof__center {
  position: absolute;
  z-index: 20;
  left: 50%;
  top: 50%;
  width: min(92%, 650px);
  text-align: center;
  transform: translate(-50%, -50%);
}

.project-proof__orbit {
  position: absolute;
  inset: 0;
  perspective: 1200px;
  pointer-events: none;
}

.project-proof__card {
  position: absolute;
  z-index: 10;
  display: block;
  width: clamp(210px, 20vw, 310px);
  aspect-ratio: 1.48;
  overflow: hidden;
  border-radius: 1.55rem;
  color: white;
  outline: 1px solid rgb(255 255 255 / 0.13);
  box-shadow: 0 28px 80px rgb(15 23 42 / 0.24), 0 8px 24px rgb(76 29 149 / 0.16);
  pointer-events: auto;
  transition-property: box-shadow, outline-color;
  transition-duration: 180ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
  will-change: transform;
}

.project-proof__card:hover,
.project-proof__card:focus-visible {
  z-index: 30;
  outline-color: rgb(34 211 238 / 0.75);
  box-shadow: 0 32px 90px rgb(15 23 42 / 0.34), 0 0 36px rgb(34 211 238 / 0.18);
}

.project-proof__card:focus-visible {
  outline-width: 2px;
  outline-offset: 4px;
}

.project-proof__card:active {
  scale: 0.96;
}

.project-proof__media,
.project-proof__shade {
  position: absolute;
  inset: 0;
}

.project-proof__shade {
  background: linear-gradient(180deg, transparent 26%, rgb(3 7 18 / 0.9) 100%);
}

.project-proof__meta {
  position: absolute;
  z-index: 2;
  right: 1.15rem;
  bottom: 1rem;
  left: 1.15rem;
}

.project-proof__arrow {
  position: absolute;
  z-index: 3;
  top: 0.85rem;
  right: 0.85rem;
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 999px;
  background: rgb(3 7 18 / 0.62);
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
}

.project-proof__card--1 {
  left: 2%;
  top: 6%;
  transform: translate3d(var(--proof-x-left), var(--proof-y-top), 0) rotate(-7deg) rotateY(8deg);
}

.project-proof__card--2 {
  right: 1%;
  top: 8%;
  transform: translate3d(var(--proof-x-right), var(--proof-y-top), 0) rotate(7deg) rotateY(-9deg);
}

.project-proof__card--3 {
  left: -1%;
  bottom: 2%;
  transform: translate3d(var(--proof-x-left), var(--proof-y-bottom), 0) rotate(6deg) rotateY(10deg);
}

.project-proof__card--4 {
  right: -1%;
  bottom: 3%;
  transform: translate3d(var(--proof-x-right), var(--proof-y-bottom), 0) rotate(-6deg) rotateY(-8deg);
}

.project-proof__card--5 {
  left: 50%;
  top: -2%;
  width: clamp(185px, 17vw, 260px);
  transform: translate3d(calc(-50% + var(--proof-x-center)), var(--proof-y-center), 0) rotate(1deg) rotateX(-5deg);
}

@media (max-width: 1023px) {
  .project-proof__scene { min-height: 690px; }
  .project-proof__card { width: clamp(185px, 25vw, 240px); }
  .project-proof__card--1,
  .project-proof__card--3 { left: -3%; }
  .project-proof__card--2,
  .project-proof__card--4 { right: -3%; }
}

@media (max-width: 767px) {
  .project-proof__scene { min-height: auto; }
  .project-proof__center {
    position: relative;
    left: auto;
    top: auto;
    width: 100%;
    transform: none;
  }
  .project-proof__orbit {
    position: relative;
    inset: auto;
    display: grid;
    grid-auto-columns: min(84vw, 330px);
    grid-auto-flow: column;
    gap: 1rem;
    margin-top: 2.25rem;
    margin-right: calc(50% - 50vw);
    margin-left: calc(50% - 50vw);
    padding: 0 max(1.25rem, calc((100vw - 42rem) / 2));
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    perspective: none;
    scroll-padding-inline: 1.25rem;
    scroll-snap-type: inline mandatory;
    scrollbar-width: none;
  }
  .project-proof__orbit::-webkit-scrollbar { display: none; }
  .project-proof__card,
  .project-proof__card--1,
  .project-proof__card--2,
  .project-proof__card--3,
  .project-proof__card--4,
  .project-proof__card--5 {
    position: relative;
    inset: auto;
    width: 100%;
    transform: none;
    scroll-snap-align: center;
    will-change: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .project-proof__card { will-change: auto; }
  .project-proof__card img { transition: none; }
}
</style>
