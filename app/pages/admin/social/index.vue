<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

type Platform = 'linkedin' | 'x'
type Status = 'draft' | 'approved' | 'publishing' | 'published' | 'rejected' | 'failed'
type SocialPost = {
  id: string
  platform: Platform
  article_title: string
  article_url: string
  content: string
  status: Status
  external_post_url: string | null
  last_error: string | null
  published_at: string | null
  version: number
  created_at: string
  updated_at: string
}
type Connection = { platform: Platform, state: 'ready' | 'blocked' | 'unknown', message: string, checked_at: string }

const auth = useAuthStore()
const toast = useToast()
const loading = ref(true)
const loadError = ref('')
const posts = ref<SocialPost[]>([])
const connections = ref<Connection[]>([])
const tab = ref<'review' | 'waiting' | 'published'>('review')
const busyId = ref('')
const confirmationPost = ref<SocialPost | null>(null)
const confirmationAccepted = ref(false)
const closeConfirmation = () => { confirmationPost.value = null; confirmationAccepted.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(computed(() => Boolean(confirmationPost.value)), closeConfirmation, '[data-confirm-close]')

const filteredPosts = computed(() => posts.value.filter((post) => {
  if (tab.value === 'review') return ['draft', 'failed'].includes(post.status)
  if (tab.value === 'waiting') return ['approved', 'publishing'].includes(post.status)
  return post.status === 'published'
}))
const counts = computed(() => ({
  review: posts.value.filter(post => ['draft', 'failed'].includes(post.status)).length,
  waiting: posts.value.filter(post => ['approved', 'publishing'].includes(post.status)).length,
  published: posts.value.filter(post => post.status === 'published').length,
}))

function connection(platform: Platform) {
  const current = connections.value.find(item => item.platform === platform)
  if (!current || Date.parse(current.checked_at) < Date.now() - 15 * 60 * 1000) {
    return { platform, state: 'unknown' as const, message: 'Hermes n’a pas vérifié cette connexion récemment.' }
  }
  return current
}
function platformLabel(platform: Platform) { return platform === 'linkedin' ? 'LinkedIn' : 'X' }
function characterCount(content: string) { return [...content].length }
function statusLabel(status: Status) {
  return ({ draft: 'À valider', approved: 'Validé · en attente', publishing: 'Publication en cours', published: 'Publié', rejected: 'Refusé', failed: 'Échec' } as const)[status]
}
function replacePost(update: Partial<SocialPost> & { id: string }) {
  posts.value = posts.value.map(post => post.id === update.id ? { ...post, ...update } : post)
}
async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await $fetch<{ posts: SocialPost[], connections: Connection[] }>('/api/admin/social-posts', { headers: auth.authHeader() })
    posts.value = data.posts
    connections.value = data.connections
  }
  catch { loadError.value = 'Les publications sociales ne peuvent pas être chargées.' }
  finally { loading.value = false }
}
async function update(post: SocialPost, action: 'save' | 'reject' | 'restore') {
  busyId.value = post.id
  try {
    const result = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${post.id}`, {
      method: 'PUT', headers: auth.authHeader(), body: { action, content: post.content, version: post.version },
    })
    replacePost(result)
    toast.success(action === 'save' ? 'Brouillon enregistré' : action === 'reject' ? 'Publication refusée et retirée du tableau' : 'Brouillon restauré')
  }
  catch (error: any) { toast.error(error?.data?.message || 'La modification a échoué') }
  finally { busyId.value = '' }
}
async function approve() {
  const post = confirmationPost.value
  if (!post || !confirmationAccepted.value) return
  busyId.value = post.id
  try {
    const result = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${post.id}/approve`, {
      method: 'POST', headers: auth.authHeader(), body: { confirmation: 'APPROUVER_ET_PUBLIER', content: post.content, version: post.version },
    })
    replacePost(result)
    closeConfirmation()
    tab.value = 'waiting'
    toast.success('Publication validée. Hermes la publiera à 18 h.')
  }
  catch (error: any) { toast.error(error?.data?.message || 'La validation a échoué') }
  finally { busyId.value = '' }
}

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <section class="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Publication</span><h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Réseaux sociaux</h1><p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Relis chaque texte dans la journée. Après ta validation, Hermes le publie à 18 h avec l’image de l’article.</p></div>
        <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-[background-color,transform] duration-150 hover:bg-gray-50 active:scale-[.96] dark:border-white/[0.1] dark:text-gray-200 dark:hover:bg-white/[0.05]" @click="load">Actualiser</button>
      </div>
    </section>

    <section class="grid gap-3 sm:grid-cols-2" aria-label="État des connexions">
      <div v-for="platform in (['linkedin', 'x'] as Platform[])" :key="platform" class="admin-card flex items-start justify-between gap-4">
        <div><p class="font-semibold text-gray-950 dark:text-white">{{ platformLabel(platform) }}</p><p class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{{ connection(platform).message }}</p></div>
        <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="connection(platform).state === 'ready' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'">{{ connection(platform).state === 'ready' ? 'Prêt' : 'À connecter' }}</span>
      </div>
    </section>

    <nav class="admin-toolbar flex gap-1 overflow-x-auto" aria-label="Filtres des publications">
      <button v-for="item in ([['review', 'À valider'], ['waiting', 'En cours'], ['published', 'Publiés']] as const)" :key="item[0]" type="button" class="min-h-11 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.96]" :class="tab === item[0] ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]'" @click="tab = item[0]">{{ item[1] }} · {{ counts[item[0]] }}</button>
    </nav>

    <div v-if="loading" role="status" class="admin-card grid min-h-52 place-items-center"><p class="text-sm text-gray-500">Chargement…</p></div>
    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900"><p class="font-semibold">{{ loadError }}</p><button class="mt-3 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="load">Réessayer</button></div>
    <div v-else-if="!filteredPosts.length" class="admin-card admin-empty-state"><p class="admin-empty-title">Rien dans cette catégorie</p><p class="admin-empty-body">Les prochains brouillons créés par Hermes apparaîtront ici.</p></div>

    <section v-else class="grid gap-4 xl:grid-cols-2" aria-label="Publications sociales">
      <article v-for="post in filteredPosts" :key="post.id" class="admin-card flex flex-col p-5">
        <div class="flex items-start justify-between gap-3"><div><div class="flex flex-wrap items-center gap-2"><span class="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">{{ platformLabel(post.platform) }}</span><span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/[0.07] dark:text-gray-300">{{ statusLabel(post.status) }}</span></div><h2 class="mt-2 font-display text-lg font-semibold text-gray-950 dark:text-white">{{ post.article_title }}</h2></div><span class="text-xs tabular-nums" :class="characterCount(post.content) > (post.platform === 'x' ? 280 : 3000) ? 'text-red-600' : 'text-gray-400'">{{ characterCount(post.content) }}/{{ post.platform === 'x' ? 280 : 3000 }}</span></div>
        <a :href="post.article_url" target="_blank" rel="noopener noreferrer" class="mt-2 truncate text-xs font-medium text-violet-600 hover:underline dark:text-violet-300">Voir le lien associé ↗</a>
        <textarea v-if="['draft', 'failed'].includes(post.status)" v-model="post.content" rows="9" class="input-field mt-4 resize-y text-sm leading-6" :maxlength="post.platform === 'x' ? 280 : 3000" :aria-label="`Texte ${platformLabel(post.platform)}`" />
        <div v-else class="mt-4 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700 dark:bg-white/[0.04] dark:text-gray-200">{{ post.content }}</div>
        <p v-if="post.last_error" role="alert" class="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800 dark:bg-red-500/10 dark:text-red-200">{{ post.last_error }}</p>
        <div class="mt-auto flex flex-wrap gap-2 pt-4">
          <template v-if="['draft', 'failed'].includes(post.status)"><button class="min-h-11 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-[background-color,transform] duration-150 hover:bg-gray-50 active:scale-[.96] disabled:opacity-50 dark:border-white/[0.1] dark:text-gray-200" :disabled="busyId === post.id" @click="update(post, 'save')">Enregistrer</button><button class="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 transition-[background-color,transform] duration-150 hover:bg-red-50 active:scale-[.96] disabled:opacity-50 dark:border-red-500/20 dark:text-red-300" :disabled="busyId === post.id" @click="update(post, 'reject')">Refuser</button><button class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-violet-700 active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-50" :disabled="busyId === post.id || connection(post.platform).state !== 'ready' || characterCount(post.content) > (post.platform === 'x' ? 280 : 3000)" @click="confirmationPost = post">Valider pour 18 h</button></template>
          <button v-else-if="post.status === 'rejected'" class="min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700" @click="update(post, 'restore')">Restaurer</button>
          <a v-else-if="post.status === 'published' && post.external_post_url" :href="post.external_post_url" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white">Voir la publication ↗</a>
          <p v-else-if="post.status === 'approved'" class="text-xs text-gray-500">Validé · publication prévue à 18 h.</p>
          <p v-else-if="post.status === 'publishing'" class="text-xs text-amber-700">Hermes publie maintenant. Aucun nouvel essai automatique évite les doublons.</p>
        </div>
      </article>
    </section>

    <div v-if="confirmationPost" ref="dialogRef" class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="social-confirm-title" tabindex="-1" @keydown="handleDialogKeydown">
      <div class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#15151e]"><h2 id="social-confirm-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">Valider pour 18 h</h2><p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Ce texte sera rendu public sur {{ platformLabel(confirmationPost.platform) }} à 18 h par Hermes, avec l’image de l’article. Cette action demande ton accord explicite.</p><div class="mt-4 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 dark:bg-white/[0.05]">{{ confirmationPost.content }}</div><label class="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-white/[0.1]"><input v-model="confirmationAccepted" type="checkbox" class="mt-1 h-4 w-4 accent-violet-600"><span class="text-sm text-gray-700 dark:text-gray-200">J’ai relu ce texte et j’autorise sa publication publique à 18 h.</span></label><div class="mt-5 flex gap-3"><button data-confirm-close type="button" class="min-h-11 flex-1 rounded-lg border border-gray-200 px-4 text-sm font-semibold dark:border-white/[0.1]" @click="closeConfirmation">Annuler</button><button type="button" class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!confirmationAccepted || busyId === confirmationPost.id" @click="approve">Valider pour 18 h</button></div></div>
    </div>
  </div>
</template>
