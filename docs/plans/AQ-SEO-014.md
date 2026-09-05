---
ticket: AQ-SEO-014
validated: yes
---

# AQ-SEO-014 — Vérifier les budgets et contrôles SEO avant et après livraison

## Plan ordonné

- [x] **1. Versionner le manifeste et le format de preuve**
  - **Objectif :** définir pages critiques, budgets, états terrain et schéma du
    rapport sans valeur implicite.
  - **Fichiers attendus :** configuration sous `scripts/seo/`, utilitaires purs,
    tests Vitest et documentation.
  - **Autorisé :** accueil FR/EN/DE, quatre services FR, blog, hub cas clients,
    pages dynamiques découvertes; budgets LCP 2500 ms, INP 200 ms, CLS 0,1;
    états `available`, `insufficient-data`, `not-configured`, `error`.
  - **Interdit :** traiter une absence comme zéro, inventer INP depuis TBT,
    appeler une route privée ou stocker une clé dans le rapport.
  - **Tests :** parsing strict, métrique inconnue, budget franchi, données
    partielles et manifeste incomplet.
  - **Validation :** job Portly Vitest ciblé.
  - **Sécurité / rollback :** fichiers statiques sans secret ni mutation.

- [x] **2. Produire une baseline laboratoire reproductible**
  - **Objectif :** mesurer le build local avec un navigateur et archiver un
    rapport comparable par SHA.
  - **Fichiers attendus :** script Node sous `scripts/seo/`, script npm,
    éventuelle dépendance de développement standard, tests de parseur et règles
    d'artefacts Git.
  - **Autorisé :** profil mobile fixe, versions d'outil épinglées, LCP/CLS et
    diagnostics laboratoire, date/SHA/environnement, répétitions bornées.
  - **Interdit :** dépendre de l'API production pour la PR, committer des
    captures volumineuses, déclarer une valeur terrain ou INP à partir du lab.
  - **Tests :** rapport complet et déterministe sur fixtures; échec d'outil
    distingué d'un budget franchi.
  - **Validation :** build puis mesure via job Portly avec timeout borné.
  - **Sécurité / rollback :** navigateur sans session; aucune URL privée.

- [x] **3. Ajouter la lecture terrain explicite**
  - **Objectif :** comparer LCP/INP/CLS p75 lorsqu'ils sont réellement fournis.
  - **Fichiers attendus :** client serveur/CLI sous `scripts/seo/`, tests de
    réponses et `docs/operations.md`.
  - **Autorisé :** API publique documentée, clé optionnelle uniquement par
    variable d'environnement, timeouts, état insuffisant/indisponible visible.
  - **Interdit :** exposer la clé, échouer parce que le trafic est insuffisant,
    extrapoler une donnée manquante ou contacter une origine arbitraire.
  - **Tests :** trois métriques disponibles, partiel, aucune donnée, quota et
    timeout; blocage uniquement sur dépassement réel.
  - **Validation :** job Portly avec serveur fixture, puis essai public sans
    secret si l'API le permet.
  - **Sécurité / rollback :** lecture seule; clé facultative jamais journalisée.

- [x] **4. Orchestrer les contrôles SEO critiques**
  - **Objectif :** produire une preuve unique sans remplacer les scripts HTTP
    spécialisés existants.
  - **Fichiers attendus :** `scripts/ops/verify-seo-release.sh`, tests de contrat,
    `.github/workflows/ci.yml`, `scripts/ops/deploy-release.sh` et documentation.
  - **Autorisé :** appeler les preuves domaine, robots, localisation, sitemap,
    SSR et données structurées; rapport d'étapes; upload `if: always()`.
  - **Interdit :** dupliquer leurs parseurs, suivre des redirects non prévus,
    ignorer un code non nul ou désarmer le rollback avant la porte critique.
  - **Tests :** ordre, propagation d'échec, preuve manquante, origine invalide,
    rollback conservé jusqu'à la fin.
  - **Validation :** `bash -n`, Vitest ciblé et exécution locale sur aperçu Nitro
    via Portly.
  - **Sécurité / rollback :** toutes les lectures sont anonymes; un échec
    critique remet l'image `previous`.

- [x] **5. Intégrer PR, release et dérogation humaine**
  - **Objectif :** bloquer une régression critique avant ou après livraison et
    conserver les preuves consultables.
  - **Fichiers attendus :** `.github/workflows/ci.yml`, modèle de dérogation sous
    `docs/releases/`, `docs/operations.md`, tests de pipeline.
  - **Autorisé :** job laboratoire sur PR/main, contrôle public après candidat,
    artefact JSON daté, dérogation avec contrôle, auteur, motif et expiration.
  - **Interdit :** dérogation permanente, automatique ou non versionnée;
    déploiement depuis une PR; secret dans un artefact.
  - **Tests :** CI vérifie les dépendances et l'ordre, conserve l'artefact en
    succès/échec et refuse une dérogation incomplète ou expirée.
  - **Validation :** suite complète, typecheck, build, budgets, jobs Playwright
    ciblés et `git diff --check`, tous lancés via Portly localement.
  - **Sécurité / rollback :** aucune mutation de données; retour à l'image
    précédente si la porte post-livraison échoue.

## Cartographie des critères

| Critère | Étapes |
|---|---|
| HTTP, redirects, canonical, robots, hreflang, sitemap, JSON-LD, HTML | 1, 4, 5 |
| Baseline laboratoire conservée | 1, 2, 5 |
| LCP/INP/CLS p75 terrain si disponibles | 1, 3, 5 |
| Absence terrain explicitement indisponible | 1, 3 |
| Régression bloquée ou dérogation humaine | 4, 5 |

## Validation humaine requise

Antoine doit valider explicitement le manifeste, les seuils et le mécanisme de
dérogation avant toute modification de la CI ou du rollback de production.

Validation explicite reçue d'Antoine le 5 septembre 2026 (« go »), pour les
plans AQ-SEO-013, AQ-SEO-014 et AQ-SEO-015.
