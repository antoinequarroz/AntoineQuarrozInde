# Recherche AQ-SEO-006 — Découvrir automatiquement tout contenu publié

## Cadre du ticket

`AQ-SEO-006` applique `SEO-R007`, `SEO-R008` et `SEO-R010`. Le sitemap doit
contenir chaque page publique française, chaque article publié et chaque étude
de cas publiée, sans brouillon, route privée, autre tenant ni fausse traduction.
Chaque contenu dynamique doit avoir une date stable et un lien entrant public.
Une panne de la source dynamique doit être visible et ne doit jamais produire
silencieusement un sitemap `200` amputé (`docs/product/prd.md:93-98,169-172`,
`docs/product/stories.md:113-132`).

## Parcours représentatif actuel

Une requête vers `/sitemap.xml` entre dans `server/routes/sitemap.xml.ts:17-83`.
Le handler crée d'abord une liste statique, puis utilise le client Supabase de
service pour lire seulement les projets dont `case_study_published = true`.
Il encode leur slug et échappe ensuite l'URL XML. En cas d'erreur, il écrit un
message serveur mais retourne tout de même le bloc statique avec HTTP 200.

La route d'une étude charge `/api/projects`, puis refuse l'affichage si
`caseStudyPublished` est faux (`app/pages/projets/[slug].vue:10-18`). La route
d'un article charge `/api/articles`, filtre ensuite le tableau dans Pinia et
retourne une 404 lorsque le slug n'est pas publié
(`app/pages/blog/[slug].vue:7-13`, `app/stores/articles.ts:93-94`).

## Écarts vérifiés

### Complétude et isolation du sitemap

- La liste statique omet `/cas-clients-valais` et aucune requête ne charge les
  articles (`server/routes/sitemap.xml.ts:23-67`). Le test hérité exige même
  encore l'absence de cette page (`tests/seo-french-only-routes.test.ts:242-275`).
- La requête projets n'applique aucun `organization_id`. Comme
  `getSupabaseAdmin()` contourne la RLS applicative et que les accès directs
  anon/authenticated sont révoqués, le sitemap peut agréger des études de tous
  les tenants (`server/routes/sitemap.xml.ts:50-56`,
  `supabase/migrations/20260805173635_harden_server_only_data_api_grants.sql:1-39`).
- Le reste du public résout pourtant l'organisation canonique depuis
  `DEFAULT_ORGANIZATION_SLUG` puis filtre par son identifiant
  (`server/utils/organizationAccess.ts:97-116`, `server/api/projects.get.ts:1-10`).
- Le `catch` de `server/routes/sitemap.xml.ts:69-71` masque toute panne et
  retourne un sitemap partiel. Cela contredit directement l'état d'erreur de la
  story.

### Dates de publication et de modification

- `articles` ne possède que `created_at`; `projects` possède `created_at` et
  `completed_at`, mais aucune date de publication ou de modification
  (`supabase/schema.sql:19-63`).
- Le fallback `now` de `server/routes/sitemap.xml.ts:20,59-64` change à chaque
  requête et ne décrit aucun événement éditorial réel.
- Les écritures d'articles ne maintiennent aucune date et ne journalisent aucun
  changement de publication (`server/api/articles.post.ts:6-28`,
  `server/api/articles.put.ts:7-31`). La publication des projets est, elle,
  verrouillée et auditée atomiquement par
  `save_project_with_publication_audit`
  (`supabase/migrations/20260903203219_activate_project_portfolio_visibility.sql:4-144`).

Une migration append-only est donc nécessaire pour représenter des timestamps
stables. Pour les lignes historiques, `created_at` est le seul fait disponible
et constitue le fallback documenté; les nouvelles transitions doivent ensuite
maintenir `published_at` et `updated_at` à la source, sans date inventée au
moment de générer le sitemap.

### Exposition publique des sources

- `GET /api/articles` fait `select('*')` et ne filtre pas `published` pour un
  appel anonyme; le contenu complet des brouillons est sérialisé avant le filtre
  client (`server/api/articles.get.ts:1-15`, `app/stores/articles.ts:48-55,93-94`).
- `GET /api/projects` fait aussi `select('*')`. Son masque anonyme conserve par
  propagation des champs d'exploitation qui ne font pas partie du contenu
  public, notamment les identifiants client et données financières
  (`server/api/projects.get.ts:4-35`, `app/stores/projects.ts:3-38`).
- Un rôle `client` authentifié reçoit actuellement le chemin membre complet car
  tout `org.role` est considéré comme suffisant (`server/api/projects.get.ts:8-18`,
  `server/utils/organizationAccess.ts:60-94`).

Le correctif doit utiliser des projections explicites : contenu publié minimal
pour anonyme/client, données complètes seulement pour les rôles internes déjà
autorisés. Aucun objet public ne doit être construit avec `{ ...row }`.

### Maillage interne et états vides

