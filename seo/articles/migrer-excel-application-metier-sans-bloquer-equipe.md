Passer d’Excel à une application métier ne devrait pas obliger votre équipe à interrompre son travail. Je recommande de séparer trois décisions : les données à reprendre, les règles à conserver et le moment où le nouvel outil devient la référence. Une migration réussie se vérifie sur des dossiers réels et prévoit aussi un retour arrière.

## Pourquoi un simple import ne suffit-il pas ?

Un tableur peut contenir bien plus qu’une liste : des formules, des commentaires, plusieurs onglets, des codes couleur et des habitudes que personne n’a documentées. L’application doit reprendre les informations utiles, mais aussi permettre à l’équipe de continuer à décider et à travailler correctement.

**Exemple fictif :** une PME suit ses interventions dans un classeur. Une ligne contient un client, une adresse, une date et un statut. Une cellule orange signifie « rappeler le client ». Cette couleur n’est pas un détail décoratif : elle représente une action. Si l’import ne reprend que les valeurs, cette consigne peut disparaître.

Microsoft indique que l’enregistrement d’un classeur dans un autre format, notamment CSV, peut perdre des fonctionnalités et de la mise en forme. Un export ne doit donc pas être considéré comme une copie complète du classeur. [Documentation Microsoft sur les formats texte et CSV](https://support.microsoft.com/en-us/excel/save-a-workbook-to-text-format-txt-or-csv).

Avant de parler de technologie, la question utile est : **qu’est-ce que l’équipe doit pouvoir faire le lendemain du changement ?**

## Comment choisir ce qui mérite d’être repris ?

Commencez par un inventaire avec la personne qui utilise réellement le fichier. Pour chaque onglet, identifiez :

- le responsable et les utilisateurs ;
- les données encore nécessaires au travail courant ;
- les archives à conserver séparément ;
- les formules et les règles implicites ;
- les pièces jointes ou liens vers d’autres fichiers ;
- les données personnelles et leurs accès.

Dans l’exemple des interventions, les dossiers ouverts et les coordonnées utiles peuvent entrer dans l’application. Les anciens dossiers peuvent rester dans une archive contrôlée si cela répond au besoin de conservation. Le choix dépend de votre activité et de vos obligations, pas d’une durée universelle inventée pour tous les métiers.

Ne migrez pas systématiquement tout ce qui existe. Un ancien fichier abandonné ne devient pas fiable parce qu’il est importé dans une application neuve.

## Quelles règles faut-il écrire avant l’import ?

Je cadrerais chaque champ dans une petite table de correspondance. C’est un livrable concret à valider avec l’équipe avant de développer l’import.

| Dans le tableur | Dans l’application | Contrôle prévu |
|---|---|---|
| Numéro de dossier | Identifiant conservé comme texte | Valeur inchangée, y compris les zéros au début |
| Client | Référence vers une fiche client | Correspondance validée, doublons examinés |
| Date de visite | Date de l’intervention | Format et sens de la date confirmés |
| Cellule orange | Action « rappel à faire » | Règle explicitée et vérifiée |
| Montant | Montant et devise | Totaux comparés par période pertinente |
| Statut libre | Statut défini | Valeurs inconnues signalées, jamais devinées |

Le numéro `00127`, par exemple, n’est pas forcément une quantité. Microsoft documente les conversions automatiques d’Excel qui peuvent supprimer les zéros initiaux ou transformer de grands nombres. Il recommande notamment de traiter ces valeurs comme du texte selon le contexte d’import. [Conserver les zéros initiaux et les grands nombres](https://support.microsoft.com/en-us/excel/keeping-leading-zeros-and-large-numbers).

Les corrections doivent être explicites. Si deux lignes semblent désigner le même client, une personne métier doit confirmer la fusion. Une ressemblance de nom ne suffit pas.

## Comment tester sans toucher au travail en cours ?

Préparez une copie de travail datée et une première importation dans un environnement de test. Pour une démonstration, préférez des données fictives ou anonymisées lorsque c’est possible. Si des données personnelles réelles sont nécessaires, définissez les accès et les mesures de protection avant de les copier.

Le [PFPDT présente les mesures techniques et organisationnelles de sécurité](https://www.edoeb.admin.ch/fr/securite-de-linformation), notamment la protection des accès et le chiffrement. La migration ne justifie pas de laisser un export client dans un dossier partagé sans contrôle. L’organisation reste responsable de son traitement ; les exigences précises dépendent des données et des risques.

Pour tester l’import, choisissez des cas représentatifs :

1. Un dossier simple, sans particularité.
2. Un client avec plusieurs interventions.
3. Une ligne incomplète ou un statut inhabituel.
4. Un identifiant commençant par zéro.
5. Un montant, une date et une pièce jointe à vérifier.
6. Un utilisateur qui ne doit pas voir tous les dossiers.

Vous pouvez utiliser les outils de profilage de Power Query pour repérer les valeurs vides, les erreurs et les distributions. Microsoft précise que le profilage porte par défaut sur les premières 1 000 lignes ; le contrôle doit être étendu à l’ensemble des données si vous voulez en tirer une conclusion globale. [Outils de profilage Power Query](https://learn.microsoft.com/en-us/power-query/data-profiling-tools).

Ce contrôle de structure ne remplace pas la validation métier. Une colonne peut être techniquement valide tout en contenant la mauvaise date ou le mauvais client.

## Quels résultats faut-il comparer ?

Avant la bascule, définissez les critères qui permettront d’accepter ou de refuser l’import. La comparaison doit être reproductible, pas fondée sur l’impression que « les écrans ont l’air corrects ».

Vérifiez notamment :

- le nombre de dossiers repris et ceux volontairement exclus ;
- l’unicité des identifiants ;
- les liens entre clients et interventions ;
- les totaux pertinents et les devises ;
- les statuts et les actions encore à faire ;
- l’accès aux documents ;
- les droits des utilisateurs ;
- la liste des erreurs et leur traitement.

Pour les interventions fictives, on peut demander à une personne de retrouver un dossier, planifier une visite, modifier son statut puis consulter son document. Le test vérifie ainsi le travail complet, pas seulement la présence de lignes dans une base.

Conservez un reçu d’import : fichier source, date, règles appliquées, éléments acceptés, éléments rejetés et corrections validées. Une ligne rejetée doit rester visible dans le bilan ; elle ne doit pas disparaître silencieusement.

## Comment éviter deux versions contradictoires pendant la transition ?

Le risque d’une phase parallèle est de modifier le même dossier dans Excel et dans l’application sans savoir quelle version fait foi.

Choisissez une seule référence pour les écritures. Pendant le pilote, Excel peut rester la référence et l’application servir à tester sur une copie. Autre possibilité : basculer un petit périmètre dans l’application et laisser le reste dans le tableur, avec une séparation claire.

Écrivez une consigne simple : **qui saisit quoi, dans quel outil, à partir de quelle date ?** Elle doit être accessible aux personnes concernées.

Au moment de la bascule :

1. Annoncer le créneau et la personne responsable.
2. Sauvegarder la version finale du classeur.
3. Arrêter temporairement les modifications sur le périmètre concerné.
4. Importer les changements intervenus depuis le pilote, selon une méthode prévue et testée.
5. Comparer les résultats aux critères d’acceptation.
6. Ouvrir les écritures dans l’application si les contrôles passent.
7. Conserver le classeur source en archive contrôlée, sans encourager une double saisie.

Une migration peut demander une courte interruption de saisie. La durée doit être mesurée lors de la répétition ; promettre zéro interruption sans avoir testé le volume et les contraintes serait trompeur.

## Que prévoir si la migration doit être annulée ?

Le retour arrière se prépare avant la mise en service. Il faut savoir qui le décide, quels contrôles déclenchent l’arrêt et comment les données restent disponibles.

Si l’application n’a encore reçu aucune nouvelle saisie, le retour au fichier sauvegardé peut être relativement simple. Si des utilisateurs y ont déjà travaillé, réouvrir l’ancien classeur ne suffit plus : il faut conserver et réconcilier leurs nouvelles modifications.

Prévoyez donc une procédure pour exporter ou récupérer ces changements, les vérifier et éviter leur perte. Testez aussi la restauration de la sauvegarde. Une copie présente sur un disque n’est pas, à elle seule, la preuve que l’équipe pourra reprendre son travail.

## Quand faut-il attendre plutôt que migrer ?

Je repousserais la bascule si personne ne peut expliquer les règles du classeur, si les erreurs d’import restent inexpliquées ou si l’équipe n’a pas testé son travail quotidien.

De même, si l’application ne réduit aucune difficulté concrète, il peut être préférable d’améliorer le tableur. Le but est de simplifier le processus, pas de remplacer Excel pour afficher un nouvel outil.

Pour juger l’utilité du changement, mesurez un parcours avant et après : temps de recherche, ressaisies, erreurs et corrections. La méthode présentée dans [l’article sur la mesure du gain de temps](/blog/mesurer-automatisation-ia-gain-temps) s’applique aussi à une migration sans IA. Pour préparer les règles et les responsabilités, vous pouvez reprendre la structure d’un [cahier des charges utile](/blog/rediger-cahier-des-charges-web-utile-sans-jargon-technique).

## Questions fréquentes

### Faut-il importer toutes les archives ?

Pas nécessairement. Distinguez ce qui sert au travail actuel, ce qui doit être conservé et ce qui peut être supprimé selon les règles applicables. Cette décision doit être validée par l’organisation.

### Un export CSV suffit-il ?

Il peut convenir à des données simples, mais ne conserve pas toutes les propriétés d’un classeur. Les formules, la mise en forme et les règles implicites doivent être examinées séparément.

### Peut-on continuer à travailler pendant les tests ?

Oui, sur l’outil de référence prévu. En revanche, évitez de modifier les mêmes dossiers dans deux outils sans mécanisme de rapprochement défini. Le créneau final doit être répété et mesuré.

### Combien de temps prendra la migration ?

Cela dépend de la qualité des données, du volume, des liens et du processus. Un premier import sur une copie permet d’identifier les difficultés avant d’annoncer une date ferme.

## Votre tableur mérite-t-il une application ?

Vous pouvez me présenter votre fichier avec des données fictives et le parcours qui vous freine. Nous pourrons définir ce qui doit rester, ce qui doit changer et les contrôles nécessaires avant de choisir un outil. [Découvrir mon accompagnement en développement web en Valais](/developpeur-web-valais) ou [la création de sites pour PME](/creation-site-internet-valais).

Sources primaires consultées le 7 octobre 2026 : Microsoft Support sur les exports CSV et les conversions de données, Microsoft Learn sur le profilage Power Query, et PFPDT sur la sécurité de l’information. L’exemple d’interventions est fictif et ne présente ni un résultat client ni une durée de migration garantie.
