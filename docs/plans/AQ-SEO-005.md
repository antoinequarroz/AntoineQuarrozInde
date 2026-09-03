---
ticket: AQ-SEO-005
validated: yes
---

# AQ-SEO-005 — Ne pas exposer de fausses traductions

## Plan ordonné

- [x] **1. Déclarer les huit familles de pages françaises uniquement**
  - **Objectif :** créer un manifeste de variantes approuvées pour les quatre
    services, `/blog`, `/blog/**`, `/cas-clients-valais` et `/projets/**`, puis
    empêcher `@nuxtjs/i18n` d'enregistrer leurs variantes EN/DE.
  - **Fichiers attendus :** `nuxt.config.ts`, un petit module partagé sous
    `shared/utils/` et un nouveau test ciblé
    `tests/seo-french-only-routes.test.ts`.
  - **Autorisé :** centraliser les familles et l'état `approved`/`unavailable`
    de chaque locale; exiger pour toute future variante non française les
    références d'approbation humaine, contenu, métadonnées et alternates;
    valider ce contrat par une fonction pure; utiliser la configuration `pages`
    de la version i18n installée; conserver FR comme seule locale disponible.
  - **Interdit :** traduire du contenu, renommer les URL françaises, supprimer
    l'accueil ou les pages légales EN/DE, ajouter une langue ou modifier les
    données éditoriales.
  - **Tests :** inventaire exhaustif des huit familles; seules les routes FR
    sont générées; aucune route EN/DE statique ou dynamique concernée ne reste
    enregistrée; accueil et pages légales gardent leurs trois locales; fixtures
    négatives refusant une locale activée sans chacune des preuves requises et
    sans alternates réciproques.
  - **Validation :** test Vitest ciblé, typecheck et inspection du manifeste de
    routes issu d'un build Nuxt via Portly.
  - **Sécurité / rollback :** aucune donnée ni autorisation; la politique ne
    touche que les routes publiques listées; rollback par retour de la
    configuration i18n au commit précédent.

- [x] **2. Rediriger les anciennes variantes sans rendre le contenu français**
  - **Objectif :** intercepter avant rendu les anciens chemins `/en/...` et
    `/de/...` concernés et retourner une redirection permanente `308` vers le
    même chemin français, suffixe et query string conservés.
  - **Fichiers attendus :** la politique partagée de l'étape 1, un middleware
    serveur ciblé sous `server/middleware/` et
    `tests/seo-french-only-routes.test.ts`.
  - **Autorisé :** construire une destination relative depuis un chemin reconnu;
    couvrir les chemins exacts, trailing slashes et suffixes dynamiques encodés;
    laisser la route française retourner `404` lorsque le slug n'existe pas.
  - **Interdit :** accepter une origine ou un hôte fourni par la requête,
    effectuer une redirection temporaire, suivre un redirect externe, charger
    Supabase avant la redirection ou retourner un corps français sous `lang` EN/DE.
  - **Tests :** matrice EN/DE de toutes les familles; statut `308`; `Location`
    interne exacte; query conservée; slugs encodés non altérés; chemins voisins
    inconnus non interceptés; aucun open redirect.
  - **Validation :** tests ciblés et requêtes HTTP contre un aperçu Nitro géré
    par Portly.
  - **Sécurité / rollback :** pas de secret ni de mutation; matcher fermé et
    destination relative; rollback en retirant le middleware avec la politique.

- [x] **3. Retirer les choix de langue et entrées sitemap fictifs**
  - **Objectif :** ne rendre dans le sélecteur que les variantes approuvées par
    le manifeste et réellement résolues par le routeur, masquer le menu sans
    alternative, retirer `/en/blog`, `/de/blog` et les variantes EN/DE des
    projets publiés dans le sitemap.
  - **Fichiers attendus :** `app/components/ui/LangSwitcher.vue`,
    `server/routes/sitemap.xml.ts` et
    `tests/seo-french-only-routes.test.ts`.
  - **Autorisé :** filtrer d'abord par la politique de la famille courante puis
    vérifier explicitement l'existence de la route cible avant d'appeler le
    chemin de changement de langue; conserver les vrais liens de l'accueil et
    des pages légales; conserver les entrées FR et le filtrage
    `case_study_published` existant.
  - **Interdit :** ajouter les articles ou `/cas-clients-valais` au sitemap,
    refondre ses dates/erreurs/tenant, modifier le design global du sélecteur ou
    afficher un bouton de langue sans `href` valide.
  - **Tests :** aucune option EN/DE sur une page française uniquement, même si
    le composable fournit un fallback; aucune cible non résolue ni menu vide;
    liens FR/EN/DE inchangés sur accueil/légal; aucune `<loc>` fictive; une seule
    entrée FR par étude publiée dans les fixtures.
  - **Validation :** test ciblé, contrôle SSR sans JavaScript et non-régression de
    `tests/seo-localized-pages.test.ts` via Portly.
  - **Sécurité / rollback :** aucune modification de publication ou de données;
    le sitemap continue d'exposer uniquement les projets marqués publics;
    rollback limité au sélecteur et à la génération XML.

