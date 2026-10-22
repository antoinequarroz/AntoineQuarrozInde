---
linear: ANT-49
---

# Vidéos LinkedIn dans les brouillons

Permettre de joindre une vidéo MP4 seule, de la relire dans l’aperçu, de la remplacer ou de la retirer. Réutiliser le stockage et les vérifications H.264 existants (20 Mo, 3–60 secondes). Ne modifier ni le texte ni la date souhaitée lors d’un enregistrement des médias ; retirer toute autorisation d’envoi.

Les vidéos LinkedIn restent en publication manuelle : validation explicite de l’ensemble dans l’admin, garde serveur et contrainte SQL excluant les publications automatiques, et exclusion des runners Hermes. Les images/PDF LinkedIn et les Reels/carrousels Instagram gardent leur fonctionnement.

Joindre ensuite l’export AventureTime AQ 4:5 identifié dans le dossier de livraison, via une copie compressée conservant la source, la durée, les dimensions et le flux audio. Conserver le brouillon à valider, sans programmation ni publication.

## Vérification et livraison

- Tests validation médias et API (organisation, version, types et consentements).
- SQL : vidéo LinkedIn seule, aucun mélange, refus d’approbation automatique ou de claim.
- Parcours navigateur desktop/mobile : ajout, remplacement, échec conservant la vidéo précédente, retrait, aperçu et confirmation manuelle.
- Typage, build et gates CI existants.
- Migration et déploiement, puis téléversement et lecture réelle du brouillon AventureTime ; texte identique, vidéo lisible, consentements absents.

## Preuves disponibles avant livraison

- 45 tests serveur ciblés et typage passent.
- 4 parcours navigateur passent sur ordinateur/mobile, dont ajout, remplacement échoué puis réussi, retrait et validation manuelle laissée non cochée.
- Les 1 080 tests unitaires sont vérifiés : les tests de sauvegarde/promotion dépendant de `sha256sum` passent avec un adaptateur temporaire vers `shasum -a 256` de macOS. Le build de production et 12 parcours navigateur médias sur ce build passent. Les contrôles CI de qualité, d’accessibilité et de base isolée ont réussi sur le premier commit.
- Le harnais de navigation publique attend le chargement initial et trois frames stables avant le lien d’accueil, puis le rendu de destination sous 15 secondes : la première réponse API peut précéder les autres données. Les fixtures du portfolio interceptent le runtime WebGL tiers, couvert séparément, et choisissent le carrousel au clavier sans exposer d’abord la grille au chargement différé des images. Les scénarios et assertions restent inchangés ; les traces du candidat sont conservées en cas d’échec. Le résultat CI de reprise est suivi dans ANT-49.
- Le suivi des gates CI, de la mise en production et du rattachement réel est conservé dans [ANT-49](https://linear.app/antoinequarroz/issue/ANT-49/gerer-les-videos-linkedin-dans-les-brouillons-sociaux).
