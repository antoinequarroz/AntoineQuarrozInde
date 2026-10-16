Un MVP, ou produit minimum viable, est une première version qui permet à un public précis d’accomplir une tâche utile et de vous apprendre quelque chose. Pour choisir son périmètre, partez d’un problème observé, gardez un parcours complet et décidez à l’avance ce qui permettra de juger son utilité. Le nombre d’écrans vient ensuite.

Vous avez une idée d’application pour votre PME ou votre association. La liste s’allonge vite : comptes, notifications, paiement, messagerie, tableau de bord… Comment savoir ce qui doit réellement entrer dans la première version ?

Je vous propose une grille de décision, avec un exemple fictif d’inscription à un événement. Elle sert à préparer une discussion concrète avant de commencer le développement.

## Quel problème votre première version doit-elle résoudre ?

Commencez par décrire une situation actuelle : qui fait quoi, avec quels outils, et où cela coince. « Centraliser les informations » reste vague. « Permettre au responsable d’un événement de connaître les inscriptions confirmées sans recopier plusieurs listes » donne déjà une tâche à observer.

Dans les [principes du Lean Startup](https://theleanstartup.com/principles), le MVP s’inscrit dans une boucle de construction, de mesure et d’apprentissage. Son intérêt est de confronter une hypothèse à l’usage. Une longue liste de fonctionnalités ne constitue donc pas, à elle seule, un objectif de première version.

Mon projet [EnvVault est parti d’un problème personnel concret](https://www.antoinequarroz.ch/blog/envvault-code-github-configurations) : je libérais de la place sur mon ordinateur en supprimant des dossiers de projets dont le code était conservé sur GitHub. Au moment de les reprendre, il fallait retrouver leurs variables d’environnement et leurs clés, dispersées dans des fichiers peu sûrs. Ce besoin m’a donné une direction précise pour concevoir mon outil. Cela ne prouve pas encore que d’autres personnes ont le même besoin : cette question demande ses propres vérifications.

Pour votre idée, écrivez cette phrase : « Quand [situation], [personne] doit pouvoir [action] pour obtenir [résultat observable]. » Si elle reste difficile à remplir, commencez par parler aux personnes concernées et regarder leur manière de travailler.

## Quel parcours doit fonctionner du début à la fin ?

Prenons une association fictive qui organise un événement gratuit, sans paiement ni attribution de places complexes. Son premier parcours pourrait être : consulter les informations, s’inscrire, recevoir une confirmation, puis retrouver son inscription si une correction est nécessaire. Du côté de l’association, le responsable doit pouvoir consulter les inscriptions et préparer l’accueil.

Un beau formulaire ne suffit pas si personne ne reçoit la demande. Une liste d’inscrits ne suffit pas si les doublons rendent sa lecture impossible. Dessinez donc les étapes visibles pour le participant et celles nécessaires au responsable.

Dans cet exemple, je poserais aussi ces questions avant de chiffrer :

- Que se passe-t-il si l’événement est complet ?
- Comment une personne sait-elle que son inscription a réussi ?
- Qui peut consulter ou corriger les informations ?
- Comment le responsable traite-t-il une demande d’annulation ?
- Que fait-on si un message de confirmation n’arrive pas ?

Ce travail rejoint le [cadrage d’un projet web avant sa mise en ligne](https://www.antoinequarroz.ch/blog/idee-mise-en-ligne-projet-web-bien-cadre). Il fait apparaître les dépendances qui se cachent derrière un simple bouton.

## Comment décider ce que vous gardez et ce que vous reportez ?

Pour chaque demande, posez une question : si nous l’enlevons, le public choisi peut-il encore terminer sa tâche et pouvons-nous vérifier notre hypothèse ? Puis notez ce qui déclenchera une réévaluation.

Voici une proposition de périmètre pour l’association fictive. Ce n’est pas une liste universelle : un événement payant aurait d’autres besoins essentiels.

| Élément | Décision pour cet exemple | Quand le réexaminer ? |
| --- | --- | --- |
| Informations pratiques, inscription et confirmation | À garder : c’est le parcours du participant | Lors des essais, si une étape reste incomprise |
| Accès réservé au responsable et liste des inscriptions | À garder : il faut pouvoir organiser l’accueil | Si plusieurs rôles ont des besoins différents |
| Correction ou annulation | Prévoir une demande traitée manuellement, avec un responsable identifié | Si le traitement devient trop lourd ou trop lent |
| Export simple de la liste | À garder si l’accueil en dépend | Vérifier d’abord le travail réel sur place |
| Paiement en ligne | Hors périmètre de cet événement gratuit | Si une participation payante devient nécessaire |
| Chat, badges et programme de fidélité | À reporter : ils ne répondent pas à l’hypothèse testée | Si des usages observés justifient leur ajout |
| Gestion de plusieurs événements | À reporter pour ce premier essai | Avant de préparer un deuxième événement |

Un traitement manuel peut aider à limiter le développement initial. Il doit toutefois être explicite : qui s’en charge, dans quel délai et avec quelle capacité ? Une tâche cachée qui déborde sur le responsable fausse votre appréciation de la solution.

## Faut-il un prototype ou une application déjà utilisable ?

Un prototype permet d’explorer une solution, par exemple avec quelques écrans cliquables. Il peut vous aider à vérifier si les informations et les étapes sont comprises avant de construire le fonctionnement complet.

Le [guide de la phase alpha de GOV.UK](https://www.gov.uk/service-manual/agile-delivery/how-the-alpha-phase-works) recommande de tester différentes approches et les hypothèses les plus risquées. Il précise aussi que les prototypes de cette phase ne sont pas des services prêts pour la production. C’est une distinction utile pour votre cahier des charges : une démonstration qui semble fonctionner ne garantit pas la gestion des données, des accès ou des erreurs.

Si vous invitez de vraies personnes à utiliser la première version, prévoyez ce fonctionnement ainsi que l’assistance nécessaire. Le [guide de la phase bêta de GOV.UK](https://www.gov.uk/service-manual/agile-delivery/how-the-beta-phase-works) décrit notamment une ouverture initiale à un groupe limité pour recueillir des retours et améliorer le service. Je retiens ici cette progression, sans transposer les procédures administratives britanniques à votre entreprise.

## Que faut-il conserver même dans une petite version ?

Réduire le périmètre demande de choisir les usages couverts. Dans ces usages, les accès doivent correspondre aux personnes autorisées, les erreurs doivent être compréhensibles et les informations doivent pouvoir être récupérées si un incident survient.

Prévoyez aussi l’accessibilité dès la conception. Le [W3C recommande de l’intégrer tout au long du projet](https://www.w3.org/WAI/planning-and-managing/). Pour un formulaire, cela implique notamment de prévoir des libellés clairs et de vérifier son utilisation au clavier. Ces vérifications de départ ne constituent pas à elles seules un audit complet.

Avant l’essai, demandez une démonstration du parcours sur téléphone, d’une erreur de saisie, de la réception d’une inscription et des limites d’accès. Définissez également qui intervient si quelque chose ne fonctionne plus.

## Comment savoir si cette première version est utile ?

Écrivez vos critères avant de la montrer. Pour l’association fictive, je chercherais à observer si les participants trouvent les informations, terminent leur inscription et comprennent la confirmation sans explication supplémentaire. Le responsable doit ensuite pouvoir préparer l’accueil avec la liste obtenue.

Notez les blocages, les demandes d’aide et les étapes encore réalisées ailleurs. Demandez aux personnes de raconter ce qu’elles ont fait ; une réponse polie à « vous aimez ? » apporte peu d’indications sur l’usage réel.

Si le groupe est petit, présentez les observations avec leur contexte. Deux personnes satisfaites ne suffisent pas à annoncer un taux de réussite représentatif. Elles peuvent néanmoins révéler une incompréhension à corriger. La suite peut être d’améliorer le parcours, de revoir l’hypothèse ou de différer un développement supplémentaire.

## Questions fréquentes

### Combien de fonctionnalités faut-il pour un MVP ?

Il n’existe pas de nombre valable pour tous les projets. Cherchez un parcours utile et complet pour un public défini, puis justifiez chaque fonctionnalité par son rôle dans ce parcours.

### Faut-il commencer par une application iOS et Android ?

Le choix dépend des usages à vérifier : contexte d’utilisation, appareils disponibles et fonctions nécessaires. Le périmètre peut parfois être testé sur le web ; les besoins du terrain doivent guider la décision.

### Peut-on annoncer un prix ou un délai avant ce cadrage ?

Une estimation devient plus exploitable quand le parcours, les dépendances, les données et les éléments reportés sont explicités. Demandez ce que le devis couvre, les hypothèses retenues et comment seront traitées les demandes supplémentaires.

Vous préparez une [application pour votre activité en Valais](https://www.antoinequarroz.ch/application-mobile-valais) ? Apportez votre problème de départ, les personnes concernées et la manière dont elles travaillent aujourd’hui. Nous pourrons définir la première version à tester et les éléments à reporter. [Parlons de votre projet](https://www.antoinequarroz.ch/#contact).

Sources primaires consultées le 16 octobre 2026 : The Lean Startup, GOV.UK Service Manual et W3C WAI. L’association et son événement sont fictifs. Aucun budget, délai ou résultat utilisateur n’est présenté comme mesuré.
