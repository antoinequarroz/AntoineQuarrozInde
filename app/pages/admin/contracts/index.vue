<script setup lang="ts">
import type { ClientContract } from '~/types'
import { DEFAULT_CONTRACT_TERMS } from '~~/shared/utils/clientContracts'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Contrats clients — Administration' })

const store = useContractsStore()
const clients = useClientsStore()
const projects = useProjectsStore()
const quotes = useQuotesStore()
const auth = useAuthStore()
const toast = useToast()

const selectedId = ref<number | null>(null)
const showForm = ref(false)
const editing = ref<ClientContract | null>(null)
const saving = ref(false)
const runningAction = ref('')
const search = ref('')
const statusFilter = ref<'all' | ClientContract['status']>('all')
const deliverablesText = ref('')
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, () => { showForm.value = false })

const blankForm = () => ({
  number: `CTR-${new Date().getFullYear()}-${String(store.contracts.length + 1).padStart(4, '0')}`,
  clientId: null as number | null,
  projectId: null as number | null,
  quoteId: null as number | null,
  title: '', status: 'draft' as const, version: 1,
  effectiveDate: '', startsAt: '', endsAt: '',
  ...DEFAULT_CONTRACT_TERMS,
})
const form = reactive(blankForm())

const clientsById = computed(() => new Map(clients.clients.map(client => [client.id, client])))
const selected = computed(() => store.contracts.find(item => item.id === selectedId.value) || null)
const availableProjects = computed(() => form.clientId ? projects.projects.filter(item => !item.clientId || item.clientId === form.clientId) : projects.projects)
const availableQuotes = computed(() => form.clientId ? quotes.quotes.filter(item => item.clientId === form.clientId) : quotes.quotes)
const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return store.contracts.filter((contract) => {
    if (statusFilter.value !== 'all' && contract.status !== statusFilter.value) return false
    if (!query) return true
    const client = clientsById.value.get(contract.clientId)
    return [contract.number, contract.title, client?.name, client?.company].filter(Boolean).join(' ').toLowerCase().includes(query)
  })
})

const statusLabel: Record<ClientContract['status'], string> = { draft: 'Brouillon', sent: 'À signer', signed: 'Signé', declined: 'À revoir', cancelled: 'Annulé' }
const statusClass: Record<ClientContract['status'], string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-gray-300',
  sent: 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200',
  signed: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200',
  declined: 'bg-red-50 text-red-800 dark:bg-red-400/10 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400',
}
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Non définie'

function resetForm() {
  Object.assign(form, blankForm())
  deliverablesText.value = DEFAULT_CONTRACT_TERMS.deliverables.join('\n')
}

function openNew() {
  editing.value = null
  resetForm()
  showForm.value = true
}

function openEdit(contract: ClientContract) {
  if (contract.status !== 'draft') return
  editing.value = contract
  Object.assign(form, contract)
  deliverablesText.value = contract.deliverables.join('\n')
  showForm.value = true
}

function createRevision(contract: ClientContract) {
  editing.value = null
  Object.assign(form, {
    ...contract,
    status: 'draft',
    version: contract.version + 1,
    effectiveDate: '',
    startsAt: contract.startsAt || '',
    endsAt: contract.endsAt || '',
  })
  deliverablesText.value = contract.deliverables.join('\n')
  showForm.value = true
}

function applyQuote() {
  const quote = quotes.quotes.find(item => item.id === form.quoteId)
  if (!quote) return
  form.title = quote.title
  form.projectId = quote.projectId
  form.paymentTerms = `Les prix, acomptes et échéances du devis ${quote.number} accepté font partie intégrante du présent contrat. Toute prestation supplémentaire nécessite un accord écrit.`
}

async function submit() {
  if (!form.clientId || !form.number.trim() || !form.title.trim() || !form.scope.trim()) {
    toast.error('Complète le client, le numéro, le titre et le périmètre.')
    return
  }
  saving.value = true
  try {
    const payload = { ...form, deliverables: deliverablesText.value.split('\n').map(item => item.trim()).filter(Boolean) }
    const saved = editing.value ? await store.update(editing.value.id, payload as Partial<ClientContract>) : await store.add(payload as any)
    selectedId.value = saved.id
    showForm.value = false
    toast.success(editing.value ? 'Contrat mis à jour' : 'Contrat créé')
  } catch (error: any) { toast.error(error?.data?.message || 'Le contrat n’a pas pu être enregistré.') }
  finally { saving.value = false }
}

