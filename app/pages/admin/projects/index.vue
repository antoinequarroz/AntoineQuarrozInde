<script setup lang="ts">
import type { Project, ProjectResult } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useProjectsStore()
const clients = useClientsStore()
const route = useRoute()
const toast = useToast()

const showForm = ref(route.query.new === '1')
const closeForm = () => { showForm.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, closeForm, '[data-dialog-close]')
const editingProject = ref<Project | null>(null)

const form = reactive({
  title: '',
  slug: '',
  category: 'web' as Project['category'],
  tags: '',
  description: '',
  descriptionEn: '',
  descriptionDe: '',
  image: null as string | null,
  liveUrl: '',
  codeUrl: '',
  featured: false,
  clientId: null as number | null,
  caseStudyPublished: false,
  clientLabel: '',
  projectRole: '',
  projectDuration: '',
  completedAt: '',
  challenge: '',
  approach: '',
  solution: '',
  outcome: '',
  deliverables: '',
  galleryImages: [] as Array<string | null>,
  results: [] as ProjectResult[],
  seoTitle: '',
  seoDescription: '',
})

function openNew() {
  editingProject.value = null
  Object.assign(form, {
    title: '', slug: '', category: 'web', tags: '', description: '', descriptionEn: '', descriptionDe: '', image: null,
    liveUrl: '', codeUrl: '', featured: false, clientId: null,
    caseStudyPublished: false, clientLabel: '', projectRole: '', projectDuration: '',
    completedAt: '', challenge: '', approach: '', solution: '', outcome: '',
    deliverables: '', galleryImages: [], results: [], seoTitle: '', seoDescription: '',
  })
  showForm.value = true
}

function openEdit(project: Project) {
  editingProject.value = project
  Object.assign(form, {
    title: project.title, slug: project.slug, category: project.category,
    tags: project.tags.join(', '), description: project.description,
    descriptionEn: project.descriptionEn || '', descriptionDe: project.descriptionDe || '', image: project.image,
    liveUrl: project.liveUrl || '', codeUrl: project.codeUrl || '', featured: project.featured, clientId: project.clientId,
    caseStudyPublished: project.caseStudyPublished,
    clientLabel: project.clientLabel || '',
    projectRole: project.projectRole || '',
    projectDuration: project.projectDuration || '',
    completedAt: project.completedAt || '',
    challenge: project.challenge || '',
    approach: project.approach || '',
    solution: project.solution || '',
    outcome: project.outcome || '',
    deliverables: project.deliverables.join(', '),
    galleryImages: [...project.galleryImages],
    results: project.results.map(result => ({ ...result })),
    seoTitle: project.seoTitle || '',
    seoDescription: project.seoDescription || '',
  })
  showForm.value = true
}

onMounted(() => {
  store.ensureLoaded()
  clients.ensureLoaded()
  const clientId = Number(route.query.clientId || 0)
  if (clientId) form.clientId = clientId
})

