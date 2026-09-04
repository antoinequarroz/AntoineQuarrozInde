# AQ-SEO-008 — Recherche dépôt

## Objet vérifié

La story demande d'identifier Antoine et son activité de manière cohérente dans
les résultats enrichis et les aperçus sociaux : coordonnées complètes et profils
approuvés dans le JSON-LD de la page d'accueil, image sociale absolue et
accessible sur chaque page indexable, image éditoriale avec repli de marque pour
les articles et études de cas, et validation bloquante des divergences
(`docs/product/stories.md:154-172`). Elle couvre `SEO-R013`, `SEO-R014` et
`SEO-R017` (`docs/product/prd.md:103-108`). Sa dépendance `AQ-SEO-001` est déjà
présente sur `main`.

## État actuel et écarts

- `app/pages/index.vue:1-45` publie déjà un graphe JSON-LD `Person`,
  `ProfessionalService` et `WebSite`, mais l'adresse de la personne se limite à
  `Valais` et `CH`. Le téléphone, la rue, le code postal et les profils sociaux
  manquent; `ProfessionalService.sameAs` est un tableau vide.
- `app/components/layout/AppFooter.vue:7-10,147-164` expose déjà les informations
  approuvées et visibles : GitHub, LinkedIn, `info@antoinequarroz.ch`,
  `Rue de l’Evouette 5`, `1969 Saint-Martin VS`, la Suisse et
  `+41 79 157 64 50`. Les pages légales reprennent les mêmes coordonnées.
- `app/pages/index.vue:47-71`, les quatre pages service,
  `app/pages/blog/index.vue` et `app/pages/cas-clients-valais.vue` définissent
  titre, description et URL Open Graph, mais aucune image sociale ni texte
  alternatif.
- `nuxt.config.ts:159-176` définit les valeurs sociales communes
  (`og:type`, `og:site_name`, `twitter:card`) sans image par défaut. Les pages
  légales localisées ne disposent donc pas non plus d'un aperçu image complet.
- `app/pages/blog/[slug].vue:15-24` transmet `article.coverImage` seulement quand
  elle existe. `app/pages/projets/[slug].vue:43-70` fait de même avec l'image du
  projet. Aucune de ces pages ne produit de repli, d'alt Open Graph ni d'image
  Twitter.
- `public/about.jpg` existe, est déjà visible dans la section À propos et sert
  déjà d'image de la personne et de l'activité. Elle constitue donc le repli de
  marque existant, approuvé et publiable; aucune image artificielle ne doit être
  inventée dans ce ticket.
- Le sitemap public construit par `server/utils/sitemapDiscovery.ts:24-43`
  comprend 18 routes statiques, puis les articles et études de cas publiés. Ce
  périmètre donne la liste de référence des pages indexables à contrôler.

## Flux représentatif tracé

1. Nuxt résout l'origine canonique depuis `runtimeConfig.public.siteUrl`, dont la
   valeur de production attendue est `https://www.antoinequarroz.ch`.
2. `app/app.vue` applique les métadonnées communes; chaque page les complète ou
   les remplace avec `useSeoMeta`.
3. La page d'accueil construit son JSON-LD directement dans
   `app/pages/index.vue`, tandis que le footer maintient séparément les mêmes
   données humaines. Cette duplication permet aujourd'hui une divergence.
4. Les pages dynamiques obtiennent les images de `app/stores/articles.ts` et
   `app/stores/projects.ts`. Les médias ajoutés par le CRM passent par
   `app/components/ui/AppImageUpload.vue` et
   `server/api/admin/upload.post.ts:1-44`, puis deviennent des URL HTTPS
   publiques du bucket Supabase `media`.
5. Si une image éditoriale est absente ou invalide, le code actuel omet la
   balise sociale. Un résolveur partagé doit alors fournir l'URL canonique
   absolue de `/about.jpg`.
6. La chaîne de livraison exécute déjà des preuves HTTP anonymes depuis
   `.github/workflows/ci.yml:137-152`. Une preuve dédiée peut comparer le HTML
   public, le JSON-LD, les images et le contenu visible après déploiement.

## Conventions et points d'intégration

### Identité publique unique

- Créer dans `shared/utils/` une source typée de l'identité publique contenant
  uniquement les informations déjà visibles et approuvées : nom, e-mail,
  téléphone affiché et normalisé, adresse postale, profils GitHub/LinkedIn et
  image de repli.
- Faire consommer cette même source par `app/pages/index.vue` et
  `app/components/layout/AppFooter.vue`. Le JSON-LD et le contenu visible ne
  pourront ainsi plus évoluer indépendamment.
- Représenter l'adresse structurée comme `PostalAddress` avec rue, `1969`,
  `Saint-Martin`, `Valais`/`VS` et `CH`; conserver les libellés pays localisés du
  footer. Ajouter les deux profils existants à `sameAs` et n'en déduire aucun
  autre.
- Conserver des identifiants stables `#person`, `#business` et `#website` ancrés
  sur l'origine canonique, même quand la page d'accueil consultée est `/en` ou
  `/de`. Les propriétés `url` peuvent rester celles de la variante canonique
  courante.

### Images sociales

- Ajouter dans `app/app.vue` l'image sociale de repli absolue, son alt localisé
  et les équivalents Twitter afin que toutes les pages statiques indexables les
  héritent.
- Les traductions actives proviennent de `i18n/i18n.config.ts`, qui importe
  `i18n/locales/fr.json`, `en.json` et `de.json`. Les copies sous
  `app/locales/` ne sont pas la source de runtime et ne doivent pas devenir un
  second catalogue à maintenir pour cette story.
