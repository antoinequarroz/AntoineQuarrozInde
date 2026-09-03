# PRD — Visibilité SEO et GEO de la vitrine Antoine Quarroz

## Statut

- **État :** validé par Antoine Quarroz le 2 septembre 2026
- **Périmètre :** MVP de fiabilisation SEO/GEO de la vitrine publique
- **Source :** audit du code et du HTML de production réalisé le 2 septembre 2026
- **Propriétaire produit :** Antoine Quarroz

## Problème

La vitrine possède de bonnes fondations — rendu serveur, métadonnées, sitemap, contenu local, avis et premières données structurées — mais plusieurs incohérences limitent sa découverte et sa compréhension par les moteurs classiques et génératifs : les variantes linguistiques ne se canonisent pas vers elles-mêmes, certaines routes privées restent indexables, le sitemap et le blog ne rendent pas tous les contenus publics facilement découvrables, l'identité locale est incomplètement structurée et les pages commerciales offrent peu de preuves précises et citables.

Le produit doit améliorer sa visibilité sans promettre de classement, sans inventer de résultats commerciaux et sans transformer la vitrine en contenu générique produit pour les moteurs.

## Utilisateurs et parties prenantes

### Utilisateurs principaux

- **Prospect local francophone :** cherche un freelance web ou mobile en Valais et veut comprendre l'offre, le budget, le délai et les preuves disponibles.
- **Prospect germanophone ou anglophone :** doit recevoir une page réellement localisée, cohérente et indexable dans sa langue.
- **Lecteur expert :** consulte un article ou une étude de cas pour évaluer l'expertise et la méthode d'Antoine.
- **Crawler de recherche ou moteur génératif :** doit découvrir les pages publiques autorisées, identifier leur langue, leur source, leur auteur et leurs relations.

### Partie prenante interne

- **Antoine Quarroz :** approuve les traductions, les prix, les noms de clients, les témoignages et tous les résultats publiés ; il suit ensuite la visibilité et les conversions.

## Jobs et résultats attendus

- Quand un prospect effectue une recherche locale, il peut découvrir une page publique pertinente et comprendre rapidement l'offre d'Antoine.
- Quand un visiteur change de langue, il reçoit une version réellement localisée, sans contradiction entre contenu, métadonnées, canonical et `hreflang`.
- Quand un moteur parcourt le site, il trouve toutes les pages publiques utiles et aucune surface privée dans les résultats.
- Quand un moteur génératif cherche une réponse, il peut extraire des passages factuels, attribués, datés et vérifiables.
- Quand Antoine publie un article ou une étude de cas, la page devient découvrable sans modification manuelle dispersée.
- Quand Antoine mesure les résultats, il peut distinguer trafic organique, trafic issu de moteurs génératifs et conversions associées.

## Principes produit

1. **Humain d'abord :** chaque amélioration doit rendre le contenu plus clair et utile pour un prospect réel.
2. **Une URL, une intention, une langue :** aucune variante linguistique indexable ne doit présenter un contenu non traduit ou une canonical contradictoire.
3. **Preuve avant affirmation :** aucun client, chiffre, témoignage, prix ou résultat ne peut être inventé ou extrapolé.
4. **Public et privé explicitement séparés :** les surfaces admin, portail et hors-ligne ne doivent pas apparaître dans les moteurs.
5. **Automatisation vérifiable :** sitemap, métadonnées et données structurées dérivent autant que possible des sources éditoriales existantes.
6. **Pas de balisage décoratif :** les données structurées doivent correspondre au contenu visible.
7. **Amélioration progressive :** l'identité visuelle actuelle, le responsive, les modes clair/sombre et l'administration restent intacts hors des surfaces concernées.

## Parcours MVP

### J-SEO-01 — Découverte locale

1. Un prospect recherche un service web ou mobile en Valais.
2. Une page publique cohérente est éligible à l'indexation.
3. Le résultat présente un titre, une description et une image appropriés.
4. La page répond aux questions principales avec des preuves approuvées.
5. Le prospect accède à une étude de cas ou contacte Antoine.

### J-SEO-02 — Navigation multilingue

1. Un visiteur arrive sur une version française, anglaise ou allemande.
2. La langue visible, le `lang`, les métadonnées et la canonical concordent.
3. Le sélecteur expose des liens explorables vers les versions réellement disponibles.
4. Les versions alternatives se référencent réciproquement avec `hreflang`.
5. Une traduction absente n'est pas publiée sous une URL indexable trompeuse.

