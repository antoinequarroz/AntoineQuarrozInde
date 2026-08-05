<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const auth = useAuthStore()
const data = ref<any>(null)
const pending = ref(false)
async function loadAnalytics() {
  pending.value = true
  try { data.value = await $fetch('/api/admin/marketing-analytics', { headers: auth.authHeader() }) }
  finally { pending.value = false }
}
onMounted(loadAnalytics)
const labels: Record<string, string> = {
  hero_view: 'Visites de la landing page', hero_cta_primary_click: 'Clics CTA principal',
  hero_cta_secondary_click: 'Clics portfolio', services_cta_click: 'Clics services',
  booking_calendar_click: 'Ouvertures du calendrier', booking_fallback_click: 'Demandes de rendez-vous',
  project_case_study_view: 'Études de cas consultées', project_case_study_click: 'Clics études de cas',
  project_live_click: 'Clics vers les projets en ligne', project_code_click: 'Clics vers le code',
  contact_email_click: 'Clics e-mail', contact_form_submit_success: 'Formulaires envoyés',
  contact_form_submit_error: 'Erreurs formulaire',
}
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#111118]">
      <div class="flex flex-wrap items-start justify-between gap-4"><div><span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Acquisition</span><h1 class="mt-3 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Performance commerciale</h1><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Parcours des visiteurs sur les 30 derniers jours.</p></div><button class="min-h-11 rounded-lg bg-gray-100 px-4 text-sm font-semibold dark:bg-white/[0.08]" :disabled="pending" @click="loadAnalytics">Rafraîchir</button></div>
    </section>
    <template v-if="data">
      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <article v-for="metric in [{ label: 'Visites', value: data.totals.views }, { label: 'Clics contact', value: data.totals.primaryClicks }, { label: 'Calendrier', value: data.totals.bookingClicks }, { label: 'Projets consultés', value: data.totals.projectViews }, { label: 'Demandes reçues', value: data.totals.contactSuccess }, { label: 'Conversion', value: `${data.rates.heroToContact} %` }]" :key="metric.label" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111118]"><p class="text-xs font-medium text-gray-500">{{ metric.label }}</p><p class="mt-2 font-display text-2xl font-semibold">{{ metric.value }}</p></article>
      </section>
      <section class="grid gap-5 lg:grid-cols-2">
        <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]"><h2 class="font-semibold">Entonnoir</h2><div class="mt-4 space-y-3"><div v-for="row in data.byEvent" :key="row.event" class="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 text-sm last:border-0 dark:border-white/[0.06]"><span class="text-gray-600 dark:text-gray-300">{{ labels[row.event] || row.event }}</span><strong>{{ row.total }}</strong></div></div></article>
        <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]"><h2 class="font-semibold">Test du message d’accueil</h2><div class="mt-4 grid grid-cols-2 gap-3"><div v-for="variant in data.variants" :key="variant.variant" class="rounded-lg bg-gray-50 p-4 dark:bg-white/[0.04]"><p class="text-sm font-semibold">Version {{ variant.variant }}</p><p class="mt-3 text-2xl font-semibold">{{ variant.conversionRate }} %</p><p class="mt-1 text-xs text-gray-500">{{ variant.clicks }} clics / {{ variant.views }} vues</p></div></div><p class="mt-4 text-xs text-gray-500">Gardez une version seulement lorsqu’un volume suffisant permet une comparaison fiable.</p></article>
      </section>
    </template>
  </div>
</template>