- Ajouter un résolveur partagé qui accepte une URL HTTPS publique ou un chemin
  local commençant par `/`, produit toujours une URL absolue et remplace une
  valeur vide, mal formée ou utilisant un schéma dangereux par `/about.jpg`.
- Sur les pages article et projet, employer l'image éditoriale valide si elle
  existe, sinon le repli. Définir `og:image`, `og:image:alt`, `twitter:image` et
  `twitter:image:alt`. L'alt doit décrire l'article/projet quand son image est
  employée et Antoine quand le repli est employé.
- Réutiliser le résolveur pour `CreativeWork.image` dans la page projet afin que
  les données structurées et l'aperçu social pointent vers la même ressource.
  L'ajout du schéma `BlogPosting` reste réservé à `AQ-SEO-009`.

### JSON-LD et sérialisation

- Conserver une liste blanche explicite de propriétés Schema.org; ne pas
  injecter directement un objet CRM ou une donnée non approuvée.
- Sérialiser le JSON-LD avec un utilitaire qui neutralise au minimum `<` dans le
  contenu placé dans une balise `script`. Le titre et la description d'un projet
  sont éditoriaux et ne doivent pas pouvoir fermer le script avec `</script>`.
- Valider le JSON syntaxiquement et vérifier les champs applicables de
  `Person`, `ProfessionalService`, `PostalAddress` et `CreativeWork`. Aucun
  service externe payant ou dépendance supplémentaire n'est nécessaire.

## Données, autorisation et sécurité

- Aucun schéma Supabase, RLS, grant, bucket ou backfill n'est requis. Les
  changements sont des lectures de contenu public et des métadonnées HTML.
- Les coordonnées proposées sont déjà publiées sur le site; le ticket les
  centralise mais n'ajoute aucune nouvelle donnée personnelle. Une nouvelle
  coordonnée, un nouveau profil ou une modification de `sameAs` doit rester
  bloquée jusqu'à approbation explicite d'Antoine.
- Le résolveur doit refuser `data:`, `javascript:`, les URL avec identifiants et
  les ressources HTTP en production. Il ne doit jamais transformer une entrée
  CRM en HTML brut.
- La preuve d'accessibilité des images doit éviter un fetch arbitraire : limiter
  les cibles aux URL HTTPS du domaine canonique et aux médias publics Supabase
  attendus, sans redirection, avec délais courts et taille de réponse bornée.
- Le script de preuve doit être anonyme et ne recevoir ni clé Supabase de
  service, ni session CRM, ni secret de déploiement.

## Tests et release

- Ajouter un test Vitest ciblé couvrant la source d'identité, le graphe JSON-LD,
  la concordance exacte avec le footer, la résolution absolue des images, les
  variantes FR/EN/DE et les valeurs hostiles.
- Tester tous les chemins statiques retournés par la politique sitemap, ainsi
  que des fixtures d'article et de projet avec image, sans image et avec URL
  invalide.
- Ajouter une preuve HTTP `scripts/ops/verify-identity-social.sh` conforme aux
  scripts existants : parser le HTML, exiger image et alt absolus, vérifier le
  JSON-LD, contrôler les codes et types MIME des images, puis échouer de manière
  fermée sur une divergence.
- Brancher cette preuve dans le job de production après les contrôles sitemap et
  SSR. Les variantes négatives du script doivent prouver qu'une image absente,
  inaccessible ou non sûre et qu'une identité divergente font échouer la porte.
- La validation finale comprend Vitest, typecheck, build Nuxt, budgets, syntaxe
  Bash, preuve Nitro locale, navigateur public et `git diff --check`, tous via
  des jobs temporaires Portly conformément à `AGENTS.md`.

## Compatibilité et hors périmètre

- La stratégie de routes reste `prefix_except_default`; aucun `/en/blog`,
  `/de/blog` ou nouveau chemin public n'est créé.
- La rédaction/traduction des articles et projets, le schéma `BlogPosting`, les
  schémas `Service`/`BreadcrumbList`, Google Business Profile et le suivi Search
  Console appartiennent aux stories suivantes.
- Créer une image dédiée au format 1200×630 pourrait améliorer les aperçus,
  mais remplacer l'image déjà approuvée constitue une décision de marque hors de
  cette story. Le code doit permettre cette évolution ultérieure sans toucher
  aux pages.

## Risques à contrôler

1. **Divergence visible/structurée :** conserver deux copies des coordonnées
   reproduirait le défaut; footer et JSON-LD doivent partager la même source.
2. **URL relative ou dangereuse :** une valeur CRM non validée peut produire un
   aperçu cassé ou une cible indésirable; le résolveur doit revenir au repli.
3. **Régression d'une page oubliée :** une image uniquement ajoutée aux pages
   principales ne couvre pas les pages légales; le défaut global et
   l'énumération sitemap ferment cette lacune.
4. **Faux succès d'accessibilité :** vérifier seulement la présence de la balise
   ne prouve pas que l'image répond; la preuve doit contrôler réponse et type
   MIME avec une liste d'hôtes sûre.
5. **Injection JSON-LD :** les chaînes éditoriales dynamiques doivent être
   sérialisées pour un contexte `<script>`, pas seulement encodées en JSON.
6. **Profil non approuvé :** ne jamais inventer Instagram, X, Google Business ou
   des coordonnées géographiques à partir du nom et de l'adresse.

## Conclusion

AQ-SEO-008 est un changement applicatif sans migration. Il doit centraliser les
coordonnées déjà publiques, compléter le graphe de la page d'accueil, fournir un
repli social absolu à toutes les pages indexables, privilégier les images
éditoriales valides et ajouter une preuve de production fail-closed. Le périmètre
reste compatible avec les routes et données actuelles et ne nécessite aucune
nouvelle approbation de donnée tant que les valeurs existantes sont reprises à
l'identique.
