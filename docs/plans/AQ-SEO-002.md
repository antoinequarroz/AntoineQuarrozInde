---
ticket: AQ-SEO-002
validated: yes
---

# AQ-SEO-002 — Exclure les surfaces privées des résultats de recherche

## Plan ordonné

- [x] **1. Appliquer la directive robots au niveau serveur**
  - **Objectif :** ajouter `X-Robots-Tag: noindex, nofollow` aux réponses de `/admin`, `/admin/**`, `/portal`, `/portal/**` et `/offline` via les `routeRules` Nuxt.
  - **Fichiers attendus :** `nuxt.config.ts`, nouveau test ciblé `tests/seo-private-routes.test.ts`.
  - **Autorisé :** ajouter uniquement les règles de headers nécessaires et tester la couverture des bases et descendants.
  - **Interdit :** modifier les rôles, middlewares, stores d'authentification, API, RLS, contenu privé, statuts HTTP ou comportement des pages de connexion.
  - **Tests :** présence exacte de la directive sur chaque famille; couverture explicite des bases `/admin` et `/portal`; absence de directive privée sur les pages publiques.
  - **Validation :** test Vitest ciblé, `npm run typecheck`, build Nuxt et inspection des headers d'une sortie locale.
  - **Sécurité / rollback :** `noindex` ne remplace aucun contrôle d'accès; rollback par retrait des seules `routeRules` ajoutées.

- [x] **2. Verrouiller l'absence des surfaces privées dans la découverte publique**
  - **Objectif :** prouver que le sitemap et la navigation HTML publique n'exposent pas admin, portail ou hors-ligne, tout en conservant le raccourci PWA admin explicitement fonctionnel.
  - **Fichiers attendus :** `tests/seo-private-routes.test.ts`; ajustement de `server/routes/sitemap.xml.ts` ou des composants publics uniquement si le test révèle une exposition réelle.
  - **Autorisé :** assertions ciblées sur `server/routes/sitemap.xml.ts`, `app/components/layout/AppHeader.vue` et `app/components/layout/AppFooter.vue`.
  - **Interdit :** refondre le sitemap, supprimer un accès fonctionnel voulu, modifier les routes publiques ou traiter `robots.txt` comme protection principale.
  - **Tests :** aucune route `/admin`, `/portal` ou `/offline` dans les entrées sitemap et aucun lien correspondant dans le header/footer publics.
  - **Validation :** test Vitest ciblé et génération/build sans erreur.
  - **Sécurité / rollback :** aucun accès ni donnée n'est modifié; toute correction éventuelle reste limitée au lien public fautif.

- [x] **3. Bloquer une release qui perd la directive**
  - **Objectif :** créer une preuve HTTP reproductible qui vérifie anonymement une connexion admin, une page admin protégée, une connexion portail, une page portail et `/offline`, puis l'insérer après les contrôles de production existants.
  - **Fichiers attendus :** `scripts/ops/verify-private-noindex.sh`, `.github/workflows/ci.yml`, `tests/seo-private-routes.test.ts`.
  - **Autorisé :** URL HTTPS explicite et validée, `curl` borné, contrôle insensible à la casse de `X-Robots-Tag`, fixtures HTTP locales positives et négatives.
  - **Interdit :** utiliser des identifiants, suivre un parcours authentifié, désactiver TLS, afficher des secrets ou remplacer les contrôles de version/santé/domaine.
  - **Tests :** succès si tous les échantillons portent `noindex` et `nofollow`; échec si une directive ou une route manque, si l'URL est dangereuse ou si la destination est indisponible; ordre CI après les preuves existantes.
  - **Validation :** tests Vitest du script, `bash -n scripts/ops/*.sh`, exécution locale contre une fixture puis preuve HTTPS après déploiement humain.
  - **Sécurité / rollback :** vérification anonyme et en lecture seule; un échec bloque la suite CI sans mutation distante.

- [x] **4. Documenter et valider toute la story**
  - **Objectif :** documenter la directive, ses limites de sécurité, la commande opérateur et le rollback, puis exécuter la suite qualité complète.
  - **Fichiers attendus :** `docs/operations.md` et uniquement les ajustements matériels révélés par les contrôles AQ-SEO-002.
  - **Autorisé :** procédure de preuve et rappel explicite que `noindex` n'est pas un contrôle d'accès.
  - **Interdit :** documenter une livraison non exécutée, modifier une autre story SEO/GEO ou publier des informations privées.
  - **Tests :** couverture des quatre groupes d'acceptation et vérification de non-régression des connexions.
  - **Validation :** `npm test`, `npm run typecheck`, `npm run build`, `npm run quality:budgets`, `bash -n scripts/ops/*.sh` et `git diff --check` via Portly.
  - **Sécurité / rollback :** aucune migration ni donnée; rollback applicatif par l'image `previous` et restauration des règles/configurations du commit précédent.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| Toutes les réponses HTML privées exposent `noindex, nofollow` | 1, 3, 4 |
| Les connexions restent fonctionnelles | 1, 4 |
| Routes privées absentes du sitemap et de la navigation publique | 2, 4 |
| Connexion, admin protégée, portail et hors-ligne sont vérifiés | 3, 4 |
| Une route inexistante garde son statut normal sans substitution indexable | 1, 3 |
| `noindex` reste distinct des contrôles d'accès | 1, 3, 4 |

## Impacts explicitement absents

- **Migration / base de données :** aucune.
- **RLS / autorisations :** aucun changement.
- **Stockage :** aucun changement.
- **Routes publiques :** aucune nouvelle route et aucun changement de statut attendu.
- **IA :** aucune politique crawler; `AQ-SEO-003` reste séparé.
- **Dépendances :** aucune nouvelle dépendance.
- **Destruction :** aucune commande destructive; aucun déploiement avant validation humaine du plan et de l'implémentation.

## Validation humaine requise

Plan validé par Antoine le 3 septembre 2026 avec l'instruction « la suite ».

## Preuves d'implémentation

- Les cinq règles sont présentes dans `nuxt.config.ts` et compilées dans
  l'artefact Nitro avec la valeur exacte `noindex, nofollow`.
- Les neuf tests ciblés couvrent la configuration, le sitemap, la navigation
  publique, l'ordre CI et les résultats positifs et négatifs du script HTTP.
- La suite complète a passé `npm test -- --run`, `npm run typecheck`,
  `npm run build`, `npm run quality:budgets`, `bash -n scripts/ops/*.sh` et
  `git diff --check` via Portly le 3 septembre 2026.
- La preuve HTTPS réelle reste volontairement post-déploiement et sera exécutée
  par la CI avec `https://www.antoinequarroz.ch`.
