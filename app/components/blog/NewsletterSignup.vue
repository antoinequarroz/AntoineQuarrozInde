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
const { trackPostHog } = usePostHogEvent()
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
  success: 'Please check your inbox and confirm your address. You’ll then receive one welcome email and the next articles.',
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
  success: 'Bitte prüfen Sie Ihren Posteingang und bestätigen Sie Ihre Adresse. Danach erhalten Sie einmalig eine Willkommens-E-Mail und die nächsten Artikel.',
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
  success: 'Consultez votre boîte mail et confirmez votre adresse. Vous recevrez ensuite un seul e-mail de bienvenue, puis les prochains articles.',
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
    trackPostHog('newsletter_subscribed', { source_path: route.path, placement: props.variant })
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
    class="relative overflow-hidden"
    :class="isFooter
      ? 'rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 p-6 shadow-[0_24px_70px_-32px_rgba(124,58,237,0.72)] sm:p-8 lg:p-10'
      : 'mt-12 rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-6 shadow-sm dark:border-violet-400/15 dark:from-violet-500/10 dark:via-[#111118] dark:to-purple-500/10 sm:p-8'"
    :aria-labelledby="titleId"
  >
    <template v-if="isFooter">
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div class="absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/15" />
        <div class="absolute -right-3 -top-10 h-36 w-36 rounded-full border border-white/10" />
        <div class="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </div>
    </template>

    <div :class="isFooter ? 'relative grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(22rem,1.15fr)] lg:items-center lg:gap-12' : ''">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em]" :class="isFooter ? 'text-violet-100' : 'text-violet-600 dark:text-violet-300'">{{ copy.eyebrow }}</p>
        <h2 :id="titleId" class="mt-3 font-display font-bold" :class="isFooter ? 'max-w-xl text-2xl leading-tight text-white sm:text-3xl' : 'text-2xl text-gray-950 dark:text-white sm:text-3xl'">{{ copy.title }}</h2>
        <p class="mt-3 max-w-2xl" :class="isFooter ? 'text-sm leading-6 text-violet-50/85 sm:text-base' : 'leading-7 text-gray-600 dark:text-gray-300'">{{ copy.body }}</p>
      </div>

      <div>
        <p v-if="status === 'success'" role="status" class="rounded-2xl px-4 py-3 font-medium" :class="isFooter ? 'bg-white/15 text-white ring-1 ring-inset ring-white/20' : 'mt-6 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200'">{{ copy.success }}</p>
        <form v-else :class="isFooter ? '' : 'mt-6'" @submit.prevent="subscribe">
          <div class="flex flex-col gap-3 sm:flex-row">
            <label :for="emailId" class="sr-only">{{ copy.fieldLabel }}</label>
            <input :id="emailId" v-model="email" type="email" autocomplete="email" required maxlength="254" :placeholder="copy.placeholder" class="min-h-12 flex-1 rounded-xl px-4 text-gray-950 outline-none transition-[border-color,box-shadow,background-color] duration-150" :class="isFooter ? 'border border-white/25 bg-white shadow-sm placeholder:text-gray-400 focus:border-white focus:ring-4 focus:ring-white/20' : 'border border-gray-200 bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white'">
            <button type="submit" class="min-h-12 rounded-xl px-6 font-semibold transition-[background-color,opacity,transform] duration-150 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100" :class="isFooter ? 'bg-gray-950 text-white shadow-sm hover:bg-gray-800' : 'bg-violet-600 text-white hover:bg-violet-700'" :disabled="status === 'sending' || !consent">
              {{ status === 'sending' ? copy.sending : copy.submit }}
            </button>
          </div>
          <div class="sr-only" aria-hidden="true">
            <label :for="websiteId">Site web</label>
            <input :id="websiteId" v-model="website" type="text" tabindex="-1" autocomplete="off" class="hidden">
          </div>
          <label class="relative mt-3 flex cursor-pointer items-start gap-3 text-sm leading-6" :class="isFooter ? 'text-violet-50/85' : 'text-gray-600 dark:text-gray-300'">
            <input v-model="consent" type="checkbox" required class="peer absolute -left-3 -top-2 h-11 w-11 cursor-pointer opacity-0">
            <span aria-hidden="true" class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-white transition-[background-color,border-color,box-shadow] duration-150 peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2" :class="isFooter ? 'border-white/45 bg-white/10 peer-checked:border-white peer-checked:bg-white peer-checked:text-violet-700 peer-focus-visible:ring-white peer-focus-visible:ring-offset-violet-600' : 'border-gray-300 bg-white peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-focus-visible:ring-violet-500 dark:border-white/30 dark:bg-white/10'">
              <svg class="h-3 w-3 opacity-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 8 3 3 7-7" /></svg>
            </span>
            <span>{{ copy.consent }} <NuxtLink :to="localePath('/confidentialite')" class="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" :class="isFooter ? 'text-white' : 'text-violet-700 dark:text-violet-300'">{{ copy.privacy }}</NuxtLink>.</span>
          </label>
          <p v-if="status === 'error'" role="alert" class="mt-4 text-sm font-medium" :class="isFooter ? 'text-red-100' : 'text-red-700 dark:text-red-300'">{{ copy.error }}</p>
        </form>
      </div>
    </div>
  </aside>
</template>
