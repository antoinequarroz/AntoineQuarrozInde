# Revue indépendante — AQ-SEO-006

## Verdict

Le diff actuel satisfait les critères d'acceptation d'`AQ-SEO-006` et le plan
validé. Le sitemap est complet, déterministe, borné au tenant canonique et
échoue explicitement en `503` si une source dynamique manque. Les réponses
publiques ne contiennent que les contenus approuvés et leurs champs publics;
le hub des cas clients fournit en SSR un lien vers chaque étude publiée.

Les deux findings majeurs relevés pendant la revue ont été corrigés avant ce
verdict : le rollback vers une ancienne image ne peut plus contourner l'audit
de publication, et les caches Pinia ne peuvent plus conserver une vue publique
après connexion au CRM ou changement d'organisation.

## Périmètre examiné

- Base vérifiée : `origin/main` à
  `576f7a1f47eeb5ef8060e5b5ec6818e9804f3b7d`.
- Branche vérifiée : `codex/aq-seo-006-discoverability`, avec le diff suivi et
  les nouveaux fichiers du ticket présents dans l'espace de travail.
- Entrées lues : `AGENTS.md`,
  `.codex/skills/review-changes/SKILL.md`, `docs/product/prd.md`,
  `docs/product/stories.md:113-131`, `docs/research/AQ-SEO-006.md` et le plan
  humainement validé `docs/plans/AQ-SEO-006.md`.
- Diff complet examiné contre `origin/main`, y compris APIs publiques, stores,
  sitemap, hub SSR, migration et schéma de référence, tests, preuve de release,
  CI et documentation d'exploitation.
- Les fichiers de rapports `.docx`, rendus et scripts de rapport sans rapport
  avec le ticket ont été exclus de la revue et n'ont pas été modifiés.

## Findings

### Critical

Aucun.

### Major

Aucun finding restant.

Les deux écarts majeurs détectés pendant la revue ont été résolus dans le diff
final :

- Le trigger `enforce_article_publication_audit` refuse désormais une création
  publique ou une transition directe de visibilité, tandis que la RPC ouvre sa
  garde transactionnelle uniquement autour du DML et la restaure aussi sur
  exception (`supabase/migrations/20260903232000_add_editorial_timestamps_article_audit.sql:96-117,145-155,172-302`). Les tests prouvent le refus de l'ancienne
  image, la compatibilité des brouillons et le rollback complet si l'audit
  échoue (`supabase/tests/database/aqseo006_editorial_publication.test.sql:99-139,303-412`).
- Les stores indexent maintenant leur cache par contexte `public` ou
  `authenticated:<identité>:<organisation>`, rechargent au changement de contexte et
  ignorent une réponse devenue obsolète grâce à un numéro de requête
  (`app/stores/articles.ts:42-78`, `app/stores/projects.ts:80-116`). Le scénario
  public vers CRM, la course public/authentifié et le changement d'organisation
  sont couverts dans `tests/public-content-store-context.test.ts`.

### Minor

Aucun.

## Vérification des critères et des risques

- **Sources publiques :** les deux endpoints appliquent `organization_id`,
  filtrent les statuts publics pour anonyme/client et utilisent des projections
  fermées. La sérialisation ne propage ni tenant, ni client CRM, ni finance
  interne (`server/api/articles.get.ts:1-28`, `server/api/projects.get.ts:1-28`,
  `server/utils/publicContent.ts:1-109`). Les rôles internes conservent leur vue
  complète.
- **Publication et audit :** POST/PUT articles passent par la RPC atomique avec
  l'identité, le rôle et l'organisation résolus côté serveur
  (`server/api/articles.post.ts:1-21`, `server/api/articles.put.ts:1-23`). La RPC
  est `security invoker`, exécutable seulement par `service_role`, verrouille la
  ligne tenant-scopée, refuse tout rôle autre que owner/admin lors d'une
  transition et enregistre les états avant/après dans la même transaction
  (`supabase/migrations/20260903232000_add_editorial_timestamps_article_audit.sql:172-310`).
- **Dates fiables :** les triggers maintiennent les dates éditoriales à la
  source et le backfill utilise uniquement `created_at`, seul historique
  vérifiable (`supabase/migrations/20260903232000_add_editorial_timestamps_article_audit.sql:1-94`). Le sitemap sélectionne ensuite explicitement ces colonnes
  (`server/routes/sitemap.xml.ts:10-32`).
