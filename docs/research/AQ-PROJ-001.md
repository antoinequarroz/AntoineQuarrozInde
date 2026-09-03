# AQ-PROJ-001 — Recherche : distinguer le portfolio de l'étude de cas

## Résultat attendu

Le ticket validé demande deux décisions indépendantes et compréhensibles : afficher ou retirer un projet du portfolio, puis publier ou remettre en brouillon son étude de cas. Un nouveau projet doit commencer invisible avec son étude en brouillon, les données éditoriales doivent survivre à tout retrait, et les changements de publication doivent rester attribuables (`docs/product/stories.md:385-403`, `docs/product/prd.md:221-230`).

## Modèle et comportement actuels

- `public.projects` possède `featured` et `case_study_published`, mais aucun état propre à la présence dans le portfolio. `featured` vaut `false` par défaut et `case_study_published` vaut `false` (`supabase/schema.sql:19-47`). La migration d'étude de cas documente uniquement le second comme porte de la page détaillée et du lien associé (`supabase/migrations/20260805142800_project_case_studies.sql:1-24`).
- Le type applicatif et le mapping Pinia reproduisent ces deux propriétés : `featured` et `caseStudyPublished`. Aucun champ ne représente la visibilité du portfolio (`app/types/index.ts:1-35`, `app/stores/projects.ts:3-75`).
- Le formulaire initialise `featured` et `caseStudyPublished` à `false`, les restaure en édition, puis les transmet ensemble au serveur (`app/pages/admin/projects/index.vue:16-78`, `app/pages/admin/projects/index.vue:89-128`).
- La validation serveur exige toujours le socle minimal demandé — titre, slug, catégorie, description française, image et URL HTTP(S) — et laisse GitHub ainsi que tous les détails de l'étude facultatifs. Elle convertit toutefois les états avec `Boolean(...)`, qui ne distingue pas un booléen valide d'une chaîne telle que `"false"` (`server/utils/projectPayload.ts:26-42`, `server/utils/projectPayload.ts:56-107`).
- Les créations et modifications passent par une seule insertion ou mise à jour Supabase. Les écritures sont bornées à l'organisation, mais ne journalisent actuellement aucune création ou transition d'état de projet (`server/api/projects.post.ts:1-18`, `server/api/projects.put.ts:1-23`).

## Parcours public actuel

- Pour un visiteur anonyme, `GET /api/projects` charge tous les projets de l'organisation publique. Il masque seulement les champs détaillés d'une étude non publiée ; il ne retire aucun projet du résultat (`server/api/projects.get.ts:1-34`).
- La page d'accueil charge ce magasin commun, puis `PortfolioSection` compte et affiche tous les projets. `featured` ne commande pas la visibilité : il sert uniquement à placer les projets concernés en premier (`app/pages/index.vue:74-85`, `app/components/sections/PortfolioSection.vue:7-28`).
- Le carrousel affiche le lien vers l'étude uniquement en français et uniquement si `caseStudyPublished` est vrai. Les liens public et GitHub restent indépendants (`app/components/sections/ProjectHelixCarousel.vue:64-73`, `app/components/sections/ProjectHelixCarousel.vue:228-244`, `app/components/sections/ProjectHelixCarousel.vue:282-291`).
- La route `/projets/[slug]` recherche dans le même magasin et renvoie une 404 si `caseStudyPublished` est faux. Les contenus détaillés restent donc conservés en base mais ne sont pas rendus par cette page (`app/pages/projets/[slug].vue:10-18`, `app/pages/projets/[slug].vue:36-71`).
- Le sitemap sélectionne directement les projets dont `case_study_published = true`; la découvrabilité de l'étude est donc déjà indépendante de `featured` (`server/routes/sitemap.xml.ts:50-67`).

## Interface actuelle

