<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

type CockpitTab = 'milestone' | 'time' | 'note' | 'deliverable'

const route = useRoute()
const auth = useAuthStore()
const toast = useToast()
const projectId = Number(route.params.id)
const data = ref<any>(null)
const loadStatus = ref<'loading' | 'ready' | 'error'>('loading')
const savingProject = ref(false)
const savingItem = ref(false)
const showMobileSettings = ref(false)
const tab = ref<CockpitTab>('milestone')
const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  title: '', description: '', content: '', dueAt: '', workedAt: today,
  minutes: 60, url: '', noteKind: 'meeting', clientVisible: false,
})
const projectForm = reactive({
  status: 'planning', startsAt: '', targetAt: '', budgetChf: 0, internalHourlyCostChf: 0,
})

const tabs = [
  { key: 'milestone', label: 'Jalons' },
  { key: 'time', label: 'Temps' },
  { key: 'note', label: 'Notes & réunions' },
  { key: 'deliverable', label: 'Livrables' },
] as const
const projectStatuses: Record<string, string> = {
  planning: 'Planification', active: 'En cours', review: 'Recette', delivered: 'Livré', paused: 'En pause',
}
const milestoneStatuses: Record<string, string> = {
  planned: 'Planifié', in_progress: 'En cours', done: 'Terminé', blocked: 'Bloqué',
}
const deliverableStatuses: Record<string, string> = {
  draft: 'Brouillon', ready: 'Prêt', delivered: 'Livré', approved: 'Validé',
}

const finance = computed(() => data.value?.totals?.finance || {})
const activeItems = computed(() => data.value?.[
  tab.value === 'milestone' ? 'milestones'
    : tab.value === 'time' ? 'timeEntries'
      : tab.value === 'note' ? 'notes' : 'deliverables'
] || [])
const completedMilestones = computed(() => data.value?.milestones?.filter((item: any) => item.status === 'done').length || 0)
const milestoneProgress = computed(() => data.value?.milestones?.length
  ? Math.round((completedMilestones.value / data.value.milestones.length) * 100)
  : 0)
const overdueMilestones = computed(() => data.value?.milestones?.filter((item: any) => item.status !== 'done' && item.due_at && item.due_at < today).length || 0)
const openTasks = computed(() => data.value?.tasks?.filter((item: any) => item.status !== 'done') || [])
const budgetProgress = computed(() => finance.value.budgetConsumedPercent === null
  ? 0
  : Math.min(100, Math.max(0, Number(finance.value.budgetConsumedPercent || 0))))
const timeLabel = computed(() => {
  const minutes = Number(data.value?.totals?.minutes || 0)
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
})

