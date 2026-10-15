---
linear: ANT-31
status: In Review
---

# PhysioBaur : visuels LinkedIn et X

Remplacer les anciens médias clairs par les visuels sombres validés. LinkedIn reçoit le PDF de six pages carrées et X le JPEG 1600 × 900. Les textes et le brouillon Instagram restent intacts. Aucune validation, programmation ou publication sociale.

Corriger l'aperçu PDF pour afficher le nombre réel de pages sans recadrage, via un manifeste de prévisualisation local au document. Préserver l'ancien carrousel de sept pages.

Livraison : médias publics contrôlés par empreinte, modification atomique avec contrôle de version et audit, test du manifeste et de l'aperçu, CI requise, déploiement et vérification réelle dans Dia. Tous les brouillons restent manuels, sans approbation ni date de publication.

## Vérifications locales

- 16 tests ciblés passent : manifeste six/sept pages, données invalides, annulation et résultats obsolètes.
- Types validés. Trois scénarios navigateur passent en 8,3 s sans reprise : six pages carrées en mobile, manifeste absent et image absente avec accès au PDF conservé. Aucun write durant ces tests.
- PDF contrôlé : six pages 1080 × 1080, SHA-256 695380bce53558c5dfe32918f04173375431017539ac4591a87385d26e36a33a.
- X joint au brouillon existant, version 3, légende identique et aucune approbation/date. Instagram intact, version 3.
- CI, déploiement et recette réelle LinkedIn restent ouverts.
