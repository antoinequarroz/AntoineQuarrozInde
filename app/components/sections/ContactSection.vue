<script setup lang="ts">
import { classifyAcquisition } from '~~/shared/utils/acquisitionChannel'

const { t, locale } = useI18n()
const { track } = useMarketing()
const { trackPostHog } = usePostHogEvent()
const runtimeConfig = useRuntimeConfig()
const turnstileSiteKey = runtimeConfig.public.turnstileSiteKey as string
const isClient = import.meta.client
const isLocalhost = isClient
  ? ['localhost', '127.0.0.1'].includes(window.location.hostname)
  : false
const shouldUseTurnstile = !!turnstileSiteKey && !isLocalhost
const turnstileReady = ref(false)
const turnstileShouldLoad = ref(false)
const sectionRef = shallowRef<HTMLElement | null>(null)
const selectedService = ref('')
const errorMessage = ref('')
const formOpen = ref(false)
const detailsOpen = ref(false)
const formContainerRef = ref<HTMLElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)
const submissionId = ref('')

const form = reactive({
  name: '',
  email: '',
  subject: '',
  budget: '',
  timeline: '',
  message: '',
  website: '',
  startedAt: Date.now(),
})
const turnstileToken = ref('')
const turnstileContainer = ref<HTMLElement | null>(null)
const turnstileWidgetId = ref<string | null>(null)

type FormStatus = 'idle' | 'sending' | 'success' | 'error'
const status = ref<FormStatus>('idle')
const attribution = ref(captureLeadAttribution())

useHead(() => ({
  script: shouldUseTurnstile && turnstileShouldLoad.value
    ? [{ src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true, defer: true }]
    : [],
}))

let turnstileObserver: IntersectionObserver | null = null
let turnstilePollTimer: ReturnType<typeof setTimeout> | null = null
let turnstilePollAttempts = 0

function beginTurnstileLoad() {
  if (!shouldUseTurnstile || turnstileShouldLoad.value) return
  turnstileShouldLoad.value = true
  turnstileReady.value = true

  const waitForTurnstile = () => {
    if ((window as any).turnstile) {
      renderTurnstile()
      return
    }
    turnstilePollAttempts += 1
    if (turnstilePollAttempts < 80) turnstilePollTimer = setTimeout(waitForTurnstile, 150)
  }
  waitForTurnstile()
}

function handleServiceSelected(event: Event) {
  const detail = (event as CustomEvent<{ title?: string }>).detail
  const title = detail?.title?.trim()
  if (!title) return

  selectedService.value = title
  if (!form.subject.trim()) form.subject = `${t('contact.form.project_prefix')} ${title}`
  openContactForm('service')
}

async function openContactForm(source = 'cta') {
  const wasClosed = !formOpen.value
  formOpen.value = true
  if (wasClosed) track('contact_form_open', { source })
  await nextTick()
  focusContactForm()
}

function focusContactForm() {
  nameInputRef.value?.focus({ preventScroll: true })
  formContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function handleContactOpen(event: Event) {
  const source = (event as CustomEvent<{ source?: string }>).detail?.source || 'fallback'
  openContactForm(source)
}

function toggleProjectDetails() {
  detailsOpen.value = !detailsOpen.value
  if (detailsOpen.value) track('contact_details_open')
}

function currentSubmissionId() {
  if (!submissionId.value) submissionId.value = crypto.randomUUID()
  return submissionId.value
}

const renderTurnstile = () => {
  if (!shouldUseTurnstile || !turnstileContainer.value) return
  const turnstile = (window as any).turnstile
  if (!turnstile || turnstileWidgetId.value) return

  turnstileWidgetId.value = turnstile.render(turnstileContainer.value, {
    sitekey: turnstileSiteKey,
    callback: (token: string) => {
      turnstileToken.value = token
    },
    'expired-callback': () => {
      turnstileToken.value = ''
    },
    'error-callback': () => {
      turnstileToken.value = ''
    },
  })
}

onMounted(() => {
  window.addEventListener('aq:service-selected', handleServiceSelected)
  window.addEventListener('aq:contact-open', handleContactOpen)
  if (window.location.hash === '#contact-form') openContactForm('direct_link')
  if (!shouldUseTurnstile) return

  turnstileObserver = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return
    beginTurnstileLoad()
    turnstileObserver?.disconnect()
  }, { rootMargin: '900px 0px' })

  if (sectionRef.value) turnstileObserver.observe(sectionRef.value)
  else beginTurnstileLoad()
})

