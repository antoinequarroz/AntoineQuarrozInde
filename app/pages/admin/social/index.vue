<script setup lang="ts">
import { socialApprovalRequest } from '~/utils/socialApproval'
definePageMeta({ layout: 'admin', middleware: 'admin' })

import type { SocialPost, EditorialSocialPlatform as Platform, EditorialSocialStatus as Status, EditorialSocialMediaItem as SocialMedia } from '../../../../shared/types/socialEditorial'
import type { LocationQueryRaw } from 'vue-router'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import { isoToZurichLocal, zurichLocalToIso, zurichDateKey, isSocialDateKey } from '#shared/utils/socialDateTime'
import { parseSocialCalendarFilters, matchesSocialCalendarFilters, calendarDays, socialPostCalendarIso, SOCIAL_CALENDAR_DRAG_TYPE } from '~/utils/socialCalendar'
import { canMoveSocialPost, resolveSocialPostMove } from '~/utils/socialCalendarMove'

type Connection = { platform: Platform, state: 'ready' | 'blocked' | 'unknown', message: string, checked_at: string }

const auth = useAuthStore()
const toast = useToast()
const loading = ref(true)
const loadError = ref('')
const posts = ref<SocialPost[]>([])
const connections = ref<Connection[]>([])
const route = useRoute()
const router = useRouter()
const filterQuery = ref<LocationQueryRaw>({ ...route.query })
const filters = computed(() => parseSocialCalendarFilters(filterQuery.value))
const calendarPath = route.path
let pageActive = true
let calendarDepartureEpoch = 0
let filterNavigation: Promise<boolean> | null = null
onBeforeUnmount(() => { pageActive = false })
function isCalendarActive() { return pageActive && router.currentRoute.value.path === calendarPath }
watch(() => route.query, query => {
  if (!filterNavigation) filterQuery.value = { ...query }
})
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
    replacePost(result, true)
    toast.success('Médias enregistrés. Le brouillon attend ta validation.')
  } catch (error: any) { toast.error(error?.data?.message || 'Enregistrement impossible') }
  finally { busyId.value = '' }
}
async function saveImages(post: SocialPost, images: { url: string, alt: string }[]) {
  busyId.value = post.id
  try {
    const result = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${post.id}/images`, { method: 'PUT', headers: auth.authHeader(), body: { images, version: post.version } })
    replacePost(result, true)
    toast.success('Visuels enregistrés')
  } catch (error: any) { toast.error(error?.data?.message || 'Enregistrement impossible') }
  finally { busyId.value = '' }
}
const confirmationPost = ref<SocialPost | null>(null)
const confirmationMode = ref<'scheduled' | 'now' | 'text' | 'media'>('scheduled')
const confirmationAccepted = ref(false)
const closeConfirmation = () => { confirmationPost.value = null; confirmationAccepted.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(computed(() => Boolean(confirmationPost.value)), closeConfirmation, '[data-confirm-close]')


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
  const pending = zurichLocalToIso(plannedInput.value)
  scheduleInput.value = pending && Date.parse(pending) > Date.now() ? plannedInput.value : futureDefault(post)
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
function replacePost(update: Partial<SocialPost> & { id: string }, preserveContent = false) {
  posts.value = posts.value.map(post => post.id === update.id ? { ...post, ...update } : post)
  if (editingPost.value?.id === update.id) {
    const content = editingPost.value.content
    editingPost.value = { ...editingPost.value, ...update, ...(preserveContent ? { content } : {}) }
  }
}
async function load() {
  if (busyId.value) { toast.error('Attends la fin de l’enregistrement avant d’actualiser.'); return }
  if (hasTextChanges.value || hasDateChanges.value || (editingPost.value && dirtyMedia[editingPost.value.id])) { toast.error('Enregistre tes modifications avant d’actualiser.'); return }
  cancelDrag()
  loading.value = true; loadError.value = ''
  try {
    type Response = { posts: SocialPost[], connections: Connection[], pagination?: { page: number, pageSize: number, total: number, hasMore: boolean } }
    const collected: SocialPost[] = []
    let page = 1, total: number | undefined
    let currentConnections: Connection[] = []
    while (true) {
      const data = await $fetch<Response>(page === 1 ? '/api/admin/social-posts' : `/api/admin/social-posts?page=${page}&pageSize=100&status=all`, { headers: auth.authHeader() })
      collected.push(...data.posts); currentConnections = data.connections
      if (data.pagination) {
        if (total !== undefined && data.pagination.total !== total) throw new Error('L’historique a changé pendant son chargement. Réessaie.')
        total = data.pagination.total
      }
      if (!data.pagination?.hasMore) break
      if (!data.posts.length) throw new Error('Chargement de l’historique interrompu. Réessaie.')
      page++
    }
    const unique = new Map(collected.map(post => [post.id, post]))
    if (total !== undefined && unique.size !== total) throw new Error('L’historique a changé pendant son chargement. Réessaie.')
    posts.value = [...unique.values()]; connections.value = currentConnections
    selectPostFromUrl()
  } catch (error: any) { loadError.value = error?.data?.message || error?.message || 'Les publications ne peuvent pas être chargées.' }
  finally { loading.value = false }
}

async function update(post: SocialPost, action: 'save' | 'reject' | 'restore') {
  if (busyId.value) return { ok: false as const, error: 'Attends la fin de l’enregistrement avant de réessayer.' }
  busyId.value = post.id
  try {
    const result = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${post.id}`, {
      method: 'PUT', headers: auth.authHeader(), body: { action, version: post.version, ...(action === 'save' ? { content: post.content } : {}) },
    })
    replacePost(result)
    toast.success(action === 'save' ? 'Brouillon enregistré' : action === 'reject' ? 'Brouillon retiré du planning. Tu peux le restaurer dans Refusés.' : 'Brouillon restauré. Sa publication attend ta validation.')
    return { ok: true as const }
  }
  catch (error: any) {
    const message = (error?.statusCode === 409 || error?.status === 409)
      ? 'Ce brouillon a changé. Actualise le calendrier avant de réessayer.'
      : error?.data?.message || 'Enregistrement non confirmé. Actualise le calendrier avant de réessayer.'
    toast.error(message)
    return { ok: false as const, error: message }
  }
  finally { busyId.value = '' }
}
async function approve() {
  const post = confirmationPost.value
  if (!post || !confirmationAccepted.value) return
  busyId.value = post.id
  try {
    const scheduledAt = confirmationMode.value === 'scheduled' ? zurichLocalToIso(scheduleInput.value) : null
    if (confirmationMode.value === 'scheduled' && (!scheduledAt || Date.parse(scheduledAt) <= Date.now())) { toast.error(scheduleError.value || 'Choisis une date future valide.'); return }
    const request = socialApprovalRequest(confirmationMode.value, confirmationMode.value === 'scheduled')
    const result = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${post.id}/${request.action}`, {
      method: 'POST', headers: auth.authHeader(), body: {
        mode: confirmationMode.value,
        confirmation: request.confirmation,
        content: post.content,
        version: post.version,
        ...(scheduledAt ? { publish_after: scheduledAt } : {}),
      },
    })
    replacePost(result)
    closeConfirmation()
    plannedInput.value = isoToZurichLocal(editingPost.value?.planned_at || null)
    toast.success(confirmationMode.value === 'media' ? 'Texte et visuels validés pour publication manuelle.' : confirmationMode.value === 'text' ? 'Texte validé. Publication Instagram manuelle, sans programmation.' : confirmationMode.value === 'now'
      ? 'Texte et médias approuvés. Hermes les traitera lors de son prochain passage si la connexion est prête.'
      : 'Publication validée pour la date choisie.')
  }
  catch (error: any) { toast.error(error?.data?.message || 'La validation a échoué') }
  finally { busyId.value = '' }
}

const editingPost = ref<SocialPost | null>(null)
const plannedInput = ref('')
const scheduleInput = ref('')
watch(scheduleInput, () => { confirmationAccepted.value = false })
const editorCloseWarning = ref(false)
const hasTextChanges = computed(() => Boolean(editingPost.value && editingPost.value.content !== posts.value.find(post => post.id === editingPost.value!.id)?.content))
const hasDateChanges = computed(() => Boolean(editingPost.value && plannedInput.value !== isoToZurichLocal(editingPost.value.planned_at)))
async function syncFilterQuery() {
  try {
    let target: LocationQueryRaw
    do {
      if (!isCalendarActive()) return false
      target = filterQuery.value
      const failure = await router.replace({ path: calendarPath, query: target })
      if (isNavigationFailure(failure, NavigationFailureType.aborted | NavigationFailureType.cancelled)) return false
    } while (target !== filterQuery.value)
    return isCalendarActive()
  } catch {
    toast.error('Les filtres n’ont pas pu être conservés dans l’adresse.')
    return false
  } finally {
    filterNavigation = null
    if (isCalendarActive()) filterQuery.value = { ...route.query }
  }
}
function setFilterQuery(query: LocationQueryRaw) {
  if (!isCalendarActive()) return
  filterQuery.value = query
  if (!filterNavigation) filterNavigation = syncFilterQuery()
}
function setFilter(key: string, value: string) {
  setFilterQuery({ ...filterQuery.value, [key]: value || undefined })
}
function resetFilters() {
  setFilterQuery({ view: filters.value.view, date: filters.value.date })
}
function closeEditorNow() {
  if (editingPost.value) {
    delete dirtyMedia[editingPost.value.id]
    delete mixedEditing[editingPost.value.id]
  }
  editingPost.value = null; editorCloseWarning.value = false
  const query = { ...route.query }; delete query.postId
  void router.replace({ query })
}
function closeEditor() {
  if (busyId.value) return
  if (hasTextChanges.value || hasDateChanges.value || (editingPost.value && dirtyMedia[editingPost.value.id])) { editorCloseWarning.value = true; return }
  closeEditorNow()
}
const { dialogRef: editorDialogRef, handleDialogKeydown: handleEditorKeydown } = useAccessibleDialog(computed(() => Boolean(editingPost.value)), closeEditor, '[data-editor-close]')
async function openPost(post: SocialPost) {
  if (busyId.value || dragSource.value || Date.now() < dragClickGuardUntil || moveSource.value || removeSource.value) return
  if (filterNavigation && !await filterNavigation) return
  if (!isCalendarActive()) return
  await router.replace({ path: calendarPath, query: { ...route.query, postId: post.id } })
}
function selectPostFromUrl() {
  const id = typeof route.query.postId === 'string' ? route.query.postId : ''
  const post = posts.value.find(item => item.id === id)
  if (!post) { editingPost.value = null; return }
  if (editingPost.value?.id !== id) {
    editingPost.value = JSON.parse(JSON.stringify(post)) as SocialPost; plannedInput.value = isoToZurichLocal(post.planned_at)
    editorCloseWarning.value = false
  }
}
watch(() => route.query.postId, selectPostFromUrl)
function protectEditorChanges() {
  if (editingPost.value && (hasTextChanges.value || hasDateChanges.value || dirtyMedia[editingPost.value.id])) {
    editorCloseWarning.value = true
    return false
  }
}
onBeforeRouteLeave(() => {
  if (protectEditorChanges() === false) return false
  calendarDepartureEpoch++
  cancelDrag()
  dismissRemove()
})
onBeforeRouteUpdate((to, from) => {
  if (to.query.postId !== from.query.postId) return protectEditorChanges()
})
const filteredPosts = computed(() => posts.value.filter(post => matchesSocialCalendarFilters(post, filters.value)))
const scopePosts = computed(() => posts.value.filter(post => matchesSocialCalendarFilters(post, { ...filters.value, status: 'all' })))
const counts = computed(() => ({
  review: scopePosts.value.filter(post => ['draft', 'failed'].includes(post.status)).length,
  waiting: scopePosts.value.filter(post => ['approved', 'publishing'].includes(post.status)).length,
  failed: scopePosts.value.filter(post => post.status === 'failed').length,
}))
const rejectedCount = computed(() => scopePosts.value.filter(post => post.status === 'rejected').length)
const unplannedPosts = computed(() => filteredPosts.value.filter(post => filters.value.status === 'rejected'
  ? post.status === 'rejected'
  : post.status !== 'rejected' && !socialPostCalendarIso(post)))
const days = computed(() => filters.value.view === 'list' ? [] : calendarDays(filters.value.date, filters.value.view))
const periodCount = computed(() => filteredPosts.value.filter(post => {
  const iso = socialPostCalendarIso(post)
  if (!iso) return false
  const date = zurichDateKey(iso)
  return filters.value.view === 'month'
    ? date.slice(0, 7) === filters.value.date.slice(0, 7)
    : days.value.includes(date)
}).length)
const periodTitle = computed(() => {
  if (filters.value.view === 'list') return 'Toutes les publications'
  const date = new Date(`${filters.value.date}T12:00:00Z`)
  if (filters.value.view === 'month') return new Intl.DateTimeFormat('fr-CH', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(date)
  const format = new Intl.DateTimeFormat('fr-CH', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
  return days.value.length ? format.formatRange(new Date(`${days.value[0]}T12:00:00Z`), new Date(`${days.value.at(-1)}T12:00:00Z`)) : ''
})
function shiftPeriod(direction: number) {
  const date = new Date(`${filters.value.date}T12:00:00Z`)
  if (filters.value.view === 'month') { date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + direction) }
  else date.setUTCDate(date.getUTCDate() + direction * 7)
  setFilter('date', date.toISOString().slice(0, 10))
}
function futureDefault(post: SocialPost) {
  if (post.planned_at && Date.parse(post.planned_at) > Date.now()) return isoToZurichLocal(post.planned_at)
  const local = isoToZurichLocal(new Date().toISOString()), today = `${local.slice(0, 10)}T18:00`
  if (local < today) return today
  const tomorrow = new Date(`${local.slice(0, 10)}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return `${tomorrow.toISOString().slice(0, 10)}T18:00`
}
const scheduleError = computed(() => {
  if (confirmationMode.value !== 'scheduled') return ''
  const iso = zurichLocalToIso(scheduleInput.value)
  if (!iso) return 'Choisis une date et une heure suisses valides. Les heures ambiguës au changement d’heure sont à éviter.'
  return Date.parse(iso) <= Date.now() ? 'La publication doit être prévue dans le futur.' : ''
})
async function savePlannedDate(post: SocialPost) {
  const iso = plannedInput.value ? zurichLocalToIso(plannedInput.value) : null
  if (plannedInput.value && !iso) { toast.error('Date ou heure suisse invalide ou ambiguë. Choisis un autre horaire.'); return }
  busyId.value = post.id
  try {
    const result = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${post.id}`, {
      method: 'PUT', headers: auth.authHeader(), body: { action: 'plan', planned_at: iso, version: post.version },
    })
    replacePost(result, true); plannedInput.value = isoToZurichLocal(iso)
    toast.success('Date souhaitée enregistrée. La publication attend toujours ton accord.')
  } catch (error: any) { toast.error(error?.data?.message || 'La date n’a pas pu être enregistrée.') }
  finally { busyId.value = '' }
}

type MoveSource = { id: string, version: number }
const dragSource = ref<MoveSource | null>(null)
const moveSource = ref<MoveSource | null>(null)
const moveDate = ref('')
const moveError = ref('')
const removeSource = ref<SocialPost | null>(null)
const removeError = ref('')
let removeTrigger: HTMLElement | null = null
const calendarMoveStatus = ref('')
const unplannedHovered = ref(false)
let dragClickGuardUntil = 0
const movePost = computed(() => posts.value.find(post => post.id === moveSource.value?.id))
const movesDisabled = computed(() => Boolean(loading.value || busyId.value || editingPost.value || confirmationPost.value || moveSource.value || removeSource.value))
const moveHour = computed(() => isoToZurichLocal(movePost.value?.planned_at || null).slice(11, 16) || '18:00')
function cancelDrag() {
  if (dragSource.value) { dragClickGuardUntil = Date.now() + 250; calendarMoveStatus.value = 'Déplacement annulé. La date souhaitée est inchangée.' }
  dragSource.value = null; unplannedHovered.value = false
}
function beginDrag(post: SocialPost, event: DragEvent) {
  const current = posts.value.find(item => item.id === post.id)
  if (movesDisabled.value || !current || !canMoveSocialPost(current) || !event.dataTransfer) { event.preventDefault(); return }
  dragSource.value = { id: current.id, version: current.version }
  event.dataTransfer.setData(SOCIAL_CALENDAR_DRAG_TYPE, current.id)
  event.dataTransfer.effectAllowed = 'move'
  calendarMoveStatus.value = 'Dépose le brouillon sur un jour ou dans À planifier. Échap annule le déplacement.'
}
function acceptsUnplannedDrop(event: DragEvent) {
  return Boolean(dragSource.value && !movesDisabled.value && event.dataTransfer?.types.includes(SOCIAL_CALENDAR_DRAG_TYPE))
}
function unplannedDragOver(event: DragEvent) {
  if (!acceptsUnplannedDrop(event)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  unplannedHovered.value = true
}
function unplannedDragLeave(event: DragEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) unplannedHovered.value = false
}
function dropUnplanned(event: DragEvent) {
  if (!acceptsUnplannedDrop(event)) return
  event.preventDefault(); event.stopPropagation()
  void dropOnDate(null)
}
async function dropOnDate(targetDate: string | null) {
  const source = dragSource.value
  cancelDrag()
  if (source) await persistMove(source, targetDate)
}
function closeMove() {
  if (busyId.value) return
  moveSource.value = null; moveError.value = ''
}
const { dialogRef: moveDialogRef, handleDialogKeydown: handleMoveKeydown } = useAccessibleDialog(computed(() => Boolean(moveSource.value)), closeMove, '[data-move-date]')
function openMove(post: SocialPost) {
  const current = posts.value.find(item => item.id === post.id)
  if (movesDisabled.value || !current || !canMoveSocialPost(current)) return
  cancelDrag()
  moveSource.value = { id: current.id, version: current.version }
  moveDate.value = isoToZurichLocal(current.planned_at).slice(0, 10) || filters.value.date
  moveError.value = ''
}
async function persistMove(source: MoveSource, targetDate: string | null) {
  if (busyId.value || loading.value || editingPost.value || confirmationPost.value || removeSource.value || !isCalendarActive()) return
  const current = posts.value.find(post => post.id === source.id)
  if (!current || current.version !== source.version || !canMoveSocialPost(current)) {
    moveError.value = 'Ce brouillon a changé. Actualise le calendrier avant de le déplacer.'
    toast.error(moveError.value); calendarMoveStatus.value = moveError.value
    return
  }
  const result = resolveSocialPostMove(current, targetDate)
  if (!result.ok) { moveError.value = result.error; toast.error(result.error); calendarMoveStatus.value = result.error; return }
  if (result.unchanged) { closeMove(); calendarMoveStatus.value = 'La date souhaitée est inchangée.'; return }
  busyId.value = source.id; moveError.value = ''
  const departureEpoch = calendarDepartureEpoch
  calendarMoveStatus.value = 'Enregistrement de la date souhaitée…'
  let succeeded = false
  try {
    const updated = await $fetch<Partial<SocialPost> & { id: string }>(`/api/admin/social-posts/${source.id}`, {
      method: 'PUT', headers: auth.authHeader(), body: { action: 'plan', planned_at: result.plannedAt, version: source.version },
    })
    replacePost(updated, true)
    calendarMoveStatus.value = result.plannedAt
      ? `Date souhaitée enregistrée : ${new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', dateStyle: 'long', timeStyle: 'short' }).format(new Date(result.plannedAt))}. La publication attend ta validation.`
      : 'Brouillon remis dans À planifier. La publication attend ta validation.'
    toast.success(calendarMoveStatus.value)
    succeeded = true
  } catch (error: any) {
    moveError.value = (error?.statusCode === 409 || error?.status === 409)
      ? 'Ce brouillon a changé. Actualise le calendrier avant de le déplacer.'
      : error?.data?.message || 'Enregistrement non confirmé. Actualise le calendrier avant de réessayer.'
    calendarMoveStatus.value = moveError.value
    toast.error(moveError.value)
  } finally { busyId.value = '' }
  // A late save must never cancel a navigation already started elsewhere.
  if (succeeded && departureEpoch === calendarDepartureEpoch && isCalendarActive()) {
    const fromDialog = Boolean(moveSource.value)
    closeMove()
    const targetVisible = filters.value.view === 'list' || !targetDate || (filters.value.view === 'month'
      ? targetDate.slice(0, 7) === filters.value.date.slice(0, 7)
      : calendarDays(filters.value.date, 'week').includes(targetDate))
    if (!targetVisible && targetDate) {
      setFilter('date', targetDate)
      if (filterNavigation) await filterNavigation
    }
    if (fromDialog && departureEpoch === calendarDepartureEpoch && isCalendarActive()) {
      await nextTick()
      const card = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-social-post-id]')).find(element => element.dataset.socialPostId === source.id && element.getClientRects().length)
      ;(card || document.getElementById('social-calendar-move-help'))?.focus()
    }
  }
}
function confirmMove(targetDate: string | null) {
  if (moveSource.value) void persistMove({ ...moveSource.value }, targetDate)
}
function dismissRemove() {
  removeSource.value = null
  removeError.value = ''
  removeTrigger = null
}
function closeRemove() {
  if (busyId.value) return
  const trigger = removeTrigger
  const routePath = router.currentRoute.value.fullPath
  const departureEpoch = calendarDepartureEpoch
  dismissRemove()
  void restoreRemoveTrigger(trigger, routePath, departureEpoch)
}
async function restoreRemoveTrigger(trigger: HTMLElement | null, routePath: string, departureEpoch: number) {
  // The dialog helper also releases inert and restores its captured focus.
  // Wait for that cleanup and the disabled card buttons to render first.
  await nextTick()
  await nextTick()
  if (!isCalendarActive() || router.currentRoute.value.fullPath !== routePath || calendarDepartureEpoch !== departureEpoch
    || editingPost.value || confirmationPost.value || moveSource.value || removeSource.value
    || !trigger?.isConnected || trigger.matches(':disabled')) return
  trigger.focus({ preventScroll: true })
  trigger.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
const { dialogRef: removeDialogRef, handleDialogKeydown: handleRemoveKeydown } = useAccessibleDialog(computed(() => Boolean(removeSource.value)), closeRemove, '[data-remove-cancel]')
function openRemove(post: SocialPost, event?: MouseEvent) {
  if (movesDisabled.value || dragSource.value || Date.now() < dragClickGuardUntil || !isCalendarActive()) return
  const current = posts.value.find(item => item.id === post.id)
  if (!current || !canMoveSocialPost(current)) return
  // Capture synchronously: background buttons become disabled as soon as the
  // modal opens, which can otherwise make the browser drop their focus.
  removeTrigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : document.activeElement instanceof HTMLElement ? document.activeElement : null
  removeSource.value = { ...current }
  removeError.value = ''
}
async function focusPlanningAfterRemoval(departureEpoch: number) {
  await nextTick()
  if (departureEpoch !== calendarDepartureEpoch || !isCalendarActive()) return
  const nextCard = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-calendar-unplanned] [data-social-post-id]'))
    .find(element => !element.disabled && element.getClientRects().length)
  ;(nextCard || document.getElementById('social-calendar-summary'))?.focus()
}
async function confirmRemove() {
  const source = removeSource.value
  if (!source || busyId.value || loading.value || editingPost.value || confirmationPost.value || moveSource.value || dragSource.value || !isCalendarActive()) return
  const current = posts.value.find(post => post.id === source.id)
  if (!current || current.version !== source.version || !canMoveSocialPost(current)) {
    removeError.value = 'Ce brouillon a changé. Actualise le calendrier avant de le supprimer.'
    toast.error(removeError.value)
    return
  }
  const departureEpoch = calendarDepartureEpoch
  removeError.value = ''
  const result = await update(source, 'reject')
  if (!result.ok) {
    if (removeSource.value?.id === source.id) {
      removeError.value = result.error
      // Disabling the submit button during the request can move browser focus
      // to the body. Keep Escape and keyboard navigation inside the dialog.
      await nextTick()
      removeDialogRef.value?.querySelector<HTMLButtonElement>('[data-remove-cancel]')?.focus()
    }
    return
  }
  if (departureEpoch !== calendarDepartureEpoch || !isCalendarActive() || removeSource.value?.id !== source.id) return
  dismissRemove()
  calendarMoveStatus.value = 'Brouillon retiré du planning et conservé dans Refusés. Tu peux le restaurer à tout moment.'
  await focusPlanningAfterRemoval(departureEpoch)
}
async function restoreFromPanel(post: SocialPost) {
  if (movesDisabled.value || dragSource.value || Date.now() < dragClickGuardUntil || !isCalendarActive()) return
  const current = posts.value.find(item => item.id === post.id)
  if (!current || current.status !== 'rejected' || current.version !== post.version) {
    toast.error('Ce brouillon a changé. Actualise le calendrier avant de le restaurer.')
    return
  }
  const departureEpoch = calendarDepartureEpoch
  const result = await update({ ...current }, 'restore')
  if (!result.ok || departureEpoch !== calendarDepartureEpoch || !isCalendarActive()) return
  calendarMoveStatus.value = 'Brouillon restauré. Son texte, ses médias et sa date sont conservés ; sa publication attend ta validation.'
  await focusPlanningAfterRemoval(departureEpoch)
}
function cancelDragOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') cancelDrag() }
watch(() => route.fullPath, () => { cancelDrag(); dismissRemove(); if (!busyId.value) closeMove() })
watch([editingPost, confirmationPost], ([editor, confirmation]) => { if (editor || confirmation) { cancelDrag(); closeMove(); dismissRemove() } })
onMounted(() => { window.addEventListener('keydown', cancelDragOnEscape); window.addEventListener('blur', cancelDrag) })
onBeforeUnmount(() => { window.removeEventListener('keydown', cancelDragOnEscape); window.removeEventListener('blur', cancelDrag) })

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div class="flex items-center gap-3"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 ring-1 ring-inset ring-violet-200/60 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/20" aria-hidden="true"><AdminIcon icon="calendar" class="h-5 w-5" /></span><h1 class="font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Réseaux sociaux</h1></div><p class="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">Prépare ta semaine, adapte chaque post et valide sa publication. Toutes les dates sont en heure suisse.</p></div><div class="flex shrink-0 gap-2"><NuxtLink to="/admin/analytics" class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold dark:border-white/10"><AdminIcon icon="trending-up" class="h-4 w-4" aria-hidden="true" />Analyses</NuxtLink><button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold disabled:opacity-50 dark:border-white/10" :disabled="loading || Boolean(busyId)" @click="load"><AdminIcon icon="refresh-cw" class="h-4 w-4" aria-hidden="true" />{{ loading ? 'Chargement…' : 'Actualiser' }}</button></div></header>
    <details class="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#111118]"><summary class="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold">Connexions des réseaux <span class="ml-2 font-normal text-gray-500">{{ connections.filter(item => connection(item.platform).state === 'ready').length }} / 3 prêtes</span></summary><div class="grid gap-3 border-t border-gray-100 p-4 dark:border-white/10 sm:grid-cols-3"><div v-for="platform in (['linkedin', 'x', 'instagram'] as Platform[])" :key="platform" class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]"><div class="flex flex-wrap items-center justify-between gap-2"><AdminSocialPlatformBadge :platform="platform" /><span class="rounded-md px-2 py-1 text-xs font-medium" :class="connection(platform).state === 'ready' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300'">{{ connection(platform).state === 'ready' ? 'Prêt' : 'À vérifier' }}</span></div><p class="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{{ connection(platform).message }}</p></div></div></details>
    <section class="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#111118]" aria-label="Filtres du calendrier">
      <div class="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label class="min-w-[8rem] flex-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Réseau<span class="relative mt-1 block"><span class="pointer-events-none absolute inset-y-0 left-3 flex items-center" aria-hidden="true"><AdminIcon v-if="filters.platform === 'all'" icon="share-2" class="h-4 w-4 text-violet-600 dark:text-violet-300" /><AdminSocialPlatformIcon v-else :platform="filters.platform" compact /></span><select class="input-field w-full pl-11 text-sm" aria-label="Filtrer par réseau" :value="filters.platform" @change="setFilter('platform', ($event.target as HTMLSelectElement).value)"><option value="all">Tous les réseaux</option><option value="linkedin">LinkedIn</option><option value="instagram">Instagram</option><option value="x">X</option></select></span></label>
        <label class="min-w-[8rem] flex-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Statut<select class="input-field mt-1 w-full text-sm" aria-label="Filtrer par statut" :value="filters.status" @change="setFilter('status', ($event.target as HTMLSelectElement).value)"><option value="all">Tous les statuts</option><option value="review">À valider</option><option value="waiting">Validés / en cours</option><option value="published">Publiés</option><option value="failed">À corriger</option><option value="rejected">Refusés</option></select></label>
        <label class="min-w-[8rem] flex-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Format<select class="input-field mt-1 w-full text-sm" aria-label="Filtrer par format" :value="filters.format" @change="setFilter('format', ($event.target as HTMLSelectElement).value)"><option value="all">Tous les formats</option><option value="text">Texte</option><option value="image">Image</option><option value="carousel">Carrousel</option><option value="video">Vidéo</option><option value="document">PDF LinkedIn</option></select></label>
        <label class="min-w-[12rem] flex-[1.5] text-xs font-semibold text-gray-500 dark:text-gray-400">Recherche<input type="search" class="input-field mt-1 w-full text-sm" aria-label="Rechercher une publication" placeholder="Un projet, un sujet…" :value="filters.search" @input="setFilter('search', ($event.target as HTMLInputElement).value)"></label>
      </div>
      <div class="flex flex-wrap gap-2 border-t border-gray-100 pt-3 text-xs dark:border-white/10"><button type="button" class="min-h-11 rounded-lg px-3 font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10" @click="setFilter('status', 'review')">À valider · {{ counts.review }}</button><button type="button" class="min-h-11 rounded-lg px-3 font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10" @click="setFilter('status', 'waiting')">Validés / en cours · {{ counts.waiting }}</button><button type="button" class="min-h-11 rounded-lg px-3 font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" @click="setFilter('status', 'failed')">À corriger · {{ counts.failed }}</button><button type="button" class="ml-auto min-h-11 rounded-lg px-3 text-gray-500" @click="resetFilters">Réinitialiser les filtres</button></div>
    </section>
    <div v-if="loading" role="status" class="admin-card grid min-h-52 place-items-center"><p class="text-sm text-gray-500">Chargement de l’historique complet…</p></div>
    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900"><p class="font-semibold">{{ loadError }}</p><button type="button" class="mt-3 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="load">Réessayer</button></div>
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3"><div class="flex flex-wrap items-center gap-2"><template v-if="filters.view !== 'list'"><button type="button" class="min-h-11 min-w-11 rounded-lg border border-gray-200 dark:border-white/10" aria-label="Période précédente" @click="shiftPeriod(-1)">←</button><button type="button" class="min-h-11 rounded-lg border border-gray-200 px-3 text-sm font-semibold dark:border-white/10" @click="setFilter('date', zurichDateKey(new Date().toISOString()))">Aujourd’hui</button><button type="button" class="min-h-11 min-w-11 rounded-lg border border-gray-200 dark:border-white/10" aria-label="Période suivante" @click="shiftPeriod(1)">→</button></template><h2 class="ml-1 font-display text-lg font-semibold capitalize">{{ periodTitle }}</h2></div><div class="flex flex-wrap items-center gap-2"><input v-if="filters.view !== 'list'" type="date" aria-label="Date du calendrier" :value="filters.date" class="input-field min-w-0 text-sm" @change="setFilter('date', ($event.target as HTMLInputElement).value)"><select aria-label="Vue du calendrier" :value="filters.view" class="input-field text-sm" @change="setFilter('view', ($event.target as HTMLSelectElement).value)"><option value="week">Semaine</option><option value="month">Mois</option><option value="list">Liste</option></select></div></div>
      <p id="social-calendar-summary" role="status" tabindex="-1" class="text-xs text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-gray-400">{{ filteredPosts.length }} publication{{ filteredPosts.length > 1 ? 's' : '' }} selon les filtres<span v-if="filters.view !== 'list'"> · {{ periodCount }} sur cette période · {{ unplannedPosts.length }} {{ filters.status === 'rejected' ? 'refusés conservés' : 'sans date à planifier' }}</span></p>
      <div v-if="!filteredPosts.length" class="admin-card admin-empty-state"><p class="admin-empty-title">Aucune publication pour ces filtres</p><p class="admin-empty-body">Modifie les filtres ou attends les prochains brouillons préparés par Hermes.</p></div>
      <template v-else>
      <p id="social-calendar-move-help" role="status" aria-live="polite" tabindex="-1" class="rounded-lg bg-violet-50 px-4 py-3 text-xs leading-5 text-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:bg-violet-500/[0.07] dark:text-violet-200">{{ calendarMoveStatus || 'Glisse un brouillon sur un jour, ou utilise Déplacer sur mobile et au clavier. La date souhaitée n’autorise aucun envoi.' }}</p>
      <div v-if="filters.view === 'list'" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><AdminSocialPostTile v-for="post in filteredPosts" :key="post.id" :post="post" :movable="canMoveSocialPost(post)" :move-disabled="movesDisabled" :dragging="dragSource?.id === post.id" @open="openPost" @move="openMove" @drag-start="beginDrag" @drag-end="cancelDrag" /></div>
      <div v-else class="grid min-w-0 items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="min-w-0">
          <AdminSocialEditorialCalendar :posts="filteredPosts" :anchor="filters.date" :view="filters.view" :dragging-id="dragSource?.id" :move-disabled="movesDisabled" @open="openPost" @move="openMove" @drag-start="beginDrag" @drag-end="cancelDrag" @drop="dropOnDate" />
          <p v-if="!periodCount" class="mt-4 text-sm text-gray-500">Aucune publication datée sur cette période. Les brouillons sans date sont dans « À planifier ».</p>
        </div>
        <AdminSocialPlanningPanel
          :posts="unplannedPosts"
          :rejected-count="rejectedCount"
          :show-rejected="filters.status === 'rejected'"
          :move-disabled="movesDisabled"
          :dragging-id="dragSource?.id"
          :hovered="unplannedHovered"
          @open="openPost"
          @move="openMove"
          @remove="openRemove"
          @restore="restoreFromPanel"
          @show-rejected="setFilter('status', 'rejected')"
          @show-active="setFilter('status', 'all')"
          @drag-start="beginDrag"
          @drag-end="cancelDrag"
          @dragover="unplannedDragOver"
          @dragleave="unplannedDragLeave"
          @drop="dropUnplanned"
        />
      </div>
      </template>
    </template>
    <Teleport to="body">
      <div v-if="removeSource" class="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <section ref="removeDialogRef" role="dialog" aria-modal="true" aria-label="Supprimer ce brouillon ?" aria-describedby="social-remove-description" tabindex="-1" class="w-full max-w-md space-y-5 rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#111118] sm:p-6" @keydown="handleRemoveKeydown">
          <h2 class="font-display text-xl font-semibold text-gray-950 dark:text-white">Supprimer ce brouillon ?</h2>
          <div class="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <AdminSocialPlatformBadge :platform="removeSource.platform" compact />
            <p class="break-words text-sm font-semibold">{{ removeSource.article_title }}</p>
          </div>
          <p id="social-remove-description" class="text-sm leading-6 text-gray-600 dark:text-gray-300">Il sera retiré du planning et conservé dans <strong>Refusés</strong>. Son texte et ses médias restent disponibles : tu pourras le restaurer à tout moment.</p>
          <p v-if="removeError" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">{{ removeError }}</p>
          <div class="flex flex-wrap gap-3">
            <button data-remove-cancel type="button" class="min-h-11 flex-1 rounded-lg border border-gray-200 px-4 text-sm font-semibold disabled:opacity-50 dark:border-white/10" :disabled="Boolean(busyId)" @click="closeRemove">Annuler</button>
            <button type="button" class="min-h-11 flex-1 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" :disabled="Boolean(busyId)" @click="confirmRemove">{{ busyId ? 'Suppression…' : 'Supprimer le brouillon' }}</button>
          </div>
        </section>
      </div>
      <div v-if="moveSource" class="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <form ref="moveDialogRef" role="dialog" aria-modal="true" aria-label="Déplacer le brouillon" aria-describedby="social-move-description" tabindex="-1" class="w-full max-w-md space-y-5 rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#111118] sm:p-6" @keydown="handleMoveKeydown" @submit.prevent="confirmMove(moveDate)">
          <div class="flex items-center justify-between gap-3"><h2 class="font-display text-lg font-semibold">Déplacer le brouillon</h2><button type="button" aria-label="Annuler" class="min-h-11 min-w-11 rounded-lg border border-gray-200 text-xl disabled:opacity-50 dark:border-white/10" :disabled="Boolean(busyId)" @click="closeMove">×</button></div>
          <AdminSocialPlatformBadge v-if="movePost" :platform="movePost.platform" compact />
          <p class="break-words text-sm font-semibold">{{ movePost?.article_title }}</p>
          <div><label for="social-move-date" class="mb-2 block text-sm font-semibold">Nouvelle date souhaitée</label><input id="social-move-date" v-model="moveDate" data-move-date type="date" required class="input-field w-full min-w-0" :disabled="Boolean(busyId)"></div>
          <p id="social-move-description" class="text-sm leading-6 text-gray-600 dark:text-gray-300">Heure suisse conservée : <strong>{{ moveHour }}</strong>. Ce déplacement change uniquement la date souhaitée. La publication attend toujours ta validation.</p>
          <p v-if="moveError" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">{{ moveError }}</p>
          <div class="flex flex-wrap gap-2"><button type="submit" class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50" :disabled="Boolean(busyId) || !isSocialDateKey(moveDate)">{{ busyId ? 'Enregistrement…' : 'Déplacer le brouillon' }}</button><button type="button" class="min-h-11 rounded-lg border border-gray-200 px-3 text-sm font-semibold disabled:opacity-50 dark:border-white/10" :disabled="Boolean(busyId) || !movePost?.planned_at" @click="confirmMove(null)">Retirer du calendrier</button></div>
        </form>
      </div>
      <div v-if="editingPost" class="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-5">
        <section ref="editorDialogRef" role="dialog" aria-modal="true" :aria-label="`Publication ${platformLabel(editingPost.platform)}`" tabindex="-1" class="flex max-h-[96dvh] w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#111118]" @keydown="handleEditorKeydown">
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/10 sm:px-6"><p class="inline-flex items-center gap-3 font-display text-lg font-semibold"><AdminSocialPlatformIcon :platform="editingPost.platform" />Publication {{ platformLabel(editingPost.platform) }}</p><button data-editor-close type="button" aria-label="Fermer la publication" class="min-h-11 min-w-11 rounded-lg border border-gray-200 text-xl dark:border-white/10" :disabled="Boolean(busyId)" @click="closeEditor">×</button></div>
          <div class="min-h-0 overflow-y-auto p-4 sm:p-6"><div v-if="editorCloseWarning" role="alert" class="mb-5 space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"><p>Des modifications ne sont pas enregistrées.</p><div class="flex flex-wrap gap-2"><button type="button" class="min-h-11 rounded-lg border border-amber-400 px-3 text-sm font-semibold" @click="editorCloseWarning = false">Continuer la modification</button><button type="button" class="min-h-11 rounded-lg px-3 text-sm font-semibold" @click="closeEditorNow">Fermer sans enregistrer</button></div></div>
            <template v-for="post in editingPost ? [editingPost] : []" :key="post.id"><div class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)]"><article class="flex min-w-0 flex-col">
        <div class="flex items-start justify-between gap-3"><div><div class="flex flex-wrap items-center gap-2"><AdminSocialPlatformBadge :platform="post.platform" compact /><span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/[0.07] dark:text-gray-300">{{ statusLabel(post.status) }}</span></div><h2 class="mt-2 font-display text-lg font-semibold text-gray-950 dark:text-white">{{ post.article_title }}</h2></div><span class="text-xs tabular-nums" :class="characterCount(post.content) > limit(post.platform) ? 'text-red-600' : 'text-gray-400'">{{ characterCount(post.content) }}/{{ limit(post.platform) }}</span></div>
        <a :href="post.article_url" target="_blank" rel="noopener noreferrer" class="mt-2 truncate text-xs font-medium text-violet-600 hover:underline dark:text-violet-300">Voir le lien associé ↗</a>
        <p v-if="post.platform === 'instagram' && !hasMedia(post)" class="mt-3 text-xs text-gray-500 dark:text-gray-400">Ajoute les images et vidéos au brouillon pour relire l’ensemble ici. Sans média joint, seule la validation du texte est disponible, sans envoi ni programmation. <a v-if="post.studioContentId" :href="`http://127.0.0.1:3108/?hermesContent=${post.studioContentId}`" target="_blank" rel="noopener noreferrer" class="text-violet-600 underline dark:text-violet-300">Ouvrir dans le studio sur ce Mac ↗</a></p>
        <a v-if="hasDocument(post)" :href="post.media_url!" target="_blank" rel="noopener noreferrer" class="mt-4 rounded-lg border border-violet-200 p-4 text-sm font-semibold text-violet-700 dark:border-violet-400/20 dark:text-violet-200">PDF joint : {{ post.media_title || 'Carrousel LinkedIn' }} ↗</a>
        <AdminSocialMediaGallery v-if="!hasDocument(post) && usesMixedGallery(post)" :media="post.media_items" :legacy-images="post.media_images" :editable="['draft', 'failed'].includes(post.status)" :busy="busyId === post.id" @save="saveMedia(post, $event)" @dirty="dirtyMedia[post.id] = $event" />
        <AdminSocialImageGallery v-else-if="!hasDocument(post)" :images="post.media_images || []" :platform="post.platform" :editable="['draft', 'failed'].includes(post.status)" :busy="busyId === post.id" @save="saveImages(post, $event)" @dirty="dirtyMedia[post.id] = $event" />
        <button v-if="post.platform === 'instagram' && !usesMixedGallery(post) && ['draft', 'failed'].includes(post.status)" type="button" class="mt-2 min-h-11 self-start text-sm font-semibold text-violet-700 underline dark:text-violet-300" :disabled="busyId === post.id || dirtyMedia[post.id]" @click="mixedEditing[post.id] = true">Créer un carrousel avec cette image</button>
        <p v-if="dirtyMedia[post.id]" role="status" class="mt-2 text-sm text-amber-700">Enregistre les médias avant de valider.</p>
        <textarea v-if="['draft', 'failed'].includes(post.status)" v-model="post.content" rows="9" class="input-field mt-4 resize-y text-sm leading-6" :maxlength="post.platform === 'instagram' ? 4400 : limit(post.platform)" :aria-label="`Texte ${platformLabel(post.platform)}`" />
        <div v-else class="mt-4 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700 dark:bg-white/[0.04] dark:text-gray-200">{{ post.content }}</div>
        <p v-if="post.last_error" role="alert" class="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800 dark:bg-red-500/10 dark:text-red-200">{{ post.last_error }}</p>
        <section class="mt-5 space-y-3 rounded-xl border border-gray-200 p-4 dark:border-white/10" aria-label="Planification du brouillon">