### J-SEO-03 — Publication éditoriale

1. Antoine publie un article ou une étude de cas approuvée.
2. Le contenu est rendu côté serveur.
3. Son URL apparaît automatiquement dans le sitemap avec une date fiable.
4. Les métadonnées, l'image sociale et les données structurées correspondent au contenu visible.
5. Des liens internes rendent le contenu accessible depuis une page publique existante.

### J-SEO-04 — Mesure et amélioration

1. Antoine publie le MVP.
2. Il soumet ou actualise le sitemap dans les outils de recherche.
3. Il vérifie l'indexation, les données structurées et les performances des pages critiques.
4. Il suit les visites organiques et issues de moteurs génératifs jusqu'aux événements de contact.
5. Il utilise les données pour prioriser les prochains contenus sans garantie de classement.

## Exigences MVP

### Indexation et domaines

- **SEO-R001 — Canonical propre :** toute page publique indexable expose une canonical absolue correspondant à son URL publique préférée et à sa langue.
- **SEO-R002 — Alternates cohérents :** toute page réellement disponible dans plusieurs langues expose des `hreflang` complets, réciproques, absolus, incluant elle-même et `x-default`.
- **SEO-R003 — Traduction réelle :** aucune URL localisée indexable ne contient un corps principal ou des métadonnées dans une autre langue, hors noms propres et contenus explicitement non traduits.
- **SEO-R004 — Routes privées :** `/admin/**`, `/portal/**` et `/offline` retournent une directive `noindex, nofollow` vérifiable sans dépendre uniquement de `robots.txt`.
- **SEO-R005 — Domaine unique :** toute requête HTTPS vers le domaine apex est redirigée de façon permanente vers `www`, en conservant chemin et paramètres.
- **SEO-R006 — Configuration canonique sûre :** l'URL de production par défaut est le domaine `.ch` ou le déploiement échoue explicitement si la variable requise manque ; aucune métadonnée publique ne référence `.dev`.

### Découverte et rendu

- **SEO-R007 — Sitemap complet :** le sitemap contient toutes les pages publiques indexables du MVP, y compris les articles publiés, les études de cas publiées et la page cas clients, sans route privée, brouillon ou traduction inexistante.
- **SEO-R008 — Dates fiables :** les contenus dynamiques utilisent une date de modification ou de publication issue de leur source, sans date artificielle recalculée à chaque requête.
- **SEO-R009 — Blog rendu serveur :** le listing du blog et ses liens vers les articles publiés sont présents dans le HTML initial.
- **SEO-R010 — Maillage public :** chaque page commerciale, article et étude de cas indexable possède au moins un lien entrant contextuel depuis une autre page publique indexable.
- **SEO-R011 — Sélecteur explorable :** les changements de langue disponibles utilisent des liens dotés d'un `href`, utilisables avec ou sans JavaScript.

### Métadonnées et entités

- **SEO-R012 — Métadonnées localisées :** toute page publique indexable possède un titre, une description, un `og:url` et une langue cohérents avec son contenu.
- **SEO-R013 — Image sociale :** toute page publique indexable possède une image sociale absolue et accessible ; les contenus éditoriaux utilisent leur image propre quand elle est approuvée, sinon une image de marque par défaut.
- **SEO-R014 — Entité professionnelle :** l'accueil décrit Antoine et son activité avec des données structurées cohérentes avec les coordonnées visibles, incluant l'adresse complète, le téléphone, l'e-mail et les profils sociaux approuvés.
- **SEO-R015 — Articles structurés :** chaque article publié expose des données `BlogPosting` correspondant au titre, à l'auteur, aux dates, à l'image, à la langue et à l'URL visibles.
- **SEO-R016 — Services et navigation structurés :** les pages de services et contenus profonds exposent uniquement les données `Service` et `BreadcrumbList` qui correspondent à leur contenu visible.
- **SEO-R017 — Validation :** les données JSON-LD sont syntaxiquement valides et passent les contrôles applicables sans erreur critique avant publication.

### Contenu GEO et confiance

