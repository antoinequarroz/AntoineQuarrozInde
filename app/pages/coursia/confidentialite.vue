<script setup lang="ts">
definePageMeta({ layout: false })

const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')
const pageUrl = `${siteUrl}/coursia/confidentialite`

useSeoMeta({
  title: 'Politique de confidentialité — CoursIA',
  description: 'Découvrez comment CoursIA collecte, utilise et protège vos données personnelles.',
  robots: 'index, follow',
  ogTitle: 'Politique de confidentialité — CoursIA',
  ogDescription: 'Les données utilisées par CoursIA, leur finalité et vos droits.',
  ogUrl: pageUrl,
  ogType: 'website',
})

useHead({
  htmlAttrs: { lang: 'fr-CH' },
  link: [
    { rel: 'canonical', href: pageUrl },
    { rel: 'alternate', hreflang: 'fr-CH', href: pageUrl },
    { rel: 'alternate', hreflang: 'x-default', href: pageUrl },
  ],
})

const donnees = [
  {
    titre: 'Compte et identité',
    texte: 'Votre adresse e-mail, votre identifiant de compte et les informations nécessaires à la connexion et à la sécurité du service.',
  },
  {
    titre: 'Foyer et préférences',
    texte: 'Votre prénom, le nombre d’adultes et d’enfants, votre budget, vos enseignes favorites, vos objectifs, vos goûts, vos régimes alimentaires et les allergies que vous renseignez. Les allergies peuvent constituer des données sensibles : elles ne sont utilisées que pour adapter et sécuriser les suggestions de repas.',
  },
  {
    titre: 'Utilisation de CoursIA',
    texte: 'Vos recettes aimées ou ignorées, favoris, plannings de repas, listes de courses, préférences d’équipement, paramètres de notification et historique utile au fonctionnement des fonctionnalités.',
  },
  {
    titre: 'Contributions communautaires',
    texte: 'Les recettes, ingrédients, instructions et images que vous choisissez de proposer, ainsi que les informations nécessaires à leur modération et à leur attribution dans l’application.',
  },
  {
    titre: 'Données techniques',
    texte: 'Des événements d’usage limités, des informations techniques sur les erreurs et, si vous activez les notifications, un jeton de notification associé à votre appareil.',
  },
]

const prestataires = [
  ['Supabase', 'authentification, base de données, stockage des images et fonctions serveur'],
  ['RevenueCat et Apple', 'gestion des offres, achats intégrés, abonnements et restauration des achats'],
  ['PostHog', 'mesure d’événements produit afin de comprendre quelles fonctions sont utilisées'],
  ['Sentry', 'diagnostic des erreurs, sans envoi volontaire d’identifiant, de contenu alimentaire ou de données de formulaire'],
  ['Expo', 'acheminement des notifications push lorsque vous les activez'],
  ['OpenAI', 'traitement des messages et du contexte que vous envoyez volontairement à l’assistant, lorsque cette fonction est disponible'],
] as const
</script>

