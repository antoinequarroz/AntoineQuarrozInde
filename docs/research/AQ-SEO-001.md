# AQ-SEO-001 — Recherche : domaine public unique

## Besoin validé

La story `AQ-SEO-001` demande qu'une requête HTTPS vers `antoinequarroz.ch` soit redirigée définitivement vers `https://www.antoinequarroz.ch` en conservant le chemin et les paramètres, que `www` continue de servir l'application sans boucle et qu'aucune sortie publique de production ne référence le domaine inexistant `.dev` (`docs/product/stories.md`). Elle couvre `SEO-R005` et `SEO-R006` du PRD validé (`docs/product/prd.md`).

Le 2 septembre 2026, une vérification HTTP a confirmé que `https://www.antoinequarroz.ch/` répond `200`, tandis que l'apex transmet encore directement les requêtes à Nuxt : `https://antoinequarroz.ch/demo/path?utm_source=seo` répond `404` applicatif au lieu d'une redirection. Le comportement observé correspond à la configuration actuelle qui regroupe les deux hôtes dans un même bloc (`Caddyfile`).

## Flux actuel vérifié

1. Le trafic HTTP(S) public entre dans le conteneur Caddy exposé sur les ports 80 et 443 (`docker-compose.yml`).
2. Le même site Caddy accepte actuellement `antoinequarroz.ch` et `www.antoinequarroz.ch`, active la compression puis transmet chaque requête au service `web:3000` (`Caddyfile`).
3. Le conteneur `web` exécute le serveur Nuxt compilé et reçoit ses variables via `.env` (`Dockerfile`, `docker-compose.yml`).
4. `runtimeConfig.public.siteUrl` lit `NUXT_PUBLIC_SITE_URL`, mais utilise actuellement `https://www.antoinequarroz.dev` si la variable est absente (`nuxt.config.ts`).
5. Cette valeur alimente directement les canonicals, `og:url`, les identifiants JSON-LD, `robots.txt`, le sitemap et plusieurs URLs applicatives ; les références ont été vérifiées dans `app/pages/index.vue`, `app/pages/blog/index.vue`, `app/pages/blog/[slug].vue`, `app/pages/projets/[slug].vue`, `server/routes/robots.txt.ts`, `server/routes/sitemap.xml.ts` et les utilitaires de portail/paiement trouvés par recherche.
6. `.env.example` fournit déjà la valeur correcte `https://www.antoinequarroz.ch`, mais ce fichier d'exemple n'empêche pas un déploiement ou un lancement sans variable (`.env.example`, `nuxt.config.ts`).
7. La livraison CI cible `https://www.antoinequarroz.ch` et vérifie le SHA et la santé applicative après déploiement (`.github/workflows/ci.yml`, `scripts/ops/verify-production-release.sh`). Elle ne vérifie actuellement ni la redirection de l'apex ni l'absence de `.dev` dans les sorties publiques.

## Conventions et intégrations

- Le dépôt utilise Vitest pour les contrôles unitaires et statiques ; `tests/release-pipeline.test.ts` lit les fichiers de workflow/scripts et exécute les scripts shell contre des serveurs HTTP locaux.
- La CI exécute `bash -n scripts/ops/*.sh`, `npm test`, `npm run typecheck`, `npm run build` et `npm run quality:budgets` avant toute livraison (`.github/workflows/ci.yml`).
- `scripts/ops/deploy-release.sh` construit une image candidate, conserve l'image web précédente, attend le healthcheck et restaure l'image web précédente en cas d'échec.
- Le déploiement lance `docker compose up -d --no-build --remove-orphans`, mais ne demande pas explicitement à Caddy de recharger le fichier monté. Une modification du contenu d'un bind mount ne garantit pas à elle seule que le processus Caddy actif relise sa configuration ; l'activation doit donc être explicite et vérifiée (`scripts/ops/deploy-release.sh`, `docker-compose.yml`).
- Le script de vérification de release accepte une URL de base paramétrable, ce qui permet aux tests d'utiliser un serveur local sans accès production (`scripts/ops/verify-production-release.sh`, `tests/release-pipeline.test.ts`).