- **GEO-R001 — Réponse directe :** chaque page commerciale commence par une description autonome de l'offre, de la cible et de la zone servie.
- **GEO-R002 — Couverture décisionnelle :** chaque page commerciale publiée couvre les livrables, le processus, les délais habituels, les limites et les prochaines étapes avec un langage naturel approuvé.
- **GEO-R003 — Preuves vérifiées :** toute étude de cas distingue contexte, rôle, périmètre, décisions et résultats ; chaque nom, lien, témoignage ou mesure est approuvé par Antoine avant publication.
- **GEO-R004 — Absence de fausse précision :** lorsqu'une donnée vérifiée manque, le contenu l'omet ou l'exprime qualitativement sans fabriquer de chiffre.
- **GEO-R005 — Attribution éditoriale :** les articles affichent un auteur identifiable, une date de publication et, lorsqu'elle existe, une date de mise à jour.
- **GEO-R006 — Passages citables :** les pages utilisent des titres explicites, des paragraphes autonomes et des listes ou tableaux seulement lorsqu'ils améliorent réellement la compréhension.
- **GEO-R007 — Qualité linguistique :** les contenus publics approuvés corrigent accents, apostrophes, encodage et formulations artificielles dans chaque langue publiée.
- **GEO-R008 — Accès aux moteurs génératifs :** le site autorise explicitement les crawlers de recherche générative approuvés par Antoine, sans confondre visibilité en recherche et autorisation d'entraînement.

### Performance et mesure

- **SEO-R018 — Contenu critique indépendant de la 3D :** le message, le CTA et un fallback visuel du hero restent disponibles avant et sans chargement de Spline.
- **SEO-R019 — Chargement proportionné :** la scène 3D n'empêche pas le contenu critique et respecte les préférences de mouvement réduit et les conditions où son chargement est volontairement évité.
- **SEO-R020 — Budgets de production :** les pages critiques visent au 75e percentile un LCP inférieur ou égal à 2,5 s, un INP inférieur ou égal à 200 ms et un CLS inférieur ou égal à 0,1 ; une absence de données terrain est signalée plutôt que remplacée par une estimation.
- **SEO-R021 — Mesure des acquisitions :** les événements existants permettent d'attribuer les prises de contact aux sources organiques et aux référents de moteurs génératifs sans stocker de donnée personnelle supplémentaire non nécessaire.
- **SEO-R022 — Vérification post-livraison :** les pages critiques, le sitemap, les redirects, les robots, les données structurées et les événements de conversion disposent d'une preuve de contrôle reproductible.

## Plus tard

- Production régulière d'articles fondés sur des questions observées dans les outils de recherche et les échanges prospects.
- Pages locales supplémentaires uniquement lorsqu'elles répondent à une intention et à un contenu réellement distincts.
- Enrichissement vidéo ou démonstrations interactives optimisées.
- Tableau de bord éditorial SEO/GEO dans l'administration si les contrôles manuels deviennent coûteux.
- Automatisation de suivi des mentions de marque et des citations dans des moteurs génératifs lorsque des sources de données fiables sont disponibles.

## Hors périmètre

- Refonte globale de la vitrine ou changement d'identité visuelle.
- Achat de liens, génération massive de pages locales ou duplication de contenus par ville.
- Invention de clients, avis, chiffres, certifications, prix ou résultats.
- Garantie de classement, de rich result ou de citation par un moteur génératif.
- Modification fonctionnelle du CRM, de la facturation ou du portail client hors module éditorial des projets défini dans l'extension validée ci-dessous.
- Publication automatique d'une traduction ou d'une affirmation commerciale sans validation humaine.
- Création d'un fichier `llms.txt` comme substitut aux exigences d'indexation et de qualité.

## Critères de succès et de release

- **S-SEO-001 :** 100 % des URL publiques échantillonnées ont une canonical propre et aucune URL localisée ne canonicalise vers une autre langue.
- **S-SEO-002 :** 0 route admin, portail ou hors-ligne échantillonnée ne reste éligible à l'indexation.
- **S-SEO-003 :** 100 % des articles et études de cas publiés sont présents dans le sitemap et accessibles par au moins un lien public.
- **S-SEO-004 :** 0 référence au domaine `.dev` n'apparaît dans le HTML, le sitemap ou `robots.txt` de production.
- **S-SEO-005 :** les données structurées des pages représentatives ne comportent aucune erreur critique et correspondent au contenu visible.
- **S-SEO-006 :** chaque page commerciale du périmètre possède au moins une preuve approuvée ou indique explicitement la limite des preuves disponibles.
- **S-SEO-007 :** les trois langues conservées dans le MVP passent un contrôle humain de cohérence linguistique sur les pages publiées.
- **S-SEO-008 :** les événements de contact restent fonctionnels et attribuables après les changements.
- **S-SEO-009 :** aucune régression critique n'est détectée sur responsive, modes clair/sombre, accessibilité clavier ou parcours de contact.
- **S-SEO-010 :** les budgets Core Web Vitals sont vérifiés avec des données terrain lorsqu'elles existent ; sinon une baseline laboratoire reproductible est conservée pour comparaison.

