Mon code était sur GitHub. Pourtant, je ne pouvais pas simplement relancer mes projets. En faisant de la place sur mon ordinateur, j’avais supprimé les dossiers locaux et leurs fichiers de configuration. C’est ce problème qui m’a poussé à créer **EnvVault**, un outil de sauvegarde chiffrée des fichiers `.env` sélectionnés.

## Pourquoi récupérer mon code ne suffisait-il pas ?

Tout est parti d’un ordinateur qui n’avait plus assez de place. J’ai conservé le code de mes projets sur GitHub, puis supprimé leurs dossiers de mon ordinateur pour libérer de l’espace.

Je pouvais retrouver le code plus tard. Mais au moment de reprendre un projet, il manquait ses variables d’environnement : les paramètres et les clés qui permettent à l’application de se connecter aux services qu’elle utilise.

Dans mes projets, ces informations étaient notamment conservées dans des fichiers `.env`, volontairement exclus de Git. Les supprimer localement ne les faisait donc pas apparaître dans GitHub.

Il faut distinguer deux choses : conserver le code source et conserver ce qui permet de le configurer. Un dépôt peut être intact sans contenir toutes les informations nécessaires au fonctionnement de l’application.

## Qu’est-ce qui me compliquait la reprise d’un projet ?

À chaque reprise, je devais retrouver les bonnes clés et reconstituer la configuration. J’en avais gardé dans des fichiers séparés, mais je ne considérais pas cette organisation comme suffisamment sécurisée.

Le problème ne se limitait donc pas à une information manquante. Je voulais aussi mieux protéger ce que je conservais et savoir où le retrouver.

C’est ce besoin personnel, rencontré dans mon travail de développeur, qui a fait naître EnvVault. Mon objectif était de pouvoir retirer un projet de mon ordinateur sans devoir repartir à la chasse aux configurations lorsque je le reprendrais.

## Comment EnvVault répond-il à ce besoin ?

EnvVault est une application de bureau avec un outil en ligne de commande. Les deux utilisent le même cœur développé en Rust. L’interface de bureau repose sur Tauri et React.

Le parcours prévu est simple :

1. **Sélectionner les fichiers.** L’outil repère les fichiers de la famille `.env`, puis l’utilisateur choisit lesquels conserver. Il ne recherche pas tous les identifiants présents sur l’ordinateur.
2. **Créer une sauvegarde chiffrée.** Les fichiers sélectionnés et les informations décrivant la sauvegarde sont chiffrés avant d’entrer dans le coffre.
3. **Conserver un historique.** Une nouvelle sauvegarde crée une nouvelle version. Cela permet de retrouver plusieurs états de la configuration.
4. **Vérifier et restaurer.** L’outil permet de vérifier les sauvegardes et de restaurer les fichiers vers un dossier choisi. Un fichier existant n’est pas remplacé silencieusement.

[Découvrir la fiche EnvVault et son fonctionnement](/projets/envvault).

## Que signifie « chiffrer les sauvegardes » dans ce projet ?

EnvVault utilise `age` pour chiffrer les fichiers et les manifestes qui décrivent les sauvegardes. La clé privée nécessaire au déchiffrement est conservée dans le trousseau du système. Les valeurs des variables ne sont pas affichées dans l’interface normale.

Une destination distante peut aussi être configurée. La synchronisation envoie alors, par SFTP, des fichiers déjà chiffrés sur l’ordinateur. Elle reste une action explicite d’envoi ou de récupération ; ce n’est pas une synchronisation automatique permanente.

Ces choix cherchent à protéger le contenu des sauvegardes si le coffre ou le stockage distant sont copiés. Ils ne rendent pas les fichiers d’origine invulnérables. Les applications qui ont accès aux `.env` locaux peuvent toujours les lire, et les fichiers restaurés doivent eux aussi être protégés.

