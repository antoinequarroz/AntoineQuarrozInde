<script setup lang="ts">
import type { Article } from '~/stores/articles'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useArticlesStore()
const route = useRoute()
const toast = useToast()

const showForm = ref(route.query.new === '1')
const editingArticle = ref<Article | null>(null)
const previewMode = ref(false)

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: null as string | null,
  published: false,
  tags: '',
  readTime: 5,
})

function openNew() {
  editingArticle.value = null
  Object.assign(form, { title: '', slug: '', excerpt: '', content: '', coverImage: null, published: false, tags: '', readTime: 5 })
  previewMode.value = false
  showForm.value = true
}

function openEdit(article: Article) {
  editingArticle.value = article
  Object.assign(form, { ...article, tags: article.tags.join(', ') })
  previewMode.value = false
  showForm.value = true
}

onMounted(() => {
  store.ensureLoaded()
})

async function handleSubmit() {
  const data = {
    title: form.title,
    slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-'),
    excerpt: form.excerpt,
    content: form.content,
    coverImage: form.coverImage,
    published: form.published,
    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    readTime: form.readTime,
  }
  try {
    if (editingArticle.value) {
      await store.update(editingArticle.value.id, data)
      toast.success('Article mis à jour')
    }
    else {
      await store.add(data)
      toast.success('Article créé')
    }
    showForm.value = false
  }
  catch {
    toast.error('Erreur lors de la sauvegarde')
  }
}

async function handleDelete(id: number) {
  if (confirm('Supprimer cet article ?')) {
    try {
      await store.remove(id)
      toast.success('Article supprimé')
    }
    catch {
      toast.error('Erreur lors de la suppression')
    }
  }
}

