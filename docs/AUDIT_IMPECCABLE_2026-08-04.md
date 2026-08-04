# Audit Impeccable — AntoineQuarrozVitrine

⚠️ DEGRADED: single-context (la politique de cette session n'autorise pas la délégation à des sous-agents sans demande explicite)

Date : 4 août 2026  
Cible : vitrine publique, connexion admin, code du back-office, génération de devis et factures  
Méthodes : inspection desktop/mobile, lecture du DOM, console navigateur, détecteur Impeccable, analyse statique et build Nuxt de production

## Résumé exécutif

Le produit possède déjà une identité claire et une base fonctionnelle bien plus avancée qu'un simple portfolio. La vitrine est reconnaissable, responsive et cohérente avec le positionnement de freelance technique. Le back-office couvre déjà la chaîne prospect → client → projet → devis → facture, avec recherche globale, raccourci `Ctrl K`, PWA, rôles et journal d'audit.

La priorité n'est pas une refonte. Il faut fiabiliser l'expérience existante : accessibilité des formulaires et cibles tactiles, hydratation SSR, conversion du hero, crédibilité des preuves, maîtrise du composant Spline et consolidation du système de design. La facturation Typst/QR suisse est installée sous forme de base vérifiée, mais son branchement production exige encore des données bancaires et postales absentes du schéma actuel.

## Design Health Score — vitrine

| # | Heuristique | Score | Constat principal |
|---|---|---:|---|
| 1 | Visibilité de l'état du système | 3/4 | États d'envoi présents, mais non annoncés explicitement aux technologies d'assistance. |
| 2 | Correspondance avec le monde réel | 3/4 | Offre compréhensible, quelques formulations techniques ou anglaises subsistent. |
| 3 | Contrôle et liberté | 2/4 | Modale d'article sans sémantique/focus/fermeture clavier complète. |
| 4 | Cohérence et standards | 3/4 | Identité cohérente, mais nombreuses tailles et couleurs ponctuelles. |
| 5 | Prévention des erreurs | 2/4 | Validation native utile, labels non associés et peu d'aide avant soumission. |
| 6 | Reconnaissance plutôt que rappel | 3/4 | Navigation claire et actions nommées. |
| 7 | Flexibilité et efficacité | n/a | Peu pertinente pour une vitrine persuasive. |
| 8 | Esthétique et minimalisme | 3/4 | Très bonne personnalité, mais certains effets et contenus rivalisent avec l'action principale. |
| 9 | Diagnostic et récupération d'erreur | 2/4 | Messages génériques, sans détail ni prochaine action. |
| 10 | Aide et documentation | n/a | Peu pertinente pour une vitrine persuasive. |
| **Total** | | **21/32** | **Acceptable, base solide à fiabiliser** |

## Audit Health Score — implémentation

| Dimension | Score | Constat principal |
|---|---:|---|
| Accessibilité | 2/4 | Labels non associés, cibles tactiles inférieures à 44px, composant interactif imbriqué. |
| Performance | 2/4 | Spline distant chargé depuis `@latest`, nombreux flous/animations et gros chunk client. |
| Responsive | 3/4 | Aucun débordement horizontal à 384px, mais plusieurs cibles trop petites et hero très dominant. |
| Thèmes | 2/4 | Clair/sombre présent, tokens incomplets et couleurs codées directement dans les composants. |
| Intégrité | 2/4 | Build réussi, mais erreur d'hydratation et dérive typographique détectées. |
| **Total** | **11/20** | **Acceptable — corrections importantes nécessaires** |

## Ce qui fonctionne bien

- Le duo violet/cyan, les fonds nocturnes et Space Grotesk donnent une personnalité immédiatement reconnaissable.
- Le responsive ne provoque pas de débordement horizontal sur la page testée à 384px.
- La hiérarchie publique est claire : proposition de valeur, présentation, services, portfolio, contenu, avis et contact.
- Le formulaire de contact possède des états d'envoi, un honeypot et une intégration Turnstile prévue.
- Le back-office couvre CRM, clients, tâches, rendez-vous, projets, articles, avis, messages, devis, factures et audit.
- Les suppressions administratives importantes comportent déjà une confirmation.
- Le build Nuxt de production réussit, y compris le service worker PWA.

## Constats vérifiés

### [P1] Champs visibles non reliés à leurs labels

Les six champs principaux du contact et les deux champs de connexion admin sont visuellement précédés d'un label, mais le label n'englobe pas le contrôle et n'utilise pas `for`/`id`. Le même motif apparaît dans plusieurs formulaires admin.

- Impact : lecture d'écran et activation du champ par clic sur le label dégradées.
- Standard : WCAG 1.3.1 et 3.3.2.
- Emplacements : `ContactSection.vue`, `admin/login.vue`, plusieurs formulaires `admin/*/index.vue`.

### [P1] Erreur d'hydratation dans les services

La console Vue rapporte plusieurs `Hydration children mismatch` sur la liste des fonctionnalités de `ServicesSection.vue`. Le serveur produit quatre éléments tandis que le client mobile en conserve trois via `useMediaQuery`.

- Impact : DOM corrigé après chargement, risque de décalage visuel et comportement différent entre SSR et client.
- Emplacement : `ServicesSection.vue`, boucle conditionnée par `isMobile`.

### [P1] Cibles tactiles trop petites

Le test mobile a mesuré notamment 32px pour le logo, la langue et le menu, 32px pour les filtres portfolio, 36px pour les flèches du carrousel et 10px pour certains indicateurs.

- Impact : erreurs de toucher et difficulté motrice.
- Standard : WCAG 2.5.8 (minimum 24px, cible recommandée 44px) et bonnes pratiques mobiles.

### [P1] Hero spectaculaire mais peu orienté conversion

Le hero actif n'affiche aucun appel à l'action direct. Sur mobile, la scène 3D occupe une grande partie du premier écran et le texte arrive tard ; pendant le chargement, la moitié droite du desktop peut sembler vide.

- Impact : le visiteur comprend le métier, mais n'est pas guidé immédiatement vers « demander un devis » ou « voir les réalisations ».
- Emplacement : `HeroSplineSection.vue`.

### [P1] Preuves commerciales insuffisamment crédibles

Plusieurs avis utilisent des identités génériques (« Client vitrine », « Fondateur », « Client CMS ») et apparaissent dupliqués dans le ruban. Ils ressemblent à du contenu de démonstration, malgré une note globale précise.

- Impact : perte de confiance au moment où la page cherche à rassurer.
- Règle produit : ne publier que des preuves réelles et validées.

### [P1] Sémantique interactive invalide dans le blog

`CardStack.vue` place un `NuxtLink` à l'intérieur d'un `<button>`. La page contient donc une interaction imbriquée.

- Impact : activation ambiguë au clavier, comportement variable selon le navigateur et lecteur d'écran.
- Standard : HTML interactif valide et WCAG 4.1.2.

### [P2] Modales administratives et article à renforcer

Les panneaux visuels ne déclarent pas systématiquement `role="dialog"`, `aria-modal`, titre associé, piège de focus et retour du focus à la fermeture. Certaines fermetures n'écoutent pas `Escape`.

### [P2] Spline externe non maîtrisé

Le viewer est chargé depuis `@splinetool/viewer@latest` sur unpkg, tandis que la console indique une version 1.12.98. La scène est distante et aucun fallback éditorial complet n'est visible.

- Impact : changement non contrôlé, dépendance réseau, temps de chargement et risque de régression.

### [P2] Dérive du système de design

Le détecteur trouve 168 signalements : 113 tailles typographiques ponctuelles, 28 textes gris sur fonds colorés, 4 couleurs hors palette, 2 polices hors système et 2 animations de propriétés de layout. Les 13 alertes « palette violet/cyan générique » sont classées faux positifs, cette palette étant une décision de marque explicite.

### [P2] PDF actuels trop basiques

Le générateur `pdf-lib` produit des documents fonctionnels, mais sans adresse complète, identité de créancier, pagination avancée ni QR-facture. Les aperçus HTML d'impression utilisent Arial et une couleur locale hors système.

## Topo des surfaces

### Vitrine publique

- **Hero** : très distinctif, mais CTA et fallback à renforcer.
- **À propos** : personnel, crédible et visuellement réussi ; conserver la photo et le ton direct.
- **Services** : offre bien structurée, mais manque de fourchettes/précisions rassurantes et souffre de l'erreur d'hydratation.
- **Portfolio** : démonstration convaincante, filtres faciles à comprendre ; améliorer les cibles tactiles et contextualiser les résultats obtenus.
- **Blog** : utile pour la confiance et le SEO ; simplifier la double interaction aperçu/lien.
- **Avis** : belle composition, contenu à remplacer par des preuves vérifiées.
- **Contact** : complet et bien placé ; corriger l'accessibilité, préciser les erreurs et ajouter l'autocomplétion.
- **Footer** : riche mais visuellement dense ; garder les accès utiles et réduire les répétitions.

### Administration

- **Architecture** : couverture fonctionnelle solide et navigation globale cohérente.
- **Efficacité** : recherche `Ctrl K`, vues sauvegardées, kanban et actions rapides sont de bons accélérateurs.
- **Densité** : adaptée à l'usage quotidien ; ne pas transformer l'admin en vitrine.
- **Risques** : petits boutons icône, labels non associés, modales non normalisées, libellés/statuts parfois bruts et très nombreux accents de couleur par page.
- **Opportunité principale** : rendre le parcours prospect → devis → projet → facture visible comme un pipeline unique avec prochaine action et alertes.

### Devis et facturation

- Calcul des lignes, taxes, sous-total et total déjà en place.
- Devis transformables en factures et PDF téléchargeables.
- Typst 0.15.1 installé ; `payqr-swiss:0.4.1` importé et compilé avec succès.
- Le QR suisse doit apparaître sur la facture, pas nécessairement sur le devis.
- Le branchement production nécessite une fiche de facturation de l'organisation et des adresses clients complètes.

## Backlog proposé

### AQ-001 — [P1] Accessibilité des formulaires et contrôles

Associer tous les labels, ajouter `autocomplete`, `aria-live` aux statuts, noms accessibles aux boutons icône et cibles tactiles de 44px lorsque possible.

**Acceptation :** zéro champ visible sans nom accessible ; parcours contact et connexion réalisable clavier seul ; aucun contrôle principal inférieur à 44px sur mobile.  
**Commande suggérée :** `/impeccable audit` puis `/impeccable harden`.

### AQ-002 — [P1] Supprimer l'erreur d'hydratation des services

Rendre le nombre d'éléments stable entre SSR et client, puis masquer le quatrième élément par CSS responsive ou calculer après montage sans modifier l'arbre hydraté.

**Acceptation :** aucune erreur ou alerte d'hydratation sur desktop et mobile.  
**Commande suggérée :** `/impeccable harden`.

### AQ-003 — [P1] Renforcer la conversion du hero sans le remplacer

Conserver Spline et l'identité actuelle, ajouter un CTA principal « Parler de votre projet » et un secondaire « Voir mes réalisations », remonter le message sur mobile et prévoir un fallback visuel statique.

**Acceptation :** CTA visible dans le premier écran à 390px et desktop ; contenu lisible avant le chargement de Spline.  
**Commande suggérée :** `/impeccable layout` puis `/impeccable polish`.

### AQ-004 — [P1] Assainir les preuves et témoignages

Masquer les avis de démonstration, n'afficher que des retours réels approuvés et ajouter société/projet/lien uniquement avec consentement.

**Acceptation :** aucune identité générique présentée comme avis réel, aucune duplication visible dans la lecture normale.  
**Commande suggérée :** `/impeccable clarify`.

### AQ-005 — [P1] Corriger CardStack et les modales

Séparer l'action d'aperçu et le lien, ajouter la sémantique dialog, `Escape`, focus initial, piège de focus et restauration du focus.

**Acceptation :** aucun contrôle interactif imbriqué ; scénario complet réalisable au clavier et annoncé correctement.  
**Commande suggérée :** `/impeccable harden`.

### AQ-006 — [P2] Maîtriser le coût et la disponibilité de Spline

Épingler la version du viewer, charger la scène après le contenu critique ou selon la capacité du terminal, respecter `prefers-reduced-motion` et fournir une image/fond de secours.

**Acceptation :** pas de dépendance `@latest`, hero utile hors ligne ou en réseau lent, animation désactivable.  
**Commande suggérée :** `/impeccable optimize`.

### AQ-007 — [P2] Consolider les tokens UI

Remplacer progressivement les tailles arbitraires répétées et couleurs locales par des tokens publics/admin documentés. Conserver volontairement le violet/cyan.

**Acceptation :** réduction d'au moins 60 % des alertes `design-system-font-size` et validation des 28 contrastes gris/fond coloré.  
**Commande suggérée :** `/impeccable typeset` puis `/impeccable colorize`.

### AQ-008 — [P2] Créer un pipeline freelance unifié dans l'admin

Afficher pour chaque prospect/client l'étape actuelle, la prochaine action, les montants devisés/facturés et les échéances.

**Acceptation :** un client peut être suivi de prospect à facture sans reconstruire mentalement son état depuis plusieurs pages.  
**Commande suggérée :** `/impeccable shape`.

### AQ-009 — [P2] Brancher Typst sur devis et factures

Ajouter le profil de facturation de l'organisation, les adresses clients, les références QR, la validation IBAN/QR-IBAN et un service serveur Typst. Utiliser Typst pour les deux documents et `payqr-swiss` uniquement sur les factures éligibles, avec fallback `pdf-lib` contrôlé.

**Acceptation :** PDF Typst stable, données réelles validées, QR conforme scannable, aucune donnée d'exemple, tests CHF/EUR et NON/SCOR/QRR.  
**Commande suggérée :** ticket d'implémentation fonctionnelle dédié.

### AQ-010 — [P2] Professionnaliser les PDF commerciaux

Créer en-tête, coordonnées, tableaux multi-pages, conditions, échéances, pagination et prévisualisation avant téléchargement.

**Acceptation :** devis et facture cohérents avec la marque, imprimables en A4 et lisibles sur plusieurs pages.  
**Commande suggérée :** `/impeccable polish` sur l'aperçu et implémentation Typst.

### AQ-011 — [P2] Uniformiser les langues et libellés

Déplacer les chaînes FR codées en dur vers i18n, vérifier accents/encodage et rendre les statuts métier lisibles dans les trois langues.

**Acceptation :** aucune chaîne publique inattendue dans la mauvaise langue ; statuts et erreurs traduits.  
**Commande suggérée :** `/impeccable clarify`.

### AQ-012 — [P3] Passe de finition différenciée

Préserver la vitrine immersive, réduire les halos concurrents dans les sections secondaires et simplifier les accents multicolores de l'admin.

**Acceptation :** un point focal lumineux maximum par zone ; admin calme, lisible et toujours identifiable à la marque.  
**Commande suggérée :** `/impeccable quieter` puis `/impeccable polish`.

## Ordre recommandé

1. AQ-001, AQ-002 et AQ-005 : fiabilité et accessibilité.
2. AQ-003 et AQ-004 : conversion et confiance publique.
3. AQ-006 et AQ-007 : performance et cohérence visuelle.
4. AQ-009 et AQ-010 : facturation Typst/QR suisse.
5. AQ-008 et AQ-011 : efficacité admin et qualité éditoriale.
6. AQ-012 : finition finale.

## Vérifications réalisées

- Build Nuxt de production : réussi.
- PWA : service worker généré, 57 entrées précachées.
- Responsive à 384 × 844 : aucun débordement horizontal.
- Console : erreur d'hydratation confirmée dans `ServicesSection`.
- Détecteur Impeccable : 168 signalements analysés, faux positifs de palette écartés.
- Typst : version 0.15.1 installée.
- `payqr-swiss:0.4.1` : package téléchargé, compilé et rendu visuellement avec succès.
- Overlay automatique Impeccable : non injecté, l'API navigateur disponible autorisant uniquement l'évaluation DOM en lecture seule ; inspection visuelle et scan CLI utilisés à la place.
