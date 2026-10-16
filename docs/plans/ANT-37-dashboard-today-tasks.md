---
linear: https://linear.app/antoinequarroz/issue/ANT-37
status: in_review
---

# Tâches à faire aujourd’hui

Relier la carte à `filter=due-today` avec un prédicat partagé : tâche non terminée, échéance connue aujourd’hui ou passée selon Europe/Zurich. Garder les tâches en cours et les retards ; exclure les terminées, futures et sans échéance.

Filtre URL réactif et réinitialisable, appliqué sur mobile et bureau, avec compteur et état vide adaptés. Aucun changement du store, du cache ou de la queue hors ligne pour filtrer. Conserver les identifiants négatifs, `new=1` et les liens d’édition ; aucun lien ne doit ouvrir une tâche hors filtre. Un changement explicite de filtre peut fermer une édition hors périmètre, sans réinitialiser les saisies lors d’une synchronisation ou d’un échec d’enregistrement.

Validation : tests des statuts, des échéances et de la date suisse ; E2E en lecture simulée (clic, rechargement, remise à zéro, retour, liens taskId) ; typecheck, compilation, CI et contrôle dans Dia. Aucune tâche réelle modifiée.

## Vérification locale

918 tests Vitest réussis, typecheck et compilation réussis. Revue indépendante sans blocage après correction de la fermeture du formulaire : seul un changement explicite de filtre la déclenche, hors soumission. Les deux parcours E2E couvrent la navigation et la préservation des saisies après un échec simulé ; toutes les lectures et mutations de tâches y sont interceptées. CI, déploiement et contrôle public à terminer.
