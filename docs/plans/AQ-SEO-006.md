---
ticket: AQ-SEO-006
validated: yes
---

# AQ-SEO-006 — Découvrir automatiquement tout contenu publié

## Plan ordonné

- [x] **1. Fermer les sources publiques de contenu**
  - **Objectif :** filtrer les brouillons côté serveur et ne retourner que les
    champs publics nécessaires aux visiteurs; traiter un rôle `client` comme un
    visiteur public pour ces endpoints.
  - **Fichiers attendus :** `server/api/articles.get.ts`,
    `server/api/projects.get.ts`, petits DTO/utilitaires sous `server/utils/`,
    tests API dédiés.
  - **Autorisé :** projection explicite des colonnes, filtres `published`,
    `portfolio_visible`/`case_study_published` et `organization_id`; conserver
    la vue complète des rôles internes existants.
  - **Interdit :** exposer un brouillon, un coût interne, un identifiant client,
    un autre tenant ou utiliser `{ ...row }` pour une réponse publique; changer
    les permissions d'écriture ou le portail client.
  - **Tests :** matrice anonyme/client/interne, quatre états de publication
    projet, article brouillon/publié, deux organisations et liste exacte des
    propriétés sérialisées.
  - **Validation :** Vitest ciblé via Portly, typecheck et contrôle HTTP local.
  - **Sécurité / rollback :** réduction additive de l'exposition; rollback par
    image précédente, sans mutation de donnée.

- [x] **2. Enregistrer des dates éditoriales et auditer la publication article**
  - **Objectif :** ajouter des dates stables de publication/modification et
    rendre tout changement de publication d'article atomique, réservé à
    owner/admin et audité comme la publication des projets.
  - **Fichiers attendus :** nouvelle migration append-only sous
    `supabase/migrations/`, `supabase/schema.sql`, test pgTAP dédié,
    `server/api/articles.post.ts`, `server/api/articles.put.ts` et utilitaire de
    payload/erreurs si nécessaire.
  - **Autorisé :** colonnes `published_at`/`updated_at` sur articles et
    `case_study_published_at`/`updated_at` sur projets; backfill depuis
    `created_at`; maintenance transactionnelle à la source; RPC service-role
    avec verrou `FOR UPDATE`, contrôle du rôle et audit avant/après exact.
  - **Interdit :** réécrire une migration livrée, antidater artificiellement,
    modifier le contenu éditorial, permettre au manager de changer un état
    public ou réussir une publication lorsque l'audit échoue.
  - **Tests :** backfill stable, création privée/publique, première publication,
    modification, dépublication/rep publication, refus manager, isolation,
    privilèges RPC et rollback complet sur échec d'audit.
  - **Validation :** pgTAP local via Portly et tests API ciblés.
  - **Sécurité / rollback :** sauvegarde chiffrée avant promotion; un trigger
    bloque les transitions publiques directes des anciennes images tout en
    laissant fonctionner les brouillons; aucun `DROP` au rollback.

- [x] **3. Générer un sitemap complet, déterministe et fail-closed**
  - **Objectif :** résoudre le tenant public canonique, ajouter
    `/cas-clients-valais`, chaque article publié et chaque étude publiée, puis
    refuser tout sitemap dynamique incomplet.
  - **Fichiers attendus :** `server/routes/sitemap.xml.ts`, source/générateur
    testable sous `server/utils/`, `tests/seo-sitemap-discovery.test.ts` et mise
    à jour ciblée de `tests/seo-french-only-routes.test.ts`.
  - **Autorisé :** requêtes aux colonnes minimales avec `organization_id` et
    statut public; dates provenant uniquement de l'étape 2; validation, tri,
    déduplication, percent-encoding des slugs et échappement XML.
  - **Interdit :** fallback `now`, `select('*')`, entrée EN/DE fictive, route
    privée, donnée d'un autre tenant ou `200` partiel après une erreur.
  - **Tests :** pages statiques, zéro contenu, articles/études mixtes,
    brouillons, deux tenants, dates exactes, caractères réservés, ordre,
    collision, XML valide et 503 sans détail sensible pour chaque panne.
  - **Validation :** Vitest ciblé et requêtes sur aperçu Nitro via Portly.
  - **Sécurité / rollback :** lecture service-role bornée au tenant; l'échec est
    observable sans fuite; rollback applicatif vers le sitemap précédent.

