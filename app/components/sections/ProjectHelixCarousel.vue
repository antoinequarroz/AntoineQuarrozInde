<script setup lang="ts">
import type { Project } from '~/types'

type PortfolioCategory = 'all' | Project['category']

const props = defineProps<{
  projects: Project[]
  activeCategory?: PortfolioCategory
}>()

const { t } = useI18n()
const rootRef = ref<HTMLElement | null>(null)
const { top, height } = useElementBounding(rootRef)
const { height: viewportH, width: viewportW } = useWindowSize()

function categoryLabel(category: PortfolioCategory) {
  return t(`portfolio.${category}`)
}

const sourceTotal = computed(() => Math.max(1, props.projects.length))
const maxSourceStep = computed(() => Math.max(0, props.projects.length - 1))

const displayProjects = computed(() => {
  if (!props.projects.length) return []
  return props.projects
})

const desktopTrackStyle = computed(() => ({
  height: `${Math.max(380, sourceTotal.value * 105)}vh`,
}))

const progress = computed(() => {
  const vh = Math.max(1, viewportH.value)
  const h = Math.max(1, height.value)
  const start = vh * 0.58
  const end = -Math.max(vh, h - vh * 1.02)
  const p = (start - top.value) / (start - end)
  return Math.min(1, Math.max(0, p))
})

const settledProgress = ref(0)
let scrollSettleTimer: ReturnType<typeof setTimeout> | undefined

watch(progress, (value) => {
  if (scrollSettleTimer) clearTimeout(scrollSettleTimer)
  scrollSettleTimer = setTimeout(() => {
    settledProgress.value = value
  }, 140)
}, { immediate: true })

onBeforeUnmount(() => {
  if (scrollSettleTimer) clearTimeout(scrollSettleTimer)
})

const rawSourceStep = computed(() => settledProgress.value * maxSourceStep.value)