<label :for="`planned-${post.id}`" class="block text-sm font-semibold">Date de publication souhaitée</label><input :id="`planned-${post.id}`" v-model="plannedInput" type="datetime-local" class="input-field w-full min-w-0 text-sm" :disabled="!['draft', 'failed'].includes(post.status) || busyId === post.id"><p class="text-xs leading-5 text-gray-500 dark:text-gray-400">Heure de Suisse · Europe/Zurich. Cette date organise ton calendrier et n’autorise aucun envoi.</p>
<div v-if="['draft', 'failed'].includes(post.status)" class="flex flex-wrap gap-2"><button type="button" class="min-h-11 rounded-lg border border-violet-300 px-3 text-sm font-semibold text-violet-700 disabled:opacity-50 dark:border-violet-400/30 dark:text-violet-200" :disabled="busyId === post.id || dirtyMedia[post.id]" @click="savePlannedDate(post)">Enregistrer la date</button><button v-if="plannedInput" type="button" class="min-h-11 rounded-lg px-3 text-sm text-gray-600 dark:text-gray-300" :disabled="busyId === post.id" @click="plannedInput = ''">Retirer la date</button></div><p v-else-if="post.status === 'approved'" class="text-xs text-gray-500">Annule d’abord la validation pour modifier cette date ou le contenu.</p><p v-if="post.publication_mode === 'automatic' && post.publish_after" class="text-sm font-medium text-violet-700 dark:text-violet-300">Envoi autorisé à partir du {{ publicationTime(post) }}.</p></section><div class="mt-auto flex flex-wrap gap-2 pt-4">
          <template v-if="['draft', 'failed'].includes(post.status)"><button class="min-h-11 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-[background-color,transform] duration-150 hover:bg-gray-50 active:scale-[.96] disabled:opacity-50 dark:border-white/[0.1] dark:text-gray-200" :disabled="busyId === post.id" @click="update(post, 'save')">Enregistrer</button><button class="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 transition-[background-color,transform] duration-150 hover:bg-red-50 active:scale-[.96] disabled:opacity-50 dark:border-red-500/20 dark:text-red-300" :disabled="busyId === post.id" @click="update(post, 'reject')">Refuser</button><button v-if="post.platform !== 'instagram' || hasMedia(post)" class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-violet-700 active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-50" :disabled="busyId === post.id || dirtyMedia[post.id] || characterCount(post.content) > limit(post.platform)" @click="openConfirmation(post, 'scheduled')">Programmer</button><button v-if="post.platform !== 'instagram' || hasMedia(post)" class="min-h-11 rounded-lg border border-violet-300 px-4 text-sm font-semibold text-violet-700 transition-[background-color,transform] duration-150 hover:bg-violet-50 active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/30 dark:text-violet-200 dark:hover:bg-violet-500/10" :disabled="busyId === post.id || dirtyMedia[post.id] || characterCount(post.content) > limit(post.platform)" @click="openConfirmation(post, 'now')">Publier maintenant</button><button v-if="post.platform === 'instagram' && !hasMedia(post)" type="button" class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50" :disabled="busyId === post.id || dirtyMedia[post.id] || characterCount(post.content) > 2200" @click="openConfirmation(post, 'text')">Valider le texte</button></template>
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
          <button type="button" class="min-h-11 rounded-lg border border-violet-300 px-4 text-sm font-semibold text-violet-700 dark:text-violet-200" :disabled="busyId === post.id" @click="openConfirmation(post, 'scheduled')">Programmer</button>
        </div>
      </article><AdminSocialPostPreview :post="post" class="self-start lg:sticky lg:top-0" /></div></template>
          </div>
        </section>
      </div>
    </Teleport>
    <Teleport to="body">    <div v-if="confirmationPost" ref="dialogRef" class="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="social-confirm-title" tabindex="-1" @keydown="handleDialogKeydown">
      <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#15151e]"><h2 id="social-confirm-title" class="font-display text-xl font-semibold text-gray-950 dark:text-white">{{ confirmationMode === 'media' ? 'Valider le texte et les visuels' : confirmationMode === 'text' ? 'Valider le texte Instagram' : confirmationMode === 'now' ? 'Publier maintenant' : 'Programmer la publication' }}</h2><p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{{ confirmationMode === 'media' ? 'Tu valides le texte et les médias enregistrés, dans cet ordre. La publication reste manuelle, sans envoi ni programmation.' : confirmationMode === 'text' ? 'Ce texte sera marqué comme relu. Tu publieras toi-même le texte et la vidéo ; aucun envoi ni programmation ne sera lancé.' : confirmationMode === 'now' ? `Après ton accord explicite, Hermes tentera de publier ce texte avec ${mediaSummary(confirmationPost)} sur ${platformLabel(confirmationPost.platform)} lors de son prochain passage. La connexion doit être prête.` : `Après ton accord explicite, ce texte avec ${mediaSummary(confirmationPost)} restera en attente jusqu’au ${scheduleInput.replace('T', ' à ')}, heure de Suisse. Hermes publiera cet ensemble si la connexion est prête.` }}</p><div v-if="confirmationMode === 'scheduled'" class="mt-4 space-y-2"><label for="social-publish-date" class="text-sm font-semibold">Date et heure de publication</label><input id="social-publish-date" v-model="scheduleInput" type="datetime-local" class="input-field w-full min-w-0" aria-describedby="schedule-help"><p id="schedule-help" class="text-xs text-gray-500">Heure de Suisse · Europe/Zurich.</p><p v-if="scheduleError" role="status" class="text-sm text-red-700 dark:text-red-300">{{ scheduleError }}</p></div><div v-if="hasDocument(confirmationPost)" class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-400/20 dark:bg-violet-500/[0.08]"><div><p class="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-200">Carrousel inclus</p><p class="mt-1 text-sm font-semibold text-gray-950 dark:text-white">{{ confirmationPost.media_title }}</p></div><a :href="confirmationPost.media_url!" target="_blank" rel="noopener noreferrer" class="shrink-0 text-xs font-semibold text-violet-700 underline dark:text-violet-200">Relire le PDF ↗</a></div><AdminSocialMediaGallery v-if="confirmationPost.media_items?.length" :media="confirmationPost.media_items" :editable="false" /><AdminSocialImageGallery v-else-if="hasMedia(confirmationPost)" :images="confirmationPost.media_images" :platform="confirmationPost.platform" :editable="false" /><div class="mt-4 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm leading-6 dark:bg-white/[0.05]">{{ confirmationPost.content }}</div><label class="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-white/[0.1]"><input v-model="confirmationAccepted" type="checkbox" class="mt-1 h-4 w-4 accent-violet-600"><span class="text-sm text-gray-700 dark:text-gray-200">{{ confirmationMode === 'media' ? 'J’ai relu le texte et tous les visuels. Je publierai cet ensemble manuellement.' : confirmationMode === 'text' ? 'J’ai relu ce texte Instagram. Je conserve la publication manuelle de la vidéo et du texte.' : confirmationMode === 'now' ? 'J’ai relu ce texte et tous ses médias, et j’autorise leur publication publique dès le prochain passage de Hermes.' : `J’ai relu ce texte et tous ses médias, et j’autorise leur publication publique le ${scheduleInput.replace('T', ' à ')}, heure de Suisse.` }}</span></label><div class="mt-5 flex gap-3"><button data-confirm-close type="button" class="min-h-11 flex-1 rounded-lg border border-gray-200 px-4 text-sm font-semibold dark:border-white/[0.1]" @click="closeConfirmation">Annuler</button><button type="button" class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!confirmationAccepted || busyId === confirmationPost.id || (confirmationMode === 'scheduled' && Boolean(scheduleError))" @click="approve">{{ confirmationMode === 'media' ? 'Valider l’ensemble' : confirmationMode === 'text' ? 'Valider le texte' : confirmationMode === 'now' ? 'Publier maintenant' : 'Valider la programmation' }}</button></div></div>
    </div>
</Teleport>
  </div>
</template>
