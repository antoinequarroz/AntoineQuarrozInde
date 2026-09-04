# AQ-SEO-007 — Recherche dépôt

## Objet vérifié

La story validée demande que `/blog` fournisse dans son HTML initial les titres, extraits, dates et liens de tous les articles publiés, sans brouillon, avec une hydratation stable, des liens utilisables sans JavaScript et des états d'erreur et vide explicites (`docs/product/stories.md:133-150`). Elle couvre `SEO-R009` et contribue à `SEO-R010` (`docs/product/prd.md:93-99`). `AQ-SEO-006`, sa dépendance directe, est présente sur `main` et fournit déjà une API publique filtrée et un sitemap dynamique.

## État actuel et cause

- `app/pages/blog/index.vue:20-23` construit la liste depuis `store.published`, mais appelle `store.ensureLoaded()` uniquement dans `onMounted`. Ce hook n'est exécuté que dans le navigateur : le rendu serveur part donc d'un store vide.
- `app/pages/blog/index.vue:38-108` affiche successivement un squelette, la grille, puis l'état vide. Comme `loading` vaut initialement `false`, le HTML serveur actuel affiche à tort « Premiers articles bientôt disponibles... » avant que le navigateur charge les six articles.
- Une preuve HTTP anonyme réalisée le 4 septembre 2026 sur la production a confirmé six lignes dans `/api/articles`, mais aucun titre ni lien correspondant dans le HTML initial de `/blog` ; l'état vide y était présent.
- `app/pages/blog/[slug].vue:1-12` et `app/pages/cas-clients-valais.vue:1-11` montrent déjà la convention locale adaptée : attendre `ensureLoaded()` dans le setup de page avant de calculer le contenu public.
- `app/pages/index.vue:72-87` utilise `useAsyncData` pour attendre plusieurs stores pendant le SSR. Ce mécanisme Nuxt évite de refaire le même chargement lors de l'hydratation et fournit un point de gestion d'erreur explicite.

## Flux représentatif tracé

1. La requête anonyme arrive sur `/blog` et exécute le setup de `app/pages/blog/index.vue` côté serveur.
2. Le store `app/stores/articles.ts:42-78` charge `/api/articles`, transforme les noms de colonnes puis hydrate `articles`, `loading` et `loaded`.
3. `server/api/articles.get.ts:7-18` résout l'organisation publique, borne la requête à son `organization_id`, sélectionne la liste blanche publique et ajoute `published = true`.
4. `server/utils/organizationAccess.ts:97-116` choisit l'organisation publique uniquement depuis `DEFAULT_ORGANIZATION_SLUG`; une configuration absente ne déclenche aucune requête globale.
5. `server/utils/publicContent.ts:3-18` définit les seules colonnes d'article exposées et `server/utils/publicContent.ts:48-63` sérialise explicitement le DTO public.
6. `app/pages/blog/index.vue:54-103` rend chaque article et son `NuxtLink` `/blog/<slug>` ; un lien généré ainsi devient un `<a href>` dans le HTML serveur et reste utilisable sans JavaScript.
7. Pinia/Nuxt sérialise les états retournés par le store dans le payload, puis le navigateur hydrate la même grille. Une seconde requête déclenchée pendant l'hydratation doit être évitée pour ne pas remplacer temporairement la grille par le squelette.

## Conventions et points d'intégration

### Page et état de chargement

- Remplacer le chargement `onMounted` de `app/pages/blog/index.vue:23` par une source publique dédiée, attendue dans le setup et encapsulée dans la primitive Nuxt de données déjà employée dans `app/pages/index.vue:79-87`.
- Ne pas employer le store éditorial partagé comme source SSR de `/blog`. `app/stores/articles.ts:51-66` peut transmettre un Bearer et un identifiant d'organisation, puis `server/api/articles.get.ts:12-25` retourne la vue interne complète aux rôles autorisés. Une page publique doit produire le même HTML quelle que soit l'identité attachée à la requête.
- Retourner directement un tableau de résumés publics depuis `useAsyncData`. Sa donnée sérialisée sert à la fois au HTML serveur et à l'hydratation, sans initialiser le store d'authentification ni relancer la requête au premier rendu client.
- Ajouter un état d'erreur local générique, rendu avec `role="alert"`, sans stocker ni sérialiser l'objet d'erreur de Supabase. Un bouton de nouvelle tentative peut rappeler le même chargement avec `force = true`, conformément aux interfaces existantes (`app/pages/portal/index.vue:58-64,195-198`).
- Distinguer strictement les branches erreur, chargement, résultats et vide afin qu'un échec ne soit jamais présenté comme une liste vide.
- Le squelette peut rester utile lors d'une navigation ou d'une nouvelle tentative, mais il ne doit pas être le contenu final du HTML serveur.

### Données, sécurité et autorisation

