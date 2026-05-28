<script setup lang="ts">
import type { Review } from '~/stores/reviews'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useReviewsStore()
const toast = useToast()

const showForm = ref(false)
const editingReview = ref<Review | null>(null)

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

onMounted(() => {
  store.ensureLoaded()
})

async function handleSubmit() {
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
    toast.error('Erreur lors de la sauvegarde')
  }
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
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="font-display font-semibold text-xl text-gray-900 dark:text-white">Avis clients</h1>
        <p class="text-sm text-gray-400 mt-0.5">{{ store.reviews.length }} avis · note moy. {{ store.avgRating.toFixed(1) }}/5 · {{ store.visible.length }} visibles</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
        @click="openNew"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Ajouter
      </button>
    </div>

    <!-- Modal -->
    <Transition name="modal">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
        <div class="admin-modal-panel relative w-full max-w-md bg-white dark:bg-[#111118] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/[0.08] my-4 overflow-y-auto">

          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <h2 class="font-display font-semibold text-base text-gray-900 dark:text-white">
              {{ editingReview ? 'Modifier l\'avis' : 'Ajouter un avis' }}
            </h2>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all" @click="showForm = false">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <form class="px-6 py-5 space-y-4" @submit.prevent="handleSubmit">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Nom *</label>
                <input v-model="form.author" type="text" class="input-field" placeholder="Marie Dupont" required>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Entreprise</label>
                <input v-model="form.company" type="text" class="input-field" placeholder="Entreprise SA">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Rôle / Fonction</label>
              <input v-model="form.role" type="text" class="input-field" placeholder="Directeur, Gérant...">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Note</label>
              <div class="flex gap-1.5">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  class="text-2xl leading-none transition-transform hover:scale-110"
                  :class="n <= form.rating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'"
                  @click="form.rating = n"
                >★</button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Témoignage *</label>
              <textarea v-model="form.content" rows="4" class="input-field resize-none" placeholder="Le témoignage du client..." required />
            </div>
            <div class="flex items-center gap-3">
              <button type="button" class="relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0" :class="form.visible ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'" @click="form.visible = !form.visible">
                <span class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200" :class="form.visible ? 'translate-x-4' : 'translate-x-0'" />
              </button>
              <label class="text-sm text-gray-600 dark:text-gray-300 cursor-pointer" @click="form.visible = !form.visible">Visible sur le site</label>
            </div>
            <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] flex gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
              <button type="submit" class="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                {{ editingReview ? 'Enregistrer' : 'Ajouter' }}
              </button>
              <button type="button" class="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] transition-all" @click="showForm = false">Annuler</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Table -->
    <div class="admin-table-wrap bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Client</th>
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden sm:table-cell">Note</th>
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden md:table-cell">Avis</th>
            <th class="text-right px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Actions</th>
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
                  <p class="text-xs text-gray-400">{{ review.role }}{{ review.company ? ` · ${review.company}` : '' }}</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-3.5 hidden sm:table-cell">
              <div class="flex gap-0.5">
                <span v-for="i in 5" :key="i" class="text-sm" :class="i <= review.rating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'">★</span>
              </div>
            </td>
            <td class="px-5 py-3.5 hidden md:table-cell">
              <p class="text-sm text-gray-400 line-clamp-1 max-w-xs">{{ review.content }}</p>
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  :class="review.visible
                    ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'
                    : 'text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-white/[0.04]'"
                  :title="review.visible ? 'Masquer' : 'Afficher'"
                  @click="store.toggleVisibility(review.id)"
                >
                  <svg v-if="review.visible" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all" @click="openEdit(review)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" @click="handleDelete(review.id)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!store.reviews.length" class="py-16 text-center">
        <p class="text-sm text-gray-400 mb-3">Aucun avis pour l'instant</p>
        <button class="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors" @click="openNew">+ Ajouter le premier</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