- Le contrôle de l'étude de cas est une case native enveloppée dans un libellé. Il expose visuellement `Publiée` ou `Brouillon` et précise que les champs détaillés sont facultatifs (`app/components/admin/ProjectCaseStudyFields.vue:34-49`).
- Le contrôle `Mettre en avant` est un bouton avec `role="switch"`, mais il n'est pas une décision de publication et son texte ne dit pas si le projet apparaît réellement dans le portfolio (`app/pages/admin/projects/index.vue:268-283`).
- Dans les cartes et le tableau d'administration, l'étude n'a un badge que lorsqu'elle est publiée ; l'état brouillon n'est pas affiché. `featured` est résumé par une étoile sans libellé, et aucun état de portfolio n'existe (`app/pages/admin/projects/index.vue:298-330`, `app/pages/admin/projects/index.vue:334-405`).
- Le formulaire suit déjà les conventions utiles au ticket : champs natifs, dialogue avec focus géré, cibles d'au moins 44 px pour plusieurs actions et messages via toast (`app/pages/admin/projects/index.vue:11-14`, `app/pages/admin/projects/index.vue:185-202`, `app/components/admin/ProjectCaseStudyFields.vue:95-142`).

## Autorisation et auditabilité

- Les routes d'écriture appellent `requireAdmin`, dont le seuil réel est `manager`; propriétaires, administrateurs et managers peuvent donc actuellement enregistrer un projet (`server/utils/requireAdmin.ts:1-9`, `server/utils/organizationAccess.ts:15-21`, `server/utils/organizationAccess.ts:41-94`).
- Le navigateur applique la même famille de rôles pour entrer dans l'administration (`app/middleware/admin.ts:1-13`). Le ticket exige plus précisément que les changements des deux états soient réservés à un administrateur.
- `audit_logs` sait stocker l'organisation, l'utilisateur, l'action, l'entité, une charge JSON et la date automatique (`supabase/schema.sql:113-123`). `logAudit` fournit ce chemin, mais absorbe volontairement une erreur d'insertion (`server/utils/audit.ts:1-25`). Les routes projets ne l'utilisent pas encore, contrairement aux écritures clients qui enregistrent l'acteur après succès (`server/api/clients.put.ts:3-47`).
- Les tables métier sont accessibles par le service serveur uniquement ; les rôles Data API anonymes et authentifiés n'ont plus de privilège direct sur `projects` ou `audit_logs` (`supabase/migrations/20260805173635_harden_server_only_data_api_grants.sql:1-40`).

## Couverture de tests existante

- `tests/business-flow.test.ts:37-69` prouve qu'un projet peut être sauvegardé avec le socle minimal, sans GitHub ni détails d'étude. Le test assimile encore cette opération à `caseStudyPublished: true`, car la visibilité portfolio séparée n'existe pas.
- `tests/project-localized-descriptions.test.ts:14-28` protège les trois descriptions du portfolio, l'URL obligatoire, le fallback français et sa langue déclarée.
- `tests/seo-french-only-routes.test.ts:242-276` protège la sélection des seules études publiées dans le sitemap français.
- Aucun test actuel ne couvre un état portfolio masqué, les quatre combinaisons portfolio/étude, l'autorisation propre aux transitions de publication, ni la journalisation ancien/nouveau.

## Contraintes établies pour la suite

- Les quatre combinaisons des deux états sont utiles : tout brouillon, portfolio seul, étude seule et portfolio avec étude. Retirer l'un ne doit pas modifier l'autre (`docs/product/stories.md:392-400`).
- `featured` doit rester un attribut de mise en avant et de tri, sans être renommé ni réutilisé comme porte de publication (`app/components/sections/PortfolioSection.vue:23-27`).
- Une lecture publique unique sert aujourd'hui à la fois le portfolio et la page détaillée. Tout filtrage doit donc préserver l'accès à une étude publiée même si sa carte est retirée du portfolio, tout en excluant un projet entièrement privé (`server/api/projects.get.ts:1-34`, `app/pages/projets/[slug].vue:10-18`).
- Une migration doit préserver les projets déjà visibles en production tout en donnant aux futurs projets le défaut privé demandé. Comme l'image précédente ignore le nouveau champ, la livraison doit être faite en deux phases : lecture compatible avec défaut `true`, puis activation des écritures et du défaut `false` seulement lorsque cette image est devenue le rollback sûr. Le schéma versionné et l'historique de migrations restent tous deux des sources vérifiées (`supabase/schema.sql:19-47`, `package.json:8-20`).
- La vérification de rôle, le verrou de ligne, l'écriture et l'audit doivent partager une transaction PostgreSQL. Une vérification applicative suivie d'une mise à jour séparée laisserait une fenêtre concurrente, tandis qu'un audit best-effort ne garantit pas la traçabilité demandée.
- Aucune suppression définitive, traduction, programmation ou refonte générale ne fait partie de ce ticket (`docs/product/stories.md:401-403`).
