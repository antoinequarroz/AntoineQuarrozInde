<script setup lang="ts">
useSeoMeta({
  title: 'Hors ligne | Antoine Quarroz',
  description: 'Cette page est disponible hors connexion.',
})
</script>

<template>
  <main class="min-h-screen bg-[var(--bg)] text-white">
    <section class="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p class="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-300/80">Mode hors ligne</p>
      <h1 class="text-3xl font-semibold sm:text-4xl">Connexion indisponible</h1>
      <p class="mt-4 max-w-xl text-sm text-white/70 sm:text-base">
        Tu peux continuer a consulter les pages deja mises en cache. Des que le reseau revient, recharge la page pour retrouver toutes les fonctions.
      </p>
      <NuxtLink
        to="/"
        class="mt-8 inline-flex items-center rounded-full bg-violet-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
      >
        Retour a l'accueil
      </NuxtLink>
    </section>
  </main>
</template>
