---
linear: ANT-33
linear_url: https://linear.app/antoinequarroz/issue/175a9351-2074-4e1f-891d-5af0edadf1ce
status: in-review
---

# Reçus sociaux et contrôle des documents LinkedIn

Le runner perd l'étape précise d'un refus HTTP, conserve les deux-points d'une
clé LinkedIn malgré Rest.li 2.0 et refuse immédiatement un reçu Treg dont la
lecture retourne un 404 transitoire après l'appel fournisseur.

## Périmètre

- Encoder l'URN entier dans la lecture du document LinkedIn.
- Conserver uniquement la plateforme, l'étape et le statut HTTP d'un refus.
  Un HTTP 402 X indique une facturation API à vérifier. Aucun corps fournisseur,
  secret ou lien de téléversement signé n'entre dans le message conservé.
- Lire au plus trois fois le même reçu Treg, avec deux attentes de 1 puis
  2 secondes et un délai réseau de 10 secondes par lecture. Seul un GET de reçu
  retournant 404 est relu, même si sa réponse n'est pas du JSON.
- Préserver les vérifications exactes du coût nul, du compte, de la méthode,
  du chemin et du statut. Un reçu malformé ou tout autre statut est refusé.
- Préserver les approbations, les formats et ratios acceptés, les limites X,
  les statuts du site et l'interdiction de rejouer un appel de publication.

## Validation

Tests Python locaux avec tous les transports fournisseur simulés : encodage
Rest.li, erreur de lecture empêchant la création du post, absence de secrets
dans les erreurs et traces, 404 de reçu suivi d'un reçu valide ou d'un échec,
nombre borné de GET, absence de répétition du POST et refus de chaque champ
de preuve divergent. Les tests existants d'approbation, de média et de coût
doivent rester verts.

- 50 tests Python passent via Portly, job `tmp_02908a19` : transports simulés,
  séquences 404, preuves malformées, erreurs HTTP et sentinelles de confidentialité.
- 30 tests Vitest ciblés passent via Portly, job `tmp_25b5e123` : contrat CLI,
  approbations et médias mixtes. La dernière modification ajoute seulement la
  suppression d'une cause d'erreur Treg dans les traces ; elle est couverte par
  la suite Python finale.
- Relecture indépendante du diff effectuée ; le défaut de confidentialité
  relevé dans une cause d'erreur Treg a été corrigé et testé.
- `git diff --check` passe. Aucune donnée, publication ou permission modifiée.

Le runner a été installé seul dans l'espace de travail Hermes, après sauvegarde
du fichier précédent. Le fichier retéléchargé contient exactement le code testé
(seule la fin de fichier perd son saut de ligne dans l'éditeur). Comparaison du
texte normalisé et de l'AST réussie via Portly `tmp_eb5ebedc`.

La [PR 271](https://github.com/antoinequarroz/AntoineQuarrozInde/pull/271)
reste en revue pendant les contrôles CI. Aucun essai ne doit publier, créer de
média distant ou modifier un brouillon réel. Une nouvelle tentative utilisateur
reste nécessaire pour vérifier la publication LinkedIn de bout en bout.

## Sources

- [Rest.li 2.0 : clé de ressource entièrement encodée](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/protocol-version)
- [Référence Treg : lectures des reçus et résultats](https://treg.to/docs)

Le 404 transitoire est traité comme une indisponibilité bornée du reçu ; aucune
garantie de cohérence immédiate n'est supposée. Aucun identifiant de compte,
publication réelle, secret ou contenu client n'est conservé dans ce plan.
