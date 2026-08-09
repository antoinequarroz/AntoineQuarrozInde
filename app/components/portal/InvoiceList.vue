<script setup lang="ts">
defineProps<{ invoices: any[], payingId: number | null, money: Function, statusLabel: Record<string, string>, remainingCents: Function, canPay: Function }>()
defineEmits<{ download: [invoice: any], pay: [invoice: any] }>()
</script>

<template>
  <section aria-label="Factures et paiements" class="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#111118]">
    <h2 class="font-display text-lg font-semibold">Factures et paiements</h2>
    <div v-if="invoices.length" class="mt-3 divide-y divide-gray-100 dark:divide-white/[0.06]">
      <article v-for="invoice in invoices" :key="invoice.id" class="py-4 first:pt-1">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><p class="font-semibold">{{ invoice.document_type === 'credit_note' ? 'Avoir' : 'Facture' }} {{ invoice.number }}</p><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ money(invoice.total_cents, invoice.currency) }} · {{ statusLabel[invoice.status] || invoice.status }}</p><p v-if="remainingCents(invoice) > 0 && invoice.document_type !== 'credit_note'" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Solde : {{ money(remainingCents(invoice), invoice.currency) }}</p></div>
          <span v-if="invoice.status === 'paid'" class="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Réglée</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="min-h-10 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:border-violet-300 dark:border-white/10 dark:text-gray-200" @click="$emit('download', invoice)">Télécharger le PDF</button>
          <button v-if="canPay(invoice)" type="button" class="min-h-10 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60" :disabled="payingId === invoice.id" @click="$emit('pay', invoice)">{{ payingId === invoice.id ? 'Ouverture de TWINT…' : 'Payer avec TWINT' }}</button>
        </div>
        <p v-if="invoice.currency === 'CHF' && remainingCents(invoice) > 500000" class="mt-3 text-xs text-amber-700 dark:text-amber-300">Le solde dépasse la limite TWINT de CHF 5’000. Contactez Antoine pour convenir du règlement.</p>
      </article>
    </div>
    <p v-else class="mt-3 text-sm text-gray-500 dark:text-gray-400">Aucune facture disponible.</p>
  </section>
</template>
