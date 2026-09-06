# Exploitation et reprise après incident

## Surveillance indépendante

Le timer systemd `antoinequarroz-monitor.timer` contrôle le site, Supabase, TLS,
les conteneurs, le disque et les sauvegardes toutes les cinq minutes depuis le
VPS. Il envoie un e-mail après trois échecs consécutifs et un message de
rétablissement. Les erreurs navigateur et serveur sont également conservées
dans `application_errors` et consultables depuis `/admin/errors`.

Comme un moniteur hébergé sur le VPS ne peut rien signaler lorsque toute la
machine est indisponible, `.github/workflows/uptime.yml` exécute en complément
un contrôle externe toutes les quinze minutes. Il exige un `/api/health`
entièrement vert et une version de production immuable valide. Après trois
échecs, il ouvre un seul incident GitHub intitulé
`[Monitoring] Production indisponible`; les contrôles suivants ne créent aucun
doublon. Dès le rétablissement, le workflow commente puis ferme cet incident.
Ce contrôle n'utilise aucun secret de production.

## Porte SEO et baseline de performance

`AQ-SEO-014` définit les pages critiques et les budgets dans
`scripts/seo/release-quality.config.mjs`. Chaque pull request et push construit
le candidat puis conserve une baseline mobile reproductible : viewport fixe,
mouvement réduit et scène Spline neutralisée pour mesurer le contenu critique
indépendamment du réseau 3D. Le rapport JSON distingue les erreurs de mesure des
dépassements et n'invente jamais un INP laboratoire.

Après déploiement, la même baseline est mesurée sur le domaine public. La preuve
`scripts/ops/verify-seo-release.sh` regroupe les contrôles HTTP, canonicals,
robots, `hreflang`, sitemap, HTML SSR et données structurées existants. Elle est
exécutée sur le VPS avant de désarmer le rollback : tout échec remet l'image
`previous` en service.

Les données terrain LCP, INP et CLS au 75e percentile sont interrogées via
Chrome UX Report lorsque `CRUX_API_KEY` est disponible dans l'environnement
GitHub Production. Le rapport utilise les états `available`,
`insufficient-data`, `not-configured` ou `error`; une absence n'est jamais
affichée comme zéro. Les budgets sont LCP ≤ 2,5 s, INP ≤ 200 ms et CLS ≤ 0,1.
Les artefacts `seo-lab-*` et `seo-quality-*` sont conservés 30 jours sans clé ni
session utilisateur.

Contrôle local sur un serveur Portly existant :

```bash
npm run quality:seo:lab -- http://127.0.0.1:3104
```

Une dérogation à une régression critique doit être documentée dans le document
de release concerné avec le contrôle, le SHA, le motif, l'auteur et une date
d'expiration. Copier `docs/releases/seo-quality-waiver.example.json` vers
`docs/releases/seo-quality-waiver.json`; la dérogation est refusée si elle est
incomplète, expirée ou valable plus de quatorze jours. Elle n'est jamais
implicite et ne modifie pas les seuils globaux. Supprimer le fichier dès que la
correction est livrée.

## Déploiement et retour arrière

La livraison normale passe exclusivement par une pull request, sa fusion dans
`main`, puis l'approbation de l'environnement GitHub `Production`.
`scripts/ship.ps1` est volontairement désarmé : il ne réalise plus de `git add`,
de commit, de push ou de déploiement manuel. Avant de remplacer le conteneur, l'image active
est conservée sous le tag `antoinequarroz-web:previous`. La nouvelle image est
construite sous le tag `candidate` avec le hash Git et l'heure de construction.

Le script attend ensuite que le contrôle Docker soit `healthy`. Si la
construction, le démarrage ou le contrôle échoue, l'image `previous` est remise
en service automatiquement. Le dépôt peut rester sur le nouveau commit : c'est
l'image immuable précédente qui assure le retour arrière.

La version réellement exécutée est consultable sans cache :

```bash
curl https://www.antoinequarroz.ch/api/version
```

Le résultat contient `version`, `builtAt` et `environment`. Après un incident,
vérifier aussi les journaux du conteneur :

```bash
docker compose logs --tail=100 web
```

### Livraison automatisée depuis GitHub

