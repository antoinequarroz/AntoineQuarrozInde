---
linear: https://linear.app/antoinequarroz/issue/ANT-35
status: in_review
---

# Factures en brouillon

Afficher séparément les montants positifs des factures en brouillon, séparés par devise et hors avoirs. Conserver les deux indicateurs de créances et les autres cartes. Clarifier que les brouillons sont prévus, non émis. Ne modifier aucun document.

Validation : distinguer acompte émis et solde en brouillon ; passage du brouillon à envoyé sans double comptage ; exclusions, devises, tests, typecheck, compilation, CI et contrôle du tableau de bord déployé.

## Vérifications

904 tests Vitest réussis, typecheck Nuxt réussi. Compilation, contrôles CI et vérification publique à terminer avant clôture.

## Suivi : ouvrir les factures concernées

Relier les cartes Brouillons et Total à encaisser à des filtres dédiés, avec les mêmes critères que leurs montants. Conserver les filtres au rechargement et lors des changements de query ; permettre de revenir à toutes les factures. Éviter qu’un détail hors filtre reste affiché. Tester le clic, le rechargement et la navigation, sans modifier les documents.

Vérification du suivi : 907 tests Vitest et typecheck réussis. Les filtres URL utilisent les mêmes prédicats que les cartes ; un scénario E2E couvre les deux clics, le rechargement, la remise à zéro et le retour arrière. CI et livraison à vérifier.

## Suivi : échéances sous 30 jours

Ajouter la troisième carte au parcours filtré avec la même borne J+30 Europe/Zurich, inclusive et avec les impayés déjà en retard. Mutualiser les critères avec le montant, exclure les échéances absentes et J+31, et couvrir paiements, avoirs, rechargement et dates de changement d’heure/mois/année. Aucun document modifié.

Vérification du suivi 30 jours : tests Vitest, typecheck et compilation réussis ; revue indépendante sans blocage. CI et contrôle du filtre en production à terminer.
