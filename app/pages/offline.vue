<script setup lang="ts">
useSeoMeta({
  title: 'Hors ligne | Antoine Quarroz',
  description: 'Retrouvez le site dès que votre connexion revient.',
})
</script>

<template>
  <main class="min-h-screen bg-[var(--bg)] text-white">
    <section class="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p class="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-300/80">Mode hors ligne</p>
      <h1 class="text-3xl font-semibold sm:text-4xl">Connexion indisponible</h1>
      <p class="mt-4 max-w-xl text-sm text-white/70 sm:text-base">
        Cette page a besoin d’une connexion Internet. Dès qu’elle revient, rechargez la page pour retrouver mes projets et me parler de votre idée.
      </p>
      <NuxtLink
        to="/"
        class="mt-8 inline-flex items-center rounded-full bg-violet-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
      >
        Retour à l’accueil
      </NuxtLink>
    </section>
  </main>
</template>