- [x] **4. Bloquer toute régression avant et après livraison**
  - **Objectif :** ajouter une preuve HTTP anonyme qui valide les routes FR, les
    redirects EN/DE statiques et dynamiques, l'absence dans le sitemap et
    l'absence d'alternatives fictives, puis l'insérer après la preuve
    `AQ-SEO-004` dans la CI.
  - **Fichiers attendus :** nouveau
    `scripts/ops/verify-french-only-routes.sh`,
    `tests/seo-french-only-routes.test.ts`, `.github/workflows/ci.yml`,
    `docs/operations.md` et ce plan pour les preuves d'exécution.
  - **Autorisé :** origine HTTP(S) validée; `curl` borné sans suivre d'abord les
    redirects; canaris dynamiques indépendants des données; fixtures locales
    positives et négatives; journal des familles contrôlées.
  - **Interdit :** identifiants, accès admin, contournement TLS, dépendance à un
    article/projet précis, mutation distante, remplacement des preuves
    `AQ-SEO-001` à `AQ-SEO-004` ou déploiement avant validation humaine.
  - **Tests :** cas valide; échecs sur `200 index,follow`, redirect temporaire,
    mauvaise destination, perte de query, variante sitemap, langue fictive,
    origine dangereuse et destination indisponible.
  - **Validation :** test ciblé, suite Vitest complète, typecheck, build, budgets,
    `bash -n scripts/ops/*.sh`, preuve sur aperçu Nitro et `git diff --check`,
    tous exécutés via Portly.
  - **Sécurité / rollback :** preuve en lecture seule et sans secret; son échec
    bloque la release; rollback de production avec l'image `previous` et le SHA
    antérieur, sans restauration de données.
  - **Preuves ciblées :** `bash -n` du nouveau script réussi; test Vitest
    `tests/seo-french-only-routes.test.ts` réussi avec 42/42 cas, dont les
    fixtures positives et négatives de la preuve HTTP.
  - **Preuves globales :** suite Vitest complète réussie (40 fichiers,
    209/209 tests); typecheck Nuxt, build de production, budgets et
    `bash -n scripts/ops/*.sh` réussis via Portly. L'aperçu Nitro géré par
    Portly a réussi la preuve réelle (6 pages FR, 16 redirects `308`, 8 familles
    sitemap). Le contrôle navigateur a confirmé une page service sans menu de
    langue ni erreur, et l'accueil avec ses deux liens EN/DE approuvés.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| Services, blog, articles, cas clients et études non traduits n'exposent aucune variante EN/DE indexable | 1, 2, 4 |
| Les variantes inexistantes sont absentes du sitemap et des `hreflang` | 1, 3, 4 |
| Une ancienne URL localisée redirige proprement sans contenu français déclaré EN/DE | 2, 4 |
| Une future traduction exige routes, contenu, métadonnées et alternatives approuvés | 1, 3, 4 |
| Un `200 index,follow` trompeur bloque la release | 4 |
| Une page sans traduction ne propose aucun choix de langue fictif | 1, 3, 4 |
| La décision humaine `OD-SEO-001` reste traçable | 1, 4 |

## Impacts explicitement absents

- **Migration / base de données :** aucune.
- **RLS / autorisations / authentification :** aucun changement.
- **Stockage :** aucun changement.
- **Routes publiques :** retrait des seules variantes EN/DE fictives et redirect
  permanent vers leurs routes françaises; aucune URL française renommée.
- **IA / traduction :** aucune génération ni publication automatique.
- **Dépendances :** aucune nouvelle dépendance.
- **Variables / secrets :** aucun changement.
- **Destruction :** aucune suppression de contenu ou de donnée.
- **Hors ticket :** complétude/tenant/dates du sitemap (`AQ-SEO-006`), brouillons
  et SSR du blog (`AQ-SEO-007`), données structurées (`AQ-SEO-008` à `010`) et
  variantes localisées des surfaces privées.

## Validation humaine requise

Ce plan retient des redirections permanentes `308` vers les URL françaises et
doit être explicitement validé par Antoine avant toute modification du code
applicatif.

Plan validé par Antoine le 3 septembre 2026 avec l'instruction « je valide tu
peux y aller ».
