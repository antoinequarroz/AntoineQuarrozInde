---
linear: https://linear.app/antoinequarroz/issue/ANT-37
status: done
---

# Tâches à faire aujourd’hui

Relier la carte à `filter=due-today` avec un prédicat partagé : tâche non terminée, échéance connue aujourd’hui ou passée selon Europe/Zurich. Garder les tâches en cours et les retards ; exclure les terminées, futures et sans échéance.

Filtre URL réactif et réinitialisable, appliqué sur mobile et bureau, avec compteur et état vide adaptés. Aucun changement du store, du cache ou de la queue hors ligne pour filtrer. Conserver les identifiants négatifs, `new=1` et les liens d’édition ; aucun lien ne doit ouvrir une tâche hors filtre. Un changement explicite de filtre peut fermer une édition hors périmètre, sans réinitialiser les saisies lors d’une synchronisation ou d’un échec d’enregistrement.

Validation : tests des statuts, des échéances et de la date suisse ; E2E en lecture simulée (clic, rechargement, remise à zéro, retour, liens taskId) ; typecheck, compilation, CI et contrôle dans Dia. Aucune tâche réelle modifiée.

## Vérification locale

918 tests Vitest réussis, typecheck et compilation réussis. Revue indépendante sans blocage après correction de la fermeture du formulaire : seul un changement explicite de filtre la déclenche, hors soumission. Les deux parcours E2E couvrent la navigation et la préservation des saisies après un échec simulé ; toutes les lectures et mutations de tâches y sont interceptées.

## Préparation de production

PR #277 fusionnée après réussite de quality, database, accessibility et seo-quality. Version cible : `b778ad3d06f3c7e5030fe0a64f12b686339f0bee` ; exécution principale `38960835982`.

Douze anciennes images du site ont été retirées sans force après vérification immédiate de l’absence de tag et de toute référence de conteneur, ainsi que de leur APP_VERSION. Espace disponible remonté à 2,8 Go avant déploiement ; volumes, bases, images actives, images de retour arrière récentes et cache BuildKit préservés.

## Contrôle public dans Dia

La vérification Portly `tmp_6a098b30` confirme que l’URL publique sert le commit cible et que l’application et la base sont saines. Dans la session d’administration Dia : clic de la carte vers `/admin/tasks?filter=due-today`, choix « À faire aujourd’hui », état vide adapté, conservation après rechargement, retour à toutes les tâches par le bouton, puis nouvelle sélection du filtre avec URL correcte. Liste réelle actuellement vide ; aucune tâche créée ou modifiée. Tableau de bord laissé ouvert après contrôle.

## Livraison terminée

[PR #277](https://github.com/antoinequarroz/AntoineQuarrozInde/pull/277) fusionnée et commit `b778ad3d06f3c7e5030fe0a64f12b686339f0bee` déployé. [Run principal 38960835982](https://github.com/antoinequarroz/AntoineQuarrozInde/actions/runs/38960835982) réussi : quality, database, seo-quality, deploy et e2e. Accessibilité réussie dans la PR ; job ignoré sur main selon sa condition habituelle. Suite complète E2E : 63 tests réussis en 5,8 minutes, sans échec ni reprise signalés. Tous les critères d’acceptation sont vérifiés.
