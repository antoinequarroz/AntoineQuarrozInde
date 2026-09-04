# AQ-SEO-009 — Recherche dépôt

## Objet vérifié

La story demande qu'un lecteur puisse attribuer chaque article publié à Antoine
et distinguer sa date de publication d'une éventuelle modification réelle. Le
contenu visible et le JSON-LD `BlogPosting` doivent reprendre les mêmes titre,
description, auteur, dates, image, langue et URL canonique, tandis qu'un article
sans auteur approuvé ou date fiable ne doit pas pouvoir devenir public
(`docs/product/stories.md:174-192`). Elle couvre `SEO-R015`, `SEO-R017` et
`GEO-R005` (`docs/product/prd.md:101-118`). Ses dépendances `AQ-SEO-007` et
`AQ-SEO-008` sont déjà livrées.

## État actuel et écarts

- `app/pages/blog/[slug].vue:12-46` charge bien l'article publié, construit son
  canonical et réutilise l'image sociale sûre livrée par `AQ-SEO-008`, mais ne
  produit aucun JSON-LD `BlogPosting`.
- `app/pages/blog/[slug].vue:80-87` affiche `article.createdAt` sans libellé ni
  élément `<time>`. Il s'agit de la création technique, pas nécessairement de
  la publication. Aucun auteur ni date de mise à jour n'est visible.
- `app/stores/articles.ts:1-39` ne représente que `createdAt`; il abandonne
  `published_at` et `updated_at` pourtant déjà renvoyés par l'API publique.
- `server/utils/publicContent.ts:3-16,69-84` expose les dates éditoriales dans la
  vue détaillée anonyme. La liste publique conserve volontairement une réponse
  plus courte, ce qui suffit car la story porte sur la page d'article.
- `supabase/schema.sql:53-65` ne contient aucune colonne auteur pour les
  articles. Le nom d'Antoine ne peut donc pas être retracé depuis
  l'enregistrement éditorial et ne doit pas être simplement injecté dans le
  HTML.
- La migration `20260903232000_add_editorial_timestamps_article_audit.sql:9-19`
  a déjà établi une source fiable : les anciens contenus publics reçoivent leur
  seule date historique vérifiable, `created_at`, et les contenus futurs
  conservent `published_at` tout en avançant `updated_at` lors d'une vraie
  sauvegarde (`:39-64`). Les deux valeurs sont égales lors d'une première
  publication; aucune mise à jour ne doit alors être affichée.
- Le formulaire CRM (`app/pages/admin/articles/index.vue:16-55,162-193`) ne
  connaît pas l'auteur. La sauvegarde serveur (`server/utils/articlePayload.ts`)
  ne transmet pas non plus cette information à la RPC auditée.
- Les créations et modifications passent déjà par
  `save_article_with_publication_audit` et un contexte d'organisation
  (`server/api/articles.post.ts:1-21`, `server/api/articles.put.ts:1-24`). Le
  rôle minimum côté serveur est `manager`; la RPC réserve tout changement de
  visibilité à `owner` et `admin` (`supabase/migrations/20260903232000_add_editorial_timestamps_article_audit.sql:202-205,258-260`).

## Flux représentatif tracé

1. Un membre autorisé ouvre le formulaire d'article, qui hydrate les données via
   `useArticlesStore` et `/api/articles` avec sa session.
2. Le formulaire envoie les champs en camelCase; `articlePayload` les filtre et
   les convertit pour la base.
3. La route serveur transmet le payload, l'organisation, l'utilisateur et le
   rôle à la RPC `security invoker`. Celle-ci verrouille l'article, contrôle le
   tenant et le droit de publication, sauvegarde puis audite la transition de
   visibilité atomiquement.
4. En accès anonyme, `/api/articles` sélectionne une liste blanche de colonnes et
   ne retourne que les articles publiés du tenant public.
