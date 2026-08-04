---
name: Antoine Quarroz — Studio digital premium
description: Une identité technologique violet et cyan, créative sur la vitrine et précise dans l'administration.
colors:
  violet-signature: "#7c3aed"
  violet-studio: "#a78bfa"
  violet-profond: "#5b21b6"
  fuchsia-transition: "#a855f7"
  cyan-electrique: "#22d3ee"
  cyan-lumiere: "#a5f3fc"
  blanc-surface: "#ffffff"
  brume-claire: "#f7f8ff"
  nuit-studio: "#080810"
  nuit-profonde: "#06060e"
  carte-nocturne: "#13131f"
  encre: "#111827"
  texte-lumiere: "#f3f4f6"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1.95rem, 6vw, 5.2rem)"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.025em"
rounded:
  nav-item: "8px"
  control: "12px"
  card: "16px"
  feature: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section-mobile: "56px"
  section-desktop: "96px"
components:
  button-primary:
    backgroundColor: "{colors.violet-signature}"
    textColor: "{colors.blanc-surface}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.violet-signature}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  input:
    backgroundColor: "{colors.blanc-surface}"
    textColor: "{colors.encre}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  card-public:
    backgroundColor: "{colors.blanc-surface}"
    textColor: "{colors.encre}"
    rounded: "{rounded.card}"
    padding: "24px"
  card-admin:
    backgroundColor: "{colors.blanc-surface}"
    textColor: "{colors.encre}"
    rounded: "{rounded.control}"
    padding: "16px"
---

# Design System: Antoine Quarroz — Studio digital premium

## Overview

**Creative North Star: "Le Studio digital premium lumineux"**

Le système conserve l'univers actuel d'Antoine Quarroz : une base sombre, des violets reconnaissables, un cyan électrique et des effets technologiques. Sa progression n'est pas une refonte, mais une montée en gamme : moins d'effets concurrents, davantage de hiérarchie et une exécution plus nette pour inspirer confiance à des prospects professionnels.

La vitrine est le territoire expressif. Elle peut devenir immersive dans ses moments forts — hero, portfolio et transitions importantes — grâce au verre, aux halos et aux gradients. L'administration adopte la même signature de marque avec une densité plus calme, des surfaces structurées et des accents réservés aux états et actions utiles.

**Key Characteristics:**

- Identité violet/cyan immédiatement reconnaissable.
- Contraste entre vitrine expressive et back-office opérationnel.
- Verre lumineux employé comme accent, jamais comme texture uniforme.
- Typographie géométrique pour l'impact, typographie neutre pour la lecture.
- Responsive et modes clair/sombre traités comme des états de premier rang.

## Colors

La palette associe le Violet signature et le Violet studio à un Cyan électrique qui devient Cyan lumière dans les gradients, sur une gamme de surfaces très claires ou presque noires.

### Primary

- **Violet signature** : action principale, état actif, focus et marque.
- **Violet studio** : lumière secondaire, texte accentué et dégradés.
- **Violet profond** : profondeur des gradients et état appuyé.

### Secondary

- **Cyan électrique** : interaction, contraste technologique et lueurs ciblées.
- **Cyan lumière** : extrémité claire des titres en gradient et reflets immersifs.
- **Fuchsia transition** : pont entre le violet et le cyan, jamais accent autonome dominant.

### Neutral

- **Blanc surface** et **Brume claire** : fonds et cartes du thème clair.
- **Nuit studio**, **Nuit profonde** et **Carte nocturne** : fonds, sections et cartes du thème sombre.
- **Encre** et **Texte lumière** : textes à fort contraste dans leurs thèmes respectifs.

### Named Rules

**The Two-Light Rule.** Le violet porte la marque et le cyan signale l'énergie ou l'interaction ; ne pas introduire une troisième couleur lumineuse décorative.

**The Controlled Glow Rule.** Un halo doit soutenir un point focal, un état interactif ou une transition de section. Une surface ordinaire reste calme.

## Typography

**Display Font:** Space Grotesk (avec system-ui et sans-serif)

**Body Font:** Inter (avec system-ui et sans-serif)

**Character:** Space Grotesk donne une présence technique et contemporaine aux titres, tandis qu'Inter garde les contenus, formulaires et données rapides à parcourir. Cette association permet d'être simultanément créatif, professionnel et précis.

### Hierarchy

- **Display** (700, échelle fluide, interligne 0.96) : hero et déclarations principales uniquement.
- **Headline** (700, échelle fluide, interligne 0.95) : titres de sections publiques.
- **Title** (600, 1.25rem, interligne 1.25) : cartes, groupes fonctionnels et modales.
- **Body** (400, 1rem, interligne 1.625) : paragraphes et informations courantes, idéalement limités à environ 65 caractères par ligne.
- **Label** (600, 0.75rem, léger espacement) : badges, métadonnées, navigation compacte et tableaux.

### Named Rules

**The Display Is Earned Rule.** Space Grotesk en très grand format est réservé aux messages à forte valeur ; l'interface administrative privilégie la taille et la densité utiles.

## Layout

