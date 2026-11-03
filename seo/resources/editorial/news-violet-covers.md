# Couvertures des brèves IA et tech : violet autorisé le 3 novembre 2026

Antoine autorise la charte violette pour la rubrique récurrente dès le 4 novembre. Elle ne se limite plus aux images 036–041 ; cette autorisation ne permet pas d’écraser ces fichiers ni de réutiliser leur couverture pour une news.

## Composition

- PNG 1200 × 675, moins de 5 Mo ; fond `#080810`.
- Dégradé exact `#7c3aed → #a855f7 → #c084fc`, avec positions et orientations des sources PhysioBaur/brand-violet validées.
- Vraie Space Grotesk embarquée : `seo/covers/brand-violet/assets/SpaceGrotesk-VariableFont_wght.ttf`, licence `OFL-SpaceGrotesk.txt`. Convertir les textes en tracés depuis ses glyphes réels, sans substitution.
- Robot original `seo/covers/brand-violet/assets/robot-transparent.png` inchangé, identité AQ et domaine dans la composition.
- Titre court spécifique à la news ; une couverture typographique dédiée avec le robot suffit. Aucune promesse ou capture inventée.
- Captures uniquement authentiques, pertinentes, sans donnée privée, avec provenance et droits vérifiés ; ne pas supposer un droit sur une photo ou un logo tiers.
- Toute interface fictive ou diagramme porte visiblement « Démonstration ». Une simple couverture typographique n’est ni une interface ni un diagramme.
- Composition SVG/HTML et rendu local autorisés, sans génération IA ni photoréalisme.

## Sources et outils

Recettes éditables : `seo/covers/brand-violet/sources/` et `seo/covers/physiobaur-approved-violet/cover.svg`. Elles documentent palette, placement, robot et glyphes.

**Ne pas exécuter ni importer `seo/covers/brand-violet/build.py` pour une news** : le module est spécifique à 037–041 et ses effets de bord réécrivent les cinq PNG et leur manifeste. Préparer une composition distincte sous `seo/covers/news/AAAA-MM-JJ/`, avec le titre vérifié du jour, en réutilisant la méthode de tracés et les assets.

Vérifier FontTools et le moteur de rendu SVG/PNG sur le runner avant le premier créneau. Les recettes historiques utilisent Node/Sharp ; `COVER_NODE` et `COVER_SHARP` permettent leurs chemins, sans rendre le build générique. Ne pas exécuter l’ancien lot comme test. Une dépendance absente est un blocage précis à traiter, pas un motif pour changer la charte.

## Preuves par news

Manifeste dédié : composition source, commande de rendu, titre, assets et SHA-256, provenance et notices réelles, dimensions/taille du PNG, SHA-256 final et date de revue visuelle. Inspecter image entière, accents, orthographe, débordements et lisibilité à 1200 × 675 et en aperçu carte/mobile. Ne pas prétendre à une inspection non réalisée.

Exemple de chemin final : `seo/covers/news/AAAA-MM-JJ/<slug>.png`. Les anciens manifestes ne prouvent pas les nouveaux octets. Sans fichier ou preuve conforme, signaler le blocage et ne pas revenir au cuivre.

Payload : `coverStyle=aq-editorial-violet-space-grotesk-v1`. Contrat confirmé en production le 18 octobre 2026 par `seo/receipts/2026-10-18-article-036-violet-cover.json`. Aucun contournement de style ni route de création pour modifier un article existant.
