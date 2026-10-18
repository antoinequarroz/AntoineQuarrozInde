# Production éditoriale du lot du 18 au 23 octobre 2026

Guide propre au projet, préparé le 18 octobre 2026. Il remplace pour ce lot une dépendance implicite à des fichiers de plugin absents du runner ; il ne prétend installer aucun plugin, outil de génération ou connexion.

## Ordre de lecture

1. `.codex/geo/profile.md`, `.codex/geo/keywords.md`, `.codex/geo/content-inventory.md`, `.codex/geo/queue/` et `.protocole/seo.json`.
2. [Méthode de rédaction](foundational-article.md), [structure](playbook/01-geo-principles.md), [périmètre des sujets](playbook/02-content-taxonomy.md), [qualité](playbook/03-eeat-and-quality.md), [adaptateur du site](adapters/cms-headless.md), [maillage](internal-linking.md).
3. [Brief daté du sujet](briefs-2026-10-19.md) et `.protocole/voix-sociale.md` avant les brouillons sociaux.

Les guides suffisent comme méthode documentaire. Ils ne remplacent pas les accès nécessaires à Git, au Web, à la couverture et à l'API restreinte. Ne pas lancer un ancien `cycle.py` qui imposerait une autre file ou choisirait un sujet sans respecter la date.

## Autorisations et sélection

Antoine a validé les six sujets de `.codex/geo/queue/semaine-2026-10-19.md`, avec leur date. La publication de ces articles est automatique après contrôle. Les posts sociaux et newsletters restent à valider séparément. Au maximum un nouvel article par passage ; aucun appel Treg payant nécessaire pour ce lot.

Avant rédaction, lire l'API publique `/api/articles`, le blog, le sitemap et les reçus. Comparer titre sans préfixe numérique, slug et URL. Si l'article est déjà public, vérifier et réconcilier, sans recréer. Sinon prendre seulement l'item validé daté du jour Europe/Zurich et calculer le prochain numéro comme maximum des préfixes publics plus un. Une date vide ne doit jamais être remplie par un ancien sujet ouvert.

## Git et environnement

La mission FRIDAY utilise le clone réservé `/data/workspace/AntoineQuarrozInde-seo-runtime`, branche `main`, comme dépôt de base. Avant production, vérifier le dossier, l'identité du remote sans afficher d'URL privée, récupérer `origin`, puis créer un worktree propre depuis `origin/main` à jour. Rédiger et préparer la production dans ce worktree, afin de ne pas dépendre d'une branche locale ancienne. Une éventuelle mise à jour du clone de base reste fast-forward et sans conflit ; arrêter s'il diverge ou si des modifications locales entrent en collision. Ne pas supprimer, nettoyer, mettre de côté ou écraser des fichiers. Le dépôt source partagé reste intact.

Le lot et ses ressources doivent être présents sur `origin/main`, pas seulement dans une branche ou une PR. Un prochain passage planifié n'est pas la preuve qu'il a déjà lu cette version.

## Couvertures : charte violette validée

Le 18 octobre 2026, Antoine a validé la proposition PhysioBaur violette pour la couverture publique 036 et les cinq suivantes 037–041. Cette décision remplace, pour ces six images, les anciennes consignes de photoréalisme bleu nuit/cuivre. Elle ne modifie ni les sujets ni les dates ni les contrôles factuels et les autorisations de publication.

Les chemins restent `seo/covers/article-036.png` à `article-041.png`. Le [manifeste des couvertures](../../covers/editorial-2026-10-18-manifest.json) doit être réconcilié avec les nouveaux fichiers et leur source de composition avant toute utilisation : les empreintes et inspections des anciennes images ne sont pas des preuves pour leurs remplacements.

### Composition et typographie

- Export final PNG 1200 × 675, inférieur à 5 Mo, avec une lisibilité vérifiée à la taille d'une carte du blog et sur mobile.
- Fond `#080810`. Dégradé exact `#7c3aed` → `#a855f7` → `#c084fc`, en conservant l'orientation et les positions des couleurs de la composition PhysioBaur validée.
- Utiliser la police Space Grotesk authentique, avec les graisses et la composition de la proposition validée. Pour le SVG final, convertir les textes en tracés issus de ses glyphes réels ; ni police de substitution ni lettrage généré qui imite ses formes. Relire les accents et le texte après vectorisation.
- Réutiliser le robot existant et ses éléments de marque validés. Ne pas lui substituer une mascotte recréée.
- Utiliser de vraies captures du site ou du projet quand elles éclairent le sujet, en conservant leur provenance et sans présenter une interface inventée comme une capture. Retirer toute donnée privée. Un diagramme construit en code ou une interface fictive porte visiblement « Démonstration ».

La composition native SVG/HTML avec les assets existants est autorisée. Aucun appel de génération IA ni résultat photoréaliste n'est requis pour réutiliser cette marque. Un générateur absent du runner n'est donc pas un prérequis manquant si la couverture dédiée et ses preuves sont disponibles.

### Sources, droits et preuve

