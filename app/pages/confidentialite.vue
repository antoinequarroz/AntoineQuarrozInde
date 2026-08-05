<script setup lang="ts">
const { locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')

const copy = computed(() => locale.value === 'en' ? {
  title: 'Privacy policy', updated: 'Last updated: 5 August 2026', intro: 'This page explains which data may be processed when you use this website and why.',
  contactTitle: 'Contact and appointments', contact: 'Information you submit is used to answer your request, prepare a project discussion or organise an appointment. Email delivery may use Resend and appointments may open Cal.com.',
  servicesTitle: 'Technical services', services: 'The site uses Supabase for application data and authentication, Cloudflare Turnstile to limit abuse, and hosting infrastructure required to serve the website. These providers may process technical data such as IP address, browser information and request timestamps.',
  googleTitle: 'Google Maps reviews', google: 'When Google reviews are enabled, the site requests live content from the Google Places API. Review author information, profile images and links are supplied by Google Maps. This content is not copied into the website database. Displaying remote Google content may establish a connection to Google.',
  rightsTitle: 'Your rights', rights: 'You may request access, correction or deletion of personal data you submitted by writing to info@antoinequarroz.ch. Certain information may be retained where required by law.',
} : locale.value === 'de' ? {
  title: 'Datenschutzerklärung', updated: 'Letzte Aktualisierung: 5. August 2026', intro: 'Diese Seite erklärt, welche Daten bei der Nutzung dieser Website verarbeitet werden können und warum.',
  contactTitle: 'Kontakt und Termine', contact: 'Ihre Angaben werden verwendet, um Ihre Anfrage zu beantworten, ein Projektgespräch vorzubereiten oder einen Termin zu organisieren. Für E-Mails kann Resend und für Termine Cal.com eingesetzt werden.',
  servicesTitle: 'Technische Dienste', services: 'Die Website nutzt Supabase für Anwendungsdaten und Authentifizierung, Cloudflare Turnstile zum Schutz vor Missbrauch sowie die notwendige Hosting-Infrastruktur. Diese Anbieter können technische Daten wie IP-Adresse, Browserinformationen und Zeitstempel verarbeiten.',
  googleTitle: 'Bewertungen von Google Maps', google: 'Wenn Google-Bewertungen aktiviert sind, ruft die Website Inhalte live über die Google Places API ab. Angaben zu Autoren, Profilbildern und Links stammen von Google Maps. Diese Inhalte werden nicht in der Website-Datenbank gespeichert. Externe Google-Inhalte können eine Verbindung zu Google herstellen.',
  rightsTitle: 'Ihre Rechte', rights: 'Sie können per E-Mail an info@antoinequarroz.ch Auskunft, Berichtigung oder Löschung der von Ihnen übermittelten personenbezogenen Daten verlangen. Gesetzliche Aufbewahrungspflichten bleiben vorbehalten.',
} : {
  title: 'Politique de confidentialité', updated: 'Dernière mise à jour : 5 août 2026', intro: 'Cette page explique quelles données peuvent être traitées lors de votre utilisation du site et dans quel but.',
  contactTitle: 'Contact et rendez-vous', contact: 'Les informations transmises servent à répondre à votre demande, préparer un échange de projet ou organiser un rendez-vous. L’envoi des e-mails peut utiliser Resend et la prise de rendez-vous peut ouvrir Cal.com.',
  servicesTitle: 'Services techniques', services: 'Le site utilise Supabase pour les données applicatives et l’authentification, Cloudflare Turnstile pour limiter les abus et l’infrastructure d’hébergement nécessaire. Ces prestataires peuvent traiter des données techniques comme l’adresse IP, le navigateur et l’heure des requêtes.',
  googleTitle: 'Avis Google Maps', google: 'Lorsque les avis Google sont activés, le site récupère leur contenu en direct via l’API Google Places. Les informations d’auteur, photos de profil et liens sont fournis par Google Maps. Ces contenus ne sont pas copiés dans la base du site. Leur affichage peut établir une connexion avec Google.',
  rightsTitle: 'Vos droits', rights: 'Vous pouvez demander l’accès, la rectification ou la suppression des données personnelles transmises en écrivant à info@antoinequarroz.ch. Certaines informations peuvent être conservées lorsqu’une obligation légale l’exige.',
})

useSeoMeta({ title: () => `${copy.value.title} — Antoine Quarroz`, description: () => copy.value.intro, robots: 'index, follow' })
useHead({ link: [{ rel: 'canonical', href: `${siteUrl}${localePath('/confidentialite')}` }] })
</script>

<template>
  <main class="pb-24 pt-28"><article class="section-container max-w-4xl">
    <p class="text-sm font-semibold text-violet-600 dark:text-violet-300">{{ copy.updated }}</p>
    <h1 class="mt-4 font-display text-4xl font-bold text-gray-950 dark:text-white sm:text-5xl">{{ copy.title }}</h1>
    <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">{{ copy.intro }}</p>
    <div class="mt-12 space-y-10">
      <section><h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.contactTitle }}</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.contact }}</p></section>
      <section><h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.servicesTitle }}</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.services }}</p></section>
      <section><h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.googleTitle }}</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.google }}</p><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class="mt-3 inline-block font-semibold text-violet-700 hover:underline dark:text-violet-300">Google Privacy Policy</a></section>
      <section><h2 class="font-display text-2xl font-bold text-gray-950 dark:text-white">{{ copy.rightsTitle }}</h2><p class="mt-3 leading-7 text-gray-600 dark:text-gray-300">{{ copy.rights }}</p></section>
    </div>
  </article></main>
</template>
