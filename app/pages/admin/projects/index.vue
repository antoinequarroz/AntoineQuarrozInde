<script setup lang="ts">
import type { Project } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useProjectsStore()
const route = useRoute()
const toast = useToast()

const showForm = ref(route.query.new === '1')
const editingProject = ref<Project | null>(null)

const form = reactive({
  title: '',
  slug: '',
  category: 'web' as Project['category'],
  tags: '',
  description: '',
  image: null as string | null,
  liveUrl: '',
  codeUrl: '',
  featured: false,
})

function openNew() {
  editingProject.value = null
  Object.assign(form, { title: '', slug: '', category: 'web', tags: '', description: '', image: null, liveUrl: '', codeUrl: '', featured: false })
  showForm.value = true
}

function openEdit(project: Project) {
  editingProject.value = project
  Object.assign(form, {
    title: project.title, slug: project.slug, category: project.category,
    tags: project.tags.join(', '), description: project.description, image: project.image,
    liveUrl: project.liveUrl || '', codeUrl: project.codeUrl || '', featured: project.featured,
  })
  showForm.value = true
}

onMounted(() => {
  store.ensureLoaded()
})

async function handleSubmit() {
  const data = {
    title: form.title,
    slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-'),
    category: form.category,
    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    description: form.description,
    image: form.image,
    liveUrl: form.liveUrl || null,
    codeUrl: form.codeUrl || null,
    featured: form.featured,
  }
  try {
    if (editingProject.value) {
      await store.update(editingProject.value.id, data)
      toast.success('Projet mis à jour')
    }
    else {
      await store.add(data)
      toast.success('Projet créé')
    }
    showForm.value = false
  }
  catch {
    toast.error('Erreur lors de la sauvegarde')
  }
}

async function handleDelete(id: number) {
  if (confirm('Supprimer ce projet ?')) {
    try {
      await store.remove(id)
      toast.success('Projet supprimé')
    }
    catch {
      toast.error('Erreur lors de la suppression')
    }
  }
}

const catColors: Record<string, string> = {
  web: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10',
  mobile: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-500/10',
  cms: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10',
}
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="font-display font-semibold text-xl text-gray-900 dark:text-white">Projets</h1>
        <p class="text-sm text-gray-400 mt-0.5">{{ store.projects.length }} projet(s) · {{ store.featured.length }} mis en avant</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
               bg-violet-600 hover:bg-violet-700 text-white transition-colors"
        @click="openNew"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Nouveau
      </button>
    </div>

    <!-- Form modal -->
    <Transition name="modal">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
        <div class="relative w-full max-w-xl bg-white dark:bg-[#111118] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/[0.08] my-4">

          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <h2 class="font-display font-semibold text-base text-gray-900 dark:text-white">
              {{ editingProject ? 'Modifier le projet' : 'Nouveau projet' }}
            </h2>
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-200 transition-all" @click="showForm = false">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <form class="px-6 py-5 space-y-4" @submit.prevent="handleSubmit">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Titre *</label>
                <input v-model="form.title" type="text" class="input-field" placeholder="Nom du projet" required>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Catégorie</label>
                <select v-model="form.category" class="input-field">
                  <option value="web">Web</option>
                  <option value="mobile">Mobile</option>
                  <option value="cms">CMS</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Description *</label>
              <textarea v-model="form.description" rows="2" class="input-field resize-none" placeholder="Description courte..." required />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Image de couverture</label>
              <UiAppImageUpload v-model="form.image" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Technologies</label>
                <input v-model="form.tags" type="text" class="input-field" placeholder="Vue 3, Nuxt, Tailwind">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">URL Live</label>
                <input v-model="form.liveUrl" type="url" class="input-field" placeholder="https://...">
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">URL GitHub</label>
              <input v-model="form.codeUrl" type="url" class="input-field" placeholder="https://github.com/...">
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                class="relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                :class="form.featured ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'"
                @click="form.featured = !form.featured"
              >
                <span class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200" :class="form.featured ? 'translate-x-4' : 'translate-x-0'" />
              </button>
              <label class="text-sm text-gray-600 dark:text-gray-300 cursor-pointer" @click="form.featured = !form.featured">Mettre en avant</label>
            </div>

            <div class="flex gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
              <button type="submit" class="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                {{ editingProject ? 'Enregistrer' : 'Créer' }}
              </button>
              <button type="button" class="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] transition-all" @click="showForm = false">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Table -->
    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Projet</th>
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden sm:table-cell">Catégorie</th>
            <th class="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden md:table-cell">Technologies</th>
            <th class="text-right px-5 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="project in store.projects"
            :key="project.id"
            class="border-b border-gray-50 dark:border-white/[0.03] last:border-0 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
          >
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                  <img v-if="project.image" :src="project.image" class="w-full h-full object-cover" alt="">
                  <div v-else class="w-full h-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                    <svg class="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">{{ project.title }}</p>
                  <p class="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-52">{{ project.description }}</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-3.5 hidden sm:table-cell">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-lg" :class="catColors[project.category]">{{ project.category }}</span>
              <span v-if="project.featured" class="ml-1.5 text-xs font-semibold px-2 py-1 rounded-lg bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">★</span>
            </td>
            <td class="px-5 py-3.5 hidden md:table-cell">
              <div class="flex flex-wrap gap-1">
                <span v-for="tag in project.tags.slice(0, 3)" :key="tag" class="text-xs bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{{ tag }}</span>
              </div>
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
                  @click="openEdit(project)"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  @click="handleDelete(project.id)"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!store.projects.length" class="py-16 text-center">
        <p class="text-sm text-gray-400 mb-3">Aucun projet pour l'instant</p>
        <button class="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors" @click="openNew">+ Créer le premier</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
