# Réconciliation du rapport SEO

Le compteur de publications provient du CMS public `/api/articles`, avec dates timezone et exclusion des doublons, brouillons et publications futures. Il ne doit pas être remplacé par le nombre de fichiers locaux.

```sh
python3 scripts/hermes/reconcile_seo_report.py --gsc-export seo/search-console-direct.json --output seo/seo-public-reconciliation.md
```

`--gsc-export` accepte un ZIP CSV exporté directement depuis Search Console ou un snapshot JSON issu de ce ZIP. Sans export, la mesure reste explicitement indisponible. Les périodes des filtres Google doivent être conservées ; elles ne sont pas confondues avec la fenêtre de sept jours PostHog. Un export manuel daté ne constitue pas une connexion Google API automatiquement renouvelée.

Le script et le snapshot du 12 octobre ont été installés dans le workspace Hermes. La mission FRIDAY 970ddda6ecb8 a reçu les règles de réconciliation, sans changement de modèle, cadence, permissions ou destination locale et sans exécution IA supplémentaire. L’original du rapport est conservé.

L'accès Google dans le navigateur fonctionne. Pour une collecte automatique sans navigateur, une connexion OAuth/service Google en lecture seule reste nécessaire ; aucun nouvel accès Google permanent n’a été créé.
