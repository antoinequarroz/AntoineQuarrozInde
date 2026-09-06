<script setup lang="ts">
import type { Review } from '~/stores/reviews'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useReviewsStore()
const googleStore = useGoogleReviewsStore()
const toast = useToast()

const showForm = ref(false)
const closeForm = () => { showForm.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, closeForm, '[data-dialog-close]')
const editingReview = ref<Review | null>(null)
const loadError = ref('')
const submitting = ref(false)

const form = reactive({
  author: '',
  company: '',
  role: '',
  avatar: null as string | null,
  rating: 5,
  content: '',
  visible: true,
})

function openNew() {
  editingReview.value = null
  Object.assign(form, { author: '', company: '', role: '', avatar: null, rating: 5, content: '', visible: true })
  showForm.value = true
}

function openEdit(review: Review) {
  editingReview.value = review
  Object.assign(form, { ...review })
  showForm.value = true
}

async function loadReviews(force = false) {
  loadError.value = ''
  try { await store.ensureLoaded(force) }
  catch { loadError.value = 'Les avis ne peuvent pas être chargés. Réessaie dans quelques instants.' }
}

onMounted(() => {
  // Refresh with the authenticated header even if the public landing already
  // primed this shared store in the same browser session.
  void loadReviews(true)
  void googleStore.ensureLoaded()
})

async function refreshGoogleReviews() {
  await googleStore.ensureLoaded(true)
  if (googleStore.configured && !googleStore.unavailable) toast.success('Connexion Google Reviews vérifiée')
  else if (googleStore.unavailable) toast.error('Google Reviews est temporairement indisponible ou mal configuré')
  else toast.error('Ajoute GOOGLE_PLACES_API_KEY et GOOGLE_PLACE_ID sur le serveur')
}

async function handleSubmit() {
  submitting.value = true
  try {
    if (editingReview.value) {
      await store.update(editingReview.value.id, { ...form })
      toast.success('Avis mis à jour')
    }
    else {
      await store.add({ ...form })
      toast.success('Avis ajouté')
    }
    showForm.value = false
  }
  catch {
    toast.error('L’avis n’a pas pu être enregistré')
  }
  finally { submitting.value = false }
}

async function toggleVisibility(id: number) {
  try { await store.toggleVisibility(id) }
  catch { toast.error('La visibilité de l’avis n’a pas pu être modifiée') }
}

