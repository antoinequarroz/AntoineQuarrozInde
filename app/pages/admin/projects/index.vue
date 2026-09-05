<script setup lang="ts">
import type { Project, ProjectResult } from '~/types'
import { caseStudyPublicationBlockers } from '~~/shared/utils/projectCaseStudyApproval'
import AdminAdminIcon from '~/components/admin/AdminIcon.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const store = useProjectsStore()
const clients = useClientsStore()
const auth = useAuthStore()
const route = useRoute()
const toast = useToast()
const loadError = ref('')

const showForm = ref(route.query.new === '1')
const closeForm = () => { showForm.value = false }
const { dialogRef, handleDialogKeydown } = useAccessibleDialog(showForm, closeForm, '[data-dialog-close]')
const editingProject = ref<Project | null>(null)
const canManagePublication = computed(() => {
  const organization = auth.organizations.find(item => item.id === auth.currentOrganizationId)
  return organization?.role === 'owner' || organization?.role === 'admin'
})

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
  portfolioVisible: false,
  clientId: null as number | null,
  caseStudyPublished: false,
  caseStudyApprovedAt: '',
  caseStudyApprovalConfirmed: false,
  clientLabel: '',
  clientDisclosureStatus: 'pending' as Project['clientDisclosureStatus'],
  projectRole: '',
  projectDuration: '',
  caseStudyTimelineApproved: false,
  completedAt: '',
  challenge: '',
  projectScope: '',
  keyDecisions: '',
  approach: '',
  solution: '',
  outcome: '',
  outcomeApproved: false,
  caseStudyLinksApproved: false,
  relatedServicePaths: [] as Project['relatedServicePaths'],
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
    liveUrl: '', codeUrl: '', featured: false, portfolioVisible: false, clientId: null,
    caseStudyPublished: false, caseStudyApprovedAt: '', caseStudyApprovalConfirmed: false,
    clientLabel: '', clientDisclosureStatus: 'pending', projectRole: '', projectDuration: '',
    caseStudyTimelineApproved: false, completedAt: '', challenge: '', projectScope: '', keyDecisions: '',
    approach: '', solution: '', outcome: '', outcomeApproved: false, caseStudyLinksApproved: false,
    relatedServicePaths: [],
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
    liveUrl: project.liveUrl || '', codeUrl: project.codeUrl || '', featured: project.featured, portfolioVisible: project.portfolioVisible, clientId: project.clientId,
    caseStudyPublished: project.caseStudyPublished,
    caseStudyApprovedAt: project.caseStudyApprovedAt || '',
    caseStudyApprovalConfirmed: false,
    clientLabel: project.clientLabel || '',
    clientDisclosureStatus: project.clientDisclosureStatus,
    projectRole: project.projectRole || '',
    projectDuration: project.projectDuration || '',
    caseStudyTimelineApproved: project.caseStudyTimelineApproved,
    completedAt: project.completedAt || '',
    challenge: project.challenge || '',
    projectScope: project.projectScope || '',
    keyDecisions: project.keyDecisions || '',
    approach: project.approach || '',
    solution: project.solution || '',
    outcome: project.outcome || '',
    outcomeApproved: project.outcomeApproved,
    caseStudyLinksApproved: project.caseStudyLinksApproved,
    relatedServicePaths: [...project.relatedServicePaths],
    deliverables: project.deliverables.join(', '),
    galleryImages: [...project.galleryImages],
    results: project.results.map(result => ({ ...result })),
    seoTitle: project.seoTitle || '',
    seoDescription: project.seoDescription || '',
  })
  showForm.value = true
}

async function loadProjects(force = false) {
  loadError.value = ''
  try {
    await Promise.all([store.ensureLoaded(force), clients.ensureLoaded(force)])
    return true
  }
  catch {
    loadError.value = 'Les projets ne peuvent pas être chargés pour le moment. Vérifie ta connexion, puis réessaie.'
    return false
  }
}

onMounted(async () => {
  if (!await loadProjects()) return
  const projectId = Number(route.query.editId || 0)
  const project = store.projects.find(item => item.id === projectId)
  if (project) {
    openEdit(project)
    return
  }
  const clientId = Number(route.query.clientId || 0)
  if (clientId) form.clientId = clientId
})

