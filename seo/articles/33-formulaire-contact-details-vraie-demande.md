Un visiteur a une question, mais ne sait pas quoi écrire. Il commence son message sur son téléphone, corrige son adresse email, puis hésite : le formulaire a-t-il vraiment envoyé sa demande ?

Pour une PME ou un indépendant, un formulaire de contact doit rendre ce parcours compréhensible. Je distingue trois étapes : aider la personne à expliquer son besoin, transmettre sa demande correctement, puis lui dire ce qui se passe ensuite. Un bouton visible ne suffit pas à vérifier les trois.

## Que faut-il retenir ?

Demandez les informations utiles au premier échange, gardez des libellés visibles et facilitez la saisie sur mobile. Expliquez les erreurs sans faire perdre le message, puis confirmez la réception quand le système l’a réellement enregistrée. Ces choix peuvent rendre le parcours plus clair ; ils ne garantissent pas davantage de demandes.

## 1. Quelles informations faut-il demander dès le départ ?

Le [tutoriel formulaires du W3C WAI](https://www.w3.org/WAI/tutorials/forms/) recommande de ne demander que les informations nécessaires au processus. Appliqué à une première prise de contact, cela signifie surtout : comprendre le besoin et disposer d’un moyen de répondre.

Prenons un exemple fictif : un artisan valaisan souhaite refaire son site. Il peut déjà expliquer ce qui ne convient plus et laisser son adresse email. Exiger immédiatement le nombre de pages, un budget précis et un cahier des charges complet peut lui demander des décisions qu’il n’a pas encore prises.

Une base à adapter à votre activité :

| Information | Utilité pour le premier échange | Choix possible |
| --- | --- | --- |
| Nom | Savoir à qui répondre | Le demander si utile à votre suivi |
| Email | Répondre à la demande | Obligatoire si c’est votre canal de réponse |
| Message | Comprendre le besoin | Donner une courte indication pour commencer |
| Téléphone | Organiser un appel | Facultatif si une réponse email suffit |
| Budget ou échéance | Cadrer certaines demandes | Facultatif ou « je ne sais pas encore » |

Cette grille n’est pas une recette universelle. Un dépannage urgent et une demande de création de site n’ont pas les mêmes besoins. Pour préparer le contenu de votre site, la [checklist site vitrine](https://www.antoinequarroz.ch/blog/pr%C3%A9parer-la-cr%C3%A9ation-d%E2%80%99un-site-vitrine-en-valais-%3A-la-checklist) aide aussi à préciser ce que le visiteur doit pouvoir faire.

## 2. Comment aider la personne à rédiger son message ?

Un intitulé comme « Votre besoin » peut être accompagné d’une indication concrète : « Décrivez votre activité, ce que vous souhaitez améliorer et votre échéance si vous la connaissez. » La personne dispose alors d’un point de départ, sans devoir remplir un questionnaire de devis.

Gardez le nom du champ visible pendant la saisie. Un texte grisé à l’intérieur du champ disparaît lorsqu’on écrit ; la [documentation MDN sur les champs de saisie](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input) rappelle que ce placeholder ne remplace pas un libellé. Les champs obligatoires doivent aussi être identifiables avant l’envoi.

Évitez les consignes qui promettent ce que votre organisation ne peut pas assurer. « Réponse sous 24 heures » doit correspondre à un engagement réellement tenu. Sinon, expliquez simplement comment vous traiterez la demande.

## 3. Que faut-il vérifier sur un téléphone ?

La même page peut devenir moins pratique lorsque le clavier occupe une partie de l’écran. Vérifiez que le champ actif, son libellé et l’action d’envoi restent utilisables, sans défilement horizontal gênant.

Les types de champ adaptés et l’autocomplétion donnent des indications au navigateur : email, téléphone ou nom, par exemple. MDN décrit ces possibilités avec les attributs `type`, `autocomplete` et `inputmode`. Leur rendu dépend du navigateur et de l’appareil ; ils ne remplacent pas le contrôle des données reçues par le serveur.

Le test utile reste concret : remplir le formulaire sur un vrai téléphone, avec une adresse email et un message représentatifs. Vérifiez également le parcours au clavier sur ordinateur, avec un focus visible et un ordre cohérent.

## 4. Que doit-il se passer quand une erreur survient ?

« Une erreur est survenue » ne permet pas toujours de comprendre ce qu’il faut corriger. Le [guide WAI sur les notifications](https://www.w3.org/WAI/tutorials/forms/notifications/) recommande des messages clairs, courts et accompagnés d’une indication pour résoudre le problème.

Pour une adresse invalide, placez une explication près du champ concerné. Ne signalez pas le problème uniquement par la couleur. Le retour doit aussi pouvoir être repéré avec les technologies d’assistance.

Une erreur dans l’email ne devrait pas effacer le message déjà écrit. Les [contrôles préliminaires de la WAI](https://www.w3.org/WAI/test-evaluate/preliminary/#forms) recommandent de conserver les champs valides après un échec de formulaire. Pour une panne réseau, préserver la saisie et permettre un nouvel essai constitue aussi un choix de conception à vérifier.

## 5. Qu’est-ce qu’une confirmation d’envoi fiable ?

La confirmation devrait correspondre à ce que le système a réellement accepté. Un message enregistré par le site, une notification email envoyée et une demande traitée par une personne sont des étapes distinctes.

Par exemple, « Votre demande a été reçue. Je vais la lire pour vous répondre » convient si la réception est établie et si cette suite correspond au fonctionnement prévu. Il ne faut pas annoncer une réception alors que le serveur a refusé l’envoi.

Pendant une attente, indiquez que la demande est en cours de transmission. Dans la recette technique, vérifiez aussi le double clic et le nouvel essai après une coupure : une même tentative ne devrait pas créer plusieurs demandes. C’est un contrôle de fonctionnement à prévoir avec le développeur, pas une conséquence automatique d’un formulaire bien présenté.

## 6. Quelle recette demander avant la mise en ligne ?

Trois parcours suffisent pour commencer une vérification en environnement de test :

1. **Un envoi normal sur mobile et au clavier.** La personne comprend les champs, termine sa saisie et voit une confirmation cohérente avec la demande enregistrée.
2. **Une erreur de saisie puis une panne simulée.** L’aide est compréhensible, le message reste disponible et le nouvel essai est possible.
3. **Un réseau lent et un double clic.** L’attente est visible et le système évite les demandes en double pour une même tentative.

Ces essais ne prouvent pas à eux seuls que le site générera des contacts. Ils vérifient un parcours essentiel. Une mesure d’usage peut ensuite distinguer ouverture du formulaire, tentative, erreur et réception, sans assimiler chaque clic à un futur client. Le [cadrage d’un projet web](https://www.antoinequarroz.ch/blog/idee-mise-en-ligne-projet-web-bien-cadre) permet de convenir de ces critères avant la livraison.

## Questions fréquentes

### Faut-il demander le budget dans le formulaire ?

Cela dépend de votre service et du premier échange souhaité. Si le visiteur peut encore avoir besoin d’aide pour l’estimer, une réponse facultative ou « je ne sais pas encore » évite de lui demander un montant inventé.

### Un formulaire court suffit-il à recevoir plus de demandes ?

Non. La clarté de l’offre, les personnes qui visitent le site et leur besoin comptent aussi. Le formulaire peut faciliter la transmission d’une demande ; une hausse doit être mesurée dans son contexte.

### Une adresse email visible peut-elle compléter le formulaire ?

Oui, si vous souhaitez proposer un autre moyen de contact et êtes organisé pour le suivre. Les deux parcours doivent mener à une demande lisible et à une réponse, sans multiplier les boîtes oubliées.

## Comment prévoir ce parcours pour votre site ?

Pour votre [site internet en Valais](https://www.antoinequarroz.ch/creation-site-internet-valais), je peux vous aider à définir les champs utiles, les retours d’erreur et les critères de recette. Vous pouvez [me présenter votre besoin](https://www.antoinequarroz.ch/contact) même si le périmètre et le budget ne sont pas encore arrêtés.

Sources primaires consultées le 14 octobre 2026 : W3C WAI et documentation MDN. L’exemple d’artisan est fictif. Aucun taux de conversion ni résultat commercial n’est présenté comme mesuré.