- **Sitemap :** les pages statiques incluent `/cas-clients-valais`; les entrées
  dynamiques sont encodées, datées, triées et dédupliquées, les URLs sont
  échappées et l'origine est validée (`server/utils/sitemapDiscovery.ts:24-126`).
  Une organisation absente, une panne d'une source, une date/slug invalide ou
  une collision empêche tout XML partiel et retourne un message public générique
  en `503` (`server/routes/sitemap.xml.ts:6-43`).
- **Maillage et état vide :** le hub attend les projets pendant le SSR, ne rend
  que les études publiées, fournit un lien par étude et affiche deux sorties
  utiles si la liste est vide (`app/pages/cas-clients-valais.vue:1-11,78-131`).
  Le footer fournit le lien entrant vers ce hub
  (`app/components/layout/AppFooter.vue:22-29`).
- **Preuve de release :** le contrôle anonyme vérifie XML, doublons, routes
  fictives/privées, champs internes, dates, cohérence des deux APIs et liens SSR
  (`scripts/ops/verify-sitemap-discovery.sh:1-176`). Il est exécuté après le
  déploiement dans `.github/workflows/ci.yml:138-150`; l'échec bloque donc la
  release. Le rollback compatible avec le garde-fou DB est documenté dans
  `docs/operations.md:94-104,285-313`.
- **Scope :** aucune dépendance, clé, stockage ou permission Data API n'est
  ajouté. Les changements correspondent aux quatre étapes du plan validé
  (`docs/plans/AQ-SEO-006.md:10-93`).

## Risques hors périmètre

- Le rendu Markdown historique utilise toujours `v-html` sans assainissement.
  Ce risque XSS stocké, déjà identifié avant le plan, reste à traiter dans un
  ticket de sécurité distinct (`docs/research/AQ-SEO-006.md:155-160`).
- La suppression complète d'un article publié reste accessible au niveau
  d'autorisation préexistant et n'est pas journalisée comme une transition de
  statut (`server/api/articles.delete.ts:1-18`). Cette opération n'a pas été
  modifiée par AQ-SEO-006; un ticket dédié peut aligner suppression et rétention
  d'audit sans élargir rétroactivement cette story.

Ces risques ne sont ni introduits ni aggravés par le diff et ne bloquent pas
son objectif de découvrabilité.

## Commandes et résultats

Tous les travaux bornés ont été exécutés via Portly.

- `git rev-parse origin/main` →
  `576f7a1f47eeb5ef8060e5b5ec6818e9804f3b7d`, exit `0`.
- `git diff --check origin/main` → aucune sortie, exit `0`.
- `npx vitest run tests/public-content-api.test.ts tests/public-content-store-context.test.ts tests/article-editorial-publication.test.ts tests/seo-sitemap-discovery.test.ts tests/seo-case-study-hub.test.ts tests/seo-french-only-routes.test.ts tests/legal-compliance.test.ts`
  → `7` fichiers, `89/89` tests réussis, exit `0`.
- `npm test` → `51` fichiers, `287/287` tests réussis, exit `0`.
- `npx --no-install supabase test db --db-url postgres://postgres:postgres@127.0.0.1:55432/postgres supabase/tests/database`
  → `3` fichiers pgTAP, `64/64` tests réussis, résultat `PASS`, exit `0`.
- `npm run typecheck && npm run build && npm run quality:budgets && bash -n scripts/ops/verify-sitemap-discovery.sh && git diff --check origin/main`
  → succès, exit `0`; build Nuxt produit, budget global `5 807 001` octets,
  plus gros chunk `2 266 990` octets et scène robot `1 010 718 / 1 500 000`.
- Preuve HTTP isolée sur la base migrée → sitemap cohérent avec un article et
  une étude publiés, contenus privés absents, lien SSR présent; succès. La
  vérification navigateur associée rend la carte et son lien sans erreur.
- `bash scripts/ops/verify-sitemap-discovery.sh http://127.0.0.1:3104` sur
  l'ancien aperçu déjà ouvert → `503`, exit `1`, car cet aperçu utilisait encore
  une source de données non migrée. Ce résultat confirme le comportement
  fail-closed attendu; l'aperçu isolé aligné sur la migration est la preuve
  fonctionnelle de release.

Max severity: none
Ship allowed: yes
