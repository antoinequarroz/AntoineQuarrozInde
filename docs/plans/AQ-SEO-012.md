---
ticket: AQ-SEO-012
validated: yes
---

# AQ-SEO-012 — Évaluer un projet au moyen de preuves approuvées

## Plan ordonné

- [x] **1. Ajouter un contrat de preuve privé et rétrocompatible**
  - **Objectif :** représenter le périmètre, les décisions, la confidentialité,
    les approbations optionnelles, les services pertinents et la validation
    finale sans auto-approuver ni supprimer les projets existants.
  - **Fichiers attendus :** migration append-only créée avec
    `supabase migration new` sous `supabase/migrations/`,
    `supabase/schema.sql`, `app/types/index.ts`, `app/stores/projects.ts`,
    `server/utils/projectPayload.ts`, tests Vitest et nouveau pgTAP AQ-SEO-012.
  - **Autorisé :** colonnes `project_scope`, `key_decisions`, état fermé
    `pending | anonymous | approved`, approbations séparées des liens, de la
    temporalité et du résultat qualitatif, liste fermée de services,
    `case_study_approved_at/by`; résultats enrichis avec contexte de mesure,
    note de preuve privée et approbation; valeurs privées par défaut; validation
    stricte sans troncature silencieuse.
  - **Interdit :** nouvelle table publique, backfill d'approbation, suppression
    ou renommage de colonne, témoignage, traduction détaillée, quatrième langue,
    source de preuve distante, auto-sélection d'un service, génération ou
    validation par IA.
  - **Tests :** migration additive; défauts privés; contrainte de statut;
    services autorisés et sans doublon; six résultats maximum complets;
    contexte/note facultatifs et bornés; booléens stricts; aucune régression du
    projet minimal portfolio; privilèges Data API et RLS inchangés.
  - **Validation :** `supabase --version` et aide CLI avant création de la
    migration; job Portly ciblé Vitest puis `npm run test:db` sur base éphémère.
  - **Sécurité / rollback :** aucune ligne historique n'obtient un consentement
    implicite. Cette phase est compatible avec l'ancien RPC et ne retire aucune
    donnée; les champs privés ne sont jamais ajoutés à la projection publique.

- [x] **2. Donner au dashboard une prépublication actionnable**
  - **Objectif :** permettre de préparer librement un brouillon, de comprendre
    exactement ce qui bloque la publication et d'approuver séparément chaque
    catégorie sensible.
  - **Fichiers attendus :**
    `app/components/admin/ProjectCaseStudyFields.vue`,
    `app/pages/admin/projects/index.vue`, types/magasin/payload et tests UI
    ciblés; éventuel petit utilitaire partagé de complétude.
  - **Autorisé :** champs français « Contexte », « Mon rôle », « Périmètre »,
    « Décisions » et « Résultat »; sélecteur `À confirmer / Anonyme / Nom
    approuvé`; multi-sélection des quatre services; approbations de résultat
    qualitatif, temporalité et liens; par mesure, valeur, libellé, contexte,
    note privée et case d'approbation; liste accessible des blocages et champs
    privés; confirmation que titre, texte et médias n'identifient pas un cas
    anonyme.
  - **Interdit :** rendre les détails obligatoires pour sauvegarder un
    brouillon ou publier une simple carte portfolio, demander GitHub, remplir un
    champ automatiquement, afficher une note de preuve hors administration,
    masquer une erreur sous un toast générique ou changer les droits globaux du
    dashboard.
  - **Tests :** brouillon vide sauvegardable; portfolio seul inchangé; chaque
    blocage critique nommé et relié au champ; données optionnelles non approuvées
    annoncées privées; navigation clavier; labels/fieldset/status; manager ne
    peut pas publier; aucun mélange FR/EN/DE.
  - **Validation :** job Portly Vitest ciblé, typecheck, puis inspection du
    formulaire en bureau/mobile, clair/sombre et clavier sur le serveur Portly.
  - **Sécurité / rollback :** le client aide mais ne constitue pas la porte de
    sécurité. Les notes de preuve restent dans la vue authentifiée; aucun nom de
    client CRM n'est recopié automatiquement dans le champ public.