Une pull request ne déploie jamais : elle exécute uniquement les contrôles de
qualité et d'accessibilité. Après fusion dans `main`, le workflow suit cet ordre
strict :

1. tests, TypeScript, build, budgets et préflight PostgreSQL local ;
2. démarrage du candidat en CI et E2E publics hermétiques (scénarios sans `@live-data`) sans identifiants avant toute production ;
3. approbation humaine de l'environnement GitHub `Production` ;
4. détection, sauvegarde chiffrée et promotion des migrations en attente ;
5. déploiement du SHA exact sur le VPS avec `scripts/ops/deploy-from-ci.sh` ;
6. attente de ce même SHA sur `/api/version` et d'un `/api/health` vert ;
7. vérification que l'apex redirige définitivement vers `www` en conservant l'URI ;
8. vérification des routes privées, des crawlers, des pages localisées et des routes françaises uniquement ;
9. validation de l'identité éditoriale et du `BlogPosting` de chaque article publié ;
10. E2E de production avec les identifiants du compte sandbox et, si son compte a un facteur vérifié, `E2E_ADMIN_TOTP_SECRET`.

Les exécutions planifiées et manuelles vérifient la production courante sans
redéployer. Sur un push `main`, les secrets de production ne deviennent
accessibles au runner qu'après l'approbation. Le job compare alors les migrations
locales avec `supabase_migrations.schema_migrations` et exécute un
`db push --dry-run`.

S'il n'existe aucune migration en attente, aucune sauvegarde ni mutation n'est
effectuée. Sinon, `scripts/ops/promote-supabase-migrations.sh` crée d'abord un
dump du schéma et des données `public`, l'archive et le chiffre avec `age`. Seuls
le fichier `.age`, sa somme SHA-256 et un manifeste sans secret sont conservés
30 jours comme artefact GitHub. Les fichiers SQL clairs et le profil Supabase
temporaire sont toujours supprimés.

Les migrations versionnées sont ensuite appliquées et l'historique est relu.
Le déploiement SSH du conteneur ne commence que si l'historique est aligné. Une
divergence, un dump incomplet, une migration en échec ou une post-vérification
incohérente bloque le nouveau conteneur et les E2E; l'application précédente
reste active.

Avant toute livraison, le job `database` construit une pile Supabase locale
éphémère, injecte `supabase/schema.sql` comme socle de test, rejoue toutes les
migrations puis exécute les assertions pgTAP de `supabase/tests/database/`.
Ce préflight n'utilise aucun secret, aucun projet lié et aucune donnée réelle.
Le lancer localement avec Docker actif :

```bash
npm run test:db
```

Un échec bloque le job `deploy`; ce préflight local n'applique jamais de
migration en production.

L'environnement GitHub `Production` est limité à la branche `main`, exige
Antoine comme reviewer et contient uniquement les secrets suivants :

- `VPS_SSH_PRIVATE_KEY` : clé Ed25519 dédiée à GitHub Actions ;
- `VPS_KNOWN_HOSTS` : ligne de clé d'hôte vérifiée, jamais produite à l'aveugle dans la CI ;
- `VPS_HOST` : adresse du VPS ;
- `VPS_USER` : utilisateur de déploiement non-root ;
- `VPS_PROJECT_DIR` : chemin absolu du dépôt sur le VPS ;
- `SUPABASE_ACCESS_TOKEN` : jeton personnel Supabase utilisé par la CLI ;
- `SUPABASE_PROJECT_REF` : identifiant de 20 caractères du projet attendu ;
- `SUPABASE_BACKUP_AGE_RECIPIENT` : clé publique `age` dont la clé privée reste hors de GitHub et du VPS.
- `E2E_ADMIN_EMAIL` et `E2E_ADMIN_PASSWORD` : identifiants du compte sandbox des E2E post-production ;
- `E2E_ADMIN_TOTP_SECRET` : secret Base32 optionnel du facteur TOTP de ce compte, requis uniquement après activation de sa MFA.

### Reprise après une migration

Il n'existe aucun rollback SQL automatique : plusieurs migrations peuvent être
validées avant qu'une suivante échoue, et tenter de les annuler peut supprimer
des données. Toute migration doit rester compatible avec l'image applicative
précédente; une suppression ou un renommage se livre en plusieurs phases.

