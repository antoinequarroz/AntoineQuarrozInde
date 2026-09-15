---
ticket: AQ-PROJ-002
linear: ANT-5
validated: yes
validated_at: 2026-09-15
---

# AQ-PROJ-002 — Saisir une étude de cas complète en trois langues

## Critères d'acceptation

- [x] Le formulaire permet d'éditer indépendamment les contenus détaillés FR, EN et DE sans perdre une saisie lors d'un changement de langue.
- [x] Une langue peut rester entièrement vide et n'empêche jamais la sauvegarde des deux autres; aucune valeur française n'est copiée automatiquement.
- [x] Les limites, compteurs et aides sont cohérents pour les trois langues et une erreur désigne précisément la locale et le champ concernés.
- [x] Après sauvegarde et rechargement, chaque valeur revient uniquement dans sa langue, y compris les livrables et les résultats.
- [x] Seuls `owner` et `admin` peuvent modifier les localisations; l'audit enregistre l'acteur et les langues/champs modifiés sans copier le texte sensible.
- [x] Le site public français et son mécanisme d'approbation restent inchangés; les brouillons EN/DE ne créent aucune URL ni donnée publique.

## Plan ordonné

- [x] **1. Ajouter un modèle de localisation append-only et compatible**
  - **Objectif :** créer `project_case_study_localizations` avec une ligne par projet et locale `fr|en|de`, les champs éditoriaux détaillés, des limites structurelles et des horodatages; initialiser uniquement `fr` depuis les colonnes historiques existantes.
  - **Fichiers attendus :** nouvelle migration Supabase créée avec la CLI, `supabase/schema.sql`, `supabase/production-migration-baseline.json` au moment prévu par le workflow, nouveau test pgTAP AQ-PROJ-002.
  - **Autorisé :** table enfant, FK projet/organisation, unicité `(project_id, locale)`, index tenant-safe, contraintes de locale/tableaux/JSON, backfill français idempotent et commentaires.
  - **Interdit :** supprimer ou renommer les colonnes de `projects`, créer des lignes EN/DE depuis le français, publier une traduction, modifier les projets sans contenu détaillé ou accorder un privilège direct à `anon`/`authenticated`.
  - **Tests :** replay de toutes les migrations, trois locales acceptées, quatrième refusée, doublon refusé, suppression en cascade bornée au projet, isolation organisationnelle, aucun contenu EN/DE synthétique.
  - **Validation :** `/Users/antoinequarroz/.local/bin/portly temp 'npm run test:db' --path /Users/antoinequarroz/Lab/projets/AntoineQuarrozInde --timeout 30m`, puis attente du job Portly.
  - **Sécurité / rollback :** table privée, RLS active, privilèges navigateur révoqués et accès `service_role` uniquement; l'ancienne image ignore la table et continue de lire les colonnes françaises.

- [x] **2. Définir un contrat trilingue strict et des erreurs ciblables**
  - **Objectif :** introduire les types `ProjectCaseStudyLocale` et `ProjectCaseStudyLocalization`, normaliser un objet fermé `{ fr, en, de }`, conserver une langue vide comme valeurs nulles/collections vides et retourner des erreurs structurées `{ locale, field, message }`.
  - **Fichiers attendus :** `app/types/index.ts`, nouveau ou adapté utilitaire partagé de localisations, `server/utils/projectPayload.ts`, tests unitaires AQ-PROJ-002.
  - **Autorisé :** mêmes bornes que les champs actuels, rejet au lieu de troncature silencieuse, six résultats maximum et vingt livrables maximum par langue, valeurs trimées.
  - **Interdit :** accepter une clé de locale arbitraire, copier une langue vers une autre, transformer une erreur en effacement, traduire automatiquement ou faire confiance à `organization_id`/`actor` fourni par le navigateur.
  - **Tests :** langues indépendantes, langue vide, champ trop long FR/EN/DE, livrable et résultat invalides avec locale/index exacts, payload inconnu refusé, valeurs des autres langues inchangées après erreur.
  - **Validation :** job Portly ciblé `vitest run` sur le nouveau contrat et les tests projet existants.
  - **Sécurité / rollback :** la validation s'exécute avant l'appel SQL; le contrat public n'est pas étendu et aucune preuve privée n'entre dans une erreur.

