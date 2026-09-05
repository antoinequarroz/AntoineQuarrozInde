# Recherche AQ-SEO-015 — Attribution organique et générative

## Cadre du ticket

`AQ-SEO-015` demande de conserver la source autorisée jusqu'à la conversion, de
distinguer les référents connus de moteurs génératifs des moteurs classiques,
de laisser toute source inconnue non attribuée, et de préserver formulaires,
rendez-vous et autres conversions même si l'analytics est bloqué
(`docs/product/stories.md:299-318`). Le PRD interdit toute donnée personnelle
nouvelle non nécessaire (`docs/product/prd.md:126-127`).

## Flux représentatif actuel

1. `captureLeadAttribution` mémorise pendant la session la page d'arrivée, le
   hostname référent et cinq UTM; la première capture gagne
   (`app/utils/attribution.ts:1-44`). L'accès à `sessionStorage` n'est pas protégé
   contre un refus du navigateur.
2. Le formulaire transmet cette attribution avec la demande. L'échec du tracking
   interne ou Plausible est ignoré après la réussite de la demande, ce qui
   préserve la conversion (`app/components/sections/ContactSection.vue:1-15,64-106`).
3. Le serveur ferme et borne les champs connus, les stocke sur
   `contact_messages`, puis copie `utm_source`, sinon `referrer_host`, sinon
   `direct` sur le nouveau prospect CRM (`server/utils/leadAttribution.ts:1-21`,
   `server/api/contact.post.ts:103-140`).
4. Les clics de rendez-vous et de fallback émettent des événements internes,
   mais sans information d'acquisition (`app/components/ui/BookingCalendar.vue:68-70`).
5. `useMarketing.track` envoie événement, variante, chemin et metadata libre;
   l'API valide seulement le nom, la taille et quelques longueurs avant de
   stocker le JSON (`app/composables/useMarketing.ts:18-30`,
   `server/api/marketing-event.post.ts:12-30`).
6. Le dashboard regroupe les prospects par chaîne `acquisition_source`. Il ne
   possède aucune taxonomie organique/générative et ne lit pas la metadata des
   conversions (`server/utils/acquisitionAttribution.ts:37-132`,
   `server/api/admin/marketing-analytics.get.ts:5-57`).
7. Plausible suit les pages publiques et reçoit `Contact Sent` avec une source
   brute; les routes privées sont exclues
   (`app/plugins/plausible.client.ts:1-19`,
   `app/composables/usePlausibleEvent.ts:1-13`).
8. La page de confidentialité annonce déjà la conservation en session du
   référent et des paramètres de campagne pour l'attribution CRM
   (`app/pages/confidentialite.vue:9-15,24-28,35-41`).

## Écarts vérifiés

- Aucun classificateur partagé et testé ne distingue organique, moteur
  génératif, direct, autre campagne et référent inconnu.
- La valeur `direct` est utilisée seulement lors de la création d'un prospect;
  un référent inconnu est affiché comme hostname brut sans signaler qu'il n'a
  pas été classé.
- L'attribution est attachée au formulaire, mais pas aux clics de rendez-vous ou
  aux autres événements de conversion retenus.
- Le serveur accepte une metadata arbitraire de 2 Ko. Pour ce ticket, une
  catégorie fermée doit être recalculée ou validée et aucune chaîne référente ou
  campagne supplémentaire ne doit être ajoutée aux événements.
- Le dashboard ne permet pas de comparer organique et génératif, ni de séparer
  direct et inconnu, même si les valeurs brutes existent déjà dans le CRM.
- Un `sessionStorage` indisponible peut lever pendant l'initialisation du
  formulaire et menacer le parcours qu'il devrait seulement enrichir.

## Taxonomie cible

- `organic_search` : référent ou `utm_source` appartenant à une liste courte et
  versionnée de moteurs classiques connus.
- `generative_ai` : référent ou `utm_source` appartenant à une liste courte et
  versionnée de services génératifs connus.
- `direct` : aucun référent et aucun `utm_source` disponible.
- `campaign` : `utm_source` explicite non classé comme moteur.
- `unknown_referral` : référent présent mais absent des listes connues.

La classification privilégie `utm_source` explicite, conserve les champs bruts
existants pour l'audit CRM et ne déduit jamais « IA » à partir d'un texte libre,
d'une page visitée ou d'une absence de référent.

## Flux cible

1. Un utilitaire pur partagé normalise hostname/source et produit une catégorie
   fermée plus un libellé non personnel.
2. La capture de première touche reste limitée à la session et devient
   fail-open si le stockage est refusé.
3. Le formulaire transmet exactement les mêmes champs bruts. Le serveur les
   normalise, recalcule la catégorie et continue de créer le message/prospect.
4. Les événements internes de conversion transportent seulement la catégorie
   fermée; aucune nouvelle URL, requête, identifiant ou valeur UTM n'est ajoutée
   à `marketing_events`.
5. Le dashboard agrège les prospects et conversions par catégorie tout en
   conservant la vue source existante. Direct et inconnu restent distincts.
6. Toute panne Plausible, API marketing ou stockage navigateur reste silencieuse
   pour le parcours, tandis que le formulaire/rendez-vous continue.

## Tests, sécurité et limites

- Matrice obligatoire : Google organique, ChatGPT/Perplexity génératif, direct,
  référent inconnu et campagne explicite; casse, sous-domaines et faux suffixes.
- Tests fail-open de stockage refusé/corrompu et règle de première touche.
- Tests serveur : metadata fermée, valeur client non fiable refusée, taille
  bornée et aucune donnée supplémentaire.
- Tests agrégateur/dashboard : canaux distincts, conversions et CA, état vide.
- E2E : formulaire, rendez-vous et e-mail restent cliquables avec endpoints
  analytics bloqués; le contact aboutit avec la catégorie attendue sur fixture.
- Aucune migration n'est requise : les champs CRM existants et le JSON metadata
  existant suffisent (`supabase/schema.sql:115-135`,
  `supabase/migrations/20260809095015_marketing_attribution_project_cockpit.sql:1-14`).
- Les listes de fournisseurs changent dans le temps; elles sont volontairement
  explicites et révisables. Une source absente reste inconnue, jamais IA.