onBeforeUnmount(() => {
  window.removeEventListener('aq:service-selected', handleServiceSelected)
  window.removeEventListener('aq:contact-open', handleContactOpen)
  turnstileObserver?.disconnect()
  if (turnstilePollTimer) clearTimeout(turnstilePollTimer)
})

async function handleSubmit() {
  if (status.value === 'sending') return
  if (shouldUseTurnstile && !turnstileToken.value) {
    errorMessage.value = t('contact.form.captcha_error')
    status.value = 'error'
    setTimeout(() => { status.value = 'idle' }, 5000)
    return
  }
  errorMessage.value = ''
  status.value = 'sending'

  try {
    const contactResult = await $fetch<{ acquisitionChannel?: string }>('/api/contact', {
      method: 'POST',
      body: {
        submissionId: currentSubmissionId(),
        name: form.name,
        email: form.email,
        subject: form.subject,
        budget: form.budget || null,
        timeline: form.timeline || null,
        message: form.message,
        locale: locale.value,
        website: form.website,
        startedAt: form.startedAt,
        turnstileToken: turnstileToken.value,
        attribution: attribution.value,
      },
    })
    status.value = 'success'
    track('contact_form_submit_success')
    trackPostHog('contact_sent', {
      channel: contactResult.acquisitionChannel || classifyAcquisition({
        utmSource: attribution.value.utmSource,
        referrerHost: attribution.value.referrerHost,
      }),
    })
    form.name = ''
    form.email = ''
    form.subject = ''
    form.budget = ''
    form.timeline = ''
    form.message = ''
    form.website = ''
    form.startedAt = Date.now()
    submissionId.value = ''
    detailsOpen.value = false
    turnstileToken.value = ''
    if (turnstileWidgetId.value && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId.value)
    }
  }
  catch {
    errorMessage.value = t('contact.form.error')
    status.value = 'error'
    track('contact_form_submit_error')
  }

  setTimeout(() => { status.value = 'idle' }, 5000)
}

const EMAIL = 'info@antoinequarroz.ch'

const contactInfo = computed(() => [
  {
    icon: 'mail',
    value: EMAIL,
    href: `mailto:${EMAIL}`,
  },
  {
    icon: 'map-pin',
    value: t('contact.info.location'),
    href: null,
  },
  {
    icon: 'clock',
    value: t('contact.info.response'),
    href: null,
  },
  {
    icon: 'check-circle',
    value: t('contact.info.availability'),
    href: null,
  },
])
</script>

