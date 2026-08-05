<script setup lang="ts">
interface CardStackItem {
  id: string | number
  title: string
  description?: string
  imageSrc?: string | null
  href?: string
  ctaLabel?: string
  tag?: string
  readTime?: number
  content?: string
  createdAt?: string
}

const props = withDefaults(defineProps<{
  items: CardStackItem[]
  initialIndex?: number
  maxVisible?: number
  autoAdvance?: boolean
  intervalMs?: number
}>(), {
  initialIndex: 0,
  maxVisible: 5,
  autoAdvance: true,
  intervalMs: 3200,
})

const emit = defineEmits<{
  (e: 'card-click', item: CardStackItem): void
}>()

const { t } = useI18n()
const active = ref(0)
const hovering = ref(false)
const focusWithin = ref(false)
const reducedMotion = ref(false)

watch(
  () => [props.items.length, props.initialIndex] as const,
  () => {
    if (!props.items.length) {
      active.value = 0
      return
    }
    active.value = Math.max(0, Math.min(props.initialIndex, props.items.length - 1))
  },
  { immediate: true },
)

const maxOffset = computed(() => Math.floor(props.maxVisible / 2))
const stepX = 130
const stepDeg = 11

const visibleItems = computed(() => {
  const len = props.items.length
  if (!len) return []

  return props.items
    .map((item, i) => {
      let off = i - active.value
      if (Math.abs(off) > len / 2) off += off > 0 ? -len : len
      return { item, i, off, abs: Math.abs(off) }
    })
    .filter(v => v.abs <= maxOffset.value)
    .sort((a, b) => b.abs - a.abs)
})

function next() {
  if (!props.items.length) return
  active.value = (active.value + 1) % props.items.length
}

function prev() {
  if (!props.items.length) return
  active.value = (active.value - 1 + props.items.length) % props.items.length
}

let timer: ReturnType<typeof setInterval> | null = null

const isPaused = computed(() => reducedMotion.value || hovering.value || focusWithin.value)

function clearTimer() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

function startTimer() {
  clearTimer()
  if (!props.autoAdvance || props.items.length < 2 || reducedMotion.value) return
  timer = setInterval(() => {
    if (!isPaused.value) next()
  }, Math.max(3000, props.intervalMs))
}

let motionQuery: MediaQueryList | null = null
function updateMotionPreference() {
  reducedMotion.value = Boolean(motionQuery?.matches)
  startTimer()
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionPreference()
  motionQuery.addEventListener('change', updateMotionPreference)
})

watch(() => [props.autoAdvance, props.intervalMs, props.items.length] as const, startTimer)

onBeforeUnmount(() => {
  clearTimer()
  motionQuery?.removeEventListener('change', updateMotionPreference)
})
</script>

<template>
  <div
    class="w-full"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focusWithin = true"
    @focusout="focusWithin = false"
  >
    <div class="relative w-full h-[430px] md:h-[470px]">
      <div class="pointer-events-none absolute inset-x-0 top-4 mx-auto h-44 w-[78%] rounded-full bg-violet-500/10 blur-3xl" />
      <div class="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-36 w-[72%] rounded-full bg-black/35 blur-3xl" />

      <div class="absolute inset-0 flex items-end justify-center [perspective:1200px]">
        <article
          v-for="entry in visibleItems"
          :key="entry.item.id"
          class="absolute bottom-0 w-[min(90vw,720px)] md:w-[640px] h-[340px] md:h-[360px] rounded-2xl overflow-hidden border transition-[transform,opacity,border-color,box-shadow] duration-500 text-left"
          :class="entry.off === 0
            ? 'border-violet-300/40 shadow-[0_24px_70px_rgba(91,33,182,0.35)]'
            : 'border-white/15 shadow-[0_16px_45px_rgba(0,0,0,0.45)]'"
          :style="{
            zIndex: String(30 - entry.abs),
            transform: `translateX(${entry.off * stepX}px) translateY(${entry.abs * 14 - (entry.off === 0 ? 18 : 0)}px) rotateZ(${entry.off * stepDeg}deg) scale(${entry.off === 0 ? 1.02 : 0.92}) translateZ(${-entry.abs * 80}px)`,
          }"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-violet-950/85 via-indigo-950/70 to-slate-950/80" />
          <img
            v-if="entry.item.imageSrc"
            :src="entry.item.imageSrc"
            :alt="entry.item.title"
            class="absolute inset-0 w-full h-full object-cover opacity-70"
            loading="lazy"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div class="relative z-10 h-full p-5 md:p-6 flex flex-col justify-end">
            <div class="flex items-center gap-2 mb-2">
              <span v-if="entry.item.tag" class="px-2 py-1 rounded-full text-xs tracking-wide uppercase bg-violet-400/20 text-violet-100 border border-violet-300/30">
                {{ entry.item.tag }}
              </span>
              <span v-if="entry.item.readTime" class="text-xs text-white/70">{{ entry.item.readTime }} min</span>
            </div>
            <h3 class="font-display text-xl md:text-2xl font-bold text-white leading-tight">
              {{ entry.item.title }}
            </h3>
            <p v-if="entry.item.description" class="mt-2 text-sm text-white/80 line-clamp-2 max-w-xl">
              {{ entry.item.description }}
            </p>
            <div v-if="entry.off === 0" class="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-200/25 bg-black/15 px-4 text-sm font-semibold text-violet-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                @click="emit('card-click', entry.item)"
              >
                {{ t('blog.preview') }}
              </button>
              <NuxtLink
                v-if="entry.item.href"
                :to="entry.item.href"
                class="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-violet-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                {{ entry.item.ctaLabel || t('blog.read') }}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </NuxtLink>
            </div>
          </div>
          <button
            v-if="entry.off !== 0"
            type="button"
            class="absolute inset-0 z-20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300"
            :aria-label="t('blog.show_article', { title: entry.item.title })"
            @click="active = entry.i"
          />
        </article>
      </div>
    </div>

    <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        class="w-11 h-11 rounded-full border border-violet-300/30 bg-white/5 text-white/80 hover:bg-violet-500/20 transition"
        :aria-label="t('blog.previous')"
        @click="prev"
      >
        ‹
      </button>
      <div class="flex items-center gap-2">
        <button
          v-for="(item, idx) in props.items"
          :key="item.id"
          type="button"
          class="relative h-11 w-11 rounded-full transition-colors after:absolute after:left-1/2 after:top-1/2 after:h-2.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:transition-[width,background-color] after:duration-300"
          :class="idx === active ? 'after:w-7 after:bg-violet-300' : 'after:w-2.5 after:bg-white/35 hover:after:bg-white/60'"
          :aria-label="t('blog.show_article', { title: item.title })"
          :aria-current="idx === active ? 'true' : undefined"
          @click="active = idx"
        />
      </div>
      <button
        type="button"
        class="w-11 h-11 rounded-full border border-violet-300/30 bg-white/5 text-white/80 hover:bg-violet-500/20 transition"
        :aria-label="t('blog.next')"
        @click="next"
      >
        ›
      </button>
    </div>
  </div>
</template>
