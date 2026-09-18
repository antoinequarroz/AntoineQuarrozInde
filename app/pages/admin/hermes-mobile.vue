<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

type Project = { id: string, label: string, parentId: string | null, archived: boolean }
type Profile = { name: string, label: string, model: string | null, provider: string | null }
type Mission = { id: string, title: string, owner: string, projectId: string | null, status: string, lastStatus: string | null, nextRunAt: string | null }
type Review = { id: string, title: string, projectId: string | null, decision: string, addedAt: string | null }
type Workspace = { schemaVersion: 1, sourceFetchedAt: string | null, projects: Project[], profiles: Profile[], missions: Mission[], reviews: Review[] }
type Snapshot = { revision: number, source_fetched_at: string | null, payload: Workspace, updated_at: string, device_id: string }
type Device = { id: string, label: string, created_at: string, last_seen_at: string | null, revoked_at: string | null }

const auth = useAuthStore()
const toast = useToast()
const snapshot = ref<Snapshot | null>(null)
const devices = ref<Device[]>([])
const loading = ref(true)
const error = ref('')
const deviceName = ref('Mon Mac')
const pairingToken = ref('')
const creating = ref(false)
const revoking = ref('')
const now = ref(Date.now())
let freshnessTimer: ReturnType<typeof setInterval> | null = null

const activeDevice = computed(() => devices.value.find(device => !device.revoked_at) ?? null)
const workspace = computed(() => snapshot.value?.payload ?? null)
const attention = computed(() => workspace.value?.reviews.filter(item => item.decision !== 'Relu') ?? [])
const fresh = computed(() => {
  const date = snapshot.value?.source_fetched_at
  return Boolean(!error.value && date && now.value - Date.parse(date) < 15 * 60 * 1000)
})
const groups = computed(() => {
  const current = workspace.value
  if (!current) return []
  return current.projects.filter(project => !project.archived).map(project => ({
    ...project,
    missions: current.missions.filter(mission => mission.projectId === project.id),
    reviews: current.reviews.filter(review => review.projectId === project.id && review.decision !== 'Relu').length,
  }))
})
const unclassified = computed(() => workspace.value?.missions.filter(mission => !mission.projectId) ?? [])

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Jamais'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleString('fr-CH', { dateStyle: 'medium', timeStyle: 'short' })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const headers = auth.authHeader()
    const [workspaceData, devicesData] = await Promise.all([
      $fetch<{ snapshot: Snapshot | null }>('/api/admin/hermes-mobile/snapshot', { headers }),
      $fetch<{ devices: Device[] }>('/api/admin/hermes-mobile/devices', { headers }),
    ])
    snapshot.value = workspaceData.snapshot
    devices.value = devicesData.devices
    now.value = Date.now()
  }
  catch { error.value = 'Impossible de lire les données Hermes. Vérifie ta connexion et réessaie.' }
  finally { loading.value = false }
}

async function createDevice() {
  creating.value = true
  pairingToken.value = ''
  try {
    const result = await $fetch<{ device: Device, token: string }>('/api/admin/hermes-mobile/devices', {
      method: 'POST', headers: auth.authHeader(), body: { label: deviceName.value },
    })
    pairingToken.value = result.token
    await load()
    toast.success('Nouvelle clé créée. Les anciennes connexions Mac sont révoquées.')
  }
  catch (failure: any) { toast.error(failure?.data?.message || 'Association impossible.') }
  finally { creating.value = false }
}

async function revokeDevice(id: string) {
  revoking.value = id
  try {
    await $fetch(`/api/admin/hermes-mobile/devices/${id}`, { method: 'DELETE', headers: auth.authHeader() })
    pairingToken.value = ''
    await load()
    toast.success('Accès du Mac révoqué.')
  }
  catch (failure: any) { toast.error(failure?.data?.message || 'Révocation impossible.') }
  finally { revoking.value = '' }
}