<template>
  <section id="contact" ref="sectionRef" class="section-padding section-surface">
    <div class="section-background">
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <!-- Header -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 30 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 600 } }"
        class="section-header"
      >
        <span class="badge mb-4">{{ t('contact.badge') }}</span>
        <h2 class="section-heading">
          <span class="block">{{ t('contact.title').split('\n')[0] }}</span>
          <span class="block section-heading-gradient">{{ t('contact.title').split('\n')[1] }}</span>
        </h2>
        <p class="section-subtitle mx-auto text-center">{{ t('contact.subtitle') }}</p>
      </div>

      <div class="grid items-stretch gap-6 lg:grid-cols-5 lg:gap-8 xl:gap-10">
        <!-- Calendrier de réservation -->
        <div
          v-motion
          :initial="{ opacity: 0, x: -30 }"
          :visible="{ opacity: 1, x: 0, transition: { duration: 600 } }"
          class="min-w-0 lg:col-span-2 lg:h-full"
        >
          <ClientOnly>
            <UiBookingCalendar />
            <template #fallback>
              <div class="card-glass h-full min-h-[360px] p-4 md:p-8" />
            </template>
          </ClientOnly>
        </div>

        <!-- Form -->
        <div
          v-motion
          :initial="{ opacity: 0, x: 30 }"
          :visible="{ opacity: 1, x: 0, transition: { delay: 100, duration: 600 } }"
          class="min-w-0 lg:col-span-3 lg:h-full"
        >
          <div id="contact-form" ref="formContainerRef" class="h-full scroll-mt-24">
            <Transition name="contact-reveal" mode="out-in" @after-enter="focusContactForm">
              <div v-if="!formOpen" key="contact-cta" class="card-glass flex h-full min-h-[280px] flex-col items-start justify-between p-4 sm:min-h-[320px] md:p-8">
                <div>
                  <span class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200" aria-hidden="true">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8z" /></svg>
                  </span>
                  <h3 class="mt-5 font-display text-2xl font-semibold text-gray-950 dark:text-white">{{ t('contact.form.open_title') }}</h3>
                  <p class="mt-3 max-w-lg text-sm leading-6 text-gray-600 dark:text-gray-300">{{ t('contact.form.open_description') }}</p>
                </div>
                <button type="button" class="btn-primary mt-8 min-h-11 w-full justify-center active:scale-[0.96]" @click="openContactForm('primary_cta')">
                  {{ t('contact.form.open_cta') }}
                </button>
              </div>
              <form v-else key="contact-form" class="card-glass h-full space-y-4 p-4 md:space-y-5 md:p-8" @submit.prevent="handleSubmit">
            <div v-if="selectedService" role="status" class="flex items-center gap-2 rounded-xl bg-violet-500/10 px-3 py-2.5 text-sm text-violet-800 dark:text-violet-100">
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span><strong>{{ t('contact.form.selected_service') }}</strong> {{ selectedService }}</span>
            </div>
            <div class="hidden" aria-hidden="true">
              <label for="contact-website">Website</label>
              <input
                id="contact-website"
                v-model="form.website"
                type="text"
                tabindex="-1"
                autocomplete="off"
              >
            </div>
            <div class="grid sm:grid-cols-2 gap-4 md:gap-5">
              <div>
                <label for="contact-name" class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5">
                  {{ t('contact.form.name') }}
                </label>
                <input
                  id="contact-name"
                  ref="nameInputRef"
                  v-model="form.name"
                  name="name"
                  type="text"
                  required
                  autocomplete="name"
                  class="input-field"
                  :placeholder="t('contact.form.name')"
                >
              </div>
              <div>
                <label for="contact-email" class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5">
                  {{ t('contact.form.email') }}
                </label>
                <input
                  id="contact-email"
                  v-model="form.email"
                  name="email"
                  type="email"
                  required
                  autocomplete="email"
                  class="input-field"
                  :placeholder="t('contact.form.email')"
                >
              </div>
            </div>

            <div>
              <ClientOnly>
                <div v-if="shouldUseTurnstile && turnstileReady" class="mb-3">
                  <div ref="turnstileContainer" />
                </div>
              </ClientOnly>
              <label for="contact-message" class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5">
                {{ t('contact.form.message') }}
              </label>
              <textarea
                id="contact-message"
                v-model="form.message"
                name="message"
                rows="5"
                required
                class="input-field resize-none"
                :placeholder="t('contact.form.message')"
              />
            </div>

            <div class="rounded-2xl border border-violet-500/15 bg-violet-500/[0.035] p-3 dark:border-violet-300/15 dark:bg-white/[0.025]">
              <button
                type="button"
                class="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left text-sm font-semibold text-gray-800 transition-[background-color,color,transform] hover:bg-violet-500/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 active:scale-[0.96] dark:text-gray-100 dark:hover:bg-white/[0.05]"
                :aria-expanded="detailsOpen"
                aria-controls="contact-project-details"
                @click="toggleProjectDetails"
              >
                <span>
                  {{ detailsOpen ? t('contact.form.details_hide') : t('contact.form.details_show') }}
                  <span class="block text-xs font-normal text-gray-500 dark:text-gray-400">{{ t('contact.form.details_hint') }}</span>
                </span>
                <svg class="h-4 w-4 shrink-0 transition-transform duration-150" :class="detailsOpen ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" /></svg>
              </button>
              <Transition name="details-reveal">
                <div v-if="detailsOpen" id="contact-project-details" class="mt-3 space-y-4 border-t border-violet-500/10 pt-4 dark:border-white/[0.08]">
                  <div>
                    <label for="contact-subject" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">{{ t('contact.form.subject') }}</label>
                    <input id="contact-subject" v-model="form.subject" name="subject" type="text" autocomplete="off" class="input-field" :placeholder="t('contact.form.subject')">
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2 md:gap-5">
                    <div>
                      <label for="contact-budget" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">{{ t('contact.form.budget') }}</label>
                      <select id="contact-budget" v-model="form.budget" name="budget" class="input-field" autocomplete="off">
                        <option value="">{{ t('contact.form.budget_select') }}</option>
                        <option value="<2k">{{ t('contact.form.budget_under_2k') }}</option>
                        <option value="2k-5k">{{ t('contact.form.budget_2_5k') }}</option>
                        <option value="5k-10k">{{ t('contact.form.budget_5_10k') }}</option>
                        <option value="10k+">{{ t('contact.form.budget_over_10k') }}</option>
                      </select>
                    </div>
                    <div>
                      <label for="contact-timeline" class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">{{ t('contact.form.timeline') }}</label>
                      <select id="contact-timeline" v-model="form.timeline" name="timeline" class="input-field" autocomplete="off">
                        <option value="">{{ t('contact.form.timeline_select') }}</option>
                        <option value="urgent">{{ t('contact.form.timeline_urgent') }}</option>
                        <option value="1mois">{{ t('contact.form.timeline_month') }}</option>
                        <option value="2-3mois">{{ t('contact.form.timeline_quarter') }}</option>
                        <option value="flexible">{{ t('contact.form.timeline_flexible') }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Status messages -->
            <Transition name="fade">
              <div v-if="status === 'success'" role="status" aria-live="polite" class="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ t('contact.form.success') }}
              </div>
              <div v-else-if="status === 'error'" role="alert" aria-live="assertive" class="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ errorMessage || t('contact.form.error') }}
              </div>
            </Transition>

            <button
              type="submit"
              class="btn-primary w-full justify-center text-base py-4"
              :disabled="status === 'sending'"
            >
              <svg v-if="status === 'sending'" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {{ status === 'sending' ? t('contact.form.sending') : t('contact.form.send') }}
            </button>
            <p class="text-xs text-gray-500 dark:text-white/50 text-center">
              {{ t('contact.quick_reply_at') }}
              <a :href="`mailto:${EMAIL}`" class="inline-flex min-h-11 items-center text-violet-600 underline dark:text-violet-300" @click="track('contact_email_click')">{{ EMAIL }}</a>
            </p>
              </form>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.contact-reveal-enter-active,
.contact-reveal-leave-active,
.details-reveal-enter-active,
.details-reveal-leave-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.contact-reveal-enter-from,
.contact-reveal-leave-to,
.details-reveal-enter-from,
.details-reveal-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .contact-reveal-enter-active,
  .contact-reveal-leave-active,
  .details-reveal-enter-active,
  .details-reveal-leave-active {
    transition: opacity 1ms linear;
  }

  .contact-reveal-enter-from,
  .contact-reveal-leave-to,
  .details-reveal-enter-from,
  .details-reveal-leave-to {
    transform: none;
  }
}
</style>
