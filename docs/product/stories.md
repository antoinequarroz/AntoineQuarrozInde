# Stories MVP — Visibilité SEO et GEO

## Statut et source

- **PRD source :** `docs/product/prd.md`
- **Validation produit :** Antoine Quarroz, 2 septembre 2026
- **Périmètre :** exigences MVP `SEO-R001` à `SEO-R022` et `GEO-R001` à `GEO-R008`
- **Décisions appliquées :** `OD-SEO-001`, `OD-SEO-002`, `OD-SEO-003`

## Epic E-SEO-01 — Contrôler l'identité indexable du site

### AQ-SEO-001 — Accéder au site par un domaine public unique

- **Acteur :** prospect ou crawler de recherche
- **Story :** En tant que visiteur du site, je veux arriver sur l'URL publique préférée quelle que soit la variante de domaine utilisée, afin de consulter et partager une adresse cohérente.
- **Valeur :** consolider les signaux de recherche, éviter les doublons de domaine et empêcher la publication accidentelle d'URL `.dev`.
- **Exigences :** `SEO-R005`, `SEO-R006`
- **Préconditions :** le domaine canonique validé est `https://www.antoinequarroz.ch` ; le déploiement VPS utilise Caddy.
- **Acceptation :**
  - une requête HTTPS vers `antoinequarroz.ch` retourne une redirection permanente vers `www.antoinequarroz.ch` en conservant chemin et paramètres ;
  - `www.antoinequarroz.ch` sert la page demandée sans boucle de redirection ;
  - le HTML, `robots.txt`, le sitemap et les données structurées de production ne contiennent aucune URL `.dev` ;
  - une configuration de production incomplète utilise explicitement `.ch` ou bloque la livraison avant exposition de mauvaises canonicals.
- **État d'erreur :** une boucle, une perte de paramètres ou une référence `.dev` fait échouer la vérification de release et laisse la version précédente en place.
- **État vide :** sans chemin après le domaine, la redirection aboutit à la racine canonique `/`.
- **Autorisation et auditabilité :** aucun rôle applicatif requis pour consulter la redirection ; tout changement de domaine ou de proxy passe par la revue du dépôt et une preuve HTTP post-déploiement.
- **Dépendances :** aucune.
- **Complexité :** 2/5
- **Hors périmètre :** changement de nom de domaine, migration DNS ou refonte de l'hébergement.

### AQ-SEO-002 — Exclure les surfaces privées des résultats de recherche

- **Acteur :** Antoine Quarroz en tant que propriétaire des espaces privés
- **Story :** En tant que propriétaire du site, je veux que les pages admin, portail et hors-ligne soient explicitement non indexables, afin qu'aucune surface opérationnelle ou sans valeur publique n'apparaisse dans les moteurs.
- **Valeur :** protéger la séparation public/privé et la qualité des résultats associés à la marque.
- **Exigences :** `SEO-R004`
- **Préconditions :** les familles de routes privées sont connues : `/admin/**`, `/portal/**` et `/offline`.
- **Acceptation :**
  - toute réponse HTML de ces familles expose `noindex, nofollow` dans une meta robots ou un header `X-Robots-Tag` ;
  - les pages de connexion répondent toujours normalement aux utilisateurs autorisés ;
  - les routes privées sont absentes du sitemap et des liens de navigation publique, hors accès fonctionnel explicitement voulu ;
  - une vérification couvre au minimum une page de connexion, une page admin protégée, une page portail et `/offline`.
- **État d'erreur :** si une route privée échantillonnée ne porte pas la directive, la release SEO est bloquée sans modifier ses contrôles d'accès existants.
- **État vide :** une route privée inexistante retourne son statut normal, jamais une page publique indexable de substitution.
- **Autorisation et auditabilité :** les droits applicatifs existants restent la source de vérité ; `noindex` n'est jamais traité comme un contrôle de sécurité ; les résultats de vérification sont conservés avec la release.
- **Dépendances :** aucune.
- **Complexité :** 3/5
- **Hors périmètre :** modification des rôles, de l'authentification ou des données du portail.

### AQ-SEO-003 — Choisir séparément visibilité ChatGPT et entraînement OpenAI

- **Acteur :** Antoine Quarroz
- **Story :** En tant que propriétaire du contenu, je veux autoriser la découverte dans ChatGPT Search tout en refusant l'utilisation par GPTBot pour l'entraînement, afin d'appliquer ma politique validée sans ambiguïté.
- **Valeur :** rendre le site éligible aux résultats ChatGPT tout en respectant le choix d'usage des contenus.
- **Exigences :** `GEO-R008`
- **Préconditions :** `OD-SEO-003` est validée ; les noms de crawlers sont confirmés dans la documentation officielle au moment de la livraison.
- **Acceptation :**
  - `robots.txt` autorise explicitement `OAI-SearchBot` sur les pages publiques ;
  - `robots.txt` refuse explicitement `GPTBot` ;
  - les règles génériques continuent d'autoriser les moteurs classiques sur les pages publiques ;
  - le sitemap canonique reste déclaré ;
  - un test automatisé prouve la présence et l'absence attendues des directives.
- **État d'erreur :** si les directives se contredisent ou bloquent le sitemap public, la release est refusée.
- **État vide :** si un crawler inconnu n'a pas de règle spécifique, la politique générique publique s'applique.
- **Autorisation et auditabilité :** seul un changement humainement approuvé peut modifier la politique entre recherche et entraînement ; la décision `OD-SEO-003` est référencée dans la revue.
- **Dépendances :** `AQ-SEO-001`.
- **Complexité :** 2/5
- **Hors périmètre :** garantie de citation par ChatGPT ou gestion des crawlers initiés directement par un utilisateur.

## Epic E-SEO-02 — Publier des versions linguistiques cohérentes

### AQ-SEO-004 — Consulter une page réellement localisée

