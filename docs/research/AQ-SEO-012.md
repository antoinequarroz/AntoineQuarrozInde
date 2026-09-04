# Recherche AQ-SEO-012 — Études de cas fondées sur des preuves approuvées

## Cadre du ticket

`AQ-SEO-012` demande qu'une étude publiée distingue au minimum le contexte, le
rôle d'Antoine, le périmètre, les décisions et le résultat disponible. Un nom
client, un lien, un témoignage ou une mesure ne peut être visible qu'après une
approbation explicite; un projet confidentiel reste anonyme; les résultats sans
mesure vérifiée restent qualitatifs; le hub et chaque étude se lient aux services
pertinents (`docs/product/stories.md:237-256`). Ces règles matérialisent
`GEO-R003`, `GEO-R004`, `GEO-R006` et la décision `OD-SEO-002`
(`docs/product/prd.md:110-119,177-181`).

La story dépend de la découverte publique d'`AQ-SEO-006` et du contenu de
services approuvé d'`AQ-SEO-011`. Elle reste française uniquement : les familles
`/cas-clients-valais` et `/projets/**` déclarent encore EN et DE indisponibles,
conformément à `OD-SEO-001`
(`shared/utils/localizedRoutePolicy.ts:33-60`). La traduction détaillée et la
publication par langue appartiennent aux stories `AQ-PROJ-002` à
`AQ-PROJ-004` (`docs/product/stories.md:405-465`) et ne doivent pas être
anticipées ici.

## Flux représentatif actuel

1. L'administrateur ouvre le formulaire projets. `owner` et `admin` peuvent
   modifier les deux cases de publication; les autres rôles voient ces cases
   désactivées (`app/pages/admin/projects/index.vue:12-19`,
   `app/components/admin/ProjectCaseStudyFields.vue:40-72`).
2. Les champs détaillés sont tous présentés comme facultatifs. Le formulaire
   accepte un libellé client, un rôle, une durée, quatre paragraphes, des
   livrables et des résultats `{ value, label }`
   (`app/components/admin/ProjectCaseStudyFields.vue:74-139`).
3. `handleSubmit` exige seulement une image côté interface, puis envoie les
   champs et l'état `caseStudyPublished` au magasin
   (`app/pages/admin/projects/index.vue:95-149`). Le navigateur exige également
   un titre, une description française et une URL publique
   (`app/pages/admin/projects/index.vue:217-272`).
4. `projectPayload` contrôle le socle minimal, les longueurs, les URL HTTP(S) et
   les booléens, mais conserve tous les champs d'étude comme facultatifs. Un
   résultat n'a que sa valeur et son libellé
   (`server/utils/projectPayload.ts:26-62,64-117`).
5. POST et PUT appellent `save_project_with_publication_audit` avec
   l'organisation, l'acteur, son rôle et le payload
   (`server/api/projects.post.ts:1-23`, `server/api/projects.put.ts:1-24`). Le
   RPC verrouille une ligne lors d'une mise à jour, limite les transitions
   publiques à `owner/admin`, sauvegarde puis journalise les deux booléens dans
   la même transaction (`supabase/schema.sql:427-558`).
6. Une lecture anonyme sélectionne les projets visibles dans le portfolio ou
   publiés comme étude. Le sérialiseur retourne sans autre porte le nom client,
   les liens, les paragraphes et tous les résultats dès que
   `case_study_published` vaut vrai (`server/api/projects.get.ts:7-27`,
   `server/utils/publicContent.ts:101-135`).
7. La route dynamique filtre sur `caseStudyPublished`, rend les résultats puis
   les quatre sections non vides, et affiche les liens live/GitHub lorsqu'ils
   existent (`app/pages/projets/[slug].vue:17-24,51-56,151-169,197-208`).
8. Le hub filtre le même booléen et lie chaque carte à la page dynamique
   (`app/pages/cas-clients-valais.vue:7-11,78-117`). Le sitemap sélectionne aussi
   toutes les lignes où `case_study_published = true`
   (`server/routes/sitemap.xml.ts:9-34`).

## Écarts vérifiés

### La structure éditoriale minimale n'est pas représentée

- Le type et la table connaissent `challenge`, `approach`, `solution` et
  `outcome`, mais aucun champ explicite pour le périmètre ou les décisions
  (`app/types/index.ts:1-29`, `supabase/schema.sql:19-50`). Réinterpréter
  silencieusement « approche » ou « solution » ne permettrait pas de garantir
  cinq passages autonomes.