- [x] **3. Étendre la sauvegarde auditée de façon atomique**
  - **Objectif :** faire enregistrer par la RPC existante le projet et ses trois localisations dans la même transaction, verrouiller le projet, dériver le rôle réel, refuser les changements de localisation aux rôles autres que `owner/admin`, synchroniser `fr` vers les colonnes historiques et journaliser uniquement les locales/champs modifiés.
  - **Fichiers attendus :** même migration append-only ou migration d'activation séparée si la compatibilité l'exige, `server/api/projects.post.ts`, `server/api/projects.put.ts`, `server/utils/projectPublication.ts`, tests Vitest API et pgTAP.
  - **Autorisé :** upsert atomique des seules locales explicitement présentes, suppression logique d'une localisation par valeurs vides, audit `project.case_study_localizations_changed` avec `locales`, `fields`, acteur et horodatage fourni par `audit_logs`.
  - **Interdit :** audit best-effort, corps de texte/note de preuve dans l'audit, rôle issu du payload, écriture partielle si l'audit échoue, mutation directe d'une étude française déjà publiée sans repasser par le verrou d'approbation.
  - **Tests :** owner/admin autorisés, manager refusé, spoof de rôle refusé, organisation A/B isolée, rollback total sur erreur d'une locale ou de l'audit, liste exacte des langues/champs modifiés, compatibilité du français public.
  - **Validation :** tests API ciblés et `npm run test:db` via Portly.
  - **Sécurité / rollback :** RPC `security invoker`, exécutable seulement par `service_role`; une phase de transition/activation distincte sera utilisée si l'image précédente ne peut pas relire le français après une écriture.

- [x] **4. Construire le formulaire à onglets sans perte de saisie**
  - **Objectif :** remplacer le bloc détaillé unique par des onglets natifs accessibles FR/EN/DE pilotant trois objets réactifs persistants, avec état vide explicite, aides adaptées, compteurs et retour automatique vers le champ fautif.
  - **Fichiers attendus :** `app/pages/admin/projects/index.vue`, `app/components/admin/ProjectCaseStudyFields.vue`, éventuellement un composant focalisé de sélecteur linguistique, tests de composant/structure et E2E admin.
  - **Autorisé :** rôles ARIA d'onglets conformes, navigation clavier, indicateur non éditorial `Vide`/`En cours`, `lang` sur le panneau actif, identifiants uniques par locale et message d'erreur inline conservant le formulaire ouvert.
  - **Interdit :** afficher trois longs formulaires simultanément sur mobile, remonter une donnée commune dans chaque langue, effacer un panneau au changement d'onglet, prétendre qu'une langue est prête/publiée (périmètre AQ-PROJ-003/004) ou refondre tout le dashboard.
  - **Tests :** saisie FR→EN→DE→FR sans perte, tabulation/flèches, mobile 390 px sans débordement, thème clair/sombre, langue vide claire, erreur EN qui active et focalise son champ sans modifier FR/DE.
  - **Validation :** tests ciblés via Portly puis vérification navigateur locale desktop/mobile sur le serveur Portly sain.
  - **Sécurité / rollback :** les champs sont désactivés pour les rôles insuffisants mais le serveur reste l'autorité; le composant précédent est récupérable puisque le français reste synchronisé.

- [x] **5. Charger, mapper et recharger les brouillons privés**
  - **Objectif :** joindre les localisations uniquement dans la réponse admin, les mapper sans fallback dans le store et prouver qu'une sauvegarde/relecture restitue exactement les trois langues.
  - **Fichiers attendus :** `server/api/projects.get.ts`, `app/stores/projects.ts`, `app/types/index.ts`, tests API/store et E2E de rechargement.
  - **Autorisé :** relation Supabase bornée à l'organisation, tableau de localisations privé, création côté client de panneaux vides uniquement pour l'édition.
  - **Interdit :** ajouter les localisations à `PUBLIC_PROJECT_COLUMNS`, exposer une note de preuve, utiliser le français comme fallback détaillé ou changer `/projets/[slug]`, le sitemap, canonical ou hreflang.
  - **Tests :** réponse anonyme identique avant/après, réponse admin avec trois locales maximum, aucune fuite cross-tenant, rechargement exact, absence de traduction française enregistrée en EN/DE.
  - **Validation :** Vitest ciblé et contrôle HTTP local authentifié/anonyme via Portly.
  - **Sécurité / rollback :** la sérialisation publique reste une liste fermée; l'ancienne application continue de fonctionner grâce aux colonnes historiques.

