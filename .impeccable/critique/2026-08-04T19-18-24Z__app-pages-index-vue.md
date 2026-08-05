---
target: production actuelle
total_score: 21
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 4
timestamp: 2026-08-04T19-18-24Z
slug: app-pages-index-vue
---
Method: dual-agent (A: /root/design_review · B: /root/detector_review)

## Design Health Score

| # | Heuristique | Score | Constat |
|---|---|---:|---|
| 1 | Visibilité du statut | 3 | Chargements, progression portfolio et envoi du formulaire sont visibles. |
| 2 | Correspondance au monde réel | 2 | Les rubans de services suggèrent des forfaits qui n’en sont pas. |
| 3 | Contrôle et liberté | 3 | Navigation et filtres sont clairs, mais certains mouvements automatiques manquent de contrôle. |
| 4 | Cohérence et standards | 3 | Identité cohérente, avec une répétition excessive de certains effets. |
| 5 | Prévention des erreurs | 2 | Le calendrier simule des disponibilités sans agenda réel. |
| 6 | Reconnaissance plutôt que mémorisation | 3 | Actions visibles, mais quelques termes techniques restent sans contexte. |
| 7 | Flexibilité et efficacité | n/a | Peu pertinente pour une landing page persuasive. |
| 8 | Esthétique et minimalisme | 2 | Plusieurs sections secondaires rivalisent encore en halos, verre et animation. |
| 9 | Récupération après erreur | 3 | Le formulaire préserve les données, mais le message d’échec reste générique. |
| 10 | Aide et documentation | n/a | Peu pertinente pour cette surface. |
| **Total** | | **21/32** | **Acceptable — base distinctive à fiabiliser** |

## Design Specificity Verdict

La landing page paraît réellement conçue pour Antoine grâce au robot Spline, à l’hélice du portfolio et à la palette violet/cyan. La personnalité repose toutefois davantage sur les effets que sur les preuves commerciales et le récit des projets. Le détecteur étendu trouve 15 écarts, dont 13 sont des faux positifs liés au brief violet/cyan ou à des états conditionnels. Deux couleurs littérales restent de petits écarts de token.

L’inspection visuelle automatisée n’a pas pu attacher un nouvel onglet de manière fiable. Aucun overlay utilisateur n’est donc revendiqué. Les contrôles HTTP confirment un rendu SSR 200, un TTFB de 0,19 à 0,30 s et une structure sémantique de base solide.

## Overall Impression

Le site est désormais mémorable et professionnel. Son plus grand manque n’est plus graphique : il doit transformer le talent perçu en confiance vérifiable et en prise de contact mesurable.

## What's Working

- Hero identifiable, proposition claire et deux CTA directs.
- Portfolio Helix optimisé avec scroll passif, rAF, métriques mises en cache et mode mobile snap.
- Formulaires mieux labellisés, modale Blog accessible et images paresseuses.
- Pipeline admin, prochaine action client et facturation Typst/QR suisse déjà intégrés.

## Priority Issues

### [P1] Réservation non reliée à un véritable agenda

Le composant génère des disponibilités locales et renvoie vers la page générique Cal.com. Remplacer par le vrai lien/calendrier d’Antoine ou retirer la promesse de créneaux. Commande : `/impeccable harden`.

### [P1] Projets encore trop génériques comme preuves

Le filtre CMS peut afficher zéro résultat et les textes Contexte/Impact sont répétitifs. Masquer les filtres vides et documenter rôle, contrainte, solution, résultat réel et lien vérifiable pour chaque cas. Commandes : `/impeccable clarify`, `/impeccable polish`.

### [P1] Spline trop coûteux sur tous les appareils

Le robot charge sans condition ; les chunks Spline/Three/Rapier dépassent 4 Mo avant la scène distante d’environ 1 Mo. Différer jusqu’à visibilité/idle et servir une affiche statique en reduced-motion, reduced-data et sur mobile contraint. Commande : `/impeccable optimize`.

### [P1] Contrôle clavier et mouvement automatique incomplets

Le menu mobile manque d’état ARIA, Escape, piège/restauration du focus. Le carrousel Blog avance toutes les trois secondes sans pause visible ni pause au focus. Normaliser ces deux interactions. Commande : `/impeccable harden`.

### [P2] Conversion et exploitation insuffisamment mesurées

Les CTA du hero actif ne déclenchent pas le suivi présent dans l’ancien hero, et aucun test automatisé ne couvre le funnel, Typst ou le déploiement. Instrumenter le funnel et ajouter smoke tests, vérification de migrations et rollback. Commande UI : `/impeccable polish`, complétée par un ticket technique.

## Persona Red Flags

- **Jordan, premier visiteur** : comprend l’offre mais peut prendre Starter/Scale pour des forfaits comparables et manque de preuves projet précises.
- **Riley, testeur méthodique** : repère le filtre vide, les impacts génériques et le faux calendrier, ce qui fragilise la confiance.
- **Casey, mobile pressé** : subit WebGL, page longue, menu clavier incomplet et carrousel automatique sans pause.
- **Nora, prospect PME valaisanne** : voit du talent, mais cherche encore budget, délais, méthode, maintenance et résultats vérifiables.

## Minor Observations

- Remplacer les rubans Starter / Le plus demandé / Scale par des labels réellement descriptifs.
- Réserver les halos forts au hero et au portfolio, puis calmer About, Services et Blog.
- Traduire les libellés accessibles codés en anglais/français dans le header et CardStack.
- Publier la correction locale du script de déploiement et rendre l’application des migrations explicite.
- Rafraîchir le sidecar `.impeccable/design.json`, devenu plus ancien que `DESIGN.md`.

## Questions to Consider

- Quelle preuve concrète ferait qu’un prospect accepte de te contacter après un seul projet vu ?
- Le calendrier mérite-t-il d’être visible avant d’être relié à ton agenda réel ?
- Sur mobile, le robot apporte-t-il plus de valeur qu’une affiche instantanée et légère ?
- Quel indicateur doit définir le succès : demandes envoyées, rendez-vous ou devis acceptés ?
