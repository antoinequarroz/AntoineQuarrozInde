<script setup lang="ts">
import type { InstagramSnapshot, SocialInsightsResponse, SocialSiteResponse } from '../../../shared/types/socialInsights'

const auth = useAuthStore()
const snapshot = ref<InstagramSnapshot | null>(null)
const site = ref<SocialSiteResponse | null>(null)
const loading = ref(false)
const instagramError = ref(false)
const labels = { instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X' }
const stale = computed(() => Boolean(snapshot.value && Date.now() - Date.parse(snapshot.value.lastSuccessfulAt || snapshot.value.collectedAt) > 3 * 3_600_000))
const stateLabel = computed(() => instagramError.value ? 'Indisponible' : !snapshot.value ? 'En attente de synchronisation'
  : stale.value ? 'Relevé ancien' : snapshot.value.state === 'connected' ? 'Connecté · lecture seule' : 'À vérifier')
const metrics = computed(() => [
  { label: 'Comptes touchés', value: snapshot.value?.metrics.reach },
  { label: 'Comptes engagés', value: snapshot.value?.metrics.accounts_engaged },
  { label: 'Interactions', value: snapshot.value?.metrics.total_interactions },
])
function count(value: number | null | undefined) { return value == null ? '—' : value.toLocaleString('fr-CH') }
function date(value: string | null | undefined, time = false) {
  if (!value) return 'inconnue'
  return new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', dateStyle: 'short', ...(time ? { timeStyle: 'short' as const } : {}) }).format(new Date(value))
}
const nativePeriod = computed(() => {
  const period = snapshot.value?.period
  return period ? `${date(period.from)} – ${date(new Date(Date.parse(period.to) - 1).toISOString())}` : 'Période non disponible'
})
async function load() {
  if (loading.value) return
  loading.value = true
  const [instagram, website] = await Promise.allSettled([
    $fetch<SocialInsightsResponse>('/api/admin/social-insights', { headers: auth.authHeader() }),
    $fetch<SocialSiteResponse>('/api/admin/social-site-stats', { headers: auth.authHeader() }),
  ])
  if (instagram.status === 'fulfilled') { snapshot.value = instagram.value.instagram; instagramError.value = false }
  else instagramError.value = true
  site.value = website.status === 'fulfilled' ? website.value : null
  loading.value = false
}
onMounted(load)
</script>

<template>
  <section class="admin-card space-y-5" aria-label="Statistiques des réseaux sociaux">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div><p class="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">Réseaux sociaux</p><h2 class="mt-1 font-display text-xl font-semibold">Audience et visites vers le site</h2><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les statistiques des réseaux et les visites du site mesurent des résultats différents.</p></div>
      <button type="button" :disabled="loading" class="min-h-11 rounded-lg border border-gray-200 px-4 text-sm font-semibold disabled:opacity-50 dark:border-white/10" @click="load">{{ loading ? 'Chargement…' : 'Actualiser les relevés' }}</button>
    </div>
    <div class="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <article class="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-400/20 dark:bg-violet-500/[0.06]">
        <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="font-semibold">Instagram · @antoinequarroz.dev</h3><span class="rounded-full bg-white px-2.5 py-1 text-xs font-medium dark:bg-white/10">{{ stateLabel }}</span></div>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Dernière collecte : {{ date(snapshot?.collectedAt, true) }} · depuis Hermes et le studio sur le Mac.</p>
        <p v-if="instagramError || stale || (snapshot && snapshot.state !== 'connected')" role="status" class="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{{ stale ? 'Le Mac ne transmet plus de relevé récent. Les dernières mesures restent affichées avec leur date.' : 'La lecture Instagram est à vérifier dans Hermes. Aucun zéro ne remplace une mesure absente.' }}<span v-if="snapshot?.lastSuccessfulAt"> Dernière lecture disponible : {{ date(snapshot.lastSuccessfulAt, true) }}.</span></p>
        <dl class="mt-4 grid grid-cols-2 gap-3">
          <div><dt class="text-xs text-gray-500 dark:text-gray-400">Abonnés · au dernier relevé</dt><dd class="mt-1 text-2xl font-semibold tabular-nums">{{ count(snapshot?.profile?.followers) }}</dd></div>
          <div><dt class="text-xs text-gray-500 dark:text-gray-400">Publications · au dernier relevé</dt><dd class="mt-1 text-2xl font-semibold tabular-nums">{{ count(snapshot?.profile?.mediaCount) }}</dd></div>
        </dl>
        <p class="mt-5 text-xs font-semibold">14 jours complets · {{ nativePeriod }}</p>
        <dl class="mt-3 grid grid-cols-3 gap-2"><div v-for="metric in metrics" :key="metric.label" class="rounded-lg bg-white p-3 dark:bg-white/[0.05]"><dt class="text-xs text-gray-500 dark:text-gray-400">{{ metric.label }}</dt><dd class="mt-1 text-xl font-semibold tabular-nums">{{ count(metric.value) }}</dd></div></dl>
        <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">— : mesure non disponible. Les abonnés actuels ne représentent pas une croissance sur 14 jours. La connexion autorise le profil et les statistiques, aucun envoi.</p>
      </article>
      <article class="rounded-xl border border-gray-200 p-4 dark:border-white/10">
        <h3 class="font-semibold">Visites vers antoinequarroz.ch</h3><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">PostHog · 30 derniers jours · liens UTM et référents détectés.</p>
        <table class="mt-4 w-full text-left text-sm"><caption class="sr-only">Visiteurs et pages vues sur le site par réseau social</caption><thead class="text-xs text-gray-500 dark:text-gray-400"><tr><th scope="col" class="pb-3">Réseau</th><th scope="col" class="pb-3 text-right">Visiteurs</th><th scope="col" class="pb-3 text-right">Pages vues</th></tr></thead><tbody><tr v-for="platform in (['instagram', 'linkedin', 'x'] as const)" :key="platform" class="border-t border-gray-100 dark:border-white/10"><th scope="row" class="py-3 font-medium">{{ labels[platform] }}</th><td class="py-3 text-right tabular-nums">{{ count(site?.rows.find(row => row.platform === platform)?.visitors) }}</td><td class="py-3 text-right tabular-nums">{{ count(site?.rows.find(row => row.platform === platform)?.pageviews) }}</td></tr></tbody></table>
        <p v-if="!site?.available" role="status" class="mt-3 text-xs text-amber-800 dark:text-amber-300">{{ site?.configured ? 'PostHog est temporairement indisponible.' : 'La mesure PostHog n’est pas disponible pour cette organisation.' }}</p>
        <p v-else class="mt-3 text-xs text-gray-500 dark:text-gray-400">Mesuré le {{ date(site.measuredAt, true) }}. Un visiteur peut apparaître dans plusieurs canaux : ces nombres ne s’additionnent pas.</p>
        <div class="mt-5 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.04]"><h3 class="text-sm font-semibold">Statistiques natives LinkedIn et X</h3><p class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">Abonnés, impressions et engagement : accès aux statistiques non raccordé. Une connexion de publication ne garantit pas ces permissions.</p></div>
      </article>
    </div>
    <div v-if="snapshot?.media.length" class="border-t border-gray-100 pt-4 dark:border-white/10"><h3 class="text-sm font-semibold">Dernières publications Instagram</h3><p class="mt-1 text-xs text-gray-500 dark:text-gray-400">J’aime et commentaires cumulés au dernier relevé, jusqu’à 10 publications.</p><ul class="mt-3 space-y-2"><li v-for="media in snapshot.media" :key="media.id" class="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.04]"><a :href="media.url" target="_blank" rel="noopener noreferrer" class="min-w-0 max-w-lg text-sm text-violet-700 hover:underline dark:text-violet-300">{{ media.caption || 'Voir la publication Instagram' }} ↗</a><span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">{{ date(media.publishedAt) }} · {{ count(media.likes) }} J’aime · {{ count(media.comments) }} commentaires</span></li></ul></div>
  </section>
</template>