- **Acteur :** prospect francophone, anglophone ou germanophone
- **Story :** En tant que prospect, je veux que la langue du contenu, des métadonnées et de l'URL concorde, afin de comprendre l'offre sans recevoir une version trompeuse ou dupliquée.
- **Valeur :** rendre les versions linguistiques fiables pour les visiteurs et les moteurs.
- **Exigences :** `SEO-R001`, `SEO-R002`, `SEO-R003`, `SEO-R011`, `SEO-R012`, `GEO-R007`
- **Préconditions :** l'accueil et les pages légales disposent de contenus humains approuvés en français, anglais et allemand ; `OD-SEO-001` est validée.
- **Acceptation :**
  - `/`, `/en` et `/de` exposent chacun un title, une description, un `lang`, un `og:url` et une canonical correspondant à leur propre langue et URL ;
  - chaque version liste des `hreflang` absolus, complets et réciproques pour `fr-CH`, `en-US`, `de-CH` et `x-default` ;
  - le sélecteur de langue expose des liens avec `href` vers les versions disponibles, utilisables sans JavaScript ;
  - les textes publics approuvés ne contiennent pas de chaînes inattendues dans une autre langue et passent un contrôle des accents, apostrophes et formulations ;
  - les pages légales appliquent les mêmes règles de canonical et d'alternates.
- **État d'erreur :** une traduction manquante, un alternate non réciproque ou une canonical vers une autre langue bloque la publication de la variante concernée sans masquer les variantes valides.
- **État vide :** si aucune variante alternative approuvée n'existe pour une page, seule la version source est indexable et aucun alternate fictif n'est émis.
- **Autorisation et auditabilité :** les traductions et métadonnées nécessitent une validation humaine d'Antoine avant publication ; la revue conserve les URL contrôlées par langue.
- **Dépendances :** `AQ-SEO-001`.
- **Complexité :** 4/5
- **Hors périmètre :** traduction automatique non relue et ajout d'une quatrième langue.

### AQ-SEO-005 — Ne pas exposer de fausses traductions des contenus francophones

- **Acteur :** prospect anglophone ou germanophone
- **Story :** En tant que prospect non francophone, je veux que les services, le blog et les cas clients non traduits ne soient pas présentés comme disponibles dans ma langue, afin de ne pas arriver sur un contenu français sous une URL localisée.
- **Valeur :** supprimer les duplications linguistiques et préserver la confiance jusqu'à validation de vraies traductions.
- **Exigences :** `SEO-R001`, `SEO-R002`, `SEO-R003`, `SEO-R007`, `SEO-R012`
- **Préconditions :** `OD-SEO-001` maintient ces contenus en français uniquement pour le MVP.
- **Acceptation :**
  - les services, `/blog`, les articles, `/cas-clients-valais` et les études de cas sans traduction approuvée n'exposent aucune variante `/en` ou `/de` indexable ;
  - ces variantes sont absentes du sitemap et des `hreflang` ;
  - une requête directe vers une ancienne variante localisée reçoit une redirection cohérente vers la version française ou un statut non indexable explicite, sans contenu français déclaré anglais ou allemand ;
  - l'ajout futur d'une traduction exige son contenu, ses métadonnées et ses alternates avant de rendre son URL indexable.
- **État d'erreur :** si une fausse variante retourne `200 index,follow`, le contrôle de visibilité échoue.
- **État vide :** un service sans traduction n'affiche pas de choix de langue inexistant sur sa page.
- **Autorisation et auditabilité :** seule une traduction humainement approuvée peut changer l'état de visibilité d'une variante ; la décision est traçable dans le contenu ou la revue associée.
- **Dépendances :** `AQ-SEO-004`.
- **Complexité :** 3/5
- **Hors périmètre :** rédaction des futures traductions anglaises et allemandes des services, articles et cas clients.

## Epic E-SEO-03 — Rendre chaque contenu public découvrable

### AQ-SEO-006 — Découvrir automatiquement tout contenu publié

- **Acteur :** prospect ou crawler de recherche
- **Story :** En tant que visiteur, je veux pouvoir découvrir chaque article, étude de cas et page publique publiée depuis le sitemap ou un lien interne, afin de ne pas dépendre d'une URL connue à l'avance.
- **Valeur :** réduire les pages orphelines et fiabiliser la découverte des contenus éditoriaux.
- **Exigences :** `SEO-R007`, `SEO-R008`, `SEO-R010`
- **Préconditions :** les statuts de publication des articles et études de cas sont disponibles dans leurs sources de vérité.
- **Acceptation :**
  - le sitemap contient les pages statiques indexables, `/cas-clients-valais`, chaque article publié et chaque étude de cas publiée ;
  - aucun brouillon, contenu privé, fausse traduction ou route opérationnelle n'y apparaît ;
  - chaque contenu dynamique utilise une date source fiable de publication ou modification ;
  - chaque contenu indexable possède au moins un lien entrant contextuel depuis une page publique indexable ;
  - la génération échappe correctement les URLs et produit un XML valide.
- **État d'erreur :** si la source dynamique est indisponible, le système signale l'échec de façon observable et ne présente pas silencieusement un sitemap déclaré complet mais amputé ; la stratégie de réponse reste vérifiable.
- **État vide :** sans article ou étude de cas publié, le sitemap statique reste valide et les sections éditoriales affichent un état vide utile sans lien mort.
- **Autorisation et auditabilité :** seules les entrées portant le statut public approuvé sont exposées ; la publication continue d'utiliser les autorisations admin et l'audit existants.
- **Dépendances :** `AQ-SEO-001`, `AQ-SEO-005`.
- **Complexité :** 4/5
- **Hors périmètre :** indexation des brouillons et création de pages locales supplémentaires.

### AQ-SEO-007 — Parcourir le blog sans exécuter JavaScript

- **Acteur :** lecteur ou crawler à capacités JavaScript limitées
- **Story :** En tant que lecteur du blog, je veux recevoir la liste des articles publiés et leurs liens dans le HTML initial, afin de pouvoir les découvrir même avant l'hydratation de l'application.
- **Valeur :** améliorer la robustesse de la navigation et la découverte des articles par tous les moteurs.
- **Exigences :** `SEO-R009`, `SEO-R010`
- **Préconditions :** l'API publique des articles peut distinguer contenus publiés et brouillons.
- **Acceptation :**
  - la réponse HTML initiale de `/blog` contient les titres, extraits, dates et liens des articles publiés ;
  - aucun brouillon n'est exposé dans le payload ou le HTML public ;
  - l'hydratation conserve la même liste sans erreur de divergence ;
  - les liens restent navigables lorsque JavaScript est désactivé.