onMounted(() => { load(); freshnessTimer = setInterval(() => { now.value = Date.now() }, 60_000) })
onBeforeUnmount(() => { if (freshnessTimer) clearInterval(freshnessTimer); pairingToken.value = '' })
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5 pb-12">
    <section class="admin-card p-5 sm:p-7">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div><span class="text-xs font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Compagnon mobile · lecture</span><h1 class="mt-2 font-display text-2xl font-bold text-gray-950 dark:text-white sm:text-3xl">Hermes sur ton téléphone</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">Retrouve l’état partagé par ton Mac : projets, profils, missions et rapports à relire. Les validations du cockpit Mac ne sont pas encore disponibles ici.</p></div>
        <button type="button" class="min-h-11 rounded-xl border border-violet-500/20 px-4 text-sm font-semibold text-violet-700 dark:text-violet-200" :disabled="loading" @click="load">Actualiser</button>
      </div>
    </section>

    <p v-if="loading" role="status" class="admin-card p-5">Chargement de l’espace Hermes…</p>
    <template v-else>
      <div v-if="error" role="alert" class="admin-card border-red-300 p-5 text-red-700 dark:text-red-200">{{ error }} <span v-if="snapshot">Le dernier relevé chargé reste affiché ci-dessous.</span></div>
      <section v-if="snapshot || !error" class="admin-card p-5" aria-label="Fraîcheur des données">
        <p class="text-sm font-semibold" :class="fresh ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'">{{ snapshot ? (fresh ? 'Données récentes' : 'Données à actualiser sur le Mac') : 'Aucune synchronisation Mac' }}</p>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Dernier relevé Hermes : {{ dateLabel(snapshot?.source_fetched_at) }} · dernier partage Mac : {{ dateLabel(snapshot?.updated_at) }}</p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Le partage se fait depuis l’app Mac ouverte. Une mission peut avoir changé sur le serveur depuis ce relevé.</p>
      </section>

      <template v-if="workspace">
        <section class="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Indicateurs Hermes">
          <div v-for="metric in [{ label: 'Projets', value: groups.length }, { label: 'Profils', value: workspace.profiles.length }, { label: 'Missions', value: workspace.missions.length }, { label: 'À relire', value: attention.length }]" :key="metric.label" class="admin-card p-4"><p class="text-xs text-gray-500 dark:text-gray-400">{{ metric.label }}</p><p class="mt-2 font-display text-2xl font-bold text-gray-950 dark:text-white">{{ metric.value }}</p></div>
        </section>

        <section class="space-y-3" aria-labelledby="mobile-reviews-title"><h2 id="mobile-reviews-title" class="font-display text-xl font-bold text-gray-950 dark:text-white">À relire</h2><p v-if="!attention.length" class="admin-card p-5 text-sm text-gray-600 dark:text-gray-300">Aucun rapport en attente dans le dernier partage.</p><article v-for="item in attention.slice(0, 12)" :key="item.id" class="admin-card p-4"><p class="text-xs font-semibold text-violet-700 dark:text-violet-300">{{ item.decision }}</p><h3 class="mt-1 font-semibold text-gray-950 dark:text-white">{{ item.title }}</h3><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ workspace.projects.find(project => project.id === item.projectId)?.label || 'Sans projet' }} · ajouté {{ dateLabel(item.addedAt) }}</p></article><p v-if="attention.length > 12" class="text-xs text-gray-500">{{ attention.length - 12 }} autres rapports restent visibles sur le Mac.</p></section>

        <section class="space-y-3" aria-labelledby="mobile-projects-title"><h2 id="mobile-projects-title" class="font-display text-xl font-bold text-gray-950 dark:text-white">Projets et missions</h2><p v-if="!groups.length && !unclassified.length" class="admin-card p-5 text-sm text-gray-600 dark:text-gray-300">Aucun projet partagé.</p><article v-for="group in groups" :key="group.id" class="admin-card p-5"><div class="flex items-start justify-between gap-3"><h3 class="font-display text-lg font-bold text-gray-950 dark:text-white">{{ group.label }}</h3><span v-if="group.reviews" class="rounded-full bg-violet-500/10 px-2 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200">{{ group.reviews }} à relire</span></div><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ group.missions.length }} mission(s)</p><ul v-if="group.missions.length" class="mt-4 divide-y divide-gray-200 dark:divide-white/10"><li v-for="mission in group.missions" :key="mission.id" class="flex justify-between gap-3 py-3 text-sm"><span class="text-gray-900 dark:text-gray-100">{{ mission.title }}</span><span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">{{ mission.status }}</span></li></ul></article><article v-if="unclassified.length" class="admin-card p-5"><h3 class="font-display text-lg font-bold text-gray-950 dark:text-white">À classer</h3><p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ unclassified.length }} mission(s) sans projet dans le dernier partage.</p></article></section>

        <section class="space-y-3" aria-labelledby="mobile-profiles-title"><h2 id="mobile-profiles-title" class="font-display text-xl font-bold text-gray-950 dark:text-white">Profils</h2><div class="grid gap-3 sm:grid-cols-2"><article v-for="profile in workspace.profiles" :key="profile.name" class="admin-card p-4"><h3 class="font-semibold text-gray-950 dark:text-white">{{ profile.label }}</h3><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ profile.model || 'Modèle non communiqué' }} · {{ profile.provider || 'Fournisseur non communiqué' }}</p></article></div></section>
      </template>
    </template>

    <section class="admin-card p-5 sm:p-7" aria-labelledby="mobile-pairing-title"><h2 id="mobile-pairing-title" class="font-display text-xl font-bold text-gray-950 dark:text-white">Associer le Mac</h2><p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Crée une clé, copie-la dans les réglages du cockpit Mac, puis lance le partage. Créer une nouvelle clé révoque la précédente. La clé n’apparaît qu’une fois sur cette page.</p><div class="mt-4 flex flex-wrap gap-2"><input v-model="deviceName" aria-label="Nom du Mac" maxlength="80" class="input-field min-h-11 min-w-40 flex-1" placeholder="Nom du Mac"><button type="button" class="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50" :disabled="creating || !deviceName.trim()" @click="createDevice">{{ creating ? 'Création…' : 'Créer une clé' }}</button></div><div v-if="pairingToken" class="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"><p class="text-sm font-semibold text-amber-900 dark:text-amber-200">Copie cette clé maintenant ; elle ne sera plus affichée après avoir quitté la page.</p><code class="mt-2 block break-all select-all text-xs text-gray-900 dark:text-white">{{ pairingToken }}</code></div><div v-if="activeDevice" class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-white/10"><p class="text-sm text-gray-700 dark:text-gray-300">{{ activeDevice.label }} · dernier partage {{ dateLabel(activeDevice.last_seen_at) }}</p><button type="button" class="min-h-11 rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-700 disabled:opacity-50 dark:border-red-500/30 dark:text-red-300" :disabled="revoking === activeDevice.id" @click="revokeDevice(activeDevice.id)">Révoquer l’accès</button></div></section>

    <section class="admin-card p-5 text-sm leading-6 text-gray-600 dark:text-gray-300"><h2 class="font-semibold text-gray-950 dark:text-white">Pour agir depuis le téléphone</h2><p class="mt-2">Les publications sociales disposent déjà d’une validation sécurisée dans l’administration. Les rapports Hermes de cette page restent en lecture seule jusqu’à la synchronisation des décisions.</p><NuxtLink to="/admin/social" class="mt-3 inline-flex min-h-11 items-center font-semibold text-violet-700 underline dark:text-violet-300">Ouvrir les publications à valider →</NuxtLink></section>
  </div>
</template>
