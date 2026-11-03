---
linear: ANT-47
status: In Review
---

# Clarifier la fiche portfolio

Demande du 19 octobre 2026 : une fiche descriptive unique, des cartes 3D centrées sur les captures et les badges « Projet client », « Projet personnel » et « En développement ». Garder l’animation existante.

## Périmètre

- Conserver les dimensions, la géométrie responsive, les filtres, la navigation, le mouvement réduit et les images différées.
- Une description dans la fiche principale, sans bloc de preuves redondant. Cartes centrales illustrées avec titre compact.
- Badges distincts pour nature et maturité, visibles aussi sur mobile et en mouvement réduit.
- Registre éditorial explicite, sourcé par slug ; aucune déduction depuis un client absent, une technologie ou une URL. Aucun accès aux données internes ni migration.
- Traduire les nouveaux libellés FR/EN/DE.
- Aucun changement de visibilité ou de statut d’étude de cas, aucune publication sociale.

## Validation

- Tests de classification et repli sans métadonnées.
- Parcours E2E desktop, mobile et mouvement réduit ; absence de description répétée, liens conservés et badges lisibles.
- Géométrie et chargement différé existants conservés.
- Revue indépendante, contrôle visuel, CI et déploiement normaux avant clôture.

## Évidence

- Création du ticket ANT-47 avant l’implémentation ; statut In Progress.
- Base propre origin/main `689e9643cdf9cc27b54d567a6518912274807271` ; checkout principal inchangé.
- Skills appliqués : better-ui, better-writing ; Portly pour les travaux bornés et prévisualisations.
- Tests ciblés de classification, géométrie et langues, typage et build réussis (`tmp_72716382`). Résumé principal limité à cinq lignes après la revue indépendante ; nouveau build réussi (`tmp_765d7879`).
- Les dix parcours portfolio passent sans reprise sur le candidat de production local : images différées, filtres, navigation, liens privés absents, badges desktop/mobile/mouvement réduit, géométrie 17/21/30 projets à 768/900/1280/1440 px (`tmp_54c3d3b5`). Le nouveau jeu de données de badges contient une carte de garde pour ne pas demander un centrage impossible au bord du carrousel ; les assertions de séparation existantes restent intactes.
- Contrôle visuel séparé avec les 21 fiches publiques, sur ordinateur et mobile (`tmp_a739a587`, un parcours réussi). Captures conservées hors dépôt dans `/tmp/portfolio-presentation-20261019/`. Aucun accès CRM ou changement de données.
- Revue indépendante : provenance, traductions, accessibilité des libellés, confidentialité et absence de modification de la boucle 3D contrôlées. Recommandation de résumé borné appliquée.
- CI et livraison normale encore à terminer ; statut In Review.
