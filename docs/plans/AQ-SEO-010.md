---
ticket: AQ-SEO-010
validated: no
---

# AQ-SEO-010 — Services et chemins de navigation structurés

## Plan ordonné

- [ ] **1. Construire un modèle partagé sûr pour les fils d'Ariane et services**
  - **Objectif :** fournir une source unique, typée et validée pour le rendu
    visible et les objets Schema.org, sans dupliquer les URLs ni accepter de
    données commerciales arbitraires.
  - **Fichiers attendus :** nouveau module sous `shared/utils/` (par exemple
    `publicStructuredData.ts`), nouveau composant sous `app/components/ui/`
    (par exemple `AppBreadcrumbs.vue`) et test Vitest ciblé.
  - **Autorisé :** type `{ name, path }`, validation de l'origine avec
    `normalizePublicSiteOrigin`, chemins locaux absolus sans query ni fragment,
    positions continues, dernier item égal au canonical; constructeur
    `Service` limité au nom, type, description, URL, page principale,
    fournisseur approuvé et zone servie; `<nav aria-label="Fil d’Ariane">`,
    `<ol>`, liens d'ancêtres et `aria-current="page"`.
  - **Interdit :** URL externe ou protocole injecté depuis un contenu, HTML
    brut, second sérialiseur JSON-LD, prix, offre, avis, note, disponibilité,
    promesse de résultat, package supplémentaire ou abstraction de routage hors
    ticket.
  - **Tests :** origine sûre et dangereuse, chemin local valide et ambigu,
    libellé vide, positions/URLs exactes, canonical final, liste minimale,
    propriétés strictement autorisées et sérialisation d'un libellé hostile.
  - **Validation :** Vitest ciblé, typecheck et inspection SSR du composant via
    un job temporaire Portly.
  - **Sécurité / rollback :** aucune donnée persistée; validation fermée des
    entrées et réutilisation de `serializeJsonLd`. Le rollback supprime seulement
    l'utilitaire et le composant avec leurs usages.

- [ ] **2. Décrire les quatre services depuis leur contenu visible approuvé**
  - **Objectif :** ajouter à chaque page de service un fil visible et un objet
    `Service` correspondant exactement à son H1, son introduction, Antoine et
    la zone « Valais ».
  - **Fichiers attendus :**
    `app/pages/developpeur-web-valais.vue`,
    `app/pages/creation-site-internet-valais.vue`,
    `app/pages/refonte-site-web-valais.vue`,
    `app/pages/application-mobile-valais.vue` et tests SEO associés.
  - **Autorisé :** constantes page-scoped réutilisées par le H1, la description
    visible et le schéma; breadcrumb « Accueil > service »; `Service` avec
    `@id` dérivé du canonical, `provider` relié à `/#business`,
    `areaServed` de type `AdministrativeArea` nommée « Valais », `url` et
    `mainEntityOfPage` égaux au canonical; `@graph` sérialisé de manière sûre.
  - **Interdit :** réécrire le fond commercial, élargir la zone à Suisse,
    Europe ou Monde, ajouter prix/délais/résultats/avis, créer une page service
    traduite, utiliser `/#services` comme niveau de breadcrumb ou modifier les
    canonicals.
  - **Tests :** quatre routes couvertes, H1/description/zone visibles identiques
    au `Service`, fournisseur et identifiant exacts, fil SSR présent, canonical
    final exact, aucune propriété interdite.
  - **Validation :** Vitest ciblé, typecheck, build, contrôle des quatre pages
    dans l'aperçu Nitro et parcours clavier/visuel via Portly.
  - **Sécurité / rollback :** uniquement des données publiques déjà approuvées;
    aucun accès CRM ou secret. Retour à l'image applicative précédente sans
    opération de données.

- [ ] **3. Ajouter le même fil visible et structuré aux contenus profonds**
  - **Objectif :** rendre la hiérarchie explicite sur chaque article et étude de
    cas publiée sans altérer les schémas `BlogPosting` et `CreativeWork`
    existants.
  - **Fichiers attendus :** `app/pages/blog/[slug].vue`,
    `app/pages/projets/[slug].vue`, composant/utilitaire partagé et tests ciblés.
  - **Autorisé :** article « Accueil > Blog > titre »; étude de cas « Accueil >
    Cas clients > titre »; titres issus du contenu public, URLs dynamiques
    encodées, page courante non cliquable, composition dans un `@graph` avec le
    nœud structuré existant.
  - **Interdit :** rendre un brouillon ou une étude non publiée, remplacer les
    404 existants, supprimer/modifier les propriétés métier de `BlogPosting` ou
    `CreativeWork`, générer des routes EN/DE, introduire une hiérarchie par
    ancre, sérialiser directement une chaîne éditoriale.
  - **Tests :** article et projet publiés, titre hostile neutralisé, ordre et
    liens visibles/structurés identiques, dernier item égal au canonical,
    `BlogPosting`/`CreativeWork` toujours présents, schéma absent sur 404 et HTML
    initial exploitable sans JavaScript.
  - **Validation :** tests SEO existants et nouveaux, typecheck, build, aperçu
    Nitro puis test navigateur sur un article et une étude publiés via Portly.
  - **Sécurité / rollback :** la sélection publique et les droits ne changent
    pas; liste blanche JSON-LD et sérialisation sûre conservées. Rollback
    applicatif uniquement.