La vitrine utilise un conteneur centré d'au plus 80rem avec des marges latérales de 1rem, puis 1.5rem et 2rem selon les points de rupture. Les sections respirent davantage sur écran moyen et large, passant d'environ 56px à 96–112px de rythme vertical. Les titres publics sont centrés lorsqu'ils introduisent une section, avec une largeur de lecture maîtrisée.

L'administration emploie une barre latérale fixe de 224px sur grand écran, une barre supérieure collante et une zone principale compacte. Sous le point de rupture large, la navigation devient un panneau superposé ; sous 430px, les marges principales sont réduites sans supprimer la hiérarchie.

**The Dual-Density Rule.** La vitrine vend par le rythme et l'espace ; l'administration sert par la densité, l'alignement et la répétition cohérente.

## Elevation & Depth

Le système est hybride. Les pages publiques associent superposition tonale, verre translucide, flou et halos violets. Les surfaces administratives restent plates au repos, définies par une bordure légère et une ombre discrète ; elles ne gagnent en élévation qu'au survol ou lorsqu'elles flottent réellement, comme une recherche ou un menu.

### Shadow Vocabulary

- **Lueur courte** (`0 0 15px #7c3aed30`) : logo, petit accent ou contrôle prioritaire.
- **Lueur active** (`0 0 30px #7c3aed40`) : survol d'un composant public important.
- **Lueur immersive** (`0 0 60px #7c3aed50`) : hero ou artefact visuel exceptionnel uniquement.
- **Ombre fonctionnelle** (`0 1px 2px rgba(0,0,0,0.05)`) : cartes et barres d'outils administratives.

**The Immersion Has a Boundary Rule.** Les effets immersifs vivent dans les moments de démonstration ; ils ne traversent pas les tableaux, formulaires ou listes de travail.

## Shapes

Les contrôles et cartes emploient des angles généreusement arrondis de 12 à 16px. Les surfaces de présentation peuvent atteindre 24px. Les badges, la navigation flottante et certains appels à l'action utilisent une forme pilule. Des bordures fines et translucides structurent le verre et remplacent les ombres lourdes.

**The Radius Hierarchy Rule.** 8px pour la navigation compacte, 12px pour les contrôles, 16px pour les cartes, 24px pour les surfaces vedettes et la pilule uniquement pour les objets réellement linéaires.

## Components

### Buttons

- **Shape:** rectangle souple et assuré (12px), pilule seulement dans une composition qui l'exige.
- **Primary:** gradient violet, texte blanc, espacement de 12px × 24px et graisse forte.
- **Hover / Focus:** légère montée en échelle, lueur violette et anneau de focus visible ; l'état actif revient à l'échelle normale.
- **Secondary:** fond transparent, bordure violette translucide et teinte violette ; le survol renforce la bordure et ajoute un voile coloré.

### Chips

- **Style:** pilule compacte, fond violet très léger, texte violet et bordure translucide.
- **State:** réservée aux catégories et statuts ; ne pas l'utiliser comme simple décoration.

### Cards / Containers

- **Corner Style:** 16px pour la vitrine, 12px pour l'administration.
- **Background:** verre blanc ou carte nocturne translucide dans la vitrine ; surface opaque calme dans l'administration.
- **Shadow Strategy:** lueur contrôlée pour les cartes publiques interactives, ombre fonctionnelle discrète côté admin.
- **Border:** un trait léger maintient la forme en clair comme en sombre.
- **Internal Padding:** 16px sur mobile, 24 à 32px pour les compositions publiques plus larges.

### Inputs / Fields

- **Style:** surface neutre, bordure légère, rayon de 12px et padding de 12px × 16px.
- **Focus:** bordure Violet signature et anneau violet translucide clairement visible.
- **Error / Disabled:** les erreurs utilisent une couleur sémantique dédiée ; un champ désactivé doit réduire le contraste sans disparaître.

### Navigation

La navigation publique flotte dans une capsule vitrée centrée, devenant plus opaque et plus ombrée après défilement. Sur mobile, elle devient un panneau plein écran nocturne. La navigation administrative utilise des lignes compactes, un fond violet très léger et un repère vertical pour l'élément actif.

### Hero immersif

Le hero associe une scène interactive, des orbes violet/cyan, des voiles sombres et un titre très contrasté. Il constitue le plafond d'intensité visuelle du produit : les sections suivantes doivent être plus calmes pour préserver son impact.

## Do's and Don'ts

### Do:

- **Do** conserver le duo Violet signature / Cyan électrique comme repère de marque.
- **Do** réserver les halos puissants aux actions et zones de démonstration importantes.
- **Do** employer des surfaces plus sobres, denses et prévisibles dans l'administration.
- **Do** maintenir un focus clavier visible, un contraste lisible et une alternative aux animations.
- **Do** vérifier les mêmes composants en clair, sombre, mobile et desktop.

### Don't:

- **Don't** remplacer cette identité par une esthétique SaaS générique ou entièrement neutre.
- **Don't** appliquer verre, flou, gradient et lueur simultanément à toutes les cartes.
- **Don't** transformer l'administration en page marketing ou réduire sa densité opérationnelle.
- **Don't** employer des animations permanentes sur les contenus de travail.
- **Don't** inventer de nouvelles couleurs d'accent sans rôle fonctionnel explicite.
