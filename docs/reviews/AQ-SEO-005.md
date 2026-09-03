# Revue indépendante — AQ-SEO-005

## Verdict

Le changement satisfait les critères d'acceptation d'`AQ-SEO-005` et le plan
validé. Les huit familles francophones sont limitées à la route française, les
anciennes variantes anglaises et allemandes sont redirigées en `308` vers une
destination relative fermée, le sélecteur ne rend que des alternatives
approuvées et résolues, et le sitemap ne publie plus les variantes fictives.

## Périmètre examiné

- Base vérifiée : `main` à
  `d9f78f645b00636c231fa6966dd920ccc2567904`.
- Branche vérifiée : `codex/aq-seo-005-french-only-routes`, `HEAD` à
  `6553f0b7948681be6d82b93ced6d8d90ad8b4742`, ainsi que les modifications et
  fichiers non suivis du ticket.
- Entrées produit lues intégralement : `AGENTS.md`,
  `.codex/skills/review-changes/SKILL.md`, `docs/product/prd.md`,
  `docs/product/stories.md`, `docs/research/AQ-SEO-005.md` et
  `docs/plans/AQ-SEO-005.md`.
- Diff complet contre `main` examiné, avec attention particulière à
  `.github/workflows/ci.yml`, `app/components/ui/LangSwitcher.vue`,
  `nuxt.config.ts`, `server/routes/sitemap.xml.ts`,
  `server/middleware/french-only-locales.ts`,
  `shared/utils/localizedRoutePolicy.ts`,
  `scripts/ops/verify-french-only-routes.sh` et
  `tests/seo-french-only-routes.test.ts`.

## Findings

### Critical

Aucun.

### Major

Aucun.

### Minor

Aucun.

## Vérification des critères et des risques

- **Routes Nuxt/i18n :** `nuxt.config.ts` active les routes configurées et
  dérive les restrictions du manifeste partagé. L'artefact de routes inspecté
  ne contient que les noms `___fr` pour les quatre services, `/blog`,
  `/blog/:slug`, `/cas-clients-valais` et `/projets/:slug`; les routes d'accueil
  et légales conservent leurs variantes FR/EN/DE.
- **Évolution future :** `shared/utils/localizedRoutePolicy.ts` exige, pour
  toute variante approuvée, une référence d'approbation humaine, une source de
  contenu, une source de métadonnées et un ensemble d'alternates complet et
  réciproque. Les doublons d'identifiant et de nom de route sont également
  refusés.
- **Redirections et open redirect :**
  `server/middleware/french-only-locales.ts` intervient avant le rendu et
  retourne `308`. Le matcher de `shared/utils/localizedRoutePolicy.ts` accepte
  uniquement `/en` ou `/de` suivis d'une des huit familles connues, conserve le
  suffixe encodé et la query string sans décodage, produit exclusivement une
  `Location` relative commençant par un seul `/`, et rejette les origines,
  antislashs, contrôles, fragments et chemins voisins. Aucun hôte fourni par la
  requête ne participe à la destination.
- **Sélecteur SSR et accessibilité :**
  `app/components/ui/LangSwitcher.vue` filtre d'abord selon la politique, exige
  ensuite une route réellement résolue et un chemin concordant, puis rend un
  vrai `NuxtLink` avec `href` SSR. Le composant natif `details`/`summary` reste
  utilisable au clavier et n'est pas rendu lorsque la liste est vide.
- **Sitemap :** `server/routes/sitemap.xml.ts` retire `/en/blog`, `/de/blog` et
  les variantes EN/DE des projets publiés, tout en conservant une entrée
  française par projet et le filtre `case_study_published`. La complétude, les
  dates et le comportement Supabase laissés à `AQ-SEO-006` n'ont pas été
  élargis dans ce ticket.
- **Preuve CI :** `.github/workflows/ci.yml` exécute
  `verify-french-only-routes.sh` après `verify-localized-pages.sh`. Le script
  valide strictement l'origine, borne chaque appel, ne suit pas les redirects,
  contrôle six pages françaises, seize redirects, les huit familles du
  sitemap, les canonicals, `noindex`, `hreflang` et les liens de langue, sans
  secret ni mutation.
- **Scope et régressions :** aucune migration, dépendance, variable, donnée,
  règle d'authentification/RLS ou traduction n'est ajoutée. Les changements du
  ticket restent dans les fichiers annoncés par le plan; le diff de branche
  inclut aussi les tickets prérequis AQ-SEO-001 à AQ-SEO-004 déjà présents dans
  `HEAD`.

## Commandes et résultats

- `git branch --show-current` →
  `codex/aq-seo-005-french-only-routes` (exit `0`).
- `git rev-parse --verify main` →
  `d9f78f645b00636c231fa6966dd920ccc2567904` (exit `0`).
- `git diff --check main` → aucune sortie, exit `0`.
- `/Users/antoinequarroz/.local/bin/portly status` →
  `AntoineQuarrozInde/seo-preview` actif sur `:3104`; exit `0`.
- Via Portly :
  `npm exec vitest run tests/seo-french-only-routes.test.ts` → `1` fichier
  réussi, `42/42` tests réussis, exit `0`.
- Via Portly : `npm run typecheck` →
  `Type check passed in 6361ms`, exit `0`.
- Inspection de `.output/server/chunks/virtual/entry.mjs` → routes françaises
  présentes pour les huit familles et aucune route EN/DE correspondante.

Max severity: none
Ship allowed: yes
