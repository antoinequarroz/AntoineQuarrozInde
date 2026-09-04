---
ticket: AQ-SEO-011
validated: yes
---

# AQ-SEO-011 — Répondre aux questions de décision sur chaque service

## Plan ordonné

- [x] **1. Créer un contrat éditorial partagé et un rendu SSR accessible**
  - **Objectif :** garantir que les quatre pages possèdent toutes les réponses
    attendues dans le même ordre, tout en laissant à chaque service une copie
    spécifique et approuvable.
  - **Fichiers attendus :** nouveau module sous `shared/utils/` (par exemple
    `publicServiceContent.ts`), nouveau composant sous `app/components/ui/`
    (par exemple `ServiceDecisionContent.vue`) et tests Vitest ciblés.
  - **Autorisé :** modèle typé exigeant offre, public, zone, livrables,
    processus, cadrage du délai, limites, prochaine étape, preuve et contact;
    textes non vides et normalisés; listes non vides; liens locaux absolus sans
    protocole, query ou chemin ambigu; sections SSR, `h2`, paragraphes et listes;
    deux CTA avec focus visible et cible tactile suffisante.
  - **Interdit :** accordéon ou contenu dépendant de JavaScript, HTML brut,
    éditeur CRM, source distante, lien externe injecté, prix, durée chiffrée,
    témoignage, nom client, résultat quantifié, nouvelle dépendance ou refonte
    globale des pages.
  - **Tests :** contenu nominal; champ/collection vide; espace parasite;
    doublon de section; chemin externe, relatif, avec query, fragment ou
    traversal; ordre exact des cinq questions; rendu de listes et liens; texte
    hostile rendu comme texte et non comme HTML.
  - **Validation :** Vitest ciblé, typecheck, rendu Nitro et inspection de
    l'arbre d'accessibilité sur une page via le serveur Portly existant.
  - **Sécurité / rollback :** données statiques publiques uniquement, URLs
    fermées et échappement Vue par défaut. Le rollback supprime le modèle et le
    composant sans toucher aux données.

- [x] **2. Enrichir les quatre services avec les affirmations approuvées**
  - **Objectif :** remplacer les introductions incomplètes ou mal accentuées,
    puis couvrir sur chaque page les livrables, le processus, les facteurs de
    délai, les limites, la preuve et la prochaine étape.
  - **Fichiers attendus :**
    `app/pages/developpeur-web-valais.vue`,
    `app/pages/creation-site-internet-valais.vue`,
    `app/pages/refonte-site-web-valais.vue`,
    `app/pages/application-mobile-valais.vue`, composant partagé et tests SEO.
  - **Autorisé :** les affirmations qualitatives exactes de la matrice
    d'approbation ci-dessous; titres « Quels livrables sont inclus ? »,
    « Comment se déroule le projet ? », « Quels délais prévoir ? », « Quelles
    sont les limites ? » et « Quelle est la prochaine étape ? »; liens vers
    `/#portfolio` et `/#contact`; lien complémentaire vers
    `/cas-clients-valais` uniquement en indiquant que les études détaillées ne
    sont publiées qu'après validation; corrections des titres, descriptions
    SEO/OG et accents; réutilisation de la même introduction pour le HTML et le
    JSON-LD `Service`.
  - **Interdit :** modifier routes/canonicals/breadcrumbs, créer une variante
    EN/DE, promettre classement, trafic, conversion, adoption ou résultat,
    afficher une étude inexistante, présenter une fonction optionnelle comme
    systématique, ajouter un prix ou un délai numérique, ou enrichir l'objet
    `Service` avec une propriété commerciale.
  - **Tests :** quatre routes et cinq sections chacune; introduction avant le
    premier `h2`; offre/public/Valais visibles; source unique de description;
    preuve et contact présents; anciennes fautes ciblées absentes; aucune
    valeur monétaire, pourcentage, durée ou garantie; non-régression du schéma
    et du breadcrumb AQ-SEO-010.
  - **Validation :** Vitest ciblé, suite SEO existante, typecheck, build,
    budgets, contrôle visuel mobile/bureau en clair/sombre et parcours clavier.
  - **Sécurité / rollback :** aucune donnée CRM ou client; seule la copie
    explicitement approuvée ci-dessous est publiable. Rollback applicatif vers
    les quatre pages précédentes.

