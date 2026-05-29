<script setup lang="ts">
const { t } = useI18n()
const { track } = useMarketing()
const runtimeConfig = useRuntimeConfig()
const turnstileSiteKey = runtimeConfig.public.turnstileSiteKey as string
const isClient = import.meta.client
const isLocalhost = isClient
  ? ['localhost', '127.0.0.1'].includes(window.location.hostname)
  : false
const shouldUseTurnstile = !!turnstileSiteKey && !isLocalhost
const turnstileReady = ref(false)

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

useHead({
  script: shouldUseTurnstile
    ? [{ src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true, defer: true }]
    : [],
})

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
  if (!shouldUseTurnstile) return
  turnstileReady.value = true
  const waitForTurnstile = () => {
    if ((window as any).turnstile) {
      renderTurnstile()
      return
    }
    window.setTimeout(waitForTurnstile, 150)
  }
  waitForTurnstile()
})

async function handleSubmit() {
  if (status.value === 'sending') return
  if (shouldUseTurnstile && !turnstileToken.value) {
    status.value = 'error'
    setTimeout(() => { status.value = 'idle' }, 5000)
    return
  }
  status.value = 'sending'

  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        subject: form.subject?.trim() || 'Nouveau projet',
        message: `${form.message}\n\n---\nBudget: ${form.budget || '-'}\nDelai: ${form.timeline || '-'}`,
        website: form.website,
        startedAt: form.startedAt,
        turnstileToken: turnstileToken.value,
      },
    })
    status.value = 'success'
    track('contact_form_submit_success')
    form.name = ''
    form.email = ''
    form.subject = ''
    form.budget = ''
    form.timeline = ''
    form.message = ''
    form.website = ''
    form.startedAt = Date.now()
    turnstileToken.value = ''
    if (turnstileWidgetId.value && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId.value)
    }
  }
  catch {
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
  <section id="contact" class="section-padding section-surface">
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

      <div class="grid lg:grid-cols-5 gap-6 lg:gap-12">
        <!-- Calendrier de réservation -->
        <div
          v-motion
          :initial="{ opacity: 0, x: -30 }"
          :visible="{ opacity: 1, x: 0, transition: { duration: 600 } }"
          class="lg:col-span-2"
        >
          <ClientOnly>
            <UiBookingCalendar />
            <template #fallback>
              <div class="card-glass p-4 max-[390px]:p-3.5 h-full min-h-[360px]" />
            </template>
          </ClientOnly>
        </div>

        <!-- Form -->
        <div
          v-motion
          :initial="{ opacity: 0, x: 30 }"
          :visible="{ opacity: 1, x: 0, transition: { delay: 100, duration: 600 } }"
          class="lg:col-span-3"
        >
          <form class="card-glass p-4 max-[390px]:p-3.5 md:p-8 space-y-4 md:space-y-5" @submit.prevent="handleSubmit">
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
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5">
                  {{ t('contact.form.name') }}
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="input-field"
                  :placeholder="t('contact.form.name')"
                >
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5">
                  {{ t('contact.form.email') }}
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  class="input-field"
                  :placeholder="t('contact.form.email')"
                >
              </div>
            </div>

              <div>
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5">
                  {{ t('contact.form.subject') }}
                </label>
                <input
                  v-model="form.subject"
                  type="text"
                  class="input-field"
                  :placeholder="t('contact.form.subject')"
                >
            </div>
            <div class="grid sm:grid-cols-2 gap-4 md:gap-5">
              <div>
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5">
                  Budget
                </label>
                <select v-model="form.budget" class="input-field">
                  <option value="">Sélectionner</option>
                  <option value="<2k">Moins de 2k</option>
                  <option value="2k-5k">2k - 5k</option>
                  <option value="5k-10k">5k - 10k</option>
                  <option value="10k+">10k+</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5">
                  Délai cible
                </label>
                <select v-model="form.timeline" class="input-field">
                  <option value="">Sélectionner</option>
                  <option value="urgent">Urgent (&lt; 2 semaines)</option>
                  <option value="1mois">1 mois</option>
                  <option value="2-3mois">2 à 3 mois</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>

            <div>
              <ClientOnly>
                <div v-if="shouldUseTurnstile && turnstileReady" class="mb-3">
                  <div ref="turnstileContainer" />
                </div>
              </ClientOnly>
              <label class="block text-[11px] font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-1.5">
                {{ t('contact.form.message') }}
              </label>
              <textarea
                v-model="form.message"
                rows="5"
                required
                class="input-field resize-none"
                :placeholder="t('contact.form.message')"
              />
            </div>

            <!-- Status messages -->
            <Transition name="fade">
              <div v-if="status === 'success'" class="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[13px]">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ t('contact.form.success') }}
              </div>
              <div v-else-if="status === 'error'" class="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px]">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ t('contact.form.error') }}
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
            <p class="text-[11px] text-gray-500 dark:text-white/50 text-center">
              Réponse rapide sur
              <a :href="`mailto:${EMAIL}`" class="text-violet-600 dark:text-violet-300 underline" @click="track('contact_email_click')">{{ EMAIL }}</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
