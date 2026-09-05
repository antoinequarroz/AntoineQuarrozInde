<script setup lang="ts">
const { locale } = useI18n()
const config = useRuntimeConfig()
const { track } = useMarketing()

const bookingUrl = computed(() => {
  const value = String(config.public.calLink || '').trim()
  return /^https:\/\/(?:www\.)?cal\.com\//i.test(value) ? value : ''
})

const content = computed(() => {
  if (locale.value === 'en') return {
    title: 'A 30-minute call about your project',
    desc: 'Tell me where you are and what you want to build. You will leave with a clear next step.',
    duration: '30 min', remote: 'Video call', noCommitment: 'No commitment', cta: 'Choose a time',
    fallbackTitle: 'Booking opens on request',
    fallbackDesc: 'Send me a short message and I will suggest a few suitable times.',
    fallbackCta: 'Describe your project',
  }
  if (locale.value === 'de') return {
    title: '30 Minuten für Ihr Projekt',
    desc: 'Erzählen Sie mir, wo Sie stehen und was Sie umsetzen möchten. Danach ist der nächste Schritt klar.',
    duration: '30 Min.', remote: 'Videogespräch', noCommitment: 'Unverbindlich', cta: 'Termin auswählen',
    fallbackTitle: 'Terminvereinbarung auf Anfrage',
    fallbackDesc: 'Senden Sie mir eine kurze Nachricht. Ich schlage Ihnen passende Termine vor.',
    fallbackCta: 'Projekt beschreiben',
  }
  return {
    title: '30 minutes pour parler de votre projet',
    desc: 'Expliquez-moi où vous en êtes et ce que vous souhaitez créer. Vous repartirez avec une prochaine étape claire.',
    duration: '30 min', remote: 'Visio', noCommitment: 'Sans engagement', cta: 'Choisir un créneau',
    fallbackTitle: 'Prise de rendez-vous sur demande',
    fallbackDesc: 'Envoyez-moi un court message et je vous proposerai quelques créneaux adaptés.',
    fallbackCta: 'Décrire mon projet',
  }
})
</script>

<template>
  <div class="card-glass flex h-full flex-col gap-5 p-4 max-[390px]:p-3.5">
    <div>
      <h3 class="font-display text-base font-semibold leading-tight text-gray-900 dark:text-white md:text-lg">{{ content.title }}</h3>
      <p class="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{{ content.desc }}</p>
    </div>

    <div class="relative flex flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-violet-500/15 bg-white/60 p-4 dark:border-violet-400/20 dark:bg-white/[0.04]">
      <div class="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl" />
      <div class="relative grid grid-cols-3 gap-2">
        <div class="rounded-xl bg-violet-500/[0.07] px-2.5 py-3 text-center dark:bg-violet-400/10">
          <svg class="mx-auto h-5 w-5 text-violet-600 dark:text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p class="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-200">{{ content.duration }}</p>
        </div>
        <div class="rounded-xl bg-cyan-500/[0.07] px-2.5 py-3 text-center dark:bg-cyan-400/10">
          <svg class="mx-auto h-5 w-5 text-cyan-600 dark:text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          <p class="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-200">{{ content.remote }}</p>
        </div>
        <div class="rounded-xl bg-violet-500/[0.07] px-2.5 py-3 text-center dark:bg-violet-400/10">
          <svg class="mx-auto h-5 w-5 text-violet-600 dark:text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
          <p class="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-200">{{ content.noCommitment }}</p>
        </div>
      </div>
      <div v-if="!bookingUrl" class="relative mt-5 rounded-xl border border-violet-500/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/15">
        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ content.fallbackTitle }}</p>
        <p class="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ content.fallbackDesc }}</p>
      </div>
    </div>

    <a v-if="bookingUrl" :href="bookingUrl" target="_blank" rel="noopener noreferrer" class="btn-primary w-full justify-center rounded-xl py-3 text-sm" @click="track('booking_calendar_click')">{{ content.cta }}</a>
    <a v-else href="#contact-form" class="btn-primary w-full justify-center rounded-xl py-3 text-sm" @click="track('booking_fallback_click')">{{ content.fallbackCta }}</a>
    <a href="mailto:info@antoinequarroz.ch" class="flex items-center justify-center gap-2 text-xs text-gray-500 transition-colors duration-150 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-300" @click="track('contact_email_click')">info@antoinequarroz.ch</a>
  </div>
</template>
