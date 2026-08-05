<script setup lang="ts">
definePageMeta({ layout: false })
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  if (await auth.login(email.value, password.value)) await navigateTo('/portal')
  else errorMessage.value = 'E-mail ou mot de passe incorrect.'
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
      <button type="submit" class="mt-6 min-h-11 w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold text-white disabled:opacity-60" :disabled="auth.loading">{{ auth.loading ? 'Connexion…' : 'Se connecter' }}</button>
    </form>
  </main>
</template>
