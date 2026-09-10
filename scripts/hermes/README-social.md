# Publication sociale depuis Hermes

Le flux garde une validation humaine obligatoire :

1. Le job SEO écrit deux brouillons dans `seo/social/a-valider/`.
2. Le Centre de validation affiche leur contenu intégral.
3. Antoine approuve explicitement un fichier précis.
4. Hermes remplace seulement `statut: A_VALIDER` par `statut: APPROUVE` dans ce fichier.
5. Hermes exécute `publish_social.py` pour ce fichier.
6. Le script écrit un reçu dans `seo/social/receipts/`. Le même contenu ne peut pas être publié deux fois.

Format attendu :

```markdown
---
platform: linkedin
statut: A_VALIDER
article_url: https://www.antoinequarroz.ch/blog/exemple
date: 2026-09-10
---
Texte du post avec son URL publique.
```

Validation locale, sans publication :

```bash
python3 scripts/hermes/publish_social.py \
  --project . \
  --draft seo/social/a-valider/exemple-linkedin.md \
  --dry-run
```

Publication après approbation :

```bash
python3 scripts/hermes/publish_social.py \
  --project . \
  --draft seo/social/a-valider/exemple-linkedin.md
```

Secrets requis dans l'environnement privé de Hermes :

- LinkedIn : `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN`.
- X : `X_USER_ACCESS_TOKEN`.
- X reste bloqué tant que `HERMES_X_MAX_USD_PER_POST` est inférieur à `0.20`.

Le jeton LinkedIn actuel dure deux mois. Son renouvellement doit être suivi par
la surveillance Hermes. Aucun secret ne doit être placé dans Git, un brouillon
ou une conversation.
