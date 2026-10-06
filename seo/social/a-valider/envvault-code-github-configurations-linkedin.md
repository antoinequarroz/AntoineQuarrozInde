---
platform: linkedin
statut: A_VALIDER
article_url: https://www.antoinequarroz.ch/blog/envvault-code-github-configurations
article_title: '27. EnvVault : mon code était sur GitHub, mais pas mes configurations'
date: 2026-10-06
---
J’ai fait de la place sur mon Mac. Puis j’ai dû partir à la chasse aux clés pour relancer mes projets.

J’avais gardé le code sur GitHub avant de supprimer les dossiers de mon ordinateur.

Je pensais pouvoir tout récupérer facilement.

Mais il manquait les fichiers .env : les configurations et les clés qui permettent aux applications de se connecter à leurs services.

Ces fichiers sensibles étaient volontairement exclus de Git.

À chaque reprise, je devais donc retrouver les bonnes clés et reconstituer la configuration du projet.

J’en avais gardé dans des fichiers séparés, mais cette organisation ne me convenait plus, notamment côté protection.

C’est là que l’idée d’EnvVault est née.

Je voulais pouvoir retirer un projet de mon ordinateur sans devoir reconstruire sa configuration le jour où je le reprendrais.

J’ai donc développé un outil pour sauvegarder les fichiers .env sélectionnés, les chiffrer et les restaurer ensuite, avec un historique des sauvegardes.

EnvVault reste en développement. Je l’ai construit pour mon propre besoin ; j’aimerais maintenant savoir si vous rencontrez le même problème.

Est-ce qu’un outil comme EnvVault vous intéresserait ? Quel serait le point décisif pour vous donner envie de l’utiliser ?

L’histoire et le lien vers la fiche projet :
https://www.antoinequarroz.ch/blog/envvault-code-github-configurations
