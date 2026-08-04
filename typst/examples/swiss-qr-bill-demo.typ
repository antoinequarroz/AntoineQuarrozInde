#import "../modules/swiss-qr-bill.typ": invoice-qr-slip

// Demonstration data only. Never use these values for a real invoice.
#invoice-qr-slip(
  standalone: true,
  language: "fr",
  account: "CH5204835012345671000",
  creditor-name: "Antoine Quarroz — Exemple",
  creditor-street: "Rue Exemple",
  creditor-building: "1",
  creditor-postal-code: "1950",
  creditor-city: "Sion",
  creditor-country: "CH",
  amount: 1250.00,
  currency: "CHF",
  debtor-name: "Client Exemple SA",
  debtor-street: "Avenue Démonstration",
  debtor-building: "10",
  debtor-postal-code: "1000",
  debtor-city: "Lausanne",
  debtor-country: "CH",
  reference-type: "NON",
  additional-info: "Facture de démonstration — ne pas payer",
)
