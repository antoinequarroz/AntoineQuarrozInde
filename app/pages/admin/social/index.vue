<script setup lang="ts">
import { socialApprovalRequest } from '~/utils/socialApproval'
definePageMeta({ layout: 'admin', middleware: 'admin' })

type Platform = 'linkedin' | 'x' | 'instagram'
type SocialMedia = { type: 'image' | 'video', url: string, alt: string }
type Status = 'draft' | 'approved' | 'publishing' | 'published' | 'rejected' | 'failed'
type SocialPost = {
  id: string
  studioContentId: string | null
  platform: Platform
  article_title: string
  article_url: string
  content: string
  publication_mode: 'manual' | 'automatic'
  approved_version: number | null
  media_images: { url: string, alt: string }[]
  media_items?: SocialMedia[]
  media_kind: 'document' | null
  media_url: string | null
  media_title: string | null
  status: Status
  external_post_url: string | null
  last_error: string | null
  publish_after: string | null
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
const dirtyMedia = reactive<Record<string, boolean>>({})
const mixedEditing = reactive<Record<string, boolean>>({})
function hasMedia(post: SocialPost) { return Boolean(post.media_items?.length || post.media_images?.length) }
function usesMixedGallery(post: SocialPost) {
  return post.platform === 'instagram' && (Boolean(post.media_items?.length) || post.media_images?.length !== 1 || mixedEditing[post.id])
}
function mediaSummary(post: SocialPost) {
  if (hasDocument(post)) return 'son document PDF'
  const items = post.media_items?.length ? post.media_items : (post.media_images || []).map(image => ({ ...image, type: 'image' as const }))
  const images = items.filter(item => item.type === 'image').length
  const videos = items.filter(item => item.type === 'video').length
  return [images ? `${images} image${images > 1 ? 's' : ''}` : '', videos ? `${videos} vidéo${videos > 1 ? 's' : ''}` : ''].filter(Boolean).join(' et ') || 'aucun média joint'
}
async function saveMedia(post: SocialPost, media: SocialMedia[]) {
  busyId.value = post.id
  try {
    const result = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${post.id}/media`, { method: 'PUT', headers: auth.authHeader(), body: { media, version: post.version } })
    replacePost(result)
    toast.success('Médias enregistrés. Le brouillon attend ta validation.')
  } catch (error: any) { toast.error(error?.data?.message || 'Enregistrement impossible') }
  finally { busyId.value = '' }
}
async function saveImages(post: SocialPost, images: { url: string, alt: string }[]) {
  busyId.value = post.id
  try {
    const result = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${post.id}/images`, { method: 'PUT', headers: auth.authHeader(), body: { images, version: post.version } })
    replacePost(result)
    toast.success('Visuels enregistrés')
  } catch (error: any) { toast.error(error?.data?.message || 'Enregistrement impossible') }
  finally { busyId.value = '' }
}
const confirmationPost = ref<SocialPost | null>(null)
const confirmationMode = ref<'scheduled' | 'now' | 'text' | 'media'>('scheduled')
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
function platformLabel(platform: Platform) { return ({ linkedin: 'LinkedIn', x: 'X', instagram: 'Instagram' })[platform] }
function limit(platform: Platform) { return platform === 'x' ? 280 : platform === 'instagram' ? 2200 : 3000 }
function characterCount(content: string) { return [...content].length }
function hasDocument(post: SocialPost) { return post.media_kind === 'document' && Boolean(post.media_url) }
function openConfirmation(post: SocialPost, mode: 'scheduled' | 'now' | 'text' | 'media') {
  confirmationMode.value = mode
  confirmationPost.value = post
}
function publicationTime(post: SocialPost) {
  if (!post.publish_after) return 'heure de publication à confirmer'
  return new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(post.publish_after))
}
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
    const request = socialApprovalRequest(confirmationMode.value)
    const result = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${post.id}/${request.action}`, {
      method: 'POST', headers: auth.authHeader(), body: {
        mode: confirmationMode.value,
        confirmation: request.confirmation,
        content: post.content,
        version: post.version,
      },
    })
    replacePost(result)
    closeConfirmation()
    tab.value = 'waiting'
    toast.success(confirmationMode.value === 'media' ? 'Texte et visuels validés pour publication manuelle.' : confirmationMode.value === 'text' ? 'Texte validé. Publication Instagram manuelle, sans programmation.' : confirmationMode.value === 'now'
      ? 'Texte et médias approuvés. Hermes les traitera lors de son prochain passage si la connexion est prête.'
      : 'Texte validé et programmé pour 18 h.')
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
        <div><span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Publication</span><h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Réseaux sociaux</h1><p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Relis tes textes et leurs médias. Valide le texte et tous les visuels pour autoriser leur envoi sur LinkedIn, X ou Instagram. Tu peux publier au prochain passage de Hermes ou programmer pour 18 h.</p></div>
        <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-[background-color,transform] duration-150 hover:bg-gray-50 active:scale-[.96] dark:border-white/[0.1] dark:text-gray-200 dark:hover:bg-white/[0.05]" @click="load">Actualiser</button>
      </div>
    </section>

    <AdminSocialNetworkInsights />

    <section class="grid gap-3 sm:grid-cols-3" aria-label="État des connexions">
      <div v-for="platform in (['linkedin', 'x', 'instagram'] as Platform[])" :key="platform" class="admin-card flex items-start justify-between gap-4">
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
      <article v-for="post in filteredPosts" :key="post.id" class="admin-card flex min-w-0 flex-col p-5">
        <div class="flex items-start justify-between gap-3"><div><div class="flex flex-wrap items-center gap-2"><span class="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">{{ platformLabel(post.platform) }}</span><span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/[0.07] dark:text-gray-300">{{ statusLabel(post.status) }}</span></div><h2 class="mt-2 font-display text-lg font-semibold text-gray-950 dark:text-white">{{ post.article_title }}</h2></div><span class="text-xs tabular-nums" :class="characterCount(post.content) > limit(post.platform) ? 'text-red-600' : 'text-gray-400'">{{ characterCount(post.content) }}/{{ limit(post.platform) }}</span></div>
        <a :href="post.article_url" target="_blank" rel="noopener noreferrer" class="mt-2 truncate text-xs font-medium text-violet-600 hover:underline dark:text-violet-300">Voir le lien associé ↗</a>
        <p v-if="post.platform === 'instagram' && !hasMedia(post)" class="mt-3 text-xs text-gray-500 dark:text-gray-400">Ajoute les images et vidéos au brouillon pour relire l’ensemble ici. Sans média joint, seule la validation du texte est disponible, sans envoi ni programmation. <a v-if="post.studioContentId" :href="`http://127.0.0.1:3108/?hermesContent=${post.studioContentId}`" target="_blank" rel="noopener noreferrer" class="text-violet-600 underline dark:text-violet-300">Ouvrir dans le studio sur ce Mac ↗</a></p>
        <AdminSocialDocumentPreview v-if="hasDocument(post)" :url="post.media_url!" :title="post.media_title || 'Document LinkedIn'" />
        <AdminSocialMediaGallery v-if="!hasDocument(post) && usesMixedGallery(post)" :media="post.media_items" :legacy-images="post.media_images" :editable="['draft', 'failed'].includes(post.status)" :busy="busyId === post.id" @save="saveMedia(post, $event)" @dirty="dirtyMedia[post.id] = $event" />
        <AdminSocialImageGallery v-else-if="!hasDocument(post)" :images="post.media_images || []" :platform="post.platform" :editable="['draft', 'failed'].includes(post.status)" :busy="busyId === post.id" @save="saveImages(post, $event)" @dirty="dirtyMedia[post.id] = $event" />
        <button v-if="post.platform === 'instagram' && !usesMixedGallery(post) && ['draft', 'failed'].includes(post.status)" type="button" class="mt-2 min-h-11 self-start text-sm font-semibold text-violet-700 underline dark:text-violet-300" :disabled="busyId === post.id || dirtyMedia[post.id]" @click="mixedEditing[post.id] = true">Créer un carrousel avec cette image</button>
        <p v-if="dirtyMedia[post.id]" role="status" class="mt-2 text-sm text-amber-700">Enregistre les médias avant de valider.</p>
        <textarea v-if="['draft', 'failed'].includes(post.status)" v-model="post.content" rows="9" class="input-field mt-4 resize-y text-sm leading-6" :maxlength="post.platform === 'instagram' ? 4400 : limit(post.platform)" :aria-label="`Texte ${platformLabel(post.platform)}`" />
        <div v-else class="mt-4 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700 dark:bg-white/[0.04] dark:text-gray-200">{{ post.content }}</div>
        <p v-if="post.last_error" role="alert" class="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800 dark:bg-red-500/10 dark:text-red-200">{{ post.last_error }}</p>
        <div class="mt-auto flex flex-wrap gap-2 pt-4">
          <template v-if="['draft', 'failed'].includes(post.status)"><button class="min-h-11 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-[background-color,transform] duration-150 hover:bg-gray-50 active:scale-[.96] disabled:opacity-50 dark:border-white/[0.1] dark:text-gray-200" :disabled="busyId === post.id" @click="update(post, 'save')">Enregistrer</button><button class="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 transition-[background-color,transform] duration-150 hover:bg-red-50 active:scale-[.96] disabled:opacity-50 dark:border-red-500/20 dark:text-red-300" :disabled="busyId === post.id" @click="update(post, 'reject')">Refuser</button><button v-if="post.platform !== 'instagram' || hasMedia(post)" class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-violet-700 active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-50" :disabled="busyId === post.id || dirtyMedia[post.id] || characterCount(post.content) > limit(post.platform)" @click="openConfirmation(post, 'scheduled')">Valider pour 18 h</button><button v-if="post.platform !== 'instagram' || hasMedia(post)" class="min-h-11 rounded-lg border border-violet-300 px-4 text-sm font-semibold text-violet-700 transition-[background-color,transform] duration-150 hover:bg-violet-50 active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/30 dark:text-violet-200 dark:hover:bg-violet-500/10" :disabled="busyId === post.id || dirtyMedia[post.id] || characterCount(post.content) > limit(post.platform)" @click="openConfirmation(post, 'now')">Publier maintenant</button><button v-if="post.platform === 'instagram' && !hasMedia(post)" type="button" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50" :disabled="busyId === post.id || dirtyMedia[post.id] || characterCount(post.content) > 2200" @click="openConfirmation(post, 'text')">Valider le texte</button></template>
          <button v-else-if="post.status === 'approved'" type="button" class="min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700 dark:text-violet-200" :disabled="busyId === post.id" @click="update(post, 'restore')">Modifier et annuler la validation</button>
          <button v-else-if="post.status === 'rejected'" class="min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700" @click="update(post, 'restore')">Restaurer</button>
          <a v-else-if="post.status === 'published' && post.external_post_url" :href="post.external_post_url" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white">Voir la publication ↗</a>
          <p v-if="post.status === 'approved' && hasMedia(post) && post.publication_mode !== 'automatic'" class="text-xs text-gray-500">Texte et visuels relus pour publication manuelle. Autorise explicitement leur envoi ci-dessous si tu veux publier depuis le site.</p>
          <p v-else-if="post.status === 'approved' && post.platform === 'instagram' && post.publication_mode !== 'automatic'" class="text-xs text-gray-500 dark:text-gray-400">Texte validé · à publier manuellement avec sa vidéo depuis le studio.</p>
          <p v-else-if="post.status === 'approved'" class="text-xs text-gray-500">Validé · publication prévue le {{ publicationTime(post) }} si la connexion est prête.</p>
          <p v-else-if="post.status === 'publishing'" class="text-xs text-amber-700">Hermes publie maintenant. Aucun nouvel essai automatique évite les doublons.</p>
        </div>
        <div v-if="post.status === 'approved' && post.publication_mode !== 'automatic' && hasMedia(post)" class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50" :disabled="busyId === post.id" @click="openConfirmation(post, 'now')">Autoriser la publication maintenant</button>
          <button type="button" class="min-h-11 rounded-lg border border-violet-300 px-4 text-sm font-semibold text-violet-700 dark:text-violet-200" :disabled="busyId === post.id" @click="openConfirmation(post, 'scheduled')">Autoriser pour 18 h</button>
        </div>
      </article>
    </section>

    <div v-if="confirmationPost" ref="dialogRef" class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="social-confirm-title" tabindex="-1" @keydown="handleDialogKeydown">
      <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#15151e]"><h2 id="social-confirm-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">{{ confirmationMode === 'media' ? 'Valider le texte et les visuels' : confirmationMode === 'text' ? 'Valider le texte Instagram' : confirmationMode === 'now' ? 'Publier maintenant' : 'Programmer pour 18 h' }}</h2><p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{{ confirmationMode === 'media' ? 'Tu valides le texte et les médias enregistrés, dans cet ordre. La publication reste manuelle, sans envoi ni programmation.' : confirmationMode === 'text' ? 'Ce texte sera marqué comme relu. Tu publieras toi-même le texte et la vidéo ; aucun envoi ni programmation ne sera lancé.' : confirmationMode === 'now' ? `Après ton accord explicite, Hermes tentera de publier ce texte avec ${mediaSummary(confirmationPost)} sur ${platformLabel(confirmationPost.platform)} lors de son prochain passage. La connexion doit être prête.` : `Après ton accord explicite, ce texte avec ${mediaSummary(confirmationPost)} restera en attente jusqu’à 18 h, heure de Suisse. Hermes publiera cet ensemble si la connexion est prête.` }}</p><div v-if="hasDocument(confirmationPost)" class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-400/20 dark:bg-violet-500/[0.08]"><div><p class="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-200">Carrousel inclus</p><p class="mt-1 text-sm font-semibold text-gray-950 dark:text-white">{{ confirmationPost.media_title }}</p></div><a :href="confirmationPost.media_url!" target="_blank" rel="noopener noreferrer" class="shrink-0 text-xs font-semibold text-violet-700 underline dark:text-violet-200">Relire le PDF ↗</a></div><AdminSocialMediaGallery v-if="confirmationPost.media_items?.length" :media="confirmationPost.media_items" :editable="false" /><AdminSocialImageGallery v-else-if="hasMedia(confirmationPost)" :images="confirmationPost.media_images" :platform="confirmationPost.platform" :editable="false" /><div class="mt-4 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 dark:bg-white/[0.05]">{{ confirmationPost.content }}</div><label class="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-white/[0.1]"><input v-model="confirmationAccepted" type="checkbox" class="mt-1 h-4 w-4 accent-violet-600"><span class="text-sm text-gray-700 dark:text-gray-200">{{ confirmationMode === 'media' ? 'J’ai relu le texte et tous les visuels. Je publierai cet ensemble manuellement.' : confirmationMode === 'text' ? 'J’ai relu ce texte Instagram. Je conserve la publication manuelle de la vidéo et du texte.' : confirmationMode === 'now' ? 'J’ai relu ce texte et tous ses médias, et j’autorise leur publication publique dès le prochain passage de Hermes.' : 'J’ai relu ce texte et tous ses médias, et j’autorise leur publication publique à partir de 18 h.' }}</span></label><div class="mt-5 flex gap-3"><button data-confirm-close type="button" class="min-h-11 flex-1 rounded-lg border border-gray-200 px-4 text-sm font-semibold dark:border-white/[0.1]" @click="closeConfirmation">Annuler</button><button type="button" class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!confirmationAccepted || busyId === confirmationPost.id" @click="approve">{{ confirmationMode === 'media' ? 'Valider l’ensemble' : confirmationMode === 'text' ? 'Valider le texte' : confirmationMode === 'now' ? 'Publier maintenant' : 'Valider pour 18 h' }}</button></div></div>
    </div>
  </div>
</template>
