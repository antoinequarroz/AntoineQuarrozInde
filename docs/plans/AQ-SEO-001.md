---
ticket: AQ-SEO-001
validated: yes
---

# AQ-SEO-001 — Domaine public unique

## Critères d'acceptation couverts

- [x] `https://antoinequarroz.ch` redirige définitivement vers `https://www.antoinequarroz.ch/`.
- [x] Un chemin et ses paramètres sont conservés par la redirection apex → `www`.
- [x] `https://www.antoinequarroz.ch` continue de servir l'application sans boucle.
- [x] Aucune sortie publique de production ne référence `antoinequarroz.dev`.
- [x] Une configuration Caddy invalide ou une preuve post-release incorrecte échoue explicitement sans masquer le problème.
- [x] La release conserve ses contrôles SHA/santé et son rollback web existants.

## Plan ordonné

- [x] **1. Rendre la configuration canonique sûre**
  - **Objectif :** remplacer le fallback public `.dev` par le domaine canonique `.ch` et ajouter une régression automatisée empêchant son retour.
  - **Fichiers attendus :** `nuxt.config.ts`, nouveau test ciblé sous `tests/` ou extension minimale d'un test de configuration existant.
  - **Autorisé :** modifier uniquement la valeur par défaut de `runtimeConfig.public.siteUrl` et tester les références publiques de configuration.
  - **Interdit :** changer les canonicals par langue, le contenu des pages, Plausible, les URLs de paiement, les secrets ou la structure de `runtimeConfig`.
  - **Tests :** absence de `antoinequarroz.dev`, présence du fallback `https://www.antoinequarroz.ch`, conservation de la surcharge `NUXT_PUBLIC_SITE_URL` documentée dans `.env.example`.
  - **Validation :** `npm test -- --run` ou commande Vitest ciblée, puis `npm run typecheck`.
  - **Sécurité / rollback :** aucune donnée sensible ; rollback par restauration de l'ancienne ligne de configuration, sans mutation externe.

- [x] **2. Canonicaliser l'apex au niveau Caddy et garantir l'activation**
  - **Objectif :** séparer le site apex du site `www`, rediriger l'apex de façon permanente avec URI préservée et recharger atomiquement la configuration Caddy pendant une release.
  - **Fichiers attendus :** `Caddyfile`, `scripts/ops/deploy-release.sh`, tests ciblés dans `tests/release-pipeline.test.ts` ou le test SEO créé à l'étape 1.
  - **Autorisé :** un bloc apex limité à la redirection, un bloc `www` conservant compression et `reverse_proxy web:3000`, validation puis reload explicite de Caddy dans le flux de release.
  - **Interdit :** modifier DNS, certificats, ports, réseau Docker, healthcheck, politique TLS, authentification ou services Supabase.
  - **Tests :** structure des deux hôtes, destination `www` fixe, préservation de `{uri}`, validation de syntaxe Caddy lorsque Docker/Caddy est disponible, présence d'un reload borné et échec explicite si validation/reload échoue.
  - **Validation :** `bash -n scripts/ops/*.sh`, validation Caddy via l'image `caddy:2-alpine`, test Vitest ciblé.
  - **Sécurité / rollback :** ne jamais construire `Location` depuis un header hôte non fiable ; Caddy conserve sa configuration active si la nouvelle validation échoue ; rollback par retour au `Caddyfile` précédent puis reload explicite. Le rollback d'image web AQ-058 reste inchangé.