function renderMarkdown(md: string): string {
  if (!md) return '<p class="text-gray-400 text-sm">Aucun contenu...</p>'
  return md
    .replace(/^### (.+)$/gm, '<h3 class="font-bold text-base mt-5 mb-2 text-gray-900 dark:text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-bold text-lg mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl mt-4 mb-4 text-gray-900 dark:text-white">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-mono">$1</code>')
    .replace(/\n\n/g, '</p><p class="mb-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">')
    .replace(/^(?!<)(.+)$/, '<p class="mb-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">$1</p>')
}
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="font-display font-semibold text-xl text-gray-900 dark:text-white">Articles</h1>
        <p class="text-sm text-gray-400 mt-0.5">{{ store.articles.length }} article(s) · {{ store.published.length }} publié(s)</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
        @click="openNew"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Nouvel article
      </button>
    </div>

    <!-- Modal -->
    <Transition name="modal">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
        <div class="admin-modal-panel relative w-full max-w-4xl bg-white dark:bg-[#111118] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/[0.08] my-4 overflow-y-auto">

          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <h2 class="font-display font-semibold text-base text-gray-900 dark:text-white">
              {{ editingArticle ? 'Modifier l\'article' : 'Nouvel article' }}
            </h2>
            <div class="flex items-center gap-2">
              <!-- Preview toggle -->
              <div class="flex items-center bg-gray-100 dark:bg-white/[0.06] rounded-lg p-0.5">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  :class="!previewMode ? 'bg-white dark:bg-[#1a1a24] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'"
                  @click="previewMode = false"
                >Édition</button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  :class="previewMode ? 'bg-white dark:bg-[#1a1a24] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'"
                  @click="previewMode = true"
                >Aperçu</button>
              </div>
              <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all" @click="showForm = false">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Split view -->
          <div class="flex min-h-0">

            <!-- Form (always visible) -->
            <form
              class="px-6 py-5 space-y-4 overflow-y-auto"
              :class="previewMode ? 'hidden md:block md:w-1/2 md:border-r border-gray-100 dark:border-white/[0.06]' : 'w-full'"
              @submit.prevent="handleSubmit"
            >
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Titre *</label>
                <input v-model="form.title" type="text" class="input-field" placeholder="Titre de l'article" required>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Résumé *</label>
                <textarea v-model="form.excerpt" rows="2" class="input-field resize-none" placeholder="Court résumé..." required />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Contenu Markdown *</label>
                <textarea v-model="form.content" rows="10" class="input-field resize-none font-mono text-xs leading-relaxed" placeholder="# Titre&#10;&#10;Votre contenu..." required />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Image de couverture</label>
                <UiAppImageUpload v-model="form.coverImage" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tags</label>
                  <input v-model="form.tags" type="text" class="input-field" placeholder="Vue 3, Web">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Temps de lecture (min)</label>
                  <input v-model.number="form.readTime" type="number" min="1" max="60" class="input-field">
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button type="button" class="relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0" :class="form.published ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'" @click="form.published = !form.published">
                  <span class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200" :class="form.published ? 'translate-x-4' : 'translate-x-0'" />
                </button>
                <label class="text-sm text-gray-600 dark:text-gray-300 cursor-pointer" @click="form.published = !form.published">Publié</label>
              </div>
              <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] flex gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                <button type="submit" class="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                  {{ editingArticle ? 'Enregistrer' : 'Créer' }}
                </button>
                <button type="button" class="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] transition-all" @click="showForm = false">Annuler</button>
              </div>
            </form>

            <!-- Preview panel -->
            <div
              v-if="previewMode"
              class="w-full md:w-1/2 px-6 py-5 overflow-y-auto max-h-[80vh]"
            >
              <div v-if="form.title || form.content">
                <div v-if="form.coverImage" class="w-full h-36 rounded-xl overflow-hidden mb-4">
                  <img :src="form.coverImage" class="w-full h-full object-cover" alt="">
                </div>
                <div class="flex flex-wrap gap-1 mb-3">
                  <span v-for="tag in form.tags.split(',').map(t => t.trim()).filter(Boolean)" :key="tag" class="text-xs bg-violet-50 dark:bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-md">{{ tag }}</span>
                </div>
                <h1 class="font-display font-bold text-xl text-gray-900 dark:text-white mb-2">{{ form.title || 'Titre...' }}</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">{{ form.excerpt }}</p>
                <hr class="border-gray-100 dark:border-white/[0.06] mb-4">
                <!-- eslint-disable vue/no-v-html -->
                <div v-html="renderMarkdown(form.content)" />
              </div>
              <div v-else class="flex items-center justify-center h-40 text-gray-300 dark:text-gray-600 text-sm">
                Commencez à écrire pour voir l'aperçu
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Mobile cards -->
    <div class="sm:hidden space-y-2">
      <div
        v-for="article in store.articles"
        :key="`mobile-${article.id}`"
        class="rounded-xl border p-3 bg-white dark:bg-[#111118] border-gray-100 dark:border-white/[0.06]"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
            <img v-if="article.coverImage" :src="article.coverImage" class="w-full h-full object-cover" alt="">
            <div v-else class="w-full h-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ article.title }}</p>
            <p class="text-xs text-gray-500">{{ article.readTime }} min</p>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap gap-1">
          <span
            class="text-xs font-semibold px-2 py-1 rounded-lg"
            :class="article.published ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-gray-50 text-gray-400 dark:bg-white/[0.04] dark:text-gray-500'"
          >{{ article.published ? 'Publie' : 'Brouillon' }}</span>
          <span v-for="tag in article.tags.slice(0, 2)" :key="`m-${article.id}-${tag}`" class="text-xs bg-violet-50 dark:bg-violet-500/10 text-violet-500 px-1.5 py-0.5 rounded-md">{{ tag }}</span>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <button class="text-xs text-violet-600" @click="openEdit(article)">Editer</button>
          <button class="text-xs text-red-500" @click="handleDelete(article.id)">Supprimer</button>
        </div>
      </div>
      <div v-if="!store.articles.length" class="py-10 text-center">
        <p class="text-sm text-gray-400 mb-3">Aucun article pour l'instant</p>
        <button class="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors" @click="openNew">+ Ecrire le premier</button>
      </div>
    </div>

    <!-- Table -->
    <div class="admin-table-wrap hidden sm:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Article</th>
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden sm:table-cell">Statut</th>
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden md:table-cell">Date</th>
            <th class="text-right px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="article in store.articles"
            :key="article.id"
            class="border-b border-gray-50 dark:border-white/[0.03] last:border-0 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
          >
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                  <img v-if="article.coverImage" :src="article.coverImage" class="w-full h-full object-cover" alt="">
                  <div v-else class="w-full h-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                    <svg class="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">{{ article.title }}</p>
                  <div class="flex gap-1 mt-1">
                    <span v-for="tag in article.tags.slice(0, 2)" :key="tag" class="text-xs bg-violet-50 dark:bg-violet-500/10 text-violet-500 px-1.5 py-0.5 rounded-md">{{ tag }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td class="px-5 py-3.5 hidden sm:table-cell">
              <span
                class="text-xs font-semibold px-2.5 py-1 rounded-lg"
                :class="article.published
                  ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                  : 'bg-gray-50 text-gray-400 dark:bg-white/[0.04] dark:text-gray-500'"
              >{{ article.published ? 'Publié' : 'Brouillon' }}</span>
            </td>
            <td class="px-5 py-3.5 hidden md:table-cell">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ article.createdAt }}</span>
              <span class="text-xs text-gray-300 dark:text-gray-600 mx-1.5">·</span>
              <span class="text-sm text-gray-400">{{ article.readTime }} min</span>
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all" @click="openEdit(article)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" @click="handleDelete(article.id)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!store.articles.length" class="py-16 text-center">
        <p class="text-sm text-gray-400 mb-3">Aucun article pour l'instant</p>
        <button class="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors" @click="openNew">+ Écrire le premier</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