- **État d'erreur :** si le chargement échoue, la page retourne ou affiche un état d'erreur explicite et non une fausse liste vide durablement cachée aux contrôles.
- **État vide :** lorsqu'aucun article n'est publié, un message clair est rendu côté serveur et aucun squelette infini n'est affiché.
- **Autorisation et auditabilité :** les règles de publication existantes déterminent la visibilité ; aucun jeton admin ni donnée de brouillon n'est transmis au public.
- **Dépendances :** `AQ-SEO-006`.
- **Complexité :** 3/5
- **Hors périmètre :** refonte graphique du blog ou création de nouveaux articles.

## Epic E-SEO-04 — Établir une identité et des contenus interprétables

### AQ-SEO-008 — Identifier clairement Antoine et son activité dans les résultats et partages

- **Acteur :** prospect découvrant Antoine depuis un moteur ou un partage social
- **Story :** En tant que prospect, je veux voir une identité professionnelle cohérente, une image reconnaissable et des coordonnées exactes, afin de pouvoir attribuer l'offre à la bonne personne et au bon établissement.
- **Valeur :** renforcer la compréhension de l'entité, la confiance locale et la qualité des cartes sociales.
- **Exigences :** `SEO-R013`, `SEO-R014`, `SEO-R017`
- **Préconditions :** les coordonnées visibles, les profils LinkedIn et GitHub et l'image de marque sont approuvés.
- **Acceptation :**
  - l'accueil expose des données structurées cohérentes pour Antoine et son activité, avec adresse complète, localité Saint-Martin, région Valais, code postal, pays, téléphone, e-mail et profils approuvés ;
  - les données structurées correspondent exactement aux informations visibles ;
  - chaque page indexable possède une image sociale absolue, accessible et dotée d'un texte alternatif pertinent ;
  - les articles et études de cas utilisent leur image approuvée lorsqu'elle existe, sinon l'image de marque ;
  - le JSON-LD est syntaxiquement valide et sans erreur critique applicable.
- **État d'erreur :** une image inaccessible ou une divergence entre données visibles et structurées utilise le fallback approuvé ou bloque la release de la page concernée.
- **État vide :** un profil social ou une donnée non approuvée est omis proprement plutôt que produit sous forme vide ou inventée.
- **Autorisation et auditabilité :** toute modification des coordonnées ou `sameAs` exige une validation d'Antoine et une preuve de cohérence avec la page visible.
- **Dépendances :** `AQ-SEO-001`.
- **Complexité :** 3/5
- **Hors périmètre :** création ou revendication d'une fiche Google Business Profile.

### AQ-SEO-009 — Comprendre l'auteur et la fraîcheur d'un article

- **Acteur :** lecteur évaluant un article
- **Story :** En tant que lecteur, je veux identifier l'auteur, la date de publication et la date de mise à jour d'un article, afin d'évaluer sa provenance et son actualité.
- **Valeur :** rendre les articles attribuables, vérifiables et plus faciles à interpréter par les moteurs.
- **Exigences :** `SEO-R015`, `SEO-R017`, `GEO-R005`
- **Préconditions :** chaque article publié dispose d'un auteur approuvé et d'une date source fiable ; le modèle peut représenter une modification si elle existe.
- **Acceptation :**
  - la page affiche l'auteur et la date de publication ;
  - une date de modification n'est affichée et structurée que lorsqu'elle existe réellement ;
  - le JSON-LD `BlogPosting` reprend le titre, la description, l'auteur, les dates, l'image, la langue et l'URL canonique visibles ;
  - le profil ou l'URL de l'auteur permet de relier Antoine à l'entité de l'accueil ;
  - la validation structurée ne présente aucune erreur critique applicable.
- **État d'erreur :** un article sans auteur ou date valide ne peut pas passer à l'état public.
- **État vide :** l'absence de date de modification n'invente aucune valeur et conserve uniquement la date de publication.
- **Autorisation et auditabilité :** seuls les administrateurs autorisés publient ou modifient un article ; les dates sources et l'auteur sont traçables depuis l'enregistrement éditorial.
- **Dépendances :** `AQ-SEO-007`, `AQ-SEO-008`.
- **Complexité :** 3/5
- **Hors périmètre :** gestion multi-auteurs avancée ou programme éditorial complet.

### AQ-SEO-010 — Comprendre la nature d'un service et le chemin de navigation

- **Acteur :** prospect consultant un service ou un contenu profond
- **Story :** En tant que prospect, je veux comprendre le service présenté et ma position dans le site, afin de relier facilement l'offre, les preuves et les autres contenus pertinents.
- **Valeur :** renforcer la clarté sémantique et la navigation entre services, cas clients et articles.
- **Exigences :** `SEO-R016`, `SEO-R017`
- **Préconditions :** les pages françaises de services sont publiques et leurs intitulés sont approuvés.
- **Acceptation :**
  - chaque page de service expose un objet `Service` correspondant au service visible, à son fournisseur et à sa zone réellement servie ;
  - chaque article, service et étude de cas profond expose un fil d'Ariane visible ou sémantiquement équivalent et un `BreadcrumbList` cohérent ;
  - les URLs structurées correspondent aux canonicals ;
  - aucune propriété ne décrit un prix, une note, un résultat ou une disponibilité non visible et non approuvée ;
  - la validation ne présente aucune erreur critique applicable.
- **État d'erreur :** une donnée structurée incompatible avec le contenu visible est retirée ou bloque la release de la page.
- **État vide :** sans information approuvée pour une propriété optionnelle, celle-ci est omise sans valeur artificielle.
- **Autorisation et auditabilité :** les valeurs commerciales suivent la validation de contenu d'Antoine ; la revue associe chaque objet structuré à son contenu visible.
- **Dépendances :** `AQ-SEO-005`, `AQ-SEO-008`.
- **Complexité :** 3/5
- **Hors périmètre :** balisage destiné à garantir un rich result ou ajout de faux avis agrégés.

## Epic E-GEO-01 — Publier une expertise utile et vérifiable

### AQ-SEO-011 — Répondre aux questions de décision sur chaque service

