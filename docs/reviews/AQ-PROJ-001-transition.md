# Revue indépendante — AQ-PROJ-001, phase de transition

## Verdict

Le commit `a49609492c289c94af9ed1af71c51a31798ee023` remplit son objectif de
transition. Il ajoute et rétroremplit `portfolio_visible` avec la valeur et le
défaut compatibles `true`, rend la nouvelle image capable d'appliquer ce champ
aux lectures publiques, et ne fournit aucun chemin applicatif permettant
d'écrire `false`. L'image précédente et l'image de transition continuent donc
d'afficher les mêmes projets pendant cette phase, et chacune constitue un
rollback sûr avant la future activation éditoriale.

## Périmètre examiné

- Base : `origin/main` à
  `1ac8ec147d70d118681d163086e9f08d4a8d4027`.
- Candidat : commit exact
  `a49609492c289c94af9ed1af71c51a31798ee023`.
- Seul le diff `origin/main..a496094` a été revu. Les modifications de la phase
  d'activation actuellement présentes mais non commitées dans le répertoire de
  travail ont été exclues de cette décision.
- Fichiers du commit : migration et schéma Supabase, baseline des migrations,
  type et magasin projets, API publique, section portfolio et test de
  compatibilité.
- Références recoupées : `.codex/skills/review-changes/SKILL.md`, `AGENTS.md`,
  `docs/operations.md`, `docs/research/AQ-060.md` et les contraintes de
  publication d'`AQ-PROJ-001`.

## Findings

### Critical

Aucun.

### Major

Aucun.

### Minor

Aucun.

## Vérification ciblée

- **Migration :**
  `supabase/migrations/20260903193214_add_project_portfolio_visibility.sql:1-20`
  ajoute une colonne nullable, rétroremplit uniquement les valeurs nulles à
  `true`, puis pose le défaut `true` et `NOT NULL`. Elle ne supprime ni ne
  renomme aucun objet. Le schéma frais utilise le même défaut et l'index partiel
  est cohérent.
- **Compatibilité de l'image précédente :** les routes `POST` et `PUT` du
  commit ne transmettent pas `portfolio_visible`; PostgreSQL applique donc
  `true` aux créations et conserve la valeur existante lors des modifications.
  L'image `origin/main`, qui ignore la colonne, conserve ainsi exactement son
  comportement visible antérieur. Aucune ligne `false` ne peut être produite
  par cette image.
- **Sécurité du rollback :** l'image de transition lit le champ dans
  `app/stores/projects.ts:17,56` et filtre le carousel dans
  `app/stores/projects.ts:132-133`. Après son déploiement, elle devient une
  image précédente capable de respecter les futures valeurs privées. Durant la
  phase courante, toutes les lignes applicatives restent à `true`; un rollback
  immédiat vers `origin/main` ne révèle donc aucun état nouvellement privé.
- **Lecture publique :** `server/api/projects.get.ts:9` limite les requêtes
  anonymes aux cartes visibles ou études publiées. Avec le backfill et le défaut
  `true`, ce filtre ne retire prématurément aucun projet. La redaction existante
  des détails d'études en brouillon reste inchangée.
- **Absence d'activation prématurée :** `portfolioVisible` n'apparaît que dans
  le type de lecture et le mapping du magasin. Il est absent du formulaire
  d'administration, de `projectPayload`, de `projects.post.ts` et de
  `projects.put.ts`. Une propriété supplémentaire envoyée par un client est
  ignorée par le payload fermé et ne peut pas atteindre la base.
- **Isolation et privilèges :** la nouvelle lecture publique conserve le filtre
  d'organisation existant. La table `projects` reste privée pour les rôles Data
  API et accessible via le service serveur; l'ajout de colonne ne change aucun
  grant ni aucune politique RLS.
- **Portée :** aucun contrôle éditorial, audit de transition, changement de
  rôle, secret, dépendance ou contenu n'est ajouté dans cette phase.

## Commandes et résultats

- `git diff --check origin/main..a496094` → aucune sortie, exit `0`.
- `git diff --name-status origin/main..a496094` → huit fichiers attendus,
  aucune surface d'écriture ou d'administration modifiée.
- `git grep -n -E 'portfolioVisible|portfolio_visible' a496094` et inspection
  des routes d'écriture → occurrences applicatives limitées au type, au mapping,
  au filtre de lecture et aux artefacts SQL/tests; aucun writer.
- Checkout détaché du commit exact préparé avec `npx nuxi prepare` via Portly →
  types Nuxt générés, exit `0`. Un premier essai avant cette préparation n'a
  exécuté aucun test car `.nuxt/tsconfig.app.json` était absent; il ne constitue
  pas un échec du commit.
- Dans ce checkout exact, via Portly :
  `npx vitest run --maxWorkers=1 && npm run typecheck && npm run build && npm run quality:budgets` →
  `45/45` fichiers et `232/232` tests réussis, typecheck réussi en `8,948 s`,
  build Nitro réussi, `84` chunks pour `5 802 073` octets et scène robot de
  `1 010 718` octets sous le plafond de `1 500 000`, exit `0`.
- Dans ce checkout exact, via Portly : `npm run test:db` → schéma initialisé,
  toutes les migrations appliquées puis rejouées, `8/8` assertions pgTAP
  réussies, exit `0`.

Max severity: none
Ship allowed: yes
