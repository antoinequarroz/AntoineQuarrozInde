# AQ-CONTACT-001 — Revue de livraison ANT-21

## Périmètre revu

- Ticket Linear `ANT-21`, recherche `docs/research/AQ-CONTACT-001.md` et plan
  validé `docs/plans/AQ-CONTACT-001.md`.
- Branche isolée `codex/ant-21-contact-booking`, basée sur `origin/main` au
  commit `fe8c44bae90e65433de46a99458dd6bfecc515f8`.
- Parcours contact public, réservation/fallback, contrat de soumission,
  persistance CRM, idempotence, transport et suivi Lumail, reprise admin,
  migration Supabase, traductions, analytics et tests associés.

## Findings

Aucun finding critical, major ou minor ne reste ouvert dans l'état revu.

## Conformité fonctionnelle

- Le formulaire principal exige uniquement le nom, l'e-mail et le message. Le
  sujet, le budget et le délai sont regroupés dans une divulgation accessible,
  fermée par défaut, avec des valeurs structurées facultatives.
- Le CTA principal et le fallback de réservation ouvrent le formulaire,
  déplacent le focus vers le nom et conservent un parcours utilisable à 320 px
  et avec réduction des mouvements.
- La demande est persistée dans `contact_messages` avant la notification. Un
  UUID et un index unique partiel réservent la soumission; la livraison Lumail
  utilise ensuite une clé stable et ne renvoie jamais automatiquement un
  timeout ambigu.
- L'API ne retourne un succès neuf qu'après acceptation par Lumail. En cas
  d'échec, le message déjà enregistré reste visible dans le CRM et la
  notification confirmée `failed` peut être relancée depuis l'administration.
- Le destinataire de production revient explicitement à
  `info@antoinequarroz.ch` lorsque `CONTACT_EMAIL` n'est pas défini, et le
  prospect est transmis uniquement en `replyTo`.

## Sécurité observée

- Le body public reste borné à 48 KiB, le rate limit précède sa lecture et les
  contrôles de honeypot, temps minimal et Turnstile sont conservés.
- Le serveur ferme les longueurs, les formats, les langues, les budgets et les
  délais; le HTML de notification est échappé côté serveur.
- L'organisation est résolue côté serveur. Toutes les lectures et mutations de
  contact, client et livraison sont filtrées par `organization_id`; la relation
  contact-client est protégée par une clé étrangère composite tenant-safe.
- `contact_messages` et `email_deliveries` restent sans droit de lecture pour
  `anon` et `authenticated`. Aucun secret, corps d'e-mail, erreur fournisseur
  libre ou donnée personnelle n'est ajouté aux événements analytics.
- Seuls les états `failed` sont relançables; `pending`, `sent`, `suppressed` et
  `uncertain` restent fermés à la reprise. Le plafond existant de vingt
  tentatives est conservé.

## Vérifications exécutées

- `npm run test:db` via Portly : replay complet, lint SQL sans finding, 13
  fichiers pgTAP et 202 assertions réussis.
- `npm run typecheck` via Portly : succès.
- Tests ciblés via Portly : 8 fichiers et 32 assertions réussis.
- `npm test` via Portly avec le Python isolé du workspace : 103 fichiers et
  668 assertions réussis. Le premier lancement avec `/usr/bin/python3` a été
  bloqué uniquement par la licence Xcode locale; aucun test produit n'était en
  cause.
- `npm run build && npm run quality:budgets` via Portly : succès; 91 chunks,
  1 501 170 octets au total, plus gros chunk 199 657 octets, scène robot
  1 010 718 octets sous le plafond de 1 500 000.
- Playwright ciblé sur `http://127.0.0.1:3114` : CTA, focus et détails
  facultatifs à 320 px réussis.
- `git diff --check` : succès.

Max severity: none
Ship allowed: yes