<template>
  <div class="min-h-screen bg-[#F8F6EF] font-sans text-[#0F2D27]">
    <a
      href="#contenu"
      class="fixed left-4 top-3 z-50 -translate-y-24 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#0F2D27] shadow-lg transition-transform duration-150 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#FF7A59]"
    >
      Aller au contenu
    </a>

    <header class="border-b border-[#0F2D27]/10 bg-[#F8F6EF]/95 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <NuxtLink to="/" class="inline-flex min-h-11 items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7A59] focus:ring-offset-2 focus:ring-offset-[#F8F6EF]" aria-label="CoursIA — accueil">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-[#0F2D27] text-white shadow-sm" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 13.5V20h12v-6.5" />
              <path d="M7.2 14a4 4 0 0 1 1.2-7.8A4.5 4.5 0 0 1 17 7.5a3.5 3.5 0 0 1-.2 6.5" />
              <path d="M9 17h6" />
            </svg>
          </span>
          <span class="text-xl font-extrabold tracking-[-0.03em]">Cours<span class="text-[#FF7A59]">IA</span></span>
        </NuxtLink>
        <a
          href="mailto:info@antoinequarroz.ch"
          class="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[#0F2D27] underline decoration-[#FF7A59]/70 decoration-2 underline-offset-4 transition-colors duration-150 hover:text-[#A83D25] focus:outline-none focus:ring-2 focus:ring-[#FF7A59]"
        >
          Nous contacter
        </a>
      </div>
    </header>

    <main id="contenu" tabindex="-1" class="mx-auto max-w-5xl px-5 pb-24 pt-8 outline-none sm:px-8 sm:pt-12">
      <section class="relative overflow-hidden rounded-[2rem] bg-[#0F2D27] px-6 py-10 text-white shadow-[0_24px_70px_rgba(15,45,39,0.16)] sm:px-10 sm:py-14">
        <div class="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#A6C1B1]/20 blur-3xl" />
        <div class="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-[#FF7A59]/15 blur-3xl" />
        <div class="relative max-w-3xl">
          <p class="text-sm font-bold uppercase tracking-[0.18em] text-[#A6C1B1]">Vos données, simplement</p>
          <h1 class="mt-4 max-w-2xl text-balance text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            Politique de confidentialité
          </h1>
          <p class="mt-6 max-w-2xl text-pretty text-lg leading-8 text-white/75">
            Cette page explique quelles données CoursIA utilise pour personnaliser vos repas, préparer vos courses et faire fonctionner l’application.
          </p>
          <p class="mt-8 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 ring-1 ring-inset ring-white/10">
            Dernière mise à jour : 27 septembre 2026
          </p>
        </div>
      </section>

      <div class="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Sommaire" class="rounded-2xl bg-[#E7EFE9] p-5 lg:sticky lg:top-6">
          <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-[#4B5D54]">Sommaire</p>
          <ol class="mt-4 space-y-1 text-sm font-semibold">
            <li><a href="#responsable" class="block rounded-lg px-3 py-2 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#FF7A59]">Responsable</a></li>
            <li><a href="#donnees" class="block rounded-lg px-3 py-2 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#FF7A59]">Données utilisées</a></li>
            <li><a href="#finalites" class="block rounded-lg px-3 py-2 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#FF7A59]">Pourquoi</a></li>
            <li><a href="#partage" class="block rounded-lg px-3 py-2 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#FF7A59]">Prestataires</a></li>
            <li><a href="#conservation" class="block rounded-lg px-3 py-2 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#FF7A59]">Conservation</a></li>
            <li><a href="#droits" class="block rounded-lg px-3 py-2 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#FF7A59]">Vos droits</a></li>
          </ol>
        </nav>

        <article class="min-w-0 rounded-[2rem] bg-white p-6 shadow-[0_18px_50px_rgba(15,45,39,0.07)] sm:p-10">
          <section id="responsable" aria-labelledby="responsable-titre">
            <p class="text-sm font-bold text-[#CC4728]">01</p>
            <h2 id="responsable-titre" class="mt-2 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Qui est responsable de vos données ?</h2>
            <p class="mt-4 leading-7 text-[#4B5D54]">
              CoursIA est exploité par Antoine Quarroz, Rue de l’Evouette 5, 1969 Saint-Martin VS, Suisse. Pour toute question relative à vos données, écrivez à
              <a href="mailto:info@antoinequarroz.ch" class="font-bold text-[#0F2D27] underline decoration-[#FF7A59]/70 decoration-2 underline-offset-4">info@antoinequarroz.ch</a>.
            </p>
          </section>

          <section id="donnees" aria-labelledby="donnees-titre" class="mt-12 border-t border-[#0F2D27]/10 pt-12">
            <p class="text-sm font-bold text-[#CC4728]">02</p>
            <h2 id="donnees-titre" class="mt-2 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Quelles données sont utilisées ?</h2>
            <div class="mt-6 grid gap-4">
              <div v-for="item in donnees" :key="item.titre" class="rounded-2xl bg-[#F8F6EF] p-5 ring-1 ring-inset ring-[#0F2D27]/[0.07]">
                <h3 class="font-extrabold">{{ item.titre }}</h3>
                <p class="mt-2 leading-7 text-[#4B5D54]">{{ item.texte }}</p>
              </div>
            </div>
            <p class="mt-5 rounded-2xl bg-[#FFF1EB] p-5 text-sm leading-6 text-[#4A2E22] ring-1 ring-inset ring-[#FF7A59]/20">
              CoursIA n’accède pas à vos données bancaires. Les paiements sont traités par Apple et suivis techniquement par RevenueCat. Les estimations de prix et paniers de courses ne déclenchent actuellement aucune commande réelle auprès d’une enseigne.
            </p>
          </section>

          <section id="finalites" aria-labelledby="finalites-titre" class="mt-12 border-t border-[#0F2D27]/10 pt-12">
            <p class="text-sm font-bold text-[#CC4728]">03</p>
            <h2 id="finalites-titre" class="mt-2 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Pourquoi ces données sont-elles utilisées ?</h2>
            <ul class="mt-5 space-y-3 leading-7 text-[#4B5D54]">
              <li class="flex gap-3"><span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FF7A59]" aria-hidden="true" />Créer et sécuriser votre compte.</li>
              <li class="flex gap-3"><span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FF7A59]" aria-hidden="true" />Adapter les recettes, quantités, budgets, menus et listes de courses à votre foyer.</li>
              <li class="flex gap-3"><span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FF7A59]" aria-hidden="true" />Publier et modérer les recettes communautaires que vous envoyez.</li>
              <li class="flex gap-3"><span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FF7A59]" aria-hidden="true" />Gérer les abonnements, fournir l’assistance et prévenir les abus.</li>
              <li class="flex gap-3"><span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#FF7A59]" aria-hidden="true" />Comprendre les fonctions utilisées et corriger les erreurs techniques.</li>
            </ul>
            <p class="mt-5 leading-7 text-[#4B5D54]">
              Le traitement repose principalement sur l’exécution du service que vous demandez. Les notifications reposent sur votre choix et peuvent être désactivées. La sécurité, la prévention des abus et l’amélioration limitée du produit reposent sur l’intérêt légitime à exploiter un service fiable. Lorsque le droit applicable l’exige, votre consentement est demandé.
            </p>
          </section>

          <section id="partage" aria-labelledby="partage-titre" class="mt-12 border-t border-[#0F2D27]/10 pt-12">
            <p class="text-sm font-bold text-[#CC4728]">04</p>
            <h2 id="partage-titre" class="mt-2 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Avec qui les données sont-elles partagées ?</h2>
            <p class="mt-4 leading-7 text-[#4B5D54]">CoursIA ne vend pas vos données. Elles sont accessibles uniquement lorsque cela est nécessaire au fonctionnement de l’application et à ses prestataires techniques :</p>
            <dl class="mt-6 divide-y divide-[#0F2D27]/10 rounded-2xl bg-[#E7EFE9]/70 px-5 ring-1 ring-inset ring-[#0F2D27]/[0.06]">
              <div v-for="prestataire in prestataires" :key="prestataire[0]" class="py-4 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-5">
                <dt class="font-extrabold">{{ prestataire[0] }}</dt>
                <dd class="mt-1 leading-6 text-[#4B5D54] sm:mt-0">{{ prestataire[1] }}</dd>
              </div>
            </dl>
            <p class="mt-5 leading-7 text-[#4B5D54]">
              Certains prestataires peuvent traiter des données en Suisse, dans l’Espace économique européen ou dans d’autres pays. Les transferts internationaux sont encadrés par les mécanismes prévus par le droit applicable et les engagements contractuels de chaque prestataire.
            </p>
          </section>

          <section id="conservation" aria-labelledby="conservation-titre" class="mt-12 border-t border-[#0F2D27]/10 pt-12">
            <p class="text-sm font-bold text-[#CC4728]">05</p>
            <h2 id="conservation-titre" class="mt-2 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Combien de temps les données sont-elles conservées ?</h2>
            <p class="mt-4 leading-7 text-[#4B5D54]">
              Les données liées au compte sont conservées pendant son utilisation. Lorsque vous demandez sa suppression, les informations personnelles du profil sont supprimées ou anonymisées et l’accès au compte est désactivé. Certaines données peuvent être conservées plus longtemps lorsqu’une obligation légale, la prévention de la fraude ou la défense d’un droit l’exige. Les journaux techniques et données de mesure sont conservés uniquement pendant la durée utile à la sécurité, au diagnostic et à l’amélioration du service.
            </p>
          </section>

          <section id="droits" aria-labelledby="droits-titre" class="mt-12 border-t border-[#0F2D27]/10 pt-12">
            <p class="text-sm font-bold text-[#CC4728]">06</p>
            <h2 id="droits-titre" class="mt-2 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Quels sont vos droits ?</h2>
            <p class="mt-4 leading-7 text-[#4B5D54]">
              Selon le droit applicable, vous pouvez demander l’accès, la rectification, la remise ou la suppression de vos données, ainsi que vous opposer à certains traitements. Vous pouvez aussi modifier vos préférences de notification ou supprimer votre compte depuis l’application.
            </p>
            <div class="mt-6 rounded-2xl bg-[#0F2D27] p-6 text-white sm:p-7">
              <h3 class="text-xl font-extrabold">Exercer vos droits</h3>
              <p class="mt-2 leading-7 text-white/75">Écrivez-nous depuis l’adresse liée à votre compte. Une vérification d’identité peut être demandée avant de répondre.</p>
              <a href="mailto:info@antoinequarroz.ch?subject=CoursIA%20%E2%80%94%20Demande%20relative%20%C3%A0%20mes%20donn%C3%A9es" class="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#FF7A59] px-5 py-3 font-extrabold text-[#0F2D27] shadow-sm transition-[background-color,transform] duration-150 hover:bg-[#ff8c70] active:scale-[0.96] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0F2D27]">
                Écrire à info@antoinequarroz.ch
              </a>
            </div>
            <p class="mt-5 leading-7 text-[#4B5D54]">
              Vous pouvez également contacter le
              <a href="https://www.edoeb.admin.ch/fr" target="_blank" rel="noopener noreferrer" class="font-bold text-[#0F2D27] underline decoration-[#FF7A59]/70 decoration-2 underline-offset-4">Préposé fédéral à la protection des données et à la transparence</a>.
            </p>
          </section>

          <section aria-labelledby="securite-titre" class="mt-12 border-t border-[#0F2D27]/10 pt-12">
            <p class="text-sm font-bold text-[#CC4728]">07</p>
            <h2 id="securite-titre" class="mt-2 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Sécurité et mises à jour</h2>
            <p class="mt-4 leading-7 text-[#4B5D54]">
              CoursIA applique des mesures techniques et organisationnelles destinées à limiter l’accès aux données, notamment des contrôles d’accès par compte. Aucun système n’offre toutefois une sécurité absolue. Cette politique peut évoluer avec les fonctionnalités ou les obligations légales ; la date de mise à jour affichée en haut de la page permet d’identifier la version en vigueur.
            </p>
          </section>
        </article>
      </div>
    </main>

    <footer class="border-t border-[#0F2D27]/10 bg-[#E7EFE9]">
      <div class="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-7 text-sm text-[#4B5D54] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© 2026 CoursIA — Antoine Quarroz</p>
        <a href="mailto:info@antoinequarroz.ch" class="font-bold text-[#0F2D27] underline decoration-[#FF7A59]/70 underline-offset-4">info@antoinequarroz.ch</a>
      </div>
    </footer>
  </div>
</template>
