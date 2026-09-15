# Recherche AQ-CONTACT-001 — Fiabiliser le contact et la prise de rendez-vous

## Cadre du ticket

La story Linear `ANT-21` demande de réduire la friction du contact public,
d'afficher le budget indicatif et le délai cible seulement à la demande, de
fiabiliser la notification Lumail vers `info@antoinequarroz.ch` et de rendre la
prise de rendez-vous compréhensible et fonctionnelle en français, anglais et
allemand. La soumission doit rester protégée contre l'abus et un rejeu ne doit
créer ni message, ni prospect, ni notification en double.

Le propriétaire a confirmé le 15 septembre 2026 que les demandes apparaissent
bien dans le CRM, mais que la notification correspondante n'arrive pas dans sa
boîte mail. La persistance CRM n'est donc pas le symptôme à corriger; la preuve
doit cibler la configuration et la livraison Lumail.

Avant la fusion, la configuration locale a révélé qu'une clé API Cal.com avait
été placée par erreur dans l'ancienne variable publique destinée à une URL. La
clé n'est pas nécessaire à l'embed : l'événement public existant de 30 minutes
fournit une URL de réservation et une visio Cal.com. La configuration applicative
doit donc utiliser uniquement `NUXT_PUBLIC_BOOKING_URL`; l'ancienne variable ne
doit plus être lue ni documentée et la clé concernée doit être révoquée dans
Cal.com.

## Flux représentatif actuel

1. `ContactSection` rend immédiatement le nom, l'e-mail, le sujet, le budget,
   le délai et le message. Seuls le nom, l'e-mail et le message portent
   `required`; le budget et le délai sont déjà techniquement facultatifs mais
   visuellement présentés comme des étapes normales (`app/components/sections/ContactSection.vue:238-345`).
2. Le client remplace un sujet vide par `Nouveau projet`, concatène budget et
   délai au texte libre, puis affiche le succès uniquement si `/api/contact`
   répond sans erreur. Le bouton est neutralisé pendant la requête, mais aucun
   identifiant stable n'accompagne un rejeu réseau (`app/components/sections/ContactSection.vue:112-164`).
3. L'API borne le body, limite cinq requêtes par minute et par IP, valide les
   longueurs, l'e-mail, le honeypot, le temps minimal et Turnstile lorsqu'il est
   configuré (`server/api/contact.post.ts:1-83`).
4. Lorsque Lumail n'est pas configuré, l'API retourne actuellement
   `{ success: true }` avant l'enregistrement du message, y compris sans garde
   explicite réservée au développement. Ce chemin produit donc un faux succès
   possible en production (`server/api/contact.post.ts:85-90`).
5. Lorsque Lumail est configuré, l'API insère `contact_messages`, recherche le
   prospect par e-mail dans l'organisation et le crée s'il est absent. Les
   erreurs de persistance ou de création du prospect sont seulement journalisées
   et n'interrompent pas forcément la réponse (`server/api/contact.post.ts:92-193`).
6. La notification est envoyée directement par `sendAppEmail` vers
   `config.contactEmail`, avec l'e-mail du prospect en `replyTo`. La clé
   d'idempotence contient `Date.now()`, donc chaque rejeu reçoit une nouvelle
   clé (`server/api/contact.post.ts:195-215`).
7. Le transport Lumail refuse une clé absente et remonte un rejet du fournisseur,
   mais il ne valide pas lui-même que le destinataire est une adresse non vide
   (`server/utils/emailTransport.ts:21-43`).
8. Nuxt prévoit `info@antoinequarroz.ch` comme destinataire par défaut, tandis
   que Compose mappe `NUXT_CONTACT_EMAIL` sur `${CONTACT_EMAIL:-}`. Une variable
   opérateur absente ou vide peut donc écraser le repli applicatif par une chaîne
   vide au runtime (`nuxt.config.ts:201-205`, `docker-compose.yml:17-23`).
9. La carte de rendez-vous accepte seulement une URL HTTPS `cal.com`. Si elle
   manque ou paraît invalide, le CTA est un simple lien `#contact-form`; il ne
   révèle rien, ne déplace pas explicitement le focus et n'annonce pas le
   changement aux technologies d'assistance (`app/components/ui/BookingCalendar.vue:1-35,66-70`).
10. Les événements autorisés couvrent déjà clic calendrier, fallback, e-mail,
    succès et échec de soumission, mais pas l'ouverture du formulaire ni celle
    des détails facultatifs (`server/utils/marketingEvents.ts:1-23`).

## Conventions et intégrations à préserver

- Les messages publics utilisés par Nuxt proviennent de
  `i18n/locales/{fr,en,de}.json` via `i18n/i18n.config.ts`; les trois catalogues
  contiennent déjà les libellés de budget, délai et états du formulaire
  (`i18n/i18n.config.ts:1-11`, `i18n/locales/fr.json:195-235`).
- `captureLeadAttribution`, les événements marketing internes et Plausible sont
  volontairement non bloquants après une conversion réussie
  (`app/components/sections/ContactSection.vue:36,123-161`).
- Le registre `email_deliveries` fournit déjà statuts fermés, identifiant
  fournisseur et clé d'idempotence unique par organisation, mais il n'autorise
  que les modèles devis/facture/paiement et les entités correspondantes
  (`supabase/migrations/20260915072438_add_lumail_delivery_automation.sql:18-41`).
