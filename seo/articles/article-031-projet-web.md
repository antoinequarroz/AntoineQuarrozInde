## En bref

Un projet web bien cadré avance grâce à des décisions vérifiables : définir le besoin, choisir le premier parcours utile, préparer les contenus, valider une maquette, construire, tester et organiser la mise en ligne. Chaque étape doit produire un livrable et préciser qui le valide. Le lancement se termine par un contrôle du site public et un suivi ; il ne suffit pas que la nouvelle page s’affiche sur l’ordinateur du développeur.

## 1. Quel problème le projet doit-il résoudre ?

« Nous avons besoin d’un nouveau site » décrit une solution, pas encore le besoin. Avant de parler de technologie, je conseille de formuler ce qui doit devenir plus simple pour le visiteur et pour l’équipe.

Prenons une PME fictive qui reçoit des demandes de devis incomplètes. Son objectif pourrait être de permettre à un prospect de comprendre l’offre, puis de transmettre les informations nécessaires à une première réponse. Cet exemple est illustratif : il ne représente pas un résultat obtenu chez un client.

Le document de départ peut tenir sur une page : public visé, problème observé, parcours attendu, contraintes et personne chargée de valider. Il doit aussi indiquer ce qui ne sera pas traité dans la première version.

**Livrable :** un brief approuvé. **Critère de passage :** les personnes concernées peuvent expliquer le même objectif, sans utiliser une liste de fonctionnalités comme seule définition du projet.

Pour préparer ce document, retrouvez mon guide pour [rédiger un cahier des charges web utile](/blog/rediger-cahier-des-charges-web-utile-sans-jargon-technique).

## 2. Quel parcours doit fonctionner en premier ?

Une liste de pages ne raconte pas ce que l’utilisateur doit réussir. Il est plus utile de décrire un parcours complet : arriver sur une prestation, vérifier qu’elle correspond à son besoin, consulter une preuve et envoyer une demande.

Dans notre exemple, une galerie sophistiquée peut attendre si le formulaire n’aide pas encore à transmettre le lieu, le type de projet et le moyen de contact. Cette priorité dépend du besoin ; elle ne constitue pas une règle universelle.

Écrivez des critères observables. « Le formulaire est moderne » est difficile à valider. « Les champs obligatoires sont compréhensibles, une erreur conserve la saisie et un envoi réussi affiche une confirmation » donne une base de recette.

**Livrable :** le parcours prioritaire et ses critères. **Critère de passage :** le périmètre initial couvre une tâche complète, avec ses erreurs et sa confirmation.

## 3. Quels contenus et accès faut-il préparer ?

Le développement peut être ralenti par des dépendances très ordinaires : photos manquantes, texte non validé, domaine inaccessible ou personne indisponible pour relire.

Préparez un tableau simple : élément, responsable, état et échéance. Il peut inclure les prestations, les coordonnées publiques, les images autorisées, les documents à télécharger et les accès techniques nécessaires. Les mots de passe et clés restent dans un moyen de partage sécurisé, pas dans ce tableau.

S’il existe déjà un site, inventoriez ses pages avant de les supprimer. Une ancienne adresse peut être utilisée dans un favori, un email ou un résultat de recherche. Le devenir de chaque page utile doit être décidé.

**Livrable :** contenus et dépendances identifiés. **Critère de passage :** les éléments indispensables au premier parcours sont disponibles, ou leur date de livraison est connue.

## 4. Comment valider la maquette sans débattre seulement des couleurs ?

La maquette permet de vérifier la hiérarchie et les actions avant de construire tous les écrans. Utilisez de vrais exemples de contenu : un titre long, une photo moins idéale, une description réaliste. Un écran composé uniquement de textes très courts peut masquer des problèmes de mise en page.

Relisez le parcours sur téléphone aussi bien que sur grand écran. Le visiteur voit-il ce qui est proposé ? Trouve-t-il l’action suivante ? Comprend-il ce qui se passera après son clic ?

Les choix graphiques comptent, mais ils doivent accompagner cette lecture. Une validation peut distinguer les éléments approuvés et les points encore ouverts, afin d’éviter de rouvrir toutes les décisions à chaque livraison.

**Livrable :** maquette du parcours principal. **Critère de passage :** structure, contenus et actions sont validés par la personne désignée.

## 5. Que faut-il vérifier pendant la construction ?

