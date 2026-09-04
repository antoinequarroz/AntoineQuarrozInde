<script setup lang="ts">
import type { PublicServiceDecisionContent } from '~~/shared/utils/publicServiceContent'

const props = defineProps<{
  content: PublicServiceDecisionContent
}>()
</script>

<template>
  <div data-service-decision-content class="mt-10 space-y-6 sm:mt-12 sm:space-y-8">
    <div class="grid gap-6 lg:grid-cols-2">
      <section
        data-service-section="deliverables"
        class="rounded-3xl border border-violet-500/15 bg-white/75 p-5 shadow-lg shadow-violet-500/5 dark:border-white/10 dark:bg-white/[0.04] sm:p-7"
      >
        <h2 class="text-balance font-display text-2xl font-bold text-gray-950 dark:text-white">
          Quels livrables sont inclus ?
        </h2>
        <ul class="mt-5 space-y-3 text-gray-700 dark:text-gray-200">
          <li v-for="deliverable in props.content.deliverables" :key="deliverable" class="flex gap-3 leading-relaxed">
            <span aria-hidden="true" class="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
            <span data-service-deliverable>{{ deliverable }}</span>
          </li>
        </ul>
      </section>

      <section
        data-service-section="process"
        class="rounded-3xl border border-violet-500/15 bg-white/75 p-5 shadow-lg shadow-violet-500/5 dark:border-white/10 dark:bg-white/[0.04] sm:p-7"
      >
        <h2 class="text-balance font-display text-2xl font-bold text-gray-950 dark:text-white">
          Comment se déroule le projet ?
        </h2>
        <ol class="mt-5 space-y-3 text-gray-700 dark:text-gray-200">
          <li v-for="(step, index) in props.content.process" :key="step" class="flex gap-3 leading-relaxed">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-sm font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-200">
              {{ index + 1 }}
            </span>
            <span data-service-process-step>{{ step }}</span>
          </li>
        </ol>
      </section>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section
        data-service-section="timeline"
        class="rounded-3xl bg-violet-50 p-5 dark:bg-violet-500/10 sm:p-7"
      >
        <h2 class="text-balance font-display text-2xl font-bold text-gray-950 dark:text-white">
          Quels délais prévoir ?
        </h2>
        <p data-service-timeline class="mt-4 leading-relaxed text-gray-700 dark:text-gray-200">
          {{ props.content.timeline }}
        </p>
      </section>

      <section
        data-service-section="limits"
        class="rounded-3xl bg-gray-100/80 p-5 dark:bg-white/[0.06] sm:p-7"
      >
        <h2 class="text-balance font-display text-2xl font-bold text-gray-950 dark:text-white">
          Quelles sont les limites ?
        </h2>
        <ul class="mt-4 space-y-3 text-gray-700 dark:text-gray-200">
          <li v-for="limit in props.content.limits" :key="limit" class="flex gap-3 leading-relaxed">
            <span aria-hidden="true" class="mt-2 h-2 w-2 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
            <span data-service-limit>{{ limit }}</span>
          </li>
        </ul>
      </section>
    </div>

    <section
      data-service-section="next-step"
      class="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-400/10 p-5 sm:p-7"
    >
      <div class="max-w-3xl">
        <h2 class="text-balance font-display text-2xl font-bold text-gray-950 dark:text-white">
          Quelle est la prochaine étape ?
        </h2>
        <p data-service-next-step class="mt-4 leading-relaxed text-gray-700 dark:text-gray-200">
          {{ props.content.nextStep }}
        </p>
        <p data-service-proof-note class="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {{ props.content.proofNote }}
        </p>
      </div>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <NuxtLink
          data-service-proof-link
          :to="props.content.proof.path"
          class="btn-secondary min-h-11 justify-center motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111118]"
        >
          {{ props.content.proof.label }}
        </NuxtLink>
        <NuxtLink
          data-service-contact-link
          :to="props.content.contact.path"
          class="btn-primary min-h-11 justify-center motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111118]"
        >
          {{ props.content.contact.label }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
