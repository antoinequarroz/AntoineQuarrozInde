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
- Complément demandé le 16 octobre : dater les documents courants, garder
  la facture de solde sans date jusqu'à la livraison, retirer les statuts des
  PDF clients et ne pas afficher d'échéance sur le devis. La facture d'acompte
  porte l'échéance précise demandée du 16 novembre 2026.

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

## Complément de présentation client

La date d'édition du contrat doit rester distincte de son entrée en vigueur
et ne doit pas modifier un snapshot déjà figé. Les statuts restent disponibles
dans l'administration ; seule leur impression sur les PDF est retirée.
Le document de solde reste préparé pour une émission ultérieure.
- Suite complète : 147 suites, 897 tests réussis (Portly `tmp_7efaa46c`).
- Tests ciblés finaux : 16 réussis (Portly `tmp_f79ae226`), dont les anciens
  snapshots figés, les champs sans date et la protection des échéances.
- Typecheck et build réussis (`tmp_cd9ec09d`, `tmp_449d8b58`).
- Vrai template Typst compilé puis extrait avec pdfplumber : devis sans
  échéance/statut, facture avec date et échéance explicites, solde sans date
  ni échéance. QR conservés (`tmp_b1b4cebd`).
- Revue indépendante : aucun constat actionnable.
- Livraison et nouvelle vérification des documents réels en cours ; aucun
  envoi, acceptation ou signature.

Aucune donnée client ni aucun document privé n'est conservé dans ce plan.
