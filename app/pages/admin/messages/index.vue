<script setup lang="ts">
import type { ContactMessage } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const auth = useAuthStore()
const toast = useToast()
const route = useRoute()

const loading = ref(true)
const loadError = ref('')
const sending = ref(false)
const saving = ref(false)
const messages = ref<ContactMessage[]>([])
const selected = ref<ContactMessage | null>(null)
const replySubject = ref('')
const replyBody = ref('')
const statusFilter = ref<'all' | ContactMessage['status']>('all')
const tagInput = ref('')

const filteredMessages = computed(() => {
  if (statusFilter.value === 'all') return messages.value
  return messages.value.filter(msg => msg.status === statusFilter.value)
})

const statusMeta: Record<ContactMessage['status'], { label: string, classes: string }> = {
  new: { label: 'Nouveau', classes: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300' },
  in_progress: { label: 'En cours', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
  replied: { label: 'Répondu', classes: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' },
  archived: { label: 'Archivé', classes: 'bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-gray-300' },
}

async function loadMessages() {
  loading.value = true
  loadError.value = ''
  try {
    messages.value = await $fetch<ContactMessage[]>('/api/messages', {
      headers: auth.authHeader(),
    })
    if (selected.value) {
      selected.value = messages.value.find(msg => msg.id === selected.value?.id) || null
    }
    const requestedId = Number(route.query.messageId || 0)
    const requestedMessage = messages.value.find(message => message.id === requestedId)
    const firstMessage = requestedId > 0 ? requestedMessage : messages.value.at(0)
    if (!selected.value && firstMessage) openMessage(firstMessage)
  }
  catch {
    loadError.value = 'Les messages ne peuvent pas être chargés. Réessaie dans quelques instants.'
  }
  finally {
    loading.value = false
  }
}

function openMessage(message: ContactMessage) {
  selected.value = message
  replySubject.value = message.subject ? `Re: ${message.subject}` : 'Re: Votre message'
  replyBody.value = `Bonjour ${message.name},\n\nMerci pour votre message.\n\nBien à vous,\nAntoine Quarroz`
}

async function saveMeta() {
  if (!selected.value) return
  saving.value = true
  try {
    const updated = await $fetch<ContactMessage>('/api/messages', {
      method: 'PUT',
      headers: auth.authHeader(),
      body: {
        id: selected.value.id,
        status: selected.value.status,
        tags: selected.value.tags || [],
      },
    })
    selected.value = updated
    const idx = messages.value.findIndex(msg => msg.id === updated.id)
    if (idx >= 0) messages.value[idx] = updated
    toast.success('Message mis à jour')
  } catch {
    toast.error('Le message n’a pas pu être mis à jour')
  } finally {
    saving.value = false
  }
}

function addTag() {
  if (!selected.value) return
  const nextTag = tagInput.value.trim().toLowerCase()
  if (!nextTag) return
  if (!selected.value.tags.includes(nextTag)) {
    selected.value.tags = [...selected.value.tags, nextTag]
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  if (!selected.value) return
  selected.value.tags = selected.value.tags.filter(item => item !== tag)
}

async function sendReply() {
  if (!selected.value) return
  if (!replySubject.value.trim() || !replyBody.value.trim()) {
    toast.error('Sujet et message requis')
    return
  }
  sending.value = true
  try {
    await $fetch('/api/messages/reply', {
      method: 'POST',
      headers: auth.authHeader(),
      body: {
        id: selected.value.id,
        subject: replySubject.value,
        message: replyBody.value,
      },
    })
    selected.value.status = 'replied'
    await saveMeta()
    toast.success('Réponse envoyée')
    await loadMessages()
  }
  catch {
    toast.error('La réponse n’a pas pu être envoyée')
  }
  finally {
    sending.value = false
  }
}

onMounted(loadMessages)

watch(statusFilter, () => {
  if (selected.value && filteredMessages.value.some(message => message.id === selected.value?.id)) return
  const next = filteredMessages.value.at(0)
  selected.value = null
  if (next) openMessage(next)
})
</script>

<template>
  <div class="space-y-5">
    <section class="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111118] sm:px-5">
      <div class="pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <span class="rounded-md bg-gradient-brand px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">Messages CRM</span>
          <h1 class="mt-2 font-display text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">Messages CRM</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Boîte de réception, qualification, tags et réponses au même endroit.</p>
        </div>
        <label for="message-status-filter" class="sr-only">Filtrer les messages par statut</label>
        <select id="message-status-filter" v-model="statusFilter" class="input-field w-full text-sm sm:w-auto sm:max-w-[180px]">
          <option value="all">Tous les statuts</option>
          <option value="new">Nouveau</option>
          <option value="in_progress">En cours</option>
          <option value="replied">Répondu</option>
          <option value="archived">Archivé</option>
        </select>
      </div>
    </section>

    <div class="grid lg:grid-cols-[340px_1fr] gap-4">
      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div class="border-b border-gray-100 px-4 py-3 text-xs text-gray-600 dark:border-white/[0.06] dark:text-gray-300">
          {{ filteredMessages.length }} message(s)
        </div>
        <div v-if="loading" role="status" class="p-5 text-sm text-gray-500 dark:text-gray-400">Chargement des messages…</div>
        <div v-else-if="loadError" role="alert" class="p-5 text-sm text-red-800 dark:text-red-200"><p>{{ loadError }}</p><button type="button" class="mt-3 min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white" @click="loadMessages">Réessayer</button></div>
        <AdminEmptyState v-else-if="!filteredMessages.length" title="Aucun message pour ce filtre" :body="messages.length ? 'Choisis un autre statut pour retrouver tes messages.' : 'Les nouvelles demandes reçues depuis le site apparaîtront ici.'" />
        <div v-else>
          <div class="sm:hidden max-h-[56vh] overflow-y-auto p-2 space-y-2">
            <button
              v-for="msg in filteredMessages"
              :key="`mobile-${msg.id}`"
              class="w-full rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111118] text-left p-3"
              :class="selected?.id === msg.id ? 'ring-1 ring-violet-500/60' : ''"
              @click="openMessage(msg)"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{{ msg.name }}</p>
                <span class="text-xs font-semibold px-2 py-0.5 rounded" :class="statusMeta[msg.status].classes">
                  {{ statusMeta[msg.status].label }}
                </span>
              </div>
              <p class="text-xs text-gray-400 truncate">{{ msg.email }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{{ msg.message }}</p>
            </button>
          </div>
          <div class="hidden sm:block max-h-[72vh] overflow-y-auto">
            <button
              v-for="msg in filteredMessages"
              :key="msg.id"
              class="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors"
              :class="selected?.id === msg.id ? 'bg-violet-50/60 dark:bg-violet-500/10' : ''"
              @click="openMessage(msg)"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{{ msg.name }}</p>
                <span class="text-xs font-semibold px-2 py-0.5 rounded" :class="statusMeta[msg.status].classes">
                  {{ statusMeta[msg.status].label }}
                </span>
              </div>
              <p class="text-xs text-gray-400 truncate">{{ msg.email }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{{ msg.message }}</p>
              <div v-if="msg.tags?.length" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="tag in msg.tags"
                  :key="`${msg.id}-${tag}`"
                  class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-gray-300"
                >
                  #{{ tag }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4 sm:p-5">
        <AdminEmptyState v-if="!selected" title="Sélectionne un message" body="Le contenu, le statut, les tags et la réponse apparaîtront ici." />
        <div v-else class="space-y-4">
          <div class="pb-3 border-b border-gray-100 dark:border-white/[0.06]">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ selected.name }}</p>
                <p class="text-xs text-gray-400">{{ selected.email }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ new Date(selected.createdAt).toLocaleString() }}</p>
              </div>
              <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <label for="selected-message-status" class="sr-only">Statut du message</label>
                <select id="selected-message-status" v-model="selected.status" class="input-field min-h-11 min-w-[130px] !px-3 !py-2 text-sm">
                  <option value="new">Nouveau</option>
                  <option value="in_progress">En cours</option>
                  <option value="replied">Répondu</option>
                  <option value="archived">Archivé</option>
                </select>
                <button
                  class="min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                  :disabled="saving"
                  @click="saveMeta"
                >
                  {{ saving ? 'Sauvegarde…' : 'Enregistrer' }}
                </button>
              </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-wrap">{{ selected.message }}</p>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Tags</p>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="tag in selected.tags"
                :key="`selected-${tag}`"
                class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-gray-200"
              >
                #{{ tag }}
                <button type="button" class="-my-2 -mr-2 grid h-9 w-9 place-items-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10" :aria-label="`Retirer le tag ${tag}`" @click="removeTag(tag)">×</button>
              </span>
            </div>
            <div class="flex gap-2">
              <input
                v-model="tagInput"
                type="text"
                placeholder="Ajouter un tag"
                class="input-field"
                @keydown.enter.prevent="addTag"
              >
              <button type="button" class="min-h-11 rounded-lg bg-gray-100 px-4 text-sm font-semibold dark:bg-white/[0.08]" @click="addTag">Ajouter</button>
            </div>
          </div>

          <div>
            <label for="reply-subject" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Sujet</label>
            <input id="reply-subject" v-model="replySubject" type="text" class="input-field" />
          </div>
          <div>
            <label for="reply-body" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Réponse</label>
            <textarea id="reply-body" v-model="replyBody" rows="8" class="input-field resize-y" />
          </div>
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end">
            <button
              class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
              :disabled="sending"
              @click="sendReply"
            >
              {{ sending ? 'Envoi…' : 'Envoyer la réponse' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
