---
linear: https://linear.app/antoinequarroz/issue/ANT-36
status: done
---

# Devis en attente de décision

Relier la carte aux devis envoyés via `status=sent`, avec le même prédicat pour la carte et la liste. Conserver la règle existante : aucune exclusion selon le montant ou la date de validité.

Le filtre suit l’URL au clic, au rechargement et en navigation. La remise à zéro conserve les paramètres utiles et efface la sélection explicite ; aucun détail hors résultats ne doit rester visible. Les liens directs vers un devis restent utilisables quand le devis correspond au filtre.

Validation : tests des statuts, des dates de validité et des paramètres invalides ; parcours E2E avec données de lecture simulées ; typecheck, compilation, CI et contrôle du site dans Dia. Aucun document, statut ou envoi client modifié.

## Vérification locale

Les 909 tests existants et les 4 nouveaux tests du filtre réussissent. Typecheck et compilation réussis. Revue indépendante sans blocage ; sélection après suppression alignée sur les résultats filtrés. Le scénario E2E simule les lectures de devis et interdit leurs mutations : clic, rechargement, remise à zéro, retour et `quoteId` hors filtre.

La [PR #276](https://github.com/antoinequarroz/AntoineQuarrozInde/pull/276) a passé qualité, base, accessibilité, sécurité et SEO avant fusion. Elle est fusionnée sous `59c1dcc40253c3bf4fc67c31cfddba9647105cfe`. Le [run principal 38955652328](https://github.com/antoinequarroz/AntoineQuarrozInde/actions/runs/38955652328) est entièrement réussi : qualité, base, SEO, déploiement et suite E2E de production.

Préparation de livraison : huit anciennes images du site, sans tags ni conteneur référent et avec `APP_VERSION` validé dans Git, ont été retirées pour préserver la marge disque. Images actives/taguées, deux versions de secours récentes et tous les volumes/données conservés ; 2,8 Go libres avant construction. Aucun nettoyage des autres applications.

## Contrôle public

La version `59c1dcc40253c3bf4fc67c31cfddba9647105cfe` est publique, avec application et base saines. Dans Dia : lien de carte vers `status=sent`, filtre « Envoyé », maintien au rechargement, remise à zéro sans paramètre `status`, puis resélection vérifiés. Les devis hors filtre et leur aperçu disparaissent correctement. Aucun document client modifié. Tous les critères et contrôles de livraison sont validés.
