# Recherche AQ-SEO-004 — Consulter une page réellement localisée

## Ticket et décision produit

`AQ-SEO-004` applique `SEO-R001`, `SEO-R002`, `SEO-R003`, `SEO-R011`,
`SEO-R012` et `GEO-R007`. La décision `OD-SEO-001` maintient l'accueil et les
pages légales en français, anglais et allemand, sans créer de quatrième langue
ni de traduction automatique non relue (`docs/product/stories.md`,
`docs/product/prd.md`). Les métadonnées et toute nouvelle microcopie proposées
dans le plan restent donc soumises à la validation humaine d'Antoine.

## Documentation officielle vérifiée

La documentation officielle Nuxt I18n consultée le 3 septembre 2026 recommande
`useSwitchLocalePath()` avec des `NuxtLink` pour relier la route courante à sa
version dans une autre locale. Cette combinaison produit de vraies destinations
de navigation et correspond à l'exigence de liens utilisables sans JavaScript.

Source primaire :
<https://i18n.nuxtjs.org/docs/composables/use-switch-locale-path>.

## Architecture et état vérifiés

- `nuxt.config.ts` configure `@nuxtjs/i18n` avec `fr`, `en` et `de`, la stratégie
  `prefix_except_default` et les ISO `fr-CH`, `en-US` et `de-CH`.
- `i18n/i18n.config.ts` charge les trois catalogues humains existants depuis
  `i18n/locales/{fr,en,de}.json`. `app/app.vue` émet déjà le bon attribut
  `<html lang>` pour chacune des trois variantes.
- `app/pages/index.vue` rend l'accueil dans les trois langues, mais son title,
  sa description, ses métadonnées sociales, ses mots-clés, son `og:url` et sa
  canonical sont tous codés en français et pointent vers `/`. Les alternates
  absolus sont complets, mais `/en` et `/de` se déclarent à tort comme des copies
  canoniques de `/`.
- Le contrôle HTTPS de production confirme : `/en` et `/de` répondent avec le
  bon `lang`, mais avec le title et la description français, un `og:url` sur `/`
  et une canonical sur `/`. `/` est correct.
- `app/components/ui/LangSwitcher.vue` utilise des boutons et `setLocale()`.
  Les destinations alternatives n'ont aucun `href`, ne sont même pas présentes
  dans le HTML SSR lorsque le menu est fermé et dépendent donc de JavaScript.
- `app/pages/mentions-legales.vue`, `app/pages/confidentialite.vue` et
  `app/pages/conditions-utilisation.vue` contiennent déjà des copies humaines
  FR/EN/DE, une canonical localisée et quatre alternates réciproques. Les neuf
  URL légales contrôlées en production respectent actuellement ces invariants.
- L'accueil contient encore des chaînes d'interface françaises hors catalogue :
  `Photo à venir` dans `AboutSection.vue`, `Réponse rapide sur` dans
  `ContactSection.vue`, `Zones` et deux libellés/liens de services français dans
  `ServicesSection.vue`, ainsi que certains libellés accessibles. Ces chaînes
  apparaissent effectivement dans le HTML SSR de `/en` et `/de`.
- `BlogSection.vue` injecte des articles provenant de la base sans champ de
  locale. En vertu d'`OD-SEO-001`, ces contenus restent français jusqu'à une
  traduction humaine et ne doivent pas être présentés comme du contenu anglais
  ou allemand sur l'accueil localisé. `AQ-SEO-005` traitera ensuite leurs routes
  et leur visibilité globale.
- `PortfolioSection.vue` injecte de la même manière des descriptions de projets
  françaises sans champ de locale. La section et ses liens de navigation ne
  peuvent donc pas être exposés sur les accueils EN/DE avant traduction humaine.
- Le sitemap contient déjà `/`, `/en`, `/de` et les variantes légales. Aucun
  changement de données, Supabase, Docker ou proxy n'est nécessaire.

## Intégration recommandée

1. Ajouter au catalogue i18n des métadonnées d'accueil et les microcopies
   manquantes, puis dériver title, description, métadonnées sociales, `og:url`
   et canonical de la locale courante. Réutiliser un seul title et une seule
   description approuvés par langue afin d'éviter les divergences.
2. Remplacer les options du sélecteur par des `NuxtLink` calculés avec
   `useSwitchLocalePath()`. Rendre les liens des trois locales dans le HTML SSR,
   y compris quand la présentation visuelle du menu est fermée, et conserver un
   libellé accessible localisé.
3. Localiser les microcopies d'accueil restantes. Ne pas rendre la sélection
   d'articles ni le portfolio français sur les accueils EN/DE; ne pas inventer
   de traduction et conserver les liens de services éditoriaux français
   uniquement sur `/`.
4. Ajouter une preuve HTTP qui contrôle les trois accueils et les neuf pages
   légales : statut, `lang`, title, description, `og:url`, self-canonical,
   alternates complets/réciproques et liens de langue. Une incohérence doit faire
   échouer la CI après les preuves de production déjà présentes.

## Risques, sécurité et rollback

- Des balises correctes dans le DOM hydraté ne suffisent pas : les crawlers et
  la preuve doivent pouvoir les observer dans le HTML serveur initial.
- Les alternates doivent être comparés comme des ensembles attachés à chaque
  URL; une simple recherche de chaînes ne prouve ni la réciprocité ni la
  self-canonical.
- Les articles et pages de services non traduits ne doivent pas recevoir une
  fausse URL localisée. Ils restent français conformément à `OD-SEO-001`.
- Les avis tiers et noms propres peuvent rester dans leur langue d'origine;
  l'interface qui les entoure doit, elle, suivre la locale courante.
- Aucun secret, rôle, accès, stockage, migration, RLS ou dépendance npm n'est
  requis. Le rollback restaure les composants, catalogues et étape de preuve,
  puis l'image applicative `previous` si nécessaire.

## Questions restantes

Les textes SEO et microcopies exacts figurent dans le plan. Leur validation
explicite par Antoine lève la seule décision humaine restante avant
implémentation.
