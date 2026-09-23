# AQ-PROJ-010 — Recherche

## Ticket et besoin

- Linear : `ANT-24`.
- Ajouter une quatrième catégorie de projet, `software`, visible comme
  « Logiciel » en français et « Software » en anglais et en allemand.
- Permettre sa sélection dans l'administration et son filtrage sur la landing.
- Reclasser uniquement les projets existants dont la nature logicielle est
  certaine.

## Parcours actuel vérifié

- `app/pages/admin/projects/index.vue` initialise et édite `form.category`,
  mais le sélecteur ne propose que `web`, `mobile` et `cms`.
- `server/utils/projectPayload.ts` est la frontière serveur : son allowlist
  rejette toute autre catégorie avant l'écriture tenant-scoped.
- `supabase/schema.sql` borne aussi `projects.category` avec une contrainte
  `CHECK` sur les trois mêmes valeurs. La table possède déjà son modèle
  d'organisation et ses politiques ; cette story ne les modifie pas.
- `app/stores/projects.ts` conserve la catégorie renvoyée et filtre le
  portfolio par égalité stricte.
- `app/components/sections/PortfolioSection.vue` déclare la liste fermée des
  filtres et masque les catégories sans projet.
- `app/components/sections/ProjectHelixCarousel.vue` consomme les clés
  `portfolio.<category>` et `portfolio.category_intro.<category>`.
- `i18n/locales/{fr,en,de}.json` sont les catalogues actifs. Les copies dans
  `app/locales` existent encore et doivent rester cohérentes.

## Données existantes observables

L'API publique de production expose actuellement Hermes Cockpit comme
`mobile`. Son titre, sa description et ses tags indiquent explicitement une
application macOS en Swift/SwiftUI : il peut être reclassé sans ambiguïté.
Les projets Orion, VELQORA, STAQ et LivreMatch sont des plateformes web ; les
données publiques ne justifient pas de les déplacer hors de `web`.

## Migration et sécurité

- La modification est additive au domaine fonctionnel mais nécessite de
  remplacer la contrainte `CHECK` existante, puis de reclasser Hermes Cockpit
  par son slug stable.
- La migration doit être idempotente pour la donnée : `UPDATE ... WHERE
  slug = 'hermes-cockpit' AND category = 'mobile'`.
- Aucun accès production direct, aucune modification de RLS, aucun relâchement
  de privilège et aucune donnée client ne sont nécessaires.
- Le rollback applicatif consiste à retirer le filtre et l'option. Un rollback
  de données remettrait Hermes en `mobile`, mais ne doit pas être automatisé
  après que des utilisateurs auront pu choisir `software`.

## Tests et risques

- Tester l'acceptation serveur de `software` et le rejet d'une valeur inconnue.
- Tester la contrainte et le reclassement avec pgTAP.
- Vérifier que le filtre, l'option admin et les quatre clés i18n sont présents.
- Exécuter Vitest, typecheck, build, budgets et la suite DB via Portly.
- Risque principal : oublier une liste fermée, ce qui casserait l'édition ou
  l'introduction localisée du carousel.
