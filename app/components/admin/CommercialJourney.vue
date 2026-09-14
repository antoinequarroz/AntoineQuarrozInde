<script setup lang="ts">
type JourneyStep = 'crm' | 'quote' | 'invoice' | 'payment'

const props = defineProps<{
  current: JourneyStep
  clientId?: number | null
  quoteId?: number | null
  invoiceId?: number | null
}>()

const steps = computed(() => [
  { id: 'crm' as const, label: 'Prospect', to: '/admin/crm', available: true },
  {
    id: 'quote' as const,
    label: 'Devis',
    to: props.quoteId
      ? `/admin/quotes?quoteId=${props.quoteId}${props.clientId ? `&clientId=${props.clientId}` : ''}`
      : '',
    available: Boolean(props.quoteId),
  },
  {
    id: 'invoice' as const,
    label: 'Facture',
    to: props.invoiceId
      ? `/admin/invoices?invoiceId=${props.invoiceId}${props.clientId ? `&clientId=${props.clientId}` : ''}`
      : '',
    available: Boolean(props.invoiceId),
  },
  {
    id: 'payment' as const,
    label: 'Paiement',
    to: props.invoiceId
      ? `/admin/payments?invoiceId=${props.invoiceId}${props.clientId ? `&clientId=${props.clientId}` : ''}`
      : '',
    available: Boolean(props.invoiceId),
  },
])

const navRef = ref<HTMLElement | null>(null)

function revealCurrentStep() {
  nextTick(() => navRef.value?.querySelector<HTMLElement>('[aria-current="step"]')?.scrollIntoView({ block: 'nearest', inline: 'center' }))
}

onMounted(revealCurrentStep)
watch(() => props.current, revealCurrentStep)
</script>

<template>
  <nav ref="navRef" aria-label="Progression du parcours commercial" class="overflow-x-auto rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/[0.08] dark:bg-[#111118]">
    <ol class="flex min-w-max items-center gap-1 text-xs sm:text-sm">
      <li v-for="(step, index) in steps" :key="step.id" class="flex items-center gap-1">
        <span v-if="index" aria-hidden="true" class="px-1 text-gray-300 dark:text-gray-600">→</span>
        <span
          v-if="step.id === current"
          aria-current="step"
          class="inline-flex min-h-11 items-center rounded-lg bg-violet-100 px-3 font-semibold text-violet-800 dark:bg-violet-500/15 dark:text-violet-200"
        >{{ step.label }}</span>
        <NuxtLink
          v-else-if="step.available"
          :to="step.to"
          class="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-violet-200"
        >{{ step.label }}</NuxtLink>
        <span v-else aria-disabled="true" class="inline-flex min-h-11 items-center px-3 text-gray-400 dark:text-gray-600">{{ step.label }}<span class="sr-only"> — disponible une fois l’étape précédente terminée</span></span>
      </li>
    </ol>
  </nav>
</template>
