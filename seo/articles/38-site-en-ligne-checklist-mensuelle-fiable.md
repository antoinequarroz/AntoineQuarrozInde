## En bref

Une fois votre site publié, prévoyez un rendez-vous régulier pour vérifier ce qui permet à vos visiteurs de comprendre votre offre et de vous joindre. Commencez par les pages importantes, les liens et l’affichage sur téléphone. Distinguez ensuite les tests qui envoient réellement des données, les mises à jour et les essais de restauration : ces opérations demandent un cadre et un responsable.

Je propose ici un point mensuel comme repère d’organisation. Il ne remplace ni la surveillance des incidents, ni le traitement rapide d’une faille connue. La fréquence doit suivre les risques et l’activité de votre site.

## 1. Quelles pages faut-il contrôler en premier ?

Partez du parcours le plus utile : découvrir votre offre, trouver une information pratique, puis prendre contact. Une petite sélection de pages suivie régulièrement est plus facile à exploiter qu’une longue liste sans responsable.

Ouvrez votre accueil, une page de service et la page de contact sur ordinateur et sur un téléphone. Vérifiez les informations qui changent : prestations, horaires, coordonnées et documents proposés au téléchargement. Suivez les liens importants et regardez si leur destination correspond encore à leur intitulé. Une page qui s’ouvre peut malgré tout mener au mauvais service.

Sur mobile, observez les titres, les boutons, le menu et les champs. Un texte reste-t-il caché derrière un élément ? Peut-on lire les informations sans zoomer ? Le bouton de contact est-il accessible ? Notez l’appareil et le navigateur utilisés : un contrôle sur un téléphone ne prouve pas que tous les affichages fonctionnent.

Ces premières vérifications restent en lecture seule. Elles ne nécessitent pas de modifier un contenu ou de soumettre une demande.

## 2. Comment vérifier le contact sans créer de fausses demandes ?

Séparez l’observation du formulaire et l’essai complet. Sans envoyer quoi que ce soit, vous pouvez déjà relire les libellés, les consignes et les coordonnées affichées. Vous pouvez aussi parcourir les commandes au clavier. Cela ne démontre toutefois pas qu’un message arrivera à destination.

Pour un essai complet, convenez d’abord avec le responsable du site d’un environnement ou d’une destination de test. Identifiez qui recevra le message et quelles automatisations pourraient être déclenchées. Utilisez des données de test clairement reconnaissables et vérifiez la réception effective, en plus de la confirmation affichée. Ne soumettez pas le formulaire d’un tiers pour vérifier un article ou un exemple.