## Hypothèses

- Le domaine canonique reste `https://www.antoinequarroz.ch`.
- Les profils GitHub et LinkedIn visibles dans le footer sont approuvés pour `sameAs`.
- Les APIs publiques d'articles et de projets restent les sources de vérité des contenus publiés.
- Les avis et données de projets déjà visibles ne sont réutilisés comme preuves que dans le respect des consentements existants.
- Plausible reste l'outil de mesure principal.

## Risques et dépendances

- Une traduction automatique non revue pourrait résoudre la technique tout en dégradant la crédibilité.
- Le sitemap dynamique dépend de Supabase ; une panne ne doit pas produire silencieusement une vision trompeuse des contenus publiés.
- L'ajout de détails clients dépend du consentement et des preuves disponibles.
- Les données Core Web Vitals terrain nécessitent assez de trafic pour être significatives.
- Les règles des moteurs, crawlers et résultats enrichis évoluent ; les contrôles doivent rester fondés sur la documentation officielle actuelle.
- Les redirects de domaine dépendent de la configuration Caddy et du déploiement VPS.

## Décisions validées par Antoine

- **OD-SEO-001 — Stratégie linguistique des pages non traduites :** l'accueil et les pages légales restent disponibles en trois langues ; les services, le blog et les cas clients restent français uniquement jusqu'à disponibilité de traductions humaines approuvées.
- **OD-SEO-002 — Niveau de transparence commerciale :** les prix, délais, noms de clients et résultats chiffrés ne sont publiés que lorsqu'ils sont vérifiés et explicitement approuvés par Antoine.
- **OD-SEO-003 — Politique OpenAI :** `OAI-SearchBot` est autorisé pour la recherche ChatGPT et `GPTBot` est refusé pour l'entraînement.

## Traçabilité MVP

| Parcours | Exigences principales |
|---|---|
| J-SEO-01 | SEO-R001, SEO-R007, SEO-R010, SEO-R012–R017, GEO-R001–R007 |
| J-SEO-02 | SEO-R001–R003, SEO-R011–R012, GEO-R007 |
| J-SEO-03 | SEO-R007–R010, SEO-R013, SEO-R015–R017, GEO-R003–R006 |
| J-SEO-04 | SEO-R005–R006, SEO-R020–R022, GEO-R008 |

---

## Extension validée — Édition et publication des projets

### Statut et périmètre

- **État :** validé par Antoine Quarroz le 3 septembre 2026.
- **Périmètre :** prochain MVP du dashboard éditorial des projets et de leur publication multilingue.
- **Hors périmètre conservé :** facturation, clients, tâches et portail client.

### Problème

Le dashboard permet déjà de créer un projet minimal et de saisir une description courte en français, anglais et allemand. Il ne permet toutefois pas encore de piloter séparément la présence dans le portfolio et la publication d'une étude de cas, d'évaluer la complétude de chaque langue, de prévisualiser le rendu public, ni de traduire tout le contenu détaillé et ses métadonnées. Les formulaires longs restent aussi exposés aux pertes de saisie et aux liens ou médias incomplets.

### Utilisateur et résultat attendu

- **Utilisateur principal :** Antoine Quarroz, administrateur et validateur éditorial.
- **Résultat :** préparer progressivement un projet, contrôler son rendu dans chaque langue et publier uniquement les variantes complètes et approuvées, sans imposer une étude de cas détaillée pour afficher un projet dans le portfolio.

### Parcours

1. Antoine crée un projet minimal et choisit s'il apparaît dans le portfolio.
2. Il enrichit ensuite les traductions, médias, liens, étude de cas et métadonnées sans perdre son brouillon.
3. Le dashboard indique la complétude réelle de chaque langue et permet de prévisualiser le rendu public correspondant.
4. Antoine publie chaque variante linguistique complète de l'étude de cas indépendamment.
5. Il ordonne ou programme les projets visibles sans republier les contenus incomplets.

### Exigences

