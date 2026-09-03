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

1. tests, TypeScript, build et budgets ;
2. déploiement du SHA exact sur le VPS avec `scripts/ops/deploy-from-ci.sh` ;
3. attente de ce même SHA sur `/api/version` et d'un `/api/health` vert ;
4. vérification que l'apex redirige définitivement vers `www` en conservant l'URI ;
5. E2E de production avec les identifiants du compte sandbox.

Les exécutions planifiées et manuelles vérifient la production courante sans
redéployer. Les migrations Supabase ne sont volontairement pas automatiques :
elles doivent être revues et appliquées avant la livraison du code qui en dépend.

Avant toute livraison, le job `database` construit une pile Supabase locale
éphémère, injecte `supabase/schema.sql` comme socle de test, rejoue toutes les
migrations puis exécute les assertions pgTAP de `supabase/tests/database/`.
Ce préflight n'utilise aucun secret, aucun projet lié et aucune donnée réelle.
Le lancer localement avec Docker actif :

```bash
npm run test:db
```

Un échec bloque le job `deploy`; il n'applique jamais la migration en production.

L'environnement GitHub `Production` contient uniquement les secrets suivants :

- `VPS_SSH_PRIVATE_KEY` : clé Ed25519 dédiée à GitHub Actions ;
- `VPS_KNOWN_HOSTS` : ligne de clé d'hôte vérifiée, jamais produite à l'aveugle dans la CI ;
- `VPS_HOST` : adresse du VPS ;
- `VPS_USER` : utilisateur de déploiement non-root ;
- `VPS_PROJECT_DIR` : chemin absolu du dépôt sur le VPS.

La clé personnelle utilisée par `scripts/deploy-vps.ps1` reste distincte. La clé
CI est installée dans `authorized_keys` avec `restrict` et une commande forcée
copiée depuis `scripts/ops/ci-ssh-gate.sh`. Installer aussi
`scripts/ops/deploy-from-ci.sh` hors du checkout comme
`/home/ubuntu/.local/bin/antoinequarroz-ci-deploy`. Cette clé ne peut ouvrir aucun
shell, faire de redirection de port ou exécuter un script fourni par le runner :
elle ne lance que cette commande de livraison fixe. Pour révoquer l'automatisation,
supprimer la clé publique GitHub Actions du fichier
`~/.ssh/authorized_keys`, puis supprimer ou désactiver les cinq secrets de
l'environnement `Production`. Le déploiement manuel reste disponible pendant
le rollback. Un échec de build, de santé ou de version empêche les E2E et le
script VPS remet automatiquement l'image `previous` en service lorsque le
conteneur candidat a été lancé.

### Domaine canonique et Caddy

Le domaine public préféré est `https://www.antoinequarroz.ch`. Caddy redirige
les requêtes reçues sur `https://antoinequarroz.ch` vers `www` avec un statut
permanent, en conservant le chemin et les paramètres. Pendant une release,
`scripts/ops/deploy-release.sh` valide le `Caddyfile` avant le build puis recrée
le conteneur Caddy après le retour au vert du conteneur web. Cette recréation est
nécessaire pour rafraîchir le montage du fichier lorsqu'un checkout Git remplace
son inode ; Caddy recharge ensuite explicitement la configuration validée.

La CI contrôle ensuite la redirection et la disponibilité de la destination :

```bash
bash scripts/ops/verify-domain-canonicalization.sh \
  https://antoinequarroz.ch \
  https://www.antoinequarroz.ch
```

Pour contrôler manuellement la conservation de l'URI sans suivre la redirection :

```bash
curl -sS -o /dev/null -D - \
  'https://antoinequarroz.ch/verification?utm_source=manual'
```

En cas de régression de routage, restaurer le `Caddyfile` de la release précédente,
le valider, puis le recharger dans le conteneur actif :

```bash
docker compose run --rm --no-deps caddy caddy validate \
  --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose up -d --no-deps --force-recreate caddy
docker compose exec -T caddy caddy reload \
  --config /etc/caddy/Caddyfile --adapter caddyfile
```

La validation précède toujours la recréation : une configuration invalide n'est
donc pas activée.
Le rollback d'image web reste indépendant et continue d'utiliser le tag `previous`.

### Non-indexation des surfaces privées

Nuxt ajoute `X-Robots-Tag: noindex, nofollow` aux réponses de `/admin`,
`/admin/**`, `/portal`, `/portal/**` et `/offline`. Cette directive demande aux
moteurs de recherche de ne pas indexer ces pages ni suivre leurs liens. Elle ne
constitue jamais une protection d'accès : les middlewares, contrôles API et
politiques de base de données restent responsables de la sécurité.

Après une livraison, contrôler anonymement les pages représentatives :

```bash
bash scripts/ops/verify-private-noindex.sh \
  https://www.antoinequarroz.ch
```

Le contrôle accepte les statuts HTTP applicatifs de `2xx` à `4xx`, mais échoue
si une réponse ne contient pas à la fois `noindex` et `nofollow`, si l'origine
n'est pas une URL HTTP(S) sûre ou si le serveur est indisponible. Il n'utilise
aucun identifiant et n'affiche aucun secret.

En cas de régression, revenir à l'image `antoinequarroz-web:previous`. Pour un
rollback de code durable, restaurer la version précédente de `nuxt.config.ts`,
reconstruire l'image et rejouer la commande de contrôle ci-dessus.

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
