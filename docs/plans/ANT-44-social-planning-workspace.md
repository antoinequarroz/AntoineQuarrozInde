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
- [x] Livraison vérifiée dans l’admin.
- [ ] Suite E2E complète après déploiement réussie.

## Preuves locales

105 tests ciblés (API existante, consentement, dates et déplacements) passent ; typage réussi. Les 17 E2E existants (drag natif, historique paginé, filtres, dates, PDF, images et vidéos) passent sans reprise. Les quatre nouveaux scénarios passent sans reprise sur le code final : 44 actifs et 42 refusés, hauteur bornée à 1700/1440/375px, dernier élément accessible, suppression annulable, restauration sans consentement, conflit409 avec focus et Échap, déplacement clavier à18h suisse. Tous les appels passent dans une fixture isolée qui bloque les mutations inconnues.

La revue indépendante confirme les actions non imbriquées, l’accessibilité du scroll et le passage des événements natifs de drag. Les captures locales sont sous `.artifacts/ant44/`. Le filtre global Tous les statuts conserve son sens pour l’historique ; seuls le panneau opérationnel et son compteur excluent les refusés par défaut. CI, déploiement et lecture de l’admin en production restent à confirmer.

Le premier passage CI a validé qualité, base et SEO mais a révélé un retour de focus instable sur mobile après Échap. Le bouton déclencheur est maintenant capturé directement depuis l’événement de clic avant sa désactivation, puis refocalisé et remis dans la zone visible après la fermeture de la boîte et le nettoyage du fond inerte, sauf changement de route ou ouverture d’une autre boîte. Le contrôle final conserve l’exigence de visibilité et ajoute une vérification du focus effectif. Les quatre scénarios passent à nouveau, ainsi que trois répétitions consécutives du parcours mobile, sans reprise automatique.

Le contrôle Linux a ensuite isolé le défilement : le focus était correct, mais le défilement automatique héritait du mode doux du site. La restauration utilise désormais explicitement `behavior: 'instant'`. Le test mobile immobilise l’horloge avant la seconde boîte pour vérifier que le retour du focus et de la position ne dépend pas d’une animation. Le typage et les quatre scénarios ainsi renforcés passent.

La géométrie CI a permis d’isoler le second niveau de défilement : bouton focalisé à y1329 pour un viewport812px, liste déjà à son défilement maximal, document à1182px sur1858 possibles. Le défilement imbriqué était donc correct, mais `scrollIntoView` n’amenait pas le document au bouton. Un ajustement instantané du viewport est maintenant appliqué seulement si le rectangle du déclencheur reste hors écran après le défilement interne, en tenant compte de la barre de navigation fixe. Typage et quatre scénarios locaux passent sur ce correctif, sans relâcher les assertions de focus ou de visibilité.

La trace native Linux a ensuite montré que le bouton était visible immédiatement après la restauration, puis que le document se déplaçait sans nouvel appel JavaScript : une animation native antérieure continuait. La restauration appelle donc toujours `window.scrollTo` en mode instantané, même avec un ajustement nul, afin d’annuler cette animation. Les quatre scénarios et trois répétitions supplémentaires du parcours mobile passent sans reprise, ainsi que le typage. Les exigences de focus et de visibilité restent inchangées.

## Livraison et recette réelle

PR288 fusionnée en `da7c5a64a448a3b6cc0a1a0fb87e31d638bedd9c`. Les contrôles qualité, base, SEO et accessibilité du head `4af62b3` sont réussis (run39156363193) ; les21 E2E sociaux et axe passent au premier passage. Le run main39156818539 a terminé son déploiement : version publique exacte et santé application/base confirmées, contrôles publics réussis. Sa suite E2E complète reste en cours.

Recette dans l’admin réel après connexion d’Antoine, en mode sombre à1700px et375px. Les44 éléments initiaux comprennent3 brouillons actifs et41 refusés ; le panneau et son compteur les distinguent désormais. Le dernier refusé est atteint au clavier dans la liste interne (`scrollTop6979` sur6979), sans modifier la hauteur du document1415px ni son défilement365,5px. Confirmation de retrait ouverte puis annulée sur ordinateur et mobile ; retour du focus au bouton visible, aucune mutation de contenu. Sur mobile, pas de débordement horizontal. Vue de test réinitialisée et calendrier laissé ouvert.

Captures réelles : `/Users/antoinequarroz/.codex/visualizations/2026/09/16/01a0ab24-dbb8-7223-8c89-8d74529e0ecf/planification-reseaux/` (`calendrier-en-ligne.png`, `refuses-defilement-en-ligne.png`, `mobile-en-ligne.png`). Aucun brouillon réel déplacé, retiré, restauré, validé ou publié. Serveur local de vérification3355 arrêté viaPortly, processus hors périmètre préservés.

Le run main39156818539 finit vert, mais avec79 réussites directes et1 test instable (retour mobile après déplacement puis annulation, deux reprises). Ce résultat ne clôture donc pas la stabilité demandée. La trace montre aussi la focalisation automatique de la carte déplacée hors écran avant le retrait. Le correctif complémentaire retire la double restauration automatique du dialogue Supprimer, empêche celle du dialogue Déplacer de lancer une animation et révèle instantanément la nouvelle carte. Les autres dialogues conservent leur comportement. Le test exige maintenant également que la carte déplacée soit dans le viewport, et le contrôle PR répète trois fois le parcours mobile sans autoriser de reprise.
