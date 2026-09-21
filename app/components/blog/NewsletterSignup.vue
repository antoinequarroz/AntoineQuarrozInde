<script setup lang="ts">
const { locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { track } = useMarketing()

const copy = computed(() => locale.value === 'en' ? {
  eyebrow: 'Newsletter',
  title: 'Receive the next practical guides',
  body: 'New articles about websites, business tools and digital projects. No automatic sales sequence.',
  placeholder: 'you@example.com',
  consent: 'I agree to receive the next articles by email and can unsubscribe at any time.',
  submit: 'Subscribe',
  sending: 'Subscribing…',
  success: 'Your subscription is saved. I’ll email you when the next articles are published.',
  error: 'Unable to save your subscription. Please try again.',
  privacy: 'Privacy policy',
} : locale.value === 'de' ? {
  eyebrow: 'Newsletter',
  title: 'Die nächsten Praxisartikel erhalten',
  body: 'Neue Artikel über Websites, Business-Tools und digitale Projekte. Keine automatische Verkaufsserie.',
  placeholder: 'sie@beispiel.ch',
  consent: 'Ich möchte die nächsten Artikel per E-Mail erhalten und kann mich jederzeit abmelden.',
  submit: 'Abonnieren',
  sending: 'Anmeldung läuft…',
  success: 'Ihre Anmeldung ist gespeichert. Ich schreibe Ihnen, wenn die nächsten Artikel erscheinen.',
  error: 'Die Anmeldung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
  privacy: 'Datenschutzerklärung',
} : {
  eyebrow: 'Newsletter',
  title: 'Recevez les prochains guides pratiques',
  body: 'Mes nouveaux articles sur les sites web, les outils métier et les projets numériques. Sans séquence commerciale automatique.',
  placeholder: 'vous@exemple.ch',
  consent: 'J’accepte de recevoir les prochains articles par e-mail et je peux me désinscrire à tout moment.',
  submit: 'S’abonner',
  sending: 'Inscription…',
  success: 'Votre inscription est enregistrée. Je vous écrirai lors de la publication des prochains articles.',
  error: 'L’inscription n’a pas pu être enregistrée. Réessayez dans un instant.',
  privacy: 'Politique de confidentialité',
})

const email = ref('')
const consent = ref(false)
const website = ref('')
const startedAt = ref(Date.now())
const status = ref<'idle' | 'sending' | 'success' | 'error'>('idle')

async function subscribe() {
  if (status.value === 'sending' || !consent.value) return
  status.value = 'sending'
  try {
    await $fetch('/api/newsletter', {
      method: 'POST',
      body: {
        email: email.value,
        consent: consent.value,
        locale: locale.value,
        sourcePath: route.path,
        website: website.value,
        startedAt: startedAt.value,
      },
    })
    status.value = 'success'
    track('newsletter_signup', { source: route.path })
    email.value = ''
    consent.value = false
  }
  catch {
    status.value = 'error'
    startedAt.value = Date.now()
  }
}
</script>

<template>
  <aside id="newsletter" class="mt-12 overflow-hidden rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-6 shadow-sm dark:border-violet-400/15 dark:from-violet-500/10 dark:via-[#111118] dark:to-purple-500/10 sm:p-8" aria-labelledby="newsletter-title">
    <p class="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">{{ copy.eyebrow }}</p>
    <h2 id="newsletter-title" class="mt-3 font-display text-2xl font-bold text-gray-950 dark:text-white sm:text-3xl">{{ copy.title }}</h2>
    <p class="mt-3 max-w-2xl leading-7 text-gray-600 dark:text-gray-300">{{ copy.body }}</p>

    <p v-if="status === 'success'" role="status" class="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{{ copy.success }}</p>
    <form v-else class="mt-6" @submit.prevent="subscribe">
      <div class="flex flex-col gap-3 sm:flex-row">
        <label for="newsletter-email" class="sr-only">E-mail</label>
        <input id="newsletter-email" v-model="email" type="email" autocomplete="email" required maxlength="254" :placeholder="copy.placeholder" class="min-h-12 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-gray-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
        <button type="submit" class="min-h-12 rounded-xl bg-violet-600 px-6 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="status === 'sending' || !consent">
          {{ status === 'sending' ? copy.sending : copy.submit }}
        </button>
      </div>
      <div class="sr-only" aria-hidden="true">
        <label for="newsletter-website">Site web</label>
        <input id="newsletter-website" v-model="website" type="text" tabindex="-1" autocomplete="off">
      </div>
      <label class="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
        <input v-model="consent" type="checkbox" required class="mt-1 h-4 w-4 rounded border-gray-300 accent-violet-600">
        <span>{{ copy.consent }} <NuxtLink :to="localePath('/confidentialite')" class="font-semibold text-violet-700 underline underline-offset-4 dark:text-violet-300">{{ copy.privacy }}</NuxtLink>.</span>
      </label>
      <p v-if="status === 'error'" role="alert" class="mt-4 text-sm font-medium text-red-700 dark:text-red-300">{{ copy.error }}</p>
    </form>
  </aside>
</template>