## Points d'intégration du ticket

- `Caddyfile` : séparer l'hôte apex de l'hôte `www`, appliquer une redirection permanente sur l'apex et conserver le reverse proxy uniquement sur `www`.
- `nuxt.config.ts` : supprimer le fallback `.dev` au profit du domaine `.ch` validé, sans modifier les consommateurs de `runtimeConfig.public.siteUrl`.
- `scripts/ops/deploy-release.sh` : garantir que la configuration Caddy validée est effectivement rechargée pendant la release et qu'un échec de validation/reload arrête la livraison sans remplacer une configuration active valide.
- `scripts/ops/verify-production-release.sh` ou un contrôle shell dédié : produire une preuve post-release de la redirection apex avec conservation du chemin et des paramètres, en plus de la preuve SHA/santé existante.
- `.github/workflows/ci.yml` : appeler la preuve de domaine après la livraison si celle-ci n'est pas intégrée au script de vérification existant.
- `tests/release-pipeline.test.ts` et/ou un test SEO ciblé : couvrir la configuration Caddy, l'absence de `.dev`, les entrées invalides du contrôle et les résultats succès/échec contre une fixture HTTP locale.

## Validation et données

AQ-SEO-001 ne modifie aucun schéma, aucune donnée Supabase, aucune API métier et aucun contrôle d'autorisation. La valeur `siteUrl` reste publique et ne doit contenir aucun secret. La redirection doit préserver le chemin et la query string ; les URLs fournies aux scripts doivent rester validées avant d'être transmises à `curl`.

La vérification ne doit pas suivre aveuglément la redirection lorsqu'elle cherche à prouver le statut initial : elle doit contrôler le code permanent et la valeur exacte ou normalisée de `Location`, puis vérifier séparément que la destination `www` répond. Les tests locaux ne doivent effectuer aucun appel réseau externe.

## Sécurité et rollback

- La redirection ne change pas l'authentification et ne doit pas élargir l'accès aux routes privées.
- Une configuration Caddy invalide ne doit pas remplacer la configuration active : valider avant reload et traiter tout échec comme un échec de release.
- La configuration ne doit pas refléter un hôte fourni par l'utilisateur dans `Location`; la destination reste le domaine `www` fixé par le produit.
- Le rollback applicatif existant ne restaure que l'image web. Le changement Caddy étant versionné séparément de l'image, le plan doit prévoir un retour explicite au `Caddyfile` précédent et un reload en cas de régression de routage.
- Aucun secret, certificat ou valeur de `.env` ne doit être écrit dans les tests ou les logs.

## Tests et preuves attendus

- Test statique ou validation Caddy prouvant deux blocs distincts : apex en redirection permanente et `www` en reverse proxy.
- Test prouvant que `nuxt.config.ts` ne contient plus `antoinequarroz.dev` et utilise le domaine canonique validé comme fallback.
- Test shell local du contrôle de domaine : statut permanent, `Location` avec chemin et query préservés, destination disponible, échec sur statut ou destination incorrecte.
- `bash -n scripts/ops/*.sh`.
- `npm test`, `npm run typecheck`, `npm run build`, `npm run quality:budgets` et `git diff --check`.
- Après livraison humaine : preuve HTTP sur la racine, un chemin et un chemin avec paramètres depuis l'apex, puis preuve `200` sur `www`.

## Dépendances, limites et questions

- Dépendances : Caddy 2 dans Docker, le pipeline AQ-058 et l'environnement VPS existant.
- Le ticket ne change pas la stratégie multilingue ni les canonicals par locale ; ce travail appartient à `AQ-SEO-004` et `AQ-SEO-005`.
- Le ticket ne déploie pas automatiquement et ne modifie ni DNS ni certificats.
- Aucune ambiguïté produit restante : le domaine canonique et le comportement apex ont été validés dans le PRD et la story.
