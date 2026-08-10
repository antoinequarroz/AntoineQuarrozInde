<script setup lang="ts">
const { locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')

const copy = computed(() => locale.value === 'en' ? {
  eyebrow: 'Legal information',
  title: 'Legal notice',
  updated: 'Last updated: 10 August 2026',
  intro: 'This page identifies the person responsible for this website and provides the main legal information concerning its operation.',
  operatorTitle: 'Website operator',
  status: 'Independent professional — sole proprietorship',
  addressLabel: 'Postal address',
  country: 'Switzerland',
  contactLabel: 'Direct contact',
  activityTitle: 'Business activity',
  activity: 'Design and development of websites, web and mobile applications and content management systems, as well as maintenance and digital project support.',
  hostingTitle: 'Hosting',
  hosting: 'This website is hosted in Switzerland by Infomaniak Network SA, Rue Eugène-Marziano 25, 1227 Les Acacias (GE), Switzerland.',
  hostingLink: 'Infomaniak legal information',
  hostingUrl: 'https://www.infomaniak.com/en/legal/legal-notice',
  intellectualTitle: 'Intellectual property',
  intellectual: 'Unless otherwise indicated, the texts, visual creations, interfaces, source code and other original elements published on this website belong to Antoine Quarroz. Any reproduction or substantial reuse requires prior written permission, subject to mandatory legal exceptions and third-party rights.',
  liabilityTitle: 'Liability and external links',
  liability: 'Reasonable care is taken to keep the information on this website accurate and up to date. However, no guarantee is given as to its completeness or uninterrupted availability. External websites remain under the responsibility of their respective operators.',
  lawTitle: 'Applicable law',
  law: 'This website is governed by Swiss law. In the event of a disagreement, please contact Antoine Quarroz first so that an amicable solution can be sought.',
  privacyPrefix: 'Information about personal-data processing is available in the',
  privacyLink: 'privacy policy',
} : locale.value === 'de' ? {
  eyebrow: 'Rechtliche Informationen',
  title: 'Impressum',
  updated: 'Letzte Aktualisierung: 10. August 2026',
  intro: 'Diese Seite nennt die für die Website verantwortliche Person und enthält die wichtigsten rechtlichen Angaben zu ihrem Betrieb.',
  operatorTitle: 'Betreiber der Website',
  status: 'Selbständigerwerbend — Einzelunternehmen',
  addressLabel: 'Postanschrift',
  country: 'Schweiz',
  contactLabel: 'Direkter Kontakt',
  activityTitle: 'Geschäftstätigkeit',
  activity: 'Konzeption und Entwicklung von Websites, Web- und Mobile-Anwendungen und Content-Management-Systemen sowie Wartung und Begleitung digitaler Projekte.',
  hostingTitle: 'Hosting',
  hosting: 'Diese Website wird in der Schweiz von Infomaniak Network SA, Rue Eugène-Marziano 25, 1227 Les Acacias (GE), Schweiz, gehostet.',
  hostingLink: 'Rechtliche Informationen von Infomaniak',
  hostingUrl: 'https://www.infomaniak.com/de/agb/impressum',
  intellectualTitle: 'Geistiges Eigentum',
  intellectual: 'Sofern nicht anders angegeben, gehören die auf dieser Website veröffentlichten Texte, visuellen Gestaltungen, Benutzeroberflächen, Quellcodes und sonstigen Originalinhalte Antoine Quarroz. Jede Vervielfältigung oder wesentliche Weiterverwendung bedarf einer vorherigen schriftlichen Genehmigung, vorbehaltlich zwingender gesetzlicher Ausnahmen und der Rechte Dritter.',
  liabilityTitle: 'Haftung und externe Links',
  liability: 'Die Informationen dieser Website werden mit angemessener Sorgfalt aktuell und korrekt gehalten. Für ihre Vollständigkeit oder eine ununterbrochene Verfügbarkeit wird jedoch keine Gewähr übernommen. Externe Websites unterliegen der Verantwortung ihrer jeweiligen Betreiber.',
  lawTitle: 'Anwendbares Recht',
  law: 'Diese Website untersteht schweizerischem Recht. Bei Meinungsverschiedenheiten wenden Sie sich bitte zuerst an Antoine Quarroz, damit eine einvernehmliche Lösung gesucht werden kann.',
  privacyPrefix: 'Informationen zur Bearbeitung personenbezogener Daten finden Sie in der',
  privacyLink: 'Datenschutzerklärung',
} : {
  eyebrow: 'Informations légales',
  title: 'Mentions légales',
  updated: 'Dernière mise à jour : 10 août 2026',
  intro: 'Cette page identifie la personne responsable du site et réunit les principales informations légales relatives à son exploitation.',
  operatorTitle: 'Éditeur et exploitant du site',
  status: 'Indépendant — entreprise individuelle',
  addressLabel: 'Adresse postale',
  country: 'Suisse',
  contactLabel: 'Contact direct',
  activityTitle: 'Activité',
  activity: 'Conception et développement de sites internet, d’applications web et mobiles et de systèmes de gestion de contenu, ainsi que maintenance et accompagnement de projets numériques.',
  hostingTitle: 'Hébergement',
  hosting: 'Ce site est hébergé en Suisse par Infomaniak Network SA, Rue Eugène-Marziano 25, 1227 Les Acacias (GE), Suisse.',
  hostingLink: 'Mentions légales d’Infomaniak',
  hostingUrl: 'https://www.infomaniak.com/fr/cgv/mentions-legales',
  intellectualTitle: 'Propriété intellectuelle',
  intellectual: 'Sauf indication contraire, les textes, créations visuelles, interfaces, codes sources et autres éléments originaux publiés sur ce site appartiennent à Antoine Quarroz. Toute reproduction ou réutilisation substantielle nécessite une autorisation écrite préalable, sous réserve des exceptions légales impératives et des droits de tiers.',
  liabilityTitle: 'Responsabilité et liens externes',
  liability: 'Un soin raisonnable est apporté à l’exactitude et à la mise à jour des informations publiées. Leur exhaustivité et la disponibilité ininterrompue du site ne peuvent toutefois pas être garanties. Les sites externes restent sous la responsabilité de leurs exploitants respectifs.',
  lawTitle: 'Droit applicable',
  law: 'Ce site est soumis au droit suisse. En cas de désaccord, vous êtes invité à contacter d’abord Antoine Quarroz afin de rechercher une solution amiable.',
  privacyPrefix: 'Les informations relatives au traitement des données personnelles figurent dans la',
  privacyLink: 'politique de confidentialité',
})

useSeoMeta({
  title: () => `${copy.value.title} — Antoine Quarroz`,
  description: () => copy.value.intro,
  robots: 'index, follow',
})
useHead({ link: [
  { rel: 'canonical', href: `${siteUrl}${localePath('/mentions-legales')}` },
  { rel: 'alternate', hreflang: 'fr-CH', href: `${siteUrl}/mentions-legales` },
  { rel: 'alternate', hreflang: 'en-US', href: `${siteUrl}/en/mentions-legales` },
  { rel: 'alternate', hreflang: 'de-CH', href: `${siteUrl}/de/mentions-legales` },
  { rel: 'alternate', hreflang: 'x-default', href: `${siteUrl}/mentions-legales` },
] })
</script>

<template>
  <!-- THESIS: a calm, verifiable legal dossier. OWN-WORLD: existing violet/cyan Read surface. STORY: identity, activity, hosting, rights, responsibility. FIRST VIEWPORT: owner and direct contact. FORM: narrow established-world extension; concept seed not applicable. FINISH: information must remain legible and easy to verify on mobile. -->
  <main class="pb-24 pt-28">
    <article class="section-container max-w-4xl">
      <header>
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
          {{ copy.eyebrow }}
        </p>
        <h1 class="mt-4 font-display text-4xl font-bold text-gray-950 dark:text-white sm:text-5xl">
          {{ copy.title }}
        </h1>
        <p class="mt-5 text-sm text-gray-500 dark:text-gray-400">
          {{ copy.updated }}
        </p>
        <p class="mt-6 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300">
          {{ copy.intro }}
        </p>
      </header>

      <section class="relative mt-10 overflow-hidden rounded-3xl border border-violet-200/80 bg-white/85 p-6 shadow-xl shadow-violet-500/5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-8" aria-labelledby="operator-heading">
        <div class="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div class="relative">
          <h2 id="operator-heading" class="font-display text-2xl font-bold text-gray-950 dark:text-white">
            {{ copy.operatorTitle }}
          </h2>
          <p class="mt-3 text-lg font-semibold text-violet-700 dark:text-violet-300">
            Antoine Quarroz
          </p>
          <p class="mt-1 text-gray-600 dark:text-gray-300">
            {{ copy.status }}
          </p>

          <dl class="mt-7 grid gap-6 border-t border-gray-200/80 pt-7 dark:border-white/10 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{{ copy.addressLabel }}</dt>
              <dd class="mt-2 leading-7 text-gray-800 dark:text-gray-200">
                Rue de l’Evouette 5<br>
                1969 Saint-Martin VS<br>
                {{ copy.country }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{{ copy.contactLabel }}</dt>
              <dd class="mt-2 space-y-1 leading-7">
                <a href="mailto:info@antoinequarroz.ch" class="flex min-h-11 items-center font-medium text-violet-700 underline decoration-violet-400/50 underline-offset-4 dark:text-violet-300">info@antoinequarroz.ch</a>
                <a href="tel:+41791576450" class="flex min-h-11 items-center font-medium text-violet-700 underline decoration-violet-400/50 underline-offset-4 dark:text-violet-300">+41 79 157 64 50</a>
                <a href="https://www.antoinequarroz.ch" class="flex min-h-11 items-center font-medium text-violet-700 underline decoration-violet-400/50 underline-offset-4 dark:text-violet-300">www.antoinequarroz.ch</a>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div class="mt-12 space-y-10">
        <section>
          <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.activityTitle }}</h2>
          <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.activity }}</p>
        </section>
        <section>
          <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.hostingTitle }}</h2>
          <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.hosting }}</p>
          <a :href="copy.hostingUrl" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex min-h-11 items-center font-semibold text-violet-700 underline decoration-violet-400/50 underline-offset-4 dark:text-violet-300">{{ copy.hostingLink }}</a>
        </section>
        <section>
          <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.intellectualTitle }}</h2>
          <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.intellectual }}</p>
        </section>
        <section>
          <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.liabilityTitle }}</h2>
          <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.liability }}</p>
        </section>
        <section>
          <h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.lawTitle }}</h2>
          <p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.law }}</p>
          <p class="mt-4 leading-7 text-gray-600 dark:text-gray-300">
            {{ copy.privacyPrefix }}
            <NuxtLink :to="localePath('/confidentialite')" class="font-semibold text-violet-700 underline decoration-violet-400/60 underline-offset-4 dark:text-violet-300">{{ copy.privacyLink }}</NuxtLink>.
          </p>
        </section>
      </div>
    </article>
  </main>
</template>
