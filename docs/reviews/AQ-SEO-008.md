# AQ-SEO-008 — Revue finale et sécurité

## Périmètre

Revue du diff de `codex/aq-seo-008-identity-social` contre
`dc3a838a599b86e176938aa4d61ac7198d9fb8fc`, à partir de la story
`docs/product/stories.md:154-172`, de la recherche
`docs/research/AQ-SEO-008.md` et du plan validé
`docs/plans/AQ-SEO-008.md`. Aucun fichier utilisateur hors ticket n'a été
inclus dans la revue.

## Résultat des critères

- L'identité publique approuvée est centralisée avec l'adresse complète, le
  téléphone, l'e-mail et les deux profils existants
  (`shared/utils/publicSeoIdentity.ts:1-28`). Le footer et le JSON-LD consomment
  cette source au lieu de conserver des copies divergentes
  (`app/components/layout/AppFooter.vue:1-16,147-171`,
  `app/pages/index.vue:45-80`).
- Les nœuds `Person` et `ProfessionalService` publient les mêmes coordonnées,
  le même `PostalAddress`, la même image et le même `sameAs`; les identifiants
  restent ancrés sur l'origine canonique (`app/pages/index.vue:48-80`).
- Le défaut Open Graph/Twitter est absolu, localisé et hérité au niveau de
  l'application (`app/app.vue:1-29`). Les pages article et projet préfèrent leur
  image éditoriale sûre et reviennent sinon sur `/about.jpg`, avec des alts
  cohérents (`app/pages/blog/[slug].vue:1-40`,
  `app/pages/projets/[slug].vue:1-79`).
- `CreativeWork.image` reprend l'URL sociale résolue et son créateur référence
  la personne canonique (`app/pages/projets/[slug].vue:73-85`). Aucun schéma
  réservé à `AQ-SEO-009` ou `AQ-SEO-010` n'a été ajouté.
- La preuve parcourt les URL du sitemap, exige une balise unique pour chaque
  image et alt, compare Open Graph/Twitter, valide l'identité et vérifie le type
  MIME des images (`scripts/ops/verify-identity-social.sh:91-121,147-211`). Elle
  est branchée après les autres preuves de contenu public
  (`.github/workflows/ci.yml:145-154`).

## Revue sécurité

- **Injection :** le JSON-LD dynamique est sérialisé en neutralisant `<`, `>`,
  `&`, U+2028 et U+2029 (`shared/utils/publicSeoIdentity.ts:81-88`). Une chaîne
  éditoriale ne peut donc pas fermer la balise `script`.
- **URL et protocoles :** l'origine refuse identifiants, chemin, requête et
  fragment; les images refusent les schémas actifs, le HTTP externe, les
  identifiants et les fragments (`shared/utils/publicSeoIdentity.ts:35-78`).
- **SSRF de la preuve :** avant tout accès image, la cible est limitée au même
  origin ou au chemin public `media` d'un hôte `*.supabase.co` en HTTPS. Les
  redirections sont désactivées et chaque requête expire après 12 secondes
  (`scripts/ops/verify-identity-social.sh:59-89,99-121`).
- **Secrets et autorisation :** le script est entièrement anonyme. Aucun token,
  cookie, endpoint admin, politique RLS, grant, migration, bucket ou dépendance
  n'a été ajouté. Les seules données personnelles reprises étaient déjà visibles
  sur le site.
- **Données non approuvées :** `sameAs` contient exactement GitHub et LinkedIn;
  aucune coordonnée GPS ni aucun profil déduit n'est publié. Les tests négatifs
  couvrent la divergence d'identité, l'hôte image non approuvé et l'image
  inaccessible (`tests/seo-identity-social.test.ts:182-200`).

## Contrôles exécutés

- `npm test -- tests/seo-identity-social.test.ts` : 11/11 réussis.
- `npm test` : 53 fichiers, 312/312 tests réussis.
- `npm run typecheck` : réussi.
- `npm run build` : réussi, bundle Nitro généré.
- `npm run quality:budgets` : réussi; 5 811 417 octets, plus gros chunk
  2 266 990 octets, scène robot 1 010 718/1 500 000 octets.
- `bash -n scripts/ops/*.sh` : réussi.
- `bash scripts/ops/verify-identity-social.sh http://127.0.0.1:3104` : 24 pages
  indexables validées avec leurs images accessibles.
- `E2E_BASE_URL=http://127.0.0.1:3104 npx playwright test e2e/public.spec.ts
  --project=chromium` : 5/5 réussis.
- `git diff --check` : réussi; aucune dépendance ou migration modifiée.

## Constats

- Critique : aucun.
- Majeur : aucun.
- Mineur : aucun.

Risque résiduel non bloquant : `/about.jpg` est une photographie portrait déjà
approuvée, et non une création sociale dédiée au format 1200×630. Sa ressource
est accessible et satisfait la story; une image de marque dédiée reste une
amélioration éditoriale séparée.

Max severity: none
Ship allowed: yes
