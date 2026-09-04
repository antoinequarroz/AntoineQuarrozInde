<script setup lang="ts">
import type { ProjectResult } from '~/types'
import {
  caseStudyPublicationBlockers,
  PROJECT_CASE_STUDY_SERVICES,
} from '~~/shared/utils/projectCaseStudyApproval'

interface ProjectCaseStudyForm {
  portfolioVisible: boolean
  caseStudyPublished: boolean
  caseStudyApprovedAt: string
  caseStudyApprovalConfirmed: boolean
  clientLabel: string
  clientDisclosureStatus: 'pending' | 'anonymous' | 'approved'
  projectRole: string
  projectDuration: string
  caseStudyTimelineApproved: boolean
  completedAt: string
  challenge: string
  projectScope: string
  keyDecisions: string
  approach: string
  solution: string
  outcome: string
  outcomeApproved: boolean
  caseStudyLinksApproved: boolean
  relatedServicePaths: string[]
  deliverables: string
  galleryImages: Array<string | null>
  results: ProjectResult[]
  seoTitle: string
  seoDescription: string
}

const model = defineModel<ProjectCaseStudyForm>({ required: true })
withDefaults(defineProps<{ canManagePublication?: boolean }>(), {
  canManagePublication: true,
})

const publicationBlockers = computed(() => caseStudyPublicationBlockers(model.value))

function addResult() {
  if (model.value.results.length >= 6) return
  model.value.results.push({
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
        Choisissez séparément la carte du portfolio et la page détaillée. Un réglage ne modifie jamais l’autre.
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
            <span class="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">Rend la page détaillée et son lien publics.</span>
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

    <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label for="case-project-role" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Votre rôle</label>
        <input id="case-project-role" v-model="model.projectRole" class="input-field" maxlength="180" placeholder="Design et développement">
      </div>
      <div>
        <label for="case-project-duration" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Durée</label>
        <input id="case-project-duration" v-model="model.projectDuration" class="input-field" maxlength="120" placeholder="6 semaines">
      </div>
      <div>
        <label for="case-completed-at" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Livraison</label>
        <input id="case-completed-at" v-model="model.completedAt" type="date" class="input-field">
      </div>
    </div>
    <label class="mt-3 flex min-h-11 items-start gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
      <input v-model="model.caseStudyTimelineApproved" type="checkbox" class="mt-0.5 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
      <span>
        <span class="block text-sm font-semibold text-gray-700 dark:text-gray-200">Durée et date approuvées</span>
        <span class="mt-1 block text-xs text-gray-500 dark:text-gray-400">Sans cette approbation, ces deux valeurs restent privées.</span>
      </span>
    </label>

    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <label for="case-challenge" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Contexte</label>
        <textarea id="case-challenge" v-model="model.challenge" rows="5" maxlength="4000" class="input-field resize-y" placeholder="Quelle était la situation de départ et le besoin réel ?" />
      </div>
      <div>
        <label for="case-project-scope" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Périmètre</label>
        <textarea id="case-project-scope" v-model="model.projectScope" rows="5" maxlength="6000" class="input-field resize-y" placeholder="Qu’est-ce qui était inclus et explicitement hors périmètre ?" />
      </div>
      <div>
        <label for="case-key-decisions" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Décisions</label>
        <textarea id="case-key-decisions" v-model="model.keyDecisions" rows="5" maxlength="6000" class="input-field resize-y" placeholder="Quelles décisions importantes avez-vous prises et pourquoi ?" />
      </div>
      <div>
        <label for="case-outcome" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Résultat qualitatif</label>
        <textarea id="case-outcome" v-model="model.outcome" rows="5" maxlength="4000" class="input-field resize-y" placeholder="Résultat observé, retour client ou amélioration constatée. N’inventez aucun chiffre." />
        <label class="mt-2 flex min-h-11 items-start gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
          <input v-model="model.outcomeApproved" type="checkbox" class="mt-0.5 h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
          <span class="text-xs leading-relaxed text-gray-600 dark:text-gray-300">Je confirme que ce résultat a été observé et peut être publié.</span>
        </label>
      </div>
    </div>

    <details class="mt-4 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
      <summary class="min-h-11 cursor-pointer text-sm font-semibold leading-[2.75rem] text-gray-800 dark:text-gray-200">Détails complémentaires facultatifs</summary>
      <div class="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <label for="case-approach" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Approche</label>
          <textarea id="case-approach" v-model="model.approach" rows="5" maxlength="6000" class="input-field resize-y" placeholder="Comment le travail a-t-il été organisé ?" />
        </div>
        <div>
          <label for="case-solution" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Solution réalisée</label>
          <textarea id="case-solution" v-model="model.solution" rows="5" maxlength="6000" class="input-field resize-y" placeholder="Décrivez précisément ce qui a été livré." />
        </div>
      </div>
    </details>

    <div class="mt-4">
      <label for="case-deliverables" class="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Livrables</label>
      <input id="case-deliverables" v-model="model.deliverables" class="input-field" placeholder="UX/UI, développement Nuxt, CMS, mise en ligne">
      <p class="mt-1 text-xs text-gray-400">Séparez les éléments par des virgules.</p>
    </div>

    <details class="mt-5 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
      <summary class="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-200">
        Résultats chiffrés vérifiés
        <span class="text-xs font-normal text-gray-400">{{ model.results.length }}/6</span>
      </summary>
      <p class="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Ajoutez uniquement des mesures que vous pouvez justifier.</p>
      <div class="space-y-3">
        <fieldset v-for="(_result, index) in model.results" :key="index" class="rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
          <legend class="px-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Mesure {{ index + 1 }}</legend>
          <div class="grid gap-2 sm:grid-cols-[9rem_1fr]">
            <input v-model="model.results[index]!.value" class="input-field" maxlength="40" :aria-label="`Valeur de la mesure ${index + 1}`" placeholder="Ex. 1,2 s">
            <input v-model="model.results[index]!.label" class="input-field" maxlength="120" :aria-label="`Libellé de la mesure ${index + 1}`" placeholder="Ex. Temps de chargement mesuré">
          </div>
          <input v-model="model.results[index]!.measurementContext" class="input-field mt-2" maxlength="240" :aria-label="`Contexte de mesure ${index + 1}`" placeholder="Période ou contexte de mesure (si disponible)">
          <textarea v-model="model.results[index]!.evidenceNote" rows="2" maxlength="1000" class="input-field mt-2 resize-y" :aria-label="`Note de preuve privée ${index + 1}`" placeholder="Source ou note de vérification — privée, jamais publiée" />
          <div class="mt-2 flex flex-wrap items-start justify-between gap-2">
            <label class="flex min-h-11 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input v-model="model.results[index]!.approved" type="checkbox" class="h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">
              Mesure vérifiée et approuvée
            </label>
            <button type="button" class="min-h-11 rounded-lg px-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" :aria-label="`Supprimer le résultat ${index + 1}`" @click="model.results.splice(index, 1)">Supprimer</button>
          </div>
        </fieldset>
      </div>
      <button v-if="model.results.length < 6" type="button" class="mt-3 min-h-11 rounded-lg border border-violet-200 px-4 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-400/20 dark:text-violet-200 dark:hover:bg-violet-500/10" @click="addResult">Ajouter un résultat</button>
    </details>

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
