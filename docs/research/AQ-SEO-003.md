# Recherche AQ-SEO-003 — Séparer visibilité ChatGPT et entraînement OpenAI

## Ticket et décision produit

`AQ-SEO-003` applique exclusivement `GEO-R008` et la décision humaine
`OD-SEO-003` : autoriser la découverte par `OAI-SearchBot` et refuser
`GPTBot`. La story exige aussi de conserver l'autorisation générique des
moteurs classiques et la déclaration du sitemap canonique
(`docs/product/stories.md`, `docs/product/prd.md`). Elle ne promet ni présence,
ni classement, ni citation dans ChatGPT et ne couvre pas les visites déclenchées
directement par un utilisateur.

## Documentation officielle vérifiée

La documentation officielle OpenAI consultée le 3 septembre 2026 confirme les
noms `OAI-SearchBot` et `GPTBot`, ainsi que l'indépendance de leurs politiques :
autoriser le premier rend le contenu public éligible à ChatGPT Search, tandis
que refuser le second indique que le contenu ne doit pas servir à l'entraînement
des modèles génératifs. OpenAI précise que la prise en compte d'un changement de
`robots.txt` pour la recherche peut prendre environ 24 heures.

Source primaire :
<https://developers.openai.com/api/docs/bots> (sections `OAI-SearchBot` et
`GPTBot`). La FAQ éditeurs confirme la même séparation :
<https://help.openai.com/en/articles/12627856-publishers-and-developers-faq>.

`ChatGPT-User` correspond à des actions initiées par un utilisateur, n'est pas
le crawler de Search et peut ne pas suivre `robots.txt`; il reste donc hors du
périmètre explicite de la story et ne doit pas recevoir de règle inventée.

## Architecture et état vérifiés

- `server/routes/robots.txt.ts` génère la réponse à chaque requête depuis
  `runtimeConfig.public.siteUrl`, retire les slashs terminaux, fixe le type
  `text/plain; charset=UTF-8` et retourne actuellement un seul groupe
  `User-agent: *` avec `Allow: /`.
- Le même handler déclare `Sitemap: ${siteUrl}/sitemap.xml`; grâce au fallback
  `.ch` de `nuxt.config.ts` et à `AQ-SEO-001`, la production expose aujourd'hui
  `Sitemap: https://www.antoinequarroz.ch/sitemap.xml`.
- La réponse de production contrôlée le 3 septembre 2026 est `200`, autorise
  génériquement `/` et référence un sitemap qui répond `200` en XML. Elle ne
  contient aucune règle explicite pour les deux crawlers OpenAI.
- `server/routes/sitemap.xml.ts` construit séparément le sitemap. La story ne
  nécessite aucune modification de ses entrées ni de sa logique Supabase.
- Les surfaces privées sont protégées au niveau de leurs réponses par les
  `routeRules` de `nuxt.config.ts` issues d'`AQ-SEO-002`. `robots.txt` n'est ni
  une authentification ni une barrière de confidentialité.
- `.github/workflows/ci.yml` exécute déjà, après le déploiement, les preuves du
  SHA/santé, du domaine canonique et des directives privées. La nouvelle preuve
  de politique robots doit s'insérer après celles-ci sans les remplacer.

## Conventions de test et d'exploitation

- Les tests SEO existants (`tests/seo-domain.test.ts` et
  `tests/seo-private-routes.test.ts`) verrouillent la configuration source,
  l'ordre CI et les scripts Bash avec des serveurs HTTP locaux positifs et
  négatifs.
- Les scripts sous `scripts/ops/verify-*.sh` valident leurs URL d'entrée,
  utilisent un `curl` borné, échouent sur une destination indisponible et ne
  manipulent aucun secret.
- `scripts/ops/deploy-release.sh` conserve l'image précédente pour le rollback.
  Cette story ne demande aucune modification de Docker, Caddy ou du déploiement.

## Intégration recommandée

Produire trois groupes non ambigus dans `server/routes/robots.txt.ts` :

1. `User-agent: OAI-SearchBot` avec `Allow: /` ;
2. `User-agent: GPTBot` avec `Disallow: /` ;
3. `User-agent: *` avec `Allow: /`.

Conserver ensuite une seule déclaration absolue du sitemap canonique. Ajouter
un test de structure par groupes afin qu'une directive d'un crawler ne soit pas
acceptée par erreur parce qu'elle apparaît dans le groupe d'un autre crawler.
Ajouter aussi une preuve HTTP de production qui télécharge `robots.txt`, valide
la politique effective et contrôle que le sitemap déclaré est canonique et
disponible.

## Risques, sécurité et rollback

- Une recherche naïve de chaînes ne suffit pas : elle pourrait accepter des
  groupes contradictoires, un `Disallow` placé sous le mauvais user-agent ou un
  second groupe spécifique qui inverse la décision.
- `OAI-SearchBot` doit pouvoir lire les pages publiques. Les pages privées
  restent non indexables par leur header `X-Robots-Tag`; aucune donnée privée ne
  doit être rendue publique pour cette story.
- Le refus de `GPTBot` exprime une préférence de crawling selon la documentation
  OpenAI; il ne constitue pas une protection technique contre tout accès réseau.
- Aucun secret, accès, rôle, donnée, migration, RLS, stockage ou dépendance npm
  n'est requis.
- Rollback : restaurer le handler et l'appel de preuve précédents, puis revenir à
  l'image `previous` si une livraison produit une politique incorrecte.

## Questions restantes

Aucune ambiguïté matérielle. `OD-SEO-003` est explicitement validée et les noms
des crawlers ont été reconfirmés dans la documentation officielle actuelle.
