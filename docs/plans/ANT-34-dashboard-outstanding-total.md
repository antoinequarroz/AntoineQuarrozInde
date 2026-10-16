---
linear: https://linear.app/antoinequarroz/issue/ANT-34
status: in_review
---

# Total à encaisser

Ajouter le solde global des factures envoyées ou en retard, toutes échéances confondues, en conservant le montant sous 30 jours et les autres indicateurs. Exclure les brouillons, documents soldés/annulés et avoirs ; déduire les paiements actifs via le solde du store ; séparer les devises. Ne modifier aucun document.

Validation : scénarios financiers (échéances éloignées et absentes, paiements partiels, documents exclus, devises), tests, typecheck, build, CI puis vérification du tableau de bord déployé.

## Vérifications

- 148 fichiers Vitest, 902 tests réussis (dont quatre scénarios de soldes à encaisser).
- Typecheck Nuxt réussi.
- Compilation de production et CI à vérifier avant livraison.