- L'accueil ne relie que les trois articles les plus récents, mais `/blog`
  contient un lien vers chaque article une fois les données chargées
  (`app/components/sections/BlogSection.vue:5-18`,
  `app/pages/blog/index.vue:54-103`). Le rendu sans JavaScript reste le périmètre
  explicite d'`AQ-SEO-007`.
- Une étude publiée et masquée du portfolio n'a aucun lien entrant : le
  portfolio ne prend que `portfolioVisible` et les liens d'étude vivent dans
  ses cartes (`app/stores/projects.ts:131-133`,
  `app/components/sections/ProjectHelixCarousel.vue:228-245,265-291`).
- `/cas-clients-valais` affiche trois exemples codés en dur sans charger ni
  lier les études publiées (`app/pages/cas-clients-valais.vue:5-30,97-133`).
- Les états vides du blog et du portfolio sont utiles
  (`app/pages/blog/index.vue:105-108`,
  `app/components/sections/ProjectHelixCarousel.vue:218-223`), mais la page cas
  clients doit distinguer elle aussi l'absence d'étude dynamique.

Le point de maillage minimal est `/cas-clients-valais` : cette page doit charger
les études publiées du tenant en rendu serveur et fournir un lien vers chacune,
y compris lorsqu'elle n'est pas dans le portfolio. Un lien public vers ce hub
doit aussi exister dans la navigation ou le pied de page.

## Intégration proposée

1. Durcir les deux API publiques avec filtres de publication, projections de
   champs fermées et comportement client séparé des rôles internes.
2. Ajouter des timestamps éditoriaux stables par migration et une sauvegarde
   atomique des articles qui applique la même règle owner/admin et le même audit
   transactionnel que les projets lors d'un changement de publication.
3. Extraire une source de découverte serveur tenant-safe, utilisée par le
   sitemap pour charger articles et études avec leurs seules colonnes utiles.
   Une organisation absente, une requête en échec, un slug/date invalide ou une
   collision d'URL doit rendre le sitemap indisponible avec un statut 503
   observable plutôt qu'un XML partiel.
4. Ajouter `/cas-clients-valais`, les articles et les études au XML, puis trier,
   dédupliquer et échapper les entrées de façon déterministe.
5. Relier toutes les études depuis `/cas-clients-valais` et ajouter une preuve
   reproductible avant/après livraison.

## Validation attendue

- Tests API : anonyme/client sans brouillon ni champ interne; membres internes
  conservant leur vue; isolation d'organisation.
- Tests PostgreSQL : timestamps/backfill, transitions public/privé, refus du
  manager, audit exact et rollback de la publication si l'audit échoue.
- Tests sitemap : statique, état vide, deux sources dynamiques, tenant,
  brouillons, ordre/déduplication, slugs encodés, dates stables, XML valide et
  503 pour chaque source défaillante.
- Tests de maillage : chaque étude publiée possède un lien depuis la page cas
  clients; aucun projet privé n'est lié; état vide explicite.
- Preuve HTTP anonyme : sitemap XML disponible, page cas clients présente,
  aucune route privée/localisée fictive et cohérence avec les contenus publics.
- Validation globale via Portly : tests ciblés puis complets, pgTAP, typecheck,
  build, budgets, scripts Bash, aperçu Nitro et `git diff --check`.

## Sécurité, rollback et limites

- La migration est append-only et ne supprime aucune donnée. Le backfill garde
  le seul timestamp historique vérifiable au lieu d'inventer une date passée.
- Les fonctions de sauvegarde restent exécutables uniquement par la service
  role; la route serveur demeure responsable de l'identité et du rôle.
- Le sitemap et les API publiques restent en lecture seule et ne reçoivent
  aucun secret. Les erreurs publiques ne doivent pas révéler les messages
  Supabase internes.
- La migration exige la procédure de promotion contrôlée et la sauvegarde
  chiffrée déjà en place. Le rollback applicatif utilise l'image précédente;
  les colonnes ajoutées peuvent rester présentes sans casser l'ancienne image.
  Un trigger fail-closed empêche toutefois cette ancienne image de créer un
  article public ou de changer sa visibilité directement; les brouillons et
  modifications sans transition publique restent disponibles jusqu'au retour
  d'une image compatible avec la RPC auditée.
- Le rendu initial complet du blog demeure `AQ-SEO-007`; les données structurées
  et métadonnées détaillées restent `AQ-SEO-008` à `AQ-SEO-010`.
- Le rendu Markdown actuel utilise `v-html` après des remplacements de chaînes,
  sans assainissement HTML (`app/pages/blog/[slug].vue:35-47,95-96`). Ce risque
  XSS stocké adjacent doit être traité dans un ticket de sécurité dédié afin de
  ne pas élargir silencieusement cette story de découvrabilité.

Aucune ambiguïté matérielle restante n'empêche la planification.
