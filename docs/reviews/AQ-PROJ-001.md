# Revue indépendante — AQ-PROJ-001 (activation)

## Verdict

Le commit d’activation `a99b5e270c85fc0131053da9801ed26461cf6faf`
résout correctement, dans le code et la base, les deux défauts d’atomicité de la
revue précédente : le contrôle du rôle, le verrouillage, l’écriture du projet et
l’audit sont désormais exécutés dans une seule transaction SQL. La fonction est
réservée à `service_role`, et ses lectures comme ses écritures sont bornées par
`organization_id`.

La livraison de l’activation n’est cependant pas encore autorisée. Le contrôle
du runtime de production effectué le 3 septembre 2026 retourne toujours
`1ac8ec147d70d118681d163086e9f08d4a8d4027`, et non le commit de transition
`a49609492c289c94af9ed1af71c51a31798ee023`. Tant que ce dernier n’a pas été
livré seul et validé en production, l’image de rollback reste une image qui ne
filtre pas `portfolio_visible`. Déployer les deux commits dans une seule release
réintroduirait donc le risque majeur de divulgation en cas de rollback.

## Périmètre examiné

- Diff d’activation exact : `a49609492c289c94af9ed1af71c51a31798ee023..a99b5e270c85fc0131053da9801ed26461cf6faf`.
- Branche : `codex/aq-proj-001-portfolio-visibility` ; `HEAD` vérifié à
  `a99b5e270c85fc0131053da9801ed26461cf6faf`.
- Référentiel de transition : le commit parent `a496094` a fait l’objet d’une
  revue séparée dans `docs/reviews/AQ-PROJ-001-transition.md`.
- Entrées recoupées : `AGENTS.md`, le skill `review-changes`, la recherche, le
  plan, la story et le PRD d’`AQ-PROJ-001`, ainsi que la procédure de migration
  et de rollback.
- Surface relue : migration et schéma, privilèges SQL, routes POST/PUT,
  validation du payload, contrôles de rôles, interface d’administration,
  lecture publique, tests unitaires, pgTAP et E2E modifiés.

## Résolution des findings précédents

### 1. Livraison en deux phases et rollback — résolu dans le code, prérequis opérationnel non satisfait

Le schéma est maintenant réellement découpé en deux migrations append-only :

- la transition `20260903193214_add_project_portfolio_visibility.sql` ajoute et
  backfill la colonne à `true`, puis l’image `a496094` sait la filtrer sans
  exposer de contrôle d’écriture ;
- l’activation `20260903203219_activate_project_portfolio_visibility.sql:1-2`
  ne bascule le défaut à `false` qu’au commit suivant.

Ce découpage rend l’image de transition sûre après la migration d’activation :
un rollback vers `a496094` continue de filtrer les projets privés. Il peut créer
de nouveaux projets privés sans fournir de contrôle pour les publier, ce qui
est une limitation temporaire acceptable d’un rollback d’urgence, mais il ne
les divulgue pas.

La garantie dépend toutefois de l’ordre réel de livraison. L’endpoint public
`https://www.antoinequarroz.ch/api/version` annonce encore `1ac8ec…`. L’image
actuellement disponible comme rollback n’est donc pas `a496094`. L’étape 1 doit
être promue seule, vérifiée saine, puis seulement l’étape 2 peut être livrée.

### 2. Audit atomique — résolu

Les routes POST et PUT délèguent maintenant la sauvegarde à
`save_project_with_publication_audit` (`server/api/projects.post.ts:10-20`,
`server/api/projects.put.ts:10-20`). Dans la fonction, la création du projet et
son audit sont deux instructions d’un même appel (`migration:40-67`) ; lors
d’une mise à jour, la modification et l’audit sont également dans le même bloc
transactionnel (`migration:92-134`). Une erreur d’insertion d’audit fait donc
échouer et annule l’écriture métier.

La preuve pgTAP force une violation de clé étrangère sur l’auteur de l’audit,
puis vérifie que `portfolio_visible` est resté à `false`
(`aqproj001_project_publication.test.sql:127-159`). L’audit réussi conserve
l’auteur transmis par le contexte authentifié, l’horodatage natif et les deux
états exacts avant/après (`migration:124-131`, test `:195-205`).

### 3. TOCTOU manager — résolu

La route PUT ne fait plus de lecture puis d’écriture séparées. La fonction SQL
sélectionne la ligne de la bonne organisation avec `FOR UPDATE`
(`migration:70-75`), calcule le changement sur la ligne verrouillée, refuse le
manager avant l’UPDATE (`migration:81-90`), puis écrit sur le même couple
`organization_id`/`id` (`migration:92-122`). Deux requêtes concurrentes sur le
même projet sont donc sérialisées et un manager ne peut plus écraser un état
public modifié entre contrôle et sauvegarde.

