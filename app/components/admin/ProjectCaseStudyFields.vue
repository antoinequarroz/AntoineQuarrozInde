<script setup lang="ts">
import type { ProjectCaseStudyLocale, ProjectCaseStudyLocalization } from '~/types'
import {
  caseStudyPublicationBlockers,
  PROJECT_CASE_STUDY_SERVICES,
} from '~~/shared/utils/projectCaseStudyApproval'
import {
  PROJECT_CASE_STUDY_LOCALES,
  PROJECT_CASE_STUDY_LOCALE_LABELS,
  projectCaseStudyLocalizationHasContent,
} from '~~/shared/utils/projectCaseStudyLocalizations'

interface ProjectCaseStudyForm {
  portfolioVisible: boolean
  caseStudyPublished: boolean
  caseStudyApprovedAt: string
  caseStudyApprovalConfirmed: boolean
  clientLabel: string
  clientDisclosureStatus: 'pending' | 'anonymous' | 'approved'
  caseStudyLocalizations: Record<ProjectCaseStudyLocale, ProjectCaseStudyLocalization>
  caseStudyTimelineApproved: boolean
  completedAt: string
  outcomeApproved: boolean
  caseStudyLinksApproved: boolean
  relatedServicePaths: string[]
  galleryImages: Array<string | null>
  seoTitle: string
  seoDescription: string
}

const model = defineModel<ProjectCaseStudyForm>({ required: true })
const props = withDefaults(defineProps<{
  canManagePublication?: boolean
  fieldError?: { locale: ProjectCaseStudyLocale, field: string, message: string } | null
}>(), {
  canManagePublication: true,
  fieldError: null,
})

const activeLocale = ref<ProjectCaseStudyLocale>('fr')
const activeLocalization = computed(() => model.value.caseStudyLocalizations[activeLocale.value])
const deliverablesText = computed({
  get: () => activeLocalization.value.deliverables.join(', '),
  set: value => { activeLocalization.value.deliverables = value.split(',').map(item => item.trim()).filter(Boolean) },
})
const localeCopy = {
  fr: {
    role: 'Design et développement', duration: '6 semaines', challenge: 'Situation de départ et besoin réel',
    scope: 'Éléments inclus et hors périmètre', decisions: 'Décisions importantes et raisons',
    approach: 'Organisation et méthode de travail', solution: 'Solution précisément réalisée',
    outcome: 'Résultat observé, sans chiffre inventé', deliverables: 'UX/UI, développement Nuxt, CMS',
  },
  en: {
    role: 'Design and development', duration: '6 weeks', challenge: 'Initial situation and actual need',
    scope: 'Included and explicitly excluded work', decisions: 'Important decisions and rationale',
    approach: 'How the work was organized', solution: 'What was delivered precisely',
    outcome: 'Observed outcome, without invented figures', deliverables: 'UX/UI, Nuxt development, CMS',
  },
  de: {
    role: 'Design und Entwicklung', duration: '6 Wochen', challenge: 'Ausgangslage und tatsächlicher Bedarf',
    scope: 'Enthaltene und ausgeschlossene Leistungen', decisions: 'Wichtige Entscheidungen und Gründe',
    approach: 'Organisation und Arbeitsweise', solution: 'Genau umgesetzte Lösung',
    outcome: 'Beobachtetes Ergebnis ohne erfundene Zahlen', deliverables: 'UX/UI, Nuxt-Entwicklung, CMS',
  },
} satisfies Record<ProjectCaseStudyLocale, Record<'role' | 'duration' | 'challenge' | 'scope' | 'decisions' | 'approach' | 'solution' | 'outcome' | 'deliverables', string>>
const publicationBlockers = computed(() => caseStudyPublicationBlockers({
  ...model.value.caseStudyLocalizations.fr,
  outcomeApproved: model.value.outcomeApproved,
  clientDisclosureStatus: model.value.clientDisclosureStatus,
  clientLabel: model.value.clientLabel,
  relatedServicePaths: model.value.relatedServicePaths,
}))

function selectLocale(locale: ProjectCaseStudyLocale) {
  activeLocale.value = locale
}

function handleLocaleKeydown(event: KeyboardEvent, locale: ProjectCaseStudyLocale) {
  const index = PROJECT_CASE_STUDY_LOCALES.indexOf(locale)
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const offset = event.key === 'ArrowRight' ? 1 : -1
  const next = PROJECT_CASE_STUDY_LOCALES[(index + offset + PROJECT_CASE_STUDY_LOCALES.length) % PROJECT_CASE_STUDY_LOCALES.length]!
  activeLocale.value = next
  nextTick(() => document.getElementById(`case-locale-tab-${next}`)?.focus())
}

