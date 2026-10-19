# Badges publics du portfolio

Revue des sources : 19 octobre 2026. Le registre `app/utils/projectPresentation.ts`
décrit uniquement les faits publics relus pour les badges. Il ne modifie pas les
données du CRM, la publication des études de cas ou leurs règles d’autorisation.

Les deux dimensions restent indépendantes : « Projet client » / « Projet
personnel » décrit l’origine ; « En développement » décrit un prototype, une
version en développement ou une bêta explicitement documentée. L’absence du
second badge ne promet ni livraison ni disponibilité commerciale.

Ne jamais déduire ces informations de `clientId`, d’un nom, d’une technologie,
du statut interne du projet ou de l’absence de lien public. Un nouveau slug ne
reçoit aucun badge tant que sa source n’a pas été relue. Le registre est explicite
et ne détecte pas des mots dans les descriptions traduites.

## Provenance retenue

Les chemins de dépôts ci-dessous sont des références de lecture, sans données
client, identifiants privés ni accès à publier.

| Slug public | Origine retenue | En développement | Source examinée |
| --- | --- | --- | --- |
| `physiobaur` | Client | — | [Fiche publique](https://www.antoinequarroz.ch/projets/physiobaur), étude de cas approuvée et témoignage public de Christophe Baur ; `seo/articles/36-physiobaur-site-patients-premier-clic-contact.md`, lignes 5 et 60. |
| `aventuretime-aq` | Personnel | — | Description publique : « Ce projet personnel » ; dépôt AventureTimeAQ, `repo/README.md`, ligne 3 : portfolio interactif d’Antoine. |
| `threejs-cv` | Personnel | — | [Fiche publique](https://www.antoinequarroz.ch/projets/threejs-cv) : son parcours, ses compétences et ses réalisations dans son portfolio expérimental. |
| `envvault` | Personnel | Oui | [Fiche publique](https://www.antoinequarroz.ch/projets/envvault) et description publiée : projet personnel en développement, sans audit de sécurité indépendant. |
| `hermes-cockpit` | Personnel | — | `app/pages/projets/hermes-cockpit.vue`, lignes 64–65 : « Projet personnel » et « Application macOS disponible ». |
| `postmelo` | Personnel | Oui | [Description publique](https://www.antoinequarroz.ch/projets/postmelo) : « ma plateforme », encore en développement et en accès privé. Aucun lien du studio privé n’est utilisé. |
| `orion` | Personnel | — | Dépôt Orion, `README.md`, ligne 3 : « Cockpit personnel ». La documentation ne suffit pas pour dater une sortie commerciale. |
| `velqora` | Personnel | Oui | Dépôt VELQORA, `docs/cadrage.md`, ligne 13 : produit personnel d’Antoine ; `README.md`, ligne 5 : prototype et MVP restant à valider. |
| `staq` | Personnel | — | Dépôt staq, `docs/cadrage.md`, lignes 5 et 20 : produit d’Antoine, sous son contrôle. |
| `livrematch` | Personnel | — | Dépôt livrematch, `app/pages/a-propos.vue`, ligne 33 : édité par Antoine Quarroz. |
| `chat-d-interieur` | Personnel | — | Lien public du portfolio vers MiaouChezMoi ; dépôt miaochezmoi, `docs/legal/legal-brief.md`, ligne 9 et `lib/site.ts`, ligne 9 : Antoine est l’éditeur. |
| `bagage-malin` | Personnel | — | Dépôt bagagemalin, `lib/site.ts`, lignes 13 et 20 : éditeur et directeur de publication Antoine Quarroz. |
| `rangements-malins` | Personnel | — | Dépôt gagnetaplace, `docs/legal/legal-brief.md`, lignes 7 et 13 : exploitant et directeur de publication Antoine Quarroz. |
| `nino` | Non classée | Oui | Description publique : première version en développement, encore à valider dans la salle ; dépôt GabinHEdS, `studio/README.md`, lignes 1, 7 et 11 : première chaîne et configuration distante restante. Le contexte d’une salle ne prouve pas un mandat client. |
| `remembeyes` | Non classée | Oui | [Description publique](https://www.antoinequarroz.ch/projets/remembeyes) : version iOS en bêta TestFlight, App Store à venir. |
| `lifxp` | Non classée | Oui | [Description publique](https://www.antoinequarroz.ch/projets/lifxp) : version iOS en bêta TestFlight, App Store à venir. |
| `zedline` | Non classée | — | [Description publique](https://www.antoinequarroz.ch/projets/zedline) et dépôt zedline, `README.md`, lignes 70–85 : version web accessible ; mobiles et Steam en préparation. Cela ne justifie pas de présenter le jeu web entier comme indisponible. |
| `respire` | Non classée | — | Description publique fonctionnelle, sans déclaration explicite d’origine ou de développement. |
| `rallye-team-quarroz` | Non classée | — | Dépôt quarroz-rally-team, `README.md`, ligne 3 : site de l’équipe ; cette seule information ne prouve pas un mandat client. |
| `carnadzons` | Non classée | — | Description publique du site du carnaval ; elle ne prouve pas un mandat client. |
| `le-saint-martin-restobar` | Non classée | — | Description publique du restaurant ; elle ne prouve pas un mandat client. |

Pour corriger ou compléter un badge, vérifier la nouvelle source puis mettre à
jour ensemble le registre, cette table et les tests. Une future gestion dans
l’admin peut remplacer ce registre par des champs explicites après traitement
de leurs règles d’écriture et de publication ; ce n’est pas nécessaire pour
cette amélioration de présentation.
