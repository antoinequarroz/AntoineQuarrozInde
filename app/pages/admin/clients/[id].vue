<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const clientId = computed(() => Number(route.params.id))

const clientsStore = useClientsStore()
const tasksStore = useTasksStore()
const quotesStore = useQuotesStore()
const invoicesStore = useInvoicesStore()
const appointmentsStore = useAppointmentsStore()

const client = computed(() => clientsStore.clients.find(c => c.id === clientId.value) || null)
const clientTasks = computed(() => tasksStore.tasks.filter(t => t.clientId === clientId.value))
const clientQuotes = computed(() => quotesStore.quotes.filter(q => q.clientId === clientId.value))
const clientInvoices = computed(() => invoicesStore.invoices.filter(i => i.clientId === clientId.value))
const clientAppointments = computed(() => appointmentsStore.appointments.filter(a => a.clientId === clientId.value))

const totalQuotes = computed(() => clientQuotes.value.reduce((sum, q) => sum + q.amountCents, 0))
const totalInvoices = computed(() => clientInvoices.value.reduce((sum, i) => sum + i.amountCents, 0))
const overdueInvoices = computed(() => clientInvoices.value.filter(i => i.status === 'overdue'))
const nextAppointment = computed(() => {
  const now = new Date().toISOString()
  return clientAppointments.value
    .filter(a => a.startsAt >= now && a.status === 'scheduled')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] || null
})
const timeline = computed(() => {
  const quoteEvents = clientQuotes.value.map(q => ({
    key: `quote-${q.id}`,
    type: 'devis',
    title: `Devis ${q.number} (${q.status})`,
    date: q.createdAt,
    meta: `${(q.amountCents / 100).toFixed(2)} ${q.currency}`,
  }))
  const invoiceEvents = clientInvoices.value.map(i => ({
    key: `invoice-${i.id}`,
    type: 'facture',
    title: `Facture ${i.number} (${i.status})`,
    date: i.createdAt,
    meta: `${(i.amountCents / 100).toFixed(2)} ${i.currency}`,
  }))
  const taskEvents = clientTasks.value.map(t => ({
    key: `task-${t.id}`,
    type: 'tache',
    title: `Tache ${t.title} (${t.status})`,
    date: t.createdAt,
    meta: t.priority,
  }))
  const appointmentEvents = clientAppointments.value.map(a => ({
    key: `appointment-${a.id}`,
    type: 'rdv',
    title: `RDV ${a.title} (${a.status})`,
    date: a.createdAt,
    meta: new Date(a.startsAt).toLocaleString('fr-CH'),
  }))
  return [...quoteEvents, ...invoiceEvents, ...taskEvents, ...appointmentEvents]
    .sort((a, b) => b.date.localeCompare(a.date))
})

onMounted(async () => {
  await Promise.all([
    clientsStore.ensureLoaded(),
    tasksStore.ensureLoaded(),
    quotesStore.ensureLoaded(),
    invoicesStore.ensureLoaded(),
    appointmentsStore.ensureLoaded(),
  ])
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="client" class="flex items-start justify-between gap-4">
      <div>
        <NuxtLink to="/admin/clients" class="text-xs text-gray-400 hover:text-gray-600">← Retour clients</NuxtLink>
        <h1 class="font-display font-semibold text-2xl text-gray-900 dark:text-white mt-1">{{ client.name }}</h1>
        <p class="text-sm text-gray-400">{{ client.company || 'Independant' }} · {{ client.email }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink :to="`/admin/quotes?new=1&clientId=${client.id}`" class="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold">Nouveau devis</NuxtLink>
        <NuxtLink :to="`/admin/invoices?new=1&clientId=${client.id}`" class="px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold">Nouvelle facture</NuxtLink>
        <NuxtLink :to="`/admin/appointments?new=1&clientId=${client.id}`" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Nouveau RDV</NuxtLink>
      </div>
    </div>

    <div v-if="!client" class="rounded-xl border border-gray-200 dark:border-white/10 p-6 text-sm text-gray-500">
      Client introuvable.
    </div>

    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs text-gray-400 uppercase">Devis</p>
          <p class="font-display font-bold text-xl mt-1">{{ clientQuotes.length }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ (totalQuotes / 100).toFixed(2) }} CHF</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs text-gray-400 uppercase">Factures</p>
          <p class="font-display font-bold text-xl mt-1">{{ clientInvoices.length }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ (totalInvoices / 100).toFixed(2) }} CHF</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs text-gray-400 uppercase">Impayees</p>
          <p class="font-display font-bold text-xl mt-1">{{ overdueInvoices.length }}</p>
          <p class="text-xs text-gray-500 mt-1">statut overdue</p>
        </div>
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <p class="text-xs text-gray-400 uppercase">Prochain RDV</p>
          <p class="font-display font-bold text-sm mt-2 text-gray-800 dark:text-gray-100">
            {{ nextAppointment ? new Date(nextAppointment.startsAt).toLocaleString('fr-CH') : 'Aucun' }}
          </p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Devis recents</h2>
          <div v-if="clientQuotes.length" class="space-y-2">
            <div v-for="q in clientQuotes.slice(0, 5)" :key="q.id" class="flex items-center justify-between text-sm">
              <span>{{ q.number }} · {{ q.title }}</span>
              <span class="text-gray-400">{{ (q.amountCents / 100).toFixed(2) }} {{ q.currency }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Aucun devis</p>
        </div>

        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Factures recentes</h2>
          <div v-if="clientInvoices.length" class="space-y-2">
            <div v-for="i in clientInvoices.slice(0, 5)" :key="i.id" class="flex items-center justify-between text-sm">
              <span>{{ i.number }} · {{ i.status }}</span>
              <span class="text-gray-400">{{ (i.amountCents / 100).toFixed(2) }} {{ i.currency }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Aucune facture</p>
        </div>

        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Taches</h2>
          <div v-if="clientTasks.length" class="space-y-2">
            <div v-for="t in clientTasks.slice(0, 6)" :key="t.id" class="flex items-center justify-between text-sm">
              <span>{{ t.title }}</span>
              <span class="text-gray-400">{{ t.status }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Aucune tache</p>
        </div>

        <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
          <h2 class="text-sm font-semibold mb-3">Rendez-vous</h2>
          <div v-if="clientAppointments.length" class="space-y-2">
            <div v-for="a in clientAppointments.slice(0, 6)" :key="a.id" class="flex items-center justify-between text-sm">
              <span>{{ a.title }}</span>
              <span class="text-gray-400">{{ new Date(a.startsAt).toLocaleDateString('fr-CH') }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Aucun rendez-vous</p>
        </div>
      </div>

      <div class="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111118] p-4">
        <h2 class="text-sm font-semibold mb-3">Timeline activite</h2>
        <div v-if="timeline.length" class="space-y-2">
          <div v-for="event in timeline.slice(0, 12)" :key="event.key" class="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-2 last:border-0">
            <div class="min-w-0">
              <p class="text-sm text-gray-800 dark:text-gray-100 truncate">{{ event.title }}</p>
              <p class="text-xs text-gray-400">{{ event.meta }}</p>
            </div>
            <span class="text-xs text-gray-400 whitespace-nowrap">{{ event.date }}</span>
          </div>
        </div>
        <p v-else class="text-xs text-gray-400">Aucune activite pour ce client</p>
      </div>
    </template>
  </div>
</template>