- Les tables sensibles restent accessibles au seul `service_role`; le endpoint
  public doit continuer à résoudre son organisation côté serveur et ne jamais
  accepter un `organization_id` fourni par le navigateur.
- Les commandes de test, build et aperçu doivent toutes être exécutées via
  Portly conformément à `AGENTS.md`.

## Écarts à fermer

| Critère ANT-21 | État vérifié | Écart |
| --- | --- | --- |
| Parcours progressif | Budget et délai visibles immédiatement | Ajouter un CTA clair et une divulgation accessible pour les détails facultatifs. |
| Champs facultatifs | Facultatifs dans le HTML, concaténés au message | Envoyer des valeurs structurées et ne pas afficher de faux contenu `-`. |
| Réception Lumail | Destinataire runtime non validé; faux succès si clé absente | Valider configuration et destinataire, supprimer le faux succès de production, conserver une preuve d'acceptation/échec. |
| Soumission unique | Double clic UI bloqué, rejeu réseau non idempotent | Introduire un identifiant de soumission stable et une réservation serveur atomique. |
| Prospect unique par soumission | Recherche puis création non atomiques | Seul le propriétaire de la réservation doit exécuter la création/récupération et l'envoi. |
| Rendez-vous | Cal.com ou ancre simple | Clarifier les deux chemins et assurer ouverture/focus du formulaire sur fallback. |
| FR/EN/DE et accessibilité | Contenu présent, détails codés dans la vue | Ajouter les nouveaux libellés aux catalogues et tester clavier, annonces et 320 px. |
| Mesure | Clics et résultat final seulement | Ajouter ouverture du formulaire et ouverture des détails à la liste fermée. |

## Direction d'implémentation

1. Conserver une seule section contact avec deux choix explicites : réserver une
   visio si Cal.com est valide, ou « Travailler avec moi » pour ouvrir et
   focaliser le formulaire.
2. Garder nom, e-mail et message dans le chemin principal. Présenter sujet,
   budget et délai comme précisions facultatives dans une divulgation pilotée
   par un vrai bouton avec `aria-expanded` et `aria-controls`.
3. Envoyer budget et délai comme champs fermés facultatifs. Le serveur valide
   leurs valeurs et compose le message e-mail; il ne doit plus faire confiance à
   une concaténation produite par le client.
4. Générer un UUID de soumission dans le navigateur et le conserver pour les
   nouvelles tentatives jusqu'au succès. Une migration append-only ajoute la
   réservation correspondante à `contact_messages`; une fonction serveur-only
   décide atomiquement quel appel peut créer le prospect et contacter Lumail.
5. Étendre le registre d'envoi existant à `contact_notification` afin de
   conserver l'état, l'identifiant fournisseur et la même clé d'idempotence sans
   stocker le corps du message. Une reprise automatique ambiguë reste interdite.
6. Valider `LUMAIL_API_KEY`, `EMAIL_FROM` et `CONTACT_EMAIL` avant toute
   soumission de production, corriger le repli Compose et ne retourner succès
   qu'après acceptation Lumail et enregistrement cohérent.
7. Charger l'embed officiel Cal.com seulement lorsqu'une URL publique valide est
   disponible. Un clic ouvre le calendrier embarqué; l'attribut `href` conserve
   une navigation directe si le script ne se charge pas. La CSP n'autorise que
   `app.cal.com` pour le script et `cal.com` pour la frame et les connexions.

## Tests, sécurité et exploitation

- Tests unitaires/API : payload minimal, détails absents/valides/invalides,
  destinataire vide, Lumail absent, rejet fournisseur, échappement HTML,
  `replyTo`, clé stable, double clic et rejeu concurrent.
- Tests base : migration rejouable, unicité de la réservation, fonction
  `service_role` uniquement, RLS/grants et aucun affaiblissement des relations
  tenant-safe.
- Tests UI/E2E : FR/EN/DE, ouverture CTA, divulgation facultative, ordre de
  focus, fallback Cal.com, succès/erreur, mobile 320 px, clavier et lecteur
  d'écran.
- Conserver la limite de body, le rate limit, le honeypot, le délai minimal,
  Turnstile, l'échappement et l'attribution existants.
- La preuve de production doit vérifier uniquement la présence non vide des
  variables, la santé applicative et une soumission de test contrôlée; aucune
  clé Lumail ni donnée personnelle ne doit apparaître dans Linear, les logs ou
  les artefacts.
- L'acceptation par Lumail ne garantit pas à elle seule le placement dans la
  boîte de réception. Après livraison, contrôler l'état fournisseur puis la
  réception réelle ou le dossier indésirable de `info@antoinequarroz.ch`.

## Risques et limites

- La branche courante porte encore `ANT-5`; l'implémentation d'`ANT-21` doit être
  isolée dans une branche dédiée à partir de la base de livraison convenue pour
  ne pas mélanger les deux PR.
- L'ajout de `contact_notification` au registre d'e-mails exige une migration
  additive et l'adaptation sûre de la reprise admin; aucun ancien envoi ne doit
  être modifié.
- Un timeout fournisseur reste ambigu. Le système doit l'indiquer comme tel et
  ne jamais renvoyer automatiquement une notification qui pourrait déjà avoir
  été acceptée.
- Le ticket ne crée pas un calendrier propriétaire et ne promet pas la
  délivrabilité finale d'un fournisseur tiers.