async function handleDelete(id: number) {
  if (confirm('Supprimer cet avis ?')) {
    try {
      await store.remove(id)
      toast.success('Avis supprimé')
    }
    catch {
      toast.error('Erreur lors de la suppression')
    }
  }
}
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Avis clients</span>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Avis clients</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ store.reviews.length }} avis · note moy. {{ store.avgRating.toFixed(1) }}/5 · {{ store.visible.length }} visibles</p>
        </div>
        <button
          class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 text-sm font-semibold text-white shadow-glow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          @click="openNew"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Ajouter
        </button>
      </div>
    </section>

    <section class="rounded-xl border border-cyan-500/15 bg-white p-4 shadow-sm dark:border-cyan-300/10 dark:bg-[#111118] sm:p-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-display text-base font-semibold text-gray-950 dark:text-white">Google Reviews</h2>
            <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="googleStore.unavailable ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200' : googleStore.configured ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-300'">
              {{ googleStore.unavailable ? 'Connexion à vérifier' : googleStore.configured ? 'Connecté' : 'En attente de configuration' }}
            </span>
          </div>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Les avis manuels restent inchangés. Quand la connexion sera active, Google affichera en direct jusqu’à 5 avis classés par pertinence, avec leurs liens et attributions obligatoires. Ils ne sont pas copiés dans ta base.
          </p>
          <p v-if="googleStore.configured && !googleStore.unavailable" class="mt-2 text-xs text-cyan-700 dark:text-cyan-300">{{ googleStore.placeName }} · {{ googleStore.rating.toFixed(1) }}/5 · {{ googleStore.userRatingCount }} avis Google</p>
          <p v-else-if="googleStore.unavailable" class="mt-2 text-xs text-amber-800 dark:text-amber-200">La connexion n’a pas pu être validée. Vérifie la clé, l’identifiant du lieu et les autorisations Google Places.</p>
        </div>
        <button type="button" class="min-h-11 shrink-0 rounded-lg border border-cyan-500/20 px-4 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-500/10" :disabled="googleStore.loading" @click="refreshGoogleReviews">
          {{ googleStore.loading ? 'Vérification…' : 'Vérifier la connexion' }}
        </button>
      </div>
    </section>

    <!-- Modal -->
    <Transition name="modal">
      <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="review-form-title" tabindex="-1" @keydown="handleDialogKeydown">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
        <div class="admin-modal-panel relative my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111118]">

          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <h2 id="review-form-title" class="font-display font-semibold text-base text-gray-900 dark:text-white">
              {{ editingReview ? 'Modifier l\'avis' : 'Ajouter un avis' }}
            </h2>
            <button type="button" data-dialog-close aria-label="Fermer" class="w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all" @click="showForm = false">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <form class="px-6 py-5 space-y-4" @submit.prevent="handleSubmit">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="review-author" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nom *</label>
                <input id="review-author" v-model="form.author" type="text" class="input-field" placeholder="Marie Dupont" required autocomplete="name">
              </div>
              <div>
                <label for="review-company" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Entreprise</label>
                <input id="review-company" v-model="form.company" type="text" class="input-field" placeholder="Entreprise SA" autocomplete="organization">
              </div>
            </div>
            <div>
              <label for="review-role" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Rôle / Fonction</label>
              <input id="review-role" v-model="form.role" type="text" class="input-field" placeholder="Directeur, Gérant..." autocomplete="organization-title">
            </div>
            <div>
              <span id="review-rating-label" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Note</span>
              <div class="flex gap-1.5" role="group" aria-labelledby="review-rating-label">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  class="flex h-11 w-11 items-center justify-center text-2xl leading-none transition-transform hover:scale-110"
                  :class="n <= form.rating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'"
                  :aria-label="`${n} étoile${n > 1 ? 's' : ''}`"
                  :aria-pressed="n === form.rating"
                  @click="form.rating = n"
                >★</button>
              </div>
            </div>
            <div>
              <label for="review-content" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Témoignage *</label>
              <textarea id="review-content" v-model="form.content" rows="4" class="input-field resize-none" placeholder="Le témoignage du client..." required />
            </div>
            <div class="flex items-center gap-3">
              <button type="button" role="switch" :aria-checked="form.visible" aria-label="Visible sur le site" class="relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 before:absolute before:-inset-2.5 before:rounded-xl" :class="form.visible ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'" @click="form.visible = !form.visible">
                <span class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200" :class="form.visible ? 'translate-x-4' : 'translate-x-0'" />
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-300">Visible sur le site</span>
            </div>
            <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] flex gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
              <button type="submit" class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60" :disabled="submitting">
                {{ submitting ? 'Enregistrement…' : editingReview ? 'Enregistrer' : 'Ajouter' }}
              </button>
              <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-50 dark:border-white/[0.08] dark:hover:bg-white/[0.04]" @click="showForm = false">Annuler</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <div v-if="store.loading && !store.loaded" role="status" class="grid min-h-48 place-items-center rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]"><div class="text-center"><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement des avis…</p></div></div>
    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"><p class="font-semibold">Les avis sont indisponibles</p><p class="mt-1 text-sm">{{ loadError }}</p><button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="loadReviews(true)">Réessayer</button></div>

    <div v-if="!store.loading && !loadError" class="space-y-2 sm:hidden">
      <article v-for="review in store.reviews" :key="`mobile-${review.id}`" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111118]" :class="{ 'opacity-60': !review.visible }"><div class="flex items-start justify-between gap-3"><div><h2 class="font-semibold text-gray-900 dark:text-white">{{ review.author }}</h2><p class="mt-1 text-xs text-gray-500">{{ review.role }}{{ review.company ? ` · ${review.company}` : '' }}</p></div><span class="text-sm text-yellow-500" :aria-label="`${review.rating} étoiles sur 5`">{{ '★'.repeat(review.rating) }}</span></div><p class="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{{ review.content }}</p><div class="mt-3 grid grid-cols-3 gap-1 border-t border-gray-100 pt-3 dark:border-white/[0.06]"><button class="min-h-11 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10" @click="toggleVisibility(review.id)">{{ review.visible ? 'Masquer' : 'Afficher' }}</button><button class="min-h-11 rounded-lg text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10" @click="openEdit(review)">Modifier</button><button class="min-h-11 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" @click="handleDelete(review.id)">Supprimer</button></div></article>
      <AdminEmptyState v-if="!store.reviews.length" title="Aucun avis pour l’instant" body="Ajoute un témoignage vérifié pour le publier ensuite sur le site."><button class="mt-2 min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700" @click="openNew">Ajouter le premier</button></AdminEmptyState>
    </div>

    <div v-if="!store.loading && !loadError" class="admin-table-wrap hidden overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#111118] sm:block">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Client</th>
            <th class="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 sm:table-cell">Note</th>
            <th class="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 md:table-cell">Avis</th>
            <th class="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="review in store.reviews"
            :key="review.id"
            class="border-b border-gray-50 dark:border-white/[0.03] last:border-0 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
            :class="{ 'opacity-50': !review.visible }"
          >
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {{ review.author.charAt(0) }}
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ review.author }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-300">{{ review.role }}{{ review.company ? ` · ${review.company}` : '' }}</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-3.5 hidden sm:table-cell">
              <div class="flex gap-0.5">
                <span v-for="i in 5" :key="i" class="text-sm" :class="i <= review.rating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'">★</span>
              </div>
            </td>
            <td class="px-5 py-3.5 hidden md:table-cell">
              <p class="line-clamp-1 max-w-xs text-sm text-gray-600 dark:text-gray-300">{{ review.content }}</p>
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  class="flex h-11 w-11 items-center justify-center rounded-lg transition-all"
                  :class="review.visible
                    ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'
                    : 'text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/[0.04]'"
                  :title="review.visible ? 'Masquer' : 'Afficher'"
                  :aria-label="review.visible ? 'Masquer cet avis' : 'Afficher cet avis'"
                  @click="toggleVisibility(review.id)"
                >
                  <svg v-if="review.visible" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
                <button class="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10" aria-label="Modifier cet avis" @click="openEdit(review)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button class="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10" aria-label="Supprimer cet avis" @click="handleDelete(review.id)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <AdminEmptyState v-if="!store.reviews.length" title="Aucun avis pour l’instant" body="Ajoute un témoignage vérifié pour le publier ensuite sur le site."><button class="mt-2 min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700" @click="openNew">Ajouter le premier</button></AdminEmptyState>
    </div>

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
