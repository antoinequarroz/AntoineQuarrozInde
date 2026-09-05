<script setup lang="ts">
import type { Article } from '~/stores/articles'
import { PUBLIC_SEO_IDENTITY } from '~~/shared/utils/publicSeoIdentity'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useArticlesStore()
const route = useRoute()
const toast = useToast()

const showForm = ref(route.query.new === '1')
const closeForm = () => { showForm.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, closeForm, '[data-dialog-close]')
const editingArticle = ref<Article | null>(null)
const previewMode = ref(false)
const loadError = ref('')
const submitting = ref(false)

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: null as string | null,
  published: false,
  authorKey: PUBLIC_SEO_IDENTITY.key,
  tags: '',
  readTime: 5,
})

function openNew() {
  editingArticle.value = null
  Object.assign(form, { title: '', slug: '', excerpt: '', content: '', coverImage: null, published: false, authorKey: PUBLIC_SEO_IDENTITY.key, tags: '', readTime: 5 })
  previewMode.value = false
  showForm.value = true
}

function openEdit(article: Article) {
  editingArticle.value = article
  Object.assign(form, { ...article, tags: article.tags.join(', ') })
  previewMode.value = false
  showForm.value = true
}

async function loadArticles(force = false) {
  loadError.value = ''
  try {
    await store.ensureLoaded(force)
  }
  catch {
    loadError.value = 'Les articles ne peuvent pas être chargés. Réessaie dans quelques instants.'
  }
}

onMounted(async () => {
  await loadArticles()
  const articleId = Number(route.query.editId || 0)
  const article = store.articles.find(item => item.id === articleId)
  if (article) openEdit(article)
})

async function handleSubmit() {
  const data = {
    title: form.title,
    slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-'),
    excerpt: form.excerpt,
    content: form.content,
    coverImage: form.coverImage,
    published: form.published,
    authorKey: form.authorKey,
    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    readTime: form.readTime,
  }
  submitting.value = true
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
    toast.error('L’article n’a pas pu être enregistré')
  }
  finally { submitting.value = false }
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character)
}