- [ ] **4. Bloquer la release sur toute incohérence Service/Breadcrumb**
  - **Objectif :** contrôler anonymement toutes les pages concernées après
    déploiement et refuser un objet absent, invalide, contradictoire ou enrichi
    d'une propriété commerciale non approuvée.
  - **Fichiers attendus :** nouveau
    `scripts/ops/verify-service-breadcrumbs.sh`, nouveau test de contrat sous
    `tests/`, `.github/workflows/ci.yml`, `docs/operations.md` et preuves finales
    du plan.
  - **Autorisé :** découverte par sitemap, exigence des quatre services,
    classification des `/blog/*` et `/projets/*`, parsing des `@graph`,
    comparaison du fil visible aux `ListItem`, comparaison Service/contenu,
    origine unique, redirections manuelles, délai et taille de réponse bornés;
    validation manuelle représentative avec Schema.org et Rich Results Test.
  - **Interdit :** coder en dur un article ou projet de production, requérir une
    session/clé Supabase, suivre une origine externe, tolérer un canonical
    divergent, imprimer les contenus complets, désactiver les portes SEO
    existantes ou déployer avant revue.
  - **Tests :** succès nominal; échecs sur service manquant, nom/description/
    zone/fournisseur divergents, fil absent ou désordonné, position non continue,
    lien final différent du canonical, JSON-LD invalide, propriété interdite,
    redirection, origine non sûre et page non SSR; cas valide sans article ni
    projet dynamique.
  - **Validation :** syntaxe Bash, fixtures Vitest, suite complète, typecheck,
    build, budgets, preuve sur aperçu Nitro, E2E public, `git diff --check`, revue
    indépendante et revue sécurité avant PR puis preuve de production verte.
  - **Sécurité / rollback :** contrôle anonyme et fail-closed, sans secret ni
    mutation. En cas d'échec post-déploiement, conserver les diagnostics et
    remettre l'image applicative `previous`; aucune restauration de base.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| Chaque service expose un `Service` fidèle au contenu visible | 1, 2, 4 |
| Le fournisseur correspond à Antoine et à l'entité professionnelle approuvée | 1, 2, 4 |
| La zone servie reste le Valais explicitement affiché | 1, 2, 4 |
| Chaque article, service et étude profonde possède un fil visible cohérent | 1, 2, 3, 4 |
| Chaque fil visible possède un `BreadcrumbList` équivalent | 1, 2, 3, 4 |
| Les URLs structurées correspondent aux canonicals | 1, 2, 3, 4 |
| Aucun prix, note, résultat ou disponibilité non approuvé n'est publié | 1, 2, 4 |
| Les propriétés optionnelles absentes ne sont pas inventées | 1, 2, 4 |
| Une donnée structurée incompatible bloque la release | 4 |
| La validation ne présente aucune erreur critique applicable | 1, 2, 3, 4 |

## Impacts explicitement cadrés

- **Migration / données :** aucune migration, aucun backfill et aucune mutation
  de contenu. Les valeurs proviennent du HTML public approuvé.
- **RLS / autorisation :** politiques, grants, rôles, RPC et routes API
  inchangés. Aucune session administrateur n'est utilisée.
- **Stockage :** aucun bucket ni média modifié.
- **Routes publiques :** aucune route ajoutée, supprimée ou traduite; les
  canonicals existants restent les sources d'URL.
- **Dépendances / IA :** aucune nouvelle dépendance et aucun usage d'IA.
- **Données destructives :** aucune suppression ou réécriture de donnée.
- **Déploiement / rollback :** changement applicatif seulement; image
  `previous` récupérable, aucune restauration de base.
- **Hors ticket :** enrichissement du contenu GEO des services, traduction des
  services/articles/cas, nouveau hub services, avis/notes/offres, garantie d'un
  rich result ou refonte générale de la navigation.

## Validation humaine requise

En attente. La validation explicite d'Antoine est requise avant toute
implémentation, tout changement de code applicatif, ouverture de PR ou
déploiement.
