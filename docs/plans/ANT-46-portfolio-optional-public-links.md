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

## Preuves

- Base de départ : `origin/main` à jour, `2048505503173168dd0149866cceb851027aae6c` ; checkout isolé.
- Portly `tmp_75a6b1a0` : préparation Nuxt puis 46 tests ciblés réussis dans six fichiers (états, compatibilité, confidentialité, catégories, traductions, MFA). La première invocation sur le worktree neuf ne trouvait pas les types `.nuxt` ; la préparation standard a résolu ce prérequis sans changement de code.
- Portly `tmp_86f60c13` : 15 tests d’états réussis après ajout des cas GitHub JavaScript et URL malformée.
- Portly `tmp_eb46cb9f` : 1 049 tests unitaires réussis dans 156 fichiers, après alignement du parcours métier sur la carte publique sans lien et maintien de son refus pour une étude de cas publiée.
- Portly `tmp_a379dc96` : contrôle TypeScript réussi.
- Portly `tmp_f03a0317` : reconstruction éphémère du schéma et des migrations, lint et security advisors sans erreur, puis 329 assertions pgTAP réussies dans 23 fichiers. La base temporaire a été arrêtée par le nettoyage du script ; aucune base métier n’a été utilisée.
- Revue indépendante : aucune anomalie bloquante ; garde de fonction identique au schéma, hors restriction de lien limitée à l’étude de cas.
- La nouvelle fixture E2E carte → page projet sans boutons externes reste à confirmer par le pipeline normal ; contrôle final réel dans l’administration après déploiement.
- Aucune modification de session, MFA, appartenance, rôle, politique RLS, droit RPC ou donnée CMS.
