<script setup lang="ts">
const { locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { track } = useMarketing()
const { trackPostHog } = usePostHogEvent()

const copy = computed(() => locale.value === 'en' ? {
  eyebrow: 'Complimentary diagnostic',
  title: 'Is this process costing you too much time?',
  body: 'Show me the spreadsheet, repetitive task or tool that is holding you back. I’ll tell you whether a simple improvement, automation or custom application makes sense.',
  cta: 'Get an initial assessment',
  trust: 'No commitment · Personal reply within one business day · Confidential exchange',
} : locale.value === 'de' ? {
  eyebrow: 'Kostenlose Erstdiagnose',
  title: 'Kostet Sie dieser Prozess zu viel Zeit?',
  body: 'Zeigen Sie mir die Tabelle, wiederkehrende Aufgabe oder das Werkzeug, das Sie ausbremst. Sie erhalten eine klare Einschätzung zur passenden Lösung.',
  cta: 'Erste Einschätzung erhalten',
  trust: 'Unverbindlich · Persönliche Antwort innerhalb eines Werktags · Vertraulicher Austausch',
} : {
  eyebrow: 'Premier diagnostic offert',
  title: 'Ce processus vous fait perdre trop de temps ?',
  body: 'Présentez-moi le tableur, la tâche répétitive ou l’outil qui vous freine. Je vous dirai si une amélioration simple, une automatisation ou une application sur mesure est réellement pertinente.',
  cta: 'Recevoir un premier avis',
  trust: 'Sans engagement · Réponse personnelle sous un jour ouvrable · Échange confidentiel',
})

function trackDiagnosticClick() {
  const properties = { placement: 'article', source_path: route.path }
  track('diagnostic_cta_click', properties)
  trackPostHog('diagnostic_cta_clicked', properties)
}
</script>

<template>
  <aside class="not-prose relative mt-12 overflow-hidden rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 shadow-sm dark:border-violet-400/15 dark:from-violet-500/10 dark:via-[#111118] dark:to-cyan-500/10 sm:p-8">
    <div class="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-400/15 blur-3xl" aria-hidden="true" />
    <div class="relative">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">{{ copy.eyebrow }}</p>
      <h2 class="mt-3 font-display text-2xl font-bold leading-tight text-gray-950 dark:text-white sm:text-3xl">{{ copy.title }}</h2>
      <p class="mt-3 max-w-2xl leading-7 text-gray-600 dark:text-gray-300">{{ copy.body }}</p>
      <NuxtLink :to="localePath('/#contact-form')" class="btn-primary mt-6 min-h-11 justify-center sm:w-auto" @click="trackDiagnosticClick">
        {{ copy.cta }}
      </NuxtLink>
      <p class="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">{{ copy.trust }}</p>
    </div>
  </aside>
</template>
