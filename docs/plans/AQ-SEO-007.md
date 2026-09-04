---
ticket: AQ-SEO-007
validated: yes
---

# AQ-SEO-007 — Parcourir le blog sans exécuter JavaScript

## Plan ordonné

- [x] **1. Créer une source de listing publique, canonique et minimale**
  - **Objectif :** fournir au SSR de `/blog` uniquement les résumés d'articles
    publiés de l'organisation publique canonique, indépendamment des cookies,
    Bearer tokens ou en-têtes d'organisation de la requête.
  - **Fichiers attendus :** nouvel endpoint sous `server/api/public/`, petit
    utilitaire public sous `server/utils/`, évolution ciblée de
    `server/utils/publicContent.ts`, tests API dédiés.
  - **Autorisé :** résoudre `DEFAULT_ORGANIZATION_SLUG` côté serveur, sélectionner
    explicitement titre, slug, extrait, image, tags, dates et temps de lecture,
    filtrer `published = true`, ordonner de façon déterministe et retourner un
    `503` public générique après journalisation serveur.
  - **Interdit :** appeler le store d'authentification, transférer
    `Authorization`/`x-organization-id`, retourner `content`, `select('*')`, un
    brouillon, une donnée d'un autre tenant ou un message Supabase brut.
  - **Tests :** publication/brouillon, deux tenants, liste exacte du DTO,
    en-têtes injectés sans effet, organisation absente, erreur base générique,
    chaînes hostiles correctement sérialisées.
  - **Validation :** Vitest ciblé puis typecheck via un job temporaire Portly.
  - **Sécurité / rollback :** endpoint additif en lecture seule, sans nouveau
    grant Data API; rollback applicatif par retrait de l'endpoint, sans mutation
    de donnée.

- [x] **2. Rendre le listing dans le HTML serveur avec quatre états explicites**
  - **Objectif :** remplacer le chargement `onMounted` par `useAsyncData` afin
    que le HTML initial contienne la liste publiée et que l'hydratation réutilise
    exactement le payload serveur.
  - **Fichiers attendus :** `app/pages/blog/index.vue` et test ciblé de la page.
  - **Autorisé :** type de résumé local ou partagé, date issue de
    `published_at` avec fallback réel `created_at`, branches ordonnées erreur →
    chargement → résultats → vide, message générique `role="alert"` et bouton
    de nouvelle tentative.
  - **Interdit :** initialiser `useAuthStore`, utiliser le store éditorial
    partagé pour ce SSR, afficher le faux état vide après une panne, relancer la
    requête pendant l'hydratation, modifier la présentation générale ou créer
    des routes EN/DE du blog.
  - **Tests :** source SSR attendue avant le template, suppression de
    `onMounted`, titre/extrait/date/lien de chaque publié, état vide sans
    squelette infini, erreur distincte sans détail interne, bouton de reprise.
  - **Validation :** Vitest ciblé, typecheck et build Nuxt via Portly.
  - **Sécurité / rollback :** le payload Nuxt ne contient que les résumés
    publics; Vue/Nuxt conserve l'échappement des titres et extraits; rollback
    vers l'ancienne page sans impact de données.

- [x] **3. Prouver le HTML initial, l'absence de brouillons et la navigation sans JavaScript**
  - **Objectif :** vérifier le comportement réel, au-delà d'un test de chaînes
    source, avec une preuve HTTP anonyme et un navigateur sans JavaScript.
  - **Fichiers attendus :** `tests/seo-blog-ssr.test.ts`,
    `e2e/public.spec.ts`, nouveau `scripts/ops/verify-blog-ssr.sh` et fixtures
    minimales de test si nécessaires.
  - **Autorisé :** comparer `/api/public/articles` au markup visible de `/blog`,
    contrôler l'intégralité du document et du payload, utiliser des slugs et
    contenus sentinelles, vérifier les états vide/erreur dans un serveur isolé.
  - **Interdit :** dépendre d'un titre ou slug fixe de production, considérer
    une valeur présente seulement dans un script comme du contenu visible,
    insérer un brouillon réel en production ou rendre les tests dépendants d'un
    secret admin.
  - **Tests :** tous les publiés présents avec titre, extrait, date et `href`;
    brouillon/tenant secondaire/champ interne/token absents partout; ordre
    stable; clic vers un article avec JavaScript désactivé; zéro avertissement
    d'hydratation; variantes négatives du script de preuve.
  - **Validation :** Vitest ciblé, preuve HTTP sur aperçu Nitro et Playwright
    ciblé via Portly.
  - **Sécurité / rollback :** contrôles en lecture seule et anonymes; toute
    fuite ou divergence bloque la livraison; aucun nettoyage de donnée requis.