5. La page `/blog/[slug]` mappe la réponse dans le store puis rend le titre, le
   résumé, l'image et le contenu. Elle doit utiliser `published_at` comme date
   publique, ne considérer `updated_at` comme modification que si elle lui est
   strictement postérieure, puis construire le JSON-LD depuis ces mêmes valeurs.
6. Après déploiement, la CI contrôle déjà le SSR du blog et l'identité sociale
   (`.github/workflows/ci.yml:149-154`). Une preuve dédiée peut découvrir tous
   les articles publiés et comparer le HTML visible à leur `BlogPosting`.

## Modèle auteur recommandé

- Ajouter une clé éditoriale stable `author_key` sur `public.articles`, plutôt
  qu'un nom libre dupliqué. Pour le MVP mono-auteur, la seule valeur approuvée
  est `antoine-quarroz`.
- Rétro-remplir les articles existants avec cette clé, puis imposer une valeur
  non nulle et approuvée. Le nom public et l'URL ne sont pas copiés en base : ils
  sont résolus depuis `PUBLIC_SEO_IDENTITY`, qui contient déjà le nom approuvé
  (`shared/utils/publicSeoIdentity.ts:1-20`).
- Le CRM doit présenter un champ auteur obligatoire et explicite, limité à
  « Antoine Quarroz ». Cela rend la donnée visible dans l'enregistrement sans
  ouvrir une gestion multi-auteurs hors périmètre.
- La nouvelle migration doit redéfinir la RPC existante sans changer sa
  signature. Sur un ancien payload sans `author_key`, une création reçoit la
  clé canonique et une mise à jour conserve la valeur existante. Cette
  compatibilité est nécessaire car les migrations sont promues avant la
  nouvelle image et l'image précédente doit rester récupérable
  (`docs/operations.md:87-101`).
- Les données d'audit de publication doivent inclure la clé auteur de l'état
  avant/après. L'auteur reste ainsi rattaché à la décision de mise en ligne,
  sans journaliser le contenu complet.

## Dates visibles et structurées

- Conserver les timestamps ISO complets dans le store; ne pas les tronquer avant
  d'alimenter les attributs `datetime` et le JSON-LD.
- Afficher en français « Par Antoine Quarroz », « Publié le … » et, seulement si
  `updated_at > published_at`, « Mis à jour le … ». Les dates peuvent être
  formatées en `fr-CH` dans le fuseau `Europe/Zurich`, mais leurs attributs
  `datetime` et valeurs Schema.org restent les timestamps sources ISO.
- Un timestamp absent ou invalide sur un article public est un état incohérent,
  pas une invitation à retomber silencieusement sur la date courante. La base
  doit empêcher la publication et le rendu doit échouer de manière explicite.
- Pour les contenus historiques rétro-remplis, `published_at` et `updated_at`
  sont identiques. Le rendu omet donc correctement toute fausse date de
  modification.

## JSON-LD et cohérence d'entité

- Construire un objet `BlogPosting` à partir des données déjà visibles :
  `headline`, `description`, `image`, `inLanguage: fr-CH`, `url`,
  `mainEntityOfPage`, `datePublished`, auteur et `dateModified` conditionnel.
- L'auteur doit référencer l'entité de l'accueil avec
  `@id: https://www.antoinequarroz.ch/#person`, `name: Antoine Quarroz` et
  l'URL de l'accueil. Le lien visible du nom peut conduire à `/#about`.
- Réutiliser `resolvePublicSocialImage` pour que `BlogPosting.image` corresponde
  à l'image Open Graph et `serializeJsonLd` pour neutraliser les chaînes
  éditoriales dans le `<script>` (`shared/utils/publicSeoIdentity.ts:50-88`).
- La politique actuelle garde le blog en français uniquement; cette story
  n'ajoute ni `/en/blog` ni `/de/blog`. La langue structurée correcte est donc
  `fr-CH`.

## Données, autorisation et sécurité

- La migration doit être append-only : ajout et rétro-remplissage d'une colonne,
  contrainte d'intégrité et remplacement compatible de la RPC. Aucune colonne,
  table, ligne ou donnée de contenu ne doit être supprimée.
