<script setup lang="ts">
const { t } = useI18n()
const { track } = useMarketing()

  const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

type FormStatus = 'idle' | 'sending' | 'success' | 'error'
const status = ref<FormStatus>('idle')

async function handleSubmit() {
  if (status.value === 'sending') return
  status.value = 'sending'

  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: { name: form.name, email: form.email, subject: form.subject, message: form.message },
    })
    status.value = 'success'
    track('contact_form_submit_success')
    form.name = ''
    form.email = ''
    form.subject = ''
    form.message = ''
  }
  catch {
    status.value = 'error'
    track('contact_form_submit_error')
  }

  setTimeout(() => { status.value = 'idle' }, 5000)
}

const EMAIL = 'antoine@quarroz.dev'

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
          <UiBookingCalendar />
        </div>

        <!-- Form -->
        <div
          v-motion
          :initial="{ opacity: 0, x: 30 }"
          :visible="{ opacity: 1, x: 0, transition: { delay: 100, duration: 600 } }"
          class="lg:col-span-3"
        >
          <form class="card-glass p-5 md:p-8 space-y-4 md:space-y-5" @submit.prevent="handleSubmit">
            <div class="grid sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-2">
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
                <label class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-2">
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
              <label class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-2">
                {{ t('contact.form.subject') }}
              </label>
                <input
                  v-model="form.subject"
                  type="text"
                  class="input-field"
                  :placeholder="t('contact.form.subject')"
                >
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider mb-2">
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
              <div v-if="status === 'success'" class="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ t('contact.form.success') }}
              </div>
              <div v-else-if="status === 'error'" class="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
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