- Aucun changement de schéma ni de politique de publication n'est requis : `AQ-SEO-006` a déjà établi les colonnes éditoriales et le statut `published`.
- Ajouter un endpoint de listing explicitement public, toujours lié à l'organisation canonique de `DEFAULT_ORGANIZATION_SLUG`, qui ignore les en-têtes `Authorization` et `x-organization-id`, applique `published = true` et ne retourne qu'un DTO de résumé.
- Le DTO de listing doit exclure `content` et tout champ éditorial/interne non rendu. Le DTO public actuel inclut le corps complet de chaque article (`server/utils/publicContent.ts:3-18,48-63`), ce qui alourdirait inutilement `__NUXT_DATA__` et augmente la surface de données sérialisées.
- Les tests doivent chercher des marqueurs de brouillon, de tenant secondaire, de token, d'e-mail et de champs internes dans le HTML et dans le payload sérialisé, pas seulement dans la grille visible. Le résultat doit rester identique en présence d'en-têtes d'authentification injectés.
- Les messages d'erreur publics doivent être constants. `server/api/articles.get.ts:21-23` relaie actuellement le message brut de la base ; le nouvel endpoint doit journaliser ce détail côté serveur et retourner un `503` générique qui peut être affiché sans fuite par `/blog`.
- Le rendu Markdown par `v-html` de `app/pages/blog/[slug].vue:43-55,92-94` reste un risque XSS préexistant, hors du listing AQ-SEO-007, puisque la liste n'interprète aucun HTML. Il doit rester une story sécurité séparée.

### Tests et release

- Ajouter un test ciblé de structure/page qui prouve que le chargement SSR est attendu avant le template et que `onMounted` n'est plus la source de vérité.
- Ajouter une preuve HTTP sur une application Nuxt construite avec des articles publiés et un brouillon contrôlés : le HTML initial doit contenir titre, extrait, date et `href` des publiés, et ne contenir aucune donnée du brouillon, d'un autre tenant ni d'un champ interne.
- Vérifier la stabilité d'hydratation en interceptant/mesurant `/api/articles` : le premier rendu navigateur doit garder la liste serveur sans avertissement de divergence ni bascule vers le squelette.
- Vérifier le mode JavaScript désactivé avec Playwright ou une requête HTML brute : les liens doivent être présents et conduire à une page d'article accessible.
- Couvrir explicitement l'état vide côté serveur et une réponse API en échec avec un message d'erreur visible distinct.
- Ajouter un contrôle anonyme de `/blog` à la chaîne de release après le déploiement, sur le modèle de `scripts/ops/verify-sitemap-discovery.sh` et de l'étape correspondante dans `.github/workflows/ci.yml:136-153`.

## Dépendances et compatibilité

- Dépendance satisfaite : `AQ-SEO-006` garantit le filtre public, les dates éditoriales et la découverte sitemap.
- Aucun changement Supabase n'est nécessaire.
- Les pages article utilisent le même store ; toute évolution du cache/contexte de `ensureLoaded` doit préserver le rechargement lors du passage public → admin et du changement d'organisation, déjà couvert par `tests/public-content-store-context.test.ts:47-137`.
- Les routes blog sont volontairement françaises uniquement selon la politique introduite dans `shared/utils/localizedRoutePolicy.ts` et testée par `tests/seo-french-only-routes.test.ts`; AQ-SEO-007 ne crée pas `/en/blog` ni `/de/blog`.
- La présentation graphique, les textes des articles et le rendu Markdown sont hors périmètre.

## Risques à contrôler

1. **Hydratation divergente :** une requête client immédiate peut remplacer la grille serveur par le squelette. La donnée de `useAsyncData` doit être réutilisée depuis le payload sans second chargement.
2. **Fuite de brouillon ou de tenant :** le store actuel peut charger la vue interne d'une session admin. Le listing SSR doit utiliser un endpoint public invariant à l'identité et la preuve doit contrôler tout le HTML et le payload.
3. **Fausse liste vide :** un `catch` qui avale l'erreur reproduirait le défaut actuel. L'état d'erreur doit avoir priorité sur l'état vide.
4. **Erreur interne divulguée :** ne pas rendre `error.message` provenant de l'API ou de Supabase.
5. **Sérialisation excessive :** ne pas placer le corps complet de tous les articles dans le payload du listing.
6. **Chaînes hostiles :** titres, extraits et slugs contenant du HTML ou `</script>` doivent rester échappés dans le HTML et le payload Nuxt.

## Questions résolues et non bloquantes

- Le listing reste français uniquement : décision déjà portée par la politique de routes, hors création de traductions.
- Une panne de l'API peut produire un état d'erreur SSR avec code 200 ou une page Nuxt 500 ; la story accepte « retourne ou affiche ». La convention UX du dépôt favorise un état visible avec nouvelle tentative, plus utile au lecteur et testable sans divulgation.
- Aucun choix de contenu, donnée personnelle ou secret supplémentaire n'est requis pour planifier la story.

## Conclusion

Le changement reste sans migration mais doit couvrir `app/pages/blog/index.vue`, un endpoint de listing public minimal, les utilitaires publics associés, des tests ciblés et une preuve de release. Une simple conversion de `onMounted` en `await store.ensureLoaded()` n'est pas suffisante : le SSR doit être indépendant de l'identité, minimiser son payload, filtrer les brouillons côté serveur et empêcher une seconde requête pendant l'hydratation.
