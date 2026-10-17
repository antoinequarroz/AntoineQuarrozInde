---
linear: https://linear.app/antoinequarroz/issue/ANT-42
status: in-progress
---

# Joindre les vidéos EnvVault aux brouillons Instagram

Autoriser une vidéo MP4 H.264 verticale seule, en conservant les carrousels existants. Sauvegarder ses médias ne modifie ni le texte, ni la date souhaitée, ni le statut et n'autorise aucun envoi. Le doublon sans date reste inchangé.

La validation de forme est cohérente entre UI, API et contrainte SQL additive. Le ratio 9:16 est accepté pour une vidéo seule ; les contraintes des carrousels restent identiques. Les fichiers gardent les limites de taille/durée, origine Storage et descriptions. L'empreinte existante continue de signer exactement les médias.

Le publisher distingue une vidéo seule (`REELS`) des carrousels. La capacité `instagram-reels-v1` est exigée avant lecture/claim d'un Reel, et annoncée seulement par le runner compatible et son moniteur. L'attente de traitement et l'interdiction de nouvel envoi après résultat ambigu sont conservées. Aucun post réel n'est publié pendant la recette.

## Vérification prévue

- Tests ciblés UI/API/SQL/Python avec services simulés : sauvegarde, relecture, isolation, version, consentement, capacités, ancien carrousel, Reel, traitement et résultat ambigu.
- Typage, build et CI existante ; promotion de migration par la CI avec sauvegarde chiffrée, sans modification SQL ad hoc en production.
- Déployer le runner compatible, puis vérifier les deux aperçus réels après téléversement. Contrôler les statuts À valider, dates et textes conservés.
- Sources de protocole : documentation Meta Instagram officielle (Reels publishing) ; documentation Supabase migrations et changelog consultés. Aucun nouveau droit Instagram ni appel Treg payant requis.

## Livraison

En cours. Aucun média réel enregistré ni publication autorisée à ce stade.
