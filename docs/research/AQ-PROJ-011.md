# AQ-PROJ-011 — Recherche

## Constat

Les cartes possèdent une taille CSS fixe, mais leur géométrie 3D est recalculée
avec le nombre de projets filtrés. Le pas angulaire passe ainsi de 22,5° pour
16 projets à 120° pour 3 projets. Comme la position, la perspective, l'échelle,
l'opacité et la répulsion dérivent toutes de cet angle, les filtres peu fournis
produisent des cartes voisines plus petites et beaucoup trop éloignées.

La hauteur de piste conserve en outre un minimum de 420vh, ce qui ralentit
fortement la cadence entre deux projets lorsque la sélection ne contient que
quelques éléments. L'état d'interpolation n'est pas réinitialisé lors d'un
changement de filtre.

## Direction retenue

- Utiliser le nombre total de projets publiés comme densité visuelle de
  référence pour le pas angulaire et la répulsion.
- Continuer d'utiliser la sélection filtrée pour le compteur, la navigation et
  la progression réelle.
- Garder une distance de défilement constante par transition.
- Réinitialiser l'interpolation lors d'un changement de filtre.
- Ne pas modifier le carrousel horizontal mobile.

## Périmètre

- `app/components/sections/PortfolioSection.vue`
- `app/components/sections/ProjectHelixCarousel.vue`
- tests ciblés sur le contrat géométrique

Le responsive général des panneaux latéraux reste hors périmètre de ce ticket.
