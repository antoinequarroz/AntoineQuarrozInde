---
version: 1
slug: "app-pages-admin-payments-index-vue"
primary_target: "app/pages/admin/payments/index.vue"
related_targets: []
---

# Encaissements admin

## Scope et mode

Surface administrative en mode **Operate**, limitée au suivi quotidien des encaissements et des anomalies de paiement.

## Audience, tâche et contenu

Antoine doit comprendre rapidement sa trésorerie, traiter ce qui demande une vérification, puis retrouver un mouvement précis. La surface s'appuie sur les montants encaissés et ouverts, les sessions TWINT, les alertes de retard ou d'expiration et le registre chronologique. L'action principale conduit vers les factures concernées.

## Direction retenue

**Journal d'encaissement exceptions-first** — seed `7c57deef`, structure 7. La hiérarchie durable est **synthèse → alertes → registre** : une bande compacte donne la situation, « À surveiller » expose immédiatement les écarts actionnables, puis le journal permet recherche et filtrage. Le moment mémorable est le passage direct de la vue d'ensemble à la file d'exceptions, sans détour par des graphiques décoratifs.

## Décisions résolues

- **Export CSV filtré (AQ-050)** : l'export comptable reprend durablement le même périmètre que le registre visible — recherche, statut et période — afin que l'extraction corresponde à la vue opérationnelle en cours.
- **Rapprochement bancaire assisté (AQ-051)** : le cockpit prolonge son flux d'encaissement avec l'import ponctuel d'un CSV bancaire local et présente des propositions de correspondance avant toute mutation. Chaque rapprochement exige une confirmation humaine explicite, un contrôle anti-doublon empêche de traiter plusieurs fois le même mouvement et aucune écriture n'est créée ou modifiée automatiquement. Le parcours reste pleinement utilisable sur mobile comme sur desktop.
- **Relevés CAMT.053 (AQ-052)** : le même panneau accepte désormais les relevés bancaires XML CAMT.053 en complément du CSV, sans créer un second parcours. Le format détecté reste visible pendant le contrôle et les transactions importées rejoignent les mêmes propositions, confirmations humaines et protections anti-doublon. Le fichier est lu uniquement dans le navigateur, n'est jamais téléversé et disparaît de la préparation locale lorsque l'utilisateur ferme le panneau ou choisit un autre fichier.

## Contraintes

- Prolonger les surfaces admin calmes existantes : violet pour l'action, cyan pour l'information et couleurs comptables réservées aux statuts.
- Préserver la lisibilité dense, les thèmes clair et sombre, le responsive et les états clavier.
- Ne pas transformer cette route en dashboard marketing ni masquer les anomalies derrière la synthèse.
- Les données financières restent privées et les liens d'action doivent conserver le contexte de facture.
- L'extension CAMT doit conserver une limite de fichier explicite, rejeter les XML non conformes et annoncer clairement que le traitement reste local.

## Décisions non résolues

Toute future action d'encaissement directe reste hors périmètre et demande une validation produit séparée.
