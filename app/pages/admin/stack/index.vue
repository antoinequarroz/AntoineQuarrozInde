<script setup lang="ts">
import {
  MAX_TECHNOLOGY_STACK_ITEMS,
  TECHNOLOGY_ICON_NAMES,
  TECHNOLOGY_LEVELS,
  type TechnologyLevel,
  type TechnologyStackItem,
} from '~~/shared/utils/technologyStack'

definePageMeta({ layout: 'admin', middleware: 'admin' })

type StackSettings = {
  draftItems: TechnologyStackItem[]
  publishedItems: TechnologyStackItem[]
  draftRevision: number
  publishedRevision: number
  updatedAt: string | null
  publishedAt: string | null
}

const auth = useAuthStore()
const toast = useToast()
const items = ref<TechnologyStackItem[]>([])
const savedItems = ref<TechnologyStackItem[]>([])
const publishedItems = ref<TechnologyStackItem[]>([])
const draftRevision = ref(0)
const publishedRevision = ref(0)
const updatedAt = ref<string | null>(null)
const publishedAt = ref<string | null>(null)
const loading = ref(true)
const saving = ref(false)
const publishing = ref(false)
const loadError = ref('')
const confirmPublish = ref(false)
const previewLocale = ref<'fr' | 'en' | 'de'>('fr')

const levelLabels: Record<TechnologyLevel, string> = {
  daily: 'Au quotidien',
  mastered: 'Maîtrisé',
  used: 'Déjà utilisé',
}
const previewLevelLabels: Record<'fr' | 'en' | 'de', Record<TechnologyLevel, string>> = {
  fr: levelLabels,
  en: { daily: 'Daily stack', mastered: 'Proficient', used: 'Previously used' },
  de: { daily: 'Täglich im Einsatz', mastered: 'Sicher beherrscht', used: 'Bereits eingesetzt' },
}

const normalizedItems = computed(() => items.value.map((item, position) => ({ ...item, position })))
const isDirty = computed(() => JSON.stringify(normalizedItems.value) !== JSON.stringify(savedItems.value))
const hasUnpublishedChanges = computed(() => JSON.stringify(savedItems.value) !== JSON.stringify(publishedItems.value))
const aboutCount = computed(() => items.value.filter(item => item.showAbout).length)
const footerCount = computed(() => items.value.filter(item => item.showFooter).length)
const canPublish = computed(() => !loading.value && !saving.value && !publishing.value && !isDirty.value && hasUnpublishedChanges.value)

function applySettings(data: StackSettings) {
  items.value = data.draftItems.map(item => ({ ...item }))
  savedItems.value = data.draftItems.map(item => ({ ...item }))
  publishedItems.value = data.publishedItems.map(item => ({ ...item }))
  draftRevision.value = data.draftRevision
  publishedRevision.value = data.publishedRevision
  updatedAt.value = data.updatedAt
  publishedAt.value = data.publishedAt
  confirmPublish.value = false
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await $fetch<StackSettings>('/api/admin/technology-stack', { headers: auth.authHeader() })
    applySettings(data)
  }
  catch (error: any) {
    loadError.value = error?.data?.message || 'La stack ne peut pas être chargée. Réessaie dans quelques instants.'
  }
  finally {
    loading.value = false
  }
}

function makeKey() {
  const existing = new Set(items.value.map(item => item.key))
  let index = items.value.length + 1
  while (existing.has(`technologie-${index}`)) index += 1
  return `technologie-${index}`
}

function addItem() {
  if (items.value.length >= MAX_TECHNOLOGY_STACK_ITEMS) {
    toast.error(`La stack est limitée à ${MAX_TECHNOLOGY_STACK_ITEMS} technologies.`)
    return
  }
  items.value.push({
    key: makeKey(),
    label: 'Nouvelle technologie',
    icon: 'typescript',
    level: 'used',
    showAbout: true,
    showFooter: false,
    position: items.value.length,
  })
}

