---
linear: ANT-48
status: In Review
---

# Portfolio : grille et cartes 3D

Demande du 19 octobre 2026. Ajouter un choix Grille / Animation 3D, conserver les catégories et rendre les cartes plus informatives, sans toucher aux fiches ni aux liens privés.

## Direction visuelle

- Palette existante : blanc #ffffff, fond #080810, cartes #11111b, violet #7c3aed, accent #a855f7, texte secondaire #9ca3af.
- Space Grotesk pour les titres, Inter pour la lecture et les commandes.
- La 3D reste la vue initiale et la signature. Commande de vue sobre près des filtres. Grille alignée à gauche, 1 / 2 / 3 colonnes, images authentiques 16:10, titre, badges sourcés, extrait court, trois technologies et accès à la fiche.
- En 3D, garder les dimensions et la géométrie ; remplacer la fenêtre trop haute en `contain` par un cadrage 16:10 et utiliser le bas pour un extrait et trois technologies.

```
Catégories / compte               [Animation 3D | Grille]
Image réelle     Image réelle     Image réelle
Titre / badges   Titre / badges   Titre / badges
Extrait / outils Extrait / outils Extrait / outils
Voir la fiche    Voir la fiche    Voir la fiche
```

Critique du plan : les effets et décorations restent dans la 3D existante. La grille sert au repérage rapide, sans numérotation fictive, métrique inventée ni nouvelle animation d’entrée. Les extraits viennent des descriptions publiées et gardent leur langue réelle. Les classifications restent celles déjà vérifiées.

## Acceptation et contrôles

- Deux vues exclusives, état sélectionné et accès clavier explicites ; filtre et ordre partagés.
- Cartes complètes et lisibles, images différées et tailles adaptées à chaque vue.
- Mobile, mouvement réduit, thèmes clair/sombre et FR/EN/DE.
- Bascule depuis une sélection avancée sans perdre la commande ni sa position.
- Géométrie 3D et absence de liens privés préservées.
- Tests ciblés, typage, build, contrôle visuel avec les vrais projets, CI PR puis production et E2E.

## Livraison

Contrôles locaux : 22 tests unitaires ciblés, typage, build et budget JS réussis. Tous les parcours portfolio ont été vérifiés, dont les nouveaux contrôles grille/clavier/filtres/bascule en profondeur/mouvement réduit et la géométrie avec 17/21/30 projets. Contrôle visuel des 21 fiches publiques à 1440, 900 et 390 px réussi.

Un passage du scénario mobile a rencontré le blocage de transition Nuxt avant entrée sur l’accueil ; la trace montre les données chargées et l’ancienne page légale encore en sortie, sans erreur JS ni montage du portfolio. Le même scénario passe ensuite trois fois, sans reprise automatique ni changement de test. La CI complète reste requise.

Correction avant livraison : ancrage sur un repère hors `sticky` lors du changement de vue ou catégorie ; libellé Défilement pour mobile/mouvement réduit ; filtres sur une ligne horizontale en petit écran.

PR 296 fusionnée au commit `2dbd691498850c010d3f3e827b6bec944de7a678`. CI PR `39250438031` réussie (qualité, base, accessibilité, 14 parcours et 18 vérifications de la ligne de base). Le même commit est installé en production ; `/api/version` le confirme et `/api/health` confirme application et base saines.

Contrôle public effectué : 21 cartes en grille, zéro carte 3D montée dans cette vue ; filtre Mobile limité à trois projets ; retour 3D sur la même catégorie puis retour grille et rétablissement de Tous. Rendu de ZEDLINE enrichi vérifié et captures publiques conservées dans le dossier privé de livraison.

Run main `39251423577` terminé avec succès : qualité, base, SEO, déploiement et E2E. Les 91 tests navigateur passent (10,1 min), puis les trois répétitions du parcours de planification mobile passent (23,8 s). Accessibilité validée dans la CI PR ; job main ignoré conformément au workflow. Vérification finale de la version et de la santé publique réussie le 19 octobre 2026 à 14:54 Europe/Zurich. Aucun contenu CMS, publication sociale ou accès privé modifié.


## Ajustement demandé à 15:11

Antoine préfère les choix centrés, comme dans la version précédente. Recentrer les catégories sur la première ligne et Animation 3D / Grille sur une deuxième ligne compacte. Retirer la grande surface pleine largeur et les alignements gauche/droite. Garder la charte, les cibles de 44 px, le repère hors sticky, les filtres et les deux vues. Sur mobile, le groupe de catégories garde son défilement horizontal lorsque nécessaire.

Changement de classes de présentation uniquement ; aucun nouveau comportement ni test permanent ajouté pour cette correction visuelle. Vérifier le centrage des deux groupes sur 1440 et 900 px, le rendu 390 px, puis les parcours de bascule existants et les gates habituelles.

Validation locale de cet ajustement : typage et build réussis ; centrage des deux groupes mesuré à moins de 1 px du centre sur 1440, 900 et 390 px ; aucun débordement horizontal de page ; contrôle visuel réel réussi. Les quatre parcours existants de filtre, bascule clavier, bascule en profondeur et mouvement réduit passent sans reprise automatique (12,4 s). Un incident de transition avant entrée sur l’accueil a été observé immédiatement après le scénario temporaire de capture, comme lors du contrôle précédent ; les tests existants n’ont pas été modifiés et passent lorsqu’exécutés seuls. Revue indépendante : aucun blocage. Aucun nouveau test permanent pour les trois lignes de classes modifiées.

Les gates PR, déploiement et E2E de cette correction restent ouvertes.
