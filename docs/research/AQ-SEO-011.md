# AQ-SEO-011 — Recherche dépôt

## Objet vérifié

La story demande que chacune des quatre pages françaises de service fournisse
une réponse autonome sur l'offre, le public et la zone servie, puis couvre les
livrables, le déroulement, les délais habituels, les limites et la prochaine
étape. Les passages doivent rester faciles à citer, linguistiquement propres et
reliés à une preuve pertinente ainsi qu'au contact. Aucun prix, délai précis ou
résultat variable ne peut être publié sans validation explicite d'Antoine
(`docs/product/stories.md:216-235`). Cela applique `GEO-R001`, `GEO-R002`,
`GEO-R004`, `GEO-R006` et `GEO-R007` (`docs/product/prd.md:110-119`) dans le
cadre de la décision `OD-SEO-002`, déjà validée, qui interdit de publier des
précisions commerciales non vérifiées (`docs/product/prd.md:177-181`).

## État des quatre pages commerciales

Les routes concernées sont publiques, françaises uniquement, présentes dans le
sitemap et déjà protégées par les preuves `Service`/`BreadcrumbList` livrées par
AQ-SEO-010 (`server/utils/sitemapDiscovery.ts:24-43`,
`scripts/ops/verify-service-breadcrumbs.sh:13-18,287-309`).

- `/developpeur-web-valais` identifie Antoine, cite le Valais, plusieurs zones
  et trois familles d'intervention. L'introduction ne nomme toutefois pas
  explicitement le public; les cartes ne décrivent ni processus, ni cadrage des
  délais, ni limites (`app/pages/developpeur-web-valais.vue:10-15,48-55,68-105`).
- `/creation-site-internet-valais` nomme les entreprises valaisannes et présente
  « Cadrage », « Design & contenu » et « Mise en ligne ». Il n'y a pas de liste
  explicite de livrables, de délais cadrés ou de limites
  (`app/pages/creation-site-internet-valais.vue:10-15,54-76`).
- `/refonte-site-web-valais` décrit le problème et quatre bénéfices qualitatifs,
  mais ne précise pas le public, le déroulement, les livrables, les facteurs de
  délai ou les limites (`app/pages/refonte-site-web-valais.vue:10-15,54-71`).
- `/application-mobile-valais` mentionne les besoins métier et trois phases,
  mais son introduction ne rend pas la zone autonome et la page ne couvre pas
  les facteurs de délai ni les limites liées aux dépendances externes
  (`app/pages/application-mobile-valais.vue:10-15,54-76`).

Les quatre introductions alimentent directement le texte visible et la
description JSON-LD `Service`; leur correction doit donc conserver cette source
unique (`app/pages/developpeur-web-valais.vue:10-24,68-73`,
`shared/utils/publicStructuredData.ts:86-115`). Plusieurs chaînes actuelles
contiennent des accents manquants ou des formulations trop affirmatives, par
exemple « developpeur », « base », « experiences », « resultat », « Amelioration
» et « livraisons rapides ». AQ-SEO-011 doit corriger le contenu visible et les
métadonnées associées sans modifier les URLs ni inventer une promesse.

## Informations commerciales déjà vérifiables

Le dépôt permet de rester sur des affirmations qualitatives existantes :

- Antoine se présente comme développeur web et mobile indépendant, basé en
  Valais, actif depuis 2020, et accompagne entreprises locales et startups de la
  maquette à la mise en ligne (`app/locales/fr.json:35-51`).
- L'offre visible couvre les sites vitrines, les CMS et les applications
  mobiles; les capacités déjà affichées incluent design responsive,
  optimisation SEO, UI/UX, iOS/Android, fonctions hors ligne et interfaces CMS
  sur mesure (`app/components/sections/ServicesSection.vue:6-35`,
  `app/locales/fr.json:53-87`).
- Le formulaire de contact recueille déjà le budget et l'horizon souhaité sans
  les transformer en promesse publique; il envoie ces choix avec le message
  (`app/components/sections/ContactSection.vue:80-87,248-289`).
- Le portfolio public ne montre que les projets portant le drapeau
  `portfolioVisible`, avec catégories web, mobile et CMS
  (`app/stores/projects.ts:149-153`,
  `app/components/sections/PortfolioSection.vue:5-28,54-103`). Les données
  publiques peuvent contenir un lien live ou un dépôt de code déjà approuvé,
  mais les études détaillées restent séparées par
  `caseStudyPublished` (`app/stores/projects.ts:41-77`,
  `server/api/projects.get.ts:11-27`).

