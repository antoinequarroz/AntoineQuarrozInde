# PostHog Analytics

Le site public utilise le module Nuxt officiel `@posthog/nuxt` avec le projet
EU `281423`. Les routes `/admin` et `/portal` sont exclues.

## Confidentialité

- `cookieless_mode: 'always'` et mode serveur sans cookies activé dans PostHog ;
- `person_profiles: 'never'` ;
- aucun appel à `identify` ;
- autocapture, session replay, heatmaps, surveys et capture automatique d'exceptions désactivés ;
- les URL envoyées sont nettoyées de leurs paramètres de requête.
- les erreurs publiques envoient seulement leur type et le chemin sans query ;
- les événements CRM utilisent des identifiants SHA-256, sans nom, e-mail,
  téléphone, note ou contenu de message.

## Variables serveur

À ajouter uniquement dans l'environnement privé du VPS :

```env
POSTHOG_PERSONAL_API_KEY=phx_...
POSTHOG_PROJECT_ID=281423
POSTHOG_PROJECT_TOKEN=phc_...
POSTHOG_INGESTION_HOST=https://eu.i.posthog.com
```

La clé personnelle est limitée à `query:read` et au seul projet du site. Elle
sert à alimenter `/admin/analytics`; elle ne doit jamais être placée dans une
variable `NUXT_PUBLIC_*`.

Le project token `phc_...` est une clé publique d'ingestion. Le code fournit la
valeur de production par défaut et accepte aussi `NUXT_PUBLIC_POSTHOG_KEY` et
`NUXT_PUBLIC_POSTHOG_HOST` lors de la construction.

## Événements

- `$pageview` et `$pageleave` sur les pages publiques ;
- `contact_sent` après un formulaire de contact accepté ;
- `newsletter_subscribed` après une inscription newsletter acceptée ;
- `booking_clicked` et `booking_fallback_clicked` ;
- `booking_confirmed` après le signal de succès officiel de l'embed Cal.com ;
- `outbound_link_clicked` et `file_downloaded`.
- `crm_lead_created`, `client_won`, `quote_accepted` et `invoice_created` depuis
  les transitions CRM confirmées côté serveur ;
- `public_app_error`, limité à cinq événements par chargement et sans message ni
  stack potentiellement personnels.

Les montants de devis sont envoyés en centimes avec une devise fermée. Un
`$insert_id` stable évite les doublons lorsqu'une acceptation passe par le
portail puis par la conversion en facture.

Les paramètres UTM complets restent dans le mécanisme d'attribution interne et
le CRM. Ils ne sont pas recopiés dans les URL PostHog.
