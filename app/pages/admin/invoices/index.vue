<script setup lang="ts">
import type { Invoice } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin' })
const store = useInvoicesStore()
const toast = useToast()
const showForm = ref(false)
const editing = ref<Invoice | null>(null)
const form = reactive({ number: '', amountCents: 0, currency: 'CHF', status: 'draft' as Invoice['status'], issuedAt: '', dueAt: '', paidAt: '', notes: '' })
function openNew() { editing.value = null; Object.assign(form, { number: '', amountCents: 0, currency: 'CHF', status: 'draft', issuedAt: '', dueAt: '', paidAt: '', notes: '' }); showForm.value = true }
function openEdit(x: Invoice) { editing.value = x; Object.assign(form, x); showForm.value = true }
async function submit() { try { const payload = { ...form, clientId: null, quoteId: null, issuedAt: form.issuedAt || null, dueAt: form.dueAt || null, paidAt: form.paidAt || null, notes: form.notes || null }; if (editing.value) await store.update(editing.value.id, payload as any); else await store.add(payload as any); showForm.value = false; toast.success('Enregistre') } catch { toast.error('Erreur') } }
async function del(id: number) { if (!confirm('Supprimer ?')) return; try { await store.remove(id); toast.success('Supprime') } catch { toast.error('Erreur') } }
onMounted(() => store.ensureLoaded())
</script>
<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between"><h1 class="font-display font-semibold text-xl">Factures</h1><button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm" @click="openNew">Nouvelle</button></div>
    <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <table class="w-full">
        <thead><tr class="border-b border-gray-100 dark:border-white/[0.06]"><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Numero</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Montant</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Echeance</th><th class="text-left px-4 py-3 text-xs uppercase text-gray-400">Statut</th><th class="text-right px-4 py-3 text-xs uppercase text-gray-400">Actions</th></tr></thead>
        <tbody><tr v-for="q in store.invoices" :key="q.id" class="border-b border-gray-50 dark:border-white/[0.03]"><td class="px-4 py-3 text-sm">{{ q.number }}</td><td class="px-4 py-3 text-sm">{{ (q.amountCents / 100).toFixed(2) }} {{ q.currency }}</td><td class="px-4 py-3 text-sm">{{ q.dueAt || '-' }}</td><td class="px-4 py-3 text-sm">{{ q.status }}</td><td class="px-4 py-3 text-right space-x-2"><button class="text-xs text-violet-600" @click="openEdit(q)">Editer</button><button class="text-xs text-red-500" @click="del(q.id)">Supprimer</button></td></tr></tbody>
      </table>
    </div>
    <Transition name="fade"><div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4"><div class="absolute inset-0 bg-black/40" @click="showForm=false"/><form class="relative w-full max-w-xl bg-white dark:bg-[#111118] rounded-xl p-5 space-y-3" @submit.prevent="submit"><input v-model="form.number" class="input-field" placeholder="Numero" required><div class="grid grid-cols-2 gap-3"><input v-model.number="form.amountCents" type="number" min="0" class="input-field" placeholder="Montant (centimes)"><input v-model="form.currency" class="input-field" placeholder="Devise"></div><div class="grid grid-cols-3 gap-3"><input v-model="form.issuedAt" type="date" class="input-field"><input v-model="form.dueAt" type="date" class="input-field"><input v-model="form.paidAt" type="date" class="input-field"></div><select v-model="form.status" class="input-field"><option value="draft">draft</option><option value="sent">sent</option><option value="paid">paid</option><option value="overdue">overdue</option><option value="cancelled">cancelled</option></select><textarea v-model="form.notes" rows="3" class="input-field" placeholder="Notes"/><div class="flex justify-end gap-2"><button type="button" class="px-3 py-2 text-sm" @click="showForm=false">Annuler</button><button class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Enregistrer</button></div></form></div></Transition>
  </div>
</template>
