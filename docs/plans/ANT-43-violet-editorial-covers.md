---
linear: https://linear.app/antoinequarroz/issue/ANT-43/adopter-les-couvertures-violettes-space-grotesk-pour-le-lot-editorial
status: in-review
---

# Adopter les couvertures violettes Space Grotesk du lot éditorial

Antoine a validé la proposition PhysioBaur et demandé son remplacement sur l’article 036, puis la préparation des couvertures 037–041 dans le même style : fond sombre, dégradé violet, Space Grotesk et composition graphique. Les captures de projets restent réelles et les autres scènes restent illustratives. Les posts LinkedIn et X restent des brouillons à valider séparément.

Le contrat Hermes accepte exactement deux identifiants : `aq-editorial-photorealistic-v1` pour les anciens payloads et `aq-editorial-violet-space-grotesk-v1` pour ce lot. POST et PUT renvoient le style réellement validé. Le script Python conserve tout style explicite approuvé, utilise le style historique uniquement si le champ est absent et refuse un style inconnu ou vide. Le PUT reste limité à `site`, `articleId`, `coverImageDataUrl` et `coverStyle`.

## Critères de livraison

- [x] Les deux styles exacts sont acceptés en création et remplacement, et les styles inconnus restent refusés.
- [x] Le script de publication conserve le style violet explicite et la compatibilité des anciens payloads.
- [x] Tests ciblés TypeScript/Python et typage réussis, sans appel de publication pendant les tests.
- [x] Les six couvertures 036–041 sont contrôlées en PNG 1200 × 675, avec police exacte, lisibilité, orthographe, provenance et manifeste SHA256.
- [x] La file, les briefs, les ressources et la configuration FRIDAY utilisent le style approuvé ; la préparation ne prétend pas qu’une future exécution a déjà réussi.
- [x] Après déploiement du contrat, seule la couverture de l’article CMS 41 / numéro 036 est remplacée ; titre, texte, slug et date de publication sont conservés et relus publiquement.
- [x] Les deux brouillons sociaux PhysioBaur conservent leurs textes, leurs visuels et leur état manuel à valider, sans programmation ni publication.

- [ ] Le cadre des couvertures conserve le ratio16/9 et laisse voir le titre, le robot et les éléments de marque sur la page, la liste et l’accueil, sur mobile et ordinateur.

## Vérification et limites

La route de remplacement modifie uniquement `cover_image` et `updated_at`. Elle n’expose pas de précondition atomique sur l’ancienne couverture. Le remplacement opérationnel doit donc vérifier l’article et sa couverture avant l’unique PUT, puis relire les champs métier et la couverture publique après. En cas de réponse ambiguë, contrôler l’état public et l’audit avant tout nouvel essai ; ne pas relancer aveuglément une opération dont l’upload, la mise à jour et l’audit sont séparés.

La mutation réelle et les contrôles de production sont coordonnés après la mise en ligne du nouveau contrat. Aucun secret, contenu client privé ou clé d’API n’entre dans ce plan.

## Preuves locales du contrat

- `npm test -- tests/hermes-publish-api.test.ts` : 20 contrôles réussis, dont conservation de chacun des deux styles en POST/PUT, refus de style inconnu/vide/manquant et maintien de la limite de quatre champs pour le PUT. Portly `tmp_9bc20bd7`, exit 0.
- `python3 -m unittest scripts/hermes/test_publish_article.py` : quatre méthodes et leurs sous-cas réussis, dont styles explicites conservés, fallback historique uniquement sur champ absent et refus des types/valeurs non approuvés. Portly `tmp_415b4a1f`, exit 0.
- `npm run typecheck` : réussi, Portly `tmp_9386a7ca`, exit 0. Le premier lancement Vitest avait précédé la création du dossier `.nuxt` dans le nouveau worktree et n’avait chargé aucun test ; la relance ciblée après préparation des types a réussi sans modification fonctionnelle supplémentaire.
- Aucune publication, mutation de base, modification d’authentification ou réduction des contrôles d’images pendant cette vérification.

- Couvertures 037–041 reconstruites à empreintes identiques et relues visuellement : Portly `tmp_f0d64879`. Manifeste global réconcilié et couverture036 reconstruite à l’identique après localisation de ses sources : Portly `tmp_1a67cd48`. Les six PNG1200×675 font141–333ko ; police OFL incluse.
- Le test Python du contrat est ajouté à la CI, en plus des tests de transport existants.

## Configuration et état avant livraison

Le 18 octobre à 18:09 Europe/Zurich, Hermes Web a confirmé « Tâche mise à jour » pour `e34258e2fcab`. La fiche sauvegardée utilise le nouveau style ; les deux anciens paragraphes de couverture incompatibles ont été remplacés. Mission active, livraison locale, calendrier `weekdays at 7am`, prochaine échéance le19octobre à07:00 ; aucun lancement manuel. Le profil actif `default` a été rétabli. Le heartbeat existant `recette-et-suivi-des-stories-hermes` a été mis à jour via le tool officiel, toujours actif à06:30/07:30 et sur le même thread.

Relecture privée des deux brouillons le18octobre à18:12 : LinkedIn et X restent `draft` / `manual` / version2, textes et clés inchangés, couverture violette jointe, aucune approbation ni date de publication. Deux GET seulement, aucune écriture ; Portly `tmp_fe8622ac`.

PR286 sur4e65c16 : qualité, base de données et accessibilité réussies ; contrôle SEO final encore en cours à ce stade. Le remplacement de la couverture publique attend le déploiement et reste décoché.

## Preuve publique et correction du cadrage

PR286 fusionnée : `09ed9fee30465b8d666a8c0bea39d0b4588753b8`. Production saine, PUT unique du nouveau style réussi à16:28:07UTC et vérification publique réussie à16:28:09UTC, Portly `tmp_cf89a6c4`. Le reçu `seo/receipts/2026-10-18-article-036-violet-cover.json` prouve l’image, son SHA, le blog et OpenGraph, ainsi que la conservation de tous les champs métier. Aucune écriture sociale. La première attente Portly `tmp_e1f2dadb` s’était terminée avant le déploiement, sur le contrôle de version uniquement ; son `&&` n’avait donc exécuté aucun PUT.

La vérification visuelle a ensuite révélé que l’ancien cadre de768×320 recadrait une couverture1200×675 et coupait les éléments de marque. La correction reste dans cette story : préserver le ratio16/9 et la couverture complète dans le header et les cartes ; garder les interactions de l’éventail de l’accueil. Les PNG approuvés restent inchangés.

Correction du cadrage : `app/pages/blog/[slug].vue`, `app/pages/blog/index.vue` et `app/components/ui/CardStack.vue`. Typage et21 tests existants réussis, Portly `tmp_7534483a`. Géométrie réelle du composant compilé + Tailwind vérifiée à320/375/768/1280px : ratio1,778, image entière, texte sous image et carte active contenue dans l’éventail ; Portly `tmp_1ee0d7db`. Réserve de hauteur augmentée après détection du cas320px. Les contrôles de production de ce cadrage restent à confirmer après la prochaine mise en ligne.