La migration éditoriale AQ-SEO-006 installe en plus un garde-fou de base de
données avant la nouvelle image : une ancienne image peut encore créer et
modifier un brouillon, mais toute création publique, publication ou
dépublication directe est refusée. Seule la RPC atomique
`save_article_with_publication_audit` peut changer la visibilité et écrire son
audit. Un rollback vers l'image `previous` reste donc sûr, mais la publication
d'articles y est volontairement indisponible jusqu'au rétablissement de l'image
AQ-SEO-006 ou d'une version ultérieure compatible.

En cas d'incident, télécharger l'artefact correspondant au SHA depuis GitHub,
vérifier sa somme puis le déchiffrer sur une machine de reprise isolée :

```bash
sha256sum -c supabase-pre-migration-<sha>.tar.gz.age.sha256
age --decrypt --identity /chemin/hors-ligne/aq-production.agekey \
  --output supabase-pre-migration.tar.gz \
  supabase-pre-migration-<sha>.tar.gz.age
```

Tester d'abord le dump dans un projet Supabase temporaire. Une restauration de
production reste une opération manuelle explicitement approuvée; ne jamais
utiliser `migration repair` ou `db reset --linked` comme rollback automatique.

La clé personnelle utilisée par `scripts/deploy-vps.ps1` reste distincte. La clé
CI est installée dans `authorized_keys` avec `restrict` et une commande forcée
copiée depuis `scripts/ops/ci-ssh-gate.sh`. Installer aussi
`scripts/ops/deploy-from-ci.sh` hors du checkout comme
`/home/ubuntu/.local/bin/antoinequarroz-ci-deploy`. Après chaque release validée,
le script versionné est réinstallé atomiquement à cet emplacement afin que la
commande forcée utilise les garde-fous de la release suivante. Cette clé ne peut ouvrir aucun
shell, faire de redirection de port ou exécuter un script fourni par le runner :
elle ne lance que cette commande de livraison fixe. Pour révoquer l'automatisation,
supprimer la clé publique GitHub Actions du fichier
`~/.ssh/authorized_keys`, puis supprimer ou désactiver les secrets de
l'environnement `Production`. Un rollback opérationnel reste manuel, mais aucun
script local ne doit contourner le workflow de livraison. Un échec de build, de santé ou de version empêche les E2E et le
script VPS remet automatiquement l'image `previous` en service lorsque le
conteneur candidat a été lancé.

### Domaine canonique et Caddy

Le domaine public préféré est `https://www.antoinequarroz.ch`. Caddy redirige
les requêtes reçues sur `https://antoinequarroz.ch` vers `www` avec un statut
permanent, en conservant le chemin et les paramètres. Pendant une release,
`scripts/ops/deploy-release.sh` valide le `Caddyfile` avant le build puis recrée
le conteneur Caddy après le retour au vert du conteneur web. Cette recréation est
nécessaire pour rafraîchir le montage du fichier lorsqu'un checkout Git remplace
son inode ; Caddy recharge ensuite explicitement la configuration validée.

La CI contrôle ensuite la redirection et la disponibilité de la destination :

```bash
bash scripts/ops/verify-domain-canonicalization.sh \
  https://antoinequarroz.ch \
  https://www.antoinequarroz.ch
bash scripts/ops/verify-security-headers.sh \
  https://www.antoinequarroz.ch
```

Caddy ajoute sur le domaine canonique une politique CSP limitée aux protections
qui ne modifient pas le chargement des scripts, styles ou médias : interdiction
d'encapsuler le site, de définir une base distante et de charger des objets. Il
active également HSTS pendant un an, `nosniff`, une politique de référent stricte
et désactive caméra, géolocalisation et microphone. `includeSubDomains` et
`preload` restent volontairement absents tant que tous les sous-domaines ne sont
pas inventoriés.

Pour contrôler manuellement la conservation de l'URI sans suivre la redirection :

```bash
curl -sS -o /dev/null -D - \
  'https://antoinequarroz.ch/verification?utm_source=manual'
```

En cas de régression de routage, restaurer le `Caddyfile` de la release précédente,
le valider, puis le recharger dans le conteneur actif :

```bash
docker compose run --rm --no-deps caddy caddy validate \
  --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose up -d --no-deps --force-recreate caddy
docker compose exec -T caddy caddy reload \
  --config /etc/caddy/Caddyfile --adapter caddyfile
```

