# Recherche AQ-SEO-013 — Hero utilisable sans dépendance à la 3D

## Cadre du ticket

`AQ-SEO-013` conserve le texte, les CTA et l'identité du hero, tout en exigeant
que le contenu critique soit disponible avant et sans Spline, qu'un fallback de
marque soit stable, que le mouvement réduit soit respecté et qu'une panne de la
scène ne dégrade ni l'accès ni la mise en page (`docs/product/stories.md:260-278`).
Le PRD fixe les mêmes invariants dans `SEO-R018` et `SEO-R019`
(`docs/product/prd.md:123-124`). Aucune suppression de Spline ni refonte
graphique n'est autorisée.

## Flux représentatif actuel

1. La page d'accueil rend `HeroSplineSection` avant les autres sections
   (`app/pages/index.vue:107-113`).
2. Le titre, le sous-titre et les deux liens d'action sont des éléments HTML
   rendus dans le composant et placés au-dessus de la scène; ils ne dépendent
   pas du callback de chargement Spline
   (`app/components/sections/HeroSplineSection.vue:33-87`).
3. `SplineRobot` est encapsulé dans `ClientOnly`. Le SSR produit un fond noir,
   puis le client programme l'import dynamique du viewer pendant une période
   inactive (`app/components/ui/SplineRobot.vue:18-57,64-95`).
4. Le viewer n'est pas chargé lorsque `prefers-reduced-motion` est déjà actif
   au montage. Une connexion `saveData` ou 2G ne l'empêche toutefois pas : elle
   ne fait qu'allonger le délai d'activation (`app/components/ui/SplineRobot.vue:32-50`).
5. Tant que `load-complete` n'arrive pas, un spinner recouvre le fallback. Une
   erreur d'import active le fond statique, mais une ressource de scène lente,
   indisponible ou une perte de contexte ne possède ni délai maximal ni état
   terminal (`app/components/ui/SplineRobot.vue:66-89`).
6. Les orbes de marque sont toujours présentes derrière le contenu, mais leurs
   animations ne sont neutralisées que par la règle globale de mouvement réduit
   (`app/components/sections/HeroSplineSection.vue:15-25,118-145`,
   `app/assets/css/main.css:170-183`).
7. Le service worker met en cache le runtime et les scènes après leur première
   utilisation; le bundle contrôle déjà séparément la taille de la scène
   distante (`nuxt.config.ts:78-143`, `scripts/check-bundle-budget.mjs:1-43`).

## Écarts vérifiés

- Le contenu critique est déjà SSR et cliquable, mais l'état visuel de chargement
  peut rester indéfiniment sur un spinner si la scène ne termine jamais.
- `context-loss` revient à l'état de chargement sans désactiver le viewer; il ne
  constitue donc pas un fallback terminal et peut produire une boucle visuelle.
- La préférence de mouvement n'est lue qu'une fois. Un changement système
  pendant la session n'est ni observé ni nettoyé.
- Les modes économie de données et 2G déclenchent encore le téléchargement
  lourd. Cela ne correspond pas à la condition où la 3D doit être
  volontairement évitée.
- Aucun marqueur stable ne permet aux tests de distinguer `loading`, `ready`,
  `fallback-motion`, `fallback-network`, `fallback-unsupported` et
  `fallback-error`.
- Aucun scénario E2E ne couvre le hero sans JavaScript, sans WebGL, avec
  mouvement réduit, ressource Spline en échec, clavier ou viewport mobile;
  `e2e/public.spec.ts:3-8` ne vérifie que le titre et un lien de contact.

## Conventions à préserver

- Les CTA utilisent les routes localisées et des ancres natives; ils doivent
  rester présents dans le HTML initial
  (`app/components/sections/HeroSplineSection.vue:70-84`).
- La scène reste décorative avec `aria-hidden="true"`; aucune information ne doit
  être annoncée uniquement par la 3D (`app/components/ui/SplineRobot.vue:65`).
- Le composant doit annuler timers et callbacks à la destruction, comme le fait
  déjà `onBeforeUnmount` (`app/components/ui/SplineRobot.vue:54-60`).
- Le budget distant de 1,5 Mo et l'import dynamique existants restent en place
  (`scripts/check-bundle-budget.mjs:21-43`).

## Flux cible

1. Le navigateur reçoit immédiatement le texte et les CTA SSR sur un fallback
   de marque dimensionnellement stable.
2. Une décision pure choisit de tenter ou non la 3D selon mouvement réduit,
   économie de données, connexion très lente et support WebGL.
3. Si la tentative est autorisée, l'import reste différé et un délai maximal
   borné transforme tout chargement incomplet en fallback terminal.
4. `load-complete` révèle la scène sans modifier la boîte du hero. Une erreur,
   une perte de contexte ou un changement vers mouvement réduit détruit la
   tentative et conserve le fallback final.
5. Des attributs d'état permettent de vérifier chaque branche sans exposer la
   scène aux technologies d'assistance.

## Tests, risques et limites

- Tests unitaires de la décision de chargement : défaut, mouvement réduit,
  `saveData`, 2G, WebGL absent et entrée inconnue.
- Tests de contrat des composants : HTML/CTA indépendants, timeout terminal,
  nettoyage des listeners, fallback de marque et absence de spinner infini.
- Playwright : JavaScript désactivé, mouvement réduit, ressource Spline bloquée,
  clavier, mobile et absence de décalage durable du contenu critique.
- Non-régression : Vitest, typecheck, build, budgets, accessibilité et parcours
  public.
- Aucun accès privilégié, migration, donnée ou dépendance supplémentaire n'est
  nécessaire. Le rollback restaure uniquement les composants du hero.