- [x] **3. Installer la porte publique fail-closed et le rendu probant**
  - **Objectif :** ne rendre, indexer et structurer que les études disposant
    d'une validation finale courante, avec cinq passages explicites et des
    données sensibles filtrées par leur propre approbation.
  - **Fichiers attendus :** `server/utils/publicContent.ts`,
    `server/api/projects.get.ts`, `server/routes/sitemap.xml.ts`,
    `server/utils/sitemapDiscovery.ts` si nécessaire,
    `app/pages/projets/[slug].vue`, `app/pages/cas-clients-valais.vue`,
    éventuellement un composant partagé de liens de services, tests API/SSR/SEO.
  - **Autorisé :** filtre commun `publiée + approuvée`; anonymisation du client;
    boutons live/GitHub et durée/date conditionnels; résultats publics réduits à
    `value`, `label`, `measurementContext`; titres explicites « Contexte »,
    « Rôle d'Antoine », « Périmètre », « Décisions » et « Résultats »;
    paragraphes autonomes; services choisis affichés sur le hub et la page;
    copie factuelle du hub; retrait de la FAQ et du `FAQPage` non vérifiés;
    `CreativeWork` limité au contenu réellement visible.
  - **Interdit :** exposer `evidenceNote`, états internes, approbateur ou donnée
    CRM; déduire le service depuis la catégorie; publier une mesure non
    approuvée; inventer une valeur si la liste est vide; créer EN/DE; ajouter
    avis, note, prix, `Offer` ou résultat invisible au JSON-LD.
  - **Tests :** matrice identité anonyme/approuvée; liens et temporalité
    masqués/visibles; mesures filtrées; aucun champ privé dans l'API ou le
    payload Nuxt; cinq sections SSR dans l'ordre; résultat qualitatif seul
    accepté; service fermé et lien valide; hub sans promesse commerciale;
    404/sitemap pour étude non approuvée; non-régression breadcrumbs,
    canonicals, image sociale et français uniquement.
  - **Validation :** jobs Portly Vitest ciblés, preuve locale sur aperçu Nitro,
    Playwright sans JavaScript et inspection visuelle/accessibilité.
  - **Sécurité / rollback :** cette image doit être déployée et prouvée avant
    l'activation SQL. Une étude historique sans approbation devient privée mais
    reste intacte dans le dashboard; le rollback de cette phase ne doit pas être
    utilisé après l'activation suivante.

- [ ] **4. Activer la validation et l'audit atomiques après la transition**
  - **Objectif :** faire du RPC la source de vérité transactionnelle : seul
    `owner/admin` publie, les champs critiques sont complets, et une étude
    publique ne change jamais après sa validation.
  - **Fichiers attendus :** seconde migration append-only créée avec le CLI,
    `supabase/schema.sql`, `server/utils/projectPublication.ts`, routes POST/PUT,
    pgTAP AQ-SEO-012 et tests d'erreurs API.
  - **Autorisé :** `FOR UPDATE`; validation de contexte, rôle, périmètre,
    décisions, résultat qualitatif approuvé, divulgation décidée et au moins un
    service; attribution `approved_at/by` lors de la transition brouillon →
    publié; refus de modifier le contenu/les approbations d'une étude qui reste
    publiée; audit séparé des changements sensibles avec seulement noms de
    champs et états; erreur 400/403/409 actionnable; transaction unique.
  - **Interdit :** faire confiance au rôle ou à l'acteur du body, autoriser une
    mutation en place, journaliser texte/nom/note de preuve, `security definer`,
    accès RPC anon/authenticated, validation hors transaction, auto-dépublication
    silencieuse ou suppression d'un brouillon.
  - **Tests :** owner/admin publie; manager refusé; chaque critique manquante
    refuse sans écriture; anonymous masque le nom; champs optionnels restent
    privés sans bloquer; étude publiée immuable; retour au brouillon conserve les
    données; republier renouvelle date/acteur; audit exact; échec d'audit annule
    projet et approbation; organisation étrangère introuvable; privilèges
    `service_role` seuls.
  - **Validation :** déployer d'abord la phase 3, vérifier son SHA en production
    et son aptitude au rollback; seulement ensuite job Portly `npm run test:db`,
    suite ciblée et préparation de la seconde release.
  - **Sécurité / rollback :** l'image de transition devient obligatoirement
    l'image `previous`. Aucun rollback vers une image antérieure qui ignore les
    approbations; aucune restauration SQL automatique ni suppression de colonne.

