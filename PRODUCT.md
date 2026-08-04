# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Le public principal est constitue de personnes, independants et organisations qui cherchent un freelance pour concevoir un site web, une application mobile ou un CMS.

Le second utilisateur est Antoine Quarroz lui-meme. Il utilise l'espace admin comme poste de pilotage quotidien pour gerer ses prospects, clients, projets et operations freelance.

## Product Purpose

Le produit reunit deux fonctions complementaires :

- une vitrine publique qui presente Antoine, ses services, ses realisations et son expertise, puis transforme l'interet en prise de contact ou rendez-vous ;
- un back-office prive qui permet de mener les projets clients de bout en bout, depuis le prospect et le devis jusqu'a l'execution, la facturation et le suivi.

Le succes signifie que les visiteurs comprennent rapidement ce qu'Antoine peut realiser pour eux et peuvent le contacter simplement, tandis qu'Antoine dispose d'un outil unique et fiable pour piloter son activite sans multiplier les logiciels.

## Positioning

La vitrine et l'outil de production appartiennent au meme produit : le travail montre publiquement, la relation client et l'execution des projets sont geres dans le meme environnement par le freelance qui les realise.

## Operating Context

La partie publique presente les services de creation de sites vitrine, applications mobiles et CMS, le portfolio, les avis, le blog et les moyens de contact. Elle est disponible en francais, allemand et anglais.

La partie privee est un espace de travail personnel comprenant actuellement un tableau de bord, un CRM, les clients, les taches, les devis, les factures, l'agenda, les projets, les articles, les avis, les messages et le journal d'audit.

Le parcours operationnel vise a couvrir la chaine complete : prospect, qualification, devis, production, livraison, facture et suivi client.

## Capabilities and Constraints

- Application Nuxt 4 avec Vue, Pinia, Tailwind CSS et Supabase.
- Rendu public, API serveur et administration protegee vivent dans le meme depot.
- Le responsive, les modes clair et sombre et les trois langues existantes doivent rester fonctionnels.
- Les donnees clients, devis, factures et projets sont des donnees privees et doivent rester accessibles uniquement aux roles autorises.
- La facturation et les devis existent deja dans le back-office et disposent d'une generation PDF serveur.
- L'integration Typst et la QR-facture suisse font partie de l'evolution souhaitee de la facturation. Elles doivent prolonger le workflow existant plutot que creer un second systeme concurrent.
- Les prochaines ameliorations doivent etre progressives et limitees aux surfaces concernees. Un redesign global necessite une decision explicite.

## Brand Commitments

- Le produit porte le nom et l'activite d'Antoine Quarroz en tant que freelance.
- L'identite graphique existante est a conserver : palette violette avec accents cyan, fonds sombres, contrastes lumineux, effets graphiques et univers technologique.
- Les couleurs, les visuels et l'esprit general actuels constituent la reference de marque.
- Le but est de rendre l'interface plus coherente, lisible et professionnelle par petites ameliorations, sans effacer sa personnalite ni la remplacer par un style generique.
- Le contenu public doit rester direct, credible et personnel. Ne pas inventer de clients, temoignages, chiffres, certifications ou resultats.

## Evidence on Hand

- Pages et contenu de la vitrine : `app/pages/` et `app/components/sections/`.
- Identite, tokens et styles globaux : `app/assets/css/main.css` et `tailwind.config.ts`.
- Services et traductions : `app/locales/fr.json`, `app/locales/de.json` et `app/locales/en.json`.
- Portfolio et demonstrations visuelles : `app/components/sections/PortfolioSection.vue`, `ProjectHelixCarousel.vue` et `StorySection.vue`.
- Back-office operationnel : `app/pages/admin/` et `app/layouts/admin.vue`.
- Facturation existante : `server/utils/billing.ts`, `server/utils/pdfBilling.ts`, `server/api/quotes/`, `server/api/invoices/` et `supabase/migrations/20260528_billing_v2.sql`.
- Feuille de route produit existante : `docs/CMS_ROADMAP_90J.md`.

Les avis, projets et contenus reels presents dans le depot peuvent servir de preuve. Toute nouvelle affirmation commerciale doit etre validee par Antoine avant publication.

## Product Principles

1. Montrer la qualite du travail par le produit lui-meme : la vitrine doit etre une demonstration credible du savoir-faire propose.
2. Rendre le prochain pas evident : chaque visiteur doit comprendre l'offre et pouvoir contacter Antoine sans friction.
3. Unifier l'activite freelance : privilegier un parcours continu entre prospect, client, projet, devis, facture et suivi.
4. Ameliorer sans denaturer : renforcer la coherence, la clarte et la finition tout en preservant l'identite graphique actuelle.
5. Proteger la confiance : traiter les donnees clients et financieres avec des controles d'acces, une tracabilite et des documents fiables.

## Accessibility & Inclusion

Le niveau d'accessibilite formel n'est pas encore confirme. Les ameliorations futures doivent au minimum preserver la navigation clavier, la lisibilite, les contrastes, le responsive et les alternatives aux animations, sans modifier l'identite de marque.