Le lien de preuve le plus stable pour cette story est donc `/#portfolio`, dont
les entrées sont déjà filtrées par publication. `/cas-clients-valais` peut être
proposé en complément, mais son état vide indique actuellement que les études
détaillées ne sont pas encore disponibles et ne doit pas être présenté comme
une preuve inexistante (`app/pages/cas-clients-valais.vue:78-145`). La page doit
exprimer cette limite plutôt que fabriquer un cas ou un résultat, conformément
à `S-SEO-006` (`docs/product/prd.md:146-160`).

## Contrat éditorial recommandé

Chaque page doit conserver une introduction propre et autonome, puis rendre les
mêmes cinq questions de décision avec des réponses spécifiques au service :

1. **Quels livrables sont inclus ?** Liste courte de sorties concrètes déjà
   couvertes par l'offre visible.
2. **Comment se déroule le projet ?** Étapes du cadrage à la mise en ligne ou au
   suivi, sans prétendre qu'elles sont identiques pour tous les mandats.
3. **Quels délais prévoir ?** Aucun chiffre ni fourchette : expliquer que le
   planning est confirmé après cadrage et dépend du périmètre, des contenus, des
   intégrations et du rythme de validation.
4. **Quelles sont les limites ?** Pas de garantie de classement, de conversion
   ou de résultat; les accès, contenus et services tiers peuvent conditionner le
   mandat.
5. **Quelle est la prochaine étape ?** Consulter une réalisation publiée puis
   contacter Antoine pour cadrer le besoin.

Les titres interrogatifs produisent des passages identifiables sans ajouter une
`FAQPage` artificielle. Les paragraphes doivent être autonomes; les listes ne
sont utilisées que pour les livrables, étapes et limites, là où elles améliorent
réellement la lecture. Les quatre pages restent françaises conformément à
`OD-SEO-001` (`docs/product/prd.md:177-180`).

Le plan doit contenir une matrice des affirmations sensibles. La validation
explicite du plan par Antoine approuvera uniquement les affirmations
qualitatives qui y sont écrites et l'absence de prix, de durée chiffrée, de nom
client, de témoignage et de résultat quantifié. Toute précision future devra
passer par une nouvelle revue humaine; elle ne doit pas être déduite du CRM ni
générée automatiquement.

## Intégration recommandée

La structure se répète sur quatre pages. Un petit modèle partagé et un composant
de présentation évitent que l'une d'elles perde une question lors d'une future
édition :

- un type ou constructeur sous `shared/utils/` exige une offre, un public, une
  zone, des livrables, des étapes, un texte de cadrage du délai, des limites, une
  prochaine étape, un lien de preuve et un lien de contact;
- un composant sous `app/components/ui/` rend des `section`, `h2`, paragraphes,
  listes et deux liens accessibles dans un ordre constant, sans accordéon ni
  dépendance JavaScript;
- chaque page conserve ses textes spécifiques dans son propre `<script setup>`
  et fournit la même introduction au HTML visible et au nœud `Service`;
- les liens restent locaux et approuvés : `/#portfolio`, éventuellement
  `/cas-clients-valais`, et `/#contact`.

Le composant doit suivre les conventions visuelles existantes (`section-container`,
bordures violettes, surfaces claires/sombres) et conserver des cibles tactiles
et focus visibles comme le breadcrumb (`app/components/ui/AppBreadcrumbs.vue:9-37`).
La structure doit rester intégralement SSR afin que lecteurs d'écran, moteurs et
preuves HTTP lisent le même contenu.

## Flux représentatif après implémentation

1. La page déclare son contenu commercial qualitatif et son introduction
   approuvée.
2. Le constructeur refuse une section vide, un lien externe/ambigu ou un
   contenu structurellement incomplet.
3. Le H1 et l'introduction sont rendus avant les questions de décision; la même
   introduction alimente le JSON-LD `Service` existant.
4. Le composant rend les cinq questions, la preuve publiée et le CTA contact
   dans le HTML initial.
5. Une preuve HTTP anonyme découvre les quatre routes depuis le sitemap et
   vérifie la présence, l'ordre, les liens locaux et l'absence de prix ou durée
   chiffrée non approuvés.
6. La revue de contenu associe chaque affirmation sensible à l'approbation
   humaine du plan avant toute publication.

## Tests et preuve de release