- [x] **5. Ajouter une preuve de release de bout en bout**
  - **Objectif :** empêcher qu'une étude non approuvée, incomplète ou mal liée
    atteigne le sitemap ou qu'un champ privé apparaisse après déploiement.
  - **Fichiers attendus :** nouveau
    `scripts/ops/verify-approved-case-studies.sh`, test de contrat associé,
    `.github/workflows/ci.yml`, `docs/operations.md`, `e2e/public.spec.ts` et E2E
    admin ciblé si les fixtures isolées permettent l'écriture.
  - **Autorisé :** découverte via sitemap et API publique; origine HTTP(S)
    bornée; redirections manuelles; timeout et taille maximaux; vérification des
    cinq sections, des services autorisés, de la parité hub/détail/sitemap et de
    l'absence de marqueurs privés; fixtures positives et négatives; état vide
    valable; ajout après la preuve AQ-SEO-011 et avant E2E.
  - **Interdit :** session admin ou secret dans la preuve publique, contact
    externe, impression du contenu complet, validation automatique de la vérité
    métier, faux projet conservé en production, remplacement d'une porte SEO
    existante ou déploiement depuis ce ticket sans revue.
  - **Tests :** étude non approuvée, section/service manquant, client anonyme
    divulgué, mesure non approuvée, note privée, lien non approuvé, ordre
    incorrect, doublon, redirection, réponse trop grande, origine non sûre et
    panne API/sitemap; succès avec zéro étude ou plusieurs études approuvées.
  - **Validation :** `bash -n`, Vitest ciblé, preuve locale, suites complètes,
    typecheck, build, budgets, base éphémère, E2E et `git diff --check`, tous via
    Portly pour les tâches bornées.
  - **Sécurité / rollback :** preuve anonyme et lecture seule. Un échec après
    déploiement conserve le diagnostic et restaure uniquement l'image compatible
    `previous`; les données et migrations additives restent en place.

- [ ] **6. Revoir séparément les deux phases et préparer la publication**
  - **Objectif :** obtenir un verdict indépendant sur la confidentialité,
    l'atomicité, la copie et les preuves avant chaque merge et chaque passage en
    production.
  - **Fichiers attendus :** `docs/reviews/AQ-SEO-012-transition.md`,
    `docs/reviews/AQ-SEO-012.md`, mise à jour des cases du plan et documents de
    release correspondants.
  - **Autorisé :** revue exacte des diffs; vérification des migrations et du
    rollback; matrice de données sensibles; test d'anonymisation; inspection
    bureau/mobile/clair/sombre/clavier/sans JavaScript; PR distincte ou commits
    explicitement séparés pour transition et activation.
  - **Interdit :** auto-approuver les données d'un projet, modifier la
    production pendant la revue, fusionner l'activation avant la preuve de la
    transition, publier un cas de démonstration ou élargir à AQ-PROJ-002.
  - **Tests :** toutes les preuves ciblées et existantes, contrôle du SHA exact,
    absence de finding bloquant et démonstration du rollback compatible.
  - **Validation :** validation humaine distincte du plan, de l'implémentation de
    transition, de sa production, de l'activation et de la production finale.
  - **Sécurité / rollback :** Antoine reste le validateur humain; les revues et
    audits prouvent l'action sans recopier la donnée sensible.

## Matrice d'approbation proposée

> État au 5 septembre 2026 : la release de transition (étapes 1, 2, 3 et 5)
> est implémentée et sa revue autorise la livraison. L'étape 4 reste
> volontairement non activée jusqu'à ce que cette image soit déployée, prouvée
> en production et conservée comme rollback `previous`. L'étape 6 ne sera
> complète qu'après la revue distincte de cette activation.