La validation précède toujours la recréation : une configuration invalide n'est
donc pas activée.
Le rollback d'image web reste indépendant et continue d'utiliser le tag `previous`.

### Identité publique et aperçus sociaux

La page d'accueil reprend une identité publique unique dans son contenu visible
et ses nœuds JSON-LD `Person` et `ProfessionalService`. Elle contient uniquement
les coordonnées et profils déjà approuvés. Toutes les pages présentes dans le
sitemap doivent également publier une image Open Graph/Twitter absolue avec un
texte alternatif; une image d'article ou de projet absente ou invalide revient
sur `/about.jpg`.

Après une livraison, contrôler anonymement l'ensemble des URL indexables :

```bash
bash scripts/ops/verify-identity-social.sh \
  https://www.antoinequarroz.ch
```

Le contrôle échoue si les coordonnées structurées divergent du footer, si une
balise ou son alt manque, ou si une image ne répond pas avec un type MIME image.
Pour éviter les requêtes arbitraires, il ne contacte que le domaine canonique et
le chemin public `media` d'un hôte Supabase en HTTPS, sans suivre de redirection.
Il ne requiert aucun secret ni accès CRM. En cas de régression, remettre en ligne
l'image applicative `previous`; aucune migration ni donnée n'est à restaurer.

### Attribution et fraîcheur des articles

Chaque article public doit exposer Antoine comme auteur approuvé, sa date source
de publication et une date de modification uniquement lorsque `updated_at` est
strictement postérieur à `published_at`. Le contenu visible et le JSON-LD
`BlogPosting` reprennent les mêmes valeurs, la même image et la même URL
canonique.

Après une livraison, contrôler anonymement tous les articles découverts depuis
l'API publique :

```bash
bash scripts/ops/verify-blog-posting.sh \
  https://www.antoinequarroz.ch
```

Le contrôle échoue sur une date invalide ou inventée, un auteur absent, une
divergence visible/structurée, un contenu non SSR ou un canonical incorrect. Il
ne suit aucune redirection, borne la taille des réponses et ne requiert aucun
secret. La migration auteur est append-only et accepte encore les payloads de
l'image précédente; un rollback applicatif ne supprime donc aucune donnée. Une
migration append-only complémentaire conserve aussi `updated_at` lors d'une
sauvegarde strictement identique et ne l'avance qu'après un changement
éditorial. Le préflight pgTAP couvre les deux comportements avant déploiement.

### Services et fils d'Ariane structurés

Les quatre pages françaises de service exposent un objet `Service` limité aux
informations réellement visibles et approuvées : intitulé, description,
fournisseur Antoine Quarroz, zone « Valais » et URL canonique. Les services, les
articles et les études de cas profondes rendent également un fil d'Ariane SSR
accessible et un `BreadcrumbList` construit depuis exactement les mêmes
libellés et URLs.

Après une livraison, contrôler anonymement toutes les pages concernées
découvertes dans le sitemap :

```bash
bash scripts/ops/verify-service-breadcrumbs.sh \
  https://www.antoinequarroz.ch

bash scripts/ops/verify-service-decision-content.sh \
  https://www.antoinequarroz.ch
```

Le contrôle exige les quatre services même lorsqu'aucun article ou cas client
n'est publié. Il échoue si le fil visible, le JSON-LD ou le canonical divergent,
si le fournisseur ou la zone ne correspondent plus au contenu, ou si un prix,
une offre, une note, un avis, une disponibilité ou un résultat artificiel est
ajouté. Il ne suit aucune redirection, borne les réponses, reste sur l'origine
fournie et ne requiert aucun secret. Le changement est purement applicatif : en
cas de régression, remettre l'image `previous` sans restauration de base.

Le second contrôle vérifie également que chaque service répond, en SSR et dans
le même ordre, aux questions sur les livrables, le déroulement, les facteurs de
délai, les limites et la prochaine étape. Il exige une introduction qui nomme
l'offre, le public et le Valais, puis les liens locaux vers le portfolio publié
et le contact. Il refuse les montants, devises, pourcentages, durées chiffrées,
promesses de résultat, textes corrompus, redirections et réponses trop grandes.
Comme le contrôle du balisage structuré, il reste anonyme, ne quitte jamais
l'origine fournie et ne nécessite aucun secret. Son rollback est uniquement
applicatif via l'image `previous`.

