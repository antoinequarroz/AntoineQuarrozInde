---
ticket: AQ-STACK-001
linear: ANT-22
validated: no
---

# AQ-STACK-001 — Administrer la stack technique depuis le dashboard

## Critères d'acceptation

- Ajouter, modifier, masquer et réordonner une technologie depuis
  l'administration.
- Affecter chaque technologie à `Quotidien`, `Maîtrisé` ou `Déjà utilisé` sans
  inventer le niveau des données existantes.
- Choisir séparément sa présence dans la section À propos et dans le footer.
- Sélectionner uniquement un pictogramme du catalogue fermé, avec un fallback
  accessible.
- Prévisualiser le brouillon en français, anglais et allemand avant une
  publication explicitement confirmée.
- Ne jamais exposer le brouillon au public et publier la liste complète de
  manière atomique.
- Conserver l'isolation par organisation, limiter l'édition à `owner` et
  `admin`, journaliser les changements sans secret et refuser les conflits de
  révision.
- Préserver le SSR, le mobile-first, les thèmes clair/sombre, le clavier et les
  lecteurs d'écran.

## Plan ordonné

- [ ] **1. Définir le contrat fermé de la stack.** Objectif : créer les types,
  niveaux, clés d'icône, limites, parseur et catalogue initial partagés.
  Fichiers attendus : `shared/utils/technologyStack.ts`, adaptation ciblée de
  `app/components/ui/TechnologyIcon.vue`, tests Vitest dédiés. Autorisé : noms
  de marque en texte simple, trois niveaux fermés, deux visibilités et au plus
  quarante entrées; interdit : SVG/HTML/URL libre, niveau implicite ou dépendance
  supplémentaire. Tests : valeurs valides, clés inconnues, doublons, libellés
  trop longs, ordre invalide et fallback. Validation : test ciblé et
  `npm run typecheck`. Sécurité/rollback : l'allowlist reste la seule source de
  pictogrammes; le catalogue initial permet de revenir au rendu actuel.

- [ ] **2. Ajouter un stockage brouillon/publié atomique et tenant-safe.**
  Objectif : créer une table additive `technology_stack_settings` avec une ligne
  par organisation, documents JSONB bornés, révisions et horodatages, puis
  initialiser les organisations existantes avec la liste publique actuelle
  classée prudemment `Déjà utilisé`. Fichiers attendus : migration Supabase
  créée par la CLI, `supabase/schema.sql`, test pgTAP. Autorisé : table,
  contraintes de forme/taille, index/clé primaire, seed idempotent et fonction
  transactionnelle de publication avec contrôle de révision; interdit :
  mutation d'autres contenus, suppression ou accès direct depuis le navigateur.
  Validation : tests de base via Portly. Sécurité : RLS activée, privilèges
  `anon`/`authenticated` révoqués, accès `service_role` uniquement. Rollback :
  migration additive ignorée par l'ancienne image, sans suppression automatique.

- [ ] **3. Exposer les contrats serveur privé et public.** Objectif : fournir
  lecture/sauvegarde du brouillon, publication explicite et lecture publique de
  la seule version publiée. Fichiers attendus : utilitaire serveur de stack,
  `server/api/admin/technology-stack.get.ts`, `.put.ts`,
  `server/api/admin/technology-stack/publish.post.ts`,
  `server/api/public/technology-stack.get.ts`, tests API. Autorisé : contexte
  canonique d'organisation, comparaison de révision, audit synthétique et
  fallback initial; interdit : accepter `organization_id`, autoriser `manager`,
  renvoyer le brouillon publiquement ou journaliser le document complet. Tests :
  401/403/409, tenants distincts, erreur de validation, brouillon invisible,
  publication atomique et fallback. Validation : tests ciblés puis
  `npm run typecheck`. Rollback : le public conserve le catalogue initial.

- [ ] **4. Construire l'éditeur mobile-first avec prévisualisation.** Objectif :
  ajouter `/admin/stack` au groupe `Publier`, avec liste ordonnable au clavier,
  ajout/édition, visibilités, niveau, choix d'icône, aperçu FR/EN/DE, sauvegarde
  et confirmation de publication. Fichiers attendus :
  `app/pages/admin/stack/index.vue`, petits composants admin si justifiés,
  `app/layouts/admin.vue`, traductions ciblées et tests UI. Autorisé : contrôles
  natifs et boutons explicites de déplacement; interdit : drag-and-drop comme
  seul moyen, modales imbriquées, action au survol ou cible sous 44 px. Tests :
  chargement, vide, erreur, modification non sauvegardée, conflit, succès,
  focus, thèmes et 320 px. Validation : tests ciblés et inspection locale.
  Rollback : la route peut être retirée sans toucher aux données publiées.

- [ ] **5. Brancher le rendu public SSR sans dupliquer la source.** Objectif :
  remplacer les deux tableaux statiques par une source publiée partagée,
  présenter clairement les niveaux sur la landing et respecter la visibilité
  plus concise du footer. Fichiers attendus : composable public,
  `app/pages/index.vue`, `app/components/sections/AboutSection.vue`,
  `app/components/layout/AppFooter.vue`, catalogues i18n et tests de rendu.
  Autorisé : groupes localisés et maintien du style de chips existant; interdit :
  chargement client tardif, accès au brouillon ou suppression des fallbacks.
  Tests : HTML SSR FR/EN/DE, hydratation stable, ordre, surfaces, état vide et
  ancien catalogue. Validation : test ciblé, build et vérification locale via
  Portly. SEO/rollback : les noms restent présents dans le HTML initial; le
  catalogue partagé garantit le rendu en cas de ligne absente.

- [ ] **6. Prouver le parcours complet et préparer la livraison.** Objectif :
  couvrir brouillon → prévisualisation → publication → landing/footer puis
  restauration exacte des données initiales. Fichiers attendus : tests
  unitaires/API, pgTAP, `e2e/admin.spec.ts` ou une spec dédiée, documentation de
  release si nécessaire. Autorisé : organisation sandbox E2E et nettoyage par
  identifiants/révision exacts; interdit : données de production dans les tests,
  secret dans les logs ou nettoyage large. Validation via Portly : tests
  ciblés, `npm test`, `npm run typecheck`, `npm run build`, budgets, tests DB,
  E2E mobile/desktop et `git diff --check`. Sécurité/rollback : toute erreur
  bloque la livraison; aucun déploiement ni fusion dans ce ticket sans une
  validation séparée.

## Traçabilité

- Recherche : `docs/research/AQ-STACK-001.md`
- Linear : `ANT-22`
- Chaque critère est couvert par au moins une étape; les étapes 1 à 3 ferment
  les frontières de données avant les interfaces, puis les étapes 4 et 5
  consomment ces contrats et l'étape 6 vérifie le parcours entier.
