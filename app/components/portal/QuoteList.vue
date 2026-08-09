<script setup lang="ts">
defineProps<{ quotes: any[], confirmedIds: number[], acceptingId: number | null, money: Function, dateLabel: Function, statusLabel: Record<string, string>, isExpired: Function, canAccept: Function }>()
defineEmits<{ toggleConfirm: [id: number, checked: boolean], download: [quote: any], accept: [quote: any] }>()
</script>

<template>
  <section aria-label="Devis" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
    <h2 class="font-display text-lg font-semibold">Devis</h2>
    <div v-if="quotes.length" class="mt-3 divide-y divide-gray-100 dark:divide-white/[0.06]">
      <article v-for="quote in quotes" :key="quote.id" class="py-4 first:pt-1">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><p class="font-semibold">{{ quote.number }} · {{ quote.title }}</p><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ money(quote.total_cents, quote.currency) }} · valable jusqu’au {{ dateLabel(quote.valid_until) }}</p></div>
          <span class="rounded-lg px-2.5 py-1 text-xs font-semibold" :class="quote.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : isExpired(quote) ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'">{{ isExpired(quote) ? 'Expiré' : (statusLabel[quote.status] || quote.status) }}</span>
        </div>
        <p v-if="quote.status === 'accepted' && quote.accepted_at" class="mt-3 text-xs text-emerald-700 dark:text-emerald-300">Accepté le {{ dateLabel(quote.accepted_at) }}</p>
        <div class="mt-3 flex flex-wrap gap-2"><button type="button" class="min-h-10 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:border-violet-300 dark:border-white/10 dark:text-gray-200" @click="$emit('download', quote)">Télécharger le PDF</button></div>
        <div v-if="canAccept(quote)" class="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.035]">
          <label class="flex items-start gap-2 text-xs leading-5 text-gray-700 dark:text-gray-200"><input :checked="confirmedIds.includes(quote.id)" type="checkbox" class="mt-0.5 h-4 w-4 accent-violet-600" @change="$emit('toggleConfirm', quote.id, ($event.target as HTMLInputElement).checked)"> J’ai lu le devis et je confirme l’accepter au nom de mon entreprise.</label>
          <button type="button" class="mt-3 min-h-10 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!confirmedIds.includes(quote.id) || acceptingId === quote.id" @click="$emit('accept', quote)">{{ acceptingId === quote.id ? 'Validation…' : 'Accepter le devis' }}</button>
        </div>
        <p v-else-if="isExpired(quote)" class="mt-3 text-xs text-red-700 dark:text-red-300">Ce devis a expiré. Contactez Antoine pour obtenir une version actualisée.</p>
      </article>
    </div>
    <p v-else class="mt-3 text-sm text-gray-500 dark:text-gray-400">Aucun devis disponible.</p>
  </section>
</template>