const activeSourceIndex = computed(() => {
  if (!props.projects.length) return 0
  return Math.min(props.projects.length - 1, Math.max(0, Math.round(rawSourceStep.value)))
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

const activeCase = computed(() => {
  const category = activeProject.value?.category ?? 'web'
  return {
    context: t(`portfolio.case.${category}.context`),
    impact: t(`portfolio.case.${category}.impact`),
  }
})

function goToProject(index: number) {
  if (!rootRef.value || !maxSourceStep.value) return
  const vh = Math.max(1, viewportH.value)
  const h = Math.max(1, height.value)
  const start = vh * 0.58
  const end = -Math.max(vh, h - vh * 1.02)
  const travel = start - end
  const targetProgress = Math.min(1, Math.max(0, index / maxSourceStep.value))
  const targetTop = start - targetProgress * travel
  const elementTop = rootRef.value.getBoundingClientRect().top + window.scrollY

  window.scrollTo({
    top: elementTop - targetTop,
    behavior: 'smooth',
  })
}

function cardStyle(index: number) {
  const total = Math.max(1, displayProjects.value.length)
  const spin = sourceTotal.value > 1
    ? rawSourceStep.value * (360 / sourceTotal.value)
    : settledProgress.value * 360
  const baseAngle = (index / total) * 360
  const angle = baseAngle - spin
  const normalized = ((angle + 540) % 360) - 180
  const abs = Math.abs(normalized)
  const radians = normalized * (Math.PI / 180)
  const horizontalRadius = viewportW.value >= 1440 ? 270 : viewportW.value >= 1280 ? 240 : 205
  const verticalRadius = viewportH.value >= 900 ? 390 : 330
  const x = Math.sin(radians) * horizontalRadius
  const y = (normalized / 180) * verticalRadius + Math.sin(radians * 2) * 34
  const z = Math.cos(radians) * 560 - 650
  const rotateY = -normalized * 0.78
  const rotateX = (normalized / 180) * -16
  const rotateZ = Math.sin(radians) * -4
  const skewY = Math.sin(radians) * -4.5
  const scaleX = 1 - Math.min(0.24, abs / 520)
  const scaleY = 1 + Math.min(0.08, abs / 1200)
  const scale = 0.68 + ((Math.cos(radians) + 1) / 2) * 0.38
  const opacity = sourceTotal.value > 1
    ? Math.max(0.1, 1 - abs / 158)
    : 0.78 + ((Math.cos(radians) + 1) / 2) * 0.22

  return {
    opacity,
    zIndex: String(1000 - Math.round(abs)),
    pointerEvents: abs < 28 ? 'auto' : 'none',
    transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) skewY(${skewY}deg) scale3d(${scale * scaleX}, ${scale * scaleY}, 1)`,
  }
}
</script>

<template>
  <div ref="rootRef" class="relative">
    <div v-if="!projects.length" class="rounded-2xl border border-violet-500/15 bg-white/70 p-10 text-center text-gray-500 backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
      {{ t('portfolio.coming_soon') }}
    </div>

    <div v-else>
      <div class="md:hidden">
        <div class="-mx-3 max-[390px]:-mx-2.5 flex snap-x gap-3 max-[390px]:gap-2.5 overflow-x-auto px-3 max-[390px]:px-2.5 pb-4 no-scrollbar">
          <article
            v-for="project in projects"
            :key="project.id"
            class="min-w-[86vw] max-[430px]:min-w-[90vw] max-[390px]:min-w-[93vw] snap-center overflow-hidden rounded-[1.35rem] max-[390px]:rounded-[1.2rem] border border-violet-500/15 bg-white/80 shadow-xl shadow-violet-500/10 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div class="relative h-52 max-[430px]:h-48 max-[390px]:h-44 overflow-hidden bg-[#10101b]">
              <img v-if="project.image" :src="project.image" :alt="project.title" class="h-full w-full object-cover" loading="lazy">
              <div v-else class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.42),transparent_36%),radial-gradient(circle_at_72%_72%,rgba(34,211,238,0.28),transparent_34%)]" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div class="absolute bottom-4 left-4 right-4">
                <span class="rounded-full bg-black/35 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
                  {{ categoryLabel(project.category) }}
                </span>
                <h3 class="mt-2.5 font-display text-[1.35rem] max-[390px]:text-[1.2rem] font-bold leading-tight text-white">{{ project.title }}</h3>
              </div>
            </div>
            <div class="p-4 max-[390px]:p-3.5">
              <p class="text-[13px] max-[390px]:text-[12px] leading-relaxed text-gray-600 dark:text-gray-300">{{ project.description }}</p>
            </div>
          </article>
        </div>
      </div>

      <div class="hidden md:block relative left-1/2 w-screen -translate-x-1/2" :style="desktopTrackStyle">
        <div class="sticky top-20 xl:top-24 flex h-[calc(100vh-5rem)] xl:h-[calc(100vh-6rem)] min-h-[420px] items-center justify-center overflow-hidden">
          <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,246,251,0.92),rgba(238,242,255,0.76)_45%,rgba(246,246,251,0.94)),radial-gradient(circle_at_50%_47%,rgba(124,58,237,0.18),transparent_36%),radial-gradient(circle_at_54%_42%,rgba(34,211,238,0.14),transparent_26%)] dark:bg-[linear-gradient(180deg,rgba(6,6,14,0.94),rgba(9,9,18,0.82)_45%,rgba(6,6,14,0.96)),radial-gradient(circle_at_50%_47%,rgba(124,58,237,0.22),transparent_36%),radial-gradient(circle_at_54%_42%,rgba(34,211,238,0.16),transparent_26%)]" />
          <div class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#070710] via-[#070710]/60 to-transparent" />
          <div class="absolute inset-x-0 top-10 mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
          <div class="absolute left-1/2 top-[51.5%] h-[36rem] w-[17rem] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-violet-500/15 dark:border-white/10" />
          <div class="absolute left-1/2 top-[51.5%] h-[27rem] w-[10rem] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-cyan-400/15 dark:border-cyan-300/10" />
          <div class="absolute left-1/2 top-[51.5%] h-[52vh] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-violet-400/25 to-transparent" />
          <div class="absolute left-1/2 top-[51.5%] h-[6.5rem] w-[6.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-400/15" />

          <aside class="absolute left-[max(1rem,calc((100vw-1040px)/2))] top-[51.5%] z-[1200] w-[17.5rem] xl:w-[19rem] -translate-y-1/2">
            <div
              v-if="activeProject"
              class="relative overflow-hidden rounded-[1.45rem] border border-violet-500/15 bg-white/[0.8] p-4.5 xl:p-5 shadow-2xl shadow-violet-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-black/35"
            >
              <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />
              <div class="flex items-center justify-between gap-4">
                <span class="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">
                  {{ categoryLabel(activeProject.category) }}
                </span>
                <span class="font-display text-sm text-gray-400">
                  {{ String(activeSourceIndex + 1).padStart(2, '0') }}/{{ String(projects.length).padStart(2, '0') }}
                </span>
              </div>
              <div class="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                {{ t('portfolio.case_study') }}
              </div>
              <h3 class="mt-4 font-display text-[1.45rem] xl:text-[1.7rem] font-bold leading-tight text-gray-950 dark:text-white">
                {{ activeProject.title }}
              </h3>
              <p class="mt-3 line-clamp-6 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
                {{ activeProject.description }}
              </p>

              <div class="mt-4 grid grid-cols-2 gap-2.5">
                <div class="rounded-2xl border border-violet-500/10 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <div class="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
                    {{ t('portfolio.context') }}
                  </div>
                  <p class="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                    {{ activeCase.context }}
                  </p>
                </div>
                <div class="rounded-2xl border border-cyan-400/15 bg-cyan-50/50 p-3 dark:border-cyan-300/10 dark:bg-cyan-300/[0.04]">
                  <div class="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
                    {{ t('portfolio.impact') }}
                  </div>
                  <p class="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                    {{ activeCase.impact }}
                  </p>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in activeProject.tags.slice(0, 3)"
                  :key="tag"
                  class="rounded-full border border-violet-500/15 bg-violet-50 px-2.5 py-1 text-[11px] text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-200"
                >
                  {{ tag }}
                </span>
              </div>
              <div class="mt-5 flex flex-wrap gap-2">
                <a
                  v-if="activeProject.liveUrl"
                  :href="activeProject.liveUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn-primary rounded-full px-4 py-2 text-xs"
                >
                  {{ t('portfolio.view') }}
                </a>
                <a
                  v-if="activeProject.codeUrl"
                  :href="activeProject.codeUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn-secondary rounded-full px-4 py-2 text-xs"
                >
                  {{ t('portfolio.code') }}
                </a>
              </div>
            </div>
          </aside>

          <div class="absolute right-[max(1rem,calc((100vw-1040px)/2))] top-[51.5%] z-[1200] w-[13.5rem] xl:w-[14.5rem] -translate-y-1/2 rounded-[1.1rem] border border-violet-500/15 bg-white/65 p-3 xl:p-3.5 text-sm text-gray-600 shadow-xl shadow-violet-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-black/25 dark:text-gray-300">
            <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
              {{ activeCategoryLabel }}
            </div>
            <h3 class="mt-3 font-display text-xl font-bold leading-tight text-gray-950 dark:text-white">
              {{ activeCategoryIntro.title }}
            </h3>
            <p class="mt-3 leading-relaxed">
              {{ activeCategoryIntro.text }}
            </p>
            <p class="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {{ t('portfolio.selection_count', { count: projects.length }) }}
            </p>
            <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-violet-500/10 dark:bg-white/10">
              <div class="h-full rounded-full bg-gradient-brand transition-[width] duration-150" :style="{ width: `${settledProgress * 100}%` }" />
            </div>
            <div class="mt-3 max-h-[11rem] xl:max-h-[13rem] space-y-1.5 overflow-y-auto pr-1">
              <button
                v-for="(project, index) in projects"
                :key="`nav-${project.id}`"
                type="button"
                class="group flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all duration-200"
                :class="index === activeSourceIndex
                  ? 'bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-100'
                  : 'text-gray-500 hover:bg-violet-500/10 hover:text-violet-700 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-white'"
                @click="goToProject(index)"
              >
                <span
                  class="h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-200"
                  :class="index === activeSourceIndex
                    ? 'scale-125 bg-gradient-brand shadow-[0_0_18px_rgba(139,92,246,0.55)]'
                    : 'bg-violet-500/25 dark:bg-white/20'"
                />
                <span class="min-w-0 flex-1 truncate text-xs font-semibold">
                  {{ project.title }}
                </span>
                <span class="font-display text-[10px] text-gray-400">
                  {{ String(index + 1).padStart(2, '0') }}
                </span>
              </button>
            </div>
          </div>

          <div class="relative h-full w-full [perspective:2600px] [transform-style:preserve-3d]">
              <article
                v-for="(project, index) in displayProjects"
                :key="`${project.id}-${index}`"
                class="absolute left-1/2 top-[51.5%] h-[20.5rem] xl:h-[22rem] w-[16.2rem] xl:w-[17.5rem] overflow-hidden rounded-[1.25rem] xl:rounded-[1.4rem] border border-white/15 bg-[#11111b] shadow-2xl shadow-black/35 transition-[opacity,transform] duration-200 ease-out [backface-visibility:hidden]"
                :style="cardStyle(index)"
              >
                <div class="relative h-36 xl:h-44 overflow-hidden bg-[#10101b]">
                  <img v-if="project.image" :src="project.image" :alt="project.title" class="h-full w-full object-cover" loading="lazy">
                  <div v-else class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.42),transparent_36%),radial-gradient(circle_at_72%_72%,rgba(34,211,238,0.28),transparent_34%)]" />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/76 via-black/18 to-transparent" />
                  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
                  <div class="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
                    {{ categoryLabel(project.category) }}
                  </div>
                </div>
                <div class="p-3 xl:p-3.5">
                  <h3 class="font-display text-base xl:text-lg font-bold leading-tight text-white">{{ project.title }}</h3>
                  <p class="mt-2 line-clamp-2 text-[13px] leading-relaxed text-white/62">{{ project.description }}</p>
                  <div class="mt-4 flex flex-wrap gap-1.5">
                    <span
                      v-for="tag in project.tags.slice(0, 3)"
                      :key="tag"
                      class="rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] text-white/70"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
