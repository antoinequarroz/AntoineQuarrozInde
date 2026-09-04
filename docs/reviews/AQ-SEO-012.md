# Revue AQ-SEO-012 — activation stricte

## Périmètre revu

- Story : `docs/product/stories.md` (`AQ-SEO-012`).
- Recherche et plan validé : `docs/research/AQ-SEO-012.md`,
  `docs/plans/AQ-SEO-012.md`.
- Diff : `3523993d107addab2765eaeebf39eea100149a93` →
  `62df2b3e1b2628ba7dce1742ead6b40a2304caf3` (PR #63).
- Phase : activation SQL stricte après déploiement et preuve de l'image de
  transition ; aucun projet réel n'est approuvé ou publié par cette release.

## Findings

Aucun finding ouvert.

La migration échoue avant toute activation si une ligne enfreint la parité
publication/approbation, puis valide une contrainte permanente. Le trigger
refuse les écritures publiques hors RPC et la modification en place d'une étude
approuvée. Le RPC verrouille la ligne, dérive le rôle depuis
`organization_memberships`, ignore le rôle fourni par l'appelant et conserve
les fonctions hors des rôles navigateur. Les audits d'approbation ne contiennent
que les états avant/après ; les textes, noms de client et notes de preuve n'y
sont pas copiés (`supabase/migrations/20260904230738_activate_project_case_study_approvals.sql`).

Le serveur transmet l'identité issue de la session authentifiée et ne transmet
plus de rôle faisant autorité. Les erreurs d'appartenance, d'autorisation, de
validation et d'immuabilité restent distinguées en 403, 400 et 409
(`server/api/projects.post.ts`, `server/api/projects.put.ts`,
`server/utils/projectPublication.ts`).

## Vérifications réussies

- Préflight de production en lecture seule : 12 projets ; aucune étude publiée
  sans approbation, aucune étude approuvée publiée et aucun brouillon portant une
  approbation. La migration n'entraîne donc ni réécriture ni dépublication.
- `npm run test:db` via Portly : 6 fichiers pgTAP, 123 assertions, succès ; lint
  SQL et conseiller de sécurité sans erreur.
- `npm test` via Portly : 58 fichiers, 411 tests, succès.
- `npm run typecheck`, `npm run build`, `npm run quality:budgets` et
  `git diff --check` via Portly : succès.
- CI de la PR #63 : qualité, accessibilité, base de données, GitGuardian et
  aperçu Vercel réussis ; aucun contrôle en échec.
- Changelog Supabase vérifié le 5 septembre 2026 : aucun changement cassant
  applicable à cette migration, aux fonctions PostgreSQL ou aux privilèges RPC.
- Rollback : l'image de transition
  `3523993d107addab2765eaeebf39eea100149a93` comprend déjà le contrat requis par
  le RPC activé et reste l'unique image précédente compatible.

Max severity: none
Ship allowed: yes