async function sendContract(contract: ClientContract) {
  if (!confirm(`Envoyer la version ${contract.version} du contrat ${contract.number} à ${clientsById.value.get(contract.clientId)?.email || 'ce client'} ? Après l’envoi, cette version sera figée.`)) return
  runningAction.value = `send-${contract.id}`
  try {
    await $fetch('/api/contracts/send', { method: 'POST', body: { id: contract.id }, headers: auth.authHeader() })
    await store.ensureLoaded(true)
    toast.success('Contrat envoyé et version figée')
  } catch (error: any) { toast.error(error?.data?.message || 'Le contrat n’a pas pu être envoyé.') }
  finally { runningAction.value = '' }
}

async function downloadPdf(contract: ClientContract) {
  runningAction.value = `pdf-${contract.id}`
  try {
    const { url } = await $fetch<{ url: string }>('/api/contracts/pdf-link', {
      method: 'POST',
      body: { id: contract.id },
      headers: auth.authHeader(),
    })
    const link = document.createElement('a')
    link.href = url
    link.download = `contrat-${contract.number}-v${contract.version}.pdf`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success('Le PDF a été téléchargé')
  } catch (error: any) { toast.error(error?.data?.message || 'Le PDF n’a pas pu être généré.') }
  finally { runningAction.value = '' }
}

async function removeDraft(contract: ClientContract) {
  if (!confirm(`Supprimer le brouillon ${contract.number} ?`)) return
  try {
    await store.remove(contract.id)
    if (selectedId.value === contract.id) selectedId.value = store.contracts[0]?.id || null
    toast.success('Brouillon supprimé')
  } catch (error: any) { toast.error(error?.data?.message || 'Suppression impossible.') }
}

