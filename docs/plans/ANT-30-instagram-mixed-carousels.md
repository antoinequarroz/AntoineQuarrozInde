---
linear: ANT-30
status: in-review
---
# Carrousels Instagram mixtes

Permettre la préparation, l’aperçu et la publication après validation explicite d’un carrousel Instagram ordonné mêlant JPEG et MP4. Conserver le fonctionnement des images LinkedIn/X, des PDF et des anciens brouillons.

- Stockage vidéo dédié, fichiers immuables, limites de taille et validation réelle MP4 par ffprobe.
- Modèle additif `media_items` avec type explicite ; empreinte de validation couvrant types, ordre, URL et descriptions. Tout changement annule l’autorisation précédente.
- Galerie accessible avec aperçu vidéo sans lecture automatique, réorganisation et sauvegarde explicite ; confirmation des médias avant publication.
- Transport Hermes compatible, contrôle de capacité, validation avant prise atomique et attente du traitement de tous les enfants Instagram.
- Joindre au brouillon Instagram PhysioBaur existant les six médias approuvés : image, vidéo ordinateur, image, vidéo mobile, témoignage, appel à l’action. Conserver texte, statut brouillon et mode manuel ; ne rien publier.

## Vérification et livraison

Tester les limites, formats réels, empreintes, concurrence et isolation ; transports simulés sans appels de publication ; parcours E2E des six médias sur ordinateur et mobile. Installer ffprobe et le transport compatible avant de proposer l’approbation des médias mixtes. Déployer puis vérifier le brouillon réel et ses six médias dans l’administration.

Ticket : https://linear.app/antoinequarroz/issue/ANT-30/gerer-les-carrousels-instagram-mixtes-images-et-videos

## Preuves locales

- 880 tests unitaires réussis (144 fichiers), 293 contrôles SQL sur base éphémère ; types, build, budgets et audit du serveur réussis.
- 37 tests de transport Python et 4 tests du moniteur Hermes réussis, sans publication réelle.
- 3 scénarios navigateur hermétiques réussis : six médias sur mobile, modification/téléversement/sauvegarde versionnée, descriptions obligatoires et maintien du focus clavier. Aucune approbation pendant l’édition.
- Les deux MP4 PhysioBaur sont réellement analysés : 1080 × 1350, H.264/yuv420p, 30 images/s, 7 et 6 secondes ; faux MP4 rejeté.
- Livraison en cours : contrôles CI, promotion de migration avec sauvegarde chiffrée, déploiement et rattachement au brouillon existant.
