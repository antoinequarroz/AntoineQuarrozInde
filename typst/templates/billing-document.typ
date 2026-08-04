#import "@preview/payqr-swiss:0.4.1": swiss-qr-bill

#let data = json(sys.inputs.at("data", default: "billing-document.json"))
#let brand = rgb("#7c3aed")
#let cyan = rgb("#22d3ee")
#let ink = rgb("#111827")
#let quiet = rgb("#5f6472")
#let rule = rgb("#e5e7eb")

#set document(title: data.at("documentTitle"), author: data.at("issuer").at("name"))
#set page(
  paper: "a4",
  margin: (x: 18mm, top: 18mm, bottom: 18mm),
  footer: context [
    #set text(size: 8pt, fill: quiet)
    #data.at("issuer").at("name")
    #h(1fr)
    Page #counter(page).display("1") / #counter(page).final().at(0)
  ],
)
#set text(font: ("Arial", "Liberation Sans"), size: 9.5pt, fill: ink, lang: "fr")
#set par(leading: 0.65em)

#let value-or-dash(value) = if value == none or value == "" { "—" } else { value }
#let money(cents, currency) = {
  let amount = calc.round(cents) / 100
  [#amount #currency]
}
#let postal-address(entity) = {
  [#entity.at("name")]
  if entity.at("street") != "" {
    linebreak()
    [#entity.at("street") #entity.at("building")]
  }
  if entity.at("postalCode") != "" or entity.at("city") != "" {
    linebreak()
    [#entity.at("postalCode") #entity.at("city")]
  }
  if entity.at("country") != "" {
    linebreak()
    [#entity.at("country")]
  }
}

#grid(
  columns: (1fr, 62mm),
  gutter: 12mm,
  [
    #rect(width: 18mm, height: 18mm, radius: 4mm, fill: brand)[
      #align(center + horizon)[#text(fill: white, weight: "bold", size: 10pt)[AQ]]
    ]
    #v(4mm)
    #text(size: 17pt, weight: "bold", fill: ink)[#data.at("documentTitle")]
    #v(1mm)
    #text(size: 10pt, fill: brand, weight: "semibold")[N° #data.at("number")]
  ],
  [
    #set text(size: 9pt)
    #postal-address(data.at("issuer"))
    #if data.at("issuer").at("email") != "" { linebreak(); data.at("issuer").at("email") }
    #if data.at("issuer").at("phone") != "" { linebreak(); data.at("issuer").at("phone") }
    #if data.at("issuer").at("uid") != "" { linebreak(); [IDE/TVA #data.at("issuer").at("uid")] }
  ],
)

#v(10mm)
#grid(
  columns: (1fr, 62mm),
  gutter: 12mm,
  [
    #text(size: 8pt, fill: quiet, weight: "semibold")[DESTINATAIRE]
    #v(2mm)
    #postal-address(data.at("client"))
  ],
  [
    #table(
      columns: (1fr, auto),
      stroke: none,
      inset: (y: 1.2mm),
      [Date], [#value-or-dash(data.at("issuedAt"))],
      [Échéance], [#value-or-dash(data.at("dueAt"))],
      [Statut], [#data.at("statusLabel")],
      [Devise], [#data.at("currency")],
    )
  ],
)

#v(9mm)
#if data.at("subject") != "" {
  text(size: 12pt, weight: "semibold")[#data.at("subject")]
  v(5mm)
}

#let item-cells = data.at("items").map(item => (
  [
    #text(weight: "semibold")[#item.at("label")]
    #if item.at("description") != "" {
      linebreak()
      text(size: 8pt, fill: quiet)[#item.at("description")]
    }
  ],
  [#item.at("quantity")],
  [#money(item.at("unitPriceCents"), data.at("currency"))],
  [#item.at("taxRate") %],
  [#money(item.at("totalCents"), data.at("currency"))],
)).flatten()

#table(
  columns: (1fr, 15mm, 28mm, 17mm, 30mm),
  align: (left, right, right, right, right),
  stroke: (x, y) => if y == 0 { none } else { (top: 0.5pt + rule) },
  inset: (x: 2mm, y: 3mm),
  table.header(
    [#text(fill: quiet, weight: "semibold")[PRESTATION]],
    [#text(fill: quiet, weight: "semibold")[QTÉ]],
    [#text(fill: quiet, weight: "semibold")[PRIX]],
    [#text(fill: quiet, weight: "semibold")[TVA]],
    [#text(fill: quiet, weight: "semibold")[TOTAL]],
  ),
  ..item-cells,
)

#v(7mm)
#align(right)[
  #block(width: 76mm)[
    #table(
      columns: (1fr, 34mm),
      align: (left, right),
      stroke: none,
      inset: (y: 1.5mm),
      [Sous-total], [#money(data.at("subtotalCents"), data.at("currency"))],
      [TVA], [#money(data.at("taxCents"), data.at("currency"))],
      table.cell(colspan: 2, inset: (top: 2.5mm, bottom: 0mm))[
        #line(length: 100%, stroke: 1pt + brand)
      ],
      [#text(size: 11pt, weight: "bold", fill: brand)[Total]],
      [#text(size: 11pt, weight: "bold", fill: brand)[#money(data.at("totalCents"), data.at("currency"))]],
    )
  ]
]

#if data.at("notes") != "" {
  v(8mm)
  block(fill: rgb("#f7f8ff"), radius: 3mm, inset: 4mm, width: 100%)[
    #text(size: 8pt, fill: quiet, weight: "semibold")[INFORMATIONS]
    #v(1.5mm)
    #data.at("notes")
  ]
}

#if data.at("terms") != "" {
  v(5mm)
  text(size: 8pt, fill: quiet)[#data.at("terms")]
}

#if data.at("includeQr") {
  pagebreak()
  swiss-qr-bill(
    standalone: true,
    language: "fr",
    account: data.at("qr").at("account"),
    creditor-name: data.at("issuer").at("name"),
    creditor-street: data.at("issuer").at("street"),
    creditor-building: data.at("issuer").at("building"),
    creditor-postal-code: data.at("issuer").at("postalCode"),
    creditor-city: data.at("issuer").at("city"),
    creditor-country: data.at("issuer").at("country"),
    amount: data.at("totalCents") / 100,
    currency: data.at("currency"),
    debtor-name: data.at("client").at("name"),
    debtor-street: data.at("client").at("street"),
    debtor-building: data.at("client").at("building"),
    debtor-postal-code: data.at("client").at("postalCode"),
    debtor-city: data.at("client").at("city"),
    debtor-country: data.at("client").at("country"),
    reference-type: data.at("qr").at("referenceType"),
    reference: data.at("qr").at("reference"),
    additional-info: data.at("qr").at("additionalInfo"),
  )
}