Le pgTAP vérifie aussi qu’une transition manager lève `42501` et laisse la ligne
inchangée (`aqproj001_project_publication.test.sql:92-125`).

## Findings

### Critical

Aucun.

### Major

#### 1. La phase de transition n’est pas encore l’image de rollback en production

Le code a désormais la bonne stratégie en deux commits, mais la production
retourne encore la version `1ac8ec…`. Si `a99b5e2` est promu maintenant avec son
parent dans une seule release, la migration d’activation peut créer des lignes
privées alors que le rollback automatique remettra une image antérieure à
`a496094`, qui ignore le filtre. Le risque de republication de projets masqués
demeure donc au niveau du déploiement, malgré sa résolution dans le diff.

Action requise : livrer uniquement `a496094`, vérifier `/api/version`, la santé
et le filtrage public, puis construire/livrer `a99b5e2` dans une seconde release
dont l’image précédente est bien `a496094`. Aucun nouveau changement de code
n’est requis pour lever ce finding.

### Minor

Aucun finding mineur bloquant ou régressif identifié dans le diff d’activation.

## Sécurité, isolation et erreurs

- La fonction est `security invoker` avec un `search_path` vide
  (`migration:11-15`). Les droits sont retirés à `public`, `anon` et
  `authenticated`, et accordés uniquement à `service_role`
  (`migration:138-141`). Les tests pgTAP confirment ces privilèges.
- Les routes restent protégées par `requireAdmin`, qui résout l’utilisateur et
  son rôle depuis l’adhésion à l’organisation. Le rôle et l’auteur transmis au
  RPC proviennent de ce contexte, pas du body (`projects.post.ts:2-16`,
  `projects.put.ts:2-16`).
- Le RPC ignore tout `organization_id` fourni dans le JSON : il insère avec
  `p_organization_id`, et une mise à jour exige simultanément cet identifiant et
  l’id du projet (`migration:47`, `:73-75`, `:120-122`). Une ligne d’une autre
  organisation est renvoyée comme introuvable.
- La création publique par un manager est également bloquée dans la base ; le
  précontrôle applicatif de POST améliore seulement le retour rapide. PUT dépend
  volontairement du contrôle atomique en base.
- Les erreurs d’autorisation et d’absence sont traduites en 403 et 404 sans
  exposer les marqueurs SQL (`server/utils/projectPublication.ts:41-53`). Les
  autres erreurs conservent le comportement 500 préexistant des routes ; aucune
  nouvelle donnée métier sensible n’est renvoyée dans les cas spécifiques au
  ticket.

## Migration, API et interface

- La migration d’activation ne supprime ni colonne ni donnée. Elle change le
  défaut de la colonne déjà backfillée et ajoute le RPC atomique. L’application
  échoue de manière sûre si la migration de transition manque.
- `projectPayload` exige des booléens réels, applique `false` quand les champs
  sont absents et construit un payload fermé. GitHub et les champs détaillés de
  l’étude restent facultatifs ; image, URL et description minimale restent
  validées.
- Les quatre combinaisons de visibilité restent indépendantes. L’API publique
  ne récupère que les cartes portfolio ou études publiées ; les détails privés
  sont neutralisés pour une carte sans étude publiée. La route détaillée et le
  sitemap restent conditionnés à `case_study_published` uniquement.
- L’interface utilise deux cases natives dans un `fieldset`, avec légende,
  explications, états textuels et focus visible. Les managers voient les états
  mais les contrôles sont désactivés avec une explication ; les listes mobile et
  bureau n’utilisent pas uniquement la couleur.

## Vérifications exécutées

- `git diff --check a496094..a99b5e2` : aucune erreur, exit `0`.
- Via Portly, `npx vitest run --maxWorkers=1` : `46/46` fichiers et
  `243/243` tests réussis, exit `0`.
- Via Portly, `npm run typecheck && npm run build && npm run quality:budgets` :
  typage réussi, build Nitro réussi, budget de `84` chunks (`5 805 787`
  octets) et scène robot de `1 010 718` octets sous le plafond de `1 500 000`,
  exit `0`.
- Via Portly, `npm run test:db` : les migrations de transition puis d’activation
  sont appliquées sur une base éphémère ; `22/22` assertions pgTAP réussissent,
  exit `0`.
- Via Portly, contrôle de production
  `https://www.antoinequarroz.ch/api/version` : HTTP réussi, version
  `1ac8ec147d70d118681d163086e9f08d4a8d4027`, construite le
  `2026-09-03T18:55:20Z`.

Max severity: major
Ship allowed: no
