## En bref

Dans une application métier, un compte connecté ne doit pas donner accès à tout. Avant de développer, il faut préciser qui peut consulter, modifier, valider et exporter chaque type de donnée, puis décider quelles actions laisseront une trace. Pour une PME, une petite matrice de permissions et des scénarios de refus concrets constituent un point de départ plus utile qu’une liste de rôles abstraits.

## Quel problème faut-il résoudre avant de créer des rôles ?

Imaginez une application de devis et de facturation. Une personne prépare les devis, une autre les valide, et un prestataire intervient ponctuellement sur un projet. Ce sont des exemples de conception, pas le récit d’un incident client.

Si tout le monde utilise le même compte administrateur, il devient difficile de distinguer les responsabilités. Mais ajouter simplement trois boutons « utilisateur », « responsable » et « administrateur » ne suffit pas : un responsable de projet doit-il voir les factures de tous les clients ? Un prestataire doit-il exporter les coordonnées ? Peut-il encore ouvrir une pièce jointe après la fin de son mandat ?

Le besoin se formule avec une personne, une action et un périmètre. « Le prestataire consulte les documents du projet qui lui est attribué pendant son mandat » est une règle que l’on peut vérifier.

## Comment construire une matrice qui reste compréhensible ?

Voici une base illustrative à adapter avec l’équipe, et non un modèle de sécurité universel.

| Action | Collaborateur | Responsable | Prestataire |
|---|---|---|---|
| Lire un projet attribué | Oui | Oui | Pendant son mandat |
| Modifier un devis en brouillon | Sur ses projets | Sur son périmètre | Non |
| Valider un devis | Non | Selon délégation | Non |
| Exporter les contacts | Non par défaut | Autorisation distincte | Non |
| Accorder des droits | Non | Non par défaut | Non |

Une ligne « exporter » mérite sa propre décision : consulter une fiche et télécharger toute une base ne produisent pas les mêmes conséquences. Ajoutez aussi les pièces jointes, les liens partagés et les opérations déclenchées par une intégration.

Je conseille de relire cette matrice avec des situations ordinaires : arrivée d’un collègue, remplacement temporaire, changement de projet et départ d’un prestataire. Les exceptions oubliées apparaissent souvent à ce moment-là.

## Où les permissions doivent-elles être vérifiées ?

Masquer un bouton améliore l’interface, mais ne protège pas l’opération correspondante. Les contrôles doivent être appliqués côté serveur à chaque demande, avec un accès refusé si aucune règle ne l’autorise. L’OWASP recommande également de limiter les privilèges au nécessaire. [Source : OWASP, Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

Pour notre exemple, voici les scénarios de recette à remettre au développeur :

1. Un utilisateur du projet A tente d’ouvrir un document du projet B avec son lien direct : refus.
2. Une personne autorisée à lire essaie de modifier un devis : refus.
3. Un prestataire dont le mandat est terminé réutilise une ancienne session : vérifier que ses anciens droits ne fonctionnent plus.
4. Un export respecte le même périmètre que les fiches consultables.
5. Une permission nouvellement accordée permet uniquement l’action prévue.

Le résultat attendu doit être écrit avant le test. Une page qui « semble marcher » avec le compte du propriétaire ne prouve pas que ces frontières tiennent.

## Que faut-il retrouver dans l’historique ?

L’historique métier répond à une question : qui a changé le statut de ce devis, quand, et avec quel résultat ? Un journal de sécurité sert plutôt à repérer des accès refusés ou des événements inhabituels. Ces deux usages peuvent partager des informations, mais leurs lecteurs et leurs durées de conservation doivent être définis.

Pour une validation, un événement peut conserver l’identifiant de l’acteur, celui du devis, la date, le changement de statut et le résultat. Évitez de copier inutilement tout le document dans le journal. Les mots de passe, jetons et secrets ne doivent pas y figurer. Protégez aussi les journaux contre les accès et modifications non autorisés. [Source : OWASP, Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

Un historique n’est pas une sauvegarde. Retrouver qu’un document a été supprimé ne permet pas forcément de le restaurer. Prévoyez séparément la restauration et les responsabilités en cas d’erreur.

## Que prévoir pour une PME suisse ?

Le PFPDT publie des recommandations sur les mesures techniques et organisationnelles et sur la journalisation prévue par l’OPDo. Les exigences dépendent du traitement concerné : il ne faut pas transformer une recommandation de conception en obligation identique pour toutes les applications. [Source : PFPDT, Sécurité de l’information](https://www.edoeb.admin.ch/fr/securite-de-linformation).

Dans le cahier des charges, demandez au minimum une décision explicite sur les données personnelles traitées, les personnes autorisées, l’accès aux journaux, leur durée de conservation et la procédure de départ d’un utilisateur. Pour un traitement sensible ou un doute réglementaire, faites vérifier les exigences applicables au cas précis.

## Par quoi commencer sans alourdir le projet ?

Commencez par le parcours le plus exposé : un devis, une facture ou un dossier client. Dessinez sa matrice, choisissez les événements importants, puis testez les accès permis et refusés. Étendez ensuite cette méthode aux autres fonctions.

Le livrable utile est un petit dossier de recette : règles validées, comptes de test, scénarios et résultats. Vous pourrez le relire quand une nouvelle fonction ou un nouveau rôle sera ajouté.

Pour cadrer le reste du projet, consultez aussi [comment rédiger un cahier des charges utile](/blog/rediger-cahier-des-charges-web-utile-sans-jargon-technique) et [quand remplacer Excel par un outil métier](/blog/remplacer-excel-outil-metier-criteres-etapes).

## Questions fréquentes

### Faut-il donner un compte à chaque personne ?

Un compte individuel facilite l’attribution des actions. Les accès d’intégration doivent être identifiés séparément et limités à leur fonction.

### Trois rôles suffisent-ils ?

Ils peuvent suffire au départ. Le nom du rôle ne remplace toutefois pas les règles liées au projet, au document ou à la durée d’un mandat.

### Faut-il tout enregistrer ?

Définissez les événements utiles et les exigences applicables. Accumuler des données sans but rend le journal plus difficile à exploiter et augmente les informations à protéger.

### Peut-on ajouter les droits après la mise en ligne ?

C’est possible, mais les choix de données et de parcours seront déjà installés. Cadrer les permissions tôt évite de découvrir tardivement qu’un export ou un lien partagé expose un périmètre trop large.

## Votre équipe sait-elle déjà qui doit voir quoi ?

Présentez-moi un parcours et ses utilisateurs : nous pourrons identifier les règles à intégrer avant de développer. Retrouvez mon accompagnement sur [la page de création de sites et de solutions web en Valais](/creation-site-internet-valais), puis [présentez votre projet](/#contact).

*Sources consultées le 8 octobre 2026. Les exemples et la matrice sont des propositions de conception à adapter à votre organisation.*