- **Acteur :** prospect évaluant un service
- **Story :** En tant que prospect, je veux trouver une réponse directe sur l'offre, les livrables, le déroulement, les délais et les limites, afin de décider si je dois contacter Antoine.
- **Valeur :** transformer les pages commerciales génériques en contenus utiles, différenciés et citables.
- **Exigences :** `GEO-R001`, `GEO-R002`, `GEO-R004`, `GEO-R006`, `GEO-R007`
- **Préconditions :** Antoine fournit ou approuve les informations commerciales réelles ; `OD-SEO-002` est validée.
- **Acceptation :**
  - chaque page de service commence par une réponse autonome indiquant l'offre, le public concerné et la zone servie ;
  - elle couvre les livrables, le processus, les délais habituels, les limites et la prochaine étape ;
  - les titres permettent de retrouver directement chaque question de décision ;
  - les prix, délais précis et autres affirmations variables ne sont publiés que lorsqu'Antoine les a vérifiés et approuvés ;
  - le français final corrige accents, apostrophes, encodage et formulations artificielles ;
  - les liens conduisent vers au moins une preuve pertinente et vers le contact.
- **État d'erreur :** une affirmation non sourcée ou non approuvée reste en brouillon et n'apparaît pas sur la page publique.
- **État vide :** si aucun prix ou délai précis n'est approuvé, la page explique les facteurs de cadrage sans inventer de fourchette.
- **Autorisation et auditabilité :** Antoine est le validateur humain obligatoire avant publication ; les affirmations sensibles approuvées sont identifiables dans la revue de contenu.
- **Dépendances :** `AQ-SEO-005`, `AQ-SEO-006`.
- **Complexité :** 4/5
- **Hors périmètre :** garantie de résultat SEO, génération massive de pages locales et traduction des services.

### AQ-SEO-012 — Évaluer un projet au moyen de preuves approuvées

- **Acteur :** prospect comparant l'expérience d'Antoine à son propre besoin
- **Story :** En tant que prospect, je veux consulter des études de cas qui distinguent clairement contexte, rôle, décisions et résultats, afin d'évaluer la crédibilité et la pertinence de l'expérience présentée.
- **Valeur :** fournir des preuves attribuables et réduire les affirmations commerciales vagues.
- **Exigences :** `GEO-R003`, `GEO-R004`, `GEO-R006`
- **Préconditions :** un projet peut être publié comme étude de cas ; les permissions de divulgation sont connues ; `OD-SEO-002` est validée.
- **Acceptation :**
  - chaque étude publiée présente au minimum le contexte, le rôle d'Antoine, le périmètre, les décisions et le résultat disponible ;
  - un nom de client, un lien, un témoignage ou un chiffre n'est visible qu'après approbation explicite ;
  - un résultat quantifié indique sa période ou son contexte de mesure lorsqu'ils sont disponibles ;
  - un projet confidentiel reste anonyme et n'utilise aucune fausse précision pour compenser ;
  - les sections utilisent des intitulés explicites et des paragraphes compréhensibles isolément ;
  - la page cas clients et les études dynamiques se lient aux services pertinents.
- **État d'erreur :** si le consentement ou la preuve d'une affirmation est absent, le champ concerné reste privé ou la publication est bloquée selon sa criticité.
- **État vide :** sans résultat chiffré vérifié, l'étude décrit uniquement les résultats qualitatifs réellement observés et approuvés.
- **Autorisation et auditabilité :** seul un administrateur autorisé peut publier ; Antoine réalise la validation finale ; l'état public et les changements sensibles restent couverts par l'audit existant.
- **Dépendances :** `AQ-SEO-006`, `AQ-SEO-011`.
- **Complexité :** 4/5
- **Hors périmètre :** sollicitation automatique de témoignages, invention de données ou publication sans consentement.

## Epic E-SEO-05 — Préserver l'expérience et mesurer les résultats

### AQ-SEO-013 — Comprendre et utiliser le hero sans dépendre de la scène 3D

- **Acteur :** visiteur sur réseau lent, terminal limité ou avec mouvement réduit
- **Story :** En tant que visiteur, je veux lire la proposition de valeur et utiliser les appels à l'action avant ou sans la scène 3D, afin d'accéder au contenu critique dans toutes les conditions raisonnables.
- **Valeur :** réduire le risque de perte de conversion et améliorer la robustesse de l'expérience initiale.
- **Exigences :** `SEO-R018`, `SEO-R019`
- **Préconditions :** le texte, les CTA et l'identité visuelle actuelle du hero sont conservés.
- **Acceptation :**
  - le titre, le texte et les CTA sont présents dans le HTML et utilisables avant le chargement de Spline ;
  - un fallback visuel de marque s'affiche lorsque la scène est retardée, indisponible ou volontairement évitée ;
  - `prefers-reduced-motion` empêche les animations non essentielles prévues par le périmètre ;
  - une erreur de chargement de la scène ne masque ni ne décale durablement le contenu critique ;
  - les parcours mobile et desktop restent fonctionnels au clavier et au toucher.
- **État d'erreur :** toute erreur Spline est contenue sans boucle, écran vide ni CTA inutilisable.
- **État vide :** sans support WebGL ou sans scène configurée, le fallback reste la présentation finale stable.
- **Autorisation et auditabilité :** aucun accès privilégié requis ; les changements sont vérifiés par scénarios réseau lent, mouvement réduit et échec de ressource.
- **Dépendances :** aucune.
- **Complexité :** 4/5
- **Hors périmètre :** remplacement de l'identité visuelle ou suppression obligatoire de Spline.

### AQ-SEO-014 — Vérifier les budgets et contrôles SEO avant et après livraison

