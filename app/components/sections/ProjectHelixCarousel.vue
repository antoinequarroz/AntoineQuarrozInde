<script setup lang="ts">
import type { Project } from '~/types'

type PortfolioCategory = 'all' | Project['category']

const props = defineProps<{
  projects: Project[]
  activeCategory?: PortfolioCategory
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { track } = useMarketing()
const rootRef = shallowRef<HTMLElement | null>(null)
const progressBarRef = ref<HTMLElement | null>(null)
const navListRef = ref<HTMLElement | null>(null)
const mobileListRef = ref<HTMLElement | null>(null)
const activeSourceIndex = ref(0)
const mobileActiveIndex = ref(0)
const desktopReady = ref(false)
const prefersReducedMotion = ref(false)

let cards: HTMLElement[] = []
let scrollFrame = 0
let resizeFrame = 0
let mobileScrollFrame = 0
let lastScrollY = 0
let lastScrollSample = 0
let lastRenderSample = 0
let scrollVelocity = 0
let visualProgress = 0
let visualProgressReady = false
let observer: IntersectionObserver | null = null
let sectionIsNear = false
let motionQuery: MediaQueryList | null = null

function updateMotionPreference() {
  prefersReducedMotion.value = Boolean(motionQuery?.matches)
}
let metrics = {
  top: 0,
  height: 1,
  viewportHeight: 1,
  viewportWidth: 1,
}

const sourceTotal = computed(() => Math.max(1, props.projects.length))
const maxSourceStep = computed(() => Math.max(0, props.projects.length - 1))
const desktopTrackStyle = computed(() => {
  const projectSteps = Math.max(0, sourceTotal.value - 1)
  const trackHeight = projectSteps ? Math.min(700, Math.max(420, 180 + projectSteps * 48)) : 120
  return { height: `${trackHeight}vh` }
})

const activeProject = computed(() => props.projects[activeSourceIndex.value] ?? props.projects[0])
const activeCategoryLabel = computed(() => categoryLabel(props.activeCategory ?? 'all'))
const activeCategoryIntro = computed(() => {
  const category = props.activeCategory ?? 'all'
  return {
    title: t(`portfolio.category_intro.${category}.title`),
    text: t(`portfolio.category_intro.${category}.text`),
  }
})
const activeProofs = computed(() => {
  if (!activeProject.value) return []
  return [
    activeProject.value.liveUrl ? t('portfolio.live_available') : '',
    activeProject.value.codeUrl ? t('portfolio.source_available') : '',
  ].filter(Boolean)
})
const selectionCountLabel = computed(() => t(
  props.projects.length === 1 ? 'portfolio.selection_count_one' : 'portfolio.selection_count_many',
  { count: props.projects.length },
))

function categoryLabel(category: PortfolioCategory) {
  return t(`portfolio.${category}`)
}

function descriptionFor(project: Project) {
  if (locale.value === 'en' && project.descriptionEn?.trim()) return project.descriptionEn
  if (locale.value === 'de' && project.descriptionDe?.trim()) return project.descriptionDe
  return project.description
}

function descriptionLanguage(project: Project) {
  if (locale.value === 'en' && project.descriptionEn?.trim()) return 'en'
  if (locale.value === 'de' && project.descriptionDe?.trim()) return 'de'
  return 'fr'
}

function collectCards() {
  cards = rootRef.value
    ? Array.from(rootRef.value.querySelectorAll<HTMLElement>('[data-helix-card]'))
    : []
}

function measure() {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  metrics = {
    top: rect.top + window.scrollY,
    height: Math.max(1, rootRef.value.offsetHeight),
    viewportHeight: Math.max(1, window.innerHeight),
    viewportWidth: Math.max(1, window.innerWidth),
  }
  renderHelix()
}

function currentProgress() {
  const stickyTop = metrics.viewportWidth >= 1280 ? 96 : 80
  const sectionTopInViewport = metrics.top - window.scrollY
  const end = -Math.max(metrics.viewportHeight, metrics.height - metrics.viewportHeight * 1.02)
  const value = (stickyTop - sectionTopInViewport) / (stickyTop - end)
  return Math.min(1, Math.max(0, value))
}

function renderHelix() {
  scrollFrame = 0
  if (!cards.length || metrics.viewportWidth < 768) return

  const now = performance.now()
  const frameDuration = lastRenderSample ? Math.min(34, now - lastRenderSample) : 16.67
  lastRenderSample = now
  const velocityEnergy = Math.min(1, Math.abs(scrollVelocity) / 2.4)
  const velocityDirection = Math.sign(scrollVelocity)
  const targetProgress = currentProgress()
  const progressDistance = targetProgress - visualProgress

  if (!visualProgressReady || prefersReducedMotion.value || Math.abs(progressDistance) > 0.12) {
    visualProgress = targetProgress
    visualProgressReady = true
  }
  else {
    const frameRatio = frameDuration / 16.67
    const followStrength = 1 - Math.pow(0.72, frameRatio)
    visualProgress += progressDistance * followStrength
    if (Math.abs(targetProgress - visualProgress) < 0.00008) visualProgress = targetProgress
  }

  const progress = visualProgress
  const total = Math.max(1, props.projects.length)
  const step = progress * Math.max(0, total - 1)
  const spin = total > 1 ? step * (360 / total) : 0
  const horizontalRadius = metrics.viewportWidth >= 1440 ? 270 : metrics.viewportWidth >= 1280 ? 240 : 205
  const verticalRadius = metrics.viewportHeight >= 900 ? 390 : 330

  cards.forEach((card, index) => {
    const baseAngle = (index / total) * 360
    const angle = baseAngle - spin
    const normalized = ((angle + 540) % 360) - 180
    const absoluteAngle = Math.abs(normalized)
    const radians = normalized * (Math.PI / 180)
    const frontSeparationDistance = metrics.viewportWidth >= 1280 ? 195 : 190
    const frontSeparation = absoluteAngle < 80
      ? Math.sin((absoluteAngle / 80) * Math.PI) * frontSeparationDistance
      : 0
    const x = Math.sin(radians) * horizontalRadius + Math.sign(normalized) * frontSeparation
    const y = (normalized / 180) * verticalRadius + Math.sin(radians * 2) * 34
    const z = Math.cos(radians) * 560 - 650
    const rotateY = -normalized * 0.78
    const rotateX = (normalized / 180) * -16
    const rotateZ = Math.sin(radians) * -4
    const skewY = Math.sin(radians) * -4.5
    const scaleX = 1 - Math.min(0.24, absoluteAngle / 520)
    const scaleY = 1 + Math.min(0.08, absoluteAngle / 1200)
    const scale = 0.68 + ((Math.cos(radians) + 1) / 2) * 0.38
    const deformation = absoluteAngle < 64
      ? Math.sin((absoluteAngle / 64) * Math.PI)
      : 0
    const deformationDirection = Math.sign(normalized)
    const frontWeight = Math.max(0, 1 - absoluteAngle / 96)
    const materialDeformation = Math.min(1.18, deformation + velocityEnergy * frontWeight * 0.45)
    const velocityBlend = velocityEnergy * frontWeight
    const materialDirection = deformationDirection * (1 - velocityBlend) - velocityDirection * velocityBlend
    const passageTilt = materialDirection * materialDeformation * 2.8
    const passageWarp = materialDirection * materialDeformation * -2.4
    const wholeCardRotateY = rotateY + materialDirection * materialDeformation * 8
    const wholeCardCompression = 1 - materialDeformation * 0.085
    const wholeCardStretch = 1 + materialDeformation * 0.028
    const opacity = total > 1
      ? Math.max(0, 1 - absoluteAngle / 158)
      : 1

    card.style.opacity = String(opacity)
    card.style.zIndex = String(1000 - Math.round(absoluteAngle))
    card.style.pointerEvents = absoluteAngle < 28 ? 'auto' : 'none'
    card.style.transformOrigin = 'center center'
    card.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotateX - materialDeformation * 1.4}deg) rotateY(${wholeCardRotateY}deg) rotateZ(${rotateZ + passageTilt}deg) skewY(${skewY + passageWarp}deg) scale3d(${scale * scaleX * wholeCardCompression}, ${scale * scaleY * wholeCardStretch}, 1)`
  })

  if (progressBarRef.value) {
    progressBarRef.value.style.transform = `scaleX(${progress})`
  }

  const nextIndex = Math.min(total - 1, Math.max(0, Math.round(step)))
  if (nextIndex !== activeSourceIndex.value) activeSourceIndex.value = nextIndex

  scrollVelocity *= Math.pow(0.82, frameDuration / 16.67)
  const progressIsSettling = Math.abs(targetProgress - visualProgress) > 0.00008
  if (sectionIsNear && (Math.abs(scrollVelocity) > 0.015 || progressIsSettling) && !scrollFrame) {
    scrollFrame = window.requestAnimationFrame(renderHelix)
  }
}

function scheduleRender() {
  const now = performance.now()
  const currentScrollY = window.scrollY
  const elapsed = lastScrollSample ? now - lastScrollSample : 16
  const sampleDuration = elapsed > 120 ? 16 : Math.max(8, elapsed)
  const instantVelocity = (currentScrollY - lastScrollY) / sampleDuration
  scrollVelocity = scrollVelocity * 0.35 + instantVelocity * 0.65
  lastScrollY = currentScrollY
  lastScrollSample = now

  if (!sectionIsNear || scrollFrame) return
  scrollFrame = window.requestAnimationFrame(renderHelix)
}

function scheduleMeasure() {
  if (resizeFrame) return
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0
    measure()
  })
}

function scheduleMobileIndex() {
  if (mobileScrollFrame) return
  mobileScrollFrame = window.requestAnimationFrame(() => {
    mobileScrollFrame = 0
    const list = mobileListRef.value
    if (!list) return

    const listCenter = list.getBoundingClientRect().left + list.clientWidth / 2
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-mobile-project-card]'))
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect()
      const distance = Math.abs(rect.left + rect.width / 2 - listCenter)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    mobileActiveIndex.value = nearestIndex
  })
}

async function keepActiveNavVisible() {
  await nextTick()
  const list = navListRef.value
  const activeButton = list?.querySelector<HTMLElement>('[aria-current="true"]')
  if (!list || !activeButton) return

  const listRect = list.getBoundingClientRect()
  const buttonRect = activeButton.getBoundingClientRect()
  const edgePadding = 6
  let nextScrollTop = list.scrollTop

  if (buttonRect.top < listRect.top + edgePadding) {
    nextScrollTop += buttonRect.top - listRect.top - edgePadding
  }
  else if (buttonRect.bottom > listRect.bottom - edgePadding) {
    nextScrollTop += buttonRect.bottom - listRect.bottom + edgePadding
  }
  else {
    return
  }

  list.scrollTo({
    top: Math.max(0, nextScrollTop),
    behavior: prefersReducedMotion.value ? 'auto' : 'smooth',
  })
}

function goToProject(index: number) {
  if (!rootRef.value || !maxSourceStep.value) return
  const stickyTop = metrics.viewportWidth >= 1280 ? 96 : 80
  const end = -Math.max(metrics.viewportHeight, metrics.height - metrics.viewportHeight * 1.02)
  const targetProgress = Math.min(1, Math.max(0, index / maxSourceStep.value))
  const targetScrollY = metrics.top - stickyTop + targetProgress * (stickyTop - end)

  window.scrollTo({ top: targetScrollY, behavior: 'smooth' })
}

function trackProject(event: 'project_case_study_click' | 'project_live_click' | 'project_code_click', project: Project) {
  track(event, { projectId: project.id, slug: project.slug, category: project.category })
}

async function refreshProjects() {
  await nextTick()
  activeSourceIndex.value = 0
  mobileActiveIndex.value = 0
  mobileListRef.value?.scrollTo({ left: 0, behavior: 'auto' })
  collectCards()
  measure()
}

onMounted(async () => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionPreference()
  motionQuery.addEventListener('change', updateMotionPreference)
  await nextTick()
  collectCards()
  measure()
  lastScrollY = window.scrollY
  lastScrollSample = performance.now()
  desktopReady.value = true

  observer = new IntersectionObserver(([entry]) => {
    sectionIsNear = Boolean(entry?.isIntersecting)
    if (!sectionIsNear) lastRenderSample = 0
    cards.forEach((card) => {
      card.style.willChange = sectionIsNear ? 'transform, opacity' : 'auto'
    })
    if (progressBarRef.value) {
      progressBarRef.value.style.willChange = sectionIsNear ? 'transform' : 'auto'
    }
    if (sectionIsNear) scheduleRender()
  }, { rootMargin: '100% 0px' })
  if (rootRef.value) observer.observe(rootRef.value)

  window.addEventListener('scroll', scheduleRender, { passive: true })
  window.addEventListener('resize', scheduleMeasure, { passive: true })
})

watch(() => props.projects.map(project => project.id).join('|'), refreshProjects)
watch(activeSourceIndex, keepActiveNavVisible)

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', scheduleRender)
  window.removeEventListener('resize', scheduleMeasure)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  if (resizeFrame) window.cancelAnimationFrame(resizeFrame)
  if (mobileScrollFrame) window.cancelAnimationFrame(mobileScrollFrame)
  motionQuery?.removeEventListener('change', updateMotionPreference)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <div v-if="!projects.length" class="rounded-2xl border border-violet-500/15 bg-white/70 p-10 text-center text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
      {{ t('portfolio.coming_soon') }}
    </div>

    <div v-else>
      <div :class="{ 'md:hidden': !prefersReducedMotion }">
        <div class="mb-2.5 flex items-center justify-between gap-4 px-0.5 text-xs text-gray-500 dark:text-gray-400 md:px-1">
          <p>{{ t('portfolio.browse_hint') }}</p>
          <p
            class="shrink-0 font-display font-semibold tabular-nums text-violet-700 dark:text-violet-200"
            aria-live="polite"
            :aria-label="t('portfolio.project_position', { current: mobileActiveIndex + 1, total: projects.length })"
          >
            {{ String(mobileActiveIndex + 1).padStart(2, '0') }}/{{ String(projects.length).padStart(2, '0') }}
          </p>
        </div>
        <div
          ref="mobileListRef"
          data-mobile-project-carousel
          role="region"
          :aria-label="t('portfolio.mobile_carousel_label')"
          class="-mx-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-2.5 pb-4 no-scrollbar max-[390px]:-mx-2 max-[390px]:gap-2 max-[390px]:px-2"
          @scroll.passive="scheduleMobileIndex"
        >
          <article
            v-for="(project, index) in projects"
            :key="project.id"
            data-mobile-project-card
            :aria-current="index === mobileActiveIndex ? 'true' : undefined"
            class="min-w-[84vw] snap-center overflow-hidden rounded-[1.35rem] border border-violet-500/15 bg-white/80 shadow-xl shadow-violet-500/10 dark:border-white/10 dark:bg-white/[0.04] max-[430px]:min-w-[88vw] max-[390px]:min-w-[91vw] max-[390px]:rounded-[1.2rem]"
          >
            <div class="relative h-48 overflow-hidden bg-[#10101b] max-[430px]:h-44 max-[390px]:h-40">
              <img v-if="project.image" :src="project.image" :alt="project.title" class="h-full w-full object-cover" loading="lazy" decoding="async">
              <div v-else class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.42),transparent_36%),radial-gradient(circle_at_72%_72%,rgba(34,211,238,0.28),transparent_34%)]" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div class="absolute inset-x-4 bottom-4">
                <span class="rounded-full bg-black/45 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">{{ categoryLabel(project.category) }}</span>
                <h3 class="mt-2 line-clamp-2 font-display text-xl font-bold leading-tight text-white max-[390px]:text-lg">{{ project.title }}</h3>
              </div>
            </div>
            <div class="p-3.5 max-[390px]:p-3">
              <p :lang="descriptionLanguage(project)" class="line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{{ descriptionFor(project) }}</p>
              <div v-if="project.liveUrl || project.codeUrl || (locale === 'fr' && project.caseStudyPublished)" class="mt-3 flex flex-wrap gap-2">
                <NuxtLink v-if="locale === 'fr' && project.caseStudyPublished" :to="localePath(`/projets/${project.slug}`)" class="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-4 text-xs font-bold text-white transition-colors hover:bg-violet-500" @click="trackProject('project_case_study_click', project)">
                  {{ t('portfolio.read_case_study') }}
                </NuxtLink>
                <a v-if="project.liveUrl" :href="project.liveUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-4 text-xs font-bold text-white transition-colors hover:bg-violet-500" @click="trackProject('project_live_click', project)">{{ t('portfolio.view') }}</a>
                <a v-if="project.codeUrl" :href="project.codeUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center rounded-full border border-violet-500/25 px-4 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-500/10 dark:text-violet-200" @click="trackProject('project_code_click', project)">{{ t('portfolio.code') }}</a>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div
        v-if="!prefersReducedMotion"
        class="relative left-1/2 hidden w-screen -translate-x-1/2 md:block"
        :class="desktopReady ? 'opacity-100' : 'opacity-0'"
        :style="desktopTrackStyle"
      >
        <div class="sticky top-20 flex h-[calc(100vh-5rem)] min-h-[420px] items-center justify-center overflow-hidden xl:top-24 xl:h-[calc(100vh-6rem)]">
          <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,246,251,0.92),rgba(238,242,255,0.76)_45%,rgba(246,246,251,0.94)),radial-gradient(circle_at_50%_47%,rgba(124,58,237,0.18),transparent_36%),radial-gradient(circle_at_54%_42%,rgba(34,211,238,0.14),transparent_26%)] dark:bg-[linear-gradient(180deg,rgba(6,6,14,0.94),rgba(9,9,18,0.82)_45%,rgba(6,6,14,0.96)),radial-gradient(circle_at_50%_47%,rgba(124,58,237,0.22),transparent_36%),radial-gradient(circle_at_54%_42%,rgba(34,211,238,0.16),transparent_26%)]" />
          <div data-helix-top-fade class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f7f8ff] via-[#f7f8ff]/65 to-transparent dark:from-[#070710] dark:via-[#070710]/60" />
          <div class="absolute inset-x-0 top-10 mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
          <div class="absolute left-1/2 top-[54%] h-[36rem] w-[17rem] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-violet-500/15 dark:border-white/10" />
          <div class="absolute left-1/2 top-[54%] h-[27rem] w-[10rem] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-cyan-400/15 dark:border-cyan-300/10" />
          <div class="absolute left-1/2 top-[54%] h-[52vh] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-violet-400/25 to-transparent" />

          <aside class="absolute left-[max(1rem,calc((100vw-1040px)/2))] top-[54%] z-[1200] w-[17.5rem] -translate-y-1/2 xl:w-[19rem]">
            <div v-if="activeProject" class="relative overflow-hidden rounded-[1.45rem] border border-violet-500/15 bg-white/[0.88] p-4 shadow-2xl shadow-violet-500/10 backdrop-blur-lg dark:border-white/10 dark:bg-black/45">
              <div class="flex items-center justify-between gap-4">
                <span class="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">{{ categoryLabel(activeProject.category) }}</span>
                <span class="font-display text-sm text-gray-400">{{ String(activeSourceIndex + 1).padStart(2, '0') }}/{{ String(projects.length).padStart(2, '0') }}</span>
              </div>
              <p v-if="locale === 'fr' && activeProject.caseStudyPublished" class="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{{ t('portfolio.case_study') }}</p>
              <h3 class="mt-3 font-display text-2xl font-bold leading-tight text-gray-950 dark:text-white xl:text-3xl">{{ activeProject.title }}</h3>
              <p :lang="descriptionLanguage(activeProject)" class="mt-2 line-clamp-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{{ descriptionFor(activeProject) }}</p>
              <div v-if="activeProject.tags.length || activeProofs.length" class="mt-4 space-y-3 rounded-2xl bg-violet-50/80 p-3 dark:bg-violet-500/10">
                <div v-if="activeProject.tags.length">
                  <p class="text-xs font-bold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">{{ t('portfolio.technologies') }}</p>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <span v-for="tag in activeProject.tags.slice(0, 4)" :key="tag" class="rounded-full bg-white/80 px-2.5 py-1 text-xs text-violet-700 dark:bg-white/[0.06] dark:text-violet-100">{{ tag }}</span>
                  </div>
                </div>
                <div v-if="activeProofs.length">
                  <p class="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-200">{{ t('portfolio.verifiable_links') }}</p>
                  <ul class="mt-2 space-y-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    <li v-for="proof in activeProofs" :key="proof" class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-cyan-500" />{{ proof }}</li>
                  </ul>
                </div>
              </div>
              <div class="mt-5 flex flex-wrap gap-2">
                <NuxtLink v-if="locale === 'fr' && activeProject.caseStudyPublished" :to="localePath(`/projets/${activeProject.slug}`)" class="btn-primary rounded-full px-4 py-2 text-xs" @click="trackProject('project_case_study_click', activeProject)">{{ t('portfolio.read_case_study') }}</NuxtLink>
                <a v-if="activeProject.liveUrl" :href="activeProject.liveUrl" target="_blank" rel="noopener noreferrer" class="btn-primary rounded-full px-4 py-2 text-xs" @click="trackProject('project_live_click', activeProject)">{{ t('portfolio.view') }}</a>
                <a v-if="activeProject.codeUrl" :href="activeProject.codeUrl" target="_blank" rel="noopener noreferrer" class="btn-secondary rounded-full px-4 py-2 text-xs" @click="trackProject('project_code_click', activeProject)">{{ t('portfolio.code') }}</a>
              </div>
            </div>
          </aside>

          <aside class="absolute right-[max(1rem,calc((100vw-1040px)/2))] top-[54%] z-[1200] w-[13.5rem] -translate-y-1/2 rounded-[1.1rem] border border-violet-500/15 bg-white/75 p-3 text-sm text-gray-600 shadow-xl shadow-violet-500/10 backdrop-blur-lg dark:border-white/10 dark:bg-black/35 dark:text-gray-300 xl:w-[14.5rem] xl:p-3.5">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">{{ activeCategoryLabel }}</p>
            <h3 class="mt-3 font-display text-xl font-bold leading-tight text-gray-950 dark:text-white">{{ activeCategoryIntro.title }}</h3>
            <p class="mt-3 leading-relaxed">{{ activeCategoryIntro.text }}</p>
            <p class="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ selectionCountLabel }}</p>
            <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-violet-500/10 dark:bg-white/10">
              <div ref="progressBarRef" class="h-full origin-left scale-x-0 rounded-full bg-gradient-brand" />
            </div>
            <div ref="navListRef" data-project-navigation class="mt-3 max-h-[11rem] space-y-1.5 overflow-y-auto pr-1 xl:max-h-[13rem]">
              <button
                v-for="(project, index) in projects"
                :key="`nav-${project.id}`"
                type="button"
                :aria-current="index === activeSourceIndex ? 'true' : undefined"
                class="group flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors duration-200"
                :class="index === activeSourceIndex ? 'bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-100' : 'text-violet-800 hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-200 dark:hover:bg-white/[0.04] dark:hover:text-white'"
                @click="goToProject(index)"
              >
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="index === activeSourceIndex ? 'bg-gradient-brand' : 'bg-violet-500/25 dark:bg-white/20'" />
                <span class="min-w-0 flex-1 truncate text-xs font-semibold">{{ project.title }}</span>
                <span class="font-display text-xs text-gray-400">{{ String(index + 1).padStart(2, '0') }}</span>
              </button>
            </div>
          </aside>

          <div class="relative h-full w-full [perspective:2600px] [transform-style:preserve-3d]">
            <article
              v-for="(project, index) in projects"
              :key="`${project.id}-${index}`"
              data-helix-card
              class="absolute left-1/2 top-[54%] isolate h-[20.5rem] w-[16.2rem] rounded-[1.25rem] shadow-[0_28px_64px_-24px_rgba(76,29,149,0.26)] dark:shadow-[0_28px_64px_-24px_rgba(2,2,8,0.78)] [backface-visibility:hidden] xl:h-[22rem] xl:w-[17.5rem] xl:rounded-[1.4rem]"
            >
              <div data-helix-surface class="relative h-full w-full overflow-hidden rounded-[inherit] border border-violet-500/15 bg-white/95 dark:border-white/15 dark:bg-[#11111b]">
                <div class="relative h-36 overflow-hidden bg-[#10101b] xl:h-44">
                  <img v-if="project.image" data-helix-image :src="project.image" :alt="project.title" class="h-full w-full object-cover" loading="lazy" decoding="async">
                  <div v-else class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.42),transparent_36%),radial-gradient(circle_at_72%_72%,rgba(34,211,238,0.28),transparent_34%)]" />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <span class="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">{{ categoryLabel(project.category) }}</span>
                </div>
                <div data-helix-content class="p-3 xl:p-3.5">
                  <h3 class="font-display text-base font-bold leading-tight text-gray-950 dark:text-white xl:text-lg">{{ project.title }}</h3>
                  <p :lang="descriptionLanguage(project)" class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-white/70">{{ descriptionFor(project) }}</p>
                  <div class="mt-4 flex flex-wrap gap-1.5">
                    <span v-for="tag in project.tags.slice(0, 3)" :key="tag" class="rounded-full bg-violet-500/[0.08] px-2.5 py-1 text-xs text-violet-700 dark:bg-white/[0.08] dark:text-white/70">{{ tag }}</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