Pour chaque image, le manifeste associe au numéro d'article le fichier final, ses dimensions, sa taille et son SHA-256, le fichier source SVG/HTML ou la commande de composition, les sources des captures, la provenance du robot et de la police, les notices de copyright ou licences applicables et la date du contrôle visuel. Reprendre les notices réelles ; ne pas inventer une licence ou prétendre des droits non vérifiés. Les sources et autorisations doivent être contrôlables, sans rendre publics des secrets ou coordonnées privées.

Avant chaque production, contrôler le fichier réel contre ce manifeste puis sa lisibilité, son orthographe et sa pertinence. Ne pas annoncer le remplacement comme vérifié tant que les preuves ne correspondent pas aux nouveaux octets. Un fichier dédié déjà préparé et contrôlé peut être utilisé à sa date sans nouvelle génération. Ne pas reprendre un ancien visuel cuivre ni une couverture d'un autre article.

Le nouveau contrat de style est `aq-editorial-violet-space-grotesk-v1`. Attendre la confirmation de son déploiement avant tout envoi qui l'utilise. L'adaptateur décrit les règles de compatibilité ; un rejet pour style non pris en charge est un blocage technique à signaler, jamais une raison d'envoyer une fausse étiquette de style.

## Publication et preuve

Créer le Markdown puis le payload JSON dans `seo/articles/`, seulement après vérification des sources et de la couverture. Utiliser `scripts/hermes/publish_article.py` avec `--payload`, `--verification-text` et un reçu dédié, dans un environnement où `HERMES_PUBLISH_TOKEN` est configuré en privé. Ne jamais afficher, recopier dans Git ou transmettre le jeton dans un rapport. Si l'environnement ne possède pas cet accès, indiquer le blocage plutôt que rechercher ou exposer une clé.

Après l'envoi, vérifier la page publique en HTTP 200, titre numéroté, extrait distinctif, canonical, contenu rendu côté serveur, image effectivement utilisée et sa résolution, puis entrée de sitemap. Le succès de la requête API seul ne suffit pas. Une réponse ambiguë exige d'abord une réconciliation publique avant tout nouvel envoi. Cocher seulement après cette preuve et mettre à jour le reçu, les notes et l'inventaire avec des faits vérifiés.

## Brouillons sociaux

Après preuve publique seulement, écrire deux fichiers `<slug>-linkedin.md` et `<slug>-x.md` sous `seo/social/a-valider/`, front matter fermé : `platform`, `statut: A_VALIDER`, `article_url` canonique, `article_title` exact et `date`. Textes originaux distincts, première personne, faits vérifiés, URL canonique, limites 3000/280 caractères. Appliquer la relecture anti-ton-IA de `.protocole/voix-sociale.md`.

Synchroniser avec la route restreinte `/api/hermes/social-drafts` et une clé stable par article/plateforme, ou le script existant `--sync-drafts` après contrôle du périmètre. Vérifier l'absence de doublons et le statut `draft`, mode manuel, sans approbation ni échéance d'envoi. Ne pas remplacer un texte corrigé. Les UTM sont injectés au moment de la publication sociale par le flux existant ; ne pas empiler des campagnes dans le brouillon.

## Provenance et limites observées

Méthodes du plugin personnel `agents-marketing-codex`, version locale `2026.9.8`, consultées : `geo-engine/skills/foundational-article/SKILL.md`, playbooks 01–03, `adapters/cms-headless.md`, `skills/internal-linking/SKILL.md`. Aucune licence de redistribution ni notice de copyright explicite n'a été trouvée dans cette copie. Aucun de ces textes ou scripts n'est reproduit intégralement ici ; les présents guides sont une rédaction opérationnelle adaptée au site. Aucune licence tierce n'est inventée.

Preuve de configuration consultée : snapshot local Cockpit du 18 octobre à 16:30:47 Europe/Zurich, mission `e34258e2fcab`, `enabled=true`, `deliver=local`, dossier dédié, prochain passage le 19 octobre à 07:00. Les obligations `git fetch origin --prune`, `git merge --ff-only origin/main` et sélection par date ont été lues dans le champ `content` du rapport collecté `Hermes · friday · e34258e2fcab · 2026-10-16_07-05-14.md`, rubrique `Prompt`, avant `## Response`. Ce rapport historique ne suffisait pas à confirmer la configuration serveur. Le 18 octobre, le prompt courant a ensuite été relu dans Hermes Web, profil `friday`, fiche Tasks, puis complété avec les guides versionnés, les couvertures préparées et la synchronisation ciblée des deux brouillons. La sauvegarde a affiché « Tâche mise à jour ». Aucune mission n'a été lancée. La relecture finale de la fiche sauvegardée et le prochain passage naturel apportent des preuves distinctes ; ne pas confondre cette modification de consigne avec une vérification de l'authentification de production dans le runner.

Le rapport du 16 octobre signalait l'absence de moteur GEO et de générateur d'images utilisables ; il avait réussi parce que l'article était déjà public. Les méthodes versionnées et couvertures dédiées traitent ces dépendances documentaires et visuelles ; la nouvelle charte autorise explicitement la composition SVG/HTML sans génération IA. Leur présence effective sur le runner, le déploiement du nouveau contrat de style et les accès réseau/API doivent être distingués de la préparation locale. Le prochain passage naturel confirmera le fonctionnement du runner, sans déclencher une mission pour tester.
