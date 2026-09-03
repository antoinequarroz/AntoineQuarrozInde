---
ticket: AQ-PROJ-001
validated: yes
---

# AQ-PROJ-001 — Distinguer le portfolio de l'étude de cas

## Critères d'acceptation

- [x] Le formulaire présente séparément `Afficher dans le portfolio`, `Publier l'étude de cas` et la mise en avant non éditoriale.
- [x] Un nouveau projet est privé par défaut et peut être publié dans le portfolio avec une étude encore en brouillon.
- [x] Les quatre combinaisons portfolio/étude sont conservées sans qu'un changement modifie l'autre.
- [x] Un visiteur ne reçoit pas un projet entièrement privé ; une étude publiée reste accessible même si sa carte est retirée du portfolio.
- [x] Retirer l'étude produit une 404, supprime son lien et son entrée sitemap sans effacer ses champs éditoriaux.
- [x] Les listes d'administration annoncent toujours les deux états avec du texte, pas uniquement par couleur ou pictogramme.
- [x] Seuls `owner` et `admin` peuvent changer les états publics ; l'acteur, la date et les valeurs avant/après sont journalisés.
- [x] Une valeur d'état invalide est refusée avant l'écriture et la mise à jour d'une ligne reste atomique.

## Plan ordonné

### 1. Ajouter l'état de visibilité sans retirer les projets actuels

- **Objectif :** livrer d'abord une transition compatible qui ajoute `portfolio_visible`, conserve `true` comme défaut et apprend à l'image de rollback à filtrer ce champ ; activer ensuite le défaut privé et les écritures éditoriales dans une seconde livraison.
- **Fichiers attendus :** migrations append-only `supabase/migrations/20260903*_add_project_portfolio_visibility.sql` et `*_activate_project_portfolio_visibility.sql`, `supabase/schema.sql`, tests dédiés de compatibilité et d'activation.
- **Autorisé :** ajout de colonne, backfill borné des lignes où elle est nulle, `NOT NULL`, défaut transitoire `true`, défaut final `false`, commentaire et index partiel par organisation.
- **Interdit :** suppression/renommage de colonne, réutilisation de `featured`, modification de contenu éditorial ou mise hors ligne des projets déjà présents.
- **Tests :** la migration contient l'ajout rétrocompatible et le backfill avant `NOT NULL`; le schéma frais utilise le défaut privé; aucune instruction destructive.
- **Validation :** `/Users/antoinequarroz/.local/bin/portly temp 'npm run test:db' --path /Users/antoinequarroz/Lab/projets/AntoineQuarrozInde --timeout 30m`, puis attente du job Portly.
- **Sécurité / rollback :** la phase d'activation ne peut être livrée qu'après que l'image de transition est devenue l'image précédente ; elle comprend déjà le filtre public, donc un rollback ne republie pas un projet masqué. Aucun rollback SQL automatique ni suppression de colonne.

### 2. Modéliser et valider deux états réellement indépendants

- **Objectif :** exposer `portfolioVisible` dans le type, le magasin et le payload serveur, avec un parseur booléen strict et `false` par défaut lorsque le champ manque.
- **Fichiers attendus :** `app/types/index.ts`, `app/stores/projects.ts`, `server/utils/projectPayload.ts`, `tests/business-flow.test.ts`, `tests/project-publication-states.test.ts`.
- **Autorisé :** mapping camelCase/snake_case, conservation de `featured`, validation stricte de `portfolioVisible` et `caseStudyPublished`, matrice des quatre combinaisons.
- **Interdit :** rendre les détails de l'étude obligatoires, rendre GitHub obligatoire, coupler les deux états ou accepter silencieusement `"false"` comme vrai.
- **Tests :** défaut privé, portfolio seul, étude seule, les deux publiés, valeur non booléenne refusée, socle minimal inchangé.
- **Validation :** job Portly ciblé sur `vitest run tests/business-flow.test.ts tests/project-publication-states.test.ts`.
- **Sécurité / rollback :** toute entrée invalide échoue avant Supabase; une seule insertion/mise à jour porte les deux valeurs afin d'éviter un état public partiel.

### 3. Appliquer les portes publiques et conserver l'indépendance de l'étude

- **Objectif :** limiter la réponse anonyme aux projets dont le portfolio ou l'étude est public, puis faire compter et afficher au portfolio uniquement `portfolioVisible`; conserver la route et le sitemap sur `caseStudyPublished` uniquement.
- **Fichiers attendus :** `server/api/projects.get.ts`, `app/stores/projects.ts`, `app/components/sections/PortfolioSection.vue`, `app/pages/projets/[slug].vue` seulement si le chargement commun exige une adaptation, `server/routes/sitemap.xml.ts` uniquement pour expliciter/tester l'indépendance, tests API/SEO dédiés.
- **Autorisé :** filtre serveur `portfolio_visible OR case_study_published`, vue calculée des cartes visibles, 404 pour l'étude brouillon, sitemap fondé sur l'étude publiée.
- **Interdit :** exposer un projet dont les deux états sont faux, masquer une étude publiée parce que le portfolio est faux, ajouter des pages EN/DE ou changer les règles de fallback linguistique.
- **Tests :** réponse anonyme pour les quatre combinaisons, réponse administrateur complète et bornée à l'organisation, compte/filtre portfolio, route 404 et sitemap après retrait de l'étude.
- **Validation :** job Portly ciblé Vitest, puis contrôle HTTP local de `/`, `/api/projects`, `/projets/<slug>` et `/sitemap.xml` sur le serveur Portly existant.
- **Sécurité / rollback :** les champs détaillés d'une étude brouillon restent neutralisés; les données privées du CRM ne sont jamais ajoutées au contrat public.

