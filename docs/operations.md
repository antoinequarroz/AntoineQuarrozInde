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

### Livraison automatisée depuis GitHub

Une pull request ne déploie jamais : elle exécute uniquement les contrôles de
qualité et d'accessibilité. Après fusion dans `main`, le workflow suit cet ordre
strict :

1. tests, TypeScript, build, budgets et préflight PostgreSQL local ;
2. approbation humaine de l'environnement GitHub `Production` ;
3. détection, sauvegarde chiffrée et promotion des migrations en attente ;
4. déploiement du SHA exact sur le VPS avec `scripts/ops/deploy-from-ci.sh` ;
5. attente de ce même SHA sur `/api/version` et d'un `/api/health` vert ;
6. E2E de production avec les identifiants du compte sandbox.

Les exécutions planifiées et manuelles vérifient la production courante sans
redéployer. Sur un push `main`, les secrets de production ne deviennent
accessibles au runner qu'après l'approbation. Le job compare alors les migrations
locales avec `supabase_migrations.schema_migrations` et exécute un
`db push --dry-run`.

S'il n'existe aucune migration en attente, aucune sauvegarde ni mutation n'est
effectuée. Sinon, `scripts/ops/promote-supabase-migrations.sh` crée d'abord un
dump du schéma et des données `public`, l'archive et le chiffre avec `age`. Seuls
le fichier `.age`, sa somme SHA-256 et un manifeste sans secret sont conservés
30 jours comme artefact GitHub. Les fichiers SQL clairs et le profil Supabase
temporaire sont toujours supprimés.

Les migrations versionnées sont ensuite appliquées et l'historique est relu.
Le déploiement SSH du conteneur ne commence que si l'historique est aligné. Une
divergence, un dump incomplet, une migration en échec ou une post-vérification
incohérente bloque le nouveau conteneur et les E2E; l'application précédente
reste active.

Avant toute livraison, le job `database` construit une pile Supabase locale
éphémère, injecte `supabase/schema.sql` comme socle de test, rejoue toutes les
migrations puis exécute les assertions pgTAP de `supabase/tests/database/`.
Ce préflight n'utilise aucun secret, aucun projet lié et aucune donnée réelle.
Le lancer localement avec Docker actif :

```bash
npm run test:db
```

Un échec bloque le job `deploy`; ce préflight local n'applique jamais de
migration en production.

L'environnement GitHub `Production` est limité à la branche `main`, exige
Antoine comme reviewer et contient uniquement les secrets suivants :

- `VPS_SSH_PRIVATE_KEY` : clé Ed25519 dédiée à GitHub Actions ;
- `VPS_KNOWN_HOSTS` : ligne de clé d'hôte vérifiée, jamais produite à l'aveugle dans la CI ;
- `VPS_HOST` : adresse du VPS ;
- `VPS_USER` : utilisateur de déploiement non-root ;
- `VPS_PROJECT_DIR` : chemin absolu du dépôt sur le VPS.
- `SUPABASE_ACCESS_TOKEN` : jeton personnel Supabase utilisé par la CLI ;
- `SUPABASE_PROJECT_REF` : identifiant de 20 caractères du projet attendu ;
- `SUPABASE_DB_PASSWORD` : mot de passe PostgreSQL utilisé uniquement par la CLI ;
- `SUPABASE_BACKUP_AGE_RECIPIENT` : clé publique `age` dont la clé privée reste hors de GitHub et du VPS.

### Reprise après une migration

Il n'existe aucun rollback SQL automatique : plusieurs migrations peuvent être
validées avant qu'une suivante échoue, et tenter de les annuler peut supprimer
des données. Toute migration doit rester compatible avec l'image applicative
précédente; une suppression ou un renommage se livre en plusieurs phases.

En cas d'incident, télécharger l'artefact correspondant au SHA depuis GitHub,
vérifier sa somme puis le déchiffrer sur une machine de reprise isolée :

```bash
sha256sum -c supabase-pre-migration-<sha>.tar.gz.age.sha256
age --decrypt --identity /chemin/hors-ligne/aq-production.agekey \
  --output supabase-pre-migration.tar.gz \
  supabase-pre-migration-<sha>.tar.gz.age
```

Tester d'abord le dump dans un projet Supabase temporaire. Une restauration de
production reste une opération manuelle explicitement approuvée; ne jamais
utiliser `migration repair` ou `db reset --linked` comme rollback automatique.

La clé personnelle utilisée par `scripts/deploy-vps.ps1` reste distincte. La clé
CI est installée dans `authorized_keys` avec `restrict` et une commande forcée
copiée depuis `scripts/ops/ci-ssh-gate.sh`. Installer aussi
`scripts/ops/deploy-from-ci.sh` hors du checkout comme
`/home/ubuntu/.local/bin/antoinequarroz-ci-deploy`. Cette clé ne peut ouvrir aucun
shell, faire de redirection de port ou exécuter un script fourni par le runner :
elle ne lance que cette commande de livraison fixe. Pour révoquer l'automatisation,
supprimer la clé publique GitHub Actions du fichier
`~/.ssh/authorized_keys`, puis supprimer ou désactiver les secrets de
l'environnement `Production`. Le déploiement manuel reste disponible pendant
le rollback. Un échec de build, de santé ou de version empêche les E2E et le
script VPS remet automatiquement l'image `previous` en service lorsque le
conteneur candidat a été lancé.

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

## Relances commerciales automatiques

Le timer `antoinequarroz-pipeline-reminders.timer` vérifie les échéances chaque
jour ouvrable à 08:15, heure de Zurich. Les e-mails ne partent qu’aux jalons
prévus : J−3 et jour J pour un devis, J−2 et jour J pour une facture, puis
J+3, J+7, J+14, J+21 et J+28 en cas de retard. Chaque jalon dispose d’une clé
anti-doublon conservée dans le journal d’audit.

Créer un secret aléatoire dans le `.env` du VPS :

```dotenv
PIPELINE_AUTOMATION_SECRET=une-valeur-aleatoire-longue
```

Contrôler le timer ou lancer une vérification manuelle :

```bash
sudo systemctl status antoinequarroz-pipeline-reminders.timer
sudo systemctl start antoinequarroz-pipeline-reminders.service
sudo journalctl -u antoinequarroz-pipeline-reminders.service -n 100
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
