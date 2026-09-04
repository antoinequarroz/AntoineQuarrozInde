# AQ-SEO-010 — Recherche dépôt

## Objet vérifié

La story demande qu'un prospect comprenne à la fois le service consulté et sa
position dans le site. Chaque page française de service doit donc exposer un
objet `Service` fidèle au service visible, à son fournisseur et à sa zone
réellement servie. Les services, articles et études de cas profondes doivent
également présenter un fil d'Ariane visible — ou sémantiquement équivalent — et
un `BreadcrumbList` cohérent, dont les URLs correspondent aux canonicals. Toute
propriété commerciale non visible et non approuvée doit être omise
(`docs/product/stories.md:194-213`). La story couvre `SEO-R016` et `SEO-R017`
(`docs/product/prd.md:107-108`) et conserve la décision de laisser ces contenus
en français uniquement jusqu'à traduction humaine (`docs/product/prd.md:179`).

## Pages de service existantes

Les quatre routes de service sont publiques, indexables et déjà déclarées dans
le sitemap statique (`server/utils/sitemapDiscovery.ts:24-43`) :

- `/developpeur-web-valais` possède un canonical unique, un H1, une description
  qui identifie Antoine et une liste visible de zones valaisannes
  (`app/pages/developpeur-web-valais.vue:5-27,38-58`).
- `/creation-site-internet-valais` possède son canonical, son H1 et une
  description visible destinée aux entreprises valaisannes
  (`app/pages/creation-site-internet-valais.vue:5-18,26-45`).
- `/refonte-site-web-valais` possède son canonical, son H1, une description et
  des effets qualitatifs visibles de la refonte
  (`app/pages/refonte-site-web-valais.vue:5-18,26-40`).
- `/application-mobile-valais` possède son canonical, son H1, sa description et
  trois phases visibles (`app/pages/application-mobile-valais.vue:5-18,26-45`).

Aucune de ces pages n'émet actuellement de JSON-LD `Service` ou
`BreadcrumbList`. Les intitulés, descriptions et la zone « Valais » existent
déjà dans le contenu approuvé; il n'est donc pas nécessaire d'ajouter une source
éditoriale ni de demander de nouvelles valeurs commerciales. Pour éviter une
divergence future, le nom et la description de chaque service doivent être
déclarés une seule fois dans sa page puis alimenter à la fois le contenu visible
et l'objet structuré.

Le fournisseur peut référencer l'entité professionnelle canonique
`${siteUrl}/#business`, déjà définie sur l'accueil comme
`ProfessionalService`, avec Antoine comme fondateur
(`app/pages/index.vue:45-81`). Son nom et son adresse valaisanne proviennent de
la constante approuvée `PUBLIC_SEO_IDENTITY`
(`shared/utils/publicSeoIdentity.ts:1-21`). Le footer rend également le nom
d'Antoine visible sur toutes les pages (`app/components/layout/AppFooter.vue:55-63`).
La zone structurée doit rester limitée à « Valais », explicitement visible sur
les quatre pages, et ne pas reprendre automatiquement les zones plus larges de
l'accueil.

## Contenus profonds existants

### Articles

La page article calcule un canonical français et produit déjà un objet
`BlogPosting` sûr depuis le titre, la description, l'image, l'auteur et les
dates visibles (`app/pages/blog/[slug].vue:40-94,123-150`). Elle ne propose
qu'un lien visuel « Retour aux articles » et aucun fil complet
(`app/pages/blog/[slug].vue:111-121`). Le chemin recommandé est :

1. Accueil — `/`
2. Blog — `/blog`
3. titre public de l'article — canonical courant

Le script de preuve `BlogPosting` sait déjà parcourir les nœuds d'un `@graph`
(`scripts/ops/verify-blog-posting.sh:99-113`). Le `BlogPosting` existant peut
donc être conservé et accompagné du `BreadcrumbList` dans le même graphe sans
casser son contrat.

### Études de cas

