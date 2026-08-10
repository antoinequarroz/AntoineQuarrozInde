<script setup lang="ts">
const { locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')

const copy = computed(() => locale.value === 'en' ? {
  title: 'Terms of use', intro: 'By using this website, you agree to use it lawfully and without disrupting its operation.',
  operatorTitle: 'Website operator', operator: 'This website is operated by Antoine Quarroz, an independent professional based in Saint-Martin VS, Switzerland. Full identity and contact details are available in the legal notice.', operatorLink: 'Read the legal notice',
  contentTitle: 'Website content', content: 'The portfolio, copy, visuals and code presented on this website remain protected by applicable intellectual-property rules unless stated otherwise. Project information is provided for presentation purposes and may evolve.',
  linksTitle: 'External services', links: 'The website may link to third-party services, including Cal.com and Google Maps. Their own terms and privacy policies apply when you use them.',
  googleTitle: 'Google Maps content', google: 'Google Maps review content is used under the Google Maps Platform terms. Google Maps remains the source of that content; each displayed review provides access to its source and reporting link.',
  googleTermsLabel: 'Google Maps Platform terms',
  availabilityTitle: 'Availability', availability: 'Reasonable care is taken to keep the website accurate and available, but uninterrupted access cannot be guaranteed. Only a written proposal or contract creates a binding project commitment.',
} : locale.value === 'de' ? {
  title: 'Nutzungsbedingungen', intro: 'Mit der Nutzung dieser Website verpflichten Sie sich zu einer rechtmässigen Nutzung, ohne ihren Betrieb zu beeinträchtigen.',
  operatorTitle: 'Betreiber der Website', operator: 'Diese Website wird von Antoine Quarroz, einem Selbständigerwerbenden mit Sitz in Saint-Martin VS, Schweiz, betrieben. Die vollständigen Identitäts- und Kontaktdaten finden Sie im Impressum.', operatorLink: 'Impressum lesen',
  contentTitle: 'Inhalte der Website', content: 'Portfolio, Texte, visuelle Inhalte und Code sind, sofern nicht anders angegeben, durch die anwendbaren Rechte des geistigen Eigentums geschützt. Projektinformationen dienen der Präsentation und können sich ändern.',
  linksTitle: 'Externe Dienste', links: 'Die Website kann auf Dienste Dritter wie Cal.com oder Google Maps verlinken. Bei deren Nutzung gelten die jeweiligen Bedingungen und Datenschutzrichtlinien.',
  googleTitle: 'Inhalte von Google Maps', google: 'Bewertungen von Google Maps werden gemäss den Bedingungen der Google Maps Platform verwendet. Google Maps bleibt die Quelle; jede angezeigte Bewertung verweist auf ihre Quelle und eine Meldemöglichkeit.',
  googleTermsLabel: 'Bedingungen der Google Maps Platform',
  availabilityTitle: 'Verfügbarkeit', availability: 'Die Website wird mit angemessener Sorgfalt aktuell gehalten, ein unterbrechungsfreier Zugang kann jedoch nicht garantiert werden. Verbindlich sind ausschliesslich schriftliche Angebote oder Verträge.',
} : {
  title: 'Conditions d’utilisation', intro: 'En utilisant ce site, vous vous engagez à le faire de manière licite et sans perturber son fonctionnement.',
  operatorTitle: 'Exploitant du site', operator: 'Ce site est exploité par Antoine Quarroz, indépendant établi à Saint-Martin VS, en Suisse. Son identité et ses coordonnées complètes figurent dans les mentions légales.', operatorLink: 'Consulter les mentions légales',
  contentTitle: 'Contenu du site', content: 'Le portfolio, les textes, les créations visuelles et le code présentés restent protégés par les règles applicables de propriété intellectuelle, sauf indication contraire. Les informations sur les projets sont fournies à titre de présentation et peuvent évoluer.',
  linksTitle: 'Services externes', links: 'Le site peut renvoyer vers des services tiers, notamment Cal.com et Google Maps. Leurs propres conditions et politiques de confidentialité s’appliquent lorsque vous les utilisez.',
  googleTitle: 'Contenus Google Maps', google: 'Les avis Google Maps sont utilisés conformément aux conditions de Google Maps Platform. Google Maps reste la source de ces contenus ; chaque avis affiché permet d’accéder à sa source et à son lien de signalement.',
  googleTermsLabel: 'Conditions de Google Maps Platform',
  availabilityTitle: 'Disponibilité', availability: 'Un soin raisonnable est apporté à l’exactitude et à la disponibilité du site, mais un accès ininterrompu ne peut être garanti. Seuls une offre ou un contrat écrit constituent un engagement de projet.',
})

useSeoMeta({ title: () => `${copy.value.title} — Antoine Quarroz`, description: () => copy.value.intro, robots: 'index, follow' })
useHead({ link: [
  { rel: 'canonical', href: `${siteUrl}${localePath('/conditions-utilisation')}` },
  { rel: 'alternate', hreflang: 'fr-CH', href: `${siteUrl}/conditions-utilisation` },
  { rel: 'alternate', hreflang: 'en-US', href: `${siteUrl}/en/conditions-utilisation` },
  { rel: 'alternate', hreflang: 'de-CH', href: `${siteUrl}/de/conditions-utilisation` },
  { rel: 'alternate', hreflang: 'x-default', href: `${siteUrl}/conditions-utilisation` },
] })
</script>

<template>
  <main class="pb-24 pt-28"><article class="section-container max-w-4xl">
    <h1 class="font-display text-4xl font-bold text-gray-950 dark:text-white sm:text-5xl">{{ copy.title }}</h1>
    <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">{{ copy.intro }}</p>
    <div class="mt-12 space-y-10">
      <section><h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.operatorTitle }}</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.operator }}</p><NuxtLink :to="localePath('/mentions-legales')" class="mt-3 inline-flex min-h-11 items-center font-semibold text-violet-700 underline decoration-violet-400/60 underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-300">{{ copy.operatorLink }}</NuxtLink></section>
      <section><h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.contentTitle }}</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.content }}</p></section>
      <section><h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.linksTitle }}</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.links }}</p></section>
      <section><h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.googleTitle }}</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.google }}</p><a href="https://cloud.google.com/maps-platform/terms" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex min-h-11 items-center font-semibold text-violet-700 underline decoration-violet-400/60 underline-offset-4 dark:text-violet-300">{{ copy.googleTermsLabel }}</a></section>
      <section><h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.availabilityTitle }}</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.availability }}</p></section>
    </div>
  </article></main>
</template>
