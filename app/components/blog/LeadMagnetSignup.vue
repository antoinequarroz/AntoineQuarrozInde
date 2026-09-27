<script setup lang="ts">
const props = withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const route = useRoute()
const localePath = useLocalePath()
const { track } = useMarketing()
const { trackPostHog } = usePostHogEvent()
const instanceId = useId()
const emailId = `lead-magnet-email-${instanceId}`
const websiteId = `lead-magnet-website-${instanceId}`
const titleId = `lead-magnet-title-${instanceId}`
const resourceSlug = 'checklist-ia-pme'

const email = ref('')
const consent = ref(false)
const website = ref('')
const startedAt = ref(Date.now())
const status = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const downloadUrl = ref('')

onMounted(() => {
  const properties = { slug: resourceSlug, source_path: route.path, placement: props.compact ? 'article' : 'landing' }
  track('lead_magnet_view', properties)
  trackPostHog('lead_magnet_viewed', properties)
})

async function subscribe() {
  if (status.value === 'sending' || !consent.value) return
  status.value = 'sending'
  try {
    const result = await $fetch<{ downloadUrl?: string }>('/api/newsletter', {
      method: 'POST',
      body: {
        email: email.value,
        consent: consent.value,
        locale: 'fr',
        sourcePath: route.path,
        resourceSlug,
        website: website.value,
        startedAt: startedAt.value,
      },
    })
    if (!result.downloadUrl) throw new Error('download_unavailable')
    downloadUrl.value = result.downloadUrl
    status.value = 'success'
    const properties = { slug: resourceSlug, source_path: route.path, placement: props.compact ? 'article' : 'landing' }
    track('lead_magnet_submit', properties)
    trackPostHog('lead_magnet_submitted', properties)
    email.value = ''
    consent.value = false
  }
  catch {
    status.value = 'error'
    startedAt.value = Date.now()
  }
}

function trackDownload() {
  const properties = { slug: resourceSlug, source_path: route.path, placement: props.compact ? 'article' : 'landing' }
  track('lead_magnet_delivered', properties)
  trackPostHog('lead_magnet_delivered', properties)
}
</script>

<template>
  <aside
    class="not-prose relative overflow-hidden rounded-[2rem] border border-amber-300/30 bg-[#09101e] text-white shadow-[0_28px_80px_-40px_rgba(8,15,29,0.8)]"
    :class="compact ? 'mt-12 p-6 sm:p-8' : 'p-7 sm:p-10 lg:p-12'"
    :aria-labelledby="titleId"
  >
    <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-amber-300/30" aria-hidden="true" />
    <div class="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border border-amber-300/20" aria-hidden="true" />
    <div class="relative grid items-center gap-8" :class="compact ? 'lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]' : 'lg:grid-cols-[minmax(0,1.1fr)_minmax(21rem,0.9fr)] lg:gap-14'">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#e2a35d]">Checklist gratuite · 8 pages</p>
        <h2 :id="titleId" class="mt-3 font-display font-bold leading-tight" :class="compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'">
          Lancez un pilote IA de 30 jours sans exposer vos données
        </h2>
        <p class="mt-4 max-w-2xl leading-7 text-slate-300">
          Choisissez le bon cas d’usage, classez les données, contrôlez l’outil et mesurez le résultat avant de décider.
        </p>
        <ul class="mt-5 grid gap-2 text-sm text-slate-200 sm:grid-cols-2" aria-label="Contenu de la checklist">
          <li class="flex gap-2"><span class="text-[#e2a35d]">✓</span> Grille de sélection</li>
          <li class="flex gap-2"><span class="text-[#e2a35d]">✓</span> Classification des données</li>
          <li class="flex gap-2"><span class="text-[#e2a35d]">✓</span> Plan semaine par semaine</li>
          <li class="flex gap-2"><span class="text-[#e2a35d]">✓</span> Tableau avant/après</li>
        </ul>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur sm:p-6">
        <div v-if="status === 'success'" role="status">
          <p class="font-display text-xl font-bold">Votre checklist est prête.</p>
          <p class="mt-2 text-sm leading-6 text-slate-300">Le lien reste valable pendant 24 heures. LuMail vous demandera aussi de confirmer votre inscription.</p>
          <a :href="downloadUrl" download class="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#e2a35d] px-5 font-bold text-[#09101e] transition hover:bg-[#efbd83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" @click="trackDownload">
            Télécharger le PDF
          </a>
        </div>
        <form v-else @submit.prevent="subscribe">
          <label :for="emailId" class="text-sm font-semibold">Votre adresse e-mail</label>
          <input :id="emailId" v-model="email" type="email" autocomplete="email" required maxlength="254" placeholder="vous@entreprise.ch" class="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white px-4 text-[#09101e] outline-none placeholder:text-slate-400 focus:border-[#e2a35d] focus:ring-4 focus:ring-[#e2a35d]/20">
          <div class="sr-only" aria-hidden="true">
            <label :for="websiteId">Site web</label>
            <input :id="websiteId" v-model="website" type="text" tabindex="-1" autocomplete="off">
          </div>
          <label class="relative mt-4 flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-300">
            <input v-model="consent" type="checkbox" required class="peer absolute -left-3 -top-2 h-11 w-11 cursor-pointer opacity-0">
            <span aria-hidden="true" class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/40 bg-white/10 text-[#09101e] peer-checked:border-[#e2a35d] peer-checked:bg-[#e2a35d] peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[#e2a35d] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#09101e]">
              <svg class="h-3 w-3 opacity-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 8 3 3 7-7" /></svg>
            </span>
            <span>J’accepte de recevoir cette checklist, l’e-mail de bienvenue et les prochains guides. Désinscription possible à tout moment. <NuxtLink :to="localePath('/confidentialite')" class="font-semibold text-white underline underline-offset-4">Confidentialité</NuxtLink>.</span>
          </label>
          <button type="submit" class="mt-5 min-h-12 w-full rounded-xl bg-[#e2a35d] px-5 font-bold text-[#09101e] transition hover:bg-[#efbd83] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50" :disabled="status === 'sending' || !consent">
            {{ status === 'sending' ? 'Préparation…' : 'Recevoir la checklist' }}
          </button>
          <p class="mt-3 text-center text-xs text-slate-400">PDF livré immédiatement · aucun paiement</p>
          <p v-if="status === 'error'" role="alert" class="mt-3 text-sm font-medium text-red-300">La checklist n’a pas pu être préparée. Réessayez dans un instant.</p>
        </form>
      </div>
    </div>
  </aside>
</template>
