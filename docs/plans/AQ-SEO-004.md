---
ticket: AQ-SEO-004
validated: yes
---

# AQ-SEO-004 — Consulter une page réellement localisée

## Copie proposée à valider

| Locale | Title | Description |
|---|---|---|
| `fr-CH` | Antoine Quarroz — Développeur Web Freelance en Valais | Développeur web freelance basé en Valais, Antoine Quarroz conçoit des sites, applications mobiles et CMS sur mesure en Suisse et à distance. |
| `en-US` | Antoine Quarroz — Freelance Web Developer in Valais | Freelance web developer based in Valais, Antoine Quarroz builds custom websites, mobile apps and CMS solutions for clients in Switzerland and worldwide. |
| `de-CH` | Antoine Quarroz — Freelance-Webentwickler im Wallis | Antoine Quarroz ist Freelance-Webentwickler im Wallis und entwickelt individuelle Websites, mobile Apps und CMS-Lösungen für Kunden in der Schweiz und weltweit. |

Microcopies proposées : `Photo à venir` / `Photo coming soon` / `Foto folgt`,
`Réponse rapide à` / `Quick reply at` / `Schnelle Antwort an` et
`Zones` / `Areas` / `Regionen`. Les deux liens vers les pages de services et la
sélection d'articles et le portfolio restent visibles seulement en français
tant que leurs contenus n'ont pas de traduction humaine approuvée.

## Plan ordonné

- [x] **1. Rendre les métadonnées de l'accueil réellement locales**
  - **Objectif :** stocker la copie approuvée FR/EN/DE dans les catalogues i18n et calculer title, description, métadonnées Open Graph/Twitter, `og:url`, self-canonical et données structurées linguistiques depuis la locale courante.
  - **Fichiers attendus :** `i18n/locales/fr.json`, `i18n/locales/en.json`, `i18n/locales/de.json`, `app/pages/index.vue`, nouveau test ciblé `tests/seo-localized-pages.test.ts`.
  - **Autorisé :** réutiliser le même couple title/description localisé pour les moteurs et réseaux sociaux; supprimer le meta `keywords` français obsolète plutôt que créer trois listes artificielles; conserver les quatre alternates absolus existants.
  - **Interdit :** ajouter une langue, générer automatiquement une traduction, modifier le domaine canonique ou créer une variante localisée d'un contenu français uniquement.
  - **Tests :** chaque accueil possède son `lang`, sa copie, son `og:url` et sa canonical propres; les quatre alternates sont complets, absolus et réciproques; aucune métadonnée française ne fuit sur EN/DE.
  - **Validation :** test ciblé, typecheck et build Nuxt via Portly.
  - **Sécurité / rollback :** aucune donnée ni autorisation; rollback limité aux catalogues et au head de l'accueil.

- [x] **2. Rendre le sélecteur de langue explorable et nettoyer les microcopies**
  - **Objectif :** rendre dans le HTML SSR de vrais liens `href` vers les trois variantes de la route courante avec `useSwitchLocalePath()`, localiser les libellés accessibles et les chaînes d'accueil résiduelles, et ne pas afficher les extraits d'articles ou projets français comme du contenu EN/DE.
  - **Fichiers attendus :** `app/components/ui/LangSwitcher.vue`, `app/components/layout/AppHeader.vue`, `app/components/layout/AppFooter.vue`, `app/components/sections/AboutSection.vue`, `app/components/sections/ServicesSection.vue`, `app/components/sections/BlogSection.vue`, `app/components/sections/ReviewsSection.vue`, `app/components/sections/ContactSection.vue`, les trois catalogues i18n et `tests/seo-localized-pages.test.ts`.
  - **Autorisé :** conserver le bouton d'ouverture et le style du menu; masquer visuellement sans retirer du DOM les liens quand le menu est fermé; limiter les liens/services et articles français à `/`; marquer les noms propres et contenus tiers dans leur langue réelle lorsque connue.
  - **Interdit :** conserver des options uniquement pilotées par `@click`, dupliquer une route localisée inexistante, traduire automatiquement un article/avis ou changer le comportement des formulaires.
  - **Tests :** les href `/`, `/en` et `/de` sont présents avant hydratation et navigables; libellés/ARIA suivent la locale; les chaînes françaises identifiées sont absentes du HTML EN/DE; l'accueil français conserve ses contenus.
  - **Validation :** rendu SSR des trois routes, test clavier/accessibilité ciblé et inspection sans JavaScript via Portly.
  - **Sécurité / rollback :** navigation publique seulement; aucun changement d'API ou de données.

