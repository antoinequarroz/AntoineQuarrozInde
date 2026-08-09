# Plausible Analytics

Le suivi public utilise `@plausible-analytics/tracker`. Les routes `/admin` et `/portal` sont exclues.

## Variables serveur

À ajouter uniquement dans l'environnement du VPS (jamais dans une variable `NUXT_PUBLIC_*`) :

```env
PLAUSIBLE_STATS_API_KEY=
PLAUSIBLE_SITE_ID=antoinequarroz.ch
```

La clé Stats API est facultative : le suivi des visites continue sans elle. Elle sert uniquement à afficher les statistiques agrégées dans `/admin/analytics`.

## Conversions

- `Contact Sent` : envoyé après une soumission réussie du formulaire public.
- `Form: Submission`, `File Download` et `Outbound Link: Click` : mesures automatiques du tracker.

Les paramètres UTM sont conservés côté serveur avec le message de contact et copiés sur la fiche du prospect lorsqu'elle est créée automatiquement.