Le contrôle AQ-SEO-010 valide déjà le canonical, le contenu `Service`, le
breadcrumb, l'identité du fournisseur, la zone et l'absence de propriétés
commerciales structurées artificielles
(`scripts/ops/verify-service-breadcrumbs.sh:239-284`). AQ-SEO-011 doit le
conserver et ajouter un contrôle distinct de contenu décisionnel :

- exiger les quatre pages et un HTML SSR sans redirection;
- vérifier que l'introduction précède les sections et expose les marqueurs
  offre/public/Valais;
- exiger une unique section pour les livrables, le processus, le délai, les
  limites et la prochaine étape, dans cet ordre;
- exiger au moins un lien de preuve local vers une surface publique et un lien
  vers `/#contact`;
- refuser section vide, URL externe, prix/devise ou durée chiffrée dans les
  champs sensibles tant qu'aucune valeur n'est listée comme approuvée;
- refuser les anciennes chaînes accentuées incorrectement et les marqueurs de
  texte corrompu les plus courants;
- utiliser des fixtures locales positives et négatives, sur le modèle du test
  HTTP de `tests/seo-service-breadcrumbs.test.ts`;
- ajouter un parcours Playwright sans JavaScript qui vérifie titres, liens et
  ordre sémantique sur les quatre routes, en complément de
  `e2e/public.spec.ts:76-99`.

Le nouveau script doit reprendre les garde-fous réseau existants : origine
HTTP(S) sans identifiants ni chemin, redirections manuelles, délai de 12 secondes
et taille HTML bornée (`scripts/ops/verify-service-breadcrumbs.sh:4-9,70-109`).
Il sera exécuté après le contrôle `Service`/breadcrumb dans le job Production,
avant les E2E (`.github/workflows/ci.yml:66-145`).

## Données, autorisation et sécurité

- Aucune migration, table, donnée Supabase, route API, permission, RLS, RPC ou
  stockage n'est requis : il s'agit de contenu public statique approuvé.
- Le contenu ne doit jamais être extrait des budgets, échéances, clients ou
  notes internes du CRM. Les données publiques du portfolio restent lues par le
  chemin existant et filtrées côté serveur.
- Aucun secret, cookie ou compte administrateur n'est nécessaire au rendu ou à
  la preuve. Les URLs de preuve et de contact sont locales et validées.
- La preuve ne suit aucune redirection, ne sort pas de l'origine et ne journalise
  pas le contenu complet en cas d'échec.
- Le JSON-LD conserve `serializeJsonLd` et la description visible comme source;
  AQ-SEO-011 n'ajoute ni `Offer`, ni prix, ni avis, ni résultat structuré.
- Le changement est applicatif uniquement; le rollback remet l'image `previous`
  sans restauration de base.

## Risques à contrôler

1. **Validation humaine ambiguë :** un accord générique sur le développement ne
   suffit pas; le plan doit lier explicitement la validation aux affirmations
   qualitatives proposées.
2. **Fausse précision :** des durées, prix, taux ou garanties seraient faciles à
   inventer. Le MVP explique les facteurs de cadrage et n'affiche aucun chiffre
   commercial nouveau.
3. **Preuve inexistante :** le hub d'études peut être vide. Les pages pointent
   vers le portfolio réellement publié et nomment clairement la limite des
   études détaillées.
4. **Copie générique dupliquée :** la structure peut être commune, mais les
   livrables et limites doivent rester spécifiques à chaque service.
5. **Régression structurée :** la correction des introductions doit mettre à
   jour le nœud `Service` depuis la même valeur, sans casser AQ-SEO-010.
6. **Texte utile uniquement après hydratation :** les passages, preuves et CTA
   doivent apparaître dans le HTML SSR et fonctionner sans JavaScript.
7. **Portée multilingue :** créer des variantes EN/DE sans traduction approuvée
   violerait `OD-SEO-001`; cette story reste française.

## Conclusion

AQ-SEO-011 est la prochaine story séquentielle après AQ-SEO-010. Elle ne demande
ni CMS ni migration : les quatre pages sont statiques et possèdent déjà leurs
canonicals, leur schéma `Service`, le portfolio et le contact. Le changement
doit enrichir ces pages avec un modèle décisionnel SSR commun, des réponses
qualitatives propres à chaque offre, une preuve réellement publique et une
preuve de release dédiée. L'implémentation peut commencer après validation par
Antoine du plan et de sa matrice d'affirmations, sans publier de prix, durée
chiffrée, nom client ou résultat quantifié.