La page projet ne rend que les projets dont l'étude de cas est publiée, conserve
le 404 existant sinon, calcule le canonical et expose déjà un `CreativeWork`
(`app/pages/projets/[slug].vue:18-24,32-35,70-86`). Son lien de retour pointe
vers l'ancre portfolio de l'accueil plutôt que vers une hiérarchie explicite
(`app/pages/projets/[slug].vue:89-97`). Le hub `/cas-clients-valais` liste chaque
étude publiée et fournit son lien public (`app/pages/cas-clients-valais.vue:68-118`).
Le chemin recommandé est donc :

1. Accueil — `/`
2. Cas clients — `/cas-clients-valais`
3. titre public du projet — canonical courant

Le `CreativeWork` reste inchangé dans son intention et rejoint simplement un
`@graph` avec le fil d'Ariane. Le hub lui-même n'est pas un contenu « profond »
au sens de la story et n'a pas besoin d'un fil supplémentaire.

### Services

Chaque service est directement relié à l'accueil; le chemin le plus fidèle est
donc « Accueil > intitulé du service ». L'ancre `/#services` ne possède pas de
canonical propre et ne doit pas être inventée comme niveau intermédiaire.

## Modèle partagé recommandé

- Créer un petit utilitaire partagé qui reçoit une origine publique validée et
  des éléments `{ name, path }`, refuse les libellés vides et les chemins non
  locaux, puis produit un `BreadcrumbList` avec des positions continues à
  partir de 1. Le dernier `item` doit être exactement le canonical de la page.
- Créer dans le même module un constructeur `Service` volontairement limité à
  `@id`, `name`, `serviceType`, `description`, `url`, `mainEntityOfPage`,
  `provider` et `areaServed`. L'origine doit passer par
  `normalizePublicSiteOrigin`; le script JSON-LD doit continuer d'utiliser
  `serializeJsonLd`, qui neutralise les caractères d'injection HTML
  (`shared/utils/publicSeoIdentity.ts:36-49,82-89`).
- Réutiliser une seule liste d'éléments pour le composant visuel et le
  `BreadcrumbList`. Le composant doit rendre un `<nav aria-label="Fil
  d’Ariane">`, une liste ordonnée, des liens pour les ancêtres et
  `aria-current="page"` sur la page courante.
- Les services doivent référencer le fournisseur approuvé
  `${siteUrl}/#business` et la seule zone vérifiée « Valais ». Aucun prix,
  `Offer`, avis, note, disponibilité, résultat quantifié ou sortie de service ne
  doit être ajouté.

Schema.org définit `Service` comme un service fourni par une organisation et
prévoit notamment `provider`, `areaServed` et `serviceType`. Google décrit le fil
d'Ariane comme l'indication de la position d'une page dans la hiérarchie et
attend des `ListItem` ordonnés avec `name`, `position` et une URL, cette dernière
pouvant être omise uniquement pour le dernier élément. Pour simplifier les
contrôles de cohérence, l'implémentation proposée conservera néanmoins l'URL du
dernier élément et l'alignera strictement sur le canonical.

Références officielles consultées :

- https://schema.org/Service
- https://schema.org/BreadcrumbList
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb

## Flux représentatif après implémentation

1. Nuxt résout l'origine publique et le canonical déjà utilisé par la page.
2. La page construit une liste de navigation depuis ses routes françaises
   approuvées et son titre visible.
3. Le composant rend cette liste dans le HTML SSR, avec les ancêtres cliquables
   et la page courante annoncée aux technologies d'assistance.
4. Le constructeur transforme exactement la même liste en `BreadcrumbList`.
5. Sur un service, les constantes utilisées par le H1 et l'introduction
   alimentent aussi l'objet `Service`, relié à `/#business` et au Valais.
6. Sur un article ou un projet, le nœud structuré déjà en place est conservé et
   le breadcrumb est ajouté au même `@graph`.
7. Après déploiement, une preuve anonyme découvre les pages depuis le sitemap et
   compare canonicals, contenu visible, fil visuel et objets JSON-LD.

## Validation et preuve de release

Le dépôt utilise déjà des preuves HTTP anonymes avec origine contrôlée, délais,
tailles de réponse bornées et redirections manuelles
(`scripts/ops/verify-blog-posting.sh:4-11,54-91`). Le nouveau contrôle doit
suivre le même modèle :

