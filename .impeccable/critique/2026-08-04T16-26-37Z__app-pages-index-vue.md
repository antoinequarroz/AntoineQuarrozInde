---
target: app/pages/index.vue
total_score: 21
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 4
timestamp: 2026-08-04T16-26-37Z
slug: app-pages-index-vue
---
⚠️ DEGRADED: single-context (la politique de cette session n'autorise pas la délégation à des sous-agents sans demande explicite)

## Design Health Score

| # | Heuristique | Score | Constat |
|---|---|---:|---|
| 1 | Visibilité de l'état | 3 | États présents, annonces accessibles incomplètes. |
| 2 | Correspondance monde réel | 3 | Offre claire, quelques formulations techniques. |
| 3 | Contrôle et liberté | 2 | Modale d'article incomplète au clavier. |
| 4 | Cohérence et standards | 3 | Identité forte, détails et tokens dispersés. |
| 5 | Prévention des erreurs | 2 | Labels non associés et aide limitée. |
| 6 | Reconnaissance | 3 | Navigation et actions compréhensibles. |
| 7 | Flexibilité | n/a | Surface persuasive. |
| 8 | Esthétique et minimalisme | 3 | Personnalité forte, effets parfois concurrents. |
| 9 | Récupération d'erreur | 2 | Messages génériques. |
| 10 | Aide | n/a | Surface persuasive. |
| **Total** | | **21/32** | **Acceptable** |

## Design Specificity Verdict

La vitrine paraît conçue pour Antoine grâce à son portrait, son discours personnel, son univers technologique et sa palette violet/cyan. Elle n'a pas besoin d'être remplacée. Sa spécificité diminue cependant dans les témoignages génériques et certains patterns de gradients/verre répétés.

Le scan déterministe relève 168 signalements : 113 tailles typographiques ponctuelles, 28 textes gris sur fonds colorés, 4 couleurs hors palette, 2 polices hors système, 2 transitions de layout et plusieurs règles mineures. Les alertes classant le violet/cyan comme palette générique sont des faux positifs au regard du brief confirmé.

Aucun overlay navigateur fiable n'a été injecté : l'interface d'évaluation disponible est en lecture seule. Les constats reposent sur les captures desktop/mobile, le DOM, la console et le scan CLI.

## Impression générale

Le site montre déjà une vraie personnalité et une bonne maîtrise graphique. L'opportunité principale est d'orienter cette énergie vers la conversion et la confiance : CTA immédiat, preuves authentiques, accessibilité et chargement plus prévisible.

## Ce qui fonctionne

- Identité visuelle cohérente et mémorable.
- Offre et structure de page faciles à comprendre.
- Très bonne base responsive, sans débordement horizontal à 384px.

## Problèmes prioritaires

### [P1] Hero sans CTA immédiat

La scène 3D domine, surtout sur mobile, mais aucune action principale n'est visible dans le premier écran. Ajouter deux CTA et un fallback éditorial.

### [P1] Labels et cibles tactiles

Les champs de contact ne sont pas reliés à leurs labels et plusieurs contrôles mesurent 32 à 36px. Corriger les associations et atteindre une cible confortable.

### [P1] Preuves génériques

Les avis génériques et dupliqués affaiblissent la confiance. Ne publier que des retours réels validés.

### [P1] Hydratation et sémantique interactive

La liste mobile des services provoque une erreur d'hydratation. Le carrousel blog imbrique un lien dans un bouton. Stabiliser le DOM SSR et séparer les interactions.

### [P2] Effets et tokens dispersés

Les tailles ponctuelles, halos et couleurs locales rendent la finition moins systématique. Consolider sans remplacer la palette.

## Persona Red Flags

**Jordan, premier visiteur :** comprend le métier, mais ne voit pas immédiatement comment demander un projet et peut douter d'avis sans identité réelle.

**Casey, mobile distrait :** doit traverser un hero très visuel et manipuler des contrôles inférieurs à 44px ; le réseau lent peut retarder la scène Spline.

**Sam, navigation clavier/lecteur d'écran :** rencontre des champs sans nom associé, une interaction imbriquée et des modales sans contrat de focus complet.

**Prospect PME local :** apprécie le ton et le portrait, mais cherche davantage de preuves vérifiables, de résultats de projets et un prochain pas commercial immédiat.

## Observations mineures

- Les filtres portfolio sont compréhensibles mais trop petits sur mobile.
- Le footer est riche et pourrait être légèrement simplifié.
- Le contenu public mélange encore quelques termes français et anglais.
- La palette violet/cyan est volontaire et ne doit pas être supprimée.

## Questions à considérer

- Quelle preuve réelle peut remplacer chaque témoignage de démonstration ?
- Le hero doit-il d'abord impressionner ou d'abord générer une prise de contact ?
- Quelles informations un prospect doit-il voir avant d'accepter un rendez-vous ?
