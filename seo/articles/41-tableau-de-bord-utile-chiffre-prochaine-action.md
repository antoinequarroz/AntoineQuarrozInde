## En bref

Un tableau de bord utile permet de comprendre une situation, de retrouver les éléments concernés et de décider quoi faire ensuite. Avant de dessiner les cartes, associez chaque indicateur à une question, une définition et une liste filtrée. « Trois tâches aujourd’hui » doit ouvrir ces trois tâches, avec la même date et les mêmes statuts.

Les exemples et les chiffres de ce guide sont entièrement fictifs. Ils ne décrivent ni mon activité réelle, ni un client, ni ma comptabilité. L’objectif est de cadrer un outil métier pour une PME ou un indépendant, sans promettre un gain de temps ou un résultat commercial non mesuré.

## 1. Quelle décision chaque chiffre doit-il aider à prendre ?

Commencez par les questions que vous vous posez en ouvrant votre outil : que dois-je terminer aujourd’hui ? Quelle demande attend une réponse ? Quel document doit être relu ? Le nombre vient ensuite.

Pour chaque question, notez qui doit agir et ce que cette personne doit pouvoir ouvrir. Si personne ne sait quoi faire quand un chiffre change, il mérite peut-être de rester dans un rapport secondaire.

Dans son article sur les [métriques à remettre en contexte](https://www.nngroup.com/articles/vanity-metrics/), Nielsen Norman Group explique qu’un total impressionnant peut rester peu utile sans période de comparaison ou lien avec un objectif. Une hausse du nombre de pages vues ne suffit donc pas à décider d’une action commerciale.

Voici une première sélection possible. Elle constitue une démonstration, pas un modèle à appliquer à toutes les entreprises.

| Carte fictive | Question | Destination du clic | Prochaine action possible |
|---|---|---|---|
| 3 tâches aujourd’hui | Que faut-il traiter ce jour ? | Tâches ouvertes dont l’échéance est aujourd’hui | Ouvrir une tâche et examiner ce qui reste à faire |
| 3 devis en attente | Quelles propositions attendent une décision ? | Devis envoyés, sans réponse enregistrée | Consulter le dossier et décider d’un suivi |
| 2 messages non lus | Quels messages n’ont pas été consultés ? | Messages reçus encore marqués non lus | Lire puis préparer une réponse |

Le clic ouvre ici une liste ou un dossier. Il ne déclenche pas une relance, une réponse ou une validation à votre place. La consultation et l’action finale doivent rester faciles à distinguer.

## 2. Que comprend exactement le compteur ?

Un libellé court ne dispense pas d’une définition précise. « À faire » peut désigner toutes les tâches ouvertes, celles du jour, celles d’une personne ou celles d’un projet. Ces ensembles peuvent donner des résultats différents sans qu’aucun calcul soit faux.

Définissez chaque carte sur une petite fiche :

- **Unité** : nombre de tâches, de documents, de personnes ou montant restant dû.
- **Périmètre** : organisation, projet et droits de la personne connectée.
- **Statuts inclus et exclus** : ouvert, terminé, annulé, archivé, par exemple.
- **Période** : date d’échéance, date de création ou date de paiement ; ne pas les confondre.
- **Source et fraîcheur** : application métier, outil de mesure ou dernier relevé disponible.

Exemple fictif : la carte « Tâches aujourd’hui » compte les tâches non terminées et non annulées dont l’échéance tombe le 23 octobre 2026, selon le fuseau Europe/Zurich. Les tâches en retard sont dans une autre carte. Cette convention n’est pas la seule possible, mais elle doit être la même dans le compteur et dans sa destination.

Pour un montant, précisez aussi la monnaie, les éventuels paiements partiels et ce que recouvre la période. Additionner des documents ou additionner leurs soldes ne répond pas à la même question.

## 3. Pourquoi le clic doit-il retrouver les bons éléments ?

Une carte qui ouvre toute la base fait perdre le contexte qu’elle venait de fournir. Si le tableau de bord annonce trois tâches, la page suivante doit montrer le filtre actif et permettre de comprendre pourquoi ces tâches sont présentes.

La recommandation de [Nielsen Norman Group sur les tableaux de données](https://www.nngroup.com/articles/data-tables/) associe la recherche d’éléments à des critères compréhensibles et à des filtres dont l’état reste visible. Pour notre exemple, cela conduit à afficher « Échéance : aujourd’hui » et « Statut : ouvert » au-dessus de la liste.

Préparez le parcours complet :

1. La carte annonce le nombre et le périmètre en quelques mots.
2. Le clic ouvre la liste avec les filtres correspondants.
3. Chaque ligne possède un intitulé compréhensible et un statut.
4. L’ouverture d’un élément permet de lire le contexte avant d’agir.
5. Le retour à la liste conserve les filtres utiles.

Le [composant de liste de tâches du GOV.UK Design System](https://design-system.service.gov.uk/components/task-list/) relie des tâches nommées à leur statut et à leur destination. Il vise les démarches complexes qui peuvent être réalisées en plusieurs étapes et conseille d’abord de simplifier le service. Il inspire ici le lien entre tâche, état et action ; cela ne signifie pas qu’un tableau de bord doit reprendre ce composant à l’identique.

Prévoyez aussi les changements survenus entre les deux écrans. Si une collègue termine une tâche après le calcul du compteur, la liste peut en contenir deux. Un relevé actualisé ou un message clair doit expliquer cet écart. Ne rendez pas artificiellement les chiffres identiques en gardant une liste périmée.

## 4. Comment séparer prévu, à encaisser et encaissé ?

Ces mots doivent correspondre aux règles de votre outil. Pour une démonstration de suivi administratif, on peut choisir les conventions suivantes :

| Catégorie fictive | Ce qu’elle représente dans cet exemple | Ce qu’elle ne prouve pas |
|---|---|---|
| Prévu | Montants de factures encore en brouillon | Une somme déjà due ou reçue |
| À encaisser | Solde des factures émises, non annulées et pas entièrement réglées | Un paiement déjà reçu |
| Encaissé sur la période | Paiements enregistrés et rapprochés sur cette période | Le total des projets prévus ou des devis acceptés |

Ces définitions servent à concevoir l’interface. Elles ne remplacent pas vos règles de comptabilité ou de rapprochement. Une facture partiellement réglée demande, par exemple, de distinguer le paiement déjà reçu de son solde restant dû.

« À encaisser au total » et « À encaisser sous 30 jours » sont également deux vues différentes. Déterminez si la seconde inclut les retards, quelle date fait foi et comment les bornes sont calculées. La carte doit ouvrir les factures qui répondent exactement à ce choix.

Le même raisonnement vaut pour le site : une visite, un clic sur le contact, une demande envoyée et une vente sont des événements différents. La [documentation de PostHog sur l’analyse web](https://posthog.com/docs/web-analytics) décrit notamment les pages vues, sessions et sources de trafic. Ces mesures aident à comprendre un parcours ; elles ne constituent pas à elles seules une preuve de paiement ou de vente.

Pour organiser les documents et validations qui alimentent ces compteurs, le guide sur [l’utilité d’un espace client](https://www.antoinequarroz.ch/blog/devis-documents-validations-espace-client-utile) traite le parcours depuis la proposition jusqu’aux livrables.

## 5. Que montrer si une source ne répond plus ?

Une erreur de connexion ne doit pas devenir « 0 ». Zéro signifie qu’une mesure a abouti et n’a trouvé aucun élément dans son périmètre. Une source indisponible signifie que l’état actuel n’est pas connu.

Prévoyez trois situations lisibles :

- **Données à jour** : dernier relevé réussi, avec date et période mesurée.
- **Dernières données disponibles** : ancien relevé conservé, explicitement signalé comme tel.
- **Données indisponibles** : aucun relevé exploitable ; aucun faux zéro affiché.

Exemple entièrement fictif : « 6 demandes sur les sept derniers jours, relevé du 22 octobre à 18 h ; actualisation indisponible ». L’écran ne peut pas présenter ce nombre comme une mesure allant jusqu’au 23 octobre. La période du relevé doit rester visible avec sa date.

Conserver une ancienne mesure aide à garder du contexte. Cela ne doit pas autoriser une opération sensible en s’appuyant sur un statut périmé. Avant d’envoyer une relance ou de confirmer un paiement, il faut retrouver et vérifier la donnée métier pertinente.

La [fiche publique d’Hermes Cockpit](https://www.antoinequarroz.ch/projets/hermes-cockpit) illustre cette attention à la date du relevé dans son compagnon web. Les aperçus présentés sur cette fiche sont signalés comme illustratifs ; ils ne montrent pas de données client.

## 6. Comment vérifier le parcours avant la mise en service ?

Préparez une démonstration avec quelques éléments fictifs dont vous connaissez les statuts et les dates. Puis contrôlez le chemin du compteur jusqu’à la liste, sur ordinateur et sur téléphone.

- Un élément terminé ou annulé sort-il du bon compteur ?
- La liste retrouve-t-elle les mêmes critères de période et de statut ?
- Un changement de projet conserve-t-il un périmètre compréhensible ?
- Le cas sans résultat indique-t-il clairement qu’aucun élément ne correspond ?
- Un relevé ancien est-il distingué d’une mesure actuelle ?
- Les liens et commandes restent-ils utilisables au clavier, avec des intitulés explicites ?

Cette recette vérifie la cohérence de l’outil. Pour savoir s’il facilite réellement le travail, observez ensuite une personne réaliser ses tâches habituelles avec son accord. Notez ce qu’elle cherche, ce qu’elle comprend et les endroits où elle doit encore reconstituer le contexte. N’annoncez pas un gain avant de l’avoir mesuré.

## Questions fréquentes

### Combien d’indicateurs faut-il afficher ?

Il n’existe pas de nombre valable pour toutes les activités. Commencez par les questions qui reviennent réellement et retirez les cartes qui n’ouvrent aucune décision ou vérification utile. Les rapports détaillés peuvent rester dans une vue secondaire.

### Tous les chiffres doivent-ils être cliquables ?

Les compteurs liés à des tâches ou documents gagnent à ouvrir leurs éléments. Une tendance globale peut plutôt mener à un rapport explicatif. Dans les deux cas, le libellé doit faire comprendre la destination ; une carte décorative ne doit pas ressembler à une commande.

### Peut-on garder les dernières statistiques pendant une panne ?

Oui, à condition d’afficher leur date, leur période et le fait qu’elles ne sont plus à jour. S’il n’existe aucune mesure fiable, affichez une indisponibilité plutôt qu’une valeur inventée. La fraîcheur attendue dépend de l’usage de l’indicateur.

### Faut-il une application sur mesure pour commencer ?

Pas forcément. Vous pouvez déjà écrire les définitions, préparer les listes et tester les filtres dans vos outils actuels. Une application devient pertinente si les sources, les droits ou les parcours nécessaires ne sont plus couverts correctement. Le besoin doit précéder le nouvel écran.

## Quels indicateurs aideraient votre équipe à agir ?

Avant de construire votre tableau de bord, choisissons les questions à traiter, les données à utiliser et la destination de chaque carte. Je conçois des [outils métier adaptés aux PME et indépendants](https://www.antoinequarroz.ch/developpeur-web-valais), depuis ce cadrage jusqu’au parcours utilisable sur ordinateur et mobile.

[Parlons des chiffres et des listes utiles à votre activité](https://www.antoinequarroz.ch/#contact-form).

Sources primaires consultées le 23 octobre 2026 : Nielsen Norman Group, GOV.UK Design System et documentation officielle PostHog. Les méthodes proposées et les exemples fictifs de ce guide ne constituent pas une mesure des résultats de mes projets.