- RLS reste activée et aucun nouveau grant Data API n'est requis. Les routes
  serveur continuent d'utiliser le service role uniquement côté serveur; aucune
  clé secrète ne doit atteindre le navigateur.
- La RPC demeure `security invoker`, avec `search_path` vide, verrouillage par
  organisation et droits de publication inchangés. Il ne faut pas utiliser
  `SECURITY DEFINER` pour contourner un contrôle.
- Une contrainte de base doit garantir qu'un article ne puisse pas porter une
  clé auteur vide ou non approuvée. Le serveur doit aussi rejeter tôt un
  `authorKey` ambigu afin de fournir une erreur exploitable au CRM.
- Les valeurs JSON-LD doivent venir d'une liste blanche, jamais d'un objet CRM
  sérialisé tel quel. Le script de preuve reste anonyme, sans session CRM ni clé
  Supabase.

## Tests et preuve de release

- Étendre les tests de payload et de store pour la clé auteur et les timestamps,
  y compris valeurs absentes, invalides, égales et strictement postérieures.
- Mettre à jour le contrat public détaillé dans
  `tests/public-content-api.test.ts`; ne pas ajouter l'auteur au résumé du
  listing si la page liste ne l'utilise pas.
- Ajouter une migration pgTAP dédiée sous `supabase/tests/database/` pour le
  backfill, la contrainte auteur, la compatibilité de l'ancien payload, les
  rôles, le tenant, les timestamps et l'audit. Ne pas modifier la migration
  historique AQ-SEO-006.
- Ajouter un test SSR/SEO ciblé de page article pour les métadonnées visibles,
  les `<time>`, le lien auteur, le JSON-LD et la neutralisation d'un titre ou
  résumé hostile.
- Ajouter `scripts/ops/verify-blog-posting.sh`, qui découvre les articles depuis
  une source publique, parse chaque page et compare titre, description, image,
  langue, canonical, auteur et dates. Il doit refuser un auteur/date absents,
  une date inventée, un JSON-LD invalide ou une divergence visible/structurée.
- Brancher cette preuve après la vérification d'identité sociale. La validation
  complète doit inclure pgTAP, Vitest, typecheck, build, syntaxe Bash, aperçu
  Nitro, navigateur public et `git diff --check`, via Portly.

## Risques à contrôler

1. **Auteur uniquement codé dans la page :** cela satisferait l'apparence mais
   pas la traçabilité éditoriale; la clé doit exister en base et dans le CRM.
2. **Fausse fraîcheur :** afficher systématiquement `updated_at` ferait passer
   la création ou la première publication pour une mise à jour; l'affichage est
   conditionné à une valeur valide strictement postérieure.
3. **Migration avant image :** rendre immédiatement le nouveau champ obligatoire
   dans la RPC casserait l'ancienne application; le défaut et la conservation
   de l'auteur existant assurent la compatibilité.
4. **Divergence visible/structurée :** formater ou sélectionner les dates dans
   deux chemins différents créerait des contradictions; un même modèle dérivé
   doit alimenter la vue et le JSON-LD.
5. **Fuite de champs internes :** l'ajout ne doit pas remplacer la projection
   publique par `*`; seule `author_key` rejoint le détail public.
6. **Élargissement des droits :** le ticket ne change ni le tenant ni les rôles
   capables de sauvegarder/publier.

## Conclusion

AQ-SEO-009 nécessite une petite migration de données, car l'auteur n'est pas
actuellement traçable. La solution la plus sûre conserve le modèle mono-auteur :
une clé canonique obligatoire en base et visible dans le CRM, résolue vers
l'identité publique déjà approuvée. Les timestamps éditoriaux existants sont
suffisants; il faut les transporter sans perte, afficher la modification
uniquement lorsqu'elle est réelle, produire un `BlogPosting` cohérent et ajouter
une porte de production couvrant tous les articles publiés.