- **PROJ-R001 — Cycle de publication séparé :** la visibilité d'un projet dans le portfolio et la publication de son étude de cas sont deux décisions explicites et indépendantes.
- **PROJ-R002 — Contenu multilingue complet :** les descriptions détaillées, preuves et textes éditoriaux d'une étude de cas peuvent être saisis en français, anglais et allemand sans rendre les traductions obligatoires pour sauvegarder un brouillon.
- **PROJ-R003 — Publication linguistique sûre :** une étude de cas n'expose une URL indexable dans une langue que lorsque les champs requis de cette langue sont complets et validés humainement ; aucune page détaillée ne mélange silencieusement plusieurs langues.
- **PROJ-R004 — Prévisualisation et complétude :** le dashboard affiche l'état de chaque langue, les éléments manquants et un aperçu fidèle du portfolio et de l'étude avant publication.
- **PROJ-R005 — Médias accessibles et proportionnés :** chaque image publique possède un texte alternatif pertinent par langue et une variante optimisée ; un média invalide ne produit pas une page cassée.
- **PROJ-R006 — Liens vérifiables :** les URLs publiques et GitHub sont validées syntaxiquement et leur disponibilité peut être contrôlée sans bloquer abusivement la sauvegarde en cas d'indisponibilité temporaire.
- **PROJ-R007 — SEO localisé :** les titres et descriptions SEO peuvent être édités et prévisualisés par langue, respectent des limites explicites et correspondent au contenu visible.
- **PROJ-R008 — Ordre et programmation :** Antoine peut définir l'ordre des projets du portfolio et programmer une publication ou un retrait sans ambiguïté de fuseau horaire.
- **PROJ-R009 — Brouillon résilient :** une saisie non publiée est sauvegardée automatiquement, récupérable après fermeture ou erreur réseau et ne devient jamais publique sans action explicite.
- **PROJ-R010 — Autorisation et audit :** seules les personnes administratrices autorisées modifient ou publient un projet ; les changements de visibilité, langue, ordre et programmation restent attribuables.

### Décisions validées

- **OD-PROJ-001 — Publication par langue :** les pages détaillées EN et DE ne sont créées que lorsque leur traduction est complète et approuvée ; sinon aucune URL localisée indexable n'existe.
- **OD-PROJ-002 — Fallback du portfolio :** une description courte française peut rester visible temporairement dans le carousel EN/DE avec sa langue réelle déclarée, mais ce fallback n'autorise jamais la publication d'une étude de cas localisée.
- **OD-PROJ-003 — Deux niveaux de visibilité :** un projet minimal peut apparaître dans le portfolio sans étude de cas publique.
- **OD-PROJ-004 — Contrôle des liens :** une URL mal formée bloque l'enregistrement ; une indisponibilité distante temporaire produit un avertissement daté mais ne détruit pas le brouillon.
- **OD-PROJ-005 — Validation humaine :** aucune traduction, preuve, donnée client, chiffre ou publication n'est générée ou approuvée automatiquement.

### Critères de succès et de release

- **S-PROJ-001 :** un projet minimal peut être affiché dans le portfolio sans aucun champ d'étude de cas détaillée.
- **S-PROJ-002 :** chaque langue affiche un statut exact et la liste actionnable de ses champs manquants.
- **S-PROJ-003 :** 0 URL d'étude localisée indexable ne contient un fallback français ou une traduction incomplète.
- **S-PROJ-004 :** la prévisualisation et le rendu public utilisent les mêmes règles de sélection linguistique et de visibilité.
- **S-PROJ-005 :** 100 % des images de projet publiées possèdent un texte alternatif non vide dans la langue affichée et une ressource optimisée.
- **S-PROJ-006 :** les liens mal formés sont bloqués et les liens indisponibles sont signalés avec la date du dernier contrôle.
- **S-PROJ-007 :** chaque page détaillée publiée possède des métadonnées cohérentes dans sa langue.
- **S-PROJ-008 :** un ordre ou une programmation produit le même résultat après rechargement et respecte `Europe/Zurich`.
- **S-PROJ-009 :** une saisie interrompue est récupérable sans publication involontaire ni écrasement silencieux d'une version plus récente.

### Hors périmètre de l'extension

- Traduction automatique, génération de preuve ou publication par IA.
- Ajout d'autres langues que français, anglais et allemand.
- Gestion avancée d'une médiathèque indépendante des projets.
- Surveillance permanente de tous les liens externes.
- Refonte visuelle globale du dashboard ou du portfolio.

### Traçabilité de l'extension

| Parcours | Exigences principales |
|---|---|
| Création minimale | PROJ-R001, PROJ-R010 |
| Enrichissement éditorial | PROJ-R002, PROJ-R005–R007, PROJ-R009 |
| Contrôle avant publication | PROJ-R003–R007, PROJ-R010 |
| Organisation du portfolio | PROJ-R001, PROJ-R008, PROJ-R010 |
