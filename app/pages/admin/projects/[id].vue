<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const route = useRoute()
const auth = useAuthStore()
const toast = useToast()
const projectId = Number(route.params.id)
const data = ref<any>(null)
const pending = ref(true)
const tab = ref<'milestone' | 'time' | 'note' | 'deliverable'>('milestone')
const today = new Date().toISOString().slice(0, 10)
const form = reactive({ title: '', description: '', content: '', dueAt: '', workedAt: today, minutes: 60, url: '', noteKind: 'meeting', clientVisible: false })
const tabs = [
  { key: 'milestone', label: 'Jalons' }, { key: 'time', label: 'Temps' },
  { key: 'note', label: 'Notes & réunions' }, { key: 'deliverable', label: 'Livrables' },
] as const
const projectStatuses: Record<string, string> = { planning: 'Planification', active: 'En cours', review: 'Recette', delivered: 'Livré', paused: 'En pause' }
const milestoneStatuses: Record<string, string> = { planned: 'Planifié', in_progress: 'En cours', done: 'Terminé', blocked: 'Bloqué' }
const deliverableStatuses: Record<string, string> = { draft: 'Brouillon', ready: 'Prêt', delivered: 'Livré', approved: 'Validé' }

async function load() {
  pending.value = true
  try { data.value = await $fetch('/api/project-cockpit', { query: { projectId }, headers: auth.authHeader() }) }
  catch { toast.error('Impossible de charger le projet') }
  finally { pending.value = false }
}
function resetForm() { Object.assign(form, { title: '', description: '', content: '', dueAt: '', workedAt: today, minutes: 60, url: '', noteKind: 'meeting', clientVisible: false }) }
async function addItem() {
  const body: Record<string, unknown> = { kind: tab.value, projectId }
  if (tab.value === 'milestone') Object.assign(body, { title: form.title, dueAt: form.dueAt || null, status: 'planned' })
  if (tab.value === 'time') Object.assign(body, { description: form.description, workedAt: form.workedAt, minutes: Number(form.minutes) })
  if (tab.value === 'note') Object.assign(body, { title: form.title, content: form.content, noteKind: form.noteKind, clientVisible: form.clientVisible })
  if (tab.value === 'deliverable') Object.assign(body, { title: form.title, url: form.url || null, status: 'draft', clientVisible: form.clientVisible })
  try { await $fetch('/api/project-cockpit', { method: 'POST', body, headers: auth.authHeader() }); resetForm(); await load(); toast.success('Élément ajouté') }
  catch (error: any) { toast.error(error?.data?.message || 'Enregistrement impossible') }
}
async function updateProjectStatus(status: string) {
  try { await $fetch('/api/project-cockpit', { method: 'PUT', body: { kind: 'project', projectId, status, startsAt: data.value.project.starts_at, targetAt: data.value.project.target_at }, headers: auth.authHeader() }); data.value.project.workflow_status = status; toast.success('Statut mis à jour') }
  catch { toast.error('Mise à jour impossible') }
}
async function updateItem(kind: string, item: any, status: string) {
  const body = { ...item, kind, projectId, id: item.id, dueAt: item.due_at, workedAt: item.worked_at, noteKind: item.kind, clientVisible: item.client_visible, status }
  try { await $fetch('/api/project-cockpit', { method: 'PUT', body, headers: auth.authHeader() }); await load() }
  catch { toast.error('Mise à jour impossible') }
}
async function removeItem(kind: string, id: number) {
  if (!confirm('Supprimer cet élément ?')) return
  try { await $fetch('/api/project-cockpit', { method: 'DELETE', query: { kind, projectId, id }, headers: auth.authHeader() }); await load(); toast.success('Élément supprimé') }
  catch { toast.error('Suppression impossible') }
}
const timeLabel = computed(() => { const minutes = Number(data.value?.totals?.minutes || 0); return `${Math.floor(minutes / 60)} h ${minutes % 60} min` })
const activeItems = computed(() => data.value?.[tab.value === 'milestone' ? 'milestones' : tab.value === 'time' ? 'timeEntries' : tab.value === 'note' ? 'notes' : 'deliverables'] || [])
onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <div v-if="pending" class="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500 dark:border-white/[0.08] dark:bg-[#111118]">Chargement du cockpit…</div>
    <template v-else-if="data">
      <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
        <div class="flex flex-wrap items-start justify-between gap-4"><div><NuxtLink to="/admin/projects" class="text-xs font-semibold text-violet-600 dark:text-violet-300">← Tous les projets</NuxtLink><h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white">{{ data.project.title }}</h1><p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{{ data.project.description }}</p></div><label class="text-xs font-medium text-gray-500">État du projet<select :value="data.project.workflow_status" class="mt-1 block min-h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold dark:border-white/[0.1] dark:bg-[#181826]" @change="updateProjectStatus(($event.target as HTMLSelectElement).value)"><option v-for="(label, value) in projectStatuses" :key="value" :value="value">{{ label }}</option></select></label></div>
      </section>
      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="metric in [{ label: 'Jalons terminés', value: `${data.milestones.filter((item: any) => item.status === 'done').length}/${data.milestones.length}` }, { label: 'Tâches ouvertes', value: data.tasks.filter((item: any) => item.status !== 'done').length }, { label: 'Temps enregistré', value: timeLabel }, { label: 'Livrables partagés', value: data.deliverables.filter((item: any) => item.client_visible).length }]" :key="metric.label" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111118]"><p class="text-xs text-gray-500">{{ metric.label }}</p><p class="mt-2 font-display text-2xl font-semibold">{{ metric.value }}</p></article>
      </section>
      <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]">
          <nav class="flex gap-1 overflow-x-auto border-b border-gray-100 p-2 dark:border-white/[0.06]" aria-label="Sections du projet"><button v-for="item in tabs" :key="item.key" class="min-h-11 whitespace-nowrap rounded-lg px-3 text-sm font-semibold" :class="tab === item.key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.05]'" @click="tab = item.key">{{ item.label }}</button></nav>
          <div class="space-y-2 p-4 sm:p-5">
            <article v-for="item in activeItems" :key="item.id" class="rounded-lg border border-gray-100 p-3 dark:border-white/[0.06]">
              <template v-if="tab === 'milestone'"><div class="flex flex-wrap items-center justify-between gap-3"><div><p class="font-medium">{{ item.title }}</p><p class="text-xs text-gray-500">{{ item.due_at || 'Sans échéance' }}</p></div><select :value="item.status" class="min-h-10 rounded-lg border border-gray-200 bg-transparent px-2 text-xs dark:border-white/[0.1]" @change="updateItem('milestone', item, ($event.target as HTMLSelectElement).value)"><option v-for="(label, value) in milestoneStatuses" :key="value" :value="value">{{ label }}</option></select></div></template>
              <template v-else-if="tab === 'time'"><div class="flex items-center justify-between gap-3"><div><p class="font-medium">{{ item.description }}</p><p class="text-xs text-gray-500">{{ item.worked_at }}</p></div><strong>{{ Math.floor(item.minutes / 60) }} h {{ item.minutes % 60 }} min</strong></div></template>
              <template v-else-if="tab === 'note'"><div class="flex justify-between gap-3"><div><p class="font-medium">{{ item.title }}</p><p class="text-xs text-gray-500">{{ item.kind === 'meeting' ? 'Réunion' : 'Note' }} · {{ new Date(item.occurred_at).toLocaleDateString('fr-CH') }}<span v-if="item.client_visible"> · Visible client</span></p></div></div><p class="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{{ item.content }}</p></template>
              <template v-else><div class="flex flex-wrap items-center justify-between gap-3"><div><a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" class="font-medium text-violet-600 dark:text-violet-300">{{ item.title }} ↗</a><p v-else class="font-medium">{{ item.title }}</p><p class="text-xs text-gray-500">{{ item.client_visible ? 'Visible dans le portail client' : 'Interne' }}</p></div><select :value="item.status" class="min-h-10 rounded-lg border border-gray-200 bg-transparent px-2 text-xs dark:border-white/[0.1]" @change="updateItem('deliverable', item, ($event.target as HTMLSelectElement).value)"><option v-for="(label, value) in deliverableStatuses" :key="value" :value="value">{{ label }}</option></select></div></template>
              <button class="mt-2 min-h-10 text-xs text-red-500" @click="removeItem(tab, item.id)">Supprimer</button>
            </article>
            <p v-if="!activeItems.length" class="py-8 text-center text-sm text-gray-500">Aucun élément pour le moment.</p>
          </div>
        </div>
        <aside class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]"><h2 class="font-display text-lg font-semibold">Ajouter — {{ tabs.find(item => item.key === tab)?.label }}</h2><form class="mt-4 space-y-4" @submit.prevent="addItem">
          <div v-if="tab !== 'time'"><label for="cockpit-title" class="text-xs font-medium text-gray-500">Titre</label><input id="cockpit-title" v-model="form.title" required class="input-field mt-1"></div>
          <div v-if="tab === 'milestone'"><label for="cockpit-due" class="text-xs font-medium text-gray-500">Échéance</label><input id="cockpit-due" v-model="form.dueAt" class="input-field mt-1" type="date"></div>
          <template v-if="tab === 'time'"><div><label for="cockpit-description" class="text-xs font-medium text-gray-500">Travail réalisé</label><input id="cockpit-description" v-model="form.description" required class="input-field mt-1"></div><div class="grid grid-cols-2 gap-3"><div><label for="cockpit-date" class="text-xs font-medium text-gray-500">Date</label><input id="cockpit-date" v-model="form.workedAt" required class="input-field mt-1" type="date"></div><div><label for="cockpit-minutes" class="text-xs font-medium text-gray-500">Minutes</label><input id="cockpit-minutes" v-model.number="form.minutes" required min="1" max="1440" class="input-field mt-1" type="number"></div></div></template>
          <template v-if="tab === 'note'"><div><label for="cockpit-note-kind" class="text-xs font-medium text-gray-500">Type</label><select id="cockpit-note-kind" v-model="form.noteKind" class="input-field mt-1"><option value="meeting">Réunion</option><option value="note">Note</option></select></div><div><label for="cockpit-content" class="text-xs font-medium text-gray-500">Compte rendu</label><textarea id="cockpit-content" v-model="form.content" required rows="6" class="input-field mt-1 resize-y" /></div></template>
          <div v-if="tab === 'deliverable'"><label for="cockpit-url" class="text-xs font-medium text-gray-500">Lien sécurisé</label><input id="cockpit-url" v-model="form.url" class="input-field mt-1" type="url" placeholder="https://..."></div>
          <label v-if="tab === 'note' || tab === 'deliverable'" class="flex min-h-11 items-center gap-2 text-sm"><input v-model="form.clientVisible" type="checkbox" class="h-4 w-4 accent-violet-600"> Visible dans le portail client</label>
          <button class="min-h-11 w-full rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700">Ajouter</button>
        </form></aside>
      </section>
    </template>
  </div>
</template>
