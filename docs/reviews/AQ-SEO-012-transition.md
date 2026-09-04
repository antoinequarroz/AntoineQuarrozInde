# Revue AQ-SEO-012 — transition

## Périmètre revu

- Story : `docs/product/stories.md` (`AQ-SEO-012`).
- Recherche et plan validé : `docs/research/AQ-SEO-012.md`,
  `docs/plans/AQ-SEO-012.md`.
- Diff : branche `codex/aq-seo-012-approved-case-studies` contre `41f62ce`.
- Phase : modèle additif, image applicative fail-closed et preuve de transition ;
  l'activation SQL stricte ultérieure reste hors de cette release.

## Findings

Aucun finding ouvert. La première passe avait relevé que le dashboard présentait
une étude historique non approuvée comme publiée et proposait un lien public
inaccessible. La correction exige désormais `caseStudyApprovedAt` dans le
compteur et les liens, et affiche explicitement l'état « à approuver » sur les
cartes et le tableau (`app/pages/admin/projects/index.vue`). Le test de
publication couvre ce contrat.

## Vérifications réussies

- `npm run test:db` via Portly : 5 fichiers pgTAP, 107 assertions, succès.
- `npm test` via Portly : 58 fichiers, 410 assertions, succès.
- `npm run typecheck` via Portly : succès.
- `npm run build` via Portly : succès.
- `npm run quality:budgets` via Portly : succès, 5 842 793 octets au total.
- Playwright ciblé sans JavaScript : 1 scénario d'étude approuvée, succès.
- `git diff --check` via Portly : succès.
- Preuve HTTP locale : catalogue vide accepté ; aucune étude historique
  non approuvée dans l'API détaillée, le hub ou le sitemap.
- Vérification navigateur : desktop et mobile chargent sans erreur ni
  débordement ; la correction d'espacement mobile et du CTA vide est visible.

Max severity: none
Ship allowed: yes
