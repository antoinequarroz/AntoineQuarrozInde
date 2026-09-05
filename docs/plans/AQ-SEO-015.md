---
ticket: AQ-SEO-015
validated: yes
---

# AQ-SEO-015 — Attribuer les contacts aux sources organiques et génératives

## Plan ordonné

- [x] **1. Définir une taxonomie fermée et partagée**
  - **Objectif :** classifier de façon explicable les sources sans surclasser
    une inconnue comme IA.
  - **Fichiers attendus :** utilitaire pur sous `shared/utils/`, types et tests
    Vitest.
  - **Autorisé :** `organic_search`, `generative_ai`, `direct`, `campaign`,
    `unknown_referral`; listes explicites de moteurs; normalisation casse/URL.
  - **Interdit :** heuristique sur texte libre, fingerprinting, IP, user-agent,
    identifiant visiteur, nouvelle dépendance ou classification probabiliste.
  - **Tests :** Google/Bing, ChatGPT/Perplexity/Claude/Gemini/Copilot/Mistral,
    direct, campagne, inconnu, sous-domaines et domaines ressemblants hostiles.
  - **Validation :** job Portly Vitest ciblé.
  - **Sécurité / rollback :** fonction pure; inconnue fail-closed.

- [x] **2. Fiabiliser la capture première touche**
  - **Objectif :** conserver l'attribution autorisée jusqu'au contact sans jamais
    bloquer la page ou le formulaire.
  - **Fichiers attendus :** `app/utils/attribution.ts`, tests unitaires avec
    stockage présent, refusé et corrompu.
  - **Autorisé :** session uniquement, première touche, bornes existantes,
    try/catch sur lecture/écriture.
  - **Interdit :** cookie, localStorage durable, URL complète référente, query
    libre supplémentaire ou renouvellement silencieux de la première touche.
  - **Tests :** conservation, purge corruption, stockage indisponible, SSR.
  - **Validation :** job Portly ciblé puis typecheck.
  - **Vie privée / rollback :** aucune donnée nouvelle; capture fail-open.

- [x] **3. Attribuer les conversions sans faire confiance au client**
  - **Objectif :** joindre uniquement la catégorie fermée aux événements retenus
    et recalculer les données du contact côté serveur.
  - **Fichiers attendus :** `app/composables/useMarketing.ts`,
    `app/composables/usePlausibleEvent.ts`, `ContactSection.vue`,
    `BookingCalendar.vue`, `server/api/marketing-event.post.ts`,
    `server/utils/leadAttribution.ts`, tests.
  - **Autorisé :** catégorie sur formulaire réussi, calendrier, fallback et
    e-mail; validation serveur stricte; Plausible custom property agrégée.
  - **Interdit :** metadata brute UTM/référent sur chaque clic, interruption du
    lien ou de la soumission en cas d'échec analytics, confiance dans une
    catégorie arbitraire du body.
  - **Tests :** payload fermé, catégorie falsifiée refusée/recalculée, panne des
    deux analytics non bloquante, événements existants inchangés.
  - **Validation :** jobs Portly Vitest et Playwright ciblés.
  - **Vie privée / rollback :** seulement une catégorie non personnelle;
    aucune migration.

- [x] **4. Exposer la comparaison dans le dashboard**
  - **Objectif :** distinguer contacts et résultats commerciaux organiques,
    génératifs, directs, campagnes et inconnus.
  - **Fichiers attendus :** `server/utils/acquisitionAttribution.ts`,
    `server/api/admin/marketing-analytics.get.ts`,
    `app/pages/admin/analytics/index.vue`, tests agrégateur/contrat UI.
  - **Autorisé :** vue par canal en plus des sources existantes, libellés
    français, état vide et volumes réels uniquement.
  - **Interdit :** donnée individuelle, nom/e-mail/message, estimation de source,
    accès public ou suppression de la vue source existante.
  - **Tests :** matrice des cinq canaux, leads/devis/CA, zéro donnée et sources
    historiques.
  - **Validation :** jobs Portly ciblés, typecheck et inspection dashboard.
  - **Sécurité / rollback :** endpoint admin existant et agrégats seulement.

- [x] **5. Documenter et prouver le parcours complet**
  - **Objectif :** conserver une convention reproductible et démontrer que les
    conversions survivent au blocage analytics.
  - **Fichiers attendus :** `docs/PLAUSIBLE_ANALYTICS.md`, page confidentialité
    seulement si la formulation doit être précisée, E2E public et tests légaux.
  - **Autorisé :** tableau des canaux, exemples UTM, scénario organique/IA/direct/
    inconnu, endpoints analytics interceptés en échec.
  - **Interdit :** promettre une attribution certaine quand le référent est
    masqué, publier une liste de visiteurs ou ajouter une donnée personnelle.
  - **Tests :** quatre scénarios demandés, formulaire/rendez-vous/e-mail
    fonctionnels, conformité FR/EN/DE et non-régression complète.
  - **Validation :** suite complète, typecheck, build, budgets, E2E et
    `git diff --check`, lancés via Portly localement.
  - **Sécurité / rollback :** changement applicatif sans suppression de donnée;
    rollback vers l'image précédente.

## Cartographie des critères

| Critère | Étapes |
|---|---|
| Source/UTM conservés jusqu'au contact | 2, 3, 5 |
| Génératif distinct d'organique sans mensonge | 1, 3 à 5 |
| Soumission, rendez-vous et conversions fonctionnels | 3, 5 |
| Organique, génératif, direct et inconnu testés | 1, 5 |
| Aucune donnée personnelle nouvelle | 1 à 5 |

## Validation humaine requise

Antoine doit valider explicitement cette taxonomie avant implémentation. Cette
validation autorise uniquement la catégorie agrégée; elle n'autorise aucune
identification individuelle ni conservation plus longue que la session actuelle.

Validation explicite reçue d'Antoine le 5 septembre 2026 (« go »), pour les
plans AQ-SEO-013, AQ-SEO-014 et AQ-SEO-015.
