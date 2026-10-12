# Réconciliation du rapport SEO

Le compteur de publications provient du CMS public `/api/articles`, avec dates timezone et exclusion des doublons, brouillons et publications futures. Il ne doit pas être remplacé par le nombre de fichiers locaux.

```sh
python3 scripts/hermes/reconcile_seo_report.py --gsc-export seo/search-console-direct.json --output seo/seo-public-reconciliation.md
```

`--gsc-export` accepte un ZIP CSV exporté directement depuis Search Console ou un snapshot JSON issu de ce ZIP. Sans export, la mesure reste explicitement indisponible. Les périodes des filtres Google doivent être conservées ; elles ne sont pas confondues avec la fenêtre de sept jours PostHog. Un export manuel daté ne constitue pas une connexion Google API automatiquement renouvelée.

Le script et le snapshot du 12 octobre ont été installés dans le workspace Hermes. La mission FRIDAY 970ddda6ecb8 a reçu les règles de réconciliation, sans changement de modèle, cadence, permissions ou destination locale et sans exécution IA supplémentaire. L’original du rapport est conservé.

L'accès Google dans le navigateur fonctionne. Pour une collecte automatique sans navigateur, une connexion OAuth/service Google en lecture seule reste nécessaire ; aucun nouvel accès Google permanent n’a été créé.

## Collecte directe automatisée

Le connecteur `fetch_search_console.py` lit exclusivement `sc-domain:antoinequarroz.ch` avec le scope `webmasters.readonly`. Il utilise un compte de service dédié avec un droit Search Console limité, ou un accès OAuth hors ligne dédié. Il ne demande aucun rôle IAM sur le projet et n'usurpe aucun utilisateur Google Workspace. Python 3.9+ et OpenSSL sont requis pour la signature du compte de service.

Stocker l'identifiant dans l'environnement privé du profil FRIDAY sous `HERMES_GSC_CREDENTIALS_B64` (JSON encodé en base64, **ce n'est pas du chiffrement**), ou dans un fichier privé hors du dépôt, mode 600, avec `--credentials-file`. Ne jamais versionner, afficher ou inclure l'identifiant dans un prompt ou un rapport.

À chaque rapport du lundi, exécuter la collecte avant la réconciliation :

```sh
python3 scripts/hermes/fetch_search_console.py --output seo/search-console-direct.json
python3 scripts/hermes/reconcile_seo_report.py --gsc-export seo/search-console-direct.json --output seo/seo-public-reconciliation.md
```

Même si la collecte échoue, produire la réconciliation : l'échec remplace le snapshot par `not_measured`, puis le rapport signale la mesure indisponible au lieu de recycler des chiffres anciens. Le rapport refuse les snapshots API de plus de 36 heures. Une réponse Google réussie mais sans lignes est distinguée d'un défaut d'accès. La fenêtre mesure 28 jours de recherche web en données finales, avec trois jours de marge pour le traitement Google. Les totaux sont obtenus sans dimensions ; les requêtes anonymisées ou absentes du classement ne sont pas reconstituées par addition des lignes visibles.

État d'installation du connecteur et de ses tests : prêt à installer. La collecte automatique n'est considérée connectée qu'après un appel Google authentifié réussi et vérification de la configuration de la mission. La création ou l'octroi d'un nouvel accès Google nécessite la confirmation explicite de l'utilisateur dans le navigateur.
