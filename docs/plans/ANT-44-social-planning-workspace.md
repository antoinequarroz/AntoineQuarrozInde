---
linear: ANT-44
status: in-review
---

# Un espace de planification qui reste utilisable

La liste des publications sans date étire actuellement toute la page et mélange les brouillons avec les contenus refusés. Le calendrier devient une grande zone vide quand on parcourt cette liste.

## Choix de design

- Conserver les tokens de l’admin : fond #090910, surfaces #111118 et #181821, texte #f9fafb, accent violet #7c3aed et #c4b5fd.
- Garder Space Grotesk pour les titres et la police actuelle pour les contenus ; textes alignés à gauche.
- Calendrier à gauche, panneau de 20rem à droite sur grand écran. En dessous, le panneau utilise toute la largeur. Liste à hauteur bornée et défilement interne ; en-tête et accès aux refusés restent visibles.
- Cartes compactes avec une rangée d’actions explicites Déplacer / Supprimer, en dehors du bouton qui ouvre l’aperçu. Restaurer est disponible dans les refusés.
- Le nombre « À planifier » décrit les contenus actifs sans date. Les refusés restent accessibles avec leur filtre.

Le design répond au problème de navigation et garde les repères existants. Pas de nouveau tableau de bord ni de décoration supplémentaire.

## Suppression récupérable

Réutiliser le refus réversible existant, avec un dialogue qui explique que le texte et les médias sont conservés dans Refusés. Réserver cette action directe aux brouillons et échecs. Ne supprimer aucune ligne ni média ; les clés stables empêchent la régénération des brouillons écartés. Les contrôles de version, d’organisation et de consentement restent en place.

## Critères de livraison

- [x] La liste de 44 éléments ne détermine plus la hauteur du document ; le dernier reste atteignable.
- [x] Les refusés ne gonflent plus le compteur opérationnel ; leur restauration reste accessible.
- [x] Déplacer et Supprimer sont disponibles sans ouvrir la carte, au clavier et sur mobile.
- [x] Annulation, conflit 409 et états protégés ne retirent aucun brouillon par erreur.
- [x] Les parcours de déplacement et les filtres existants fonctionnent.
- [x] Aucun accord, envoi social ou suppression de données réelles pendant la vérification.
- [x] Typecheck, tests ciblés, revue et vérification visuelle responsive terminés.
- [ ] Livraison vérifiée dans l’admin.

## Preuves locales

105 tests ciblés (API existante, consentement, dates et déplacements) passent ; typage réussi. Les 17 E2E existants (drag natif, historique paginé, filtres, dates, PDF, images et vidéos) passent sans reprise. Les quatre nouveaux scénarios passent sans reprise sur le code final : 44 actifs et 42 refusés, hauteur bornée à 1700/1440/375px, dernier élément accessible, suppression annulable, restauration sans consentement, conflit409 avec focus et Échap, déplacement clavier à18h suisse. Tous les appels passent dans une fixture isolée qui bloque les mutations inconnues.

La revue indépendante confirme les actions non imbriquées, l’accessibilité du scroll et le passage des événements natifs de drag. Les captures locales sont sous `.artifacts/ant44/`. Le filtre global Tous les statuts conserve son sens pour l’historique ; seuls le panneau opérationnel et son compteur excluent les refusés par défaut. CI, déploiement et lecture de l’admin en production restent à confirmer.

Le premier passage CI a validé qualité, base et SEO mais a révélé un retour de focus instable sur mobile après Échap. Le bouton déclencheur est maintenant capturé directement depuis l’événement de clic avant sa désactivation, puis refocalisé et remis dans la zone visible après la fermeture de la boîte et le nettoyage du fond inerte, sauf changement de route ou ouverture d’une autre boîte. Le contrôle final conserve l’exigence de visibilité et ajoute une vérification du focus effectif. Les quatre scénarios passent à nouveau, ainsi que trois répétitions consécutives du parcours mobile, sans reprise automatique.

Le contrôle Linux a ensuite isolé le défilement : le focus était correct, mais le défilement automatique héritait du mode doux du site. La restauration utilise désormais explicitement `behavior: 'instant'`. Le test mobile immobilise l’horloge avant la seconde boîte pour vérifier que le retour du focus et de la position ne dépend pas d’une animation. Le typage et les quatre scénarios ainsi renforcés passent.