- [x] **4. Garantir le maillage des études et bloquer les régressions**
  - **Objectif :** faire de `/cas-clients-valais` le hub de toutes les études
    publiées, ajouter un lien public vers ce hub et vérifier automatiquement la
    cohérence contenu ↔ sitemap ↔ liens.
  - **Fichiers attendus :** `app/pages/cas-clients-valais.vue`, header ou footer
    public, tests UI/SSR, nouveau `scripts/ops/verify-sitemap-discovery.sh`,
    `.github/workflows/ci.yml`, `docs/operations.md` et ce plan pour les preuves.
  - **Autorisé :** chargement SSR tenant-safe des seules études publiées, cartes
    liées, état vide utile, preuve HTTP anonyme bornée et sans secret.
  - **Interdit :** rendre un projet privé, dépendre d'un slug fixe de production,
    dupliquer les faux cas statiques comme source de vérité, publier une fausse
    traduction ou absorber le rendu sans JavaScript du blog d'`AQ-SEO-007`.
  - **Tests :** toutes les études publiées liées même hors portfolio; aucune
    étude privée; état vide; lien entrant vers le hub; fixture de preuve valide
    et échecs sur URL manquante, brouillon, mauvaise date, XML invalide, 503 ou
    contenu d'un autre tenant.
  - **Validation :** tests ciblés puis suite complète, pgTAP, typecheck, build,
    budgets, `bash -n`, aperçu Nitro, preuve navigateur et `git diff --check`,
    tous via Portly.
  - **Sécurité / rollback :** preuve en lecture seule; son échec bloque la
    release; production déployée seulement après sauvegarde et revue; rollback
    par image `previous` et SHA antérieur.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| Toutes les pages statiques, articles et études publiés sont dans le sitemap | 2, 3, 4 |
| Aucun brouillon, contenu privé, faux locale ou autre tenant n'est exposé | 1, 3, 4 |
| Chaque contenu dynamique utilise une date source stable | 2, 3 |
| Chaque contenu indexable possède un lien entrant contextuel | 4 |
| Le XML est valide, échappé et déterministe | 3, 4 |
| Une panne ne produit jamais silencieusement un sitemap partiel | 3, 4 |
| L'état sans contenu reste valide et utile | 3, 4 |
| Publication autorisée et auditée | 2 |

## Impacts explicitement cadrés

- **Migration :** ajout non destructif de timestamps et d'une RPC article;
  aucune suppression de colonne ou donnée.
- **RLS / autorisations :** aucun accès Data API ajouté; réduction des réponses
  publiques et contrôle owner/admin des transitions article.
- **Stockage / dépendances / IA :** aucun changement.
- **Routes publiques :** aucune URL renommée; ajout d'entrées au sitemap et de
  liens vers des routes françaises déjà existantes.
- **Secrets :** aucun nouveau secret; la service role reste uniquement serveur.
- **Hors ticket :** SSR complet du blog (`AQ-SEO-007`), JSON-LD (`AQ-SEO-008` à
  `AQ-SEO-010`) et rédaction/traduction des contenus.

## Validation humaine requise

Ce plan ajoute une migration, réduit les données renvoyées publiquement et
réserve la publication des articles à owner/admin. Il doit être explicitement
validé par Antoine avant toute modification du code applicatif.

Plan validé par Antoine le 3 septembre 2026 avec l'instruction « je valide ».

## Preuves d'implémentation

- Vitest ciblé : 87/87, puis 16/16 sur la correction de cache public → CRM.
- Suite Vitest complète finale : 51 fichiers, 287/287 tests.
- PostgreSQL/pgTAP éphémère : 3 fichiers, 64/64 tests.
- Typecheck, build Nuxt, budgets de bundle, syntaxe Bash et
  `git diff --check` : succès via Portly.
- Preuve HTTP isolée : sitemap cohérent avec 1 article et 1 étude publiés,
  brouillon et projet privé absents, hub SSR lié à l'étude.
- Preuve navigateur : hub non vide, carte et lien d'étude rendus, aucun overlay
  d'erreur et contenu lisible.
- Revue sécurité indépendante : aucun finding restant, ship autorisé.
