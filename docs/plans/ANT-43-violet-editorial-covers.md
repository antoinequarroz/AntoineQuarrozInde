---
linear: https://linear.app/antoinequarroz/issue/ANT-43/adopter-les-couvertures-violettes-space-grotesk-pour-le-lot-editorial
status: in-progress
---

# Adopter les couvertures violettes Space Grotesk du lot éditorial

Antoine a validé la proposition PhysioBaur et demandé son remplacement sur l’article 036, puis la préparation des couvertures 037–041 dans le même style : fond sombre, dégradé violet, Space Grotesk et composition graphique. Les captures de projets restent réelles et les autres scènes restent illustratives. Les posts LinkedIn et X restent des brouillons à valider séparément.

Le contrat Hermes accepte exactement deux identifiants : `aq-editorial-photorealistic-v1` pour les anciens payloads et `aq-editorial-violet-space-grotesk-v1` pour ce lot. POST et PUT renvoient le style réellement validé. Le script Python conserve tout style explicite approuvé, utilise le style historique uniquement si le champ est absent et refuse un style inconnu ou vide. Le PUT reste limité à `site`, `articleId`, `coverImageDataUrl` et `coverStyle`.

## Critères de livraison

- [x] Les deux styles exacts sont acceptés en création et remplacement, et les styles inconnus restent refusés.
- [x] Le script de publication conserve le style violet explicite et la compatibilité des anciens payloads.
- [x] Tests ciblés TypeScript/Python et typage réussis, sans appel de publication pendant les tests.
- [x] Les six couvertures 036–041 sont contrôlées en PNG 1200 × 675, avec police exacte, lisibilité, orthographe, provenance et manifeste SHA256.
- [ ] La file, les briefs, les ressources et la configuration FRIDAY utilisent le style approuvé ; la préparation ne prétend pas qu’une future exécution a déjà réussi.
- [ ] Après déploiement du contrat, seule la couverture de l’article CMS 41 / numéro 036 est remplacée ; titre, texte, slug et date de publication sont conservés et relus publiquement.
- [ ] Les deux brouillons sociaux PhysioBaur conservent leurs textes, leurs visuels et leur état manuel à valider, sans programmation ni publication.

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