Le [W3C WAI recommande des retours clairs sur les erreurs et la réussite d’un formulaire](https://www.w3.org/WAI/tutorials/forms/notifications/). Pendant un test autorisé, relisez ces messages et les indications permettant de corriger une saisie. Une confirmation à l’écran et la réception par le bon destinataire sont deux contrôles différents.

Pour préparer cette recette en détail, consultez mon guide sur les [formulaires de contact qui facilitent une vraie demande](/blog/formulaire-contact-details-vraie-demande). La routine mensuelle sert à vérifier que le parcours reste utilisable après les changements du site.

## 3. Que préparer avant une mise à jour ?

Une notification de mise à jour mérite d’être examinée par la personne qui entretient le site. Elle ne signifie pas qu’il faut modifier immédiatement la production sans préparation. À l’inverse, attendre le prochain rendez-vous mensuel n’est pas une réponse adaptée à toute alerte de sécurité.

Le [guide StopRansomware de la CISA](https://www.cisa.gov/stopransomware/ransomware-guide) recommande de maintenir les logiciels à jour et de traiter en priorité les systèmes exposés et les vulnérabilités exploitées. Il couvre un contexte de cybersécurité plus large que l’entretien d’un site ; il ne présente pas le contrôle mensuel comme une protection suffisante.

Avant une intervention, clarifiez les points suivants :

- Quel composant change et quelles fonctions pourraient être concernées ?
- Existe-t-il une sauvegarde adaptée et récupérable ?
- Peut-on essayer la modification dans un environnement séparé ?
- Comment revenir à une version fonctionnelle si le contrôle échoue ?
- Qui intervient et qui confirme que le parcours important fonctionne ensuite ?

La procédure dépend du CMS, de l’hébergement et des intégrations réellement utilisés. Demandez à votre prestataire de se référer à leur documentation officielle. Il n’existe pas une commande de mise à jour valable pour tous les sites.

## 4. Une sauvegarde existe : peut-on vraiment restaurer le site ?

La présence d’un fichier ou d’un voyant vert ne répond pas à toutes les questions. Demandez ce qui est sauvegardé : fichiers du site, contenus, base de données et configuration nécessaire à sa remise en service. Identifiez la date de la dernière copie utilisable, son emplacement et la personne qui sait la récupérer.

La CISA conseille notamment des sauvegardes hors ligne et chiffrées, ainsi que des essais réguliers de disponibilité et d’intégrité. Ces recommandations aident à définir une stratégie avec votre responsable technique ; le mode de sauvegarde doit être adapté à votre hébergement et aux données concernées.

Prévoyez un essai de restauration dans un environnement isolé, avec des accès limités. Le but est de constater que les éléments nécessaires peuvent être récupérés et que le site restauré remplit les contrôles prévus. Veillez à ce que cet environnement ne déclenche pas d’e-mails, de paiements ou d’autres actions réelles.

Ne restaurez pas une copie sur la production pour « voir si cela marche ». Cette opération peut remplacer des données plus récentes. Le retour en production nécessite une décision et une procédure distinctes.

Les responsabilités peuvent être réparties entre vous, l’hébergeur et le développeur. Mon guide sur les [critères d’hébergement d’un site pour une PME](/blog/hebergement-site-web-suisse-criteres-pme) aide à clarifier ce périmètre ; le présent contrôle porte sur son suivi dans le temps.

## 5. Comment garder une trace utile des contrôles ?

Pour chaque écart, conservez une observation précise, la date, une preuve sans données privées, un responsable et une prochaine action. Écrivez « non testé » lorsque le contrôle n’a pas eu lieu, plutôt que de cocher une case par défaut.

Voici un exemple fictif de suivi. Il ne décrit ni un client ni une intervention réalisée.

| Contrôle | Preuve ou état observé | Date | Responsable | Prochaine action |
|---|---|---|---|---|
| Lien vers les horaires | Ancien document encore proposé | 20 octobre 2026 | Responsable du contenu | Fournir la version à publier |
| Contact sur téléphone | Libellés relus, aucun envoi effectué | 20 octobre 2026 | Responsable du site | Organiser un test autorisé |
| Sauvegarde | Copie annoncée, restauration non testée | 20 octobre 2026 | Prestataire technique | Définir un essai isolé |

Distinguez aussi la nature des opérations :

| Niveau | Exemples | Cadre à prévoir |
|---|---|---|
| Lecture seule | Ouvrir une page, suivre un lien, relire les coordonnées | Noter le résultat et les limites du contrôle |
| Test avec effets possibles | Soumettre un formulaire ou essayer une réservation | Accord, destination de test, effets identifiés |
| Intervention technique | Mise à jour ou restauration | Sauvegarde adaptée, essai séparé, retour arrière et responsable |

Au point suivant, reprenez d’abord les écarts ouverts. Un problème qui empêche de joindre votre entreprise demande une action avant le prochain rendez-vous. Le tableau sert à décider qui fait quoi, pas seulement à accumuler des cases cochées.

## Questions fréquentes

### Une vérification par mois suffit-elle ?

Le mois est un repère pratique proposé ici. Un site qui change souvent ou comporte des fonctions sensibles peut demander d’autres contrôles. Les incidents et alertes ne doivent pas attendre cette échéance.

### Puis-je faire les contrôles moi-même ?

Vous pouvez relire vos pages et vérifier les liens importants. Pour les envois de test, mises à jour et restaurations, définissez le cadre avec la personne responsable. Ne confondez pas une vérification visuelle avec une recette technique complète.

### L’hébergement comprend-il forcément la maintenance ?

Relisez le périmètre convenu avec votre prestataire. Demandez explicitement qui gère les mises à jour, les sauvegardes, les essais de restauration et les corrections. Évitez de supposer qu’une opération est incluse parce que le site est hébergé.

## Définir une routine adaptée à votre site

Votre site est en ligne, mais vous ne savez pas qui vérifie le contact, les mises à jour ou les sauvegardes ? Nous pouvons commencer par identifier les pages essentielles, les responsabilités et les contrôles à documenter.

Découvrez mon accompagnement pour la [refonte de sites web en Valais](/refonte-site-web-valais), ou [parlons de votre site](/#contact-form). L’objectif est de clarifier le travail utile et son périmètre avant de prévoir des interventions.

Sources primaires consultées le 20 octobre 2026. Cette checklist est une proposition d’organisation ; elle ne constitue pas un audit de sécurité ni une garantie de disponibilité.
