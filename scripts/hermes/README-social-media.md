# Images et carrousels après validation (ANT-29)

La page `/admin/social` autorise explicitement la version du texte et des médias à publier au prochain passage de Hermes ou à partir de 18 h Europe/Zurich. Une relecture manuelle existante ne programme aucun envoi. Toute modification nécessite un nouvel accord.

Le serveur stocke `publication_mode=automatic`, `approved_version` et une empreinte du texte, de la destination et des médias ordonnés. La RPC d’approbation et la prise en charge vérifient l’organisation et la version. Le publieur compare l’empreinte avant puis après la prise : un seul passage peut effectuer l’envoi.

## Connexions privées

- LinkedIn : `LINKEDIN_ACCESS_TOKEN` et `LINKEDIN_PERSON_URN`, existants dans le processus Hermes. Une image utilise `content.media`, plusieurs utilisent `content.multiImage` ; les PDF existants sont conservés.
- X : les quatre clés OAuth1 existantes, avec le plafond `HERMES_X_MAX_USD_PER_POST` existant. Jusqu’à quatre images, descriptions alternatives incluses. La limite de coût n’est pas relevée par cette évolution.
- Instagram : connexion Treg `instagram-antoinequarroz` pour `@antoinequarroz.dev` uniquement. Droits exacts `instagram_business_basic`, `instagram_business_manage_insights`, `instagram_business_content_publish`. Configuration privée via `TREG_CONFIG`, ou `/data/treg-readonly/private/connection.json` si présent. Aucun secret n’est ajouté au site. Chaque appel de cette connexion exige un reçu Treg de coût nul ; le budget de recherche reste indépendant.

Instagram nécessite des JPEG. Les dimensions, le poids et les proportions sont contrôlés avant la prise en charge. Les enfants du carrousel sont préparés dans l’ordre, puis un seul appel final publie le conteneur parent.

## Carrousels mixtes Instagram (ANT-30)

`media_items` contient de 2 à 10 éléments ordonnés `{type: "image" | "video", url, alt}` pour Instagram uniquement. Ce champ est exclusif avec `media_images` et les champs de document PDF. Les publications LinkedIn et X conservent leur transport existant. Les images du carrousel mixte sont des JPEG de 5 Mio maximum ; les vidéos sont des MP4 de 20 Mio maximum, H.264/yuv420p, de 3 à 60 secondes et de 23 à 60 images/s, sans son ou avec une piste AAC mono/stéréo jusqu’à 48 kHz. Les vidéos ont une largeur de 320 à 1920 px et aucune dimension ne dépasse 1920 px. Tous les éléments partagent le même ratio, compris entre 4:5 et 1,91:1, pour éviter un recadrage involontaire. Ces limites produit volontairement bornées couvrent le pilote PhysioBaur.

Le runner télécharge les JPEG depuis le site ou son stockage public approuvé, et les MP4 uniquement depuis le bucket dédié `social-videos/uploads/` de l’origine Supabase configurée, sans redirection ni paramètres privés. Il vérifie le MIME, la taille, les dimensions des JPEG et les métadonnées réelles des MP4 avec `ffprobe` **avant de réclamer le brouillon**. `ffprobe` est requis sur le runner : son absence bloque uniquement le média vidéo, sans envoi. L’analyse utilise un fichier temporaire local supprimé ensuite, avec un délai de 30 secondes et sans protocole réseau autorisé.

Le suffixe d’empreinte `instagram-mixed-v1` signe le nombre d’éléments puis leur type, URL et description dans l’ordre. L’empreinte des publications sans `media_items` reste inchangée. Le runner déclare sa capacité avec `X-Hermes-Social-Capabilities: instagram-mixed-v1` pour lire la file et réclamer un brouillon mixte ; un ancien runner ne doit jamais recevoir ni réclamer ces carrousels.

Un enfant vidéo utilise `media_type=VIDEO`, `video_url` et `is_carousel_item=true` ; il ne s’agit pas d’un Reel. Seules les images transmettent `alt_text`, tandis que les descriptions des vidéos restent visibles pour la validation sur le site. Les enfants sont préparés séquentiellement dans l’ordre approuvé. Pour une vidéo et le parent qui la contient, le runner attend `FINISHED`, avec au plus cinq minutes de traitement et une lecture par minute, avant de poursuivre. Un enfant en erreur ou toujours en traitement empêche toute publication du parent. Seul le parent donne lieu à un unique appel `media_publish`, jamais relancé automatiquement après un résultat ambigu.

Références primaires : [publication Instagram Meta](https://developers.facebook.com/docs/instagram-platform/content-publishing/), [référence du conteneur media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/), [proxy natif Treg](https://treg.to/docs). Le connecteur Treg et le contrôle de coût nul restent identiques ; le budget de recherche de 1 USD/semaine n’est pas modifié.

## Échecs et déploiement

Un média invalide ou inaccessible reste approuvé en attente, avec son blocage visible et sans appel de publication. Une connexion indisponible reste bloquée. Après un envoi final ambigu, aucune reprise automatique n’est effectuée : vérifier le réseau avant un nouvel accord manuel. Un identifiant Instagram confirmé est enregistré comme publié même si la récupération du lien public échoue.

Installer le nouveau `publish_social.py` sur le runner Hermes **avant** le site qui admet les publications avec images. Le nouveau runner refuse les anciennes réponses dépourvues d’empreinte ; il ne peut pas publier seulement le texte par défaut. Installer aussi le lecteur Instagram compatible avec le droit additionnel pour préserver les statistiques, tout en conservant ses appels GET uniquement.

Pour ANT-30, déployer également `ffprobe` et la version du runner qui déclare `instagram-mixed-v1` avant de permettre l’approbation des carrousels mixtes sur le site. Joindre des fichiers au brouillon ne constitue jamais une approbation de publication.

Recette : transports simulés et base isolée, puis diagnostic des connexions sans publication publique. Aucun brouillon réel n’est validé par la livraison technique.
