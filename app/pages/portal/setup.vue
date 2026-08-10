<script setup lang="ts">
definePageMeta({ layout: false })
const password = ref('')
const confirmation = ref('')
const message = ref('')
const saving = ref(false)

async function submit() {
  message.value = ''
  if (password.value.length < 10) { message.value = 'Utilisez au moins 10 caractères.'; return }
  if (password.value !== confirmation.value) { message.value = 'Les mots de passe ne correspondent pas.'; return }
  saving.value = true
  const client = useSupabaseClient()
  const { error } = await client.auth.updateUser({ password: password.value })
  if (error) { saving.value = false; message.value = 'Le lien est invalide ou expiré. Demandez une nouvelle invitation.'; return }
  const { data: sessionData } = await client.auth.getSession()
  try {
    await $fetch('/api/portal/activate', {
      method: 'POST',
      headers: sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : undefined,
    })
    await navigateTo('/portal')
  }
  catch {
    saving.value = false
    message.value = 'Le mot de passe est enregistré, mais l’espace n’a pas pu être activé. Contactez Antoine.'
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[#080811] p-4 text-white">
    <form class="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl" @submit.prevent="submit">
      <p class="font-display text-sm font-semibold text-violet-300">Antoine Quarroz</p>
      <h1 class="mt-6 font-display text-3xl font-semibold">Activez votre espace</h1>
      <p class="mt-2 text-sm text-white/60">Choisissez un mot de passe personnel pour vos prochaines connexions.</p>
      <label for="portal-new-password" class="mt-6 block text-sm font-medium">Nouveau mot de passe</label>
      <input id="portal-new-password" v-model="password" type="password" autocomplete="new-password" minlength="10" required class="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 outline-none focus:ring-2 focus:ring-violet-400">
      <label for="portal-confirm-password" class="mt-4 block text-sm font-medium">Confirmation</label>
      <input id="portal-confirm-password" v-model="confirmation" type="password" autocomplete="new-password" minlength="10" required class="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 outline-none focus:ring-2 focus:ring-violet-400">
      <p v-if="message" role="alert" class="mt-3 text-sm text-red-300">{{ message }}</p>
      <button type="submit" class="mt-6 min-h-11 w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold" :disabled="saving">{{ saving ? 'Activation…' : 'Activer mon espace' }}</button>
    </form>
  </main>
</template>