function money(value: unknown) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(Number(value || 0) / 100)
}
function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Sans échéance'
}
function resetForm() {
  Object.assign(form, { title: '', description: '', content: '', dueAt: '', workedAt: today, minutes: 60, url: '', noteKind: 'meeting', clientVisible: false })
}
function hydrateProjectForm() {
  Object.assign(projectForm, {
    status: data.value.project.workflow_status || 'planning',
    startsAt: data.value.project.starts_at || '',
    targetAt: data.value.project.target_at || '',
    budgetChf: Number(data.value.project.budget_cents || 0) / 100,
    internalHourlyCostChf: Number(data.value.project.internal_hourly_cost_cents || 0) / 100,
  })
}
async function load() {
  loadStatus.value = 'loading'
  try {
    data.value = await $fetch('/api/project-cockpit', { query: { projectId }, headers: auth.authHeader() })
    hydrateProjectForm()
    loadStatus.value = 'ready'
  }
  catch (error: any) {
    loadStatus.value = 'error'
    toast.error(error?.data?.message || 'Impossible de charger le projet')
  }
}
async function saveProject() {
  if (savingProject.value) return
  savingProject.value = true
  try {
    await $fetch('/api/project-cockpit', {
      method: 'PUT',
      body: {
        kind: 'project', projectId, status: projectForm.status,
        startsAt: projectForm.startsAt || null, targetAt: projectForm.targetAt || null,
        budgetCents: Math.round(Number(projectForm.budgetChf || 0) * 100),
        internalHourlyCostCents: Math.round(Number(projectForm.internalHourlyCostChf || 0) * 100),
      },
      headers: auth.authHeader(),
    })
    await load()
    showMobileSettings.value = false
    toast.success('Pilotage du projet mis à jour')
  }
  catch (error: any) { toast.error(error?.data?.message || 'Mise à jour impossible') }
  finally { savingProject.value = false }
}
async function addItem() {
  if (savingItem.value) return
  savingItem.value = true
  const body: Record<string, unknown> = { kind: tab.value, projectId }
  if (tab.value === 'milestone') Object.assign(body, { title: form.title, dueAt: form.dueAt || null, status: 'planned' })
  if (tab.value === 'time') Object.assign(body, { description: form.description, workedAt: form.workedAt, minutes: Number(form.minutes) })
  if (tab.value === 'note') Object.assign(body, { title: form.title, content: form.content, noteKind: form.noteKind, clientVisible: form.clientVisible })
  if (tab.value === 'deliverable') Object.assign(body, { title: form.title, url: form.url || null, status: 'draft', clientVisible: form.clientVisible })
  try {
    await $fetch('/api/project-cockpit', { method: 'POST', body, headers: auth.authHeader() })
    resetForm()
    await load()
    toast.success('Élément ajouté')
  }
  catch (error: any) { toast.error(error?.data?.message || 'Enregistrement impossible') }
  finally { savingItem.value = false }
}
async function updateItem(kind: CockpitTab, item: any, status: string) {
  const body = { ...item, kind, projectId, id: item.id, dueAt: item.due_at, workedAt: item.worked_at, noteKind: item.kind, clientVisible: item.client_visible, status }
  try { await $fetch('/api/project-cockpit', { method: 'PUT', body, headers: auth.authHeader() }); await load() }
  catch { toast.error('Mise à jour impossible') }
}
async function removeItem(kind: CockpitTab, id: number) {
  if (!confirm('Supprimer cet élément ?')) return
  try {
    await $fetch('/api/project-cockpit', { method: 'DELETE', query: { kind, projectId, id }, headers: auth.authHeader() })
    await load()
    toast.success('Élément supprimé')
  }
  catch { toast.error('Suppression impossible') }
}

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <div v-if="loadStatus === 'loading'" role="status" class="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500 dark:border-white/[0.08] dark:bg-[#111118] dark:text-gray-400">
      Chargement du cockpit…
    </div>
    <div v-else-if="loadStatus === 'error'" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-500/25 dark:bg-red-500/10">
      <p class="font-semibold text-red-800 dark:text-red-200">Le cockpit n’est pas disponible.</p>
      <p class="mt-1 text-sm text-red-700 dark:text-red-300">Vérifie la connexion puis réessaie.</p>
      <button class="mt-4 min-h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="load">Réessayer</button>
    </div>

    <template v-else-if="data">
      <section class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:p-6">
        <div class="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div class="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <NuxtLink to="/admin/projects" class="inline-flex min-h-10 items-center text-xs font-semibold text-violet-600 dark:text-violet-300">← Tous les projets</NuxtLink>
            <h1 class="font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">{{ data.project.title }}</h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">{{ data.project.description }}</p>
            <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span class="rounded-lg bg-violet-50 px-2.5 py-1.5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">{{ projectStatuses[data.project.workflow_status] }}</span>
              <span class="rounded-lg bg-gray-100 px-2.5 py-1.5 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">{{ data.project.category }}</span>
              <span v-if="overdueMilestones" class="rounded-lg bg-red-50 px-2.5 py-1.5 text-red-700 dark:bg-red-500/10 dark:text-red-300">{{ overdueMilestones }} jalon(s) en retard</span>
            </div>
            <button type="button" class="mt-4 inline-flex min-h-10 items-center rounded-lg border border-violet-200 px-3 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:text-violet-300 lg:hidden" :aria-expanded="showMobileSettings" @click="showMobileSettings = !showMobileSettings">
              {{ showMobileSettings ? 'Masquer les réglages' : 'Configurer budget et dates' }}
            </button>
          </div>
          <form class="w-full gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.08] dark:bg-white/[0.025] lg:max-w-xl lg:grid lg:grid-cols-2" :class="showMobileSettings ? 'grid' : 'hidden'" :aria-busy="savingProject" @submit.prevent="saveProject">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-300">État
              <select v-model="projectForm.status" class="input-field mt-1"><option v-for="(label, value) in projectStatuses" :key="value" :value="value">{{ label }}</option></select>
            </label>
            <label class="text-xs font-medium text-gray-600 dark:text-gray-300">Date de début
              <input v-model="projectForm.startsAt" type="date" class="input-field mt-1">
            </label>
            <label class="text-xs font-medium text-gray-600 dark:text-gray-300">Date cible
              <input v-model="projectForm.targetAt" type="date" class="input-field mt-1">
            </label>
            <label class="text-xs font-medium text-gray-600 dark:text-gray-300">Budget HT (CHF)
              <input v-model.number="projectForm.budgetChf" type="number" min="0" step="1" class="input-field mt-1">
            </label>
            <label class="text-xs font-medium text-gray-600 dark:text-gray-300">Coût interne / heure
              <input v-model.number="projectForm.internalHourlyCostChf" type="number" min="0" step="1" class="input-field mt-1">
            </label>
            <button class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 lg:col-span-2" :disabled="savingProject">
              {{ savingProject ? 'Enregistrement…' : 'Mettre à jour le pilotage' }}
            </button>
          </form>
        </div>
      </section>

      <section aria-labelledby="finance-heading" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118] sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="finance-heading" class="font-display text-lg font-semibold text-gray-950 dark:text-white">Rentabilité du projet</h2><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Budget, temps valorisé et encaissements réellement liés à ce projet.</p></div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink :to="`/admin/quotes?projectId=${projectId}&new=1`" class="inline-flex min-h-10 items-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 dark:border-white/[0.12] dark:text-gray-200">Créer un devis lié</NuxtLink>
            <NuxtLink :to="`/admin/invoices?projectId=${projectId}&new=1`" class="inline-flex min-h-10 items-center rounded-lg border border-violet-200 px-3 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:text-violet-300">Créer une facture liée</NuxtLink>
          </div>
        </div>
        <div class="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-4">
          <div><p class="text-xs text-gray-500 dark:text-gray-400">Budget prévu</p><p class="mt-1 font-display text-xl font-semibold text-gray-950 dark:text-white">{{ money(finance.budgetCents) }}</p></div>
          <div><p class="text-xs text-gray-500 dark:text-gray-400">Coût du temps</p><p class="mt-1 font-display text-xl font-semibold text-gray-950 dark:text-white">{{ money(finance.trackedCostCents) }}</p></div>
          <div><p class="text-xs text-gray-500 dark:text-gray-400">Encaissé</p><p class="mt-1 font-display text-xl font-semibold text-cyan-700 dark:text-cyan-300">{{ money(finance.collectedCents) }}</p></div>
          <div><p class="text-xs text-gray-500 dark:text-gray-400">Marge encaissée</p><p class="mt-1 font-display text-xl font-semibold" :class="finance.actualMarginCents < 0 ? 'text-red-600 dark:text-red-300' : 'text-violet-700 dark:text-violet-300'">{{ money(finance.actualMarginCents) }}</p></div>
        </div>
        <div class="mt-5">
          <div class="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400"><span>Budget consommé par le temps suivi</span><strong>{{ finance.budgetConsumedPercent === null ? 'Budget à configurer' : `${finance.budgetConsumedPercent} %` }}</strong></div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]"><div class="h-full rounded-full bg-violet-600 transition-[width] duration-500" :class="finance.budgetConsumedPercent > 100 ? 'bg-red-500' : ''" :style="{ width: `${budgetProgress}%` }" /></div>
          <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400"><span>Devis acceptés : <strong>{{ money(finance.quotedCents) }}</strong></span><span>Facturé : <strong>{{ money(finance.invoicedCents) }}</strong></span><span>Marge prévisionnelle : <strong>{{ money(finance.forecastMarginCents) }}</strong></span></div>
        </div>
      </section>

      <section aria-label="Synthèse opérationnelle" class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
        <dl class="grid grid-cols-2 lg:grid-cols-4">
          <div class="border-b border-r border-gray-100 p-4 dark:border-white/[0.06] lg:border-b-0"><dt class="text-xs text-gray-500 dark:text-gray-400">Jalons terminés</dt><dd class="mt-2 font-display text-xl font-semibold">{{ completedMilestones }}/{{ data.milestones.length }} <span class="font-sans text-xs font-normal text-gray-500 dark:text-gray-400">· {{ milestoneProgress }} %</span></dd></div>
          <div class="border-b border-gray-100 p-4 dark:border-white/[0.06] lg:border-b-0 lg:border-r"><dt class="text-xs text-gray-500 dark:text-gray-400">Tâches ouvertes</dt><dd class="mt-2 font-display text-xl font-semibold">{{ openTasks.length }} <span class="font-sans text-xs font-normal text-gray-500 dark:text-gray-400">à traiter</span></dd></div>
          <div class="border-r border-gray-100 p-4 dark:border-white/[0.06]"><dt class="text-xs text-gray-500 dark:text-gray-400">Temps enregistré</dt><dd class="mt-2 font-display text-xl font-semibold">{{ timeLabel }}</dd></div>
          <div class="p-4"><dt class="text-xs text-gray-500 dark:text-gray-400">Livrables partagés</dt><dd class="mt-2 font-display text-xl font-semibold">{{ data.deliverables.filter((item: any) => item.client_visible).length }} <span class="font-sans text-xs font-normal text-gray-500 dark:text-gray-400">côté client</span></dd></div>
        </dl>
      </section>

      <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="min-w-0 rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
          <nav class="flex gap-1 overflow-x-auto border-b border-gray-100 p-2 dark:border-white/[0.06]" aria-label="Sections du projet">
            <template v-for="item in tabs" :key="item.key">
              <button v-if="tab === item.key" class="min-h-11 whitespace-nowrap rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white" @click="tab = item.key">{{ item.label }}</button>
              <button v-else class="min-h-11 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]" @click="tab = item.key">{{ item.label }}</button>
            </template>
          </nav>
          <div class="space-y-2 p-4 sm:p-5">
            <article v-for="item in activeItems" :key="item.id" class="rounded-lg border border-gray-100 p-3 dark:border-white/[0.06]">
              <div v-if="tab === 'milestone'" class="flex flex-wrap items-center justify-between gap-3"><div><p class="font-medium">{{ item.title }}</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ dateLabel(item.due_at) }}</p></div><select :value="item.status" class="min-h-10 rounded-lg border border-gray-200 bg-transparent px-2 text-xs dark:border-white/[0.1]" @change="updateItem('milestone', item, ($event.target as HTMLSelectElement).value)"><option v-for="(label, value) in milestoneStatuses" :key="value" :value="value">{{ label }}</option></select></div>
              <div v-else-if="tab === 'time'" class="flex items-center justify-between gap-3"><div><p class="font-medium">{{ item.description }}</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ dateLabel(item.worked_at) }}</p></div><strong>{{ Math.floor(item.minutes / 60) }} h {{ item.minutes % 60 }} min</strong></div>
              <template v-else-if="tab === 'note'"><div class="flex justify-between gap-3"><div><p class="font-medium">{{ item.title }}</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ item.kind === 'meeting' ? 'Réunion' : 'Note' }} · {{ new Date(item.occurred_at).toLocaleDateString('fr-CH') }}<span v-if="item.client_visible"> · Visible client</span></p></div></div><p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300">{{ item.content }}</p></template>
              <div v-else class="flex flex-wrap items-center justify-between gap-3"><div><a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" class="font-medium text-violet-600 dark:text-violet-300">{{ item.title }} ↗</a><p v-else class="font-medium">{{ item.title }}</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ item.client_visible ? 'Visible dans le portail client' : 'Interne' }}</p></div><select :value="item.status" class="min-h-10 rounded-lg border border-gray-200 bg-transparent px-2 text-xs dark:border-white/[0.1]" @change="updateItem('deliverable', item, ($event.target as HTMLSelectElement).value)"><option v-for="(label, value) in deliverableStatuses" :key="value" :value="value">{{ label }}</option></select></div>
              <button class="mt-2 min-h-10 text-xs font-medium text-red-600 dark:text-red-300" @click="removeItem(tab, item.id)">Supprimer</button>
            </article>
            <div v-if="!activeItems.length" class="py-10 text-center"><p class="text-sm font-medium text-gray-700 dark:text-gray-200">Rien ici pour le moment</p><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Utilise le formulaire pour ajouter le premier élément.</p></div>
          </div>
        </div>

        <aside class="self-start rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118] xl:sticky xl:top-20">
          <h2 class="font-display text-lg font-semibold">Ajouter — {{ tabs.find(item => item.key === tab)?.label }}</h2>
          <form class="mt-4 space-y-4" :aria-busy="savingItem" @submit.prevent="addItem">
            <div v-if="tab !== 'time'"><label for="cockpit-title" class="text-xs font-medium text-gray-600 dark:text-gray-300">Titre</label><input id="cockpit-title" v-model="form.title" required class="input-field mt-1"></div>
            <div v-if="tab === 'milestone'"><label for="cockpit-due" class="text-xs font-medium text-gray-600 dark:text-gray-300">Échéance</label><input id="cockpit-due" v-model="form.dueAt" class="input-field mt-1" type="date"></div>
            <template v-if="tab === 'time'"><div><label for="cockpit-description" class="text-xs font-medium text-gray-600 dark:text-gray-300">Travail réalisé</label><input id="cockpit-description" v-model="form.description" required class="input-field mt-1"></div><div class="grid grid-cols-2 gap-3"><div><label for="cockpit-date" class="text-xs font-medium text-gray-600 dark:text-gray-300">Date</label><input id="cockpit-date" v-model="form.workedAt" required class="input-field mt-1" type="date"></div><div><label for="cockpit-minutes" class="text-xs font-medium text-gray-600 dark:text-gray-300">Minutes</label><input id="cockpit-minutes" v-model.number="form.minutes" required min="1" max="1440" class="input-field mt-1" type="number"></div></div></template>
            <template v-if="tab === 'note'"><div><label for="cockpit-note-kind" class="text-xs font-medium text-gray-600 dark:text-gray-300">Type</label><select id="cockpit-note-kind" v-model="form.noteKind" class="input-field mt-1"><option value="meeting">Réunion</option><option value="note">Note</option></select></div><div><label for="cockpit-content" class="text-xs font-medium text-gray-600 dark:text-gray-300">Compte rendu</label><textarea id="cockpit-content" v-model="form.content" required rows="6" class="input-field mt-1 resize-y" /></div></template>
            <div v-if="tab === 'deliverable'"><label for="cockpit-url" class="text-xs font-medium text-gray-600 dark:text-gray-300">Lien sécurisé</label><input id="cockpit-url" v-model="form.url" class="input-field mt-1" type="url" placeholder="https://..."></div>
            <label v-if="tab === 'note' || tab === 'deliverable'" class="flex min-h-11 items-center gap-2 text-sm"><input v-model="form.clientVisible" type="checkbox" class="h-4 w-4 accent-violet-600"> Visible dans le portail client</label>
            <button class="min-h-11 w-full rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" :disabled="savingItem">{{ savingItem ? 'Ajout…' : 'Ajouter' }}</button>
          </form>
        </aside>
      </section>
    </template>
  </div>
</template>
