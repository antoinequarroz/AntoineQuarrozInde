# AQ-SEO-009 — Préparation de release

## Périmètre

Livrer l'attribution canonique des articles, les dates éditoriales visibles et
le JSON-LD `BlogPosting`, ainsi que la correction qui empêche une sauvegarde
identique d'inventer une date de modification.

## Preuves avant PR

- [x] Plan humainement validé : `docs/plans/AQ-SEO-009.md`.
- [x] Revue fonctionnelle et sécurité : `Max severity: none`,
  `Ship allowed: yes` dans `docs/reviews/AQ-SEO-009.md`.
- [x] Suite Vitest : 54 fichiers, 321/321 tests réussis.
- [x] Typecheck et build Nuxt réussis.
- [x] Budgets de production réussis.
- [x] Scripts Bash valides.
- [x] Préflight Supabase éphémère : rejeu complet, lint sans erreur, aucun avis
  sécurité et 82/82 assertions pgTAP réussies.
- [ ] CI de la pull request réussie.

## Ordre et sûreté des migrations

1. `20260904163123_add_article_author_attribution.sql` ajoute et rétro-remplit
   la clé auteur, puis conserve le contrat de RPC de l'image précédente.
2. `20260904171054_preserve_article_timestamp_on_noop_update.sql` redéfinit
   uniquement le trigger de timestamps afin de conserver `updated_at` pour un
   payload identique.

Les deux migrations sont append-only et ne suppriment ni colonne ni donnée.
Elles restent compatibles avec l'image applicative précédente. Le pipeline
doit néanmoins terminer la promotion DB avant de déployer la nouvelle image.

## Contrat d'environnement

Le job Production doit disposer des variables secrètes suivantes, sans les
exposer dans les logs :

- `VPS_HOST`, `VPS_USER`, `VPS_PROJECT_DIR` ;
- `VPS_SSH_PRIVATE_KEY`, `VPS_KNOWN_HOSTS` ;
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` ;
- `SUPABASE_BACKUP_AGE_RECIPIENT` ;
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` pour la validation E2E post-release.

## Livraison et vérifications

- [ ] Fusionner uniquement après succès des jobs `quality`, `accessibility` et
  `database` de la PR.
- [ ] Laisser le workflow `main` créer la sauvegarde chiffrée pré-migration,
  promouvoir les migrations, puis déployer le SHA exact sur le VPS.
- [ ] Vérifier la santé et la version publiques.
- [ ] Exécuter les preuves canonical, noindex privé, robots, pages localisées,
  sitemap, blog SSR, identité sociale et `verify-blog-posting.sh`.
- [ ] Confirmer les tests E2E de production.

## Reprise

L'image `previous` reste compatible et le script de déploiement la réactive si
la nouvelle image échoue. Les migrations n'ont pas de rollback SQL automatique
car elles sont non destructives; la sauvegarde chiffrée pré-migration reste le
point de reprise des données. Toute correction DB ultérieure doit être une
nouvelle migration append-only, jamais une modification de l'historique déjà
appliqué.

## Blocage restant

Le seul blocage avant fusion est le résultat de la CI de la pull request. Aucun
déploiement manuel ni accès de production n'est requis à ce stade.
