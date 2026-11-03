## En bref

Après une refonte, vérifiez où arrivent les visiteurs qui utilisent une ancienne adresse ou un lien de votre site. Une page introuvable, une arrivée sur le mauvais contenu et une succession de redirections demandent des corrections différentes. Le bon contrôle associe l’URL de départ, les étapes intermédiaires et la destination attendue.

Je propose de commencer par un petit inventaire des parcours importants, puis de conserver une preuve avant et après correction. Cette méthode aide à repérer des écarts ; elle ne prouve pas une perte de trafic ni un délai de retour dans Google.

## 1. Quelles adresses vérifier après la mise en ligne ?

Reprenez l’inventaire préparé avant la refonte, les liens du menu, les liens présents dans vos pages et les documents que vous partagez encore. Ajoutez les anciennes adresses figurant dans vos profils publics ou vos campagnes si vous en disposez. Le sitemap du nouveau site vous aide à retrouver les destinations prévues, sans constituer à lui seul un inventaire de tous les anciens liens.

Pour préparer ce travail, mon guide sur les [pages et contenus à conserver lors d’une refonte](/blog/refonte-site-quelles-pages-contenus-conserver) explique les décisions à prendre avant la migration. Ici, le site a déjà changé : l’objectif est de comparer le comportement livré à ces décisions.

Pour chaque adresse retenue, notez :

- le lien ou document dans lequel elle apparaît ;
- l’information que le visiteur s’attend à trouver ;
- la destination actuelle et les éventuelles étapes intermédiaires ;
- l’action attendue, la personne responsable et la date du contrôle.

Commencez par une page de service importante, un accès au contact et un contenu encore partagé. Ce choix est une façon de borner la première vérification, pas une liste suffisante pour tous les sites. Un catalogue ou un site multilingue demande un périmètre adapté.

L’ouverture d’une page et la lecture d’un lien ne nécessitent pas d’envoyer un formulaire ou de réaliser une réservation. Gardez ces essais avec effets réels dans une recette autorisée distincte.

## 2. Une page introuvable est-elle toujours une erreur ?

Le [code HTTP 404 décrit une ressource que le serveur ne trouve pas](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/404). Il ne dit pas, à lui seul, si cette disparition est temporaire ou définitive. Un lien mal saisi, un contenu retiré et une page déplacée peuvent donc aboutir au même constat initial.

La question utile est : que devait devenir cette adresse ?

| Situation à confirmer | Correction ou état à examiner |
|---|---|
| Le contenu existe à une autre adresse | Définir une redirection vers son équivalent pertinent |
| Le lien contient une faute | Corriger le lien là où il est publié |
| Le contenu a été retiré sans remplacement | Vérifier que la réponse de page absente est volontaire et correctement configurée |
| La destination affiche le mauvais service | Revoir la correspondance entre ancienne et nouvelle page |

Un contenu définitivement retiré peut notamment justifier une réponse `410`, qui indique une disparition permanente, comme le distingue MDN. Ce choix appartient à la personne qui connaît le devenir du contenu ; il ne se décide pas uniquement en voyant le mot « introuvable ».

Une page peut aussi afficher un message d’absence tout en renvoyant un statut `200`. Google décrit ce décalage comme une situation pouvant être interprétée en *soft 404*. Inversement, un statut de succès ne garantit pas une indexation. La [documentation Google sur les codes HTTP](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes) permet de séparer ces questions.

Demandez donc un relevé du statut réel en plus d’une capture d’écran. Le texte affiché dans la page n’est pas le code renvoyé par le serveur.

## 3. Comment reconnaître une mauvaise destination, une chaîne ou une boucle ?

Les trois parcours suivants sont entièrement fictifs. Les chemins servent seulement à expliquer le diagnostic ; ils ne décrivent aucun client ni incident constaté sur un site réel.

### Exemple fictif : l’ancienne page arrive sur l’accueil

Un lien vers `/ancien-atelier` mène désormais à `/`. Le site s’affiche, mais le visiteur doit rechercher l’atelier qu’il voulait consulter. Si son équivalent est `/services/atelier`, c’est cette correspondance qu’il faut examiner.

Dans son [guide des migrations](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes), Google déconseille de renvoyer de nombreuses anciennes URL vers une destination unique sans rapport avec leur contenu. L’accueil n’est donc pas une solution à appliquer automatiquement à tous les liens disparus.

### Exemple fictif : plusieurs étapes avant la bonne page

Le parcours `/atelier-2024` → `/atelier-2025` → `/services/atelier` finit sur le contenu attendu. Il comporte néanmoins une chaîne de redirections. Notez chaque étape au lieu de conclure uniquement à partir de la dernière page visible.

Le même guide Google recommande de viser directement la destination finale lorsque c’est possible. Il recommande également d’actualiser les liens internes vers les nouvelles adresses. La redirection peut ainsi continuer à servir les anciens liens partagés sans imposer ce détour à la navigation interne.

### Exemple fictif : deux règles se renvoient la visite

Une règle envoie `/ancien-atelier` vers `/nouvel-atelier`, tandis qu’une autre fait le chemin inverse. Le visiteur n’atteint pas une page stable : c’est une boucle.

