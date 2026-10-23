---
linear: ANT-50
status: in-review
---

# Diaporama des services

Adapter le composant fourni en Vue dans `#services`, sans dépendance React.
Conserver les trois offres, les liens SEO, la présélection du formulaire et le
suivi `services_cta_click`. Utiliser Space Grotesk, un fond violet dégradé et des
visuels du portfolio existant. Identifier la capture d’administration comme
démonstration et LifXP comme version bêta.

## Critères

- Sélection au survol avec pointeur fin, au clic/toucher et au clavier.
- Texte lisible dans les thèmes clair et sombre ; en-tête centré.
- Mise en page mobile sans débordement et cibles de 44 px minimum.
- Transitions courtes, interrompables ; respect du mouvement réduit.
- Contact et mesure marketing existants conservés.
- Vérifications visuelles, tests concernés, TypeScript, build et budgets.
- PR, contrôles CI et autorisation Production avant mise en ligne vérifiée.

## État

23 octobre 2026 : ticket créé et en cours. Implémentation dans un worktree propre
issu de `origin/main` e2b2259 ; aucune modification de la branche locale de travail.

Visuels dérivés sans changement de composition : `case-studies/physiobaur-apres.png`
et `showcase-tools/dashboard-dark.png`, encodés WebP (qualités 86 et 88) sous
`public/service-previews/`. LifXP réutilise le WebP existant du portfolio.

Premiers contrôles : 159 fichiers / 1 080 tests unitaires passent ; audit des
dépendances de production sans vulnérabilité. E2E des cartes remplacés par des
scénarios de sélection, contact, clavier, toucher et mouvement réduit.

## Vérification du candidat

- TypeScript, build, budgets et audit du serveur livré : succès.
- Sur le build final : 18 parcours publics hermétiques, dont les six scénarios
  du diaporama, et le contrôle axe sans identifiants passent sans retry.
- Focus clavier conservé lors d’un survol incident ; changement par clic explicite
  toujours possible. Contact CMS présélectionné, un seul événement de clic,
  aucun envoi du formulaire effectué.
- Contrôle visuel CUA : ordinateur, mobile 390 px, français et allemand,
  thèmes clair et sombre. Captures locales sous `.artifacts/ant50/`.
- Vérification complète via CI et approbation humaine Production restent requises.

Le serveur de développement a été arrêté avant le contrôle du build final pour
éviter le partage de `.nuxt` entre dev et build. Le sélecteur du test de contact
est limité au formulaire : « autonomie » dans le nouveau panneau ne doit pas
être confondu avec le champ « nom ».

Le premier contrôle CI des médias a détecté le chargement anticipé du visuel
LifXP dans le panneau inactif. Les images des services CMS et mobile sont désormais
montées à leur première sélection, puis conservées pour les fondus. Le scénario
réseau du diaporama et les budgets existants du portfolio vérifient ce comportement
sans modifier leurs seuils. Nouvelle vérification complète du candidat en cours.