- [x] **3. Prouver les invariants sur l'accueil et les pages légales**
  - **Objectif :** créer une preuve HTTP bornée qui contrôle les 12 URL approuvées et bloque une release si une variante possède une canonical étrangère, des alternates incomplets/non réciproques, une métadonnée incohérente ou aucun lien de langue explorable.
  - **Fichiers attendus :** nouveau `scripts/ops/verify-localized-pages.sh`, `tests/seo-localized-pages.test.ts`, `.github/workflows/ci.yml`, `docs/operations.md`.
  - **Autorisé :** parsing du HTML SSR, origines HTTP(S) validées, fixtures locales positives/négatives, insertion après les preuves SEO existantes et journal des URL contrôlées par langue.
  - **Interdit :** identifiants, contournement TLS, mutation distante, contrôle limité au DOM client ou remplacement des preuves AQ-SEO-001 à AQ-SEO-003.
  - **Tests :** cas valide; échecs sur title/description/lang/`og:url` erronés, canonical croisée, alternate absent/non absolu/non réciproque, lien de langue sans href, route indisponible et origine dangereuse.
  - **Validation :** Vitest ciblé, `bash -n`, fixtures HTTP locales et contrôle de l'ordre CI via Portly.
  - **Sécurité / rollback :** preuve anonyme en lecture seule; son échec arrête la release sans toucher à la production.

- [x] **4. Valider toute la story**
  - **Objectif :** exécuter la couverture complète et conserver les preuves de conformité sans élargir la story.
  - **Fichiers attendus :** uniquement les ajustements matériels révélés par AQ-SEO-004 et mise à jour de ce plan après exécution.
  - **Autorisé :** corrections strictement nécessaires aux critères ci-dessous.
  - **Interdit :** traiter les routes de services/blog/cas clients d'AQ-SEO-005, ajouter une quatrième langue, déployer avant validation humaine de l'implémentation.
  - **Tests :** non-régression de toute la suite, typecheck, build, budget, syntaxe Bash et diff propre.
  - **Validation :** `npm test -- --run`, `npm run typecheck`, `npm run build`, `npm run quality:budgets`, `bash -n scripts/ops/*.sh` et `git diff --check` via Portly.
  - **Sécurité / rollback :** aucune migration ni destruction; rollback applicatif avec l'image `previous` et le commit antérieur.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| `/`, `/en`, `/de` ont title, description, `lang`, `og:url` et canonical cohérents | 1, 3, 4 |
| Les `hreflang` sont absolus, complets et réciproques | 1, 3, 4 |
| Le sélecteur expose des href utilisables sans JavaScript | 2, 3, 4 |
| Les textes approuvés sont cohérents et relus dans chaque langue | 1, 2, 4 |
| Les pages légales appliquent les mêmes invariants | 3, 4 |
| Une incohérence bloque la variante/release sans inventer d'alternate | 2, 3, 4 |
| La validation humaine des copies et URL reste traçable | 1, 3, 4 |

## Impacts explicitement absents

- **Migration / base de données :** aucune.
- **RLS / autorisations / authentification :** aucun changement.
- **Stockage :** aucun changement.
- **Routes publiques :** aucune nouvelle route; correction de leurs métadonnées et liens uniquement.
- **IA / traduction :** aucune génération ou publication automatique de traduction.
- **Dépendances :** aucune nouvelle dépendance.
- **Données personnelles / secrets :** aucun.
- **Destruction :** aucune commande destructive; aucun déploiement avant validation humaine du plan puis de l'implémentation.

## Validation humaine requise

Ce plan, les trois couples title/description et les microcopies proposées doivent
être explicitement validés par Antoine avant toute modification du code
applicatif.

Plan et textes validés par Antoine le 3 septembre 2026 avec l'instruction
« tu peux lancer ça oui ».

## Preuves d'implémentation

- Les accueils `/`, `/en` et `/de` rendent leurs titles, descriptions,
  `lang`, `og:url`, self-canonical et données structurées localisés.
- Les 12 URL accueil/légales passent la nouvelle preuve HTTP locale, avec quatre
  alternates absolus et réciproques et deux liens de langue SSR par page.
- Le sélecteur natif fonctionne sans JavaScript; les parcours EN → DE et EN → FR
  ont été contrôlés dans Chromium sans overlay ni erreur visuelle.
- Les contenus éditoriaux français non traduits ne sont plus rendus ni
  sérialisés sur `/en` et `/de`; ils restent disponibles sur `/`.
- Les 12 tests ciblés et les 167 tests complets passent, ainsi que typecheck,
  build Nitro, budgets, syntaxe Bash et `git diff --check` via Portly le
  3 septembre 2026.
- La revue indépendante `docs/reviews/AQ-SEO-004.md` conclut
  `Max severity: none` et `Ship allowed: yes`.
- La preuve HTTPS sur `www.antoinequarroz.ch` reste volontairement
  post-déploiement et sera exécutée après validation humaine de cette
  implémentation.
