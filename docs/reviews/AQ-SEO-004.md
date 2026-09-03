# Revue AQ-SEO-004 — Pages réellement localisées

## Périmètre revu

- Ticket : `AQ-SEO-004` dans `docs/product/stories.md`.
- Recherche : `docs/research/AQ-SEO-004.md`.
- Plan humainement validé : `docs/plans/AQ-SEO-004.md`.
- Base de comparaison : `23182c0f537132987cf348de3ac8f134182298cb`
  (`AQ-SEO-003`, branche parente), plus les fichiers nouveaux non suivis de la
  story courante.
- Surfaces : métadonnées Nuxt, catalogues i18n, sélecteur de langue, navigation,
  contenu SSR de l'accueil, preuve HTTP, CI et documentation d'exploitation.

## Résultat de la revue

Aucun finding critique, majeur ou mineur confirmé.

- Les trois accueils rendent un title, une description, un `lang`, un `og:url`
  et une self-canonical cohérents avec leur URL.
- Les 12 pages contrôlées rendent les quatre alternates absolus et réciproques.
- Le sélecteur utilise les éléments natifs `<details>`/`<summary>` et des liens
  Nuxt avec `href` SSR; la navigation EN → DE et EN → FR fonctionne au clavier
  et avec JavaScript, tandis que la structure reste utilisable sans JavaScript.
- Les CTA et ancres de l'accueil conservent la locale. Les articles, projets,
  avis manuels et liens de services français non approuvés ne sont ni rendus ni
  sérialisés sur `/en` et `/de`.
- Aucun changement de rôle, authentification, RLS, donnée, secret, dépendance,
  API ou migration n'est introduit.
- La preuve de production est anonyme, valide son origine, borne ses requêtes et
  s'exécute après les preuves SEO déjà présentes.

## Preuves exécutées

- `npx vitest run tests/seo-localized-pages.test.ts` : 12/12 tests passés.
- `npm test` : 39 fichiers, 167/167 tests passés.
- `npm run typecheck` : passé.
- `npm run build` : passé, artefact Nitro généré.
- `npm run quality:budgets` : passé; 5 800 264 octets au total, scène robot
  1 010 718 octets sous le plafond de 1 500 000.
- `bash -n scripts/ops/*.sh` : passé.
- `git diff --check` : passé.
- `bash scripts/ops/verify-localized-pages.sh http://127.0.0.1:3104` : les
  trois accueils et les neuf pages légales passent sur le rendu Nitro local.
- Contrôle navigateur : `/en` et `/de` chargés sans overlay, titles/langues
  corrects, liens de langue présents, portfolio/blog absents; navigation EN → DE
  puis EN → FR réussie, avec restauration du portfolio/blog français sur `/`.

Max severity: none
Ship allowed: yes