async function handleSubmit() {
  if (!form.image) {
    toast.error('Ajoutez une image de couverture')
    return
  }

  const incompleteResultIndex = form.results.findIndex(result => !result.value.trim() || !result.label.trim())
  if (incompleteResultIndex !== -1) {
    toast.error(`Complétez ou supprimez la mesure ${incompleteResultIndex + 1}`)
    return
  }

  if (form.caseStudyPublished) {
    const blockers = caseStudyPublicationBlockers(form)
    if (blockers.length) {
      toast.error(`Publication bloquée : ${blockers.map(blocker => blocker.label).join(', ')}`)
      return
    }
    if (!form.caseStudyApprovedAt && !form.caseStudyApprovalConfirmed) {
      toast.error('Confirmez la validation finale de cette étude')
      return
    }
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
    portfolioVisible: form.portfolioVisible,
    clientId: form.clientId,
    caseStudyPublished: form.caseStudyPublished,
    caseStudyApprovalConfirmed: form.caseStudyApprovalConfirmed,
    clientLabel: form.clientLabel || null,
    clientDisclosureStatus: form.clientDisclosureStatus,
    projectRole: form.projectRole || null,
    projectDuration: form.projectDuration || null,
    caseStudyTimelineApproved: form.caseStudyTimelineApproved,
    completedAt: form.completedAt || null,
    challenge: form.challenge || null,
    projectScope: form.projectScope || null,
    keyDecisions: form.keyDecisions || null,
    approach: form.approach || null,
    solution: form.solution || null,
    outcome: form.outcome || null,
    outcomeApproved: form.outcomeApproved,
    caseStudyLinksApproved: form.caseStudyLinksApproved,
    relatedServicePaths: form.relatedServicePaths,
    deliverables: form.deliverables.split(',').map(item => item.trim()).filter(Boolean),
    galleryImages: form.galleryImages.filter((image): image is string => Boolean(image)),
    results: form.results,
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
  catch (error: any) {
    toast.error(error?.data?.message || error?.data?.statusMessage || 'Erreur lors de la sauvegarde')
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
function portfolioTone(project: Project) {
  return project.portfolioVisible
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
    : 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300'
}
function caseStudyTone(project: Project) {
  if (project.caseStudyPublished && project.caseStudyApprovedAt) return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300'
  if (project.caseStudyPublished) return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
  return 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300'
}
</script>

<template>
  <div class="space-y-5">

    <section class="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Projets</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ store.projects.length }} {{ store.projects.length === 1 ? 'projet' : 'projets' }} · {{ store.portfolio.length }} dans le portfolio · {{ store.projects.filter(project => project.caseStudyPublished && project.caseStudyApprovedAt).length }} {{ store.projects.filter(project => project.caseStudyPublished && project.caseStudyApprovedAt).length === 1 ? 'étude publique' : 'études publiques' }}</p>
        </div>
      <button
        class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
        @click="openNew"
      >
        <AdminAdminIcon icon="plus" class="h-4 w-4" />
        Nouveau
      </button>
      </div>
    </section>

    <!-- Form modal -->
    <Transition name="modal">
      <div v-if="showForm" ref="dialogRef" class="fixed inset-0 z-50 flex items-start justify-center overflow-hidden p-2 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="project-form-title" tabindex="-1" @keydown="handleDialogKeydown">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
        <div class="admin-modal-panel relative flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111118] sm:max-h-[92vh]">

          <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-6 sm:py-4">
            <h2 id="project-form-title" class="font-display font-semibold text-base text-gray-900 dark:text-white">
              {{ editingProject ? 'Modifier le projet' : 'Nouveau projet' }}
            </h2>
            <button type="button" data-dialog-close aria-label="Fermer" class="w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-200 transition-all" @click="showForm = false">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="handleSubmit">
            <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
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

            <AdminProjectCaseStudyFields v-model="form" :can-manage-publication="canManagePublication" />

            <label class="flex min-h-11 items-start gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
              <input v-model="form.featured" type="checkbox" class="mt-0.5 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
              <span>
                <span class="block text-sm font-semibold text-gray-700 dark:text-gray-200">Mettre en avant</span>
                <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">Place le projet avant les autres cartes visibles, sans changer sa publication.</span>
              </span>
            </label>
            </div>

            <div class="admin-sticky-actions flex shrink-0 gap-3 border-t border-gray-100 bg-white px-4 py-3 dark:border-white/[0.06] dark:bg-[#111118] sm:px-6">
              <button type="submit" class="min-h-11 flex-1 rounded-lg bg-violet-600 text-sm font-semibold text-white transition-colors hover:bg-violet-700">
                {{ editingProject ? 'Enregistrer' : 'Créer' }}
              </button>
              <button type="button" class="min-h-11 rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.04]" @click="showForm = false">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <div v-if="store.loading" role="status" aria-live="polite" class="space-y-3">
      <span class="sr-only">Chargement des projets</span>
      <div class="h-24 animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/[0.06]" />
      <div class="h-56 animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/[0.06]" />
    </div>
    <div v-else-if="loadError" role="alert" class="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between">
      <div><p class="font-semibold">Chargement impossible</p><p class="mt-1 text-sm">{{ loadError }}</p></div>
      <button class="min-h-11 shrink-0 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800" @click="loadProjects(true)">Réessayer</button>
    </div>

    <!-- Mobile cards -->
    <div v-if="!store.loading && !loadError" class="sm:hidden space-y-2">
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
            <p class="line-clamp-1 text-xs text-gray-600 dark:text-gray-300">{{ project.description }}</p>
          </div>
        </div>
        <div class="mt-2 flex items-center gap-2 flex-wrap">
          <span class="text-xs font-semibold px-2 py-1 rounded-lg" :class="catColors[project.category]">{{ project.category }}</span>
          <span v-if="project.featured" class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" aria-label="Projet mis en avant"><AdminAdminIcon icon="star" class="h-3.5 w-3.5" /></span>
          <span class="rounded-lg px-2 py-1 text-xs font-semibold" :class="portfolioTone(project)">Portfolio {{ project.portfolioVisible ? 'visible' : 'masqué' }}</span>
          <span class="rounded-lg px-2 py-1 text-xs font-semibold" :class="caseStudyTone(project)">Étude {{ project.caseStudyPublished && project.caseStudyApprovedAt ? 'publiée' : project.caseStudyPublished ? 'à approuver' : 'brouillon' }}</span>
          <span v-for="tag in project.tags.slice(0, 2)" :key="`m-${project.id}-${tag}`" class="text-xs bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{{ tag }}</span>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-1.5">
          <NuxtLink :to="`/admin/projects/${project.id}`" class="inline-flex min-h-10 items-center rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10">Piloter</NuxtLink>
          <NuxtLink v-if="project.caseStudyPublished && project.caseStudyApprovedAt" :to="`/projets/${project.slug}`" target="_blank" class="text-xs font-semibold text-cyan-700 dark:text-cyan-300">Voir l’étude</NuxtLink>
          <button class="min-h-10 rounded-lg px-2 text-xs text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10" @click="openEdit(project)">Éditer</button>
          <button class="min-h-10 rounded-lg px-2 text-xs text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" @click="handleDelete(project.id)">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div v-if="!store.loading && !loadError" class="admin-table-wrap hidden sm:block bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="admin-table w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/[0.06]">
            <th class="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Projet</th>
            <th class="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 sm:table-cell">Catégorie</th>
            <th class="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Publication</th>
            <th class="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 md:table-cell">Technologies</th>
            <th class="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Actions</th>
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
                  <p class="mt-0.5 line-clamp-1 max-w-52 text-xs text-gray-600 dark:text-gray-300">{{ project.description }}</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-3.5 hidden sm:table-cell">
              <span class="text-xs font-semibold px-2.5 py-1 rounded-lg" :class="catColors[project.category]">{{ project.category }}</span>
              <span v-if="project.featured" class="ml-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" aria-label="Projet mis en avant"><AdminAdminIcon icon="star" class="h-3.5 w-3.5" /></span>
            </td>
            <td class="px-5 py-3.5">
              <div class="flex flex-col items-start gap-1">
                <span class="rounded-lg px-2 py-1 text-xs font-semibold" :class="portfolioTone(project)">Portfolio {{ project.portfolioVisible ? 'visible' : 'masqué' }}</span>
                <span class="rounded-lg px-2 py-1 text-xs font-semibold" :class="caseStudyTone(project)">Étude {{ project.caseStudyPublished && project.caseStudyApprovedAt ? 'publiée' : project.caseStudyPublished ? 'à approuver' : 'brouillon' }}</span>
              </div>
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
                  v-if="project.caseStudyPublished && project.caseStudyApprovedAt"
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
        <p class="mb-3 text-sm text-gray-600 dark:text-gray-300">Aucun projet pour l'instant</p>
        <button class="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors" @click="openNew">+ Créer le premier</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
