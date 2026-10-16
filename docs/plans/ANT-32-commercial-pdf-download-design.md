---
linear: ANT-32
linear_url: https://linear.app/antoinequarroz/issue/ANT-32/fiabiliser-le-telechargement-du-devis-et-harmoniser-le-contrat-pdf
status: done
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
- PR 269 et 270 fusionnées. La production sert le commit
  `cf32926d8d869a91ed008c9c5ea9958ebd7c6a51` ; application et base saines.
- CI finale `38905596177` réussie : qualité, base, SEO, déploiement et E2E.
  Le contrôle SEO a nécessité une reprise du seul job en échec après un
  délai de navigation ; l'accessibilité avait passé sur la pull request.
- Téléchargements réels du devis, du contrat et de l'acompte réussis depuis
  la session administrateur dans Dia. La route privée refuse toujours une
  requête anonyme. Les sept pages réellement téléchargées ont été extraites,
  comparées aux rendus locaux et inspectées visuellement ; aucune découpe,
  aucun chevauchement, montants, dates, signature et QR conformes
  (Portly `tmp_4f4401cc`).

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
- Livraison et vérification finale terminées. Trois PDF courants pour
  relecture et fiche de solde sans date dans Dia ; aucun envoi, acceptation,
  signature ou paiement. ANT-32 clôturé après ces contrôles.

Aucune donnée client ni aucun document privé n'est conservé dans ce plan.
