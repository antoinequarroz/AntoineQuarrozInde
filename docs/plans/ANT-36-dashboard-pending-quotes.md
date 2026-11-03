---
linear: https://linear.app/antoinequarroz/issue/ANT-36
status: in_review
---

# Devis en attente de décision

Relier la carte aux devis envoyés via `status=sent`, avec le même prédicat pour la carte et la liste. Conserver la règle existante : aucune exclusion selon le montant ou la date de validité.

Le filtre suit l’URL au clic, au rechargement et en navigation. La remise à zéro conserve les paramètres utiles et efface la sélection explicite ; aucun détail hors résultats ne doit rester visible. Les liens directs vers un devis restent utilisables quand le devis correspond au filtre.

Validation : tests des statuts, des dates de validité et des paramètres invalides ; parcours E2E avec données de lecture simulées ; typecheck, compilation, CI et contrôle du site dans Dia. Aucun document, statut ou envoi client modifié.

## Vérification locale

Les 909 tests existants et les 4 nouveaux tests du filtre réussissent. Typecheck et compilation réussis. Revue indépendante sans blocage ; sélection après suppression alignée sur les résultats filtrés. Le scénario E2E simule les lectures de devis et interdit leurs mutations : clic, rechargement, remise à zéro, retour et `quoteId` hors filtre.

CI, livraison et contrôle dans Dia à terminer.
