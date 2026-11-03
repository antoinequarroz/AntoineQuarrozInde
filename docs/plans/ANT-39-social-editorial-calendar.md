---
linear: https://linear.app/antoinequarroz/issue/ANT-39
status: done
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

Livré le 17 octobre 2026 dans `/admin/social` par la [PR #281](https://github.com/antoinequarroz/AntoineQuarrozInde/pull/281), fusionnée sur `main` au commit `9f69a2b177cb3d43a753152eebd8b05ef9a2aca4`. L’accès au VPS est rétabli ; tous les contrôles du [run principal 39030602750](https://github.com/antoinequarroz/AntoineQuarrozInde/actions/runs/39030602750), déploiement et E2E compris, ont réussi. Ces notes de clôture ne changent aucun code de la version livrée.

## Preuves de contrôle

- Revue indépendante : isolation des organisations, CAS de version, consentement explicite et séparation `planned_at`/`publish_after` vérifiés. Corrections intégrées pour les saisies non enregistrées, les dialogues imbriqués, les compteurs et les dates invalides.
- Base jetable : 21 fichiers pgTAP, 302 assertions réussies ; contrôles lint/sécurité sans anomalie. Aucune migration distante appliquée pendant ces tests.
- Suite élargie : 991 tests Vitest réussis. Typecheck/build sur dépendances verrouillées propres, audit des 51 packages runtime sans vulnérabilité et budgets de bundle réussis.
- Parcours finaux locaux : 10/10 E2E réussis du premier coup, sur ordinateur et mobile, avec données simulées et sans modification de brouillon client. Historique complet, filtres combinés, dates personnalisées, consentement, navigation et aperçus des médias couverts.
- Vérifier les changements rapides de filtre et l’ouverture d’un brouillon : les mutations URL sont coalescées, interrompues si la navigation est annulée ou quitte la page. L’éditeur s’ouvre après l’URL pour que sa protection contre la perte de saisie n’annule pas son propre lien.
- CI de la PR entièrement réussie. Une mesure SEO ponctuelle sur la page cas clients a nécessité une seule reprise du job, sur le même code et sans modifier les seuils. Le lab strict local puis le lab de production ont réussi.
- Déploiement principal : migration additive avec sauvegarde de récupération chiffrée, version publique exacte vérifiée, application et base saines. La colonne `planned_at` est disponible (lecture `limit=0`, aucun contenu récupéré) ; l’API sociale privée refuse bien un appel sans authentification (401).
- E2E après déploiement : 69 tests réussis en 6,1 minutes, aucun échec ni reprise. Lab production conforme : LCP accueil 1 664 ms, développeur 776 ms, blog 1 420 ms, cas clients 1 272 ms ; CLS inférieurs à 0,003.
- Runner réel FRIDAY `c516d9932812` contrôlé en lecture seule : actif, local, toutes les cinq minutes, commande `python3 scripts/hermes/publish_social.py --project . --process-approved`, sans restriction globale à 18 h. Aucun lancement de mission ni envoi social déclenché pour les contrôles.
