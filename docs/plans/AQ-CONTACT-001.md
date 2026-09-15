---
ticket: AQ-CONTACT-001
linear: ANT-21
validated: yes
---

# AQ-CONTACT-001 — Fiabiliser le formulaire de contact et la prise de rendez-vous

## Plan ordonné

- [x] **1. Rendre le parcours contact progressif et accessible.** Objectif :
  proposer deux chemins clairs, « Réserver une visio » et « Travailler avec
  moi », puis afficher un formulaire court dont les précisions projet sont
  repliées par défaut. Fichiers attendus :
  `app/components/sections/ContactSection.vue`,
  `app/components/ui/BookingCalendar.vue`, `i18n/locales/fr.json`,
  `i18n/locales/en.json`, `i18n/locales/de.json`. Autorisé : nom, e-mail et
  message dans le chemin principal; sujet, budget et délai sous un bouton
  accessible; scroll et focus programmatiques après CTA/fallback. Interdit :
  masquer un champ obligatoire, modal bloquante, nouvelle librairie UI ou
  changement général du design de la landing page. Tests : traductions, état
  replié/ouvert, `aria-expanded`, `aria-controls`, focus, validation native,
  320 px et réduction des mouvements. Validation : Vitest ciblé et scénario
  navigateur public via Portly. Sécurité/rollback : aucun stockage nouveau côté
  client hormis l'identifiant de la soumission courante; retour possible au
  rendu toujours ouvert.

- [x] **2. Fermer et tester le contrat public de soumission.** Objectif :
  transmettre sujet, budget et délai comme champs facultatifs structurés,
  conserver le message séparé et faire appliquer exactement les mêmes règles
  par le client et le serveur. Fichiers attendus :
  `app/components/sections/ContactSection.vue`, un utilitaire serveur de payload
  si nécessaire, `server/api/contact.post.ts` et tests Vitest dédiés. Autorisé :
  listes fermées pour budget/délai, sujet par défaut localisé côté serveur,
  UUID de soumission et erreurs utilisateur génériques corrélables. Interdit :
  `organization_id` client, contenu HTML client, champ libre non borné,
  exposition d'erreur fournisseur ou augmentation des limites existantes.
  Tests : minimum valide, valeurs absentes, enums invalides, longueurs, e-mail,
  honeypot, temps minimal, Turnstile, body limit et échappement. Validation :
  Vitest ciblé via Portly. Sécurité/rollback : conserver rate limit, anti-bot,
  attribution et bornes; rollback applicatif compatible avec les colonnes
  additives de l'étape suivante.

- [x] **3. Réserver atomiquement chaque contact et chaque notification.**
  Objectif : garantir qu'un rejeu concurrent du même UUID ne crée qu'un
  `contact_message`, ne crée/récupère le prospect qu'une fois et utilise une clé
  Lumail stable. Fichiers attendus : nouvelle migration append-only sous
  `supabase/migrations/`, `supabase/schema.sql`, test pgTAP, types/utilitaires de
  livraison, `server/api/contact.post.ts`. Autorisé : colonnes nullable pour les
  lignes historiques, index unique partiel, fonction RPC réservée au
  `service_role`, extension fermée du modèle `contact_notification` et de
  l'entité `contact_message`. Interdit : suppression/déduplication automatique
  de données existantes, accès `anon`/`authenticated`, transaction distribuée
  implicite ou renvoi automatique d'un timeout ambigu. Tests : replay de
  migration, deux réservations simultanées, isolation tenant, grants/RLS,
  succès, rejet et timeout incertain. Validation : `npm run test:db` et Vitest
  ciblé via Portly. Sécurité/rollback : migration additive; l'ancien code ignore
  les nouvelles colonnes, et le rollback d'image ne nécessite aucune perte de
  donnée.

- [x] **4. Fiabiliser Lumail et la configuration de production.** Objectif :
  supprimer tout faux succès, valider destinataire/expéditeur, envoyer vers
  `info@antoinequarroz.ch` avec `replyTo` prospect, puis conserver l'identifiant
  et le statut fournisseur dans le registre sans le corps du message. Fichiers
  attendus : `server/utils/emailTransport.ts`,
  `server/utils/emailDelivery.ts`, `server/api/contact.post.ts`,
  `server/api/admin/emails/retry.post.ts`, `docker-compose.yml`, `.env.example`,
  `docs/operations.md` et tests e-mail/runtime. Autorisé : simulation explicite
  uniquement en développement/test, codes d'erreur fermés, reprise admin d'un
  échec confirmé depuis le `contact_message` tenant-safe. Interdit : succès de
  production sans fournisseur, destinataire vide, secret dans le client/log,
  erreur Lumail brute ou relance d'un état `uncertain`. Tests : clé absente,
  adresse vide/invalide, destinataire attendu, `replyTo`, fournisseur accepté,
  rejet, timeout, reprise contrôlée et repli Compose. Validation : Vitest ciblé
  et test de configuration Docker via Portly. Sécurité/rollback : aucun secret
  versionné; rollback sur l'image précédente et conservation des statuts pour
  investigation.

