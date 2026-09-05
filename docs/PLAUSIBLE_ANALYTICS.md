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

## Canaux d’acquisition

Le dashboard conserve la source CRM existante et ajoute une lecture agrégée par
canal : recherche organique, moteur génératif, accès direct, campagne identifiée
ou référent inconnu. Les listes de moteurs sont explicites et versionnées. Une
source inconnue n'est jamais classée comme trafic IA par défaut.

Les événements de conversion internes (formulaire, calendrier et e-mail)
transportent uniquement cette catégorie fermée. Le référent et les paramètres
UTM complets ne sont pas recopiés sur chaque clic. Si le stockage de session,
Plausible ou l'endpoint d'événements est bloqué, le lien ou le formulaire
continue normalement.

Exemples de contrôle : `utm_source=google` est organique,
`utm_source=chatgpt` est génératif, l'absence de source est directe et un
hostname non reconnu reste dans « référents inconnus ».