### Non-indexation des surfaces privées

Nuxt ajoute `X-Robots-Tag: noindex, nofollow` aux réponses de `/admin`,
`/admin/**`, `/portal`, `/portal/**` et `/offline`. Cette directive demande aux
moteurs de recherche de ne pas indexer ces pages ni suivre leurs liens. Elle ne
constitue jamais une protection d'accès : les middlewares, contrôles API et
politiques de base de données restent responsables de la sécurité.

Après une livraison, contrôler anonymement les pages représentatives :

```bash
bash scripts/ops/verify-private-noindex.sh \
  https://www.antoinequarroz.ch
```

Le contrôle accepte les statuts HTTP applicatifs de `2xx` à `4xx`, mais échoue
si une réponse ne contient pas à la fois `noindex` et `nofollow`, si l'origine
n'est pas une URL HTTP(S) sûre ou si le serveur est indisponible. Il n'utilise
aucun identifiant et n'affiche aucun secret.

En cas de régression, revenir à l'image `antoinequarroz-web:previous`. Pour un
rollback de code durable, restaurer la version précédente de `nuxt.config.ts`,
reconstruire l'image et rejouer la commande de contrôle ci-dessus.

### Politique des crawlers OpenAI

La décision humaine `OD-SEO-003` sépare deux usages : `OAI-SearchBot` est
explicitement autorisé pour rendre les pages publiques éligibles à ChatGPT
Search, tandis que `GPTBot` est refusé pour indiquer que le contenu ne doit pas
être utilisé pour entraîner les modèles génératifs d'OpenAI. Le groupe
`User-agent: *` continue d'autoriser les moteurs classiques et les crawlers sans
règle spécifique. Le sitemap canonique reste déclaré une seule fois.

Cette politique suit la documentation officielle vérifiée pendant sa préparation :
<https://developers.openai.com/api/docs/bots>. OpenAI indique qu'une mise à jour
de `robots.txt` peut prendre environ 24 heures à être prise en compte pour la
recherche. Elle ne garantit ni apparition, ni classement, ni citation.
`ChatGPT-User` correspond à certaines visites initiées par un utilisateur et
n'est pas piloté ici : OpenAI précise que ces visites peuvent ne pas suivre les
règles de `robots.txt`.

Après une livraison, contrôler la séparation des groupes et la disponibilité du
sitemap :

```bash
bash scripts/ops/verify-openai-robots-policy.sh \
  https://www.antoinequarroz.ch
```

Le script échoue si une règle manque, est contradictoire ou appartient au
mauvais groupe, si le sitemap n'est pas l'URL canonique attendue ou si une des
ressources est indisponible. Il est anonyme, borné dans le temps et ne transmet
aucun secret. `robots.txt` exprime une politique de crawling, jamais un contrôle
d'accès aux données.

En cas de mauvaise politique, revenir à l'image `antoinequarroz-web:previous`.
Pour un rollback durable, restaurer `server/routes/robots.txt.ts` et
`server/utils/robotsPolicy.ts` au commit précédent, reconstruire l'image puis
rejouer le contrôle.

### Pages localisées FR/EN/DE

La décision humaine `OD-SEO-001` publie l'accueil et les pages légales en
français (`fr-CH`), anglais (`en-US`) et allemand (`de-CH`). Chaque variante
doit rendre côté serveur un title et une description dans sa langue, une
self-canonical absolue, les quatre alternates réciproques (`fr-CH`, `en-US`,
`de-CH`, `x-default`) et des liens de changement de langue avec un véritable
`href`. Les trois accueils doivent aussi publier un `og:url` égal à leur URL.

Après une livraison, contrôler les trois accueils et les neuf pages légales :

```bash
bash scripts/ops/verify-localized-pages.sh \
  https://www.antoinequarroz.ch
```

Le script journalise le domaine contrôlé et échoue si une des 12 URL est
indisponible, si une canonical pointe vers une autre langue, si un alternate
manque ou n'est pas réciproque, ou si le sélecteur n'est pas explorable sans
JavaScript. Il est anonyme, borné dans le temps et ne transmet aucun secret.
Les articles et pages de services restent français uniquement jusqu'à
validation de traductions humaines; aucune variante localisée fictive ne doit
être ajoutée.

