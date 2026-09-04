---
ticket: AQ-SEO-008
validated: yes
---

# AQ-SEO-008 — Identifier Antoine dans les résultats et les partages

## Plan ordonné

- [x] **1. Centraliser l'identité publique approuvée et sécuriser les URL d'image**
  - **Objectif :** créer une source unique, typée et testable pour les
    coordonnées déjà visibles, les profils approuvés et l'image de repli, puis
    garantir qu'une image SEO produise toujours une URL publique absolue sûre.
  - **Fichiers attendus :** nouveaux utilitaires sous `shared/utils/`, tests
    unitaires dédiés et adaptations minimales des types si nécessaires.
  - **Autorisé :** reprendre exactement nom, e-mail, téléphone, rue, code
    postal, localité, région, pays, GitHub, LinkedIn et `/about.jpg`; accepter
    une URL HTTPS ou un chemin same-origin; neutraliser `<` lors de la
    sérialisation JSON-LD; replier toute valeur absente/invalide.
  - **Interdit :** ajouter un profil, des coordonnées géographiques ou une
    donnée non visible; accepter `data:`, `javascript:`, des identifiants URL ou
    du HTTP de production; installer une dépendance; modifier Supabase.
  - **Tests :** constantes exactes, origine avec/sans slash, chemin relatif
    converti en absolu, HTTPS conservé, cas vide/invalide/dangereux replié,
    chaîne `</script>` neutralisée.
  - **Validation :** Vitest ciblé et typecheck via un job temporaire Portly.
  - **Sécurité / rollback :** aucune donnée nouvelle ni écriture; rollback
    applicatif par retrait des utilitaires; toute future modification de
    coordonnées ou `sameAs` exige une approbation d'Antoine.

- [x] **2. Aligner le contenu visible et le JSON-LD de la page d'accueil**
  - **Objectif :** faire consommer la source unique au footer et au graphe
    `Person`/`ProfessionalService`, avec l'adresse complète, le téléphone,
    l'e-mail, les profils approuvés et des `@id` stables.
  - **Fichiers attendus :** `app/components/layout/AppFooter.vue`,
    `app/pages/index.vue` et test de structure/SSR ciblé.
  - **Autorisé :** `PostalAddress` complète, `sameAs` GitHub/LinkedIn, image
    absolue, références entre `Person`, `ProfessionalService` et `WebSite`, pays
    affiché localisé FR/EN/DE depuis la même identité.
  - **Interdit :** afficher une donnée supplémentaire, inventer un profil,
    renseigner des coordonnées GPS, modifier le design du footer ou introduire
    le schéma d'une story ultérieure.
  - **Tests :** JSON valide en FR/EN/DE, valeurs structurées égales aux valeurs
    visibles normalisées, `sameAs` exact sans entrée vide, image absolue, IDs
    stables et absence de fermeture de balise injectable.
  - **Validation :** Vitest ciblé, rendu SSR local et inspection du graphe avec
    une preuve HTML via Portly.
  - **Sécurité / rollback :** données déjà publiques, sans secret; une
    divergence visible/JSON-LD ou un profil inattendu bloque la livraison;
    rollback sans migration.

- [x] **3. Garantir une image sociale pertinente sur chaque page indexable**
  - **Objectif :** fournir Open Graph et Twitter avec URL absolue accessible et
    alt pertinent sur toutes les routes du sitemap, en privilégiant l'image de
    l'article ou du projet puis le repli de marque.
  - **Fichiers attendus :** `app/app.vue`, `app/pages/blog/[slug].vue`,
    `app/pages/projets/[slug].vue`, `i18n/locales/fr.json`,
    `i18n/locales/en.json`, `i18n/locales/de.json` et tests SEO ciblés.
  - **Autorisé :** défaut global localisé, surcharge éditoriale quand l'image
    est sûre, alt formé à partir du titre public, image de repli sinon, aligner
    `CreativeWork.image` sur l'image sociale résolue.
  - **Interdit :** dupliquer les métadonnées dans toutes les pages statiques,
    rendre obligatoire une image éditoriale dans le CRM, modifier le contenu
    des projets/articles, créer des routes traduites ou ajouter `BlogPosting`.
  - **Tests :** les 18 routes statiques héritent du défaut; article/projet avec
    image, sans image et avec URL hostile; balises OG/Twitter et alt identiques;
    URL toujours absolue; `CreativeWork.image` cohérente; FR/EN/DE couvertes.
  - **Validation :** Vitest, typecheck, build Nuxt et aperçu Nitro via des jobs
    temporaires Portly.
  - **Sécurité / rollback :** aucune mutation CRM ou stockage; repli automatique
    en cas de valeur douteuse; rollback des métadonnées sans impact de données.

