<script setup lang="ts">
definePageMeta({ layout: false })
const auth = useAuthStore()
const route = useRoute()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const recoveryMessage = ref('')
const sendingRecovery = ref(false)

async function submit() {
  errorMessage.value = ''
  if (await auth.login(email.value, password.value, { deferOrganizationsUntilMfaChallenge: true })) {
    const redirect = safePortalRedirect(route.query.redirect)
    await navigateTo(auth.requiresMfaChallenge
      ? { path: '/admin/security', query: { redirect } }
      : redirect, { replace: true })
  }
  else errorMessage.value = 'E-mail ou mot de passe incorrect.'
}

async function sendRecovery() {
  errorMessage.value = ''
  recoveryMessage.value = ''
  if (!email.value.trim()) { errorMessage.value = 'Saisissez d’abord votre adresse e-mail.'; return }
  sendingRecovery.value = true
  const client = useSupabaseClient()
  await client.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: `${window.location.origin}/portal/setup` })
  sendingRecovery.value = false
  recoveryMessage.value = 'Si cette adresse possède un accès, un lien de réinitialisation vient d’être envoyé.'
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[#080811] p-4 text-white">
    <form class="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl" @submit.prevent="submit">
      <NuxtLink to="/" class="font-display text-sm font-semibold text-violet-300">Antoine Quarroz</NuxtLink>
      <h1 class="mt-6 font-display text-3xl font-semibold">Espace client</h1>
      <p class="mt-2 text-sm text-white/60">Retrouvez vos projets, devis et factures.</p>
      <label for="portal-email" class="mt-6 block text-sm font-medium">E-mail</label>
      <input id="portal-email" v-model="email" autocomplete="email" type="email" required class="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 outline-none focus:ring-2 focus:ring-violet-400">
      <label for="portal-password" class="mt-4 block text-sm font-medium">Mot de passe</label>
      <input id="portal-password" v-model="password" autocomplete="current-password" type="password" required class="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 outline-none focus:ring-2 focus:ring-violet-400">
      <p v-if="errorMessage" role="alert" class="mt-3 text-sm text-red-300">{{ errorMessage }}</p>
      <p v-if="recoveryMessage" role="status" class="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">{{ recoveryMessage }}</p>
      <button type="submit" class="mt-6 min-h-11 w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white disabled:opacity-60" :disabled="auth.loading">{{ auth.loading ? 'Connexion…' : 'Se connecter' }}</button>
      <button type="button" class="mt-3 min-h-11 w-full rounded-lg text-sm font-semibold text-violet-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-wait disabled:opacity-60" :disabled="sendingRecovery" @click="sendRecovery">{{ sendingRecovery ? 'Envoi…' : 'Mot de passe oublié ?' }}</button>
    </form>
  </main>
</template>