- [x] **4. Brancher la garde de release et exécuter la validation complète**
  - **Objectif :** empêcher une mise en production si le listing du blog
    redevient client-only, incomplet ou divergent de l'API publique.
  - **Fichiers attendus :** `.github/workflows/ci.yml`, `docs/operations.md` et
    mise à jour des preuves dans ce plan.
  - **Autorisé :** ajouter la preuve blog après les contrôles sitemap du job de
    déploiement, documenter son exécution et lancer les suites existantes.
  - **Interdit :** déployer avant revue, assouplir une porte qualité, supprimer
    une preuve SEO existante ou consommer un secret depuis le script public.
  - **Tests :** suite Vitest complète, pgTAP inchangé, typecheck, build, budgets,
    syntaxe Bash, `git diff --check`, aperçu Nitro, navigateur et revue sécurité
    indépendante.
  - **Validation :** commandes du dépôt exécutées dans des jobs temporaires
    Portly; revue du diff; PR uniquement si toutes les preuves sont vertes.
  - **Sécurité / rollback :** la garde est fail-closed; la production reste sur
    l'image précédente en cas d'échec; rollback au SHA antérieur sans migration.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| Le HTML initial contient titres, extraits, dates et liens des publiés | 1, 2, 3 |
| Aucun brouillon n'est présent dans le HTML ou le payload | 1, 2, 3 |
| L'hydratation conserve la même liste sans divergence | 2, 3 |
| Les liens fonctionnent sans JavaScript | 2, 3 |
| Une panne produit un état d'erreur explicite, jamais un faux vide | 1, 2, 3 |
| Zéro publication produit un état vide serveur clair sans squelette infini | 2, 3 |
| La visibilité reste régie par le statut public existant | 1, 3 |
| La régression est bloquée avant/après déploiement | 3, 4 |

## Impacts explicitement cadrés

- **Migration / RLS / stockage :** aucun changement de schéma, politique, grant
  ou stockage.
- **Autorisation :** la nouvelle source est publique en lecture seule et ignore
  volontairement toute identité; les endpoints éditoriaux existants restent
  inchangés.
- **Route publique :** ajout d'un endpoint de données de listing; aucune URL de
  page renommée ou nouvel indexable.
- **Dépendances / IA :** aucune nouvelle dépendance et aucun usage d'IA.
- **Données destructives :** aucune écriture, suppression ou backfill.
- **Hors ticket :** traduction du blog, refonte graphique, rédaction d'article,
  JSON-LD et assainissement du Markdown `v-html` de la page article.

## Validation humaine requise

Ce plan crée une source SSR publique dédiée et remplace la source client-only du
listing. Validation reçue d’Antoine le 4 septembre 2026 (« tu peux continuer »).

## Preuves d'implémentation

- Suite Vitest complète : 52 fichiers et 301 tests réussis.
- TypeScript, build Nuxt, budgets et syntaxe des scripts : réussis.
- Playwright public : 5 tests réussis, dont navigation sans JavaScript et
  stabilité de l'hydratation.
- Preuve HTTP locale : 6 articles publiés présents dans le HTML et le payload,
  avec liens explorables et aucun état d'authentification.
- Revue sécurité indépendante : SHIP, aucun P0/P1/P2 restant.
- Revue finale : `docs/reviews/AQ-SEO-007.md`, `Ship allowed: yes`.