onMounted(async () => {
  await Promise.all([store.ensureLoaded(), clients.ensureLoaded(), projects.ensureLoaded(), quotes.ensureLoaded()])
  selectedId.value = store.contracts[0]?.id || null
})
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Relation client</span>
        <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Contrats clients</h1>
        <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Crée des contrats complets, fige chaque version envoyée et conserve la preuve de l’acceptation.</p>
      </div>
      <button class="inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-brand px-4 text-sm font-semibold text-white shadow-glow-sm transition-transform duration-150 active:scale-[0.96]" @click="openNew">Nouveau contrat</button>
    </header>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]"><p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Total</p><p class="mt-1 font-display text-2xl font-semibold">{{ store.contracts.length }}</p></div>
      <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-400/15 dark:bg-amber-400/[0.06]"><p class="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">À signer</p><p class="mt-1 font-display text-2xl font-semibold">{{ store.contracts.filter(item => item.status === 'sent').length }}</p></div>
      <div class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-400/15 dark:bg-emerald-400/[0.06]"><p class="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Signés</p><p class="mt-1 font-display text-2xl font-semibold">{{ store.contracts.filter(item => item.status === 'signed').length }}</p></div>
    </div>

    <div class="grid min-h-[32rem] gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
      <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div class="grid gap-3 border-b border-gray-100 p-4 dark:border-white/[0.06] sm:grid-cols-[1fr_12rem]">
          <input v-model="search" type="search" class="input-field" placeholder="Rechercher un contrat ou un client…">
          <select v-model="statusFilter" class="input-field"><option value="all">Tous les statuts</option><option value="draft">Brouillons</option><option value="sent">À signer</option><option value="signed">Signés</option><option value="declined">À revoir</option><option value="cancelled">Annulés</option></select>
        </div>
        <div v-if="store.loading" class="p-8 text-center text-sm text-gray-500">Chargement des contrats…</div>
        <div v-else-if="!filtered.length" class="p-8 text-center"><p class="font-semibold">Aucun contrat</p><p class="mt-1 text-sm text-gray-500">Crée un contrat ou ajuste les filtres.</p></div>
        <ul v-else class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <li v-for="contract in filtered" :key="contract.id">
            <button type="button" class="flex min-h-20 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-150 hover:bg-violet-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 dark:hover:bg-violet-500/[0.06]" :class="selectedId === contract.id ? 'bg-violet-50 dark:bg-violet-500/[0.08]' : ''" @click="selectedId = contract.id">
              <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><p class="truncate font-semibold">{{ contract.title }}</p><span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass[contract.status]">{{ statusLabel[contract.status] }}</span></div><p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{{ contract.number }} · v{{ contract.version }} · {{ clientsById.get(contract.clientId)?.company || clientsById.get(contract.clientId)?.name }}</p></div>
              <span class="text-xs text-gray-400">{{ formatDate(contract.createdAt) }}</span>
            </button>
          </li>
        </ul>
      </section>

      <aside class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <template v-if="selected">
          <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">{{ selected.number }} · version {{ selected.version }}</p><h2 class="mt-2 font-display text-xl font-semibold">{{ selected.title }}</h2></div><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass[selected.status]">{{ statusLabel[selected.status] }}</span></div>
          <dl class="mt-5 space-y-3 text-sm"><div><dt class="text-xs text-gray-500">Client</dt><dd class="mt-0.5 font-semibold">{{ clientsById.get(selected.clientId)?.company || clientsById.get(selected.clientId)?.name }}</dd></div><div><dt class="text-xs text-gray-500">Période</dt><dd class="mt-0.5">{{ formatDate(selected.startsAt) }} → {{ formatDate(selected.endsAt) }}</dd></div><div v-if="selected.snapshotHash"><dt class="text-xs text-gray-500">Empreinte du document</dt><dd class="mt-0.5 truncate font-mono text-xs" :title="selected.snapshotHash">{{ selected.snapshotHash }}</dd></div><div v-if="selected.signedAt"><dt class="text-xs text-gray-500">Acceptation</dt><dd class="mt-0.5 font-semibold text-emerald-700 dark:text-emerald-300">{{ selected.signerName }} · {{ formatDate(selected.signedAt) }}</dd></div></dl>
          <div class="mt-6 space-y-2"><button class="min-h-11 w-full rounded-lg border border-gray-200 px-3 text-sm font-semibold hover:border-violet-300 hover:text-violet-700 dark:border-white/10" :disabled="runningAction === `pdf-${selected.id}`" @click="downloadPdf(selected)">{{ runningAction === `pdf-${selected.id}` ? 'Génération…' : 'Télécharger le PDF' }}</button><button v-if="selected.status === 'draft'" class="min-h-11 w-full rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white disabled:opacity-60" :disabled="Boolean(runningAction)" @click="sendContract(selected)">{{ runningAction === `send-${selected.id}` ? 'Envoi…' : 'Envoyer au client' }}</button><button v-if="selected.status === 'draft'" class="min-h-11 w-full rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]" @click="openEdit(selected)">Modifier le brouillon</button><button v-else class="min-h-11 w-full rounded-lg px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10" @click="createRevision(selected)">Créer une nouvelle version</button><button v-if="selected.status === 'draft'" class="min-h-11 w-full rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" @click="removeDraft(selected)">Supprimer le brouillon</button></div>
        </template>
        <div v-else class="flex min-h-64 items-center justify-center text-center text-sm text-gray-500">Sélectionne un contrat pour afficher ses détails.</div>
      </aside>
    </div>

    <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 overflow-y-auto bg-gray-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="contract-form-title" tabindex="-1" @keydown="handleDialogKeydown">
      <form class="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#111118]" @submit.prevent="submit">
        <header class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-[#111118]/95"><div><p class="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">{{ editing ? 'Brouillon' : `Version ${form.version}` }}</p><h2 id="contract-form-title" class="font-display text-xl font-semibold">{{ editing ? 'Modifier le contrat' : 'Créer un contrat' }}</h2></div><button type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/[0.06]" @click="showForm = false">Fermer</button></header>
        <div class="space-y-8 p-5 sm:p-7">
          <section><h3 class="font-semibold">Identification</h3><div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label class="space-y-1 text-xs text-gray-500">Numéro *<input v-model="form.number" class="input-field" required></label><label class="space-y-1 text-xs text-gray-500">Version<input v-model.number="form.version" type="number" min="1" class="input-field" required></label><label class="space-y-1 text-xs text-gray-500 sm:col-span-2">Titre *<input v-model="form.title" class="input-field" required placeholder="Création de l’application métier"></label><label class="space-y-1 text-xs text-gray-500 sm:col-span-2">Client *<select v-model="form.clientId" class="input-field" required><option :value="null" disabled>Choisir un client</option><option v-for="client in clients.clients" :key="client.id" :value="client.id">{{ client.company || client.name }}</option></select></label><label class="space-y-1 text-xs text-gray-500">Projet<select v-model="form.projectId" class="input-field"><option :value="null">Aucun</option><option v-for="project in availableProjects" :key="project.id" :value="project.id">{{ project.title }}</option></select></label><label class="space-y-1 text-xs text-gray-500">Devis lié<select v-model="form.quoteId" class="input-field" @change="applyQuote"><option :value="null">Aucun</option><option v-for="quote in availableQuotes" :key="quote.id" :value="quote.id">{{ quote.number }} · {{ quote.title }}</option></select></label></div></section>
          <section><h3 class="font-semibold">Calendrier et périmètre</h3><div class="mt-4 grid gap-4 sm:grid-cols-3"><label class="space-y-1 text-xs text-gray-500">Entrée en vigueur<input v-model="form.effectiveDate" type="date" class="input-field"></label><label class="space-y-1 text-xs text-gray-500">Début<input v-model="form.startsAt" type="date" class="input-field"></label><label class="space-y-1 text-xs text-gray-500">Fin prévue<input v-model="form.endsAt" type="date" class="input-field"></label></div><label class="mt-4 block space-y-1 text-xs text-gray-500">Objet et périmètre *<textarea v-model="form.scope" rows="4" class="input-field resize-y" required /></label><label class="mt-4 block space-y-1 text-xs text-gray-500">Livrables · un par ligne<textarea v-model="deliverablesText" rows="4" class="input-field resize-y" /></label></section>
          <section><h3 class="font-semibold">Responsabilités et conditions</h3><div class="mt-4 grid gap-4 lg:grid-cols-2"><label class="space-y-1 text-xs text-gray-500">Obligations du prestataire<textarea v-model="form.providerObligations" rows="5" class="input-field resize-y" /></label><label class="space-y-1 text-xs text-gray-500">Obligations du client<textarea v-model="form.clientObligations" rows="5" class="input-field resize-y" /></label><label class="space-y-1 text-xs text-gray-500">Prix et paiement<textarea v-model="form.paymentTerms" rows="5" class="input-field resize-y" /></label><label class="space-y-1 text-xs text-gray-500">Gestion des changements<textarea v-model="form.changeManagement" rows="5" class="input-field resize-y" /></label><label class="space-y-1 text-xs text-gray-500">Propriété intellectuelle<textarea v-model="form.intellectualProperty" rows="5" class="input-field resize-y" /></label><label class="space-y-1 text-xs text-gray-500">Confidentialité<textarea v-model="form.confidentiality" rows="5" class="input-field resize-y" /></label><label class="space-y-1 text-xs text-gray-500">Protection des données<textarea v-model="form.dataProtection" rows="5" class="input-field resize-y" /></label><label class="space-y-1 text-xs text-gray-500">Garantie et support<textarea v-model="form.warrantySupport" rows="5" class="input-field resize-y" /></label><label class="space-y-1 text-xs text-gray-500">Responsabilité<textarea v-model="form.liability" rows="5" class="input-field resize-y" /></label><label class="space-y-1 text-xs text-gray-500">Résiliation<textarea v-model="form.termination" rows="5" class="input-field resize-y" /></label></div></section>
          <section><h3 class="font-semibold">Droit et conditions particulières</h3><div class="mt-4 grid gap-4 sm:grid-cols-2"><label class="space-y-1 text-xs text-gray-500">Droit applicable<input v-model="form.governingLaw" class="input-field"></label><label class="space-y-1 text-xs text-gray-500">For juridique<input v-model="form.jurisdiction" class="input-field"></label></div><label class="mt-4 block space-y-1 text-xs text-gray-500">Conditions particulières<textarea v-model="form.specialTerms" rows="5" class="input-field resize-y" placeholder="Laisse vide si aucune condition particulière ne s’applique." /></label><p class="mt-3 text-xs leading-5 text-gray-500">Le modèle fournit une base structurée pour tes prestations numériques. Fais valider les clauses propres à un risque élevé ou à un secteur réglementé avant envoi.</p></section>
        </div>
        <footer class="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-gray-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-[#111118]/95 sm:flex-row sm:justify-end"><button type="button" class="min-h-11 rounded-lg px-4 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/[0.06]" @click="showForm = false">Annuler</button><button type="submit" :disabled="saving" class="min-h-11 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white disabled:opacity-60">{{ saving ? 'Enregistrement…' : 'Enregistrer le brouillon' }}</button></footer>
      </form>
    </div>
  </div>
</template>
