<script setup lang="ts">
const { locale } = useI18n()

// ── Remplace par ton lien cal.com réel ──────────────────────────────────
const CAL_LINK = 'https://cal.com'

// ── Date logic ──────────────────────────────────────────────────────────
const now     = new Date()
const year    = now.getFullYear()
const month   = now.getMonth()
const todayD  = now.getDate()

const monthLabel = computed(() => {
  const l = { fr: 'fr-CH', en: 'en-US', de: 'de-CH' }[locale.value] ?? 'fr-CH'
  return new Intl.DateTimeFormat(l, { month: 'long', year: 'numeric' }).format(new Date(year, month))
})

// En-têtes de jours Lun → Dim (convention européenne)
// Jan 1–7 2024 = Lun → Dim ✓
const dayHeaders = computed(() => {
  const l = { fr: 'fr-CH', en: 'en-US', de: 'de-CH' }[locale.value] ?? 'fr-CH'
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(l, { weekday: 'short' })
      .format(new Date(2024, 0, i + 1))
      .slice(0, 2)
      .toUpperCase(),
  )
})

// Décalage premier jour (Lun = 0 … Dim = 6)
const firstOffset = computed(() => {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
})

const daysInMonth = new Date(year, month + 1, 0).getDate()

// Prochains jours ouvrés disponibles (4 max)
const availableDays = computed(() => {
  const set = new Set<number>()
  for (let d = todayD + 1; d <= Math.min(todayD + 14, daysInMonth); d++) {
    if (set.size >= 4) break
    const dow = new Date(year, month, d).getDay()
    if (dow !== 0 && dow !== 6) set.add(d)
  }
  return set
})

interface Cell { empty: boolean; day: number; isToday: boolean; isAvail: boolean; isPast: boolean }

const cells = computed<Cell[]>(() => {
  const out: Cell[] = []
  for (let i = 0; i < firstOffset.value; i++)
    out.push({ empty: true, day: 0, isToday: false, isAvail: false, isPast: false })
  for (let d = 1; d <= daysInMonth; d++)
    out.push({
      empty:   false,
      day:     d,
      isToday: d === todayD,
      isAvail: availableDays.value.has(d),
      isPast:  d < todayD,
    })
  return out
})

const content = computed(() => {
  if (locale.value === 'en') return {
    title:    'Book a 30-min call',
    desc:     "Let's discuss your project — no commitment, just a quick intro call.",
    cta:      'Pick a time slot',
    duration: '30 min',
  }
  if (locale.value === 'de') return {
    title:    '30-Min. Erstgespräch buchen',
    desc:     'Sprechen wir kurz über Ihr Projekt — kostenlos und unverbindlich.',
    cta:      'Termin wählen',
    duration: '30 Min.',
  }
  return {
    title:    'Réserver un appel de 30 min',
    desc:     'Parlons de votre projet en quelques minutes — sans engagement.',
    cta:      'Choisir un créneau',
    duration: '30 min',
  }
})
</script>

<template>
  <div class="card-glass p-4 max-[390px]:p-3.5 flex flex-col gap-4 h-full">

    <!-- En-tête -->
    <div>
      <h3 class="font-display font-semibold text-base md:text-lg text-gray-900 dark:text-white leading-tight">
        {{ content.title }}
      </h3>
      <p class="mt-1 text-[13px] md:text-sm text-gray-500 dark:text-gray-400 leading-snug">
        {{ content.desc }}
      </p>
    </div>

    <!-- Widget calendrier -->
    <div class="rounded-2xl border border-violet-500/15 dark:border-violet-400/20 bg-white/60 dark:bg-white/[0.04] p-3.5 max-[390px]:p-3 flex-1">

      <!-- Mois + badge durée -->
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-semibold text-gray-900 dark:text-white capitalize">
          {{ monthLabel }}
        </span>
        <span class="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-400/20 font-medium">
          {{ content.duration }}
        </span>
      </div>

      <!-- En-têtes jours -->
      <div class="grid grid-cols-7 mb-1">
        <div
          v-for="d in dayHeaders" :key="d"
          class="h-7 flex items-center justify-center text-[9px] font-semibold tracking-wide text-gray-400 dark:text-white/30"
        >{{ d }}</div>
      </div>

      <!-- Grille des jours -->
      <div class="grid grid-cols-7 gap-y-0.5">
        <template v-for="(cell, i) in cells" :key="i">

          <!-- Cellule vide -->
          <div v-if="cell.empty" class="h-8" />

          <!-- Aujourd'hui -->
          <div
            v-else-if="cell.isToday"
            class="h-8 flex items-center justify-center rounded-lg bg-violet-600 text-white text-[13px] font-bold cursor-default"
          >{{ cell.day }}</div>

          <!-- Disponible (cliquable) -->
          <a
            v-else-if="cell.isAvail"
            :href="CAL_LINK"
            target="_blank"
            rel="noopener noreferrer"
            class="h-8 flex items-center justify-center rounded-lg text-[13px] font-medium
                   text-violet-700 dark:text-violet-300
                   bg-violet-100 dark:bg-violet-500/15
                   hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 dark:hover:text-white
                   transition-colors duration-150 cursor-pointer"
            :title="content.cta"
          >{{ cell.day }}</a>

          <!-- Passé -->
          <div
            v-else-if="cell.isPast"
            class="h-8 flex items-center justify-center rounded-lg text-[13px] text-gray-300 dark:text-white/20 cursor-default"
          >{{ cell.day }}</div>

          <!-- Futur normal -->
          <div
            v-else
            class="h-8 flex items-center justify-center rounded-lg text-[13px] text-gray-600 dark:text-white/55 cursor-default"
          >{{ cell.day }}</div>

        </template>
      </div>

      <!-- Légende -->
      <div class="mt-3 flex items-center gap-3 text-[10px] text-gray-400 dark:text-white/30">
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-violet-600 inline-block" />
          Aujourd'hui
        </span>
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-violet-100 dark:bg-violet-500/15 inline-block" />
          Disponible
        </span>
      </div>
    </div>

    <!-- CTA principal -->
    <a
      :href="CAL_LINK"
      target="_blank"
      rel="noopener noreferrer"
      class="btn-primary w-full justify-center py-3 text-sm rounded-xl"
    >
      <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      {{ content.cta }}
    </a>

    <!-- Email secondaire -->
    <a
      href="mailto:info@antoinequarroz.ch"
      class="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-white/35 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
    >
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
      info@antoinequarroz.ch
    </a>

  </div>
</template>
