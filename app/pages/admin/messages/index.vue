<script setup lang="ts">
import type { ContactMessage } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
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
  replied: { label: 'Repondu', classes: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300' },
  archived: { label: 'Archive', classes: 'bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-gray-300' },
}

async function loadMessages() {
  loading.value = true
  try {
    messages.value = await $fetch<ContactMessage[]>('/api/messages', {
      headers: auth.authHeader(),
    })
    if (selected.value) {
      selected.value = messages.value.find(msg => msg.id === selected.value?.id) || null
    }
    if (!selected.value && messages.value.length) {
      openMessage(messages.value[0])
    }
  }
  catch {
    toast.error('Erreur chargement messages')
  }
  finally {
    loading.value = false
  }
}

function openMessage(message: ContactMessage) {
  selected.value = message
  replySubject.value = message.subject ? `Re: ${message.subject}` : 'Re: Votre message'
  replyBody.value = `Bonjour ${message.name},\n\nMerci pour votre message.\n\nBien a vous,\nAntoine Quarroz`
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
    toast.success('Message mis a jour')
  } catch {
    toast.error('Erreur mise a jour')
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
    toast.success('Reponse envoyee')
    await loadMessages()
  }
  catch {
    toast.error('Erreur envoi reponse')
  }
  finally {
    sending.value = false
  }
}

onMounted(loadMessages)
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display font-semibold text-xl text-gray-900 dark:text-white">Messages CRM</h1>
        <p class="text-sm text-gray-400 mt-0.5">Inbox, qualification, tags et reponse depuis l'admin.</p>
      </div>
      <select v-model="statusFilter" class="input-field w-full sm:w-auto sm:max-w-[180px] text-sm">
        <option value="all">Tous les statuts</option>
        <option value="new">Nouveau</option>
        <option value="in_progress">En cours</option>
        <option value="replied">Repondu</option>
        <option value="archived">Archive</option>
      </select>
    </div>

    <div class="grid lg:grid-cols-[340px_1fr] gap-4">
      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] text-xs text-gray-400">
          {{ filteredMessages.length }} message(s)
        </div>
        <div v-if="loading" class="p-4 text-sm text-gray-400">Chargement...</div>
        <div v-else-if="!filteredMessages.length" class="p-4 text-sm text-gray-400">Aucun message pour ce filtre.</div>
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
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded" :class="statusMeta[msg.status].classes">
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
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded" :class="statusMeta[msg.status].classes">
                  {{ statusMeta[msg.status].label }}
                </span>
              </div>
              <p class="text-xs text-gray-400 truncate">{{ msg.email }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{{ msg.message }}</p>
              <div v-if="msg.tags?.length" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="tag in msg.tags"
                  :key="`${msg.id}-${tag}`"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-gray-300"
                >
                  #{{ tag }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4 sm:p-5">
        <div v-if="!selected" class="text-sm text-gray-400">Selectionnez un message.</div>
        <div v-else class="space-y-4">
          <div class="pb-3 border-b border-gray-100 dark:border-white/[0.06]">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ selected.name }}</p>
                <p class="text-xs text-gray-400">{{ selected.email }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ new Date(selected.createdAt).toLocaleString() }}</p>
              </div>
              <div class="flex items-center gap-2">
                <select v-model="selected.status" class="input-field !py-1.5 !px-2.5 text-xs min-w-[130px]">
                  <option value="new">Nouveau</option>
                  <option value="in_progress">En cours</option>
                  <option value="replied">Repondu</option>
                  <option value="archived">Archive</option>
                </select>
                <button
                  class="px-3 py-1.5 rounded-md text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60"
                  :disabled="saving"
                  @click="saveMeta"
                >
                  {{ saving ? 'Sauvegarde...' : 'Sauver' }}
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
                <button class="text-gray-500 hover:text-red-500" @click="removeTag(tag)">x</button>
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
              <button class="px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-white/[0.08]" @click="addTag">Ajouter</button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Sujet</label>
            <input v-model="replySubject" type="text" class="input-field" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Reponse</label>
            <textarea v-model="replyBody" rows="8" class="input-field resize-y" />
          </div>
          <div class="admin-sticky-actions sticky bottom-0 bg-white dark:bg-[#111118] pt-2 flex justify-end">
            <button
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
              :disabled="sending"
              @click="sendReply"
            >
              {{ sending ? 'Envoi...' : 'Envoyer la reponse' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