### 4. Rendre les décisions claires, accessibles et auditables

- **Objectif :** regrouper les deux décisions de publication dans le formulaire avec des contrôles natifs clairement libellés, laisser `Mettre en avant` dans une zone distincte, afficher les deux états dans chaque liste, limiter leurs transitions à `owner/admin` et journaliser les valeurs avant/après.
- **Fichiers attendus :** `app/pages/admin/projects/index.vue`, `app/components/admin/ProjectCaseStudyFields.vue`, `server/api/projects.post.ts`, `server/api/projects.put.ts`, éventuellement un utilitaire serveur ciblé, `tests/project-publication-states.test.ts`, test E2E administrateur ciblé si les fixtures permettent l'écriture.
- **Autorisé :** libellés `Afficher dans le portfolio` et `Publier l'étude de cas`, aide courte sur les effets, états textuels `Visible/Masqué` et `Publiée/Brouillon`, focus visible, statut annoncé, audit `project.publication_changed` contenant uniquement ancien/nouveau.
- **Interdit :** état exprimé seulement par couleur/étoile, publication au chargement, mutation lors d'une prévisualisation, données client ou texte éditorial dans le journal, élargissement global des droits d'administration.
- **Tests :** nouveau projet à deux états faux, contrôles clavier et libellés accessibles, badges mobile/tableau, manager refusé seulement lorsqu'il change un état public, owner/admin autorisé, audit avec acteur et valeurs avant/après.
- **Validation :** job Portly ciblé Vitest/E2E; vérification manuelle du formulaire aux largeurs mobile et bureau, en thème clair et sombre.
- **Sécurité / rollback :** verrouiller le projet, vérifier le rôle, écrire le projet et son audit dans une même fonction PostgreSQL transactionnelle. Une erreur de validation, de droit ou d'audit annule toute la transaction.

### 5. Vérifier la story complète avant livraison

- **Objectif :** prouver le parcours de création minimale, les quatre états, le retrait sans perte de données et l'absence de régression SEO, accessibilité, types et build.
- **Fichiers attendus :** uniquement les tests et ajustements strictement nécessaires à AQ-PROJ-001; mise à jour des cases de ce plan après preuves.
- **Autorisé :** fixtures locales, contrôles navigateur en local, revue de diff et migration Supabase éphémère.
- **Interdit :** mutation de production, déploiement, suppression réelle d'un projet, contenu de démonstration conservé en base ou démarrage d'un serveur hors Portly.
- **Tests :** suite Vitest complète, typecheck, build, budgets, migrations locales, E2E applicables, `git diff --check`.
- **Validation :** lancer chaque commande bornée via `/Users/antoinequarroz/.local/bin/portly temp ...`, puis vérifier visuellement le site sur le serveur Portly sain.
- **Sécurité / rollback :** la première livraison reste additive et compatible avec l'application précédente; la production ne sera proposée qu'après revue indépendante et validation explicite séparée.

## Correspondance

- Deux contrôles et listes compréhensibles : tâches 2 et 4.
- Projet minimal dans le portfolio avec étude brouillon : tâches 1 à 4.
- États indépendants, retrait sans suppression : tâches 2 à 4.
- Route, lien et sitemap retirés avec l'étude : tâche 3.
- Défaut privé et refus sans état partiel : tâches 1, 2 et 4.
- Droits et audit ancien/nouveau : tâche 4.
- Preuve complète et non-régression : tâche 5.

## Décision humaine requise

Plan validé explicitement par Antoine avant l'implémentation d'AQ-PROJ-001.

## État d'exécution — 3 septembre 2026

- [x] Livraison divisée en deux migrations append-only : transition au défaut `true`, puis activation au défaut privé `false` après installation d'une image de rollback compatible.
- [x] Modèle, payload, API publique, magasin et interface alignés sur deux états indépendants.
- [x] Transitions publiques limitées à `owner/admin` dans une fonction PostgreSQL verrouillée ; projet et audit ancien/nouveau sont enregistrés atomiquement.
- [x] 20 tests ciblés AQ-PROJ-001 et parcours métier passent après les corrections de revue.
- [x] Suite complète : 46 fichiers et 243 tests passent en exécution séquentielle ; typecheck, build de production et budgets passent.
- [x] Base éphémère : toutes les migrations sont rejouées et les 22 assertions pgTAP passent, dont refus manager, verrou, audit exact et rollback sur échec d'audit.
- [x] `git diff --check` ne signale aucune erreur de format.
- [x] E2E authentifié : le rôle manager voit les deux réglages de publication désactivés et la mise en avant disponible, sans sauvegarder de donnée.
- [x] Phase de transition `a496094` revue indépendamment sans finding et ouverte séparément dans la PR #52 ; qualité, accessibilité et base GitHub Actions passent.
