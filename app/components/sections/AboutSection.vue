<script setup lang="ts">
const { t } = useI18n()

const stats = computed(() => [
  { value: '3+', label: t('about.years') },
  { value: '20+', label: t('about.projects') },
  { value: '15+', label: t('about.clients') },
])

const skills = [
  { name: 'Vue 3 / Nuxt', level: 95 },
  { name: 'TypeScript', level: 90 },
  { name: 'Flutter / Dart', level: 80 },
  { name: 'Tailwind CSS', level: 95 },
  { name: 'Supabase / PostgreSQL', level: 75 },
  { name: 'Three.js', level: 65 },
]

const techTags = [
  'Vue 3',
  'Nuxt 3',
  'TypeScript',
  'JavaScript',
  'Flutter',
  'Dart',
  'Tailwind CSS',
  'Supabase',
  'PostgreSQL',
  'Node.js',
  'Three.js',
  'Figma',
]

const approach = computed(() => [
  { n: '01', title: t('about.approach_1_title'), text: t('about.approach_1_text') },
  { n: '02', title: t('about.approach_2_title'), text: t('about.approach_2_text') },
  { n: '03', title: t('about.approach_3_title'), text: t('about.approach_3_text') },
])
</script>

<template>
  <section id="about" class="section-padding section-surface">
    <div class="section-background">
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <div class="grid items-start gap-12 lg:grid-cols-2">
        <div
          v-motion
          :initial="{ opacity: 0, x: -34, y: 18 }"
          :visible="{ opacity: 1, x: 0, y: 0, transition: { duration: 720 } }"
        >
          <span class="badge mb-4">{{ t('about.badge') }}</span>
          <h2 class="mb-6 whitespace-pre-line section-heading">
            <span class="block">{{ t('about.title').split('\n')[0] }}</span>
            <span class="block section-heading-gradient">
              {{ t('about.title').split('\n')[1] }}
            </span>
          </h2>
          <p class="max-w-2xl leading-relaxed text-gray-600 dark:text-gray-300">
            {{ t('about.description_1') }}
          </p>
          <p class="mt-4 max-w-2xl leading-relaxed text-gray-500 dark:text-gray-400">
            {{ t('about.description_2') }}
          </p>

          <div class="mt-7 max-w-2xl rounded-2xl border border-cyan-500/15 bg-cyan-50/70 p-4 backdrop-blur dark:border-cyan-400/15 dark:bg-cyan-500/10">
            <p class="text-sm font-medium leading-relaxed text-cyan-950 dark:text-cyan-50/90">
              {{ t('about.quote') }}
            </p>
          </div>

          <div
            v-motion
            :initial="{ opacity: 0, y: 24 }"
            :visible="{ opacity: 1, y: 0, transition: { delay: 160, duration: 620 } }"
            class="mt-10 grid grid-cols-3 gap-3 md:gap-4"
          >
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="group rounded-2xl border border-violet-500/15 bg-white/80 p-4 text-center backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/25 hover:shadow-glow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div class="font-display text-3xl font-bold text-gradient">{{ stat.value }}</div>
              <div class="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">{{ stat.label }}</div>
            </div>
          </div>

          <div
            v-motion
            :initial="{ opacity: 0, y: 18 }"
            :visible="{ opacity: 1, y: 0, transition: { delay: 240, duration: 620 } }"
            class="mt-5 grid gap-3"
          >
            <div
              v-for="item in approach"
              :key="item.n"
              class="grid grid-cols-[42px_1fr] gap-3 rounded-2xl border border-violet-500/10 bg-white/65 p-3 backdrop-blur dark:border-white/10 dark:bg-white/[0.03]"
            >
              <span class="text-xs font-semibold text-violet-600 dark:text-violet-300">{{ item.n }}</span>
              <span>
                <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ item.title }}</span>
                <span class="mt-0.5 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ item.text }}</span>
              </span>
            </div>
          </div>
        </div>

        <div
          v-motion
          :initial="{ opacity: 0, x: 34, y: 18 }"
          :visible="{ opacity: 1, x: 0, y: 0, transition: { delay: 120, duration: 760 } }"
        >
          <div class="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-white/80 p-6 shadow-2xl shadow-violet-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] md:p-7">
            <div class="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />
            <div class="absolute -bottom-20 left-6 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
            <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/45 to-transparent" />
            <div class="relative flex items-center justify-between gap-4">
              <h3 class="font-display text-xl font-semibold text-gray-950 dark:text-white">
                {{ t('about.skills_title') }}
              </h3>
              <span class="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200">
                Stack
              </span>
            </div>

            <div class="relative mt-5 space-y-4">
              <div
                v-for="(skill, index) in skills"
                :key="skill.name"
                v-motion
                :initial="{ opacity: 0, x: 18 }"
                :visible="{ opacity: 1, x: 0, transition: { delay: 180 + index * 70, duration: 420 } }"
              >
                <div class="mb-1.5 flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ skill.name }}</span>
                  <span class="text-xs font-semibold text-violet-600 dark:text-violet-300">{{ skill.level }}%</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400 transition-all duration-1000"
                    :style="{ width: `${skill.level}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="relative mt-6 flex flex-wrap gap-2">
              <span
                v-for="tag in techTags"
                :key="tag"
                class="rounded-lg border border-violet-200/60 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
