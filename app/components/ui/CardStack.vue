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

const active = ref(0)
const hovering = ref(false)

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

onMounted(() => {
  if (!props.autoAdvance) return
  timer = setInterval(() => {
    if (!hovering.value) next()
  }, Math.max(1200, props.intervalMs))
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div
    class="w-full"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div class="relative w-full h-[430px] md:h-[470px]">
      <div class="pointer-events-none absolute inset-x-0 top-4 mx-auto h-44 w-[78%] rounded-full bg-violet-500/10 blur-3xl" />
      <div class="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-36 w-[72%] rounded-full bg-black/35 blur-3xl" />

      <div class="absolute inset-0 flex items-end justify-center [perspective:1200px]">
        <button
          v-for="entry in visibleItems"
          :key="entry.item.id"
          type="button"
          class="absolute bottom-0 w-[min(90vw,720px)] md:w-[640px] h-[340px] md:h-[360px] rounded-2xl overflow-hidden border transition-all duration-500 text-left"
          :class="entry.off === 0
            ? 'border-violet-300/40 shadow-[0_24px_70px_rgba(91,33,182,0.35)]'
            : 'border-white/15 shadow-[0_16px_45px_rgba(0,0,0,0.45)]'"
          :style="{
            zIndex: String(30 - entry.abs),
            transform: `translateX(${entry.off * stepX}px) translateY(${entry.abs * 14 - (entry.off === 0 ? 18 : 0)}px) rotateZ(${entry.off * stepDeg}deg) scale(${entry.off === 0 ? 1.02 : 0.92}) translateZ(${-entry.abs * 80}px)`,
          }"
          @click="active = entry.i; emit('card-click', entry.item)"
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
              <span v-if="entry.item.tag" class="px-2 py-1 rounded-full text-[10px] tracking-wide uppercase bg-violet-400/20 text-violet-100 border border-violet-300/30">
                {{ entry.item.tag }}
              </span>
              <span v-if="entry.item.readTime" class="text-[11px] text-white/70">{{ entry.item.readTime }} min</span>
            </div>
            <h3 class="font-display text-xl md:text-2xl font-bold text-white leading-tight">
              {{ entry.item.title }}
            </h3>
            <p v-if="entry.item.description" class="mt-2 text-sm text-white/80 line-clamp-2 max-w-xl">
              {{ entry.item.description }}
            </p>
            <div class="mt-4">
              <NuxtLink
                v-if="entry.item.href && entry.off === 0"
                :to="entry.item.href"
                class="inline-flex items-center gap-2 text-sm font-semibold text-violet-100 hover:text-white transition-colors"
              >
                {{ entry.item.ctaLabel || 'Lire l’article' }}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </NuxtLink>
            </div>
          </div>
        </button>
      </div>
    </div>

    <div class="mt-7 flex items-center justify-center gap-3">
      <button
        type="button"
        class="w-9 h-9 rounded-full border border-violet-300/30 bg-white/5 text-white/80 hover:bg-violet-500/20 transition"
        aria-label="Article précédent"
        @click="prev"
      >
        ‹
      </button>
      <div class="flex items-center gap-2">
        <button
          v-for="(item, idx) in props.items"
          :key="item.id"
          type="button"
          class="h-2.5 rounded-full transition-all duration-300"
          :class="idx === active ? 'w-7 bg-violet-300' : 'w-2.5 bg-white/35 hover:bg-white/60'"
          :aria-label="`Go to ${item.title}`"
          @click="active = idx"
        />
      </div>
      <button
        type="button"
        class="w-9 h-9 rounded-full border border-violet-300/30 bg-white/5 text-white/80 hover:bg-violet-500/20 transition"
        aria-label="Article suivant"
        @click="next"
      >
        ›
      </button>
    </div>
  </div>
</template>
