---
version: 1
slug: "app-pages-admin-accounting-index-vue"
primary_target: "app/pages/admin/accounting/index.vue"
related_targets: []
---

# Comptabilité admin

## Scope et mode

Surface administrative en mode **Operate**, consacrée à la lecture comptable opérationnelle et à la préparation des factures récurrentes.

## Audience, tâche et contenu

Antoine doit isoler une période et une devise, vérifier rapidement le net facturé, la TVA, les avoirs et les encaissements, puis exporter le détail de TVA ou administrer ses récurrences. La page rapproche ces deux tâches parce qu'elles préparent le suivi financier, tout en gardant une séparation visuelle nette entre synthèse comptable et automatisation.

## Direction retenue

**Synthèse vérifiable, automatisation sous contrôle.** La hiérarchie durable est **périmètre → indicateurs → détail TVA → récurrences**. Les filtres datés et la devise définissent toujours le contexte avant les montants. La grille de synthèse reste compacte, le tableau fournit la preuve détaillée et la récurrence arrive ensuite comme action de production, sans concurrencer la lecture comptable.

## Décisions résolues

- **Période et devise explicites (AQ-054)** : tous les indicateurs et l'export CSV portent sur la période et la devise sélectionnées. Les devises ne sont jamais additionnées entre elles.
- **Périmètre comptable prudent (AQ-054)** : la synthèse compte les factures émises, en retard ou payées et exclut les brouillons. Les avoirs diminuent les montants, les paiements annulés sont ignorés et la TVA est ventilée par taux.
- **Avertissement non fiscal (AQ-054)** : la page affirme dès son introduction qu'elle fournit une vue opérationnelle et ne remplace pas une déclaration fiscale officielle. Cet avertissement reste visible et ne doit pas être relégué dans une aide secondaire.
- **Récurrences contrôlées (AQ-053)** : une échéance récurrente crée uniquement un brouillon à vérifier. La création, la suspension, la reprise et la génération manuelle restent explicites ; aucune facture n'est envoyée automatiquement depuis cette surface.

## Ordre responsive

Sur mobile, conserver l'ordre de lecture **titre et avertissement → filtres → indicateurs → détail TVA et export → commande de génération → formulaire de récurrence → profils existants**. Les indicateurs passent en deux colonnes, les filtres et le formulaire se replient sans modifier leur ordre sémantique, et le tableau TVA peut défiler horizontalement sans comprimer les montants.

## Contraintes

- Prolonger les surfaces admin calmes existantes : violet pour les actions, cyan pour l'information et couleurs comptables réservées aux statuts.
- Afficher les montants avec des chiffres tabulaires et toujours conserver la devise dans le contexte visible.
- Préserver les thèmes clair et sombre, les états clavier, les états de chargement et les messages d'erreur accessibles.
- Ne pas présenter cette synthèse comme une comptabilité certifiée ni transformer les récurrences en envoi automatique implicite.

## Décisions non résolues

Une exportation fiscale officielle ou une intégration directe à un logiciel comptable reste hors périmètre et demande une validation produit séparée.