- **Acteur :** Antoine Quarroz en tant que propriétaire produit
- **Story :** En tant que propriétaire du site, je veux disposer de preuves reproductibles sur les performances et les éléments SEO critiques, afin de détecter une régression avant qu'elle n'affecte durablement la visibilité.
- **Valeur :** rendre les améliorations mesurables et protéger leur qualité dans le temps.
- **Exigences :** `SEO-R020`, `SEO-R022`
- **Préconditions :** les pages critiques et l'environnement de vérification sont définis ; les données terrain peuvent être absentes.
- **Acceptation :**
  - les contrôles couvrent statuts HTTP, redirects, canonicals, robots, `hreflang`, sitemap, données structurées et HTML initial des pages critiques ;
  - une baseline laboratoire reproductible est conservée pour les performances ;
  - lorsque les données terrain sont disponibles, le suivi rapporte LCP, INP et CLS au 75e percentile face aux budgets validés ;
  - l'absence de données terrain est affichée comme indisponible, jamais comme une valeur nulle ou estimée ;
  - une régression critique bloque la release ou produit une décision d'acceptation humaine documentée.
- **État d'erreur :** un contrôle indisponible ou non concluant est distingué d'un succès et laisse une preuve exploitable.
- **État vide :** sans données terrain suffisantes, seule la baseline laboratoire est présentée avec sa date et son environnement.
- **Autorisation et auditabilité :** les résultats de release sont lisibles par Antoine ; toute dérogation à un échec critique exige une justification humaine traçable.
- **Dépendances :** `AQ-SEO-001` à `AQ-SEO-013` selon les contrôles concernés.
- **Complexité :** 4/5
- **Hors périmètre :** garantie d'atteinte des Core Web Vitals indépendamment du trafic, du terminal ou du réseau.

### AQ-SEO-015 — Attribuer les contacts aux sources organiques et génératives

- **Acteur :** Antoine Quarroz
- **Story :** En tant que propriétaire de la vitrine, je veux distinguer les contacts provenant de moteurs classiques et génératifs, afin de prioriser les contenus qui contribuent réellement aux demandes.
- **Valeur :** relier visibilité, trafic et conversion sans se limiter aux impressions.
- **Exigences :** `SEO-R021`, `SEO-R022`
- **Préconditions :** Plausible et les événements de contact existants restent disponibles ; aucune donnée personnelle supplémentaire n'est nécessaire.
- **Acceptation :**
  - une visite conserve la source et les paramètres d'acquisition déjà autorisés jusqu'à l'événement de contact ;
  - les référents connus de moteurs génératifs peuvent être distingués des sources organiques classiques sans classification mensongère des sources inconnues ;
  - les soumissions de contact, clics de rendez-vous et autres conversions retenues restent fonctionnels ;
  - un contrôle reproductible vérifie au moins une source organique, une source générative simulée, une source directe et une source inconnue ;
  - aucune donnée personnelle nouvelle non nécessaire n'est envoyée à l'outil de mesure.
- **État d'erreur :** si l'analytics est indisponible ou bloqué, le parcours de contact continue normalement sans perdre la demande.
- **État vide :** une source absente reste classée comme directe ou non attribuée selon la convention documentée, jamais comme trafic IA par défaut.
- **Autorisation et auditabilité :** les données agrégées suivent les accès analytics existants ; toute nouvelle donnée collectée nécessite une validation vie privée avant activation.
- **Dépendances :** `AQ-SEO-014`.
- **Complexité :** 3/5
- **Hors périmètre :** identification individuelle des visiteurs, fingerprinting ou garantie d'attribution lorsque le référent est masqué.

## Ordre de livraison recommandé

1. **Contrôle de visibilité :** `AQ-SEO-001`, `AQ-SEO-002`, `AQ-SEO-003`.
2. **Cohérence linguistique :** `AQ-SEO-004`, `AQ-SEO-005`.
3. **Découverte éditoriale :** `AQ-SEO-006`, `AQ-SEO-007`.
4. **Identité et sémantique :** `AQ-SEO-008`, `AQ-SEO-009`, `AQ-SEO-010`.
5. **Contenu GEO :** `AQ-SEO-011`, `AQ-SEO-012`.
6. **Expérience et mesure :** `AQ-SEO-013`, `AQ-SEO-014`, `AQ-SEO-015`.

## Portes transversales obligatoires

- **Visibilité :** aucune URL ne devient indexable sans canonical propre, langue cohérente, statut public et inclusion volontaire dans la stratégie de découverte.
- **Sécurité :** `noindex`, sitemap et robots ne remplacent jamais l'authentification ou l'autorisation applicative.
- **Validation humaine :** aucune traduction, donnée client, preuve, prix, délai, témoignage ou résultat chiffré n'est publié sans approbation d'Antoine.
- **IA :** `OAI-SearchBot` est autorisé et `GPTBot` refusé conformément à `OD-SEO-003` ; tout changement exige une nouvelle décision humaine.
- **Vie privée :** la mesure d'acquisition n'ajoute aucune donnée personnelle non nécessaire et ne bloque jamais le parcours de contact.
- **Release :** une erreur critique d'indexation, de sécurité, de données structurées ou de parcours de contact bloque la livraison ou exige une dérogation humaine explicitement documentée.

## Matrice de couverture MVP

| Exigence | Stories |
|---|---|
| `SEO-R001` | `AQ-SEO-004`, `AQ-SEO-005` |
| `SEO-R002` | `AQ-SEO-004`, `AQ-SEO-005` |
| `SEO-R003` | `AQ-SEO-004`, `AQ-SEO-005` |
| `SEO-R004` | `AQ-SEO-002` |
| `SEO-R005` | `AQ-SEO-001` |
| `SEO-R006` | `AQ-SEO-001` |
| `SEO-R007` | `AQ-SEO-005`, `AQ-SEO-006` |
| `SEO-R008` | `AQ-SEO-006` |
| `SEO-R009` | `AQ-SEO-007` |
| `SEO-R010` | `AQ-SEO-006`, `AQ-SEO-007` |
| `SEO-R011` | `AQ-SEO-004` |
| `SEO-R012` | `AQ-SEO-004`, `AQ-SEO-005` |
| `SEO-R013` | `AQ-SEO-008` |
| `SEO-R014` | `AQ-SEO-008` |
| `SEO-R015` | `AQ-SEO-009` |
| `SEO-R016` | `AQ-SEO-010` |
| `SEO-R017` | `AQ-SEO-008`, `AQ-SEO-009`, `AQ-SEO-010` |
| `SEO-R018` | `AQ-SEO-013` |
| `SEO-R019` | `AQ-SEO-013` |
| `SEO-R020` | `AQ-SEO-014` |
| `SEO-R021` | `AQ-SEO-015` |
| `SEO-R022` | `AQ-SEO-014`, `AQ-SEO-015` |
| `GEO-R001` | `AQ-SEO-011` |
| `GEO-R002` | `AQ-SEO-011` |
| `GEO-R003` | `AQ-SEO-012` |
| `GEO-R004` | `AQ-SEO-011`, `AQ-SEO-012` |
| `GEO-R005` | `AQ-SEO-009` |
| `GEO-R006` | `AQ-SEO-011`, `AQ-SEO-012` |
| `GEO-R007` | `AQ-SEO-004`, `AQ-SEO-011` |
| `GEO-R008` | `AQ-SEO-003` |

