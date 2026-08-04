# Typst et QR-facture suisse

Ce dossier prépare la migration progressive des PDF de facturation vers Typst.

## Installation locale

Le compilateur Typst est installé sous Windows avec WinGet :

```powershell
winget install --id Typst.Typst -e
```

Ouvrir un nouveau terminal après l'installation pour actualiser le `PATH`.

Le package `payqr-swiss` ne nécessite pas de dépendance npm. Typst le télécharge et le met en cache lors de la première compilation grâce à cet import :

```typst
#import "@preview/payqr-swiss:0.4.1": swiss-qr-bill
```

## Vérification

```powershell
npm run typst:qr:demo
```

Le PDF généré est ignoré par Git. Les coordonnées présentes dans l'exemple sont fictives et ne doivent jamais être utilisées pour une facture réelle.

## Données requises avant le branchement production

- IBAN ou QR-IBAN du créancier ;
- nom et adresse postale complète du créancier ;
- adresse postale complète du client ;
- type de référence (`NON`, `SCOR` ou `QRR`) et référence valide si nécessaire ;
- validation stricte de la devise (`CHF` ou `EUR`) ;
- présence du binaire Typst dans l'environnement de déploiement.

## Intégration applicative

- `typst/templates/billing-document.typ` produit les devis et factures A4 multi-pages.
- Les factures éligibles reçoivent une seconde page avec le bulletin QR suisse.
- `server/utils/typstBilling.ts` valide les adresses, la devise, l’IBAN et les références `NON`, `SCOR` ou `QRR`.
- `server/utils/billingDocument.ts` utilise Typst en priorité et conserve `pdf-lib` comme repli contrôlé.
- L’en-tête HTTP `X-PDF-Engine` indique `typst` ou `pdf-lib-fallback` pour faciliter le diagnostic.
- Le profil créancier est saisi depuis la page Factures ; l’adresse du débiteur est enregistrée sur chaque client.

Appliquer `supabase/migrations/20260804165720_typst_swiss_billing.sql` avant d’utiliser ces champs en production.

Pour contrôler visuellement le modèle commercial complet :

```powershell
npm run typst:billing:demo
```

Les coordonnées du fichier de démonstration sont fictives. Le service de production n’emploie jamais ces valeurs : si les données réelles sont incomplètes, il utilise le PDF de repli.
