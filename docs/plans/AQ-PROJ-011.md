---
ticket: AQ-PROJ-011
linear: ANT-25
validated: yes
validated_at: 2026-09-23
---

# AQ-PROJ-011 — Stabiliser le portfolio filtré

## Critères d'acceptation

- Tous les filtres desktop conservent la même taille apparente, le même rayon
  et le même espacement de cartes que la sélection « Tous ».
- Les compteurs, la navigation et la progression reflètent uniquement les
  projets du filtre actif.
- Un changement de filtre ne conserve ni vitesse ni interpolation résiduelle.
- La cadence de défilement reste régulière avec une ou plusieurs cartes.
- Le carrousel horizontal mobile reste inchangé.

## Plan

- [x] Passer au carrousel le nombre total de projets comme densité visuelle de
  référence. Fichier attendu : `PortfolioSection.vue`. Ne pas modifier les
  données ni l'ordre des projets. Validation : test ciblé et typecheck.
- [x] Dissocier la géométrie de l'hélice du nombre de résultats filtrés et
  stabiliser la distance de défilement par transition. Fichier attendu :
  `ProjectHelixCarousel.vue`. Ne pas modifier le style ou l'animation mobile.
  Validation : tests ciblés et inspection visuelle desktop/mobile.
- [x] Réinitialiser l'état d'interpolation à chaque changement de filtre et
  ajouter une couverture de non-régression. Validation : Vitest, typecheck,
  build, budgets et scan Impeccable layout.

## Sécurité et retour arrière

- Aucun changement de schéma, RLS, API, dépendance ou route publique.
- Retour arrière : retirer le prop de densité et restaurer les calculs basés sur
  `projects.length`.

## Traçabilité

- Recherche : `docs/research/AQ-PROJ-011.md`
- Linear : `ANT-25`

## Validation

- `npm test` : réussi.
- `npm run typecheck` : réussi.
- `npm run build` : réussi.
- `npm run quality:budgets` : réussi.
- Scan Impeccable `layout` : aucun signal détecté.
- Inspection visuelle locale : géométrie identique entre « Tous », « Web » et
  « Mobile » sur desktop ; carrousel horizontal inchangé à 390 × 844 px.