La validation de ce plan approuve les règles de traitement ci-dessous, pas la
publication d'un projet réel. Chaque projet devra encore être relu et republié
individuellement par Antoine.

| Élément | Obligatoire pour l'étude | Approbation dédiée | Comportement public |
|---|---:|---:|---|
| Contexte | oui | validation finale | paragraphe « Contexte » |
| Rôle d'Antoine | oui | validation finale | passage distinct |
| Périmètre | oui | validation finale | paragraphe « Périmètre » |
| Décisions | oui | validation finale | paragraphe « Décisions » |
| Résultat qualitatif | oui | oui | paragraphe « Résultats » |
| Nom client | non | statut `approved` | sinon masqué; `anonymous` autorise l'étude |
| Liens live/GitHub dans l'étude | non | oui, ensemble | sinon aucun bouton externe dans l'étude |
| Durée/date | non | oui, ensemble | sinon absentes de la page |
| Mesure chiffrée | non | oui, par mesure | sinon filtrée; le qualitatif reste affiché |
| Contexte de mesure | non | inclus dans l'approbation de la mesure | publié lorsqu'il existe |
| Note/source de preuve | non | privée | jamais renvoyée publiquement |
| Témoignage | non pris en charge | — | jamais publié par AQ-SEO-012 |
| Service pertinent | au moins un | choix humain | lien parmi les quatre routes approuvées |

Les services sélectionnables sont exactement : développeur web, création de
site, refonte de site et application mobile, avec les routes françaises déjà
présentes dans le sitemap. Il n'existe aucun mapping automatique depuis
`web/mobile/cms`.

## Cartographie des critères

| Critère d'acceptation | Étapes |
|---|---|
| Contexte, rôle, périmètre, décisions et résultat minimum | 1 à 5 |
| Nom, lien, témoignage ou chiffre visibles seulement après approbation | 1 à 5; témoignage explicitement absent |
| Période ou contexte d'une mesure lorsqu'il existe | 1 à 3, 5 |
| Projet confidentiel anonyme sans fausse précision | 1 à 5 |
| Titres explicites et paragraphes autonomes | 2, 3, 5 |
| Hub et études liés aux services pertinents | 1 à 3, 5 |
| Consentement/preuve absent : privé ou publication bloquée selon criticité | 2 à 5 |
| Résultat qualitatif autorisé sans chiffre | 1 à 5 |
| Publication admin, validation Antoine et audit sensible | 2, 4 à 6 |

## Impacts explicitement cadrés

- **Migration / données :** colonnes additives sur `projects`, enrichissement
  compatible du JSONB `results`, aucune auto-approbation et aucune suppression.
- **RLS / autorisation :** RLS et révocation Data API conservées; RPC
  `security invoker`, organisation bornée, `service_role` seul; publication
  `owner/admin` uniquement.
- **Stockage :** aucun bucket, média ou fichier client modifié.
- **Routes publiques :** aucune nouvelle route; `/cas-clients-valais` et
  `/projets/**` restent françaises; API, hub et sitemap utilisent la même porte.
- **Dépendances / IA :** aucune dépendance et aucune génération, vérification ou
  approbation de preuve par IA.
- **Données destructives :** aucune suppression ou réécriture des brouillons;
  les études historiques sans approbation deviennent privées dans la nouvelle
  image jusqu'à revalidation humaine.
- **Déploiement / rollback :** deux phases obligatoires; l'activation dépend de
  la preuve que l'image de transition est en production et compatible rollback.
- **Hors ticket :** témoignages, sollicitations client, traduction détaillée,
  publication par langue, contrôle distant permanent des liens, médiathèque,
  génération de contenu et garantie de citation par un moteur génératif.

## Validation humaine requise

Antoine doit valider explicitement ce plan et sa matrice avant toute
implémentation. Cette validation ne vaut pas consentement pour publier un nom,
un lien, une durée ou un résultat de projet existant; chacun restera privé tant
qu'il n'aura pas été approuvé dans le dashboard puis validé lors de la
publication de l'étude concernée.

Validation explicite reçue d'Antoine le 4 septembre 2026 (« je valide »).
