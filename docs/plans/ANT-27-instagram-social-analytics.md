---
linear: ANT-27
linear_url: https://linear.app/antoinequarroz/issue/c9dd2f08-8776-4387-8baa-f9428d39a469
validated: yes
validated_at: 2026-10-14
status: in_review
---

# Instagram sur le site et analyse des réseaux

Antoine a autorisé le raccordement du compte Instagram déjà connecté à Hermes/Postmelo à la rubrique Réseaux sociaux du site. La rubrique Analyses doit aussi présenter les résultats sociaux réellement accessibles. Aucun envoi automatique Instagram n’est autorisé.

## Résultat attendu

- [x] Statistiques Instagram privées, datées et accessibles dans Réseaux sociaux et Analyses ; collecte en lecture seule avec les deux scopes déjà accordés.
- [x] Réutiliser le collecteur privé Hermes déjà épinglé au compte/outil, avec requêtes Graph GET fixes et coût nul vérifié par reçu exact ; aucun nouveau secret Treg sur le site ni repli payant.
- [x] Cache d’une heure, dernier relevé conservé en cas d’indisponibilité et valeurs inconnues distinctes d’un zéro confirmé.
- [x] Brouillons Instagram du studio importés une seule fois avec une clé stable. Aucun texte corrigé ni statut existant remplacé lors d’une reprise.
- [x] Validation du texte Instagram possible, publication manuelle et exclusion explicite du processeur de publications automatiques. LinkedIn et X inchangés.
- [x] Vue sociale pour les trois réseaux connus ; statistiques natives LinkedIn/X indiquées indisponibles tant qu’un accès adapté n’est pas connecté. Résultats mesurés sur le site via PostHog affichés avec leur période propre.
- [ ] Tests d’isolation, d’idempotence, d’absence d’envoi, de reçus et d’état d’erreur ; checks du dépôt et preuve de livraison.

## Mise en œuvre

1. Migration additive : snapshots privés par organisation, support de brouillons Instagram et garde au niveau de la RPC de publication.
2. Synchronisation du relevé Hermes/Postmelo vers un cache privé du site. La collecte dépend du Mac ; le dernier relevé reste consultable lorsqu’il est hors ligne, avec son âge clairement affiché. Ce choix évite une seconde collecte et un nouveau stockage du secret Treg.
3. Import de brouillons du studio par une route Hermes authentifiée ; l’identifiant de source prévaut sur le contenu pour éviter toute réécriture.
4. Panneau social réutilisé dans Réseaux sociaux et Analyses, validation Instagram distincte de l’autorisation de publier.
5. Vérification locale, PR, revue, CI et livraison via le processus existant ; contrôle réel du compte et des brouillons sans publier.

## Contraintes

- Plafond Treg existant : 1 USD/semaine ; les lectures Instagram ici restent gratuites.
- Période native Instagram : quatorze jours complets Europe/Zurich ; les abonnés sont une valeur actuelle, pas une croissance mesurée.
- Aucune addition des visiteurs uniques entre canaux, ni comparaison de métriques natives de sens ou période différents.
- Données et secrets jamais accessibles à une autre organisation ou à une route publique.
- Les vidéos restent dans le studio ; le raccordement du brouillon n’envoie rien à Instagram.

## Preuves

Ticket créé avant toute implémentation applicative, après recherche de doublon dans Linear.

- PR https://github.com/antoinequarroz/AntoineQuarrozInde/pull/258 fusionnée le 15 octobre 2026 ; livraison candidate `232fe045f5cd8133793bdbd6af5bf06ba500505a`.
- CI de PR : qualité, accessibilité, migrations/base et SEO réussis (run 38587171513).
- Test navigateur ciblé : 1 scénario réussi, incluant validation explicite du texte sans envoi et disposition mobile ; données simulées pour les mutations du test.
- Docker relancé avec accord explicite ; lecture réelle du studio rétablie, compte attendu, coût nul, zéro erreur, trois brouillons.
- Synchronisation Portly `srv_085c946e` active ; copie privée du script dans HermesCockpit/studio-video, indépendante du worktree. Actualisation lorsque le Mac et le studio sont actifs.
- Livraison publique vérifiée au SHA `232fe045` ; sauvegarde chiffrée et migration réussies. Tests E2E globaux de production encore en cours.
- Import réel : HTTP 200, un relevé privé du compte attendu, trois brouillons statut `draft`, version 1, aucune programmation. Deux reprises réelles : zéro insertion supplémentaire.
- Requête PostHog réelle : HTTP 200 pour les trois réseaux. Isolation vérifiée avec le compte administrateur de test, sans accès au relevé de l’organisation principale.
- Correctif du connecteur local : les aperçus avec emojis respectent les 300 unités UTF-16 du validateur web ; les légendes complètes des brouillons restent inchangées. Régression Python et contrôle réel réussis.