---

# Stories — Dashboard éditorial des projets

## Statut et source

- **PRD source :** extension « Édition et publication des projets » de `docs/product/prd.md`.
- **Validation produit :** Antoine Quarroz, 3 septembre 2026.
- **Périmètre :** exigences `PROJ-R001` à `PROJ-R010` et décisions `OD-PROJ-001` à `OD-PROJ-005`.

## Epic E-PROJ-01 — Maîtriser le cycle de vie d'un projet

### AQ-PROJ-001 — Distinguer le portfolio de l'étude de cas

- **Acteur :** Antoine Quarroz.
- **Story :** En tant qu'administrateur, je veux choisir séparément si un projet apparaît dans le portfolio et si son étude de cas est publique, afin de présenter rapidement un projet sans devoir rédiger une page détaillée.
- **Valeur :** supprimer le blocage éditorial actuel et rendre les états de publication compréhensibles.
- **Exigences :** `PROJ-R001`, `PROJ-R010`.
- **Préconditions :** le projet possède un titre, une catégorie, une description française, une image de couverture et une URL publique valides.
- **Acceptation :**
  - le dashboard expose deux contrôles distincts, libellés sans ambiguïté, pour le portfolio et l'étude de cas ;
  - un projet minimal peut être rendu visible dans le portfolio avec l'étude de cas en brouillon ;
  - retirer un projet du portfolio ne publie ni ne supprime son étude de cas ;
  - désactiver l'étude retire sa page et ses liens publics sans supprimer les données éditoriales ;
  - les listes du dashboard affichent les deux états séparément.
- **État d'erreur :** une demande incohérente est refusée avec le champ à corriger et aucun état public partiel n'est appliqué.
- **État vide :** un nouveau projet commence comme brouillon non visible, sans étude publiée.
- **Autorisation et auditabilité :** seul un administrateur peut modifier ces états ; chaque changement conserve l'auteur, la date, l'ancien état et le nouvel état.
- **Dépendances :** aucune.
- **Complexité :** 3/5.
- **Hors périmètre :** suppression définitive du projet et workflow d'approbation multi-utilisateur.

### AQ-PROJ-002 — Saisir une étude de cas complète en trois langues

- **Acteur :** Antoine Quarroz.
- **Story :** En tant qu'éditeur, je veux rédiger le contexte, le rôle, l'approche, la solution, les résultats et les livrables en FR, EN et DE, afin de préparer des études de cas réellement localisées.
- **Valeur :** rendre les preuves compréhensibles aux prospects sans dupliquer ni mélanger les contenus.
- **Exigences :** `PROJ-R002`, `PROJ-R003`, `PROJ-R010`.
- **Préconditions :** un projet existe et les trois langues éditoriales sont définies.
- **Acceptation :**
  - chaque champ détaillé peut être édité indépendamment dans les trois langues ;
  - changer d'onglet linguistique ne perd aucune saisie non publiée ;
  - les limites et aides de rédaction sont identiques et adaptées à la langue active ;
  - une traduction vide n'empêche pas de sauvegarder les autres langues ;
  - les preuves, noms, liens et chiffres restent soumis à validation humaine avant publication.
- **État d'erreur :** un champ trop long ou invalide est identifié dans sa langue sans effacer les autres valeurs.
- **État vide :** une langue sans contenu affiche un état de départ clair, jamais une copie enregistrée automatiquement du français.
- **Autorisation et auditabilité :** seules les personnes administratrices éditent ces champs ; les modifications sensibles sont attribuables par langue.
- **Dépendances :** `AQ-PROJ-001`.
- **Complexité :** 4/5.
- **Hors périmètre :** traduction automatique et ajout d'une quatrième langue.

### AQ-PROJ-003 — Prévisualiser et comprendre la complétude par langue

- **Acteur :** Antoine Quarroz.
- **Story :** En tant qu'éditeur, je veux voir ce qui manque et prévisualiser le rendu FR, EN ou DE avant publication, afin de corriger les incohérences sans tester directement sur le site public.
- **Valeur :** réduire les erreurs de langue, de mise en page et de contenu incomplet.
- **Exigences :** `PROJ-R004`, `PROJ-R010`.
- **Préconditions :** le projet peut contenir des valeurs distinctes par langue.
- **Acceptation :**
  - chaque langue possède un badge `vide`, `incomplète`, `prête` ou `publiée` calculé à partir de règles explicites ;
  - le détail du badge liste les champs manquants avec un accès direct au champ concerné ;
  - l'aperçu permet de basculer entre carte du portfolio et étude de cas ;
  - l'aperçu reproduit les règles publiques de fallback, de liens, de médias et de langue déclarée ;
  - les listes du dashboard peuvent filtrer les projets par état de traduction.
- **État d'erreur :** si l'aperçu ne peut pas être produit, le brouillon reste éditable et l'échec est distingué d'un contenu incomplet.
- **État vide :** une langue vide affiche le squelette du rendu et la liste des contenus nécessaires, sans faux texte public.
- **Autorisation et auditabilité :** l'aperçu reste privé et ne crée aucune URL indexable ; son accès suit les droits administrateur.
- **Dépendances :** `AQ-PROJ-002`.
- **Complexité :** 4/5.
- **Hors périmètre :** partage public d'un lien de prévisualisation sans authentification.

### AQ-PROJ-004 — Publier chaque langue uniquement lorsqu'elle est prête

