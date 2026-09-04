# Revue AQ-SEO-007 — Blog rendu côté serveur

## Périmètre

Revue du diff de `codex/aq-seo-007-blog-ssr` contre `main`, avec la story,
l'analyse et le plan validé comme références. La revue couvre le rendu serveur,
le contrat public, l'isolation de tenant, le payload d'hydratation, les états
d'interface, les preuves de release et le rollback.

## Findings

### Critical

Aucun.

### Major

Aucun. Les deux écarts relevés pendant la première passe ont été corrigés :

- `scripts/ops/verify-blog-ssr.sh` décode désormais `__NUXT_DATA__`, compare
  exactement sa liste à l'API canonique, refuse les champs et états
  d'authentification sensibles et détecte toute carte supplémentaire ;
- `scripts/ops/deploy-release.sh` exécute cette preuve avant de désarmer le
  rollback automatique.

### Minor

Aucun finding bloquant ou directement requis par la story. Un durcissement
ultérieur par cache court ou limitation au reverse proxy réduirait la charge
possible sur l'endpoint public utilisant le client serveur, mais cette
protection de disponibilité dépasse le périmètre fonctionnel AQ-SEO-007.

## Critères et preuves

- Le HTML initial de `/blog` contient les 6 articles publiés locaux avec titre,
  extrait, date et lien encodé.
- Le listing utilise une organisation canonique indépendante des en-têtes de
  session et applique `published = true` avec une projection de huit champs.
- Le payload Nuxt est identique au DTO public et tout état `pinia.auth` non vide
  fait échouer la garde.
- Les erreurs internes deviennent un `503` public générique et l'interface
  distingue erreur, chargement, résultats et vide.
- Le test navigateur clique un article sans JavaScript et vérifie la stabilité
  après hydratation, y compris les erreurs de page.
- La preuve SSR est intégrée à la transaction de déploiement afin qu'un échec
  restaure l'image `previous`.

Commandes et résultats observés via Portly :

- `npm test` : 52 fichiers, 301 tests réussis ;
- `npm run typecheck` : réussi ;
- `npm run build` : réussi ;
- `npm run quality:budgets` : réussi ;
- `bash -n scripts/ops/*.sh` : réussi ;
- Playwright `e2e/public.spec.ts` : 5 tests réussis ;
- `verify-blog-ssr.sh http://127.0.0.1:3104` : 6 articles SSR vérifiés ;
- `git diff --check` : réussi.

Max severity: none
Ship allowed: yes