En cas d'incohérence, revenir à l'image `antoinequarroz-web:previous`, restaurer
les catalogues et composants au commit antérieur, puis rejouer le contrôle sur
les 12 URL avant de rétablir la release.

### Routes publiques françaises uniquement

La décision `OD-SEO-001` conserve en français uniquement les quatre pages de
services, le blog et ses articles, les cas clients et les études de cas. Les
anciennes URL préfixées par `/en` ou `/de` doivent répondre par une redirection
permanente `308` vers le chemin français correspondant, en conservant exactement
le suffixe encodé et les paramètres. Elles ne doivent jamais retourner un
contenu français indexable sous une langue étrangère.

Après une livraison, lancer la preuve anonyme et en lecture seule :

```bash
bash scripts/ops/verify-french-only-routes.sh \
  https://www.antoinequarroz.ch
```

Le contrôle exige un `200`, une canonical française exacte et aucune directive
`noindex` sur les six pages françaises statiques. Il vérifie ensuite, sans les
suivre, les 16 redirections EN/DE des six familles statiques et de deux canaris
dynamiques indépendants des données. Enfin, il refuse toute entrée EN/DE des
huit familles dans le sitemap, tout `hreflang` fictif et tout faux choix de
langue explorable sans JavaScript. Les appels sont bornés dans le temps et ne
transmettent aucun identifiant.

En cas d'échec après livraison, remettre en service l'image
`antoinequarroz-web:previous`, puis restaurer et redéployer le SHA antérieur.
Rejouer cette preuve et la vérification des pages localisées avant de rétablir
la release. Aucune restauration de données n'est nécessaire.

### Découverte des contenus publiés

Le sitemap public doit contenir `/cas-clients-valais`, tous les articles
publiés et toutes les études de cas publiées de l'organisation canonique. Les
brouillons, données CRM, routes privées et variantes EN/DE non traduites ne
doivent jamais y apparaître. Une panne Supabase rend volontairement le sitemap
indisponible avec un statut `503` plutôt que de servir un XML incomplet en
succès.

Après une livraison, lancer la preuve anonyme et en lecture seule :

```bash
bash scripts/ops/verify-sitemap-discovery.sh \
  https://www.antoinequarroz.ch
```

Le contrôle compare le sitemap aux deux API publiques, vérifie les dates
`lastmod`, l'absence de champs internes et de doublons, ainsi que le lien SSR de
chaque étude depuis `/cas-clients-valais`. Il est borné dans le temps et ne
transmet aucun identifiant. Son échec bloque la release. Après un échec en
production, remettre l'image `antoinequarroz-web:previous`, vérifier la santé et
rejouer toutes les preuves SEO avant de rétablir le déploiement.

### Publication des études de cas approuvées

Une étude détaillée n'est publique que si sa publication possède une approbation
finale courante. Le nom du client, la temporalité, les liens et chaque mesure
restent filtrés par leur propre décision. Les notes de preuve, l'approbateur et
les états internes ne doivent jamais apparaître dans l'API ou le HTML public.

Après une livraison, lancer la preuve anonyme et en lecture seule :

```bash
bash scripts/ops/verify-approved-case-studies.sh \
  https://www.antoinequarroz.ch
```

Le contrôle accepte également un catalogue vide. Pour chaque étude publique, il
compare l'API, le sitemap, le hub et la page détaillée, vérifie l'ordre des cinq
passages, les services autorisés, les mesures réduites aux champs publics et
l'absence de données privées. Les requêtes refusent les redirections et sont
bornées à 15 secondes et 1 Mio. Cette preuve s'exécute dans la transaction de
déploiement : un échec remet en service l'image `previous`. Ne pas activer la
migration stricte AQ-SEO-012 tant que cette image de transition n'a pas été
observée saine et conservée comme image de rollback.

### Listing du blog rendu côté serveur

La page `/blog` charge une liste publique minimale et liée à l'organisation
canonique. Le HTML initial doit contenir le titre, l'extrait, la date et un vrai
lien vers chaque article publié. Le corps des articles, les brouillons et les
champs internes ne sont jamais ajoutés au payload du listing, même lorsqu'une
requête contient des en-têtes d'authentification ou d'organisation.