- Le rôle, le contexte et le résultat peuvent être vides lors d'une publication.
  Aucune porte applicative ou SQL ne vérifie la complétude critique
  (`server/utils/projectPayload.ts:102-114`, `supabase/schema.sql:457-480`).
- La page masque simplement les sections absentes. Une étude peut donc être
  indexable tout en ne présentant aucun contexte, périmètre, décision ou
  résultat (`app/pages/projets/[slug].vue:51-56,161-171`).

Il faut ajouter deux champs français explicites, `project_scope` et
`key_decisions`, puis traiter comme critiques à la publication : contexte,
rôle, périmètre, décisions et résultat qualitatif. `solution`, livrables,
galerie, durée, date et résultats chiffrés restent des enrichissements
facultatifs.

### Les avertissements ne constituent pas une approbation

- Le dashboard invite à ne pas inventer de chiffre, mais ne conserve ni source,
  contexte de mesure, approbation ni identité du validateur
  (`app/components/admin/ProjectCaseStudyFields.vue:114-138`).
- `client_label`, `live_url`, `code_url` et `results` sont exposés par le
  sérialiseur sans état de consentement propre
  (`server/utils/publicContent.ts:104-132`).
- Le RPC journalise uniquement les booléens portfolio/étude. Un manager peut
  modifier un contenu sensible d'une étude déjà publiée tant que ces booléens ne
  changent pas, sans audit dédié
  (`supabase/schema.sql:504-555`).
- Le statut « publiée » ne prouve pas que la version courante a été relue : la
  sauvegarde du contenu et la décision de publication utilisent le même
  payload, mais aucun identifiant ou instant de validation finale n'est stocké.

L'approbation doit donc être un état persistant, lié à l'acteur et à la version
du contenu. Une étude publiée ne doit pas pouvoir être modifiée en place : elle
doit d'abord repasser en brouillon, être corrigée, puis être republiée par
`owner/admin`. Cette transition constitue la validation finale explicite et
permet au RPC de stocker `case_study_approved_at` et
`case_study_approved_by` atomiquement. Les changements sensibles doivent créer
un audit ne contenant que les champs modifiés et les états avant/après, jamais
le texte, la preuve privée ou le nom client brut.

### Confidentialité, liens et mesures demandent des portes distinctes

Un seul accord global ne suffit pas à expliquer pourquoi une donnée sensible
est publique. Le contrat minimal recommandé est :

| Donnée | État privé | Condition d'exposition | Effet si absent |
|---|---|---|---|
| Identité client | `pending`, `anonymous` ou `approved` | `client_label` seulement avec `approved` | `pending` bloque la publication; `anonymous` publie sans nom |
| Liens de l'étude | booléen d'approbation du groupe live/GitHub | boutons de la page seulement si approuvés | liens masqués; l'étude reste publiable |
| Durée et livraison | booléen d'approbation du groupe temporel | métadonnées visibles seulement si approuvées | valeurs masquées; l'étude reste publiable |
| Résultat qualitatif | texte plus approbation | texte non vide et approuvé | bloque la publication |
| Mesure chiffrée | valeur, libellé, contexte, note de preuve privée et approbation par ligne | ligne approuvée uniquement; note jamais publique | ligne non approuvée filtrée; zéro ligne autorisé |
| Validation finale | date et acteur issus du serveur | transition brouillon vers publié par `owner/admin` | aucune page, aucun sitemap |

Le contexte de mesure reste facultatif parce que la story dit « lorsqu'ils sont
disponibles ». Le dashboard doit néanmoins le demander explicitement. Une note
de preuve privée permet à Antoine de retrouver la source sans la divulguer. Le
témoignage n'existe pas dans le modèle actuel et reste hors de cette story :
aucun témoignage ne sera publié tant qu'un futur ticket ne définit pas son texte,
son consentement et son attribution.

### Le lien avec les services n'existe pas

La catégorie projet est limitée à `web`, `mobile` ou `cms`
(`server/utils/projectPayload.ts:1,64-68`), tandis que les services publics
approuvés sont quatre routes distinctes
(`server/utils/sitemapDiscovery.ts:24-33`). Déduire automatiquement un service
depuis la catégorie serait ambigu : un projet web peut relever de création, de
refonte ou d'un accompagnement de développement.

La relation doit donc être choisie humainement dans le dashboard et persistée
comme une liste fermée de chemins parmi :

