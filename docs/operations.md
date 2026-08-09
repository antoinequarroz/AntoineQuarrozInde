# Exploitation et reprise après incident

## Déploiement et retour arrière

`scripts/deploy-vps.ps1` met à jour le dépôt puis délègue la mise en ligne à
`scripts/ops/deploy-release.sh`. Avant de remplacer le conteneur, l'image active
est conservée sous le tag `antoinequarroz-web:previous`. La nouvelle image est
construite sous le tag `candidate` avec le hash Git et l'heure de construction.

Le script attend ensuite que le contrôle Docker soit `healthy`. Si la
construction, le démarrage ou le contrôle échoue, l'image `previous` est remise
en service automatiquement. Le dépôt peut rester sur le nouveau commit : c'est
l'image immuable précédente qui assure le retour arrière.

La version réellement exécutée est consultable sans cache :

```bash
curl https://www.antoinequarroz.ch/api/version
```

Le résultat contient `version`, `builtAt` et `environment`. Après un incident,
vérifier aussi les journaux du conteneur :

```bash
docker compose logs --tail=100 web
```

## Surveillance

`/api/health` contrôle le serveur Nuxt et l'accès à Supabase. Le timer
`antoinequarroz-monitor.timer` l'appelle toutes les cinq minutes et vérifie que
les services Docker `web` et `caddy` tournent. Une alerte est envoyée après
trois échecs consécutifs, puis une notification de rétablissement.
Le contrôle surveille aussi l'espace disque et l'âge de la dernière sauvegarde.
Les seuils sont configurables avec `MAX_DISK_USAGE_PERCENT` (85 par défaut) et
`MAX_BACKUP_AGE_HOURS` (36 heures par défaut). Le certificat TLS est contrôlé
21 jours avant son expiration, seuil modifiable avec `MONITOR_TLS_WARN_DAYS`.

L'adresse destinataire est `MONITORING_ALERT_EMAIL` dans `.env`, avec
`CONTACT_EMAIL` comme repli. L'envoi utilise `RESEND_API_KEY`.

Commandes utiles sur le VPS :

```bash
sudo systemctl status antoinequarroz-monitor.timer
sudo systemctl start antoinequarroz-monitor.service
sudo journalctl -u antoinequarroz-monitor.service -n 100
sudo scripts/ops/monitor.sh /home/ubuntu/antoinequarroz-vitrine --test-alert
```

## Sauvegardes

`antoinequarroz-backup.timer` crée chaque nuit une archive contenant les tables
métier, l'index des médias et les fichiers du bucket `media/uploads`. Elle est
gardée 14 jours dans `/var/backups/antoinequarroz` et copiée dans le bucket
Supabase privé `backups`. Les archives distantes de plus de 14 jours sont aussi
supprimées.

### Copie indépendante et chiffrée

Le bucket Supabase protège déjà contre la perte du VPS, mais il reste chez le
même fournisseur que la base. Pour une vraie copie indépendante, configurer un
remote `rclone` vers Cloudflare R2, S3 ou Backblaze B2 sur le VPS, puis ajouter :

```env
OFFSITE_RCLONE_REMOTE=aq-r2:antoinequarroz-backups/prod
OFFSITE_AGE_RECIPIENT=age1...
OFFSITE_KEEP_DAYS=30
REQUIRE_OFFSITE_BACKUP=true
```

La sauvegarde est chiffrée avec `age` avant son transfert. La clé privée `age`
doit être conservée hors du VPS (gestionnaire de mots de passe et copie froide).
Le moniteur vérifie alors qu'une copie indépendante a moins de 36 heures.
Chaque archive est vérifiée avant son envoi et accompagnée d'une somme SHA-256.
Les copies chiffrées hors site sont conservées 30 jours par défaut.

La structure SQL est reconstruite à partir des migrations versionnées dans Git.
Les utilisateurs Supabase Auth ne sont pas exportés par cette sauvegarde métier ;
le compte administrateur devra être recréé depuis Supabase en cas de perte totale
du projet.

Vérifier une archive sans modifier la production :

```bash
sudo scripts/ops/verify-backup.sh /var/backups/antoinequarroz/aq-supabase-YYYYMMDDTHHMMSSZ.tar.gz
```

## Installation

Après un déploiement du code :

```bash
sudo scripts/ops/install-ops.sh /home/ubuntu/antoinequarroz-vitrine
```

## Exercice de reprise

Le contrôle de reprise en lecture seule vérifie l'archive, ses fichiers JSON,
les relations clients et la présence du schéma versionné :

```bash
sudo scripts/ops/restore-drill.sh /var/backups/antoinequarroz/aq-supabase-YYYYMMDDTHHMMSSZ.tar.gz /home/ubuntu/antoinequarroz-vitrine
```

Pour tester toute la chaîne depuis Cloudflare R2, copier temporairement la clé
privée `age` sur une machine de reprise, puis exécuter :

```bash
sudo scripts/ops/restore-offsite-drill.sh \
  aq-r2:antoinequarroz-backups-prod/prod \
  /chemin/securise/antoinequarroz_backup_age_key.txt \
  /home/ubuntu/antoinequarroz-vitrine
```

Ce test ne modifie jamais la production. Un basculement complet doit être testé
dans une branche Supabase ou un projet temporaire avant toute restauration sur
le projet principal.

## Tests E2E

Les identifiants Playwright sont conservés localement dans `.env.e2e`, ignoré
par Git. Le compte de production dédié doit être membre `manager` uniquement
dans l'organisation isolée `aq-e2e-sandbox`. Le test crée son parcours métier
dans cette organisation puis supprime toutes les données temporaires.

```dotenv
E2E_BASE_URL=https://www.antoinequarroz.ch
E2E_ADMIN_EMAIL=e2e-admin@antoinequarroz.ch
E2E_ADMIN_PASSWORD=...
```

Lancer le parcours public et administrateur :

```bash
npm run test:e2e
```

## Google Places

Les avis réels nécessitent ces deux variables dans `.env`, puis une reconstruction
du conteneur :

```dotenv
GOOGLE_PLACES_API_KEY=...
GOOGLE_PLACE_ID=...
```

La clé Google doit être restreinte à l'API Places et, si possible, aux adresses IP
du VPS. Ne jamais la versionner dans Git.
