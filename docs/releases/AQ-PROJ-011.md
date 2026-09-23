# AQ-PROJ-011 — Préparation de release

## Périmètre

Stabiliser la géométrie de l'hélice du portfolio lors du filtrage par catégorie,
sans modifier les projets, leur ordre, les routes publiques ni le carrousel
horizontal mobile.

## Preuves avant fusion

- [x] Plan validé : `docs/plans/AQ-PROJ-011.md`, lié à Linear `ANT-25`.
- [x] Suite Vitest complète réussie.
- [x] Typecheck Nuxt réussi.
- [x] Build Nuxt/Nitro réussi.
- [x] Budgets de production réussis.
- [x] Scan Impeccable `layout` sans signal.
- [x] Contrôle visuel desktop : même géométrie pour « Tous », « Web » et
  « Mobile ».
- [x] Contrôle visuel à 390 × 844 px : carrousel horizontal mobile inchangé.

## Migrations, données et environnement

Cette release ne contient aucune migration, modification de schéma, RLS, RPC,
donnée métier, dépendance ou variable d'environnement. Aucun backup spécifique
n'est requis. Les portes habituelles de l'environnement GitHub `Production`
restent inchangées et aucune valeur secrète n'est consignée ici.

## Livraison et vérifications

- [ ] Pousser la branche et exiger la CI verte sur son dernier commit.
- [ ] Fusionner la PR dans `main` sans contourner les protections.
- [ ] Laisser le workflow `Quality` déployer le SHA exact sur le VPS.
- [ ] Vérifier `/api/version`, `/api/health` et toutes les preuves publiques.
- [ ] Contrôler en production les filtres « Tous », « Web » et « Mobile ».
- [ ] Passer `ANT-25` à Done après les preuves de production.

## Reprise

Le changement est purement applicatif. En cas d'échec, le script de release
restaure automatiquement l'image Docker `previous`. Aucune restauration de base
de données n'est nécessaire.

## État

La mise en production a été explicitement approuvée par Antoine le
23 septembre 2026. La livraison reste fail-closed sur toute porte rouge.