- [x] **4. Ajouter une preuve fail-closed et valider la livraison complète**
  - **Objectif :** bloquer la qualité de livraison si une page indexable perd
    son image/alt, si une image n'est pas accessible ou si le JSON-LD diverge du
    site visible.
  - **Fichiers attendus :** `tests/seo-identity-social.test.ts`, nouveau
    `scripts/ops/verify-identity-social.sh`, `.github/workflows/ci.yml`,
    `docs/operations.md` et mise à jour des preuves de ce plan.
  - **Autorisé :** découvrir les URL depuis le sitemap/API publics, parser le
    HTML, contrôler JSON-LD, OG et Twitter, vérifier les images HTTPS du domaine
    canonique ou du stockage public Supabase avec délais/tailles bornés, ajouter
    des fixtures négatives.
  - **Interdit :** dépendre d'un article fixe de production, suivre des
    redirections vers un hôte arbitraire, utiliser une clé de service ou une
    session CRM, assouplir les portes SEO existantes, déployer avant revue.
  - **Tests :** succès nominal, image absente/relative/inaccessible, mauvais
    type MIME, hôte non approuvé, alt absent, JSON-LD invalide, coordonnée ou
    profil divergent; puis suite complète, budgets, Bash, navigateur et
    `git diff --check`.
  - **Validation :** preuve locale sur aperçu Nitro, CI complète, revue du diff
    et revue sécurité avant PR puis production.
  - **Sécurité / rollback :** script anonyme avec liste d'hôtes et protocoles
    stricte; échec fermé; production rollbackable au SHA précédent sans schéma,
    backfill ni suppression.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| La page d'accueil décrit la personne/activité et l'adresse complète | 1, 2 |
| Le JSON-LD correspond exactement aux informations visibles | 1, 2, 4 |
| Chaque page indexable possède une image sociale absolue et un alt | 1, 3, 4 |
| Article/projet : image approuvée sinon repli de marque | 1, 3, 4 |
| JSON-LD valide sans erreur critique applicable | 1, 2, 3, 4 |
| Image inaccessible ou divergence : repli ou porte bloquante | 1, 3, 4 |
| Profil absent/non approuvé omis sans valeur inventée | 1, 2, 4 |
| Toute nouvelle coordonnée ou modification `sameAs` est approuvée | 1, 2 |

## Impacts explicitement cadrés

- **Migration / RLS / stockage :** aucun changement de schéma, politique,
  grant, bucket ou donnée existante.
- **Autorisation :** métadonnées publiques uniquement; aucun endpoint admin ou
  jeton ajouté.
- **Routes publiques :** aucune URL ajoutée, supprimée ou renommée; le sitemap
  existant est la source de couverture.
- **Dépendances / IA :** aucune nouvelle dépendance et aucun usage d'IA.
- **Données destructives :** aucune écriture, suppression ou régénération de
  média.
- **Hors ticket :** image de marque 1200×630 dédiée, Google Business Profile,
  traduction/rédaction de contenu, `BlogPosting`, `Service`,
  `BreadcrumbList`, Search Console et Bing Webmaster Tools.

## Validation humaine requise

Ce plan centralise et republie strictement les coordonnées et profils déjà
visibles, sans en ajouter. Validation explicite reçue d’Antoine le 4 septembre
2026 (« je valide »).

## Preuves d'implémentation

- Tests ciblés : 11/11 réussis dans `tests/seo-identity-social.test.ts`.
- Suite complète : 53 fichiers et 312/312 tests réussis.
- Typecheck, build Nuxt, budgets et syntaxe Bash réussis.
- Preuve HTTP locale : identité, JSON-LD et images validés sur 24 URL du
  sitemap, y compris les articles et études de cas dynamiques.
- Playwright public : 5/5 tests réussis, dont le blog sans JavaScript et la
  stabilité de l'hydratation.
- Revue finale et sécurité : `docs/reviews/AQ-SEO-008.md`, sévérité maximale
  `none`, livraison autorisée.
