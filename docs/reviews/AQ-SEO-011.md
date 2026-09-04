# AQ-SEO-011 — Revue de livraison

## Périmètre revu

- recherche et plan validé : `docs/research/AQ-SEO-011.md` et
  `docs/plans/AQ-SEO-011.md`;
- modèle éditorial et rendu partagé :
  `shared/utils/publicServiceContent.ts` et
  `app/components/ui/ServiceDecisionContent.vue`;
- quatre pages françaises de service sous `app/pages/*-valais.vue`;
- preuve HTTP, tests Vitest, parcours Playwright, CI et procédure d'exploitation.

Base vérifiée : `origin/main` au commit `07f6f194`. Aucun fichier hors ticket,
aucune migration et aucune dépendance ne font partie du diff revu.

## Résultat fonctionnel

Les critères du plan sont couverts. Chaque page commence par une introduction
qui décrit l'offre, le public et le Valais, puis rend les cinq questions dans
l'ordre approuvé. Les introductions visibles sont la source des descriptions
`Service`; les canonicals et fils d'Ariane existants restent inchangés. Les
preuves pointent uniquement vers `/#portfolio` et `/#contact`.

La copie a été comparée à la matrice validée. Elle ne publie aucun prix, délai
chiffré, pourcentage, client, témoignage ou résultat quantifié. Les limites
décrivent les résultats comme variables et les études détaillées comme soumises
à validation.

## Revue sécurité

Aucun finding critical, major ou minor dans le périmètre :

- le contenu est statique, public et échappé par Vue; aucun `v-html`, secret,
  cookie, donnée CRM, endpoint, rôle, RLS, stockage ou dépendance n'est ajouté;
- le constructeur refuse les champs vides, espaces parasites, doublons,
  précisions commerciales, mojibake et destinations autres que les deux ancres
  locales approuvées;
- le contrôle HTTP exige une origine HTTP(S) sans identifiants, chemin, query ou
  fragment, refuse les redirections, reste sur cette origine et borne délai et
  taille de réponse;
- les erreurs du contrôle restent descriptives sans imprimer la copie complète
  ni transmettre de donnée;
- le rollback est applicatif via l'image `previous` et ne demande aucune
  restauration de base.

## Accessibilité et présentation

Le rendu utilise des sections natives, des `h2`, des listes et des liens. Les
CTA gardent une hauteur de 52 px dans l'aperçu bureau et un focus clavier visible
avec contour. L'inspection sur l'aperçu Portly confirme deux colonnes sur bureau,
une colonne sur mobile, aucun débordement horizontal et des titres équilibrés à
390 px. Les thèmes clair et sombre ont été inspectés; les cartes ajoutées restent
lisibles dans les deux modes.

## Preuves exécutées

- `bash -n scripts/ops/verify-service-decision-content.sh` : succès.
- `npx vitest run tests/seo-service-decision-content.test.ts --maxWorkers=1` :
  48/48 tests réussis, y compris les fixtures fail-closed.
- `npm test` : 56 fichiers et 392/392 tests réussis.
- `npm run typecheck` : succès.
- `npm run build` : succès, rendu Nitro produit.
- `npm run quality:budgets` : succès; bundle 5 828 651 octets, scène 1 010 718
  octets sous son plafond de 1 500 000.
- `verify-service-breadcrumbs.sh http://127.0.0.1:3104` : 4 services et 6 pages
  profondes valides.
- `verify-service-decision-content.sh http://127.0.0.1:3104` : 4/4 services
  valides.
- `playwright test e2e/public.spec.ts --project=chromium` sur l'aperçu local :
  7/7 parcours réussis, dont le nouveau parcours sans JavaScript.
- `git diff --check` : succès.

## Verdict

L'implémentation est conforme au ticket et peut être proposée en PR. Sa fusion
et son déploiement restent conditionnés à la validation humaine séparée prévue
par le plan.

Max severity: none
Ship allowed: yes
