<script setup lang="ts">
const { t } = useI18n()

const imageError = ref(false)
const photoSrc = '/about.jpg'

const facts = computed(() => [
  { emoji: '📍', label: t('about.fact_location') },
  { emoji: '🎓', label: t('about.fact_title') },
  { emoji: '🚀', label: t('about.fact_since') },
])

const tools = [
  'Vue 3 / Nuxt',
  'TypeScript',
  'Flutter / Dart',
  'Tailwind CSS',
  'Supabase',
  'PostgreSQL',
  'Node.js',
  'Three.js',
  'Figma',
  'Git / GitHub',
]
</script>

<template>
  <section id="about" class="section-padding section-surface">
    <div class="section-background">
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <div class="grid items-start gap-8 lg:gap-12 lg:grid-cols-[420px_1fr] xl:grid-cols-[460px_1fr]">

        <!-- ─── COLONNE GAUCHE : Photo + faits ─── -->
        <div
          v-motion
          :initial="{ opacity: 0, x: -30, y: 16 }"
          :visible="{ opacity: 1, x: 0, y: 0, transition: { duration: 720 } }"
        >
          <!-- Photo frame -->
          <div class="relative">
            <!-- Glow derrière -->
            <div class="absolute -inset-6 rounded-[3rem] bg-violet-500/8 blur-3xl dark:bg-violet-500/14" />
            <div class="absolute -bottom-6 -right-4 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div class="absolute -left-2 -top-2 h-28 w-28 rounded-full bg-cyan-400/12 blur-2xl" />

            <!-- Container -->
            <div
              class="relative overflow-hidden rounded-[1.75rem] border border-violet-500/20 bg-gradient-to-br from-violet-100 to-fuchsia-100 shadow-2xl shadow-violet-500/15 dark:border-violet-400/15 dark:from-violet-900/30 dark:to-fuchsia-900/20"
              style="aspect-ratio: 3/4"
            >
              <!-- Trait lumineux -->
              <div class="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

              <!-- Photo (client-only pour éviter les warnings SSR) -->
              <ClientOnly>
                <img
                  v-if="!imageError"
                  :src="photoSrc"
                  alt="Antoine Quarroz"
                  class="h-full w-full object-cover object-top"
                  @error="imageError = true"
                />
                <div
                  v-else
                  class="flex h-full w-full flex-col items-center justify-center"
                >
                  <div class="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-100/80 dark:bg-violet-500/15">
                    <svg class="h-9 w-9 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <p class="text-sm font-medium text-violet-400 dark:text-violet-300">Photo à venir</p>
                </div>
                <!-- SSR fallback : placeholder silencieux -->
                <template #fallback>
                  <div class="flex h-full w-full flex-col items-center justify-center">
                    <div class="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-100/80 dark:bg-violet-500/15">
                      <svg class="h-9 w-9 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <p class="text-sm font-medium text-violet-400 dark:text-violet-300">Photo à venir</p>
                  </div>
                </template>
              </ClientOnly>

              <!-- Badge "Disponible" flottant -->
              <div class="absolute right-3 top-3 z-10">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-white/90 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur-sm dark:border-emerald-400/25 dark:bg-black/70 dark:text-emerald-300">
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
                  {{ t('about.available') }}
                </span>
              </div>

              <!-- Fondu bas -->
              <div class="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-white/10 to-transparent dark:from-black/20" />
            </div>

            <!-- Accent coin -->
            <div class="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl border-2 border-violet-500/20 bg-white/70 backdrop-blur dark:bg-white/[0.05]" />
          </div>

          <!-- Faits personnels -->
          <div class="mt-6 space-y-2.5">
            <div
              v-for="fact in facts"
              :key="fact.label"
              class="flex items-center gap-3 rounded-xl border border-violet-500/10 bg-white/70 px-4 py-2.5 backdrop-blur dark:border-white/[0.07] dark:bg-white/[0.03]"
            >
              <span class="text-base leading-none">{{ fact.emoji }}</span>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ fact.label }}</span>
            </div>
          </div>
        </div>

        <!-- ─── COLONNE DROITE : Contenu ─── -->
        <div
          v-motion
          :initial="{ opacity: 0, x: 30, y: 16 }"
          :visible="{ opacity: 1, x: 0, y: 0, transition: { delay: 140, duration: 720 } }"
          class="lg:pt-4"
        >
          <span class="badge mb-4">{{ t('about.badge') }}</span>

          <h2 class="mb-5 max-[430px]:mb-4 section-heading">
            <span class="block">{{ t('about.title').split('\n')[0] }}</span>
            <span class="block section-heading-gradient">{{ t('about.title').split('\n')[1] }}</span>
          </h2>

          <dl class="mt-5 max-[430px]:mt-4 space-y-5">
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-[88px_1fr] sm:gap-5 items-start">
              <dt class="pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500 dark:text-violet-400">
                {{ t('about.label_1') }}
              </dt>
              <dd class="text-[14px] max-[390px]:text-[13px] leading-relaxed text-gray-900 dark:text-white/90">
                {{ t('about.description_1') }}
              </dd>
            </div>

            <div class="h-px bg-gradient-to-r from-violet-500/20 via-fuchsia-400/10 to-transparent" />

            <div class="grid grid-cols-1 gap-2 sm:grid-cols-[88px_1fr] sm:gap-5 items-start">
              <dt class="pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-500 dark:text-fuchsia-400">
                {{ t('about.label_2') }}
              </dt>
              <dd class="text-[14px] max-[390px]:text-[13px] leading-relaxed text-gray-700 dark:text-white/70">
                {{ t('about.description_2') }}
              </dd>
            </div>
          </dl>

          <!-- Citation -->
          <div class="mt-6 max-w-xl rounded-2xl border border-violet-600/30 bg-violet-600 p-3.5 max-[390px]:p-3 backdrop-blur dark:border-violet-500/40 dark:bg-violet-600/90">
            <div class="flex gap-3">
              <div class="mt-0.5 flex-shrink-0">
                <svg class="h-5 w-5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                </svg>
              </div>
              <p class="text-sm font-medium leading-relaxed text-white">
                {{ t('about.quote') }}
              </p>
            </div>
          </div>

          <!-- Séparateur -->
          <div class="my-8 h-px bg-gradient-to-r from-violet-500/20 via-fuchsia-400/10 to-transparent" />

          <!-- Stack -->
          <div>
            <h3 class="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              {{ t('about.tools_title') }}
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tool in tools"
                :key="tool"
                class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:border-violet-500/40"
              >
                {{ tool }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