- [ ] **6. Fermer les preuves et préparer AQ-PROJ-003**
  - **Objectif :** démontrer tous les critères sans implémenter la complétude, l'aperçu ou la publication par langue, puis documenter le contrat stable que ces tickets pourront consommer.
  - **Fichiers attendus :** tests AQ-PROJ-002, mise à jour du présent plan, preuve/commentaire Linear `ANT-5`; aucun fichier produit supplémentaire hors nécessité démontrée.
  - **Autorisé :** fixtures locales non sensibles, revue indépendante et vérification du dialogue mobile/desktop.
  - **Interdit :** mutation de production, déploiement, page EN/DE indexable, traduction générée, donnée client réelle ou élargissement opportuniste d'AQ-PROJ-003 à 009.
  - **Tests :** ciblés, suite Vitest complète, typecheck, build, budgets, replay/pgTAP Supabase, E2E admin applicable et `git diff --check`, tous via Portly.
  - **Validation :** portes complètes vertes, revue indépendante sans finding bloquant, puis validation humaine séparée avant toute mise en production.
  - **Sécurité / rollback :** migration additive et contrat public inchangé; en cas d'incident, revenir à l'image précédente laisse les localisations privées en base sans perte et continue d'afficher le français historique.

## Correspondance critères → tâches

- Édition indépendante et changement d'onglet sans perte : tâches 2, 4 et 5.
- Langue vide sans copie ni blocage : tâches 1, 2, 4 et 5.
- Limites, aides et erreur ciblée : tâches 2 et 4.
- Persistance/rechargement des livrables et résultats : tâches 1, 3 et 5.
- Autorisation et audit par langue : tâches 1 et 3.
- Absence de fuite publique et compatibilité française : tâches 1, 3, 5 et 6.

## Décisions proposées à valider

- Utiliser une table enfant par projet et langue plutôt que multiplier les colonnes ou stocker un JSON libre.
- Localiser tous les textes détaillés affichables : rôle, durée, contexte, périmètre, décisions, approche, solution, résultat qualitatif, livrables et contenu éditorial des mesures.
- Garder partagés les URLs, médias, date, client/divulgation, services et drapeaux d'approbation/publication.
- Conserver et synchroniser les colonnes françaises existantes jusqu'au ticket de publication localisée afin de garantir un rollback sûr.
- Réserver la complétude/aperçu à AQ-PROJ-003 et les URLs publiques par langue à AQ-PROJ-004.

## Validation humaine requise

Plan validé explicitement par Antoine le 15 septembre 2026 avant toute modification applicative ou migration pour `ANT-5`.

## Preuves d'implémentation

- Contrat et routes ciblés : 35 tests Vitest verts.
- Suite applicative hors gardes de release externes : 658 tests Vitest verts.
- Base locale éphémère : replay complet, lint SQL et 206 assertions pgTAP vertes, dont 19 pour AQ-PROJ-002.
- TypeScript : `npm run typecheck` vert.
- Production Nuxt : `npm run build` vert.
- Budgets : bundle total 1 496 889 octets, plus gros chunk 199 657 octets, scène robot 1 010 718 / 1 500 000 octets.
- UI locale : formulaire existant chargé avec fallback de transition, saisie FR → EN → FR conservée, aucun débordement horizontal à 390 × 844 px.
- Restent ouverts avant livraison : revue indépendante, baseline de migration à synchroniser uniquement après promotion en production, et suite Hermes bloquée sur ce Mac par la licence Xcode non acceptée.