Le [guide MDN des redirections HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections) explique ces boucles et leurs conséquences sur la navigation. Demandez à la personne qui entretient le site d’identifier les règles en conflit avant de modifier leur ordre ou leur portée.

## 4. Que faut-il corriger dans le lien et dans la redirection ?

Séparez deux éléments : le lien que vous maîtrisez dans une page, et la règle qui traite une ancienne adresse. Corriger l’un ne démontre pas que l’autre fonctionne.

Avant toute intervention, faites confirmer la destination souhaitée par la personne responsable du contenu. Si une page a été fusionnée avec une autre, vérifiez que les informations attendues sont réellement présentes sur cette dernière. Si aucun équivalent n’existe, évitez de choisir une page de remplacement uniquement pour obtenir un statut de succès.

Pour un déplacement définitif, Google recommande une redirection permanente côté serveur lorsque c’est possible ; les codes `301` et `308` correspondent à cet usage. Les redirections temporaires répondent à un autre besoin. Sa [documentation sur le choix des redirections](https://developers.google.com/search/docs/crawling-indexing/301-redirects) décrit cette distinction. Le code et la règle se choisissent selon le déplacement réel et l’environnement technique.

Voici une petite fiche de correction, toujours fictive :

| Élément | Observation avant correction | Résultat à vérifier après intervention |
|---|---|---|
| Lien dans la page « Services » | Pointe vers `/ancien-atelier` | Pointe vers la nouvelle adresse retenue |
| Ancienne adresse partagée | Arrive sur l’accueil sans équivalence | Rejoint le contenu correspondant, si celui-ci existe |
| Nouvelle page | Adresse attendue identifiée | Contenu, statut et URL finale cohérents |

Une modification de règle peut toucher plusieurs adresses. Faites conserver la configuration précédente, préciser le périmètre et prévoir un retour arrière avant l’intervention. Une modification globale « pour tout corriger » mérite plus de précautions qu’un lien éditorial isolé.

## 5. Comment vérifier que la correction fonctionne vraiment ?

Après la modification, repartez de l’ancienne adresse complète, pas seulement de la page finale. Refaites ensuite le parcours depuis le lien interne concerné. Cela permet de contrôler séparément le traitement des anciens accès et la navigation du nouveau site.

Conservez pour chaque essai la date, l’adresse de départ, les statuts rencontrés, la destination finale et le contenu affiché. Lorsque le navigateur conserve une ancienne redirection, prévoyez aussi une vérification sans réutiliser cette information en cache, avec l’aide de votre développeur.

Demandez-lui de vérifier également que l’adresse canonique déclarée par la nouvelle page correspond à la destination retenue et que le sitemap référence les nouvelles URL utiles. Une balise canonique indique une adresse préférée pour un contenu ; elle ne remplace pas la règle qui redirige une ancienne adresse. La [documentation Google sur les URL canoniques](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) distingue ces moyens de déclaration.

Pour une migration, Google recommande de contrôler ces annotations, les redirections et le sitemap. Ce contrôle technique ne permet pas de déclarer immédiatement que Google a réexploré ou indexé la page.

La vérification doit aboutir à un état compréhensible : corrigé et relu, comportement volontaire, ou problème restant à traiter. Si vous consultez Search Console ou vos statistiques, conservez leurs dates et leur périmètre. Ne déduisez pas une baisse de trafic d’un seul lien cassé sans examiner les données correspondantes.

Ajoutez enfin les écarts ouverts à votre [routine de maintenance du site](/blog/site-en-ligne-checklist-mensuelle-fiable). Le suivi permet de savoir qui reprend le problème et à quel moment une nouvelle vérification est attendue.

## Questions fréquentes

### Faut-il rediriger toutes les pages 404 vers l’accueil ?

Choisissez d’abord selon le contenu. Une page déplacée demande un équivalent pertinent ; une suppression sans remplacement n’appelle pas automatiquement un renvoi vers l’accueil. Vérifiez aussi les liens internes qui pointent encore vers une adresse absente.

### Une redirection permanente garantit-elle mon référencement ?

Elle peut indiquer le nouvel emplacement d’un contenu. Elle ne prouve ni son indexation ni un classement. Une vérification technique et une mesure de visibilité répondent à des questions différentes.

### À quel moment refaire le contrôle ?

Vérifiez les adresses corrigées après l’intervention, puis organisez un suivi adapté aux changements et aux incidents du site. Une nouvelle mise à jour du menu ou des règles peut justifier un autre contrôle. Aucun délai universel ne garantit la disparition de tous les écarts.

## Reprendre vos adresses importantes après une refonte

Vous avez livré une nouvelle version de votre site et certaines anciennes adresses n’aboutissent plus au bon endroit ? Nous pouvons partir d’un petit inventaire, définir les destinations attendues et préparer les contrôles avant toute modification.

Découvrez mon accompagnement pour la [refonte de sites web en Valais](/refonte-site-web-valais), ou [parlons de votre site](/#contact-form). L’objectif est de clarifier les corrections utiles et leur vérification, sans promettre un résultat de référencement non mesuré.

Sources primaires consultées le 21 octobre 2026. Tous les exemples d’adresses et de corrections de ce guide sont fictifs.
