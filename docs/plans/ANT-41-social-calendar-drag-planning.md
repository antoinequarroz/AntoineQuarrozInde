---
linear: https://linear.app/antoinequarroz/issue/ANT-41
status: in_review
---

# Déplacer les brouillons du calendrier

## Périmètre

Glisser un brouillon depuis le calendrier semaine/mois ou « À planifier » vers un jour, ou retirer sa date en le déposant dans « À planifier ». Les statuts `draft` et `failed` seuls sont modifiables. Les contenus validés, en cours, publiés ou refusés ne se déplacent pas.

Réutiliser l’API de planification avec la version capturée au début du geste. Conserver l’heure/minute Europe/Zurich, ou utiliser 18 h pour un brouillon sans date ; refuser les heures DST absentes ou ambiguës. Même jour = aucune écriture. Déplacer la carte uniquement après succès du serveur ; sur erreur/conflit, conserver sa position et demander l’actualisation. Aucun changement de texte, média, consentement ou `publish_after` ; aucune publication implicite.

Sur mobile et au clavier, proposer un bouton « Déplacer » qui ouvre un choix de date accessible, avec annulation et retrait du calendrier. Le défilement tactile habituel reste disponible. Indiquer la cible du drag, l’enregistrement et le résultat. Ignorer les dépôts externes, annulations et gestes commencés pendant une édition/validation/enregistrement.

## Vérification

Tests ciblés dates/DST/statuts, E2E isolés avec auth et API simulées (drag natif, date/heure/version, échec, annulation, origine externe, mobile/clavier), régression des parcours existants, revue indépendante, typage/build/budgets. CI puis déploiement et contrôle de version publique, sans déplacer ni publier de brouillon client pour les tests. Aucune migration ou nouvelle permission nécessaire.

## État des contrôles

- 103 tests ciblés réussis. Typage, build final et budgets réussis : 100 chunks, 2 110 760 octets ; scène robot 1 010 718 octets.
- 15 E2E sociaux réussis sans reprise sur le build final, dont les 5 nouveaux : vrai drag natif depuis le bord et le titre (`trusted=true`), même jour sans écriture, retrait vers « À planifier », heure suisse/DST/version, persistance pessimiste, conflit 409, dépôt externe ignoré, Échap, mobile/clavier et statuts protégés. Les aperçus PDF et carrousels existants restent fonctionnels.
- Le helper E2E résout les positions de défilement avant la pression de souris, puis simule un geste progressif réel. Il évite que `Locator.dragTo` déplace la source en faisant défiler la cible après la pression ; aucun événement de réussite n’est synthétisé.
- Revue indépendante : actualisation bloquée pendant l’écriture, message prudent si la réponse réseau est perdue, protection contre une navigation tardive qui annulerait le départ de page. Le déplacement n’appelle que l’action `plan`, sans consentement de publication.
- Les nouveaux E2E isolés font partie de la vérification obligatoire des pull requests.
- Revue finale indépendante : aucun P1/P2 restant. CI et déploiement encore à confirmer avant clôture.
