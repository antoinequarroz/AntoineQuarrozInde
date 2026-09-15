# AQ-PROJ-002 — Recherche : saisir une étude de cas complète en trois langues

## Ticket et résultat attendu

Le ticket Linear `ANT-5` demande de pouvoir rédiger indépendamment en français, anglais et allemand tous les textes détaillés d'une étude de cas, sans traduction automatique et sans rendre une langue obligatoire pour sauvegarder les autres. Un changement d'onglet ne doit perdre aucune saisie; une erreur doit désigner le champ et la langue concernés; les modifications sensibles doivent rester attribuables par langue (`docs/product/stories.md:405-425`). Le PRD impose en plus qu'aucune future page détaillée localisée ne mélange plusieurs langues et que la publication reste une décision humaine séparée (`docs/product/prd.md:221-255`).

## Parcours actuel vérifié

- Le formulaire possède déjà trois descriptions courtes distinctes, `description`, `descriptionEn` et `descriptionDe`. En revanche, le rôle, la durée, le contexte, le périmètre, les décisions, l'approche, la solution, le résultat qualitatif, les livrables et les mesures sont chacun représentés par une seule valeur (`app/pages/admin/projects/index.vue:24-60`).
- L'ouverture et la sauvegarde du dialogue copient ce bloc détaillé unique dans un objet réactif, puis l'envoient en une seule requête. Cette structure conserve bien la saisie tant que le dialogue reste ouvert, mais ne permet aucun état indépendant par langue (`app/pages/admin/projects/index.vue:63-108`, `app/pages/admin/projects/index.vue:136-220`).
- `ProjectCaseStudyFields` rend tous les champs détaillés dans un seul formulaire français. Les limites existent dans le HTML, mais les aides, identifiants et messages ne portent aucune locale (`app/components/admin/ProjectCaseStudyFields.vue:8-40`, `app/components/admin/ProjectCaseStudyFields.vue:95-250`).
- Les décisions communes — divulgation du client, services liés, date, approbation de la chronologie, approbation des liens, galerie et publication — ne sont pas des traductions. Elles doivent rester au niveau du projet. Les textes affichés, y compris la durée, les livrables et les libellés/contexte des mesures, sont en revanche linguistiques.

## Contrat applicatif et validation actuels

- `Project` expose uniquement `descriptionEn` et `descriptionDe`; tous les champs détaillés restent sans locale. `ProjectResult` regroupe valeur, libellé, contexte de mesure, note de preuve privée et approbation (`app/types/index.ts:6-61`).
- Le store mappe directement les colonnes uniques de `projects` vers ce type. La lecture publique et la lecture admin partagent ce mapping (`app/stores/projects.ts:3-105`, `app/stores/projects.ts:108-169`).
- `projectPayload` borne déjà les champs : rôle 180 caractères, durée 120, contexte et résultat 4 000, périmètre/décisions/approche/solution 6 000, 20 livrables de 120 et 6 mesures. Toutefois `optionalText` produit une erreur générique et `textArray` tronque silencieusement les valeurs; aucune erreur structurée ne permet à l'interface de cibler une langue (`server/utils/projectPayload.ts:8-30`, `server/utils/projectPayload.ts:53-69`, `server/utils/projectPayload.ts:90-156`).
- POST et PUT exigent une session admin avec MFA, construisent le payload à partir de l'organisation résolue côté serveur et délèguent l'écriture à la RPC auditée (`server/api/projects.post.ts:1-28`, `server/api/projects.put.ts:1-27`). `requireAdmin` accepte techniquement le rôle `manager`; la RPC dérive ensuite le rôle réel depuis `organization_memberships` (`server/utils/requireAdmin.ts:1-29`, `server/utils/organizationAccess.ts:41-94`).

## Données, compatibilité et audit