function renderMarkdown(md: string): string {
  if (!md) return '<p class="text-gray-400 text-sm">Aucun contenu...</p>'
  return escapeHtml(md)
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

    <section class="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Publication</span>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Articles</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ store.articles.length }} article{{ store.articles.length > 1 ? 's' : '' }} · {{ store.published.length }} publié{{ store.published.length > 1 ? 's' : '' }}</p>
        </div>
        <button class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2" @click="openNew">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          Nouvel article
        </button>
      </div>
    </section>

    <div v-if="store.loading && !store.loaded" role="status" class="grid min-h-56 place-items-center rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111118]"><div class="text-center"><div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement des articles…</p></div></div>
    <div v-else-if="loadError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"><p class="font-semibold">Les articles sont indisponibles</p><p class="mt-1 text-sm">{{ loadError }}</p><button type="button" class="mt-4 min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white" @click="loadArticles(true)">Réessayer</button></div>

    <!-- Modal -->
    <Transition name="modal">
      <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="article-form-title" tabindex="-1" @keydown="handleDialogKeydown">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
        <div class="admin-modal-panel relative my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111118]">

          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <h2 id="article-form-title" class="font-display font-semibold text-base text-gray-900 dark:text-white">
              {{ editingArticle ? 'Modifier l\'article' : 'Nouvel article' }}
            </h2>
            <div class="flex items-center gap-2">
              <!-- Preview toggle -->
              <div class="flex items-center bg-gray-100 dark:bg-white/[0.06] rounded-lg p-0.5">
                <button
                  type="button"
                  class="min-h-11 rounded-md px-3 text-xs font-medium transition-all"
                  :class="!previewMode ? 'bg-white dark:bg-[#1a1a24] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'"
                  @click="previewMode = false"
                >Édition</button>
                <button
                  type="button"
                  class="min-h-11 rounded-md px-3 text-xs font-medium transition-all"
                  :class="previewMode ? 'bg-white dark:bg-[#1a1a24] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'"
                  @click="previewMode = true"
                >Aperçu</button>
              </div>
              <button type="button" data-dialog-close aria-label="Fermer" class="w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all" @click="showForm = false">
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
                <label for="article-title" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Titre *</label>
                <input id="article-title" v-model="form.title" type="text" class="input-field" placeholder="Titre de l'article" required>
              </div>
              <div>
                <label for="article-excerpt" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Résumé *</label>
                <textarea id="article-excerpt" v-model="form.excerpt" rows="2" class="input-field resize-none" placeholder="Court résumé..." required />
              </div>
              <div>
                <label for="article-content" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Contenu Markdown *</label>
                <textarea id="article-content" v-model="form.content" rows="10" class="input-field resize-none font-mono text-xs leading-relaxed" placeholder="# Titre&#10;&#10;Votre contenu..." required />
              </div>
              <div>
                <p class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Image de couverture</p>
                <UiAppImageUpload v-model="form.coverImage" />
              </div>
              <div>
                <label for="article-author" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Auteur</label>
                <input id="article-author" :value="PUBLIC_SEO_IDENTITY.name" type="text" class="input-field" aria-describedby="article-author-hint" readonly>
                <p id="article-author-hint" class="mt-1.5 text-xs text-gray-400">Cet auteur apparaîtra sur l’article et renverra vers votre profil.</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="article-tags" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tags</label>
                  <input id="article-tags" v-model="form.tags" type="text" class="input-field" placeholder="Vue 3, Web">
                </div>
                <div>
                  <label for="article-read-time" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Temps de lecture (min)</label>
                  <input id="article-read-time" v-model.number="form.readTime" type="number" min="1" max="60" class="input-field">
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button type="button" role="switch" :aria-checked="form.published" aria-label="Publié" class="relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 before:absolute before:-inset-2.5 before:rounded-xl" :class="form.published ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'" @click="form.published = !form.published">
                  <span class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200" :class="form.published ? 'translate-x-4' : 'translate-x-0'" />
                </button>
                <span class="text-sm text-gray-600 dark:text-gray-300">Publié</span>
              </div>
              <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] flex gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                <button type="submit" class="min-h-11 flex-1 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60" :disabled="submitting">
                  {{ submitting ? 'Enregistrement…' : editingArticle ? 'Enregistrer' : 'Créer' }}
                </button>
                <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-50 dark:border-white/[0.08] dark:hover:bg-white/[0.04]" @click="showForm = false">Annuler</button>
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
    <div v-if="!store.loading && !loadError" class="space-y-2 sm:hidden">
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
            :class="article.published ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' : 'bg-gray-50 text-gray-600 dark:bg-white/[0.04] dark:text-gray-300'"
          >{{ article.published ? 'Publié' : 'Brouillon' }}</span>
          <span v-for="tag in article.tags.slice(0, 2)" :key="`m-${article.id}-${tag}`" class="text-xs bg-violet-50 dark:bg-violet-500/10 text-violet-500 px-1.5 py-0.5 rounded-md">{{ tag }}</span>
        </div>
        <div class="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-white/[0.06]">
          <button class="min-h-11 flex-1 rounded-lg text-sm font-semibold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10" @click="openEdit(article)">Modifier</button>
          <button class="min-h-11 flex-1 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" @click="handleDelete(article.id)">Supprimer</button>
        </div>
      </div>
      <AdminEmptyState v-if="!store.articles.length" title="Aucun article pour l’instant" body="Rédige un premier article et conserve-le en brouillon jusqu’à sa publication."><button class="mt-2 min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700" @click="openNew">Écrire le premier</button></AdminEmptyState>
    </div>

    <!-- Table -->
    <div v-if="!store.loading && !loadError" class="admin-table-wrap hidden overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#111118] sm:block">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Article</th>
            <th class="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 sm:table-cell">Statut</th>
            <th class="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 md:table-cell">Date</th>
            <th class="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Actions</th>
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
                  : 'bg-gray-50 text-gray-600 dark:bg-white/[0.04] dark:text-gray-300'"
              >{{ article.published ? 'Publié' : 'Brouillon' }}</span>
            </td>
            <td class="px-5 py-3.5 hidden md:table-cell">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ article.createdAt }}</span>
              <span class="text-xs text-gray-300 dark:text-gray-600 mx-1.5">·</span>
              <span class="text-sm text-gray-600 dark:text-gray-300">{{ article.readTime }} min</span>
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button class="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10" aria-label="Modifier l’article" @click="openEdit(article)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button class="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10" aria-label="Supprimer l’article" @click="handleDelete(article.id)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <AdminEmptyState v-if="!store.articles.length" title="Aucun article pour l’instant" body="Rédige un premier article et conserve-le en brouillon jusqu’à sa publication."><button class="mt-2 min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700" @click="openNew">Écrire le premier</button></AdminEmptyState>
    </div>

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