watch(() => props.fieldError, async (error) => {
  if (!error) return
  activeLocale.value = error.locale
  await nextTick()
  document.getElementById(`case-${error.locale}-${error.field.replaceAll('.', '-')}`)?.focus()
})

function addResult() {
  if (activeLocalization.value.results.length >= 6) return
  activeLocalization.value.results.push({
    value: '',
    label: '',
    measurementContext: null,
    evidenceNote: null,
    approved: false,
  })
}

function addGalleryImage() {
  if (model.value.galleryImages.length >= 12) return
  model.value.galleryImages.push(null)
}
</script>

<template>
  <section class="border-t border-gray-100 pt-5 dark:border-white/[0.06]">
    <fieldset class="rounded-2xl border border-violet-200/70 bg-violet-50/50 p-4 dark:border-violet-400/20 dark:bg-violet-500/[0.06]">
      <legend class="px-1 font-display text-base font-semibold text-gray-900 dark:text-white">Publication</legend>
      <p class="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        Le portfolio rend la carte et sa page projet publiques. L’étude de cas ajoute séparément les contenus avancés approuvés.
      </p>
      <p v-if="!canManagePublication" class="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
        Seuls les propriétaires et administrateurs peuvent modifier ces réglages.
      </p>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]" :class="!canManagePublication && 'cursor-not-allowed opacity-65'">
          <input v-model="model.portfolioVisible" type="checkbox" :disabled="!canManagePublication" class="mt-0.5 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed">
          <span class="min-w-0">
            <span class="block text-sm font-semibold text-gray-800 dark:text-gray-100">Afficher dans le portfolio</span>
            <span class="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">Rend la carte visible sur la page d’accueil.</span>
            <span class="mt-2 block text-xs font-semibold" :class="model.portfolioVisible ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'" role="status">
              {{ model.portfolioVisible ? 'Visible' : 'Masqué' }}
            </span>
          </span>
        </label>

        <label class="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]" :class="!canManagePublication && 'cursor-not-allowed opacity-65'">
          <input v-model="model.caseStudyPublished" type="checkbox" :disabled="!canManagePublication" class="mt-0.5 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed">
          <span class="min-w-0">
            <span class="block text-sm font-semibold text-gray-800 dark:text-gray-100">Publier l’étude de cas</span>
            <span class="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">Ajoute à la page projet le contexte, les décisions et les résultats approuvés.</span>
            <span class="mt-2 block text-xs font-semibold" :class="model.caseStudyPublished ? 'text-cyan-700 dark:text-cyan-300' : 'text-gray-500 dark:text-gray-400'" role="status">
              {{ model.caseStudyPublished && model.caseStudyApprovedAt ? 'Publiée et approuvée' : model.caseStudyPublished ? 'À valider' : 'Brouillon' }}
            </span>
          </span>
        </label>
      </div>
    </fieldset>

    <div class="mt-6 max-w-2xl">
      <h3 class="font-display text-base font-semibold text-gray-900 dark:text-white">Contenu de l’étude de cas</h3>
      <p class="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        Tous les détails restent facultatifs tant que le projet est un brouillon ou une simple carte portfolio. Les cinq passages essentiels sont exigés uniquement pour publier l’étude.
      </p>
    </div>

    <fieldset class="mt-5 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
      <legend class="px-1 text-sm font-semibold text-gray-800 dark:text-gray-200">Confidentialité et attribution</legend>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="case-client-disclosure" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Décision de divulgation</label>
          <select id="case-client-disclosure" v-model="model.clientDisclosureStatus" class="input-field">
            <option value="pending">À confirmer — reste privé</option>
            <option value="anonymous">Projet anonyme</option>
            <option value="approved">Nom client approuvé</option>
          </select>
        </div>
        <div>
          <label for="case-client-label" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Client affiché</label>
          <input id="case-client-label" v-model="model.clientLabel" class="input-field" maxlength="180" :disabled="model.clientDisclosureStatus !== 'approved'" placeholder="Nom public approuvé">
          <p class="mt-1 text-xs text-gray-400">Le client reste masqué sauf avec « Nom client approuvé ».</p>
        </div>
      </div>
      <p v-if="model.clientDisclosureStatus === 'anonymous'" class="mt-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        Avant publication, vérifiez aussi que le titre, les textes, les images et les URLs n’identifient pas le client.
      </p>
    </fieldset>

    <fieldset class="mt-4 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
      <legend class="px-1 text-sm font-semibold text-gray-800 dark:text-gray-200">Services pertinents</legend>
      <p class="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Choisissez manuellement au moins un service pour l’étude. La catégorie du projet ne décide rien automatiquement.</p>
      <div class="grid gap-2 sm:grid-cols-2">
        <label v-for="service in PROJECT_CASE_STUDY_SERVICES" :key="service.path" class="flex min-h-11 items-center gap-3 rounded-xl border border-gray-100 px-3 py-2 dark:border-white/[0.06]">
          <input v-model="model.relatedServicePaths" type="checkbox" :value="service.path" class="h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
          <span class="text-sm text-gray-700 dark:text-gray-200">{{ service.label }}</span>
        </label>
      </div>
    </fieldset>

    <div class="mt-5 rounded-2xl border border-gray-200 dark:border-white/10">
      <div class="border-b border-gray-100 p-2 dark:border-white/[0.06]">
        <div class="grid grid-cols-3 gap-1" role="tablist" aria-label="Langue du contenu détaillé">
          <button
            v-for="localeOption in PROJECT_CASE_STUDY_LOCALES"
            :id="`case-locale-tab-${localeOption}`"
            :key="localeOption"
            type="button"
            role="tab"
            :aria-selected="activeLocale === localeOption"
            :aria-controls="`case-locale-panel-${localeOption}`"
            :tabindex="activeLocale === localeOption ? 0 : -1"
            class="min-h-11 rounded-xl px-2 text-sm font-semibold transition-colors"
            :class="activeLocale === localeOption ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]'"
            @click="selectLocale(localeOption)"
            @keydown="handleLocaleKeydown($event, localeOption)"
          >
            <span>{{ PROJECT_CASE_STUDY_LOCALE_LABELS[localeOption] }}</span>
            <span class="ml-1 text-[10px] opacity-75">{{ projectCaseStudyLocalizationHasContent(model.caseStudyLocalizations[localeOption]) ? 'En cours' : 'Vide' }}</span>
          </button>
        </div>
      </div>

      <fieldset
        :id="`case-locale-panel-${activeLocale}`"
        class="p-4"
        role="tabpanel"
        :aria-labelledby="`case-locale-tab-${activeLocale}`"
        :lang="activeLocale"
        :disabled="!canManagePublication"
      >
        <legend class="sr-only">Contenu détaillé en {{ PROJECT_CASE_STUDY_LOCALE_LABELS[activeLocale] }}</legend>
        <p class="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Cette langue est indépendante. La laisser vide ne bloque pas les autres et aucun texte français ne sera copié automatiquement.
        </p>
        <p v-if="fieldError?.locale === activeLocale" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200" role="alert">
          {{ fieldError.message }}
        </p>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label :for="`case-${activeLocale}-projectRole`" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Votre rôle</label>
            <input :id="`case-${activeLocale}-projectRole`" v-model="activeLocalization.projectRole" class="input-field" maxlength="180" :placeholder="localeCopy[activeLocale].role">
            <p class="mt-1 text-xs text-gray-400">{{ activeLocalization.projectRole?.length || 0 }}/180</p>
          </div>
          <div>
            <label :for="`case-${activeLocale}-projectDuration`" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Durée affichée</label>
            <input :id="`case-${activeLocale}-projectDuration`" v-model="activeLocalization.projectDuration" class="input-field" maxlength="120" :placeholder="localeCopy[activeLocale].duration">
            <p class="mt-1 text-xs text-gray-400">{{ activeLocalization.projectDuration?.length || 0 }}/120</p>
          </div>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label :for="`case-${activeLocale}-challenge`" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Contexte</label>
            <textarea :id="`case-${activeLocale}-challenge`" v-model="activeLocalization.challenge" rows="5" maxlength="4000" class="input-field resize-y" :placeholder="localeCopy[activeLocale].challenge" />
            <p class="mt-1 text-xs text-gray-400">{{ activeLocalization.challenge?.length || 0 }}/4000</p>
          </div>
          <div>
            <label :for="`case-${activeLocale}-projectScope`" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Périmètre</label>
            <textarea :id="`case-${activeLocale}-projectScope`" v-model="activeLocalization.projectScope" rows="5" maxlength="6000" class="input-field resize-y" :placeholder="localeCopy[activeLocale].scope" />
            <p class="mt-1 text-xs text-gray-400">{{ activeLocalization.projectScope?.length || 0 }}/6000</p>
          </div>
          <div>
            <label :for="`case-${activeLocale}-keyDecisions`" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Décisions</label>
            <textarea :id="`case-${activeLocale}-keyDecisions`" v-model="activeLocalization.keyDecisions" rows="5" maxlength="6000" class="input-field resize-y" :placeholder="localeCopy[activeLocale].decisions" />
            <p class="mt-1 text-xs text-gray-400">{{ activeLocalization.keyDecisions?.length || 0 }}/6000</p>
          </div>
          <div>
            <label :for="`case-${activeLocale}-outcome`" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Résultat qualitatif</label>
            <textarea :id="`case-${activeLocale}-outcome`" v-model="activeLocalization.outcome" rows="5" maxlength="4000" class="input-field resize-y" :placeholder="localeCopy[activeLocale].outcome" />
            <p class="mt-1 text-xs text-gray-400">{{ activeLocalization.outcome?.length || 0 }}/4000</p>
          </div>
        </div>

        <details class="mt-4 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
          <summary class="min-h-11 cursor-pointer text-sm font-semibold leading-[2.75rem] text-gray-800 dark:text-gray-200">Détails complémentaires facultatifs</summary>
          <div class="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <label :for="`case-${activeLocale}-approach`" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Approche</label>
              <textarea :id="`case-${activeLocale}-approach`" v-model="activeLocalization.approach" rows="5" maxlength="6000" class="input-field resize-y" :placeholder="localeCopy[activeLocale].approach" />
            </div>
            <div>
              <label :for="`case-${activeLocale}-solution`" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Solution réalisée</label>
              <textarea :id="`case-${activeLocale}-solution`" v-model="activeLocalization.solution" rows="5" maxlength="6000" class="input-field resize-y" :placeholder="localeCopy[activeLocale].solution" />
            </div>
          </div>
        </details>

        <div class="mt-4">
          <label :for="`case-${activeLocale}-deliverables`" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Livrables</label>
          <input :id="`case-${activeLocale}-deliverables`" v-model="deliverablesText" class="input-field" :placeholder="localeCopy[activeLocale].deliverables">
          <p class="mt-1 text-xs text-gray-400">Séparez jusqu'à 20 éléments par des virgules.</p>
        </div>

        <details class="mt-5 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
          <summary class="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-200">
            Résultats chiffrés vérifiés
            <span class="text-xs font-normal text-gray-400">{{ activeLocalization.results.length }}/6</span>
          </summary>
          <p class="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Ajoutez uniquement des mesures relues et justifiables dans cette langue.</p>
          <div class="space-y-3">
            <fieldset v-for="(_result, index) in activeLocalization.results" :key="index" class="rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
              <legend class="px-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Mesure {{ index + 1 }}</legend>
              <div class="grid gap-2 sm:grid-cols-[9rem_1fr]">
                <input :id="`case-${activeLocale}-results-${index}-value`" v-model="activeLocalization.results[index]!.value" class="input-field" maxlength="40" :aria-label="`Valeur de la mesure ${index + 1}`" placeholder="Ex. 1,2 s">
                <input :id="`case-${activeLocale}-results-${index}-label`" v-model="activeLocalization.results[index]!.label" class="input-field" maxlength="120" :aria-label="`Libellé de la mesure ${index + 1}`" placeholder="Ex. Temps de chargement mesuré">
              </div>
              <input :id="`case-${activeLocale}-results-${index}-measurementContext`" v-model="activeLocalization.results[index]!.measurementContext" class="input-field mt-2" maxlength="240" :aria-label="`Contexte de mesure ${index + 1}`" placeholder="Période ou contexte de mesure">
              <textarea :id="`case-${activeLocale}-results-${index}-evidenceNote`" v-model="activeLocalization.results[index]!.evidenceNote" rows="2" maxlength="1000" class="input-field mt-2 resize-y" :aria-label="`Note de preuve privée ${index + 1}`" placeholder="Source privée, jamais publiée" />
              <div class="mt-2 flex flex-wrap items-start justify-between gap-2">
                <label class="flex min-h-11 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <input v-model="activeLocalization.results[index]!.approved" type="checkbox" class="h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
                  Mesure vérifiée et approuvée
                </label>
                <button type="button" class="min-h-11 rounded-lg px-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" :aria-label="`Supprimer le résultat ${index + 1}`" @click="activeLocalization.results.splice(index, 1)">Supprimer</button>
              </div>
            </fieldset>
          </div>
          <button v-if="activeLocalization.results.length < 6" type="button" class="mt-3 min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-400/20 dark:text-violet-200 dark:hover:bg-violet-500/10" @click="addResult">Ajouter un résultat</button>
        </details>
      </fieldset>
    </div>

    <div class="mt-4">
      <label for="case-completed-at" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Date de livraison commune</label>
      <input id="case-completed-at" v-model="model.completedAt" type="date" class="input-field max-w-sm">
    </div>
    <label class="mt-3 flex min-h-11 items-start gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
      <input v-model="model.caseStudyTimelineApproved" type="checkbox" class="mt-0.5 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
      <span>
        <span class="block text-sm font-semibold text-gray-700 dark:text-gray-200">Durée et date approuvées</span>
        <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">Sans cette approbation, ces deux valeurs restent privées.</span>
      </span>
    </label>

    <label class="mt-3 flex min-h-11 items-start gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
      <input v-model="model.outcomeApproved" type="checkbox" class="mt-0.5 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
      <span class="text-xs leading-relaxed text-gray-600 dark:text-gray-300">Je confirme que les résultats qualitatifs saisis ont été observés et restent soumis à validation humaine avant publication.</span>
    </label>

    <label class="mt-4 flex min-h-11 items-start gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
      <input v-model="model.caseStudyLinksApproved" type="checkbox" class="mt-0.5 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
      <span>
        <span class="block text-sm font-semibold text-gray-700 dark:text-gray-200">Liens live et GitHub approuvés dans l’étude</span>
        <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">Sans cet accord, les boutons externes restent masqués sur la page détaillée.</span>
      </span>
    </label>

    <div v-if="model.caseStudyPublished" class="mt-5 rounded-2xl border p-4" :class="publicationBlockers.length ? 'border-amber-300 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-500/10' : 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-500/10'">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Contrôle avant publication</h3>
      <ul v-if="publicationBlockers.length" class="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200" role="status">
        <li v-for="blocker in publicationBlockers" :key="blocker.field">{{ blocker.label }}</li>
      </ul>
      <p v-else class="mt-2 text-sm text-emerald-800 dark:text-emerald-200" role="status">Le contenu obligatoire est complet. La validation finale reste nécessaire.</p>
      <label class="mt-3 flex min-h-11 items-start gap-3">
        <input v-model="model.caseStudyApprovalConfirmed" type="checkbox" :disabled="publicationBlockers.length > 0" class="mt-0.5 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
        <span class="text-xs leading-relaxed text-gray-700 dark:text-gray-200">Je confirme avoir relu cette version et disposer des autorisations nécessaires pour la publier.</span>
      </label>
      <p v-if="model.caseStudyApprovedAt" class="mt-2 text-xs text-gray-500 dark:text-gray-400">Cette étude possède déjà une validation. Pour modifier son contenu approuvé, repassez-la d’abord en brouillon.</p>
    </div>

    <details class="mt-4 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
      <summary class="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-200">
        Galerie du projet
        <span class="text-xs font-normal text-gray-400">{{ model.galleryImages.length }}/12</span>
      </summary>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <div v-for="(_image, index) in model.galleryImages" :key="index" class="relative rounded-xl border border-gray-100 p-2 dark:border-white/[0.06]">
          <UiAppImageUpload
            :model-value="model.galleryImages[index] ?? null"
            @update:model-value="model.galleryImages[index] = $event"
          />
          <button type="button" class="mt-2 min-h-11 w-full rounded-lg text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" @click="model.galleryImages.splice(index, 1)">Retirer cet emplacement</button>
        </div>
      </div>
      <button v-if="model.galleryImages.length < 12" type="button" class="mt-3 min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-400/20 dark:text-violet-200 dark:hover:bg-violet-500/10" @click="addGalleryImage">Ajouter une image</button>
    </details>

    <details class="mt-4 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
      <summary class="min-h-11 cursor-pointer text-sm font-semibold leading-[2.75rem] text-gray-800 dark:text-gray-200">Référencement de l’étude de cas</summary>
      <div class="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <label for="case-seo-title" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Titre SEO</label>
          <input id="case-seo-title" v-model="model.seoTitle" class="input-field" maxlength="70" placeholder="Nom du projet — Étude de cas">
          <p class="mt-1 text-xs text-gray-400">{{ model.seoTitle.length }}/70</p>
        </div>
        <div>
          <label for="case-seo-description" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Description SEO</label>
          <textarea id="case-seo-description" v-model="model.seoDescription" rows="3" maxlength="180" class="input-field resize-y" placeholder="Résumé précis de votre intervention et du résultat." />
          <p class="mt-1 text-xs text-gray-400">{{ model.seoDescription.length }}/180</p>
        </div>
      </div>
    </details>
  </section>
</template>