- `public.projects` contient les descriptions courtes EN/DE, mais une seule série de colonnes détaillées françaises et un seul tableau JSON de résultats (`supabase/schema.sql:19-73`). Cette ligne porte aussi les états et approbations communs.
- La migration d'approbation et sa phase d'activation verrouillent une étude publiée, vérifient les champs requis et enregistrent les changements sensibles dans la même transaction que le projet. Le journal énumère les champs modifiés mais pas leur langue (`supabase/migrations/20260904205717_add_project_case_study_approvals.sql:250-502`, `supabase/migrations/20260904230738_activate_project_case_study_approvals.sql:1-229`).
- La RPC est `security invoker`, retire l'exécution aux rôles navigateur, dérive le rôle de l'acteur en base et utilise un verrou de ligne. Ce modèle transactionnel doit être conservé; une seconde écriture applicative best-effort ferait perdre l'atomicité projet/traductions/audit.
- Une table enfant `project_case_study_localizations` indexée par `(project_id, locale)` correspond mieux au domaine qu'une multiplication de colonnes ou un objet JSON libre. Elle permet des contraintes fermées sur `fr|en|de`, une ligne vide absente, une attribution explicite par locale et prépare les états de complétude/publication par langue des tickets suivants. `organization_id` doit être présent et cohérent avec le projet afin de conserver les conventions tenant-safe.
- Pour un déploiement compatible, les colonnes détaillées historiques de `projects` restent le contrat public français. La migration peut initialiser une ligne `fr` depuis les valeurs existantes, et la RPC doit synchroniser la localisation française vers ces colonnes durant la transition. Ainsi l'image précédente et les pages françaises existantes continuent de fonctionner; aucune colonne n'est supprimée.

## Parcours public et limites du ticket

- L'API anonyme sélectionne actuellement uniquement les colonnes de `projects`, neutralise les détails non approuvés et n'expose aucune structure de traduction détaillée (`server/api/projects.get.ts:1-43`, `server/utils/publicContent.ts:30-69`, `server/utils/publicContent.ts:159-213`).
- La page `/projets/[slug]` choisit la description courte selon la locale, mais rend tous les autres champs depuis la série française unique. Plusieurs titres de section sont même codés en français (`app/pages/projets/[slug].vue:18-70`).
- AQ-PROJ-002 doit préparer et sauvegarder les trois brouillons, pas ouvrir des pages EN/DE ni changer les règles publiques. La complétude/aperçu appartient à AQ-PROJ-003 et la publication/canonical/hreflang/sitemap par langue à AQ-PROJ-004. Les nouvelles localisations doivent donc rester privées dans ce ticket.

## Couverture de tests existante et manques

- `tests/project-localized-descriptions.test.ts` protège seulement les descriptions courtes et leur fallback français dans le portfolio.
- `tests/project-publication-states.test.ts`, `tests/approved-case-studies.test.ts` et les tests pgTAP `aqproj001_project_publication` / `aqseo012_case_study_activation` protègent l'atomicité, les permissions, le verrou d'une étude approuvée et le filtrage des preuves privées.
- L'E2E admin vérifie l'ouverture du dialogue sur mobile et les contrôles de publication, mais ne saisit ni ne recharge de contenu détaillé multilingue (`e2e/admin.spec.ts:60-89`, `e2e/admin.spec.ts:201-230`).
- Il manque des tests sur les trois états en mémoire, la sauvegarde partielle, le rechargement, les limites par langue, une erreur qui conserve les autres valeurs, l'isolation tenant, le refus d'un rôle insuffisant et l'audit atomique indiquant les locales modifiées.

## Contraintes retenues pour le plan

1. Modéliser les textes détaillés par lignes `fr`, `en`, `de`, sans stocker de copie automatique du français dans une langue vide.
2. Garder au niveau du projet les preuves et décisions non linguistiques : client/divulgation, URLs, image/galerie, services, date, drapeaux d'approbation et de publication.
3. Localiser le rôle, la durée affichée, le contexte, le périmètre, les décisions, l'approche, la solution, le résultat qualitatif, les livrables et les parties éditoriales des mesures; conserver l'approbation humaine explicite.
4. Sauvegarder projet, localisations et audit dans une seule RPC verrouillée, avec rôle dérivé de la membership et aucune exécution directe depuis le navigateur.
5. Maintenir les colonnes françaises historiques pendant la transition; aucune modification du rendu public ou des signaux SEO dans ANT-5.
