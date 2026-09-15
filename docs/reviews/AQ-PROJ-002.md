# Revue AQ-PROJ-002 — Études de cas trilingues

## Périmètre

- Ticket Linear : `ANT-5`
- Base : `origin/main`
- Révision finale revue : `5359afc`
- Plan : `docs/plans/AQ-PROJ-002.md`
- Recherche : `docs/research/AQ-PROJ-002.md`

## Constat résolu

### Major — Le rôle manager pouvait contourner l'autorisation des contenus localisés français

La nouvelle RPC ne dérive le rôle et ne refuse un acteur non `owner|admin` que lorsque
`case_study_localizations` est présent dans le payload
(`supabase/migrations/20260915143147_add_project_case_study_localizations.sql:154-176`).
Sans cette clé, elle transmet directement le payload à l'ancienne transition
(`supabase/migrations/20260915143147_add_project_case_study_localizations.sql:198-204`).

Or l'API continue d'accepter et de sérialiser les champs français historiques
`project_role`, `challenge`, `project_scope`, `key_decisions`, `approach`,
`solution`, `outcome`, `deliverables` et `results`, même en l'absence du bloc
localisé (`server/utils/projectPayload.ts:230-247`). Un manager peut donc forger une
requête sans `caseStudyLocalizations`, modifier ces colonnes françaises, contourner
l'interdiction de l'interface et changer le contenu public historique sans mettre à
jour la ligne FR ni produire l'audit localisé attendu.

La RPC devait dériver la membership pour toute écriture et empêcher un rôle non autorisé
de changer ces champs historiques sur un projet existant. La création d'un brouillon
privé historique par un manager doit rester compatible avec le contrat antérieur. Un
test pgTAP doit couvrir explicitement le payload forgé.

Résolution vérifiée : la RPC dérive désormais systématiquement le rôle réel, verrouille
le projet existant avant la comparaison et refuse toute différence sur les champs
français protégés pour un manager. La création historique d'un brouillon privé reste
compatible. Les deux nouvelles assertions pgTAP couvrent le refus et l'absence de
modification.

## Constats ouverts

Aucun constat critique, majeur ou mineur ne reste ouvert après la correction.

## Vérifications exécutées

- `npx vitest run --exclude tests/hermes-social-publish-script.test.ts --exclude tests/supabase-migration-baseline.test.ts` : 100 fichiers, 658 tests réussis.
- `npm run test:db` : 13 fichiers pgTAP, 208 tests réussis, replay et lint du schéma réussis.
- `npm run typecheck` : réussi.
- `npm run build` : réussi.
- `npm run quality:budgets` : réussi, 1 503 033 octets au total; scène robot 1 010 718 octets.
- `git diff --check` : réussi.

Max severity: none
Ship allowed: yes
