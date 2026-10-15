# Instagram dans le site privé

Le collecteur `instagram_readonly.py` déjà installé dans Hermes/Postmelo reste la source. Il vérifie le compte `@antoinequarroz.dev`, ses deux permissions de lecture et les reçus Treg à coût nul. Le plafond de recherche Treg de 1 USD/semaine ne change pas.

`sync_instagram_studio.py` lit l’API native privée du studio sur `127.0.0.1:3108`, puis transmet le relevé et les identifiants/captions des brouillons au conteneur du site via l’alias SSH `antoine-vps`. Le jeton du site est lu uniquement dans l’environnement de `antoinequarroz-web`. Aucun secret Treg n’est transmis au site.

Enregistrer cette commande comme serveur Portly sans port, dans le checkout livré :

```
python3 scripts/hermes/sync_instagram_studio.py --watch
```

La boucle détecte les changements toutes les 60 secondes ; le collecteur conserve son cache d’une heure. Elle n’envoie rien à Instagram. Le site conserve la dernière observation lorsque le Mac, le studio ou SSH est indisponible et signale un relevé ancien après trois heures. Les erreurs brutes des fournisseurs ne sont jamais transmises.

La route `/api/hermes/instagram-sync` utilise l’authentification Hermes existante et l’organisation configurée côté serveur. Les conflits sur un identifiant de brouillon sont ignorés : une réédition dans le studio ne remplace pas un texte corrigé ou validé sur le site. Un texte validé ici reste à publier manuellement avec la vidéo dans le studio. Instagram est exclu de la RPC et du processeur d’envoi LinkedIn/X.

Les pages `/admin/social` et `/admin/analytics` exigent l’accès administrateur/MFA. Instagram affiche une période de 14 jours complets Europe/Zurich. PostHog affiche séparément les visiteurs/pages vues sur 30 jours pour Instagram, LinkedIn et X. Les statistiques natives LinkedIn/X nécessitent encore un accès dédié.
