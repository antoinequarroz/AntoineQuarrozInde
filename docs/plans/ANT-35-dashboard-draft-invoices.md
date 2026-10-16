---
linear: https://linear.app/antoinequarroz/issue/ANT-35
status: done
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

## Livraison du 16 octobre 2026

La PR #275 est fusionnée dans `main` sous `99eead4d48110de84e13201c2e06c527f0d74500`. Les 909 tests Vitest, le typecheck et la compilation réussissent. Le run [38948682171](https://github.com/antoinequarroz/AntoineQuarrozInde/actions/runs/38948682171) a validé qualité, base de données, SEO, déploiement et suite E2E de production. Les contrôles d’accessibilité de la PR sont également réussis.

La version publique et la santé de l’application et de la base sont vérifiées. Dans Dia, le clic de la troisième carte ouvre `status=outstanding-30-days`, conservé après rechargement. Le retour à « Tous statuts » rétablit la liste complète ; resélectionner le filtre retire les documents hors période et leur détail. Aucun document client modifié.

Le premier déploiement a échoué faute d’espace disque et le rollback automatique a gardé le site sain. Le cache BuildKit inutilisé et 16 anciennes images du site sans tag ni conteneur référent ont été retirés. Les images actives/taguées et les deux versions récentes de secours sont conservées, ainsi que tous les volumes et toutes les données. La reprise de déploiement a réussi ; environ 2 Go restent libres.

Suivi opérationnel distinct : le flux CI actuel ne gère pas la rétention des anciennes images. Envisager un seuil disque avant construction et une rétention ciblée du site, sans purge globale des autres applications.
