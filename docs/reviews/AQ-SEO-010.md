# AQ-SEO-010 — Revue finale et sécurité

## Périmètre

Revue du diff final de la branche
`codex/aq-seo-010-service-breadcrumbs` contre `origin/main`
(`d90bb340b42e43cda1eb87c9f91c61a06958a8e6`). La story
`docs/product/stories.md:194-213`, la recherche
`docs/research/AQ-SEO-010.md` et le plan humainement validé
`docs/plans/AQ-SEO-010.md` servent de références.

La revue couvre les quatre pages de service, les pages profondes article et
étude de cas, le composant accessible, les constructeurs structurés, les tests,
la documentation d'exploitation et la porte de release. Les fichiers utilisateur
non suivis et sans rapport avec le ticket n'ont pas été modifiés.

## Findings

### Critical

Aucun.

### Major

Aucun.

### Minor

Aucun finding mineur restant.

La couverture initiale de la preuve distinguait bien les descriptions et les
propriétés commerciales interdites, mais ne ciblait pas séparément un fournisseur,
une zone ou un canonical divergents. Les fixtures finales couvrent désormais ces
trois erreurs, l'absence d'une page de service et une position de breadcrumb non
continue (`tests/seo-service-breadcrumbs.test.ts:22-36,268-290`).

## Vérification des critères

- Le constructeur refuse les origines et chemins ambigus, les libellés vides et
  les chemins dupliqués, puis crée des URLs absolues et des positions continues
  (`shared/utils/publicStructuredData.ts:38-83`).
- L'objet `Service` est limité au nom, type, description, canonical, fournisseur
  approuvé et zone servie. Il référence `/#business` et n'ajoute aucune offre,
  note, disponibilité ou promesse (`shared/utils/publicStructuredData.ts:86-116`).
- Le composant emploie un landmark `nav`, une liste ordonnée, de vrais liens,
  `aria-current="page"`, un séparateur décoratif et un focus visible
  (`app/components/ui/AppBreadcrumbs.vue:9-37`).
- Les quatre pages utilisent leurs propres H1 et introductions comme source du
  contenu visible et du schéma, puis alignent leur canonical sur le dernier item
  du fil (`app/pages/developpeur-web-valais.vue:1-54`,
  `app/pages/creation-site-internet-valais.vue:1-54`,
  `app/pages/refonte-site-web-valais.vue:1-54`,
  `app/pages/application-mobile-valais.vue:1-54`).
- Les articles conservent `BlogPosting` et les études de cas conservent
  `CreativeWork`; chacun rejoint un `@graph` avec son `BreadcrumbList`
  (`app/pages/blog/[slug].vue:40-104`, `app/pages/projets/[slug].vue:32-96`).
- La preuve découvre les pages depuis le sitemap, exige les quatre services,
  contrôle la même origine, refuse les redirections et borne les réponses
  (`scripts/ops/verify-service-breadcrumbs.sh:4-18,70-137`). Elle compare ensuite
  le fil visible, le JSON-LD, le canonical, le service, le fournisseur, le Valais
  et les propriétés interdites (`scripts/ops/verify-service-breadcrumbs.sh:139-309`).
- La porte est exécutée après les contrôles sitemap, identité et `BlogPosting`
  existants (`.github/workflows/ci.yml:149-158`) et son usage/rollback est décrit
  (`docs/operations.md:220-244`).

## Revue sécurité

Aucun finding de sécurité nouveau ou aggravé par AQ-SEO-010.

- **Entrées et SSRF :** l'origine publique n'accepte que HTTP(S), sans
  identifiants, chemin, query ni fragment; les breadcrumbs refusent les chemins
  externes, les doubles slash, les backslashes et les normalisations ambiguës
  (`shared/utils/publicSeoIdentity.ts:36-49`,
  `shared/utils/publicStructuredData.ts:43-53`). La preuve vérifie à nouveau
  l'origine de chaque URL avant chaque requête et ne suit aucune redirection
  (`scripts/ops/verify-service-breadcrumbs.sh:70-86,112-136`).
- **Injection :** tous les nœuds, y compris les titres dynamiques d'articles et
  projets, passent par `serializeJsonLd`; aucune chaîne éditoriale n'est injectée
  directement dans un script (`app/pages/blog/[slug].vue:74-104`,
  `app/pages/projets/[slug].vue:76-96`).
- **Autorisation et données :** aucune route API, migration, politique RLS, RPC,
  session administrateur ou projection publique n'est modifiée. Les 404 et
  filtres de publication existants restent en place sur les contenus profonds
  (`app/pages/blog/[slug].vue:19-25`, `app/pages/projets/[slug].vue:16-24`).
- **Secrets et dépendances :** aucun fichier d'environnement, token, secret,
  package, permission ou bucket n'est ajouté. La preuve fonctionne anonymement
  et ses erreurs n'impriment pas le corps éditorial complet.

Risque préexistant hors ticket : le renderer Markdown de l'article utilise
toujours `v-html` sans assainissement complet (`app/pages/blog/[slug].vue:106-118,188-189`).
AQ-SEO-010 ne modifie pas ce chemin; ce risque reste à traiter dans une story de
sécurité dédiée.

## Contrôles observés

Tous les travaux bornés ont été exécutés sous supervision Portly.

- Tests AQ-SEO-010 finaux : `23/23` réussis, incluant les fixtures négatives de
  canonical, fournisseur, zone, position, JSON-LD, redirection et origine.
- Suite Vitest complète : `55` fichiers et `344/344` tests réussis.
- Typecheck Nuxt : réussi.
- Build Nuxt de production : réussi.
- Budgets : `87` chunks, `5 819 362` octets au total; scène robot
  `1 010 718 / 1 500 000` octets.
- E2E public : `6/6` réussis, dont les quatre breadcrumbs avec JavaScript
  désactivé.
- Preuve locale `BlogPosting` : `6` articles publiés valides après passage en
  `@graph`.
- Preuve locale AQ-SEO-010 : `4` services et `6` contenus profonds valides.
- Inspection navigateur : landmark « Fil d’Ariane », lien « Accueil » et page
  courante présents dans l'arbre d'accessibilité.
- Syntaxe Bash et `git diff --check` : réussis.

## Verdict

Le diff respecte le plan validé et satisfait les critères de la story sans
élargir le périmètre commercial, éditorial ou d'autorisation. La production n'a
pas été modifiée pendant cette implémentation.

Max severity: none
Ship allowed: yes
