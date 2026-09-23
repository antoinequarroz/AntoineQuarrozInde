---
ticket: AQ-PROJ-010
linear: ANT-24
validated: yes
validated_at: 2026-09-23
---

# AQ-PROJ-010 — Ajouter la catégorie Logiciel

## Critères d'acceptation

- « Logiciel » apparaît parmi les filtres des projets récents lorsqu'au moins
  un projet publié utilise cette catégorie.
- L'administration permet de créer ou modifier un projet avec cette catégorie.
- Le serveur et PostgreSQL acceptent `software` et continuent de refuser toute
  valeur inconnue.
- Les libellés et introductions existent en français, anglais et allemand.
- Hermes Cockpit passe de `mobile` à `software`; aucun autre projet n'est
  reclassé sans preuve claire.

## Plan

- [x] Étendre le contrat applicatif fermé dans les types, la validation serveur,
  le formulaire admin et le filtre public. Fichiers attendus : types, payload,
  projets admin, PortfolioSection et tests ciblés. Ne pas élargir à une valeur
  libre. Validation : tests unitaires et typecheck.
- [x] Ajouter les traductions FR/EN/DE actives et leurs copies compatibles,
  avec une introduction adaptée au carousel. Validation : parsing des catalogues
  et test de couverture i18n.
- [x] Créer une migration Supabase via la CLI pour remplacer uniquement la
  contrainte de catégorie et reclasser Hermes Cockpit de façon bornée. Mettre à
  jour `schema.sql` et ajouter un test pgTAP. Ne pas toucher aux RLS, privilèges
  ou autres projets. Validation : suite DB locale via Portly.
- [x] Vérifier le parcours complet, le build et les budgets, inspecter le diff
  et documenter les preuves. Aucun déploiement ou accès production dans ce
  ticket sans validation séparée.

## Traçabilité

- Recherche : `docs/research/AQ-PROJ-010.md`
- Linear : `ANT-24`

## Preuves locales

- 14 tests ciblés passés via Portly (`tmp_2eefccc3`).
- Suite complète : 714 tests passés. Le premier typecheck a détecté l'absence
  de couleur `software` sur le dashboard admin ; correction appliquée, puis
  typecheck et `git diff --check` passés via Portly (`tmp_f97f08b0`).
- Build et budgets passés via Portly (`tmp_a2a4fff3`) : 96 chunks, 1 873 914
  octets, plus gros chunk 411 763 octets, scène robot 1 010 718 octets.
- Test DB local bloqué avant exécution : Docker Desktop n'est pas démarré
  (`Cannot connect to the Docker daemon`). La migration et son pgTAP devront
  passer dans le job CI `database` avant toute livraison.
- PR brouillon `#169` : les jobs CI `quality`, `database`, `accessibility`,
  `seo-quality` et GitGuardian sont passés sur le commit `8252f74`. Les jobs de
  déploiement et E2E authentifié sont volontairement ignorés sur une PR.
