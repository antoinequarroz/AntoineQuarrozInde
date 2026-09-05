# Recherche AQ-SEO-014 — Budgets et contrôles SEO de release

## Cadre du ticket

`AQ-SEO-014` exige une preuve reproductible des statuts, redirects, canonicals,
robots, `hreflang`, sitemap, données structurées, HTML initial et performances.
Une baseline laboratoire doit être conservée; les valeurs terrain LCP, INP et
CLS au 75e percentile sont comparées aux budgets lorsqu'elles existent, sinon
elles sont explicitement indisponibles (`docs/product/stories.md:280-297`). Les
budgets validés sont LCP ≤ 2,5 s, INP ≤ 200 ms et CLS ≤ 0,1
(`docs/product/prd.md:125-127`).

## Contrôles actuels

- Le job `quality` exécute Vitest, typecheck, build et un budget de bundle, mais
  ne démarre pas de navigateur ni ne produit de baseline laboratoire
  (`.github/workflows/ci.yml:21-36`).
- `scripts/check-bundle-budget.mjs` borne la taille totale, le plus gros chunk
  et la scène Spline. Il ne mesure pas LCP, CLS, blocage du thread principal ou
  HTML initial (`scripts/check-bundle-budget.mjs:1-43`).
- Après déploiement, le job `deploy` exécute des preuves distinctes pour le SHA,
  le domaine, les en-têtes, les routes privées, robots, localisation, sitemap,
  SSR, identité, données structurées, services et études approuvées
  (`.github/workflows/ci.yml:137-164`).
- Le script VPS conserve l'image précédente et active un rollback automatique,
  mais le désarme après seulement les preuves SSR du blog et des études de cas
  (`scripts/ops/deploy-release.sh:44-82`). Les autres preuves GitHub échouent
  après que le candidat est déjà resté en service.
- Playwright sait démarrer l'application et peut viser une URL externe, mais la
  configuration ne définit ni profil de performance stable ni artefact de
  baseline (`playwright.config.ts:20-39`).
- La documentation décrit chaque preuve séparément, sans manifeste unique des
  pages critiques, date, environnement, métriques ou mécanisme de dérogation
  humaine (`docs/operations.md`).

## Écarts vérifiés

- Il n'existe aucun manifeste versionné des pages critiques et aucun contrôle
  unique démontrant que toutes les familles exigées ont été exécutées.
- Aucune mesure laboratoire navigateur n'est conservée comme artefact de PR ou
  de release; les budgets actuels portent seulement sur les octets.
- Aucun lecteur de données terrain ne distingue `available`, `insufficient-data`,
  `not-configured` et `error`; afficher zéro serait donc ambigu.
- Une régression critique détectée par la plupart des preuves post-déploiement
  rend le workflow rouge, mais ne provoque pas le rollback déjà désarmé.
- Il n'existe pas de format de dérogation versionné qui cite le contrôle échoué,
  la justification, l'auteur et l'expiration.

## Conventions et intégrations

- Les scripts d'exploitation valident une origine HTTP(S), bornent temps et
  taille, restent anonymes et échouent avec un code non nul. Les nouveaux
  orchestrateurs doivent réutiliser ces preuves plutôt que les dupliquer.
- Le déploiement identifie le SHA exact via `/api/version` et maintient une image
  `previous`; toute porte critique ajoutée au rollback doit rester en lecture
  seule (`scripts/ops/deploy-release.sh:44-86`).
- Les tâches longues locales passent par Portly; en CI, les artefacts doivent
  être produits sans secret de production dans leur contenu.

## Flux cible

1. Un manifeste versionné définit les pages critiques, les budgets et la version
   du profil laboratoire.
2. Une mesure navigateur reproductible sur le build local produit un JSON daté
   avec environnement, LCP et CLS laboratoire ainsi que les diagnostics utiles;
   l'INP n'est jamais inventé à partir d'une métrique laboratoire différente.
3. Un lecteur terrain optionnel collecte les percentiles disponibles pour
   l'origine publique. Il rapporte explicitement toute absence ou erreur et ne
   bloque sur un budget que lorsque la donnée correspondante existe.
4. Un orchestrateur SEO réutilise les preuves HTTP existantes et archive leur
   résultat avec la baseline. Une panne technique est distincte d'un succès.
5. Le contrôle critique s'exécute avant livraison sur la PR et dans la
   transaction de rollback après activation du candidat. Une dérogation ne peut
   venir que d'un fichier humain explicite, borné et traçable.

## Tests, risques et limites

- Tests unitaires du manifeste, des seuils, des états terrain et du format de
  rapport; fixtures `available`, insuffisante, absente, erreur et dépassement.
- Tests de contrat CI : ordre avant/après livraison, upload d'artefact même en
  échec et aucune exposition de clé.
- Tests de l'orchestrateur : toute preuve critique manquante ou rouge échoue;
  sortie structurée exploitable; origine non sûre refusée.
- Une mesure laboratoire est sensible à la machine. Le plan impose un profil
  fixe et conserve la baseline; seuls les seuils explicitement validés bloquent.
- La collecte terrain dépend d'un fournisseur et d'un volume suffisant. Son
  indisponibilité ne devient jamais un faux zéro ni un succès silencieux.
- Aucun schéma Supabase, accès utilisateur ou contenu public ne change.
