# Recherche AQ-SEO-005 — Ne pas exposer de fausses traductions

## Cadre du ticket

`AQ-SEO-005` applique `SEO-R001`, `SEO-R002`, `SEO-R003`, `SEO-R007` et
`SEO-R012`. La décision validée `OD-SEO-001` maintient les services, le blog et
les cas clients en français uniquement tant qu'aucune traduction humaine n'est
approuvée (`docs/product/prd.md`, `docs/product/stories.md`). Le ticket doit donc
retirer les variantes anglaises et allemandes trompeuses, sans rédiger de
traduction et sans prendre en charge la complétude éditoriale d'`AQ-SEO-006` ou
le rendu serveur du blog d'`AQ-SEO-007`.

## Routage actuellement produit

- `nuxt.config.ts` configure `@nuxtjs/i18n` avec les locales `fr`, `en` et `de`,
  la stratégie `prefix_except_default`, et aucune restriction par page. La
  version installée est `@nuxtjs/i18n` 9.5.6.
- Le routeur Nitro généré dans `.output/server/chunks/virtual/entry.mjs` contient
  des routes EN et DE pour les quatre services, `/blog`, `/blog/:slug`,
  `/cas-clients-valais` et `/projets/:slug`. Ces huit familles sont pourtant
  françaises uniquement.
- Le module i18n installé sait limiter les locales d'une page soit depuis la
  configuration `pages`, soit depuis `defineI18nRoute`; son résolveur filtre
  explicitement les locales marquées `false`
  (`node_modules/@nuxtjs/i18n/dist/module.mjs`). Une politique de routes
  centralisée peut donc supprimer les variantes avant leur enregistrement dans
  Vue Router.

Un parcours représentatif illustre le défaut : une requête vers `/en/blog`
matche aujourd'hui la même page que `/blog`; `app/pages/blog/index.vue` rend un
title, un corps, un `og:url` et une canonical français avec `robots: index,
follow`, tandis que le document reçoit la langue de l'URL. Le même mécanisme
s'applique aux articles et aux services. Pour les études de cas,
`app/pages/projets/[slug].vue` va plus loin : il charge un enregistrement sans
champ de langue, mais calcule une canonical, un `og:url` et un JSON-LD sur la
route EN ou DE.

## Surfaces concernées

### Pages françaises uniquement

- Services statiques : `app/pages/developpeur-web-valais.vue`,
  `app/pages/creation-site-internet-valais.vue`,
  `app/pages/refonte-site-web-valais.vue` et
  `app/pages/application-mobile-valais.vue`. Elles ont toutes un contenu et des
  métadonnées français, une canonical française et `index, follow`.
- Blog : `app/pages/blog/index.vue` et `app/pages/blog/[slug].vue`. Le store
  `app/stores/articles.ts` ne porte aucun attribut de locale et la page détail
  recherche le même article pour toutes les routes générées.
- Cas clients : `app/pages/cas-clients-valais.vue` contient une page et une FAQ
  françaises; `app/pages/projets/[slug].vue` charge les champs éditoriaux sans
  distinction de langue depuis `app/stores/projects.ts`.

### Navigation linguistique

`app/components/ui/LangSwitcher.vue` liste toujours toutes les locales autres
que la locale active puis appelle `useSwitchLocalePath()`. Il ne vérifie ni
l'existence de la route cible ni l'absence d'alternative. Une fois les routes
restreintes, le sélecteur doit conserver uniquement les chemins réellement
résolus et disparaître lorsqu'aucune alternative n'existe. Les liens de
l'accueil et des pages légales validés dans `AQ-SEO-004` doivent rester
inchangés.

### Sitemap

`server/routes/sitemap.xml.ts` contient explicitement `/en/blog` et `/de/blog`.
Pour chaque projet dont `case_study_published = true`, il génère aussi trois
entrées avec les préfixes vide, `/en` et `/de`. Les services ne sont déjà listés
qu'en français. Le ticket doit seulement retirer les variantes fictives :
l'ajout de `/cas-clients-valais`, des articles publiés, la gestion fiable des
dates, le rattachement à l'organisation et le comportement en cas d'échec
Supabase restent la responsabilité d'`AQ-SEO-006`.

## Intégration proposée

Une petite politique partagée doit décrire les huit familles et l'état de chaque
variante (`approved` ou `unavailable`). Une variante approuvée non française
doit obligatoirement référencer l'approbation humaine, son contenu, ses
métadonnées et son ensemble d'alternates réciproques. Un validateur pur, exécuté
par les tests et pendant la préparation de la configuration, doit refuser une
locale activée sans ces quatre preuves; une fixture négative doit démontrer que
le simple passage d'EN ou DE à `approved` ne suffit pas.