- **Acteur :** Antoine Quarroz.
- **Story :** En tant que validateur, je veux publier ou retirer séparément les variantes FR, EN et DE d'une étude de cas, afin qu'aucune URL localisée ne présente une traduction incomplète ou française par défaut.
- **Valeur :** préserver la crédibilité linguistique et la cohérence SEO du site.
- **Exigences :** `PROJ-R003`, `PROJ-R004`, `PROJ-R010`, `SEO-R001` à `SEO-R003`, `SEO-R007`, `SEO-R012`.
- **Préconditions :** la complétude de la langue est `prête` et Antoine a relu les affirmations publiables.
- **Acceptation :**
  - une langue ne peut être publiée que si tous ses champs requis sont complets ;
  - une variante publiée possède sa propre URL, canonical, métadonnées, alternates et entrée de sitemap cohérentes ;
  - une langue non publiée ne crée ni page indexable, ni alternate, ni entrée de sitemap ;
  - le retrait d'une variante conserve son brouillon et retire proprement ses signaux de découverte ;
  - le fallback français de la carte portfolio n'est jamais utilisé dans le corps d'une étude localisée.
- **État d'erreur :** une publication échouée conserve l'ancien état public et fournit une raison vérifiable.
- **État vide :** si seule la version française est prête, seule cette page existe ; les sélecteurs n'annoncent pas EN ou DE.
- **Autorisation et auditabilité :** publication réservée à l'administrateur ; auteur, date, langue et décision sont journalisés.
- **Dépendances :** `AQ-PROJ-001`, `AQ-PROJ-002`, `AQ-PROJ-003`.
- **Complexité :** 4/5.
- **Hors périmètre :** publication automatique à partir d'une traduction générée.

## Epic E-PROJ-02 — Fiabiliser les médias, les liens et le référencement

### AQ-PROJ-005 — Publier des images accessibles et optimisées

- **Acteur :** Antoine Quarroz et visiteur du portfolio.
- **Story :** En tant qu'éditeur, je veux définir le cadrage et le texte alternatif des images dans chaque langue, afin d'obtenir un portfolio rapide et compréhensible avec ou sans image visible.
- **Valeur :** améliorer accessibilité, performance, partage et compréhension des projets.
- **Exigences :** `PROJ-R005`, `PROJ-R010`, `SEO-R013`.
- **Préconditions :** le projet accepte une couverture et une galerie facultative.
- **Acceptation :**
  - la couverture publiée exige un texte alternatif pertinent pour chaque langue où elle apparaît ;
  - un fallback explicite peut reprendre le titre du projet seulement après validation visible par l'éditeur ;
  - l'aperçu montre le cadrage utilisé sur les formats principaux du portfolio ;
  - les variantes publiques privilégient un format et une taille proportionnés sans dégrader visiblement l'image source ;
  - une image supprimée ou invalide n'affiche pas un cadre cassé ni une URL interne.
- **État d'erreur :** un traitement échoué conserve l'original privé, signale l'échec et empêche uniquement la publication du média concerné.
- **État vide :** sans galerie, la couverture reste suffisante ; sans couverture valide, le projet ne peut pas devenir visible dans le portfolio.
- **Autorisation et auditabilité :** téléversement et édition réservés à l'administrateur ; l'origine et les variantes actives restent attribuables.
- **Dépendances :** `AQ-PROJ-001`.
- **Complexité :** 4/5.
- **Hors périmètre :** médiathèque générale, retouche photo avancée et génération d'images.

### AQ-PROJ-006 — Contrôler les liens publics et GitHub

- **Acteur :** Antoine Quarroz.
- **Story :** En tant qu'éditeur, je veux savoir si les liens d'un projet sont valides et récemment accessibles, afin d'éviter d'envoyer un prospect vers une page cassée.
- **Valeur :** protéger la confiance et les conversions sans rendre le dashboard fragile face aux pannes externes.
- **Exigences :** `PROJ-R006`, `PROJ-R010`.
- **Préconditions :** l'URL publique est obligatoire ; GitHub reste facultatif.
- **Acceptation :**
  - seules les URLs HTTP(S) syntaxiquement valides sont enregistrées ;
  - le dashboard permet un contrôle explicite et affiche résultat, date et URL finale après redirections sûres ;
  - une indisponibilité temporaire produit un avertissement mais permet de sauvegarder le brouillon ;
  - l'éditeur doit confirmer une publication lorsqu'un lien obligatoire reste en avertissement ;
  - l'absence de GitHub ne bloque ni portfolio ni étude de cas.
- **État d'erreur :** délai dépassé, TLS invalide, boucle ou destination interdite sont distingués sans révéler de détails réseau sensibles.
- **État vide :** le champ GitHub vide est présenté comme facultatif et ne génère aucun bouton public.
- **Autorisation et auditabilité :** contrôle déclenché ou consulté uniquement depuis l'administration ; dernier résultat et date sont conservés sans données personnelles.
- **Dépendances :** `AQ-PROJ-001`.
- **Complexité :** 3/5.
- **Hors périmètre :** monitoring continu, contournement des protections distantes et validation du contenu des sites tiers.

### AQ-PROJ-007 — Préparer le SEO de chaque projet par langue

- **Acteur :** Antoine Quarroz.
- **Story :** En tant qu'éditeur, je veux rédiger et prévisualiser le titre et la description SEO de chaque langue, afin de publier des pages cohérentes avec leur contenu et leur intention.
- **Valeur :** améliorer la qualité des résultats et partages sans générer de métadonnées trompeuses.
- **Exigences :** `PROJ-R007`, `PROJ-R010`, `SEO-R012`, `SEO-R013`, `SEO-R017`.
- **Préconditions :** la variante linguistique possède un contenu visible et une image approuvée.
- **Acceptation :**
  - chaque langue possède un titre et une description SEO indépendants avec compteurs et limites explicites ;
  - l'aperçu montre titre, URL, description et image sociale réellement utilisés ;
  - un fallback éditorial documenté peut être proposé depuis le contenu de la même langue, jamais depuis une autre langue ;
  - les métadonnées publiées correspondent au titre, à la langue, à l'URL et à l'image visibles ;
  - toute variante prête passe les contrôles structurés applicables avant publication.
