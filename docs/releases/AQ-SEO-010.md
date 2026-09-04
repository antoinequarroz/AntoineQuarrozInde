# AQ-SEO-010 — Préparation de release

## Périmètre

Livrer les objets `Service` des quatre pages françaises de prestations, ainsi
qu'un fil d'Ariane visible, accessible et structuré sur les services, les
articles et les études de cas profondes. La release ajoute également une preuve
post-déploiement qui bloque les divergences entre contenu, canonical et JSON-LD.

## Preuves avant PR

- [x] Plan humainement validé : `docs/plans/AQ-SEO-010.md`.
- [x] Revue fonctionnelle et sécurité : `Max severity: none`,
  `Ship allowed: yes` dans `docs/reviews/AQ-SEO-010.md`.
- [x] Tests AQ-SEO-010 : 23/23 réussis.
- [x] Suite Vitest : 55 fichiers, 344/344 tests réussis.
- [x] Typecheck et build Nuxt réussis.
- [x] Budgets de production réussis.
- [x] Scripts Bash valides.
- [x] E2E public local : 6/6 réussis, dont les services sans JavaScript.
- [x] Preuve locale : 4 services et 6 contenus profonds valides; les 6 articles
  publiés conservent un `BlogPosting` valide.
- [x] CI de la pull request réussie sur le SHA d'implémentation
  `ad5a4a3a95d24b17a85a2f88ebc5c19e1a37648c` : `quality`,
  `accessibility`, `database`, GitGuardian et l'aperçu Vercel sont validés.
  Le commit documentaire qui consigne cette preuve doit lui aussi rester vert
  avant fusion.

## Migrations et données

AQ-SEO-010 ne contient aucune migration, mutation de contenu, modification RLS,
RPC, permission, bucket ou contrat API. Le job de promotion Supabase continuera
de vérifier l'alignement des historiques et ne devra trouver aucune migration
en attente pour cette story. Aucun backup spécifique à AQ-SEO-010 n'est requis;
le mécanisme chiffré existant reste inchangé.

## Contrat d'environnement

Aucune variable n'est ajoutée. Le pipeline Production conserve ses variables
existantes, sans exposer leurs valeurs :

- `VPS_HOST`, `VPS_USER`, `VPS_PROJECT_DIR` ;
- `VPS_SSH_PRIVATE_KEY`, `VPS_KNOWN_HOSTS` ;
- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` ;
- `SUPABASE_BACKUP_AGE_RECIPIENT` ;
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` pour les E2E post-release.

## Livraison et vérifications

- [ ] Fusionner uniquement après succès des jobs `quality`, `accessibility` et
  `database` de la PR.
- [ ] Laisser le workflow `main` vérifier Supabase puis déployer le SHA exact
  sur le VPS.
- [ ] Vérifier la santé et la version publiques.
- [ ] Laisser passer les preuves canonical, noindex privé, robots, pages
  localisées, sitemap, blog SSR, identité sociale et `BlogPosting`.
- [ ] Exiger le succès de `verify-service-breadcrumbs.sh` sur les quatre services
  et tous les articles/cas profonds découverts.
- [ ] Confirmer les tests E2E de production, notamment les breadcrumbs sans
  JavaScript.

## Reprise

Le changement est exclusivement applicatif. L'image `previous` peut être remise
en ligne si le nouveau rendu ou la preuve post-déploiement échoue. Aucune
restauration SQL, suppression de données ou action sur Supabase n'est nécessaire.

## État de livraison

Aucun blocage technique n'est détecté sur la PR #59. La fusion et le
déploiement automatique sur `main` restent soumis au succès de la CI du dernier
commit et à la validation explicite d'Antoine.
