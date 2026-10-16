---
linear: https://linear.app/antoinequarroz/issue/ANT-38
status: done
---

# Indicateurs et listes filtrées

Vérifier les six indicateurs du tableau de bord et terminer « Nouveaux messages » : lien `status=new`, compteur complet et prédicat partagé avec la messagerie. Conserver le plafond des aperçus commerciaux. Les autres liens de contexte restent exacts ; les liens génériques gardent leur liste complète. Corriger le lien CRM et le titre des cinq prochains rendez-vous.

Messagerie : filtre URL réactif, conservé après rechargement et réinitialisable. Les détails et les liens `messageId` restent dans le périmètre visible. Aucun statut changé à l’ouverture, aucun envoi automatique. Éditer les métadonnées sur une copie ; un PUT échoué conserve la saisie et la réponse. Re-sélectionner après un enregistrement confirmé seulement.

Validation : cas unitaires des statuts et paramètres invalides ; E2E avec messages simulés, compteur supérieur à six, six href des indicateurs, filtre/rechargement/retour/mobile/ID hors filtre, échec et réussite du PUT. Tests, typecheck, compilation, revue indépendante, CI complète, déploiement puis contrôle réel dans Dia sans mutation de données métier.

## Validation locale

Portly `tmp_21232c2f` : 922 tests Vitest (152 fichiers), typecheck et compilation réussis. Revue indépendante sans blocage ; les métadonnées sont éditées sur une copie et la réponse reste intacte après un PUT échoué. Deux E2E ajoutés, API messages entièrement simulée, aucun envoi réel. Vérification des six liens KPI, du compteur à huit nouveaux messages et du parcours mobile. CI, déploiement et contrôle réel à terminer.

## Préparation du serveur

Douze anciennes images du site (27–28 septembre) ont été retirées sans force après vérification immédiate de l’absence de tag, de référence par tout conteneur même arrêté et de leur APP_VERSION exacte, correspondant à des commits du site vérifiés. Espace disponible : 2,8 Go avant déploiement. Images actives et récentes, BuildKit, bases, volumes et autres applications préservés.

## Déploiement

PR #278 fusionnée après réussite de quality, database, accessibility, seo-quality et GitGuardian. Commit cible `be6c44345149a56f6d6ee88b59f7a8176ec8cc3b`, run principal `38965699606`. Contrôles quality/database/seo-quality main réussis ; approbation Production effectuée, déploiement et preuves publiques réussis.

## Contrôle réel

Portly `tmp_8d8817c7` réussi en une tentative : commit public exact, application et base saines. Dans Dia après rechargement : les six liens d’indicateurs sont corrects, CRM pointe sur `/admin/crm` et le titre de l’agenda correspond aux prochains rendez-vous.

La carte Messages ouvre `/admin/messages?status=new`, sélection « Nouveau », état vide et aucun détail hors filtre. Rechargement conservé ; « Tous les statuts » retire le paramètre et affiche trois messages répondus ; nouvelle sélection « Nouveau » exclut les trois et masque leur détail. Aucun envoi ni aucune mutation de donnée métier. Fin des E2E encore attendue.

## Reprise du contrôle E2E

Le run `38965699606` a livré correctement le produit mais échoue dans le nouveau test : après une navigation complète avec `messageId`, le test attend seulement la valeur du select rendue côté serveur avant de changer le filtre. Le sujet du message, alimenté au montage après chargement, est désormais attendu avant l’interaction. L’assertion de suppression du paramètre reste inchangée.

Le test mobile existant attendait aussi quatre dépendances réseau réelles pendant son scénario factures. Les clients, devis, projets et profil de facturation sont désormais simulés dans ce cas, et un signal d’interception vérifie que la requête contrôlée a réellement commencé avant de libérer la réponse. Toutes les assertions et les délais restent identiques. Portly `tmp_a131ae54` : typecheck et découverte des 18 scénarios ciblés réussis. Revue indépendante sans blocage ; nouvelle suite complète encore attendue.

PR de reprise #279, tests et documentation uniquement. Préflight de reprise : 12 autres images anciennes du site (25–27 septembre) retirées avec les mêmes gardes ; espace revenu à 2,8 Go avant déploiement. Aucun volume, base, conteneur actif, cache BuildKit ou retour arrière récent supprimé.

PR #279 fusionnée après tous les contrôles réussis. Version de reprise `cfe6b192f2c375777253bb83737869864f047264`, run principal `38969667609`. Portly `tmp_d310bd92` vérifie en une tentative que la version publique exacte sert une application et une base saines. Produit inchangé depuis le contrôle Dia réussi.

## Livraison finale

Le [run principal final](https://github.com/antoinequarroz/AntoineQuarrozInde/actions/runs/38969667609) est entièrement réussi : quality, database, seo-quality, déploiement et E2E. Les 65 tests E2E passent du premier coup, sans échec, test instable ni reprise, en 5,7 minutes. Les deux scénarios corrigés sont validés. Le contrôle accessibilité est réussi sur la PR ; il est ignoré par configuration sur le run main.

Les six indicateurs ouvrent leur liste avec leur filtre exact : factures à encaisser, sous 30 jours, en brouillon ; devis envoyés ; tâches dues aujourd’hui ; messages nouveaux. Filtre Messages conservé après rechargement et réinitialisation vérifiée dans Dia. Aucun changement de statut à l’ouverture, aucune réponse envoyée et aucune donnée métier modifiée lors des contrôles. Critères et preuves de livraison complets ; ANT-38 peut être clôturé.
