---
linear: ANT-23
validated: yes
status: Done
---

# Catalogue AQ sur ui.antoinequarroz.ch

Demande utilisateur validée le 21 septembre 2026.

- [x] Installer Storybook Vue/Vite dans le dépôt.
- [x] Documenter les fondations et dix composants existants avec 35 stories et données fictives.
- [x] Vérifier thèmes, responsive, interactions et accessibilité, puis build et compatibilité Nuxt.
- [x] Déployer un projet statique séparé, raccorder le sous-domaine et vérifier HTTPS.
- [x] Documenter la maintenance et reporter les preuves dans ANT-23.

Le catalogue réutilise les styles et composants du site. Il ne charge ni configuration Nuxt serveur, ni secrets, ni données client. Les événements commerciaux sont simulés. Les sources des composants documentés sont destinées à être visibles dans le catalogue ; aucun composant de connexion, configuration de sécurité ou accès serveur n’est inclus.

Retour arrière : retirer les fichiers Storybook et les scripts/dépendances associés ; le projet Nuxt conserve son déploiement actuel. Le domaine UI pointe uniquement vers le projet de catalogue séparé.

## Preuves du 21 septembre 2026

## Extension validée : tous les composants

- [x] Couvrir les 34 fichiers Vue de `app/components` (24 ajouts).
- [x] Isoler les stores, API, configuration et tracking dans un environnement Storybook fictif ; réutiliser les composants réels.
- [x] Ajouter les états utiles, les langues, les interactions et un contrôle automatique de couverture.
- [x] Vérifier build, typecheck, rendu et interactions ; republier aq-ui et synchroniser ANT-23.

Les effets Spline utilisent une ressource visuelle publique externe ; le CRM, le contact, l’upload et le rapprochement ne doivent jamais appeler le backend.

- Storybook build et Nuxt typecheck passent, job Portly `tmp_4e35009d`.
- Suite existante : 102 fichiers, 666 tests réussis (`tmp_ee67cd13`).
- Fonctions play facture et devis : PASS dans Storybook. Devis : bouton désactivé avant confirmation, activé après, événement attendu reçu.
- Axe : zéro violation sur les scénarios portail inspectés (clair, sombre après stabilisation et viewport 320 px). Notification d’erreur réelle du composable visible.
- Projet Vercel `aq-ui`, déploiement `aq-k5pbjp8ox-antoinequarrozs-projects.vercel.app` ; alias `aq-ui.vercel.app` vérifié dans le navigateur.
- CNAME `ui` ajouté chez Infomaniak sans modifier les autres enregistrements. Serveur autoritatif et résolveur 1.1.1.1 renvoient la cible attendue. Vercel confirme configuration valide et certificat émis. HTTPS du domaine final vérifié (200 et certificat valide, IP résolue publiquement passée à curl --resolve).
- Cache DNS du Mac encore négatif à la fin de la vérification ; l’alias Vercel permet l’accès immédiat pendant sa propagation. Pas de modification du résolveur local.
- CI build préparée, non exécutée sur GitHub ; les modifications restent sur la branche locale `codex/ant-23-storybook`. Publication du catalogue effectuée manuellement, guide `docs/storybook.md`.


## Preuves de l’extension complète

- 34/34 composants importés dans les stories ; 93 exemples dans le manifeste publié.
- Build final et couverture : `tmp_04d9c238`. Typecheck, 102 fichiers / 666 tests : `tmp_91669644`.
- Rendus des 24 composants ajoutés contrôlés dans le navigateur ; correction du clonage de l’éditeur de cas et du repli i18n Hero.
- Play PASS : rapprochement bancaire (9 étapes), contact succès/erreur/attente, thème, cartes, devis et facture. Les assertions de visibilité attendent la fin des transitions.
- Menu mobile sombre 375 px, fermeture Échap/retour du focus ; CRM mobile sans débordement. Axe ciblé : facture zéro violation, contact après stabilisation zéro violation et un résultat inconclusif. Pas d’audit exhaustif des 93 états.
- Déploiement production `aq-2nv1ew3ql-antoinequarrozs-projects.vercel.app`, job `tmp_c391e2af`. Domaine https://ui.antoinequarroz.ch résolu normalement, HTTPS 200 et manifeste distant de 93 stories. Interface publiée vérifiée.
- Guide `docs/storybook.md` mis à jour ; CI de couverture/build préparée, non exécutée sur GitHub. Publication manuelle ; aucune publication de l’application Nuxt ni push Git.

- Dernière publication documentaire : correction du lien vers le CSV fictif, `tmp_c8354fb2`, déploiement `aq-bybu1c4ih-antoinequarrozs-projects.vercel.app`.