- exiger les quatre routes de service dans le sitemap et vérifier sur chacune
  un unique `Service` ainsi qu'un unique `BreadcrumbList`;
- vérifier chaque URL `/blog/*` et `/projets/*` découverte dans le sitemap;
- parser tous les scripts JSON-LD, y compris les `@graph`, et refuser un JSON
  invalide;
- comparer l'ordre, les libellés, les liens et les positions du fil visible au
  `BreadcrumbList`, puis comparer le dernier item au canonical;
- comparer `Service.name`, `description`, `url`, `provider` et `areaServed` aux
  marqueurs visibles approuvés et à l'identité publique;
- refuser les propriétés interdites ou artificielles (`offers`, prix,
  `aggregateRating`, `review`, disponibilité et résultat non approuvé);
- accepter l'absence totale d'articles ou d'études de cas publiées, mais jamais
  l'absence d'une des quatre pages de service.

La CI exécute déjà les portes sitemap, rendu SSR, identité sociale et
`BlogPosting` après déploiement (`.github/workflows/ci.yml:137-156`). La nouvelle
preuve doit les compléter, pas les remplacer. Elle doit disposer de fixtures
positives et négatives comme les contrôles SEO existants
(`tests/seo-blog-posting.test.ts:27-100,168-180`). Une validation manuelle sur
les outils officiels Schema.org et Google reste utile sur des pages
représentatives, mais la release ne doit pas dépendre d'un service externe
instable.

## Données, autorisation et sécurité

- Aucune migration, table, politique RLS, RPC, permission, route API ou donnée
  CRM n'est nécessaire : les valeurs viennent du contenu public déjà approuvé.
- Aucun secret, cookie administrateur ou accès Supabase authentifié ne doit être
  utilisé par le rendu ou la preuve.
- L'utilitaire doit refuser une origine avec identifiants, chemin, query ou
  fragment, et des chemins de breadcrumb externes ou ambigus. Les URLs
  dynamiques restent encodées avant d'être assemblées.
- Les titres et descriptions venant des articles/projets restent des données
  non fiables; ils ne doivent jamais être interpolés dans un `<script>` sans la
  sérialisation JSON-LD sûre existante.
- La preuve ne suit pas de redirection, ne contacte que l'origine fournie et
  limite les volumes lus. Elle ne doit pas imprimer de contenu éditorial complet
  dans les logs en cas d'échec.
- L'accessibilité du composant fait partie de la cohérence visible : navigation
  nommée, ordre logique, cible courante non cliquable et focus visible sur les
  liens.

## Risques à contrôler

1. **Double source visible/structurée :** recopier manuellement titres ou
   descriptions dans le JSON-LD créerait une divergence; les mêmes constantes
   ou valeurs calculées doivent alimenter les deux rendus.
2. **Zone commerciale exagérée :** l'accueil cite des zones plus larges, mais
   les pages de service approuvent explicitement le Valais; `areaServed` doit
   rester limitée à cette zone.
3. **Hiérarchie artificielle :** une ancre d'accueil n'est pas un niveau
   canonique; les services sont reliés directement à `/`, tandis que les
   articles et cas passent par leurs hubs publics réels.
4. **Régression des schémas existants :** convertir `BlogPosting` ou
   `CreativeWork` en `@graph` ne doit supprimer aucune propriété ni casser les
   preuves existantes.
5. **Breadcrumb purement visuel :** un lien « Retour » ne suffit pas à garantir
   l'ordre, la page courante et l'équivalence structurée; un composant dédié et
   une preuve de parité sont nécessaires.
6. **Promesse commerciale inventée :** le ticket décrit l'offre mais n'autorise
   aucun prix, avis, disponibilité ni résultat nouveau.

## Conclusion

AQ-SEO-010 est un changement applicatif sans migration. Le dépôt possède déjà
les quatre pages françaises, leurs canonicals, les hubs de navigation et
l'identité fournisseur. La solution la plus sûre est un modèle partagé qui
alimente simultanément un fil SSR accessible et son `BreadcrumbList`, complété
par un objet `Service` minimal sur les quatre prestations. Une preuve anonyme
sur toutes les URLs découvertes doit ensuite bloquer la release à la moindre
divergence ou propriété commerciale non approuvée.
