---
ticket: AQ-SEO-009
validated: yes
---

# AQ-SEO-009 — Auteur et fraîcheur des articles

## Plan ordonné

- [x] **1. Rendre l'auteur canonique traçable et obligatoire en base**
  - **Objectif :** ajouter à chaque article une clé auteur approuvée, rétro-remplir
    les contenus existants et empêcher qu'un article sans auteur valide devienne
    public, tout en conservant la compatibilité avec l'image applicative
    précédente.
  - **Fichiers attendus :** nouvelle migration créée avec la CLI Supabase,
    `supabase/schema.sql`, nouveau test pgTAP sous
    `supabase/tests/database/`, adaptations ciblées des tests éditoriaux.
  - **Autorisé :** `author_key = 'antoine-quarroz'`, backfill de toutes les
    lignes existantes, valeur par défaut/`NOT NULL`/contrainte d'approbation,
    redéfinition de `save_article_with_publication_audit` à signature constante,
    conservation de l'auteur sur ancien payload et présence de la clé dans
    l'audit de publication.
  - **Interdit :** modifier la migration historique AQ-SEO-006, ajouter du texte
    auteur libre, créer une gestion multi-auteurs, supprimer/renommer une
    colonne, relâcher le contrôle de tenant ou de rôle, passer une fonction en
    `security definer`.
  - **Tests :** migration rejouable sur le socle local, backfill exact, insertion
    et mise à jour avec ancien/nouveau payload, rejet d'une clé nulle/vide/non
    approuvée, owner/admin autorisés à publier, manager interdit de changer la
    visibilité, organisation étrangère refusée, audit avant/après avec auteur.
  - **Validation :** `npm run test:db`, tests Vitest éditoriaux et vérification de
    l'historique local via des jobs temporaires Portly; avis de sécurité Supabase
    avant commit de la migration.
  - **Sécurité / rollback :** RLS et grants inchangés, RPC `security invoker` et
    `search_path` vide; aucune donnée supprimée. La migration est promue avant
    l'image et accepte l'ancien contrat; un rollback applicatif conserve les
    lignes et l'auteur canonique.

- [x] **2. Faire porter l'auteur et les dates fiables par le CRM et l'API**
  - **Objectif :** rendre l'auteur explicite dans le formulaire, valider le
    payload serveur et transporter les timestamps ISO complets jusqu'au store
    sans élargir inutilement le contrat du listing public.
  - **Fichiers attendus :** `app/pages/admin/articles/index.vue`,
    `app/stores/articles.ts`, `server/utils/articlePayload.ts`,
    `server/utils/publicContent.ts`, tests de payload/store/API et éventuels
    libellés français déjà utilisés par le CRM.
  - **Autorisé :** sélecteur ou champ en lecture seule obligatoire « Antoine
    Quarroz », envoi `authorKey`, mapping `author_key`, `published_at` et
    `updated_at`, validation stricte de la seule clé approuvée, erreur claire au
    formulaire si la sauvegarde est refusée.
  - **Interdit :** permettre un auteur arbitraire, laisser le navigateur choisir
    une date de publication, exposer une note interne, une organisation ou une
    session, ajouter l'auteur au DTO résumé si aucun écran ne le consomme.
  - **Tests :** création/édition CRM, payload valide et valeurs ambiguës
    rejetées, mapping ISO sans troncature, vue admin complète, détail public
    limité à la liste blanche et brouillons toujours absents en anonyme.
  - **Validation :** Vitest ciblé, typecheck et parcours navigateur du formulaire
    via des jobs temporaires Portly.
  - **Sécurité / rollback :** les routes conservent `requireAdmin`, le contexte
    d'organisation et la RPC auditée; aucun accès direct client à Supabase ni
    nouveau rôle. L'ancien payload reste accepté par la base pendant un rollback.

- [x] **3. Afficher la provenance et produire un `BlogPosting` fidèle**
  - **Objectif :** afficher auteur, publication et vraie modification sur la page
    article, puis générer les données structurées depuis exactement les mêmes
    valeurs publiques.
  - **Fichiers attendus :** `app/pages/blog/[slug].vue`, utilitaire partagé
    minimal si nécessaire, traductions françaises si un libellé est centralisé,
    nouveau test ciblé de page article.
  - **Autorisé :** lien visible vers `/#about`, éléments `<time datetime>`,
    format visible `fr-CH`/`Europe/Zurich`, `BlogPosting` avec `headline`,
    `description`, auteur lié à `/#person`, `datePublished`, `image`,
    `inLanguage`, canonical et `dateModified` uniquement quand
    `updated_at > published_at`; réutiliser l'image sociale et
    `serializeJsonLd`.
  - **Interdit :** utiliser `created_at` comme préférence normale, afficher la
    date courante, inventer `dateModified`, créer des routes blog EN/DE, ajouter
    avis, note, résultats ou autre propriété non visible, injecter directement
    un objet CRM dans le script.
  - **Tests :** rendu avec dates égales puis modification réelle, date
    absente/invalide, auteur visible et cliquable, canonical/image/langue
    identiques au JSON-LD, titre/résumé hostile neutralisé, HTML SSR présent sans
    JavaScript.
  - **Validation :** Vitest, typecheck, build Nuxt, aperçu Nitro et inspection
    navigateur publique via Portly.
  - **Sécurité / rollback :** liste blanche Schema.org, sérialisation sûre et
    échec fermé sur article public incohérent; rollback de la vue sans mutation
    de donnée.

