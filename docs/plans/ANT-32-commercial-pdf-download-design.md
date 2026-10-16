---
linear: ANT-32
linear_url: https://linear.app/antoinequarroz/issue/ANT-32/fiabiliser-le-telechargement-du-devis-et-harmoniser-le-contrat-pdf
status: in-review
---

# Documents commerciaux : téléchargement et charte

Le bouton PDF d'un devis ouvre une route privée sans transmettre la session
administrateur et renvoie 401. Le contrat utilise une charte différente des
devis et factures.

## Critères de livraison

- Télécharger le devis avec la session admin courante, afficher les erreurs
  et empêcher les téléchargements simultanés.
- Conserver la route PDF privée et son contrôle d'organisation.
- Harmoniser le contrat avec les documents commerciaux AQ/violet et garder
  l'intégralité des clauses, des informations d'acceptation et de la signature.
- Vérifier le rendu des longs documents, les contrôles automatisés et le
  téléchargement réel en production.
- Ouvrir les quatre documents demandés dans Dia pour relecture, sans envoi,
  acceptation ou signature.

## Validation

- `npm test` : 146 suites, 891 tests réussis (Portly `tmp_5a2e24eb`).
- `npm run typecheck` : réussi (Portly `tmp_25e61535`).
- `npm run build` : réussi (Portly `tmp_1b0b66bb`).
- Téléchargement : session transmise en en-tête, erreur 401 sans faux fichier,
  libération du blob même si le navigateur bloque le téléchargement.
- Contrat : cinq tests, dont clauses longues, mots non sécables, marges,
  conservation des données, signature et acceptation regroupées.
- Rendu privé de trois pages inspecté visuellement ; contenu comparé à la
  source, sans modification des clauses ou de l'état commercial.
- Reste à vérifier : gates CI, livraison, téléchargement depuis l'admin
  en production et ouverture des quatre documents dans Dia.

Aucune donnée client ni aucun document privé n'est conservé dans ce plan.