- `/developpeur-web-valais`;
- `/creation-site-internet-valais`;
- `/refonte-site-web-valais`;
- `/application-mobile-valais`.

Une étude publiée exige au moins un service. La page détail rend ces liens dans
une section explicite; la carte du hub rend au moins un lien de service sans
imbriquer des liens interactifs. Les pages de service possèdent déjà un lien de
preuve vers le portfolio et peuvent pointer vers le hub sans annoncer une étude
inexistante, conformément à la matrice approuvée d'`AQ-SEO-011`
(`docs/plans/AQ-SEO-011.md`, section « Matrice d'approbation de la copie »).

### Le hub contient encore des affirmations non rattachées à une preuve

Le hub affirme que les projets transforment le trafic en demandes qualifiées et
ses métadonnées parlent de « résultats business » et d'« impact »
(`app/pages/cas-clients-valais.vue:28-33,70-76`). Sa FAQ annonce aussi une
livraison fréquente en quelques semaines et une préparation pour un
référencement local solide (`app/pages/cas-clients-valais.vue:13-25`). Ces
affirmations ne proviennent pas des projets approuvés et contredisent la règle
de ne pas compenser une preuve absente par de la précision commerciale.

AQ-SEO-012 doit remplacer cette copie par une présentation factuelle : chaque
étude décrit uniquement l'intervention et les résultats approuvés; les délais,
prix et effets ne sont pas généralisés depuis les cas. Le `FAQPage` doit être
retiré avec la FAQ si elle n'apporte plus de réponses vérifiées, plutôt que de
laisser des données structurées sans contenu probant.

## Modèle de données et transition recommandés

Une extension additive de `projects` est plus petite qu'une nouvelle table et
reste cohérente avec le flux atomique existant :

- `project_scope text` et `key_decisions text`;
- `client_disclosure_status text not null default 'pending'` avec ensemble fermé
  `pending | anonymous | approved`;
- `case_study_links_approved boolean not null default false`;
- `case_study_timeline_approved boolean not null default false`;
- `outcome_approved boolean not null default false`;
- `related_service_paths text[] not null default '{}'`, validé contre les quatre
  routes approuvées, sans doublon;
- `case_study_approved_at timestamptz` et
  `case_study_approved_by uuid references auth.users(id) on delete set null`;
- `results` reste JSONB, mais chaque entrée administrative devient
  `{ value, label, measurementContext, evidenceNote, approved }`; la projection
  publique ne retourne que `{ value, label, measurementContext }` pour les
  entrées approuvées.

Les migrations doivent être append-only. Aucun projet historique ne peut être
marqué approuvé automatiquement. La livraison doit donc être découpée :

1. une transition additive ajoute le modèle et une image applicative qui masque
   toute étude sans validation courante, tout en gardant le RPC compatible;
2. après preuve que cette image est en production et constitue un rollback sûr,
   une activation renforce le RPC avec les portes de complétude, de rôle,
   d'immuabilité publiée et d'audit.

Cette séquence reprend le précédent vérifié d'`AQ-PROJ-001`. Elle évite qu'un
rollback vers une image ignorant les nouvelles approbations republie des
données. Une étude historique publiée mais sans approbation enregistrée devient
non indexable dans la nouvelle image et doit être relue puis republiée par
Antoine; elle n'est ni supprimée ni auto-approuvée.

Le projet utilise les routes Nitro avec `service_role`; les privilèges directs
sur `projects` sont révoqués à `anon` et `authenticated`
(`supabase/migrations/20260805173635_harden_server_only_data_api_grants.sql:1-40`),
et la table conserve la RLS activée (`supabase/schema.sql:699-706`). Le RPC doit
rester `security invoker`, avec `search_path` vide et exécutable uniquement par
`service_role`, comme aujourd'hui (`supabase/schema.sql:427-438,561-564`). Le
changelog Supabase consulté le 4 septembre 2026 signale le durcissement de
l'exposition automatique des nouvelles tables; aucune nouvelle table Data API
n'est proposée ici, mais les privilèges et la RLS restent testés en défense en
profondeur.

## Flux cible

1. Un éditeur complète le brouillon, choisit anonymat ou identité approuvée,
   sélectionne les services pertinents et documente les résultats.
2. Le dashboard calcule une liste de blocages. Les champs optionnels non
   approuvés sont annoncés comme privés, pas comme erreurs.
3. `projectPayload` normalise un contrat fermé; il rejette les statuts, services,
   URL et résultats mal formés sans tronquer silencieusement une preuve.
4. Lors d'une transition vers publié, le RPC verrouille la ligne, vérifie le
   rôle, les cinq contenus critiques, l'approbation du résultat qualitatif,
   l'état de divulgation et au moins un service; il stocke acteur/date et audit
   dans la même transaction.
5. Un contenu public déjà publié est immuable. Toute correction demande un
   retour explicite au brouillon; les valeurs restent conservées.
6. L'API anonyme ne renvoie que les champs publiables : identité, temporalité,
   liens et mesures sont filtrés par leur porte respective; toute note de preuve
   reste privée.
7. Le hub et la route détail ne considèrent publiées que les études ayant une
   validation finale courante. Les sections explicites sont rendues en SSR, et
   les services sont liés depuis les deux surfaces.
8. Le sitemap applique la même porte. Une preuve HTTP compare sitemap, API, hub
   et pages, sans session ni secret.

## Tests et preuve de release

- Tests Vitest du parseur : statuts fermés, services fermés et uniques, résultat
  complet, note privée, absence de troncature, booléens stricts.
- Tests du sérialiseur : étude non approuvée absente; anonymat; client approuvé;
  liens et temporalité masqués ou visibles; seules les mesures approuvées sont
  publiques; aucune `evidenceNote`, identité d'approbateur ou donnée CRM.
- Tests pgTAP : migration additive, privilèges, verrou, rôle, cinq champs
  critiques, divulgation, résultat qualitatif, service, validation finale,
  refus de mutation d'une étude publiée et rollback complet si l'audit échoue.
- Test du dashboard : liste de blocages accessible, options de divulgation,
  cases d'approbation compréhensibles, contexte de mesure et note privée, aucun
  champ facultatif rendu obligatoire à la sauvegarde du brouillon.
- Test SSR : titres Contexte, Rôle, Périmètre, Décisions et Résultats, paragraphes
  autonomes, résultat qualitatif sans fausse mesure, services liés, liens
  externes seulement lorsqu'ils sont approuvés.
- Preuve HTTP fail-closed : chaque `/projets/*` du sitemap doit exister dans
  l'API publique et le hub, porter les cinq sections et au moins un service
  autorisé; aucune étude ou mesure non approuvée ne doit apparaître. Origine,
  redirections, délai et taille restent bornés comme les preuves existantes
  (`scripts/ops/verify-service-decision-content.sh:4-9,66-105`).
- Non-régression : sitemap, pages françaises uniquement, données structurées,
  accessibilité, typecheck, build, budgets et E2E public/admin.

## Risques à contrôler

1. **Auto-approbation historique :** un backfill à `approved` inventerait un
   consentement. Les valeurs nouvelles restent privées par défaut.
2. **Rollback qui republie :** l'activation SQL ne peut précéder l'installation
   et la preuve d'une image précédente qui comprend déjà les nouvelles portes.
3. **Édition en place :** modifier une étude publiée sans invalider son accord
   désolidariserait l'approbation du texte relu. La mutation doit être refusée.
4. **Audit trop bavard :** copier le nom client, la note de preuve ou les textes
   dans `audit_logs` dupliquerait des données sensibles. Seuls les champs
   modifiés et états d'approbation y figurent.
5. **Lien de service inventé :** la catégorie ne suffit pas. Antoine sélectionne
   une ou plusieurs routes dans une liste fermée.
6. **Résultat chiffré orphelin :** une valeur sans libellé, approbation ou note de
   preuve reste privée; le contexte de mesure est demandé et publié s'il existe.
7. **Anonymisation partielle :** le statut anonyme masque `client_label`, mais
   Antoine doit aussi vérifier manuellement titre, texte, images et URLs lors de
   la validation finale.
8. **Portée multilingue :** les libellés i18n existants ne rendent pas ces pages
   EN/DE. AQ-PROJ-002 à 004 restera nécessaire pour des études localisées.

## Conclusion

Le rendu actuel possède déjà une route SSR, un hub, un sitemap, un
`CreativeWork` et un RPC atomique. L'écart d'AQ-SEO-012 n'est donc pas la
création d'une nouvelle page, mais la preuve de ce qui peut y être publié. La
solution la plus sûre ajoute des champs explicites pour périmètre/décisions,
des portes de divulgation granulaires, une validation finale attribuable, un
choix humain des services et un filtre public fail-closed. La livraison doit
rester française, additive et en deux phases; aucun contenu historique ne doit
être considéré comme approuvé sans action d'Antoine.
