<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'article' | 'footer'
}>(), {
  variant: 'article',
})

const { locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { track } = useMarketing()
const instanceId = useId()
const asideId = computed(() => props.variant === 'footer' ? 'footer-newsletter' : 'newsletter')
const titleId = computed(() => `newsletter-title-${instanceId}`)
const emailId = computed(() => `newsletter-email-${instanceId}`)
const websiteId = computed(() => `newsletter-website-${instanceId}`)
const isFooter = computed(() => props.variant === 'footer')

const copy = computed(() => locale.value === 'en' ? {
  eyebrow: 'Newsletter',
  title: 'Receive the next practical guides',
  body: 'New articles about websites, business tools and digital projects. No automatic sales sequence.',
  fieldLabel: 'Newsletter address',
  placeholder: 'you@example.com',
  consent: 'I agree to receive the next articles and can unsubscribe at any time.',
  submit: 'Subscribe',
  sending: 'Subscribing…',
  success: 'Your subscription is saved. I’ll email you when the next articles are published.',
  error: 'Unable to save your subscription. Please try again.',
  privacy: 'Privacy policy',
} : locale.value === 'de' ? {
  eyebrow: 'Newsletter',
  title: 'Die nächsten Praxisartikel erhalten',
  body: 'Neue Artikel über Websites, Business-Tools und digitale Projekte. Keine automatische Verkaufsserie.',
  fieldLabel: 'Adresse für den Newsletter',
  placeholder: 'sie@beispiel.ch',
  consent: 'Ich möchte die nächsten Artikel erhalten und kann mich jederzeit abmelden.',
  submit: 'Abonnieren',
  sending: 'Anmeldung läuft…',
  success: 'Ihre Anmeldung ist gespeichert. Ich schreibe Ihnen, wenn die nächsten Artikel erscheinen.',
  error: 'Die Anmeldung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
  privacy: 'Datenschutzerklärung',
} : {
  eyebrow: 'Newsletter',
  title: 'Recevez les prochains guides pratiques',
  body: 'Mes nouveaux articles sur les sites web, les outils métier et les projets numériques. Sans séquence commerciale automatique.',
  fieldLabel: 'Adresse pour la newsletter',
  placeholder: 'vous@exemple.ch',
  consent: 'J’accepte de recevoir les prochains articles et je peux me désinscrire à tout moment.',
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
  <aside
    :id="asideId"
    class="overflow-hidden rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-purple-50 shadow-sm dark:border-violet-400/15 dark:from-violet-500/10 dark:via-[#111118] dark:to-purple-500/10"
    :class="isFooter ? 'p-5 sm:p-6' : 'mt-12 p-6 sm:p-8'"
    :aria-labelledby="titleId"
  >
    <p class="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">{{ copy.eyebrow }}</p>
    <h2 :id="titleId" class="mt-3 font-display font-bold text-gray-950 dark:text-white" :class="isFooter ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'">{{ copy.title }}</h2>
    <p class="mt-3 max-w-2xl text-gray-600 dark:text-gray-300" :class="isFooter ? 'text-sm leading-6' : 'leading-7'">{{ copy.body }}</p>

    <p v-if="status === 'success'" role="status" class="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{{ copy.success }}</p>
    <form v-else class="mt-6" @submit.prevent="subscribe">
      <div class="flex flex-col gap-3 sm:flex-row">
        <label :for="emailId" class="sr-only">{{ copy.fieldLabel }}</label>
        <input :id="emailId" v-model="email" type="email" autocomplete="email" required maxlength="254" :placeholder="copy.placeholder" class="min-h-12 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-gray-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
        <button type="submit" class="min-h-12 rounded-xl bg-violet-600 px-6 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="status === 'sending' || !consent">
          {{ status === 'sending' ? copy.sending : copy.submit }}
        </button>
      </div>
      <div class="sr-only" aria-hidden="true">
        <label :for="websiteId">Site web</label>
        <input :id="websiteId" v-model="website" type="text" tabindex="-1" autocomplete="off" class="hidden">
      </div>
      <label class="relative mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
        <input v-model="consent" type="checkbox" required class="peer absolute -left-3 -top-2 h-11 w-11 cursor-pointer opacity-0">
        <span aria-hidden="true" class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-white transition peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-focus-visible:ring-offset-2 dark:border-white/30 dark:bg-white/10">
          <svg class="h-3 w-3 opacity-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 8 3 3 7-7" /></svg>
        </span>
        <span>{{ copy.consent }} <NuxtLink :to="localePath('/confidentialite')" class="inline-flex min-h-11 items-center font-semibold text-violet-700 underline underline-offset-4 dark:text-violet-300">{{ copy.privacy }}</NuxtLink>.</span>
      </label>
      <p v-if="status === 'error'" role="alert" class="mt-4 text-sm font-medium text-red-700 dark:text-red-300">{{ copy.error }}</p>
    </form>
  </aside>
</template>