- **État d'erreur :** une métadonnée invalide ou contradictoire bloque uniquement la langue concernée et indique la correction attendue.
- **État vide :** avant publication, les champs peuvent rester vides et l'aperçu indique le fallback de même langue qui serait utilisé.
- **Autorisation et auditabilité :** édition et validation réservées à l'administrateur ; les valeurs publiées sont traçables par langue.
- **Dépendances :** `AQ-PROJ-002`, `AQ-PROJ-003`, `AQ-PROJ-004`, `AQ-PROJ-005`.
- **Complexité :** 4/5.
- **Hors périmètre :** garantie de classement, génération automatique de mots-clés et publication de données structurées non visibles.

## Epic E-PROJ-03 — Organiser le travail éditorial sans perte

### AQ-PROJ-008 — Ordonner et programmer les projets visibles

- **Acteur :** Antoine Quarroz.
- **Story :** En tant qu'administrateur, je veux choisir l'ordre du portfolio et programmer une publication ou un retrait, afin d'adapter ma vitrine sans intervention technique urgente.
- **Valeur :** garder les projets prioritaires visibles et préparer les lancements à l'avance.
- **Exigences :** `PROJ-R008`, `PROJ-R010`.
- **Préconditions :** plusieurs projets existent et leurs états de publication sont connus.
- **Acceptation :**
  - l'ordre peut être modifié avec une alternative clavier accessible au glisser-déposer ;
  - le nouvel ordre reste identique après rechargement et sur toutes les langues ;
  - une date future de publication ou retrait est affichée en `Europe/Zurich` avec son fuseau explicite ;
  - un projet programmé n'apparaît pas avant l'heure et respecte toujours les portes de complétude ;
  - le dashboard distingue clairement brouillon, programmé, publié et retiré.
- **État d'erreur :** un conflit d'ordre ou de programmation conserve l'état public précédent et demande un rafraîchissement avant nouvelle tentative.
- **État vide :** avec zéro ou un projet visible, l'ordre reste stable et aucun contrôle inutile n'est imposé.
- **Autorisation et auditabilité :** seuls les administrateurs ordonnent ou programment ; chaque changement conserve auteur, date et valeur précédente.
- **Dépendances :** `AQ-PROJ-001`, `AQ-PROJ-004`.
- **Complexité :** 4/5.
- **Hors périmètre :** personnalisation de l'ordre par visiteur et expérimentation automatique.

### AQ-PROJ-009 — Récupérer automatiquement un brouillon interrompu

- **Acteur :** Antoine Quarroz.
- **Story :** En tant qu'éditeur, je veux retrouver une saisie interrompue après une fermeture ou une panne réseau, afin de ne pas perdre le travail réalisé sur un formulaire long.
- **Valeur :** sécuriser le temps éditorial tout en conservant une publication entièrement volontaire.
- **Exigences :** `PROJ-R009`, `PROJ-R010`.
- **Préconditions :** l'utilisateur est authentifié et édite un projet existant ou un nouveau brouillon.
- **Acceptation :**
  - les changements privés sont sauvegardés automatiquement après une courte période d'inactivité ;
  - l'interface distingue clairement `modifications en cours`, `sauvegardé`, `hors ligne` et `échec` ;
  - après retour sur le formulaire, l'éditeur peut reprendre ou abandonner le brouillon récupéré ;
  - une version serveur plus récente ne peut pas être écrasée silencieusement ;
  - aucune sauvegarde automatique ne modifie les états de visibilité ou ne publie une langue.
- **État d'erreur :** une sauvegarde impossible conserve la saisie locale, avertit l'utilisateur et permet une nouvelle tentative sans duplication.
- **État vide :** sans modification, aucun faux brouillon ni avertissement de récupération n'est créé.
- **Autorisation et auditabilité :** les brouillons suivent l'isolation et les droits administrateur existants ; sauvegarde, reprise, abandon et conflit sont attribuables.
- **Dépendances :** `AQ-PROJ-002`, `AQ-PROJ-005`, `AQ-PROJ-007`.
- **Complexité :** 4/5.
- **Hors périmètre :** édition collaborative temps réel et publication automatique à la récupération.

## Ordre de livraison recommandé — Projets

1. `AQ-PROJ-001` — séparer portfolio et étude de cas.
2. `AQ-PROJ-002` — étendre les contenus FR/EN/DE.
3. `AQ-PROJ-003` — complétude et prévisualisation.
4. `AQ-PROJ-004` — publication indépendante par langue.
5. `AQ-PROJ-005` et `AQ-PROJ-006` — médias et liens fiables.
6. `AQ-PROJ-007` — SEO localisé.
7. `AQ-PROJ-008` — ordre et programmation.
8. `AQ-PROJ-009` — autosauvegarde complète du formulaire enrichi.

## Portes transversales — Projets

- **Validation humaine :** aucune traduction, preuve, donnée client ou publication n'est approuvée automatiquement.
- **Visibilité :** un brouillon, une langue incomplète ou un projet retiré ne produit aucune URL indexable inattendue.
- **Sécurité :** aperçu et brouillons restent privés ; la validation d'URL ne permet pas d'interroger des destinations internes ou non sûres.
- **Accessibilité :** états, onglets, aperçu, tri et erreurs restent compréhensibles au clavier et par lecteur d'écran.
- **Audit :** les changements de publication, langue, ordre et programmation sont attribuables.
- **Release :** les migrations restent rétrocompatibles et passent la livraison Supabase contrôlée avant le conteneur.

## Matrice de couverture — Projets

| Exigence | Stories |
|---|---|
| `PROJ-R001` | `AQ-PROJ-001` |
| `PROJ-R002` | `AQ-PROJ-002` |
| `PROJ-R003` | `AQ-PROJ-002`, `AQ-PROJ-004` |
| `PROJ-R004` | `AQ-PROJ-003`, `AQ-PROJ-004` |
| `PROJ-R005` | `AQ-PROJ-005` |
| `PROJ-R006` | `AQ-PROJ-006` |
| `PROJ-R007` | `AQ-PROJ-007` |
| `PROJ-R008` | `AQ-PROJ-008` |
| `PROJ-R009` | `AQ-PROJ-009` |
| `PROJ-R010` | `AQ-PROJ-001` à `AQ-PROJ-009` |
