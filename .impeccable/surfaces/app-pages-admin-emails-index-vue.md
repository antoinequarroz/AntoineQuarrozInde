---
version: 1
slug: "app-pages-admin-emails-index-vue"
primary_target: "app/pages/admin/emails/index.vue"
related_targets: ["app/layouts/admin.vue"]
---

## Scope et mode

- Route : `/admin/emails`.
- Mode : Operate.
- Surface réservée à Antoine et aux administrateurs autorisés.

## Travail principal

Contrôler rapidement les derniers e-mails transactionnels envoyés par Lumail, repérer les échecs, rebonds et signalements, puis poursuivre l’investigation dans Lumail si nécessaire.

## Contenu et contraintes

- Afficher uniquement les métadonnées utiles : sujet, destinataire, expéditeur, date, statut et catégorie.
- Ne jamais transmettre au navigateur le corps HTML ou texte des e-mails, ni la clé API.
- Distinguer clairement les chiffres de la page chargée d’un total global.
- Rester exploitable au clavier, en clair, en sombre, sur mobile et sur desktop.

## Direction

Un journal opérationnel dense et chronologique, avec quatre mesures compactes et des couleurs réservées à la sémantique des statuts. La recherche et les filtres précèdent la liste ; Lumail reste la destination du diagnostic détaillé.

## Décision ouverte

Les statistiques globales sur une période pourront être ajoutées plus tard si Lumail expose un agrégat fiable, sans les déduire d’une page paginée.
