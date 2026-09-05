---
ticket: AQ-SEO-013
validated: yes
---

# AQ-SEO-013 — Comprendre et utiliser le hero sans dépendre de la scène 3D

## Plan ordonné

- [x] **1. Isoler la décision de charger la 3D**
  - **Objectif :** décider de manière déterministe si Spline peut être tenté.
  - **Fichiers attendus :** petit utilitaire client sous `app/utils/`,
    `app/components/ui/SplineRobot.vue`, tests Vitest ciblés.
  - **Autorisé :** états fermés pour mouvement réduit, économie de données, 2G,
    WebGL absent et chargement autorisé; écoute du changement de préférence.
  - **Interdit :** fingerprinting, collecte de caractéristiques, suppression de
    Spline, nouvelle dépendance ou modification de la copie du hero.
  - **Tests :** matrice complète des capacités et nettoyage des listeners.
  - **Validation :** job Portly Vitest ciblé puis typecheck.
  - **Sécurité / rollback :** décision locale non persistée et sans télémétrie;
    rollback applicatif simple.

- [x] **2. Rendre le fallback terminal et dimensionnellement stable**
  - **Objectif :** afficher l'identité de marque avant la scène et contenir toute
    panne sans spinner infini ni déplacement du contenu.
  - **Fichiers attendus :** `app/components/ui/SplineRobot.vue`,
    `app/components/sections/HeroSplineSection.vue`, éventuels styles ciblés.
  - **Autorisé :** fallback gradient/orbes existants, délai maximal borné,
    gestion `load-complete`, erreur et perte de contexte, attribut d'état de
    test, fondu décoratif.
  - **Interdit :** masquer titre/texte/CTA, changer leur ordre, déplacer les CTA
    sous la 3D, image distante supplémentaire, boucle de retry ou nouveau
    mouvement essentiel.
  - **Tests :** contenu HTML présent avant hydratation; timeout, import en échec
    et contexte perdu terminent sur le fallback; hauteur du hero stable.
  - **Validation :** job Portly ciblé, inspection SSR et build.
  - **Sécurité / rollback :** la scène reste `aria-hidden`; aucune donnée ni
    route n'est touchée.

- [x] **3. Prouver les parcours dégradés et l'interaction**
  - **Objectif :** vérifier réellement desktop, mobile, clavier, sans JS,
    mouvement réduit et ressource bloquée.
  - **Fichiers attendus :** `e2e/public.spec.ts` ou spec hero dédiée, test de
    contrat Vitest, documentation d'exploitation si un marqueur est ajouté.
  - **Autorisé :** interception de la ressource Spline, émulation de mouvement
    réduit, viewport mobile, assertions d'état et de boîte.
  - **Interdit :** dépendre du réseau Spline réel, snapshot fragile de pixels,
    rendre les tests production mutables ou ignorer un échec.
  - **Tests :** titre et CTA visibles/cliquables dans chaque mode; focus clavier;
    absence de page vide, exception ou décalage durable.
  - **Validation :** jobs Portly Playwright ciblé, suite Vitest, typecheck,
    build, budgets et `git diff --check`.
  - **Sécurité / rollback :** tests anonymes et sans secret; rollback uniquement
    applicatif.

## Cartographie des critères

| Critère | Étapes |
|---|---|
| Titre, texte et CTA HTML avant Spline | 2, 3 |
| Fallback retard, panne ou évitement volontaire | 1 à 3 |
| `prefers-reduced-motion` | 1 à 3 |
| Erreur contenue sans décalage durable | 2, 3 |
| Mobile, desktop, clavier et toucher | 3 |

## Validation humaine requise

Antoine doit valider explicitement ce plan avant toute modification du code du
hero. Cette validation conserve la scène Spline et l'identité actuelles.

Validation explicite reçue d'Antoine le 5 septembre 2026 (« go »), pour les
plans AQ-SEO-013, AQ-SEO-014 et AQ-SEO-015.
