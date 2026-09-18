# Publication sociale depuis Hermes

Le flux garde une validation humaine obligatoire :

1. Le job SEO écrit deux brouillons dans `seo/social/a-valider/`.
2. Le Centre de validation affiche leur contenu intégral.
3. Antoine approuve explicitement un fichier précis.
4. Hermes remplace seulement `statut: A_VALIDER` par `statut: APPROUVE` dans ce fichier.
5. Hermes lance le contrôle aux heures UTC 16 et 17. Le script ne publie que
   lorsque l'heure locale `Europe/Zurich` est exactement 18 h, y compris lors
   des changements heure d'été / heure d'hiver.
   Seuls les éléments déjà approuvés sont traités.
6. Le script écrit un reçu dans `seo/social/receipts/`. Le même contenu ne peut pas être publié deux fois.

Pour LinkedIn, le script récupère l'image Open Graph de l'article, la téléverse
avec l'Images API puis l'attache au post. L'absence d'image bloque la publication
au lieu de créer un post texte incomplet. Le texte LinkedIn ne doit jamais
commencer par un numéro de post ; les numéros restent réservés aux titres du blog.

Pour les articles qui disposent d'exports validés dans
`shared/utils/articleMediaVariants.ts`, Open Graph pointe sur le format LinkedIn,
`twitter:image` sur le format X et le blog mobile choisit sa variante avec
`<picture>`. X publie actuellement un lien, sans téléverser de média : c'est
l'aperçu du lien qui utilise `twitter:image` si X l'affiche. Préparer les trois
fichiers sous `public/article-media/<slug>/` et les référencer dans ce registre
avant leur publication. Les anciens articles conservent leur couverture unique.

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

Pour une publication autonome, comme un message de présentation, `article_url`
peut contenir la page d'accueil canonique `https://www.antoinequarroz.ch/`.
Le nom du champ est conservé pour rester compatible avec les brouillons d'articles.

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

## Validation depuis le site

La page privée `/admin/social` permet de modifier, refuser ou approuver un texte.
Les accès aux plateformes restent exclusivement dans Hermes. Après une approbation,
le processeur réclame atomiquement l'élément avant l'appel externe :

```bash
python3 scripts/hermes/publish_social.py --project . --process-approved --local-hour 18 --timezone Europe/Zurich
```

Il requiert `HERMES_PUBLISH_TOKEN`. X utilise `X_API_KEY`, `X_API_SECRET`,
`X_ACCESS_TOKEN` et `X_ACCESS_TOKEN_SECRET`, en plus du plafond de coût.

Le job SEO synchronise les nouveaux brouillons avec le tableau avant le passage du processeur :

```bash
python3 scripts/hermes/publish_social.py --project . --sync-drafts
```
