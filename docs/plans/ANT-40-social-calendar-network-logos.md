---
linear: https://linear.app/antoinequarroz/issue/ANT-40
status: done
---

# Logos du calendrier éditorial

## Périmètre validé

Ouvrir le calendrier de production dans Dia et améliorer les repères visuels avec les logos LinkedIn, X et Instagram sur les cartes, les connexions et les aperçus. Conserver le design violet de l’admin, des libellés textuels et les filtres natifs accessibles. Réutiliser les SVG et la bibliothèque déjà présents, sans requête vers un service externe ni nouvelle dépendance.

Les dates, médias, brouillons, filtres et autorisations de publication ne changent pas. Aucune publication réelle ne sera déclenchée pour les contrôles. Le calendrier existant a été ouvert et vérifié dans Dia, sans modifier de contenu.

## Vérification et livraison

Revue ciblée, typecheck/build et budgets, parcours navigateur existants sur fixtures (ordinateur/mobile, clair/sombre), puis CI et déploiement contrôlé. Vérifier visuellement les logos en production et laisser le calendrier ouvert dans Dia. Aucun nouveau test unitaire miroir pour cette finition visuelle.

## Preuves acquises

- Revue indépendante : aucun gestionnaire, payload ou consentement modifié. SVG décoratifs avec noms de réseaux conservés. Badges autorisant le retour à la ligne pour les colonnes étroites.
- Typecheck, build de production et budgets réussis. Aucun ajout de dépendance ou requête distante pour les logos.
- Dix parcours E2E simulés réussis du premier coup (calendrier, programmation, PDF et carrousels mixtes). Le scénario d’envoi d’images avec identifiants réels est volontairement laissé à la CI authentifiée, pas exécuté localement.
- Contrôle visuel temporaire réussi à 768, 1 024, 1 280 et 1 440 px en clair et sombre : noms des réseaux sans débordement ; captures calendrier et aperçu mobile examinées. Aucun nouveau test miroir conservé dans le dépôt.
- La revue visuelle a aussi relevé des filtres natifs trop étroits sur tablette : leur grille passe à une colonne sur téléphone, deux sur tablette et quatre sur grand écran, pour conserver leurs libellés lisibles. Recontrôle du build et des huit rendus clair/sombre réussi sur la tête finale `ed56c8b`.
- [PR #282](https://github.com/antoinequarroz/AntoineQuarrozInde/pull/282) fusionnée et déployée le 17 octobre 2026 au commit `dc90b4fb60aa26fc5759df7bc6e1aa88255f3308`. CI de PR et [run principal 39034792426](https://github.com/antoinequarroz/AntoineQuarrozInde/actions/runs/39034792426) entièrement réussis dès le premier passage ; 69 tests E2E après déploiement en 7,3 minutes, sans échec ni reprise. Lab production conforme.
- Version publique exacte et santé application/base vérifiées ; accès anonyme à l’API sociale refusé (401). Dans un nouvel onglet Dia authentifié, vrais logos visibles et vrai brouillon LinkedIn avec aperçu ouverts puis refermés sans modification. Calendrier laissé ouvert. Aucun envoi social ni changement d’autorisation déclenché pour ces contrôles.