La documentation du format et de l’outil [age](https://github.com/FiloSottile/age) explique le mécanisme de chiffrement utilisé. Les protections spécifiques d’EnvVault sont décrites dans sa [documentation de sécurité](https://github.com/antoinequarroz/envvault/blob/main/SECURITY.md).

## Comment retrouver les sauvegardes sur un autre ordinateur ?

Créer une sauvegarde ne suffit pas si l’on perd ensuite la possibilité de la déchiffrer.

EnvVault prévoit un export de récupération, lui-même chiffré et protégé par une phrase secrète. Ce fichier doit être conservé séparément du coffre, et sa phrase secrète doit rester disponible dans un endroit adapté.

En cas de changement d’ordinateur, il faut récupérer le coffre et les éléments de récupération, puis vérifier les sauvegardes avant de restaurer les fichiers.

Sans la clé du trousseau ni les éléments de récupération, les sauvegardes peuvent devenir inutilisables. Pour un projet important, conserver une copie indépendante et essayer une restauration avec des valeurs fictives font donc partie de la démarche.

## Où en est EnvVault aujourd’hui ?

EnvVault reste un projet en développement. Les fonctions de sauvegarde, historique, vérification, récupération, restauration et transfert SFTP sont présentes dans le code que j’ai relu pour cet article.

Je ne le présente pas comme un gestionnaire de secrets ayant fait l’objet d’un audit de sécurité indépendant. Le chiffrement ne protège pas contre toutes les situations, notamment un ordinateur compromis pendant la lecture des fichiers ou une perte de l’ensemble des moyens de récupération.

Il ne remplace pas non plus la révocation d’une clé déjà exposée. GitHub recommande de révoquer ou renouveler les secrets divulgués avant de traiter leur suppression dans un dépôt. Ce cas est différent de celui qui m’a poussé à développer EnvVault : ici, je cherchais à conserver des configurations volontairement absentes de Git.

## Qu’est-ce que ce projet m’a appris ?

EnvVault m’a amené à considérer la reprise d’un projet dans son ensemble. Le code est une partie du travail ; les configurations, leur conservation et leur récupération en sont une autre.

C’est aussi une façon de développer que j’aime : partir d’une difficulté concrète, construire une première réponse, puis l’utiliser et vérifier ses limites.

Je n’ai pas encore de données permettant d’affirmer que ce besoin est partagé par un grand nombre de développeurs. C’est justement ce que j’aimerais comprendre avec leurs retours.

**Est-ce qu’un outil comme EnvVault vous intéresserait pour conserver et retrouver les configurations de vos projets ? Quel serait le point décisif pour vous donner envie de l’utiliser ?**

Vous pouvez découvrir [la fiche du projet EnvVault](/projets/envvault) et m’envoyer votre retour depuis [le formulaire de contact](/#contact).

## Questions fréquentes

### EnvVault récupère-t-il des clés que j’ai déjà perdues ?

Non. Il sauvegarde les fichiers sélectionnés qui sont encore disponibles. Il ne recrée pas une clé absente et ne remplace pas la procédure de récupération du service concerné.

### EnvVault permet-il de supprimer un projet sans précaution ?

Il faut d’abord créer et vérifier la sauvegarde, conserver les éléments de récupération et essayer une restauration. La présence du code sur GitHub ne prouve pas que la configuration a été conservée.

### Est-ce une solution de gestion des secrets pour toute une équipe ?

Le projet présenté ici est un outil local de sauvegarde et de restauration avec un stockage distant facultatif. Cet article ne promet pas de gestion des accès d’équipe ni de rotation automatique des clés.

## Sources et vérifications

Sources consultées le 6 octobre 2026 :

- [EnvVault : fonctionnement et limites](https://github.com/antoinequarroz/envvault).
- [EnvVault : modèle de sécurité](https://github.com/antoinequarroz/envvault/blob/main/SECURITY.md).
- [age : outil et format de chiffrement](https://github.com/FiloSottile/age).
- [GitHub : traiter des données sensibles exposées](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

Ce retour d’expérience repose sur mon besoin personnel et sur les fonctions présentes dans le projet. Il ne présente pas un audit de sécurité indépendant ni une mesure de performance.
