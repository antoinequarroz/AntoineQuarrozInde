---
linear: https://linear.app/antoinequarroz/issue/ANT-39
status: in_review
---

# Calendrier éditorial social

## Résultat attendu

Dans `/admin/social`, voir une semaine ou un mois de publications, filtrer par réseau/statut/format et rechercher un contenu. Sur mobile, lire un agenda chronologique. Garder les contenus sans date dans « À planifier ». Ouvrir un post dans un éditeur avec aperçu, médias existants et date personnalisée. Conserver les filtres dans l’URL et donner accès à l’historique paginé complet, refusés compris.

## Design

Conserver le vocabulaire et les tokens de l’admin : fond clair ou sombre, violet pour l’action principale, typographie `font-display` aux titres et police de texte existante. Le calendrier et ses miniatures constituent la vue principale ; connexions en résumé repliable, analyses via leur page. Cartes compactes par réseau, date et statut explicites, panneau d’édition centré sur un seul post avec aperçu à droite sur grand écran. Agenda empilé sur mobile. Aucun glisser-déposer nécessaire pour une première version accessible au clavier.

## Dates et autorisation

- `planned_at` nullable représente uniquement une intention éditoriale. La migration est additive et ne change aucun post existant.
- `publish_after` reste la date autorisée explicitement avec la version et l’empreinte existantes ; le publisher ne lit jamais `planned_at`.
- Enregistrer une date souhaitée concerne uniquement `draft`/`failed`, via CAS de version. Les statuts/consentements restent inchangés. Un post approuvé doit d’abord être restauré en brouillon, ce qui révoque son autorisation.
- La programmation personnalisée reste une confirmation explicite du texte et des médias, datée en Europe/Zurich. Le serveur valide un ISO avec fuseau et une date future ; les anciens clients gardent le prochain 18 h.
- Conversion des saisies locales avec rejet des dates impossibles, heures inexistantes et heures ambiguës aux changements d’heure. Aucune dépendance au fuseau de la machine.

## Vérification

Tests ciblés dates/DST, filtres invalides, pagination et permissions d’organisation ; API de planification sans approbation ; confirmations personnalisées et garde-fous des médias existants. Parcours E2E entièrement simulés, historique au-delà de 100 entrées, persistance des filtres/dates, annulation du consentement, aperçus image/PDF/carrousel mixte et mobile sans débordement. Typecheck/build, suite complète, revue indépendante, CI, migration contrôlée et vérification de la version déployée. Aucun envoi social réel ni modification de brouillon client durant les contrôles.

## Livraison

Branche `codex/social-editorial-calendar`, [PR #281](https://github.com/antoinequarroz/AntoineQuarrozInde/pull/281), issue ANT-39 en revue. L’accès au VPS est rétabli le 17 octobre à 13 h 34 Europe/Zurich : santé application/base et accès SSH réussis, checkout de déploiement propre. La mise en ligne ne sera déclarée réussie qu’après passage des contrôles CI et vérification de la version publique.

## Preuves de contrôle

- Revue indépendante : isolation des organisations, CAS de version, consentement explicite et séparation `planned_at`/`publish_after` vérifiés. Corrections intégrées pour les saisies non enregistrées, les dialogues imbriqués, les compteurs et les dates invalides.
- Base jetable : 21 fichiers pgTAP, 302 assertions réussies ; contrôles lint/sécurité sans anomalie. Aucune migration distante appliquée pendant ces tests.
- Suite élargie : 991 tests Vitest réussis. Typecheck/build candidat sur dépendances verrouillées propres, audit des 51 packages runtime et budgets de bundle réussis. Parcours navigateur et CI sur la version finale en cours, sans aucun envoi social réel.
- Vérifier les changements rapides de filtre et l’ouverture d’un brouillon : les mutations URL sont coalescées, interrompues si la navigation est annulée ou quitte la page. L’éditeur s’ouvre après l’URL pour que sa protection contre la perte de saisie n’annule pas son propre lien.