- [x] **5. Mesurer et prouver le parcours complet.** Objectif : ajouter les
  événements d'ouverture manquants, vérifier que l'analytics ne bloque jamais
  le contact et fournir les preuves avant livraison. Fichiers attendus :
  `server/utils/marketingEvents.ts`, tests marketing/mobile, E2E public et
  documentation de livraison ANT-21. Autorisé : événements fermés
  `contact_form_open` et `contact_details_open` sans donnée personnelle;
  interception d'analytics en échec. Interdit : nom, e-mail, message, budget,
  délai, URL complète ou identifiant de soumission dans les événements.
  Tests : CTA, calendrier valide, fallback, détails, succès/échec, FR/EN/DE,
  clavier, 320 px et analytics bloqué. Validation : tests ciblés, suite Vitest
  complète, typecheck, build, budgets, base éphémère, E2E public et
  `git diff --check`, tous via Portly. Sécurité/rollback : aucune PII analytique;
  les conversions restent fonctionnelles si Plausible ou l'API marketing est
  indisponible.

- [x] **6. Intégrer la réservation Cal.com directement dans la carte.** Objectif :
  ouvrir l'événement public de 30 minutes dans un sélecteur embarqué, conserver
  l'URL Cal.com comme repli sans JavaScript et expliquer que le lien de visio est
  créé automatiquement. Fichiers attendus : `BookingCalendar.vue`,
  `nuxt.config.ts`, `.env.example`, CSP Caddy, tests de sécurité et mobile.
  Autorisé : script officiel `app.cal.com`, frame `cal.com`, URL publique de
  l'événement et traductions locales dans le composant. Interdit : exposer une
  clé API Cal.com, créer un calendrier propriétaire ou transmettre des données
  de formulaire à Cal.com avant un clic explicite. Tests : configuration sans
  ancien nom de variable, attributs d'embed, URL de repli, CSP exacte,
  typecheck et parcours navigateur. Validation : Vitest, typecheck, build et
  ouverture visible du calendrier en local. Sécurité/rollback : domaines CSP
  bornés; suppression des attributs d'embed restaure l'ouverture externe.

## Correspondance critères → tâches

| Critère ANT-21 | Tâches |
| --- | --- |
| CTA « Travailler avec moi » et parcours progressif | 1, 5 |
| Nom/e-mail obligatoires; sujet, budget et délai facultatifs | 1, 2 |
| Règles client/serveur identiques | 2 |
| Message, prospect et notification sans doublon | 2, 3, 4 |
| Lumail vers `info@antoinequarroz.ch`, `replyTo`, aucun faux succès | 4, 5 |
| Réservation Cal.com intégrée ou fallback focalisé | 1, 5, 6 |
| FR/EN/DE, clavier, lecteur d'écran et 320 px | 1, 5 |
| Analytics sans donnée personnelle | 5 |
| Turnstile, honeypot, limites, rate limit et isolation | 2 à 5 |

## Base de branche et dépendances

- Créer une branche dédiée `codex/ant-21-contact-booking` depuis la base de
  livraison validée. Ne pas ajouter ANT-21 à la PR ANT-5 actuellement ouverte.
- Dépendances runtime : Lumail configuré, organisation publique résoluble et
  URL publique Cal.com. Aucun nouveau paquet n'est prévu.
- Une migration Supabase additive est requise pour l'idempotence durable et le
  suivi de la notification.

## Hors périmètre

- Calendrier propriétaire, synchronisation bidirectionnelle Cal.com, relances
  marketing automatiques ou refonte globale du CRM.
- Garantie de placement en boîte de réception après acceptation Lumail.
- Changement de l'adresse `info@antoinequarroz.ch` sans nouvelle validation
  humaine.

## Validation humaine requise

Plan validé explicitement par Antoine le 15 septembre 2026 (« go »), puis étendu
à sa demande avant fusion pour intégrer directement le calendrier. Le
déploiement en production a été autorisé, mais reste bloqué jusqu'à la nouvelle
validation locale et aux portes GitHub vertes.
