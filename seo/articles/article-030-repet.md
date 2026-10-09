## En bref

Je développe **Répèt, anciennement Ensemble**, une application destinée aux sociétés musicales. Son objectif : réunir l’agenda, les réponses aux répétitions, les partitions et les enregistrements dans un espace commun aux musiciens, à la direction et au comité. Le projet est en bêta sur invitation ; la sortie publique sur iOS et Android est encore en préparation. Ce retour présente mes choix de conception, sans annoncer de gain de temps mesuré ni de lancement général.

## Pourquoi créer une application pour une société musicale ?

Une répétition ne commence pas à la première note. Avant de jouer, il faut connaître le lieu, l’horaire, le programme et les personnes qui seront présentes. Il faut aussi retrouver la bonne partition et, parfois, un enregistrement pour préparer son morceau.

Prenons un exemple illustratif : l’horaire est dans un message, le PDF dans un dossier partagé et la réponse d’un musicien dans une autre conversation. Chaque information existe, mais leur dispersion impose de les chercher et de les rapprocher. Ce scénario explique le problème auquel je veux répondre ; ce n’est pas une enquête chiffrée sur les pratiques des sociétés.

Avec Répèt, je cherche à rapprocher ces éléments du quotidien musical. L’application doit aider le collectif à se préparer, tout en restant assez simple pour être utilisée au moment où l’on en a besoin.

## Pourquoi commencer par l’agenda et les réponses ?

J’ai organisé le produit autour de quelques parcours concrets : retrouver le prochain rendez-vous, annoncer sa présence, ouvrir une partition et écouter un enregistrement.

L’agenda rassemble les répétitions et les sorties. Chaque événement permet de consulter ses informations et de donner sa réponse. Le suivi distingue aussi **la réponse annoncée et la présence réellement constatée** : dire que l’on viendra et être effectivement présent sont deux informations différentes.

Cette distinction compte pour la conception. Une interface ne doit pas transformer une intention en fait accompli. Elle doit permettre aux personnes responsables de faire le suivi, avec les droits adaptés.

L’objectif n’est pas de promettre une organisation parfaite. C’est de donner une place claire à chaque information et de rendre le prochain geste compréhensible.

## Comment réunir les partitions et l’écoute ?

Le répertoire est l’autre cœur du projet. Les partitions sont regroupées par morceau et par registre, avec des PDF consultables et des favoris personnels. Les enregistrements et les playlists permettent de préparer les morceaux à son rythme.

Il faut toutefois distinguer deux usages : **écouter un enregistrement existant** et **faire interpréter une partition par un moteur de reconnaissance musicale**. Le second demande une vérification supplémentaire.

Dans la version en test, la préparation de l’écoute d’un PDF passe par une reconnaissance musicale, puis par une correction et une validation explicite d’un responsable. Un PDF importé n’est donc pas automatiquement une partition prête à être jouée. L’assemblage de PDF distincts reste en préparation, comme l’explique la [présentation officielle de Répèt](https://repet.ch/#questions).

Ce point illustre une décision de développement : une fonction impressionnante sur une démonstration doit aussi montrer ses limites. Pour travailler un morceau, une interprétation incertaine ne doit pas être présentée comme une référence fiable.

## Pourquoi les rôles sont-ils aussi importants que les écrans ?

Une société réunit des musiciens, une direction et un comité. Tous partagent un projet musical, mais leurs responsabilités ne sont pas identiques.

Répèt organise les membres, les registres, les annonces et les rôles dans un même espace. Une personne peut aussi retrouver les différentes sociétés auxquelles elle a accès. Les documents et les permissions restent rattachés à chaque société.

Cela pose des questions très concrètes : qui peut consulter un document, gérer un événement ou confirmer les présences ? Une belle liste de partitions ne suffit pas si les accès ne suivent pas l’organisation réelle.

J’ai expliqué cette logique plus largement dans l’article sur les [droits d’accès et la traçabilité d’une application métier](/blog/droits-acces-tracabilite-application-metier). Ici, elle sert directement un usage collectif : partager l’information utile avec les bonnes personnes.

## Quels choix techniques guident le développement ?

Le code de l’application repose sur [Flutter](https://docs.flutter.dev/resources/architectural-overview). Ce choix permet de travailler avec une base commune pour plusieurs plateformes, tout en conservant des vérifications propres à chaque appareil. Une compilation réussie ne garantit pas à elle seule que le parcours sera agréable sur un téléphone en répétition.

Je porte donc une attention particulière à la navigation, à la lecture des documents et aux actions fréquentes. Le site de Répèt présente des écrans du projet : ils permettent de voir l’interface, mais ne constituent pas une preuve que toutes les nouveautés sont disponibles dans chaque version.

La priorité reste le parcours complet. Retrouver un morceau doit mener au bon document ; répondre à un événement doit produire un état compréhensible ; changer de société doit garder son contexte. C’est cette continuité que je cherche à construire dans mes [projets d’applications sur mesure](/#portfolio).

## Qu’est-ce qui reste à vérifier avant une sortie publique ?

Au 9 octobre 2026, Répèt est présenté comme une **bêta sur invitation**. Le téléchargement public sur l’App Store et Google Play n’est pas encore ouvert.

L’accès à un essai dépend de la version disponible et de l’appareil. Certaines nouveautés, comme le suivi sur PDF et les annotations, restent en test ; la recette physique avec Apple Pencil doit encore être terminée. Ces limites sont précisées dans les questions fréquentes du site.

Les essais doivent notamment aider à comprendre si les musiciens trouvent l’information sans explication, si les responsables peuvent suivre les réponses et si les documents restent faciles à utiliser. Je ne publie pas encore de pourcentage de temps gagné : il faudrait le mesurer dans des situations comparables avant de l’affirmer.

## Questions fréquentes

### Ensemble et Répèt sont-ils deux projets différents ?

Non. Ensemble était le nom initial du projet. Le produit porte désormais le nom Répèt.

### À quelles sociétés l’application s’adresse-t-elle ?

La présentation officielle cite les fanfares, harmonies, guggenmusiks et ensembles de tambours et fifres. L’espace est conçu pour les musiciens, la direction et le comité.

### Peut-on déjà essayer l’application ?

Un essai peut être préparé sur invitation, selon le build disponible et les appareils utilisés. La demande se fait depuis le [site de Répèt](https://repet.ch/), sans création automatique d’un accès.

## Quel usage vous aiderait le plus ?

Ce projet m’intéresse parce qu’il rapproche le développement d’un quotidien concret : se retrouver, se préparer et jouer ensemble. Les retours d’une société doivent aider à choisir les prochaines améliorations, plutôt qu’à simplement ajouter des fonctions.

**Dans votre société musicale, qu’est-ce qui vous fait perdre le plus de temps : les réponses aux répétitions, la recherche des partitions ou la préparation des morceaux ?** Et est-ce qu’une application comme Répèt vous intéresserait pour un essai ?

Vous pouvez découvrir les écrans et les conditions de bêta sur [repet.ch](https://repet.ch/). Pour un autre besoin numérique dans votre organisation, retrouvez aussi mon [accompagnement en création de site internet en Valais](/creation-site-internet-valais).

### Sources et état du projet

Présentation et questions fréquentes de [Répèt](https://repet.ch/), consultées le 9 octobre 2026. Les choix techniques sont documentés dans le dépôt du projet ; les fonctions en test ne sont pas présentées comme un lancement public.