Après une livraison, lancer la preuve anonyme et en lecture seule :

```bash
bash scripts/ops/verify-blog-ssr.sh \
  https://www.antoinequarroz.ch
```

Le contrôle compare `/api/public/articles` au contenu visible et au payload Nuxt
du HTML brut de `/blog`. Il vérifie les champs exacts du résumé, les dates, les
liens explorables sans JavaScript, l'absence de données supplémentaires et
l'état vide serveur. Cette preuve est aussi exécutée sur le VPS avant que la
transaction de déploiement désarme son rollback. Une API indisponible, une fuite
de champ, un article absent du HTML ou un faux état vide remet donc
automatiquement en service l'image `antoinequarroz-web:previous`. Vérifier alors
la santé et rejouer la preuve avant une nouvelle livraison. Aucune restauration
de données n'est nécessaire.

## Surveillance

`/api/health` contrôle le serveur Nuxt et l'accès à Supabase. Le timer
`antoinequarroz-monitor.timer` l'appelle toutes les cinq minutes et vérifie que
les services Docker `web` et `caddy` tournent. Une alerte est envoyée après
trois échecs consécutifs, puis une notification de rétablissement.
Le contrôle surveille aussi l'espace disque et l'âge de la dernière sauvegarde.
Les seuils sont configurables avec `MAX_DISK_USAGE_PERCENT` (85 par défaut) et
`MAX_BACKUP_AGE_HOURS` (36 heures par défaut). Le certificat TLS est contrôlé
21 jours avant son expiration, seuil modifiable avec `MONITOR_TLS_WARN_DAYS`.

L'adresse destinataire est `MONITORING_ALERT_EMAIL` dans `.env`, avec
`CONTACT_EMAIL` comme repli. L'envoi utilise `RESEND_API_KEY`.

Commandes utiles sur le VPS :

```bash
sudo systemctl status antoinequarroz-monitor.timer
sudo systemctl start antoinequarroz-monitor.service
sudo journalctl -u antoinequarroz-monitor.service -n 100
sudo scripts/ops/monitor.sh /home/ubuntu/antoinequarroz-vitrine --test-alert
```

## Sauvegardes

`antoinequarroz-backup.timer` crée chaque nuit une archive contenant les tables
métier, l'index des médias et les fichiers du bucket `media/uploads`. Elle est
gardée 14 jours dans `/var/backups/antoinequarroz` et copiée dans le bucket
Supabase privé `backups`. Les archives distantes de plus de 14 jours sont aussi
supprimées. Le manifeste de format 3 enregistre le nombre exact de lignes de
chaque table, l'inventaire Auth et le nombre de médias. Une réponse REST tronquée
fait échouer la sauvegarde au lieu de produire silencieusement une archive
incomplète. Le checksum SHA-256 est portable : il reste vérifiable après avoir
retéléchargé l'archive sur une autre machine.

### Copie indépendante et chiffrée

Le bucket Supabase protège déjà contre la perte du VPS, mais il reste chez le
même fournisseur que la base. Pour une vraie copie indépendante, configurer un
remote `rclone` vers Cloudflare R2, S3 ou Backblaze B2 sur le VPS, puis ajouter :

```env
OFFSITE_RCLONE_REMOTE=aq-r2:antoinequarroz-backups/prod
OFFSITE_AGE_RECIPIENT=age1...
OFFSITE_KEEP_DAYS=30
REQUIRE_OFFSITE_BACKUP=true
```

La sauvegarde est chiffrée avec `age` avant son transfert. La clé privée `age`
doit être conservée hors du VPS (gestionnaire de mots de passe et copie froide).
Le moniteur vérifie alors qu'une copie indépendante a moins de 36 heures.
Chaque archive est vérifiée avant son envoi et accompagnée d'une somme SHA-256.
Les copies chiffrées hors site sont conservées 30 jours par défaut.

La structure SQL est reconstruite à partir des migrations versionnées dans Git.
Les utilisateurs Supabase Auth ne sont pas exportés par cette sauvegarde métier ;
le compte administrateur devra être recréé depuis Supabase en cas de perte totale
du projet.

Vérifier une archive sans modifier la production :