- [x] **3. Ajouter une preuve HTTP fail-closed du contenu décisionnel**
  - **Objectif :** empêcher qu'une page perde une question, sa preuve ou son
    contact, et bloquer l'apparition d'une précision commerciale non approuvée.
  - **Fichiers attendus :** nouveau
    `scripts/ops/verify-service-decision-content.sh`, nouveau test de contrat
    sous `tests/`, `e2e/public.spec.ts`, `.github/workflows/ci.yml` et
    `docs/operations.md`.
  - **Autorisé :** découverte des quatre services via sitemap; origine sûre;
    redirections manuelles; timeout et taille bornés; parsing des marqueurs
    visibles; ordre des cinq sections; contrôle des liens locaux; refus de
    montants, devises, pourcentages, durées chiffrées et expressions de garantie
    dans le périmètre décisionnel; E2E sans JavaScript; ajout de la preuve après
    `verify-service-breadcrumbs.sh` et avant les E2E de production.
  - **Interdit :** suivre un redirect, contacter une autre origine, utiliser un
    secret ou une session, valider la vérité commerciale automatiquement,
    imprimer les textes complets en erreur, remplacer une porte SEO existante ou
    déployer depuis ce ticket sans revue.
  - **Tests :** succès sur quatre fixtures; page/section/introduction/preuve/CTA
    manquant; ordre incorrect; lien externe ou ambigu; prix, devise,
    pourcentage, délai chiffré, garantie ou mojibake; redirection, HTML non SSR,
    origine non sûre et réponse trop grande.
  - **Validation :** `bash -n`, Vitest ciblé, preuve contre l'aperçu Nitro,
    Playwright sans JavaScript, puis suite complète et `git diff --check`.
  - **Sécurité / rollback :** contrôle anonyme en lecture seule, origine et
    ressources bornées. En cas d'échec post-déploiement, conserver le diagnostic
    et restaurer l'image `previous` sans opération Supabase.

- [x] **4. Revoir la copie, la sécurité et la release complète**
  - **Objectif :** vérifier indépendamment que la copie publiée correspond à la
    matrice approuvée, que les critères sont tous couverts et qu'aucune promesse
    ou donnée sensible n'a été ajoutée.
  - **Fichiers attendus :** `docs/reviews/AQ-SEO-011.md`, mises à jour finales du
    présent plan et, après validation de l'implémentation, document de release.
  - **Autorisé :** comparaison exacte page/matrice; revue linguistique;
    inspection responsive, clair/sombre, clavier et sans JavaScript; suites
    Vitest, base, typecheck, build, budgets, E2E; preuves AQ-SEO-001 à 011;
    préparation d'une PR distincte.
  - **Interdit :** auto-approuver la copie, élargir à AQ-SEO-012, publier une
    traduction, corriger silencieusement des données de projet, fusionner ou
    déployer sans une nouvelle validation explicite d'Antoine.
  - **Tests :** tous les contrôles ciblés et existants, dont fixtures négatives,
    preuve locale sur les quatre pages et contrôles de non-régression publics.
  - **Validation :** revue fonctionnelle et sécurité avec verdict de livraison,
    PR verte sur son SHA exact, puis validation humaine séparée avant Production.
  - **Sécurité / rollback :** confirmer l'absence de migration, secret et
    mutation; rollback d'image uniquement.

## Preuves d'implémentation

- Contrat éditorial, composant SSR et quatre pages spécifiques implémentés sans
  migration, dépendance, route ni donnée distante.
- Contrôle ciblé : 48/48 tests Vitest réussis, incluant les variantes négatives
  réseau, structure, copie, précision commerciale et URL.
- Non-régression : 56 fichiers et 392/392 tests Vitest réussis; typecheck, build
  Nitro, budgets et `git diff --check` réussis.
- Aperçu Portly : contrôles HTTP AQ-SEO-010 et AQ-SEO-011 réussis sur les quatre
  services; 7/7 parcours Playwright publics réussis, dont la lecture sans
  JavaScript.
- Inspection visuelle et accessibilité : bureau et mobile, thèmes clair et
  sombre, absence de débordement, cible CTA de 52 px et focus clavier visible.
- Revue indépendante documentée dans `docs/reviews/AQ-SEO-011.md` avec
  `Max severity: none` et `Ship allowed: yes`.

## Matrice d'approbation de la copie

Valider ce plan autorise les faits qualitatifs suivants à être reformulés pour
une lecture naturelle, sans en élargir le sens. Aucun chiffre commercial n'est
approuvé par cette matrice.

