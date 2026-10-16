---
linear: https://linear.app/antoinequarroz/issue/ANT-38
status: in_review
---

# Indicateurs et listes filtrées

Vérifier les six indicateurs du tableau de bord et terminer « Nouveaux messages » : lien `status=new`, compteur complet et prédicat partagé avec la messagerie. Conserver le plafond des aperçus commerciaux. Les autres liens de contexte restent exacts ; les liens génériques gardent leur liste complète. Corriger le lien CRM et le titre des cinq prochains rendez-vous.

Messagerie : filtre URL réactif, conservé après rechargement et réinitialisable. Les détails et les liens `messageId` restent dans le périmètre visible. Aucun statut changé à l’ouverture, aucun envoi automatique. Éditer les métadonnées sur une copie ; un PUT échoué conserve la saisie et la réponse. Re-sélectionner après un enregistrement confirmé seulement.

Validation : cas unitaires des statuts et paramètres invalides ; E2E avec messages simulés, compteur supérieur à six, six href des indicateurs, filtre/rechargement/retour/mobile/ID hors filtre, échec et réussite du PUT. Tests, typecheck, compilation, revue indépendante, CI complète, déploiement puis contrôle réel dans Dia sans mutation de données métier.

## Validation locale

Portly `tmp_21232c2f` : tests Vitest, typecheck et compilation réussis. Revue indépendante sans blocage ; les métadonnées sont éditées sur une copie et la réponse reste intacte après un PUT échoué. Deux E2E ajoutés, API messages entièrement simulée, aucun envoi réel. Vérification des six liens KPI, du compteur à huit nouveaux messages et du parcours mobile. CI, déploiement et contrôle réel à terminer.
