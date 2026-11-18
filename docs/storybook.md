# Catalogue AQ

Adresse : https://ui.antoinequarroz.ch — suivi : ANT-23.

## Contenu

Les 34 composants Vue de `app/components`, 93 stories et une page d’accueil. Fondations Tailwind, navigation, sections de vitrine, formulaires, portfolio, articles, avis, CRM, rapprochement bancaire, éditeur d’étude de cas, composants UI, factures/devis et effets Three.js/Spline. Le CSS provient de `app/assets/css/main.css`. Les stories sont dans `stories/`.

Utiliser les commandes de thème et de viewport de Storybook. Les onglets Controls, Actions, Interactions et Accessibility permettent d’examiner propriétés, événements, scénarios et contrôles automatiques. Les vérifications automatiques ne remplacent pas le contrôle clavier et visuel.

## Développement

Exécuter les commandes via Portly, conformément à AGENTS.md. Pour une session ponctuelle :

```sh
portly temp 'npm run storybook' --path /chemin/vers/AntoineQuarrozInde --timeout 30m
```

Pour un usage régulier, enregistrer un serveur Portly sur le port 6006. Le catalogue utilise Vue/Vite directement : il ne démarre pas Nuxt et ne charge pas le backend. `NuxtLink` est remplacé par un lien inerte. Les notifications réutilisent le composable Vue réel.

Ajouter chaque nouvelle story près des exemples du même composant. Importer le composant existant ; ne pas dupliquer son template dans une imitation. Les templates des stories servent uniquement aux compositions et aux slots. Ajouter un état limite utile et, pour une interaction importante, une fonction `play` avec assertions. Conserver les fonctions de formatage dans les fixtures, sans appel API.

## Vérifier et publier

```sh
node scripts/check-storybook-coverage.mjs
npm run build-storybook
npm run typecheck
npm test
node scripts/build-storybook-deploy.mjs
npx vercel@59.23.2 deploy --prod --yes --cwd deploy/storybook
```

Lancer builds, tests et déploiement comme jobs Portly. `deploy/storybook/.vercel` doit être lié au projet **aq-ui**, équipe **antoinequarrozs-projects**. Sur une nouvelle machine : `vercel link --yes --project aq-ui --scope antoinequarrozs-projects --cwd deploy/storybook`. La préparation nettoie les anciens fichiers du dossier de staging (y compris les éventuels `.env` générés par la CLI), conserve le lien projet et copie uniquement le build statique.

Le déploiement est manuel : il n’est pas connecté automatiquement aux pushes Git. Les changements de stories doivent être reconstruits et redéployés avec ces commandes.

## Domaine et périmètre

DNS Infomaniak : CNAME `ui` → `d49d78f8f32de92e.vercel-dns-017.com.`. Vercel gère le certificat TLS. Le projet est séparé de la vitrine ; aucun changement des serveurs DNS, du domaine racine ou des emails n’est nécessaire.

Le catalogue et le code d’exemple sont consultables sur son URL. `noindex` réduit l’indexation mais n’est pas une protection d’accès. N’y ajouter ni données clients, ni identifiants, ni documents réels. Les événements de paiement, téléchargement et acceptation restent simulés.

## Retour arrière

Redéployer un build précédent dans le seul projet aq-ui. Les composants de production ne dépendent pas de Storybook ; les deux imports Vue explicites ajoutés aux notifications conservent leur comportement dans Nuxt.

## Environnement de démonstration

`.storybook/runtime.ts` fournit les stores fictifs, la configuration et les réponses API locales. Chaque story reçoit son propre état via injection Vue. Le plugin de `.storybook/main.ts` remplace uniquement les `$fetch` des composants par cette implémentation locale, sans import de store réel ni client réseau. Les autres auto-imports Vue et VueUse restent réels. Le composable de dialogue accessible et le composable de notifications sont réutilisés.

La langue se choisit avec le globe (FR/EN/DE) ; les textes administratifs restent français comme dans l’application. Le portrait et les textes publics sont conservés. Projets, articles, avis et contacts sont explicitement fictifs. Les uploads restent en mémoire dans le navigateur. Aucun email, paiement, changement de base, tracking ou CAPTCHA n’est déclenché. Tous les liens dans les exemples sont neutralisés ; les liens de documentation restent utilisables.

Les polices Google et la scène Spline utilisent des ressources publiques externes. La scène 3D fonctionne sur un appareil compatible ; le composant réel affiche son repli sur mobile ou en cas d’échec. Le carrousel de projets et la présentation narrative réagissent au défilement. Les composants Articles et Avis peuvent ne rien afficher à vide, conformément à leur comportement réel.

Le scénario de rapprochement utilise `releve-demo.csv`, également disponible dans les assets publics du catalogue. Ne pas utiliser un relevé réel. Les exemples Contact Succès/Erreur/Envoi en cours remplissent et soumettent localement le formulaire ; les animations et le retour automatique à l’état initial sont conservés.

## Contrôles de couverture et limites

`node scripts/check-storybook-coverage.mjs` échoue si un fichier Vue n’est importé dans aucune story. Ce contrôle est ajouté à la CI de build ; il ne remplace ni un test de rendu ni un audit exhaustif d’accessibilité. Les fonctions play vérifient des interactions significatives. Les contrôles axe doivent être relancés après stabilisation des animations si nécessaire ; des résultats inconclusifs demandent une revue visuelle.

Livraison étendue du 21 septembre : couverture 34/34, build et typecheck valides, 102 fichiers / 666 tests. Rendus des 24 nouveaux composants examinés dans le navigateur ; scénarios play contact (succès/erreur/attente), rapprochement (9 étapes), pile de cartes, thème, devis et facture validés. Menu mobile sombre ouvert/fermé par Échap avec retour du focus ; CRM mobile sans débordement horizontal. Contrôles axe ciblés facture et contact stabilisé sans violation (un résultat contact inconclusif). Aucun audit exhaustif des 93 états n’est revendiqué.

Petites corrections partagées avec le site : repli des anciennes clés de variante du Hero vers les traductions existantes ; libellés et accès clavier du composant d’import d’image. Ces corrections sont dans les sources locales ; seul le catalogue aq-ui est déployé par cette procédure.
