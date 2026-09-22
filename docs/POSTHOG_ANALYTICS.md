# PostHog Analytics

Le site public utilise le module Nuxt officiel `@posthog/nuxt` avec le projet
EU `281423`. Les routes `/admin` et `/portal` sont exclues.

## Confidentialité

- `cookieless_mode: 'always'` et mode serveur sans cookies activé dans PostHog ;
- `person_profiles: 'never'` ;
- aucun appel à `identify` ;
- autocapture, session replay, heatmaps, surveys et capture d'exceptions désactivés ;
- les URL envoyées sont nettoyées de leurs paramètres de requête.

## Variables serveur

À ajouter uniquement dans l'environnement privé du VPS :

```env
POSTHOG_PERSONAL_API_KEY=phx_...
POSTHOG_PROJECT_ID=281423
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
- `outbound_link_clicked` et `file_downloaded`.

Les paramètres UTM complets restent dans le mécanisme d'attribution interne et
le CRM. Ils ne sont pas recopiés dans les URL PostHog.