```bash
sudo scripts/ops/verify-backup.sh /var/backups/antoinequarroz/aq-supabase-YYYYMMDDTHHMMSSZ.tar.gz
```

## Installation

Après un déploiement du code :

```bash
sudo scripts/ops/install-ops.sh /home/ubuntu/antoinequarroz-vitrine
```

## Relances commerciales automatiques

Le timer `antoinequarroz-pipeline-reminders.timer` vérifie les échéances chaque
jour ouvrable à 08:15, heure de Zurich. Les e-mails ne partent qu’aux jalons
prévus : J−3 et jour J pour un devis, J−2 et jour J pour une facture, puis
J+3, J+7, J+14, J+21 et J+28 en cas de retard. Chaque jalon dispose d’une clé
anti-doublon conservée dans le journal d’audit.

Créer un secret aléatoire dans le `.env` du VPS :

```dotenv
PIPELINE_AUTOMATION_SECRET=une-valeur-aleatoire-longue
```

Contrôler le timer ou lancer une vérification manuelle :

```bash
sudo systemctl status antoinequarroz-pipeline-reminders.timer
sudo systemctl start antoinequarroz-pipeline-reminders.service
sudo journalctl -u antoinequarroz-pipeline-reminders.service -n 100
```

## Exercice de reprise

Le contrôle de reprise en lecture seule vérifie l'archive, son checksum, les
nombres de lignes et de médias consignés dans le manifeste, ses fichiers JSON,
les relations clients et la présence du schéma versionné :

```bash
sudo scripts/ops/restore-drill.sh /var/backups/antoinequarroz/aq-supabase-YYYYMMDDTHHMMSSZ.tar.gz /home/ubuntu/antoinequarroz-vitrine
```

Le timer `antoinequarroz-restore-drill.timer` exécute ce contrôle chaque mois à
partir d'une copie retéléchargée du bucket Supabase privé, et non depuis le
fichier local. Le succès écrit `/var/backups/antoinequarroz/.last-restore-drill`;
le moniteur déclenche une alerte si cette preuve a plus de 40 jours lorsque
`REQUIRE_RESTORE_DRILL=true`.

Lancer cette preuve distante manuellement :

```bash
sudo scripts/ops/restore-supabase-copy-drill.sh /home/ubuntu/antoinequarroz-vitrine
```

Pour tester toute la chaîne depuis Cloudflare R2, copier temporairement la clé
privée `age` sur une machine de reprise, puis exécuter :

```bash
sudo scripts/ops/restore-offsite-drill.sh \
  aq-r2:antoinequarroz-backups-prod/prod \
  /chemin/securise/antoinequarroz_backup_age_key.txt \
  /home/ubuntu/antoinequarroz-vitrine
```

Ces tests ne modifient jamais la production. Le contrôle mensuel valide la copie
distante Supabase; le contrôle R2 valide en plus le téléchargement, le checksum
chiffré et le déchiffrement depuis le fournisseur indépendant. La clé privée
`age` ne doit pas être déposée durablement sur le VPS. Un rejeu des données doit
toujours cibler une branche Supabase ou un projet temporaire avant toute
restauration sur le projet principal.

## Tests E2E

Les identifiants Playwright sont conservés localement dans `.env.e2e`, ignoré
par Git. Le compte de production dédié doit être membre `manager` uniquement
dans l'organisation isolée `aq-e2e-sandbox`. Le test crée son parcours métier
dans cette organisation puis supprime toutes les données temporaires.

```dotenv
E2E_BASE_URL=https://www.antoinequarroz.ch
E2E_ADMIN_EMAIL=e2e-admin@antoinequarroz.ch
E2E_ADMIN_PASSWORD=...
# Uniquement après activation du facteur TOTP sur ce compte
E2E_ADMIN_TOTP_SECRET=...
```

Lancer le parcours public et administrateur :

```bash
npm run test:e2e
```

## Google Places

Les avis réels nécessitent ces deux variables dans `.env`, puis une reconstruction
du conteneur :

```dotenv
GOOGLE_PLACES_API_KEY=...
GOOGLE_PLACE_ID=...
```

La clé Google doit être restreinte à l'API Places et, si possible, aux adresses IP
du VPS. Ne jamais la versionner dans Git.