async function handleSubmit() {
  if (!form.image) {
    toast.error('Ajoutez une image de couverture')
    return
  }

  const generatedSlug = form.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const data = {
    title: form.title,
    slug: form.slug || generatedSlug,
    category: form.category,
    tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    description: form.description,
    descriptionEn: form.descriptionEn || null,
    descriptionDe: form.descriptionDe || null,
    image: form.image,
    liveUrl: form.liveUrl || null,
    codeUrl: form.codeUrl || null,
    featured: form.featured,
    clientId: form.clientId,
    caseStudyPublished: form.caseStudyPublished,
    clientLabel: form.clientLabel || null,
    projectRole: form.projectRole || null,
    projectDuration: form.projectDuration || null,
    completedAt: form.completedAt || null,
    challenge: form.challenge || null,
    approach: form.approach || null,
    solution: form.solution || null,
    outcome: form.outcome || null,
    deliverables: form.deliverables.split(',').map(item => item.trim()).filter(Boolean),
    galleryImages: form.galleryImages.filter((image): image is string => Boolean(image)),
    results: form.results.filter(result => result.value.trim() && result.label.trim()),
    seoTitle: form.seoTitle || null,
    seoDescription: form.seoDescription || null,
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
      <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="project-form-title" tabindex="-1" @keydown="handleDialogKeydown">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
        <div class="admin-modal-panel relative w-full max-w-4xl bg-white dark:bg-[#111118] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/[0.08] my-4 overflow-y-auto">

          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <h2 id="project-form-title" class="font-display font-semibold text-base text-gray-900 dark:text-white">
              {{ editingProject ? 'Modifier le projet' : 'Nouveau projet' }}
            </h2>
            <button type="button" data-dialog-close aria-label="Fermer" class="w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-200 transition-all" @click="showForm = false">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <form class="px-6 py-5 space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label for="project-client" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Client associé</label>
              <select id="project-client" v-model.number="form.clientId" class="input-field">
                <option :value="null">Aucun client</option>
                <option v-for="client in clients.clients" :key="client.id" :value="client.id">{{ client.name }}{{ client.company ? ` — ${client.company}` : '' }}</option>
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="project-title" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Titre *</label>
                <input id="project-title" v-model="form.title" type="text" class="input-field" placeholder="Nom du projet" required>
              </div>
              <div>
                <label for="project-category" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Catégorie</label>
                <select id="project-category" v-model="form.category" class="input-field">
                  <option value="web">Web</option>
                  <option value="mobile">Mobile</option>
                  <option value="cms">CMS</option>
                </select>
              </div>
            </div>

            <fieldset class="rounded-xl border border-gray-100 p-4 dark:border-white/[0.06]">
              <legend class="px-1 text-sm font-semibold text-gray-800 dark:text-gray-200">Descriptions du portfolio</legend>
              <p class="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Le français est obligatoire. Si une traduction manque, le site affiche temporairement la description française dans cette langue.
              </p>
              <div class="grid gap-4 lg:grid-cols-3">
                <div>
                  <label for="project-description" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Français *</label>
                  <textarea id="project-description" v-model="form.description" rows="4" maxlength="1200" lang="fr" class="input-field resize-y" placeholder="Description courte en français..." required />
                </div>
                <div>
                  <label for="project-description-en" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">English</label>
                  <textarea id="project-description-en" v-model="form.descriptionEn" rows="4" maxlength="1200" lang="en" class="input-field resize-y" placeholder="Short description in English..." />
                </div>
                <div>
                  <label for="project-description-de" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Deutsch</label>
                  <textarea id="project-description-de" v-model="form.descriptionDe" rows="4" maxlength="1200" lang="de" class="input-field resize-y" placeholder="Kurze Beschreibung auf Deutsch..." />
                </div>
              </div>
            </fieldset>

            <div>
              <p class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Image de couverture *</p>
              <UiAppImageUpload v-model="form.image" />
              <p class="mt-1 text-xs text-gray-400">Obligatoire pour afficher le projet dans le portfolio.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="project-tags" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Technologies</label>
                <input id="project-tags" v-model="form.tags" type="text" class="input-field" placeholder="Vue 3, Nuxt, Tailwind">
              </div>
              <div>
                <label for="project-live-url" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">URL du projet *</label>
                <input id="project-live-url" v-model="form.liveUrl" type="url" class="input-field" placeholder="https://..." autocomplete="url" required>
              </div>
            </div>

            <div>
              <label for="project-code-url" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">URL GitHub <span class="font-normal text-gray-400">(facultatif)</span></label>
              <input id="project-code-url" v-model="form.codeUrl" type="url" class="input-field" placeholder="https://github.com/..." autocomplete="url">
            </div>

            <AdminProjectCaseStudyFields v-model="form" />

            <div class="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                :aria-checked="form.featured"
                aria-label="Mettre en avant"
                class="relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 before:absolute before:-inset-2.5 before:rounded-xl"
                :class="form.featured ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'"
                @click="form.featured = !form.featured"
              >
                <span class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200" :class="form.featured ? 'translate-x-4' : 'translate-x-0'" />
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-300">Mettre en avant</span>
            </div>

            <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] flex gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
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

    <!-- Mobile cards -->
    <div class="sm:hidden space-y-2">
      <div
        v-for="project in store.projects"
        :key="`mobile-${project.id}`"
        class="rounded-xl border p-3 bg-white dark:bg-[#111118] border-gray-100 dark:border-white/[0.06]"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
            <img v-if="project.image" :src="project.image" class="w-full h-full object-cover" alt="">
            <div v-else class="w-full h-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ project.title }}</p>
            <p class="text-xs text-gray-400 line-clamp-1">{{ project.description }}</p>
          </div>
        </div>
        <div class="mt-2 flex items-center gap-2 flex-wrap">
          <span class="text-xs font-semibold px-2 py-1 rounded-lg" :class="catColors[project.category]">{{ project.category }}</span>
          <span v-if="project.featured" class="text-xs font-semibold px-2 py-1 rounded-lg bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">★</span>
          <span v-if="project.caseStudyPublished" class="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">Étude publiée</span>
          <span v-for="tag in project.tags.slice(0, 2)" :key="`m-${project.id}-${tag}`" class="text-xs bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{{ tag }}</span>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <NuxtLink :to="`/admin/projects/${project.id}`" class="text-xs font-semibold text-violet-600">Piloter</NuxtLink>
          <NuxtLink v-if="project.caseStudyPublished" :to="`/projets/${project.slug}`" target="_blank" class="text-xs font-semibold text-cyan-700 dark:text-cyan-300">Voir l’étude</NuxtLink>
          <button class="text-xs text-violet-600" @click="openEdit(project)">Editer</button>
          <button class="text-xs text-red-500" @click="handleDelete(project.id)">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="admin-table-wrap hidden sm:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="admin-table w-full">
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
              <span v-if="project.caseStudyPublished" class="ml-1.5 rounded-lg bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">Étude publiée</span>
            </td>
            <td class="px-5 py-3.5 hidden md:table-cell">
              <div class="flex flex-wrap gap-1">
                <span v-for="tag in project.tags.slice(0, 3)" :key="tag" class="text-xs bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{{ tag }}</span>
              </div>
            </td>
            <td class="px-5 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <NuxtLink :to="`/admin/projects/${project.id}`" aria-label="Ouvrir le cockpit du projet" class="flex h-8 items-center rounded-lg px-2 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10">Piloter</NuxtLink>
                <NuxtLink
                  v-if="project.caseStudyPublished"
                  :to="`/projets/${project.slug}`"
                  target="_blank"
                  aria-label="Voir l’étude de cas publiée"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-cyan-600 transition-colors hover:bg-cyan-50 hover:text-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-500/10"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 3h7v7m0-7L10 14M5 7v12h12v-5" /></svg>
                </NuxtLink>
                <button
                  aria-label="Modifier le projet"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-violet-400 hover:text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10 transition-colors"
                  @click="openEdit(project)"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button
                  aria-label="Supprimer le projet"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10 transition-colors"
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