function moveItem(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= items.value.length) return
  const next = [...items.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  items.value = next
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

async function saveDraft() {
  saving.value = true
  try {
    const data = await $fetch<StackSettings>('/api/admin/technology-stack', {
      method: 'PUT',
      headers: auth.authHeader(),
      body: { items: normalizedItems.value, expectedRevision: draftRevision.value },
    })
    applySettings(data)
    toast.success('Brouillon enregistré.')
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Impossible d’enregistrer le brouillon.')
  }
  finally {
    saving.value = false
  }
}

async function publish() {
  if (!canPublish.value) return
  publishing.value = true
  try {
    const data = await $fetch<StackSettings>('/api/admin/technology-stack/publish', {
      method: 'POST',
      headers: auth.authHeader(),
      body: {
        expectedDraftRevision: draftRevision.value,
        expectedPublishedRevision: publishedRevision.value,
      },
    })
    applySettings(data)
    toast.success('Stack publiée sur le site.')
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Impossible de publier la stack.')
  }
  finally {
    publishing.value = false
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Jamais'
  return new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

onBeforeRouteLeave(() => {
  if (!isDirty.value || import.meta.server) return true
  return window.confirm('Ton brouillon contient des changements non enregistrés. Quitter quand même ?')
})

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <section class="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Stack technique</h1>
          <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">Choisis les technologies visibles dans la section À propos et dans le footer, puis publie-les quand l’aperçu te convient.</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <button type="button" class="min-h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition-colors hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/[0.04] dark:text-gray-100 dark:hover:border-violet-400/50" :disabled="loading || saving || !isDirty" @click="saveDraft">
            {{ saving ? 'Enregistrement…' : isDirty ? 'Enregistrer le brouillon' : 'Brouillon enregistré' }}
          </button>
          <button v-if="!confirmPublish" type="button" class="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-[#111118]" :disabled="!canPublish" @click="confirmPublish = true">
            Publier sur le site
          </button>
          <div v-else class="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 p-1.5 dark:border-violet-400/25 dark:bg-violet-500/10">
            <span class="px-2 text-xs font-medium text-violet-900 dark:text-violet-100">Confirmer ?</span>
            <button type="button" class="min-h-9 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" :disabled="publishing" @click="publish">{{ publishing ? 'Publication…' : 'Oui, publier' }}</button>
            <button type="button" class="min-h-9 rounded-lg px-3 text-xs font-semibold text-violet-800 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200 dark:hover:bg-white/10" @click="confirmPublish = false">Annuler</button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="loadError" role="alert" class="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
      <span>{{ loadError }}</span>
      <button type="button" class="min-h-11 rounded-lg border border-red-300 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-400/30" @click="load">Réessayer</button>
    </div>

    <div v-else-if="loading" aria-live="polite" aria-busy="true" class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <div class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111118]">
        <div v-for="index in 5" :key="index" class="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.05]" />
      </div>
      <div class="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.05]" />
    </div>

    <div v-else class="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-5">
        <div class="flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-950 dark:text-white">Technologies</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ items.length }}/{{ MAX_TECHNOLOGY_STACK_ITEMS }} · {{ aboutCount }} dans À propos · {{ footerCount }} dans le footer</p>
          </div>
          <button type="button" class="min-h-11 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200" :disabled="items.length >= MAX_TECHNOLOGY_STACK_ITEMS" @click="addItem">Ajouter une technologie</button>
        </div>

        <div v-if="items.length" class="mt-4 space-y-3">
          <article v-for="(item, index) in items" :key="item.key" class="rounded-xl border border-gray-200 p-3 dark:border-white/[0.09] sm:p-4">
            <div class="grid gap-3 sm:grid-cols-[minmax(150px,1fr)_minmax(130px,0.7fr)_minmax(145px,0.7fr)_auto] sm:items-end">
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Nom
                <input v-model="item.label" maxlength="40" class="mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none transition-shadow focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/15 dark:bg-white/[0.04] dark:text-white" />
              </label>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Pictogramme
                <select v-model="item.icon" class="mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/15 dark:bg-[#181820] dark:text-white">
                  <option v-for="icon in TECHNOLOGY_ICON_NAMES" :key="icon" :value="icon">{{ icon }}</option>
                </select>
              </label>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Niveau
                <select v-model="item.level" class="mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/15 dark:bg-[#181820] dark:text-white">
                  <option v-for="level in TECHNOLOGY_LEVELS" :key="level" :value="level">{{ levelLabels[level] }}</option>
                </select>
              </label>
              <div class="flex gap-1">
                <button type="button" :aria-label="`Monter ${item.label}`" class="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-30 dark:border-white/10 dark:text-gray-300" :disabled="index === 0" @click="moveItem(index, -1)"><svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 15 6-6 6 6" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                <button type="button" :aria-label="`Descendre ${item.label}`" class="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-30 dark:border-white/10 dark:text-gray-300" :disabled="index === items.length - 1" @click="moveItem(index, 1)"><svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                <button type="button" :aria-label="`Supprimer ${item.label}`" class="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-400/20 dark:text-red-300 dark:hover:bg-red-500/10" @click="removeItem(index)"><svg aria-hidden="true" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 7 10 10M17 7 7 17" stroke-linecap="round" /></svg></button>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input v-model="item.showAbout" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />Visible dans À propos</label>
              <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input v-model="item.showFooter" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />Visible dans le footer</label>
            </div>
          </article>
        </div>
        <div v-else class="mt-4 rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-white/15">
          <p class="font-medium text-gray-900 dark:text-white">Ta stack est vide.</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Ajoute une technologie pour commencer. Le site conservera sa version publiée tant que tu ne publies pas.</p>
        </div>
      </section>

      <aside class="space-y-4 xl:sticky xl:top-20">
        <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-gray-950 dark:text-white">Aperçu du brouillon</h2>
            <div class="flex items-center gap-2">
              <label class="sr-only" for="stack-preview-locale">Langue de l’aperçu</label>
              <select id="stack-preview-locale" v-model="previewLocale" class="min-h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#181820] dark:text-gray-200">
                <option value="fr">FR</option><option value="en">EN</option><option value="de">DE</option>
              </select>
              <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-white/[0.07] dark:text-gray-300">{{ aboutCount }} visibles</span>
            </div>
          </div>
          <div v-if="aboutCount" class="mt-5 space-y-5">
            <div v-for="level in TECHNOLOGY_LEVELS" :key="level" v-show="normalizedItems.some(item => item.level === level && item.showAbout)">
              <p class="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{{ previewLevelLabels[previewLocale][level] }}</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="item in normalizedItems.filter(entry => entry.level === level && entry.showAbout)" :key="item.key" class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
                  <UiTechnologyIcon :name="item.icon" class="h-4 w-4 text-violet-600 dark:text-violet-300" />{{ item.label || 'Sans nom' }}
                </span>
              </div>
            </div>
          </div>
          <p v-else class="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-white/[0.04] dark:text-gray-400">Aucune technologie ne sera affichée dans la section À propos.</p>
        </section>

        <section class="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-5">
          <h2 class="font-semibold text-gray-950 dark:text-white">État de publication</h2>
          <dl class="mt-3 space-y-2 text-gray-600 dark:text-gray-400">
            <div class="flex justify-between gap-4"><dt>Brouillon</dt><dd class="text-right">v{{ draftRevision }} · {{ formatDate(updatedAt) }}</dd></div>
            <div class="flex justify-between gap-4"><dt>En ligne</dt><dd class="text-right">v{{ publishedRevision }} · {{ formatDate(publishedAt) }}</dd></div>
          </dl>
          <p v-if="isDirty" class="mt-4 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Des changements ne sont pas encore enregistrés.</p>
          <p v-else-if="hasUnpublishedChanges" class="mt-4 rounded-lg bg-violet-50 p-3 text-violet-900 dark:bg-violet-500/10 dark:text-violet-200">Le brouillon enregistré est prêt à être publié.</p>
          <p v-else class="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">Le site est synchronisé avec le brouillon.</p>
        </section>
      </aside>
    </div>
  </div>
</template>
