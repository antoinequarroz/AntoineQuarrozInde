---
ticket: AQ-SEO-003
validated: yes
---

# AQ-SEO-003 — Séparer visibilité ChatGPT et entraînement OpenAI

## Plan ordonné

- [x] **1. Publier la politique OpenAI explicite dans `robots.txt`**
  - **Objectif :** générer des groupes distincts autorisant `OAI-SearchBot` sur `/`, refusant `GPTBot` sur `/` et conservant `User-agent: *` avec `Allow: /`, puis déclarer une seule fois le sitemap canonique.
  - **Fichiers attendus :** `server/routes/robots.txt.ts`, nouveau test ciblé `tests/seo-openai-crawlers.test.ts`.
  - **Autorisé :** modifier uniquement le corps textuel généré et ajouter des assertions qui analysent les groupes indépendamment de leur ordre.
  - **Interdit :** ajouter une règle pour `ChatGPT-User`, changer le sitemap, exposer une route privée, modifier les headers `noindex`, promettre une citation ou traiter `robots.txt` comme une protection d'accès.
  - **Tests :** décision exacte pour chaque crawler; absence de directive contradictoire dans son groupe; crawler inconnu servi par le groupe générique; sitemap absolu `.ch` unique.
  - **Validation :** Vitest ciblé, `npm run typecheck`, build Nuxt et inspection de l'artefact généré via Portly.
  - **Sécurité / rollback :** aucun changement d'autorisation applicative; rollback limité au handler et à l'image applicative précédente.

- [x] **2. Créer une preuve HTTP sémantique de la politique**
  - **Objectif :** télécharger anonymement `/robots.txt`, analyser ses groupes, refuser toute contradiction et vérifier que le sitemap canonique déclaré répond correctement.
  - **Fichiers attendus :** nouveau `scripts/ops/verify-openai-robots-policy.sh`, `tests/seo-openai-crawlers.test.ts`.
  - **Autorisé :** origine HTTP(S) validée, `curl` borné, parsing insensible à la casse et aux fins de ligne, contrôle d'une URL de sitemap attendue.
  - **Interdit :** identifiants, désactivation TLS, appel aux plages IP OpenAI, dépendance npm, modification distante ou simple recherche globale de chaînes sans association aux groupes.
  - **Tests :** fixture valide; échecs sur GPTBot autorisé, OAI-SearchBot refusé, règle spécifique absente ou dupliquée/contradictoire, groupe générique bloquant, sitemap absent/non canonique/indisponible, origine dangereuse ou indisponible.
  - **Validation :** tests Vitest du script, `bash -n`, fixtures HTTP locales et `git diff --check` via Portly.
  - **Sécurité / rollback :** preuve anonyme en lecture seule; un échec arrête la release sans mutation distante.

- [x] **3. Bloquer une release incohérente et documenter la décision**
  - **Objectif :** exécuter la preuve robots après les contrôles de production existants, documenter `OD-SEO-003`, ses limites, le délai indicatif de prise en compte et le rollback.
  - **Fichiers attendus :** `.github/workflows/ci.yml`, `docs/operations.md`, `tests/seo-openai-crawlers.test.ts`.
  - **Autorisé :** une étape CI après `verify-private-noindex.sh`, une commande opérateur reproductible et des liens vers la documentation officielle vérifiée.
  - **Interdit :** retirer ou réordonner avant déploiement les preuves existantes, ajouter `llms.txt`, configurer une garantie de résultat ou déployer avant validation humaine de l'implémentation.
  - **Tests :** ordre CI; appel au domaine `www`; référence explicite à `OD-SEO-003`; documentation sans ambiguïté entre Search, entraînement et visites utilisateur.
  - **Validation :** inspection CI, suite qualité complète et preuve HTTPS après déploiement humain.
  - **Sécurité / rollback :** aucun secret nouveau; retrait de la seule étape CI et retour à l'image précédente en cas de politique incorrecte.

- [x] **4. Valider toute la story**
  - **Objectif :** exécuter les contrôles complets et enregistrer les preuves sans élargir le périmètre.
  - **Fichiers attendus :** uniquement les ajustements matériels révélés par AQ-SEO-003 et mise à jour de ce plan après exécution.
  - **Autorisé :** corrections strictement nécessaires aux critères ci-dessous.
  - **Interdit :** modifier les contenus, traductions, données structurées, analytics, sécurité applicative ou stories suivantes.
  - **Tests :** couverture positive et négative de chaque critère d'acceptation et non-régression des preuves AQ-SEO-001/AQ-SEO-002.
  - **Validation :** `npm test -- --run`, `npm run typecheck`, `npm run build`, `npm run quality:budgets`, `bash -n scripts/ops/*.sh` et `git diff --check` via Portly.
  - **Sécurité / rollback :** aucune migration ni donnée; rollback applicatif avec l'image `previous` et le commit précédent.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| `OAI-SearchBot` est explicitement autorisé sur les pages publiques | 1, 2, 4 |
| `GPTBot` est explicitement refusé | 1, 2, 4 |
| Les moteurs classiques et crawlers inconnus restent autorisés | 1, 2, 4 |
| Le sitemap canonique reste déclaré et disponible | 1, 2, 4 |
| Les contradictions bloquent la release | 2, 3, 4 |
| La décision humaine `OD-SEO-003` est traçable | 3, 4 |

## Impacts explicitement absents

- **Migration / base de données :** aucune.
- **RLS / autorisations / authentification :** aucun changement.
- **Stockage :** aucun changement.
- **Routes publiques :** contenu de `/robots.txt` uniquement; aucune nouvelle route.
- **IA :** politique limitée à `OAI-SearchBot` autorisé et `GPTBot` refusé; `ChatGPT-User` inchangé.
- **Dépendances :** aucune nouvelle dépendance.
- **Données personnelles / secrets :** aucun.
- **Destruction :** aucune commande destructive; aucun déploiement avant validation humaine du plan et de l'implémentation.

## Validation humaine requise

Ce plan doit être explicitement validé par Antoine avant toute modification du
code applicatif ou de la politique `robots.txt`.

Plan validé par Antoine le 3 septembre 2026 avec l'instruction « oui go avec
ça ».

## Preuves d'implémentation

- La sortie `robots.txt` générée et l'artefact Nitro contiennent trois groupes
  distincts : `OAI-SearchBot` autorisé, `GPTBot` refusé et `*` autorisé.
- Les 14 tests ciblés couvrent la politique, le sitemap canonique, l'ordre CI,
  la documentation, six contradictions, une indisponibilité et les origines
  invalides.
- La suite complète a passé `npm test -- --run`, `npm run typecheck`,
  `npm run build`, `npm run quality:budgets`, `bash -n scripts/ops/*.sh` et
  `git diff --check` via Portly le 3 septembre 2026.
- La preuve HTTPS réelle reste volontairement post-déploiement et sera exécutée
  par la CI sur `https://www.antoinequarroz.ch` après validation humaine de
  l'implémentation.