- [x] **4. Bloquer la release sur toute divergence visible/structurée**
  - **Objectif :** vérifier anonymement chaque article publié après déploiement
    et empêcher une mise en production dont l'auteur, les dates ou le
    `BlogPosting` sont absents ou contradictoires.
  - **Fichiers attendus :** nouveau
    `scripts/ops/verify-blog-posting.sh`, test de contrat associé,
    `.github/workflows/ci.yml`, `docs/operations.md` et preuves finales du plan.
  - **Autorisé :** découverte dynamique des articles via API/sitemap publics,
    parsing HTML, comparaison des valeurs visibles, canonical, Open Graph et
    JSON-LD, contrôle de la présence conditionnelle de `dateModified`, délais et
    tailles de réponse bornés.
  - **Interdit :** coder un slug de production en dur, utiliser une session CRM
    ou un secret Supabase, suivre une URL arbitraire, accepter une date ou un
    auteur manquant, neutraliser une porte existante, déployer avant revue.
  - **Tests :** succès nominal; échecs sur absence/divergence d'auteur,
    publication invalide, modification inventée/manquante, image ou canonical
    différents, JSON-LD invalide, page non SSR; syntaxe Bash et fixtures
    négatives.
  - **Validation :** preuve locale sur aperçu Nitro, suite complète, pgTAP,
    budgets, CI, revue indépendante et revue sécurité avant PR puis validation
    de production.
  - **Sécurité / rollback :** preuve anonyme et fail-closed, aucun secret dans
    les logs; migration sauvegardée/chiffrée par le pipeline existant et image
    applicative précédente compatible.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| La page affiche l'auteur et la date de publication | 1, 2, 3, 4 |
| La modification n'existe que lorsqu'une source réelle la prouve | 1, 2, 3, 4 |
| `BlogPosting` reprend titre, description, auteur, dates, image, langue et canonical visibles | 2, 3, 4 |
| L'auteur relie Antoine à l'entité de l'accueil | 1, 3, 4 |
| Le JSON-LD est valide sans erreur critique applicable | 3, 4 |
| Un article sans auteur ou date valide ne devient pas public | 1, 2, 4 |
| L'absence de modification n'invente aucune date | 1, 3, 4 |
| Auteur et dates restent traçables dans l'enregistrement éditorial | 1, 2 |
| Seuls les rôles existants autorisés sauvegardent/publient | 1, 2 |

## Impacts explicitement cadrés

- **Migration :** ajout append-only de `articles.author_key`, backfill canonique,
  contrainte et redéfinition compatible de la RPC existante. Création avec la
  CLI Supabase; aucune migration historique modifiée.
- **RLS / autorisation :** politiques, grants et rôles inchangés; service role
  uniquement côté serveur, RPC `security invoker`, publication réservée à
  `owner`/`admin`, édition conforme au rôle `manager` existant.
- **Stockage :** aucun bucket ni média modifié; l'image sociale sûre existante
  est réutilisée.
- **Routes publiques :** aucune route ajoutée, supprimée ou traduite; la page
  article française et son canonical restent identiques.
- **Dépendances / IA :** aucune nouvelle dépendance et aucun usage d'IA.
- **Données destructives :** aucune suppression; les lignes existantes reçoivent
  la clé auteur unique déjà approuvée. La sauvegarde chiffrée pré-migration du
  pipeline reste obligatoire avant promotion.
- **Hors ticket :** multi-auteurs, profils auteurs dédiés, traduction des
  articles, programme éditorial, schémas `Service` et `BreadcrumbList`.

## Validation humaine requise

Ce plan crée une petite migration afin d'enregistrer « Antoine Quarroz » comme
auteur canonique de tous les articles existants et futurs. Validation explicite
reçue d'Antoine le 4 septembre 2026 (« je valide »).

## Preuves d'implémentation

- Migration créée par la CLI Supabase, rejouée sur une pile locale éphémère et
  validée avec 78 assertions pgTAP, dont 14 dédiées à AQ-SEO-009.
- Lint PostgreSQL : aucune erreur de schéma; conseiller Supabase de sécurité :
  aucun problème détecté.
- Tests ciblés : 29/29 réussis après la dernière modification du script de
  preuve; suite complète : 54 fichiers et 321/321 tests réussis.
- Typecheck Nuxt, build de production, budgets et syntaxe Bash réussis.
- La preuve HTTP couvre avec fixtures une première publication, une vraie mise à
  jour et les refus d'auteur non approuvé, date inventée, JSON-LD divergent et
  origine non sûre.
- La preuve réelle de production reste volontairement attachée au pipeline
  post-déploiement; aucune migration ni image n'a été envoyée en production par
  cette implémentation.
