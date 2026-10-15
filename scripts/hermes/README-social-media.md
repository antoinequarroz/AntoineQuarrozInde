# Images et carrousels après validation (ANT-29)

La page `/admin/social` autorise explicitement la version du texte et des médias à publier au prochain passage de Hermes ou à partir de 18 h Europe/Zurich. Une relecture manuelle existante ne programme aucun envoi. Toute modification nécessite un nouvel accord.

Le serveur stocke `publication_mode=automatic`, `approved_version` et une empreinte du texte, de la destination et des médias ordonnés. La RPC d’approbation et la prise en charge vérifient l’organisation et la version. Le publieur compare l’empreinte avant puis après la prise : un seul passage peut effectuer l’envoi.

## Connexions privées

- LinkedIn : `LINKEDIN_ACCESS_TOKEN` et `LINKEDIN_PERSON_URN`, existants dans le processus Hermes. Une image utilise `content.media`, plusieurs utilisent `content.multiImage` ; les PDF existants sont conservés.
- X : les quatre clés OAuth1 existantes, avec le plafond `HERMES_X_MAX_USD_PER_POST` existant. Jusqu’à quatre images, descriptions alternatives incluses. La limite de coût n’est pas relevée par cette évolution.
- Instagram : connexion Treg `instagram-antoinequarroz` pour `@antoinequarroz.dev` uniquement. Droits exacts `instagram_business_basic`, `instagram_business_manage_insights`, `instagram_business_content_publish`. Configuration privée via `TREG_CONFIG`, ou `/data/treg-readonly/private/connection.json` si présent. Aucun secret n’est ajouté au site. Chaque appel de cette connexion exige un reçu Treg de coût nul ; le budget de recherche reste indépendant.

Instagram nécessite des JPEG. Les dimensions, le poids et les proportions sont contrôlés avant la prise en charge. Les enfants du carrousel sont préparés dans l’ordre, puis un seul appel final publie le conteneur parent.

## Échecs et déploiement

Un média invalide ou inaccessible reste approuvé en attente, avec son blocage visible et sans appel de publication. Une connexion indisponible reste bloquée. Après un envoi final ambigu, aucune reprise automatique n’est effectuée : vérifier le réseau avant un nouvel accord manuel. Un identifiant Instagram confirmé est enregistré comme publié même si la récupération du lien public échoue.

Installer le nouveau `publish_social.py` sur le runner Hermes **avant** le site qui admet les publications avec images. Le nouveau runner refuse les anciennes réponses dépourvues d’empreinte ; il ne peut pas publier seulement le texte par défaut. Installer aussi le lecteur Instagram compatible avec le droit additionnel pour préserver les statistiques, tout en conservant ses appels GET uniquement.

Recette : transports simulés et base isolée, puis diagnostic des connexions sans publication publique. Aucun brouillon réel n’est validé par la livraison technique.