Mieux vaut vérifier un parcours utilisable progressivement qu’attendre une démonstration finale. Pour un formulaire, cela signifie contrôler les champs, les erreurs, la transmission et la confirmation. Pour un espace connecté, il faut aussi vérifier les refus d’accès, pas seulement le cas où tout est autorisé.

Une première revue d’accessibilité peut notamment examiner les titres de pages, les alternatives textuelles, les contrastes, l’utilisation au clavier et les libellés de formulaire. Le [W3C propose des vérifications préliminaires](https://www.w3.org/WAI/test-evaluate/preliminary/) ; il précise qu’elles ne suffisent pas à certifier toute l’accessibilité d’un site.

Conservez les anomalies dans une liste avec leur impact et le résultat attendu. Un défaut qui bloque l’envoi d’une demande ne mérite pas la même priorité qu’un détail visuel secondaire.

**Livrable :** version de recette et liste des anomalies. **Critère de passage :** les tâches essentielles fonctionnent et les défauts bloquants sont corrigés.

## 6. Comment préparer une mise en ligne réversible ?

Avant le lancement, désignez qui décide, qui déploie et qui contrôle. Préparez une sauvegarde adaptée et une méthode de retour à la version précédente. Un fichier de sauvegarde présent ne prouve pas à lui seul qu’une restauration fonctionnera.

En cas de changement d’adresses, préparez les correspondances entre anciennes et nouvelles URL. [Google Search Central recommande de tester le nouveau site, de planifier les redirections et de suivre les anciennes et nouvelles adresses](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes). Cette préparation concerne une migration d’URL, pas tous les projets neufs.

Contrôlez aussi le domaine, HTTPS, les liens internes, le sitemap et les éventuelles restrictions d’indexation utilisées en développement. Une demande d’indexation n’est pas une garantie de positionnement.

**Livrable :** plan de lancement et de retour arrière. **Critère de passage :** l’équipe sait vérifier le site public et réagir si le parcours principal échoue.

## 7. Que mesurer après le lancement ?

Testez le parcours sur l’adresse publique. Pour une prise de contact, vérifiez la visite de la page, le clic vers le formulaire, son début et l’envoi effectivement réussi. La mesure doit permettre de distinguer ces étapes sans collecter inutilement les informations saisies.

Une faible quantité de visites ne permet pas de conclure immédiatement qu’un texte est inefficace. Il faut aussi examiner les erreurs et les retours réels avant de modifier une page sur la seule base d’un petit nombre d’événements.

Prévoyez enfin la responsabilité de la maintenance : contenus, mises à jour, incidents et sauvegardes. Le suivi doit être compris avant que le développeur et le client considèrent le projet terminé.

## Questions fréquentes

### Combien de temps dure un projet web ?

Il n’existe pas de durée unique. Le périmètre, les intégrations, les contenus disponibles et les délais de validation influencent le calendrier. Un planning utile explicite ces dépendances plutôt que de promettre une date sans conditions.

### Faut-il tout prévoir dès le départ ?

Il faut cadrer la première version et ses limites. Les améliorations suivantes peuvent rester dans une liste séparée, puis être réévaluées à partir de l’usage.

### Qui valide les étapes ?

Une personne désignée doit pouvoir arbitrer, en recueillant les avis nécessaires. Le développeur vérifie le fonctionnement technique ; l’organisation valide aussi les contenus et l’adéquation au besoin.

## Comment commencer votre projet ?

Vous pouvez déjà écrire trois phrases : « Notre public est… », « Il doit pouvoir… » et « Nous saurons que cela fonctionne lorsque… ». Ajoutez les contraintes et le responsable de validation. Cette base rend le premier échange beaucoup plus concret.

Si vous préparez un site ou une refonte, découvrez mon [accompagnement en création de site internet en Valais](/creation-site-internet-valais). Pour examiner le point de départ d’un site existant, consultez aussi le guide pour [décider d’une refonte à partir d’un audit](/blog/decider-refonte-site-audit-sept-points).

### Sources

Recommandations du [W3C WAI sur les premiers contrôles d’accessibilité](https://www.w3.org/WAI/test-evaluate/preliminary/) et de [Google Search Central sur les migrations d’URL](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes), consultées le 12 octobre 2026. Le déroulement proposé est une méthode de cadrage ; l’exemple de PME est fictif et aucun résultat commercial chiffré n’est revendiqué.
