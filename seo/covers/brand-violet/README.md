# Couvertures violettes 037–041

Composition SVG originale dérivée de la proposition PhysioBaur violette validée : fond `#080810`, dégradé exact `#7c3aed → #a855f7 → #c084fc`, logo AQ, Space Grotesk 700 pour les titres et 500 pour les petits textes, robot transparent original et domaine en pied de page.

Les cinq dates et titres de référence proviennent de `seo/resources/editorial/briefs-2026-10-19.md`. La génération remplace uniquement les PNG 037–041. Les anciennes versions restent dans Git. Aucune modification de contenu, de publication ou de validation sociale n’est effectuée.

## Sources

- `build.py` : composition éditable, textes et positions, génération des sources SVG et des cinq PNG.
- `sources/` : calque SVG vectoriel de chaque couverture et recette de composition JSON ; la vidéo possède un calque SVG de contrôles au-dessus des images.
- `assets/SpaceGrotesk-VariableFont_wght.ttf` et `assets/OFL-SpaceGrotesk.txt` : police exacte et licence SIL OFL 1.1, reprises des actifs approuvés.
- `assets/robot-transparent.png` : robot original transparent, sans modification.
- `assets/affiche-paysage.jpg` et `assets/affiche-portrait.jpg` : véritables affiches du composant public `AboutVideo.vue`, également disponibles sous `https://www.antoinequarroz.ch/videos/presentation/`. Leurs URL publiques ont été vérifiées le 18 octobre 2026, avec correspondance SHA256 aux fichiers du dépôt.
- `manifest-037-041.json` : provenance, dimensions, poids et SHA256 des cinq couvertures seulement.
- `review-037-041.json` : revue visuelle des cinq PNG identifiés par SHA256. Le build ne reprend le statut « passed » que si les fichiers reconstruits correspondent exactement aux empreintes relues.

Les visuels 038–041 sont des illustrations SVG entièrement fictives portant « Démonstration ». Les contrôles de lecture de 037 sont illustratifs ; l’affiche vidéo est réelle. Aucune performance, validation, donnée privée ou vérification de site client n’est affirmée.

## Reproduction

Les images et la police nécessaires sont incluses dans `assets/`. Aucun appel réseau, API payante ou génération d’image n’est nécessaire. Le texte est vectorisé depuis les glyphes de la police pour garantir le même rendu, accents compris. Sharp compose explicitement les images raster et le robot, sans image raster masquée par un clip SVG.

Avec le runtime fourni dans cet environnement :

```sh
job_id="$(/Users/antoinequarroz/.local/bin/portly temp '/Users/antoinequarroz/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 seo/covers/brand-violet/build.py' --name violet-editorial-covers --path /Users/antoinequarroz/Lab/worktrees/violet-editorial-covers-20261018 --timeout 5m)"
/Users/antoinequarroz/.local/bin/portly wait "$job_id"
```

Sur un autre poste, utiliser Python avec FontTools et Node avec Sharp ; les variables `COVER_NODE` et `COVER_SHARP` permettent d’indiquer leurs chemins. `build.py` localise le dépôt à partir de son propre emplacement. Les recettes de calques sauvegardées utilisent des chemins relatifs.

Chaque PNG est produit en 1200 × 675 pixels, avec une limite vérifiée de 5 Mo.
