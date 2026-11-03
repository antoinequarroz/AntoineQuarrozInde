---
linear: ANT-46
status: In Review
---

# Portfolio sans lien de démonstration public

Un projet dont la démonstration et le code restent privés doit pouvoir être présenté dans le portfolio. La carte et la page projet restent consultables ; aucun bouton vers un site ou un dépôt n’apparaît en l’absence de lien.

## Périmètre

- Rendre les liens externes facultatifs pour une carte portfolio publique et sa page simple.
- Conserver un lien public obligatoire pour une étude de cas publiée.
- Aligner le formulaire, la validation API et la garde PostgreSQL ; conserver les valeurs privées par défaut.
- Conserver les contrôles de session/MFA, de rôle, de confidentialité, d’approbation et d’audit atomique.
- Ne modifier aucun projet existant ni inventer de lien public.

## Validation et livraison

- Tests unitaires des états avec et sans liens, des liens invalides et des gardes existantes.
- Tests PostgreSQL sur une base locale éphémère : création/publication sans lien par un administrateur, refus d’un rôle insuffisant, audit, étude de cas toujours protégée et interdiction d’écriture publique directe.
- Contrôle du parcours public avec une fixture sans lien : carte, page projet et absence de boutons externes.
- Vérification finale par Antoine dans l’administration après les gates normales de pull request et de production.

## Correction de la géométrie après ajout des quatre projets

La vérification de production a révélé un chevauchement de 6 à 14 px des deux cartes avant à 900 px avec 21 projets. La carte sans lien et 80 tests E2E ont réussi ; le test réel de séparation existant reste inchangé.

- Calculer l’écartement frontal depuis le pas angulaire et la largeur réelle non transformée des cartes, avec une marge pour la déformation et la perspective.
- Mesurer la largeur uniquement lors des mesures de mise en page ; garder les animations en transform/opacity et la navigation, l’ordre, les angles, les images différées et reduced motion existants.
- Vérifier les positions fractionnaires et le filtre de trois projets avec les références 17, 21 et 30, aux largeurs 768, 900, 1280 et 1440 px.
- Conserver une capture avec 21 projets fictifs à 900 px ; aucune donnée client utilisée pour cette régression.
- Première vérification locale : 25 tests unitaires ciblés et typage réussis (`tmp_f482eb23`). Le serveur de développement a empêché l’arrivée sur la homepage avant toute mesure de géométrie ; vérification prévue sur le build de production local, sans modification des assertions de navigation.
- Base de la correction : `origin/main` `b16864efcc3d09c540369a70c18cad3b00588fb1`, dans un nouveau worktree propre ; la première livraison et ses preuves locales sont conservées.
- Portly `tmp_e9fa4117` : build de production local réussi, sans installation de dépendances.
- Portly `tmp_80fae748` : sept tests E2E portfolio réussis au premier passage sur ce build (36,5 s, retries 0). Les trois nouvelles fixtures vérifient strictement les boîtes projetées pour 17, 21 et 30 projets, aux largeurs 768/900/1280/1440 px, aux positions fractionnaires et dans le filtre de trois projets à 900/1440 px. Les quatre tests existants vérifient encore mobile, images différées, navigation, reduced motion et page sans lien.
- Capture de la fixture de 21 projets à 900 px, inspectée visuellement : `/Users/antoinequarroz/Documents/Codex/2026-10-19/portfolio-ajouts/portfolio-helix-21-fixtures-900px.png`.
- Revue croisée : aucune anomalie bloquante. Le test réel `e2e/public.spec.ts` et ses assertions de non-chevauchement sont conservés sans modification ; leur réussite après déploiement reste une gate de livraison.

## Preuves initiales du support des projets sans lien

- Base de départ : `origin/main` à jour, `2048505503173168dd0149866cceb851027aae6c` ; checkout isolé.
- Portly `tmp_75a6b1a0` : préparation Nuxt puis 46 tests ciblés réussis dans six fichiers (états, compatibilité, confidentialité, catégories, traductions, MFA). La première invocation sur le worktree neuf ne trouvait pas les types `.nuxt` ; la préparation standard a résolu ce prérequis sans changement de code.
- Portly `tmp_86f60c13` : 15 tests d’états réussis après ajout des cas GitHub JavaScript et URL malformée.
- Portly `tmp_eb46cb9f` : 1 049 tests unitaires réussis dans 156 fichiers, après alignement du parcours métier sur la carte publique sans lien et maintien de son refus pour une étude de cas publiée.
- Portly `tmp_a379dc96` : contrôle TypeScript réussi.
- Portly `tmp_f03a0317` : reconstruction éphémère du schéma et des migrations, lint et security advisors sans erreur, puis 329 assertions pgTAP réussies dans 23 fichiers. La base temporaire a été arrêtée par le nettoyage du script ; aucune base métier n’a été utilisée.
- Revue indépendante : aucune anomalie bloquante ; garde de fonction identique au schéma, hors restriction de lien limitée à l’étude de cas.
- La nouvelle fixture E2E carte → page projet sans boutons externes reste à confirmer par le pipeline normal ; contrôle final réel dans l’administration après déploiement.
- Aucune modification de session, MFA, appartenance, rôle, politique RLS, droit RPC ou donnée CMS.
