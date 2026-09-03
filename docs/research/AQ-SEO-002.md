# Recherche AQ-SEO-002 — Exclure les surfaces privées des résultats de recherche

## Ticket et périmètre

`AQ-SEO-002` couvre exclusivement les réponses HTML sous `/admin/**`, `/portal/**` et `/offline`. La story exige `noindex, nofollow`, l'absence du sitemap et de la navigation publique, ainsi qu'une preuve sur une connexion, une page admin protégée, une page portail et la page hors-ligne. Elle interdit de traiter la directive robots comme un contrôle d'accès et ne demande aucun changement de rôle, d'authentification ou de donnée (`docs/product/stories.md`, `docs/product/prd.md`).

## Architecture vérifiée

- L'application est une application Nuxt 4 configurée dans `nuxt.config.ts`; aucune `routeRules` n'est actuellement déclarée. `app.head.meta` fournit des métadonnées globales publiques mais aucune directive robots privée.
- Les routes sont des pages fichiers sous `app/pages/`. Les familles concernées sont `app/pages/admin/**`, `app/pages/portal/**` et `app/pages/offline.vue`.
- Les pages admin protégées utilisent le layout `app/layouts/admin.vue` et les middlewares clients `app/middleware/admin.ts` ou `app/middleware/project-viewer.ts`. Ces middlewares retournent immédiatement côté serveur et redirigent côté client après vérification de session.
- Le portail utilise `app/middleware/portal.ts`; `/portal/login` et `/portal/setup` n'utilisent pas ce middleware. Le portail charge ses données par des API authentifiées et `server/utils/portalAccess.ts` reste la frontière d'accès serveur.
- Les pages `/admin/login`, `/portal/login` et `/portal/setup` utilisent `layout: false`; aucune n'appelle `useSeoMeta` ou `useHead` pour les robots. `app/pages/offline.vue` définit uniquement un titre et une description.
- `server/routes/sitemap.xml.ts` construit une liste publique explicite et n'inclut aucune route admin, portail ou hors-ligne. `server/routes/robots.txt.ts` autorise aujourd'hui génériquement `/`; la story exige une directive par réponse et ne peut donc être satisfaite par ce fichier seul.
- `app/components/layout/AppHeader.vue` et `app/components/layout/AppFooter.vue` ne lient aucune surface privée. Le raccourci `/admin/login` dans le manifeste PWA de `nuxt.config.ts` est un accès fonctionnel explicite réservé à l'application installée, pas un lien de navigation publique HTML.

## Parcours représentatif

Une requête anonyme vers `/admin` reçoit actuellement le HTML SSR du layout et de la page. Après hydratation, `app/middleware/admin.ts` vérifie la session et redirige vers `/admin/login` si nécessaire. Les appels de données restent protégés côté API par les helpers d'autorisation existants. Une directive d'indexation doit donc être ajoutée au niveau de la réponse HTTP, indépendamment du middleware client, afin de couvrir le HTML initial, la page de connexion, les redirections futures et les réponses d'erreur sans altérer ce parcours.

Le même principe vaut pour `/portal`: le middleware client redirige l'utilisateur anonyme vers `/portal/login`, tandis que les données sont chargées avec `auth.authHeader()` et contrôlées côté serveur. `noindex` complète la visibilité moteur mais ne remplace aucune de ces protections.

## État observé en production

Le 3 septembre 2026, les requêtes vers `/admin/login`, `/admin`, `/portal/login`, `/portal`, `/portal/setup` et `/offline` répondaient en HTML sans `X-Robots-Tag` et sans meta robots `noindex`. Le sitemap de production ne contenait aucune correspondance `/admin`, `/portal` ou `/offline`. Cette observation confirme le défaut d'indexation et l'absence déjà correcte du sitemap.

## Conventions de test et d'exploitation

- Les tests Vitest lisent les fichiers de configuration et les pages pour verrouiller des invariants ciblés (`tests/seo-domain.test.ts`, `tests/legal-compliance.test.ts`).
- Les frontières public/privé sont déjà testées séparément pour Plausible dans `tests/plausible.test.ts`.
- Les preuves HTTP de release utilisent des scripts Bash bornés avec `curl`, testés par Vitest contre des serveurs locaux, puis appelés après les preuves de version et de santé dans `.github/workflows/ci.yml` (`scripts/ops/verify-domain-canonicalization.sh`, `tests/seo-domain.test.ts`).
- Le déploiement conserve un rollback d'image et valide Caddy avant activation (`scripts/ops/deploy-release.sh`, `docs/operations.md`). AQ-SEO-002 ne nécessite aucune modification Caddy.

## Intégration recommandée

Déclarer des headers `X-Robots-Tag: noindex, nofollow` dans les `routeRules` Nuxt pour les bases et descendants `/admin`, `/portal`, ainsi que `/offline`. Les bases doivent être explicites en plus des globs afin que `/admin` et `/portal` soient couvertes sans dépendre de la sémantique d'un motif `/**`.

Ajouter un script de preuve HTTP qui échantillonne `/admin/login`, `/admin`, `/portal/login`, `/portal` et `/offline`, accepte leur statut fonctionnel normal mais exige la directive sur chaque réponse. Le script doit borner les délais, conserver TLS, valider l'URL de base et ne transmettre aucun identifiant. La CI de déploiement doit l'exécuter après les preuves de version, santé et domaine canonique.

## Sécurité, risques et limites

- `noindex` n'est pas une autorisation. Les middlewares, helpers serveur, RLS et contrôles API existants restent inchangés et sources de vérité.
- Un header de famille est préférable à une meta répétée dans chaque page : il couvre les nouvelles pages privées et les états non-HTML sans dépendre de l'exécution Vue.
- Le test ne doit jamais se connecter ni afficher de contenu privé; les échantillons restent anonymes.
- Les routes privées sont déjà absentes du sitemap et de la navigation HTML publique; ces invariants doivent être verrouillés sans retirer le raccourci PWA admin explicitement fonctionnel.
- Aucun changement de base, migration, RLS, stockage, dépendance, secret ou donnée de production n'est requis.
- Le rollback consiste à restaurer les `routeRules`, le script de preuve et l'appel CI précédents, puis redéployer l'image antérieure si nécessaire.

## Questions restantes

Aucune ambiguïté matérielle : les familles de routes et la directive exacte sont validées par la story. Le statut HTTP des pages privées doit rester leur statut fonctionnel actuel; la preuve contrôle uniquement la présence de la directive.