Cette politique sert ensuite à la configuration i18n qui retire les routes
EN/DE et au middleware serveur qui transforme les anciennes URL `/en/...` et
`/de/...` en redirections permanentes internes vers le même chemin français.
Cette approche préserve les liens existants, empêche le chargement de données
avant le rendu et évite qu'une page française soit encore retournée avec un
`lang` étranger.

La redirection doit conserver le suffixe dynamique encodé et la query string.
Elle doit construire exclusivement une destination relative à partir d'un
chemin reconnu : aucune origine, aucun hôte et aucune valeur utilisateur ne
peuvent devenir une destination libre. Un slug inconnu peut être redirigé vers
sa route française puis recevoir un `404`, ce qui reste cohérent et non
indexable.

Le sélecteur consultera d'abord la politique approuvée pour la famille courante,
puis vérifiera la résolution de chaque cible autorisée avec le routeur avant de
rendre son `href`; il ne dépendra donc pas d'une valeur vide implicite de
`useSwitchLocalePath()`. Le composant ne rendra pas de menu vide. Le sitemap
conservera uniquement `/blog` et la variante française de chaque étude de cas.
Une future traduction devra d'abord être ajoutée au manifeste avec ses preuves
de contenu, métadonnées, canonical et alternates; enlever une restriction
isolément fera échouer le validateur.

## Validation et conventions de test

- Un nouveau test Vitest ciblé peut suivre les conventions de
  `tests/seo-localized-pages.test.ts` et `tests/seo-domain.test.ts` : lecture des
  points d'intégration, serveur HTTP local pour les cas positifs/négatifs et
  exécution du script Bash par `execFile`.
- La table de test doit couvrir les quatre services, le blog statique et
  dynamique, les cas clients statiques et dynamiques, en anglais et en
  allemand. Elle doit vérifier le statut permanent, la destination française
  exacte, le trailing slash, un slug encodé et la conservation de la query
  string. Elle doit aussi inclure une politique invalide qui active une variante
  sans approbation, contenu, métadonnées ou alternates, et vérifier que chacune
  de ces omissions est refusée.
- Une preuve HTTP bornée doit contrôler après déploiement les routes françaises
  statiques, les anciennes variantes localisées, deux canaris dynamiques sans
  dépendre des données éditoriales, l'absence de variantes dans le sitemap et
  l'absence de choix de langue fictif. Comme les autres scripts d'exploitation,
  elle doit valider l'origine, borner `curl`, ne transmettre aucun secret et
  échouer au premier `200 index,follow` trompeur.
- `.github/workflows/ci.yml` doit exécuter cette preuve après celle
  d'`AQ-SEO-004`; `scripts/ops/verify-localized-pages.sh` doit continuer à
  valider l'accueil et les neuf pages légales.
- La validation complète suit les commandes existantes via Portly : tests
  ciblés, suite Vitest, typecheck, build, budgets, syntaxe Bash et contrôle du
  diff. Un aperçu Nitro géré par Portly permet de confirmer les statuts et le
  HTML sans JavaScript.

## Sécurité, données et limites

- Aucune migration, dépendance, variable d'environnement, modification RLS,
  authentification, rôle, stockage ou donnée n'est requise.
- Le middleware est public et en lecture seule. Une destination interne stricte
  évite les open redirects; les paramètres et slugs ne doivent jamais être
  décodés puis réinterprétés comme une origine.
- L'API publique des articles récupère actuellement toutes les lignes avant le
  filtrage `published` dans le store. Ce risque de brouillon et de sérialisation
  relève d'`AQ-SEO-007` et ne doit pas être masqué par cette correction de
  routage.
- Le sitemap dynamique utilise le client administrateur sans rattachement à
  l'organisation et masque ses erreurs. Ces risques relèvent d'`AQ-SEO-006`.
- Les variantes i18n des routes privées constituent une surface distincte des
  contenus francophones du ticket; elles doivent faire l'objet d'un durcissement
  séparé afin de ne pas élargir silencieusement `AQ-SEO-005`.
- Le rollback est applicatif : revenir au commit et à l'image précédents remet
  les anciennes routes en place. Aucune restauration de données n'est requise.

## Questions résolues

- **Redirection ou simple 404 ?** Une redirection permanente `308` vers le même
  chemin français est retenue pour préserver les anciens liens et la méthode,
  avec destination interne et query string conservée.
- **Faut-il compléter le sitemap maintenant ?** Non. Le ticket retire seulement
  les variantes fictives; la complétude et les dates restent dans
  `AQ-SEO-006`.
- **Faut-il traduire les contenus ?** Non. `OD-SEO-001` interdit de publier une
  variante avant validation humaine de sa traduction.

Aucune ambiguïté matérielle restante n'empêche la planification.
