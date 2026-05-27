<script setup lang="ts">
import type { ContactMessage } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const sending = ref(false)
const messages = ref<ContactMessage[]>([])
const selected = ref<ContactMessage | null>(null)
const replySubject = ref('')
const replyBody = ref('')

async function loadMessages() {
  loading.value = true
  try {
    messages.value = await $fetch<ContactMessage[]>('/api/messages', {
      headers: auth.authHeader(),
    })
    if (!selected.value && messages.value.length) {
      selected.value = messages.value[0]
      prefillReply(messages.value[0])
    }
  }
  catch {
    toast.error('Erreur chargement messages')
  }
  finally {
    loading.value = false
  }
}

function prefillReply(message: ContactMessage) {
  selected.value = message
  replySubject.value = message.subject ? `Re: ${message.subject}` : 'Re: Votre message'
  replyBody.value = `Bonjour ${message.name},\n\nMerci pour votre message.\n\nBien à vous,\nAntoine Quarroz`
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
    toast.success('Réponse envoyée')
    await loadMessages()
  }
  catch {
    toast.error('Erreur envoi réponse')
  }
  finally {
    sending.value = false
  }
}

onMounted(loadMessages)
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="font-display font-semibold text-xl text-gray-900 dark:text-white">Messages contact</h1>
      <p class="text-sm text-gray-400 mt-0.5">Gérez les demandes entrantes et répondez depuis l’admin.</p>
    </div>

    <div class="grid lg:grid-cols-[340px_1fr] gap-4">
      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] text-xs text-gray-400">
          {{ messages.length }} message(s)
        </div>
        <div v-if="loading" class="p-4 text-sm text-gray-400">Chargement...</div>
        <div v-else-if="!messages.length" class="p-4 text-sm text-gray-400">Aucun message.</div>
        <div v-else class="max-h-[70vh] overflow-y-auto">
          <button
            v-for="msg in messages"
            :key="msg.id"
            class="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors"
            :class="selected?.id === msg.id ? 'bg-violet-50/60 dark:bg-violet-500/10' : ''"
            @click="prefillReply(msg)"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{{ msg.name }}</p>
              <span
                class="text-[10px] font-semibold px-2 py-0.5 rounded"
                :class="msg.status === 'replied' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300'"
              >
                {{ msg.status === 'replied' ? 'répondu' : 'nouveau' }}
              </span>
            </div>
            <p class="text-xs text-gray-400 truncate">{{ msg.email }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{{ msg.message }}</p>
          </button>
        </div>
      </div>

      <div class="bg-white dark:bg-[#111118] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4 sm:p-5">
        <div v-if="!selected" class="text-sm text-gray-400">Sélectionnez un message.</div>
        <div v-else class="space-y-4">
          <div class="pb-3 border-b border-gray-100 dark:border-white/[0.06]">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ selected.name }}</p>
            <p class="text-xs text-gray-400">{{ selected.email }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-wrap">{{ selected.message }}</p>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Sujet</label>
            <input v-model="replySubject" type="text" class="input-field" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Réponse</label>
            <textarea v-model="replyBody" rows="8" class="input-field resize-y" />
          </div>
          <div class="flex justify-end">
            <button
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
              :disabled="sending"
              @click="sendReply"
            >
              {{ sending ? 'Envoi...' : 'Envoyer la réponse' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