| Service | Offre, public et zone | Livrables approuvés | Déroulement approuvé | Facteurs de délai | Limites approuvées |
|---|---|---|---|---|---|
| Développeur web | Accompagnement des indépendants, PME et équipes produit du Valais pour un site, une interface métier ou un besoin technique, du cadrage à la mise en ligne. | Cadrage et priorités; parcours et interface; développement web/CMS et intégrations selon périmètre; déploiement et transmission technique. | Échange initial; périmètre écrit; réalisation et validations progressives; mise en ligne puis suivi convenu. | Périmètre, contenus disponibles, intégrations et rythme des validations; planning confirmé après cadrage. | Aucun résultat commercial ou SEO garanti; contenus et accès doivent être fournis ou approuvés; maintenance et services tiers dépendent du mandat. |
| Création de site | Création de sites sur mesure pour indépendants, PME et jeunes entreprises du Valais afin de présenter clairement leur offre et faciliter la prise de contact. | Structure des pages; interface responsive; intégration des contenus; CMS si nécessaire; base SEO technique; déploiement et prise en main. | Objectifs et contenus; structure et direction visuelle; développement et retours; mise en ligne. | Nombre de pages, disponibilité des contenus, niveau de personnalisation, intégrations et validations; planning après cadrage. | Aucun classement ni volume de demandes garanti; rédaction, médias et intégrations supplémentaires sont cadrés selon les éléments disponibles. |
| Refonte de site | Modernisation pour indépendants et PME du Valais dont le site est lent, difficile à administrer ou peu clair, sur les plans UX, technique et SEO. | Audit UX/technique; priorités; interface modernisée; corrections de performance et SEO dans le périmètre; migration et mise en ligne lorsque les accès le permettent. | Audit du site et des accès; priorisation; réalisation avec validations; migration contrôlée et suivi. | Dette technique, technologies existantes, accès, volume de contenu, migrations et validations; planning après audit. | L'audit décide ce qui peut être conservé; aucun gain de classement ou de conversion garanti; les plateformes tierces peuvent limiter l'intervention. |
| Application mobile | Conception d'applications iOS et Android pour entreprises et équipes produit du Valais ayant un usage métier ou un parcours client à outiller. | Cadrage des usages; parcours et prototype; développement mobile; connexion aux API selon périmètre; tests, distribution et transmission. | Prioriser l'usage; valider les parcours; livrer et tester progressivement; préparer la distribution puis le suivi. | Nombre de plateformes, fonctionnalités, backend/API, comptes de publication, retours et validation des stores; planning après cadrage. | Les stores et services tiers gardent leurs propres règles et délais; les accès doivent être disponibles; aucune adoption ni résultat métier garanti. |

Pour les quatre pages, la preuve autorisée est le portfolio réellement publié
sur `/#portfolio`. La prochaine étape autorisée est un échange via `/#contact`.
Le texte peut préciser que les études détaillées ne sont affichées qu'après
validation, sans laisser entendre qu'une étude inexistante est disponible.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| Chaque page commence par l'offre, le public et la zone dans une réponse autonome | 1, 2, 3, 4 |
| Livrables, processus, délais, limites et prochaine étape sont couverts | 1, 2, 3, 4 |
| Les titres permettent de retrouver chaque question de décision | 1, 2, 3 |
| Aucun prix, délai précis ou fait variable non approuvé n'est publié | 1, 2, 3, 4 |
| Le français corrige accents, encodage et formulations artificielles | 2, 3, 4 |
| Chaque page relie une preuve pertinente et le contact | 1, 2, 3, 4 |
| Une affirmation non approuvée ne passe pas la release | 2, 3, 4 |
| Sans chiffre approuvé, les facteurs de cadrage sont expliqués | 2, 3, 4 |
| L'approbation humaine des affirmations sensibles est traçable | Matrice, 2, 4 |

## Impacts explicitement cadrés

- **Migration / données :** aucune migration, aucun backfill et aucune mutation
  de contenu Supabase.
- **RLS / autorisation :** aucune politique, permission, RPC, route API ou rôle
  modifié; le portfolio conserve son filtre public existant.
- **Stockage :** aucun bucket, média ou fichier client modifié.
- **Routes publiques :** aucune route ajoutée, traduite, redirigée ou supprimée;
  canonicals et stratégie française uniquement inchangés.
- **Dépendances / IA :** aucune dépendance ni génération de contenu en
  production; l'IA ne valide aucune affirmation.
- **Données destructives :** aucune suppression, réécriture de base ou commande
  destructive.
- **Déploiement / rollback :** changement applicatif seulement; image
  `previous` récupérable et aucune restauration de base.
- **Hors ticket :** études de cas AQ-SEO-012, prix, durées chiffrées, avis,
  traductions, CMS de services, pages locales supplémentaires, refonte générale
  du design et garantie de citation par un moteur génératif.

## Validation humaine requise

En validant explicitement ce plan, Antoine valide aussi la matrice qualitative
ci-dessus et confirme qu'aucun prix, délai chiffré, nom client, témoignage ou
résultat quantifié ne doit être publié dans AQ-SEO-011. L'implémentation et la
mise en production feront ensuite l'objet de validations séparées.

Validation explicite reçue d'Antoine le 4 septembre 2026 (« je valide »).