- [x] **3. Prouver la redirection après chaque livraison**
  - **Objectif :** ajouter un contrôle reproductible qui vérifie le statut permanent, la destination avec chemin/query et la disponibilité de `www`, puis l'insérer après la preuve SHA/santé existante.
  - **Fichiers attendus :** nouveau script `scripts/ops/verify-domain-canonicalization.sh` ou extension isolée équivalente, `.github/workflows/ci.yml`, `tests/release-pipeline.test.ts`.
  - **Autorisé :** entrées URL HTTPS explicites et validées, `curl` borné, contrôle de `Location` sans suivre la première réponse, fixture HTTP locale dans les tests.
  - **Interdit :** accès production depuis les tests unitaires, délai non borné, désactivation TLS, affichage de secrets, remplacement des contrôles `/api/version` et `/api/health`.
  - **Tests :** succès sur redirection correcte ; échec sur `200`, statut temporaire, mauvais hôte, perte du chemin/query ou destination indisponible ; contrôle statique de l'appel CI après `verify-production-release.sh`.
  - **Validation :** test Vitest ciblé, `bash -n scripts/ops/*.sh`, inspection de l'ordre du job `deploy`.
  - **Sécurité / rollback :** valider strictement les URLs d'entrée avant `curl` ; aucun secret ; un échec bloque les E2E et signale la release sans exécuter de commande destructive. Le ticket ne promet pas de rollback automatique du VPS après une preuve externe échouée.

- [x] **4. Documenter et vérifier l'ensemble de la story**
  - **Objectif :** documenter la canonicalisation et la preuve opérateur, puis exécuter la suite de qualité complète avant validation de livraison.
  - **Fichiers attendus :** `docs/operations.md` et uniquement les ajustements matériels révélés par les vérifications AQ-SEO-001.
  - **Autorisé :** procédure de validation, exemple de commandes HTTP, rollback Caddy et limites de la preuve.
  - **Interdit :** documentation d'un déploiement réellement exécuté sans preuve, changement d'autres stories SEO/GEO ou déploiement automatique depuis ce plan.
  - **Tests :** couverture des six critères d'acceptation par test ou inspection documentée ; aucune référence `.dev` dans les sorties/configurations publiques en périmètre.
  - **Validation :** `npm test`, `npm run typecheck`, `npm run build`, `npm run quality:budgets`, `bash -n scripts/ops/*.sh`, validation Caddy et `git diff --check`.
  - **Sécurité / rollback :** aucune action distante pendant l'implémentation locale ; après déploiement humain, contrôler racine, chemin, query et destination `www`. En cas de régression, restaurer le `Caddyfile` précédent, le recharger et revérifier `www` avant toute autre action.

## Cartographie des critères

| Critère | Étapes |
|---|---|
| Redirection permanente de la racine | 2, 3, 4 |
| Conservation chemin et paramètres | 2, 3, 4 |
| Destination `www` sans boucle | 2, 3, 4 |
| Absence de `.dev` | 1, 4 |
| Échec explicite sur configuration/preuve incorrecte | 2, 3 |
| Conservation SHA/santé et rollback existants | 2, 3, 4 |

## Impacts explicitement absents

- **Migration / base de données :** aucune.
- **RLS / autorisations Supabase :** aucun changement.
- **Stockage :** aucun changement.
- **Routes applicatives :** aucune nouvelle route ; seule la route publique de bord apex est redirigée.
- **IA :** aucun changement de crawler ; `AQ-SEO-003` reste séparé.
- **Dépendances :** aucune nouvelle dépendance npm ; utilisation de Bash, `curl`, Docker et Caddy déjà présents.
- **Destruction :** aucune commande destructive ; aucun déploiement ou reload distant avant validation humaine du plan et de l'implémentation.

## Validation humaine requise

Ce plan a été explicitement validé par Antoine le 2 septembre 2026 avant le début de l'implémentation.

## Preuves d'implémentation

- `npm test`, `npm run typecheck`, `npm run build` et `npm run quality:budgets` réussis le 2 septembre 2026.
- `bash -n scripts/ops/*.sh` et `git diff --check` réussis.
- 8 tests ciblés AQ-SEO-001 couvrent la configuration, Caddy, l'ordre de la CI et les cas HTTP positifs/négatifs.
- La configuration a été validée avec succès dans l'image `caddy:2-alpine` ; `deploy-release.sh` répète ce contrôle avant le build et bloque la release en cas d'échec.
