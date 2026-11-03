# Contrôle serveur après les news FRIDAY

Antoine demande le 3 novembre 2026 un contrôle après chaque news, indépendant du Mac, sans mission de test ni appel payant. Le contrôleur déterministe tourne sur le VPS du site ; il n’appelle aucun agent et ne modifie aucun article, brouillon ou statut.

## Marqueur et preuves de production

Chaque news porte le tag public exact **Actualités IA et tech**. Le créneau est sa date de publication Europe/Zurich, selon l’ancre du 4 novembre et l’intervalle de deux jours. Les autres articles ne sont pas traités comme des news FRIDAY.

Le générateur dédié produit le PNG, le SVG et `<slug>.manifest.json` sous `seo/covers/news/AAAA-MM-JJ/`. Après l’inspection réelle de chaque image, FRIDAY doit réconcilier `visual_review.status: passed` et `visual_review.reviewed_sha256` avec les octets exacts du PNG, avec date et auteur de revue. Le générateur seul laisse la revue à `pending`. Ne pas faire passer une génération réussie ou la couverture technique du 3 novembre pour une revue de la news.

Après publication et préparation des brouillons, rendre disponibles sur **origin/main** le manifeste dédié, son SVG, les assets référencés et le reçu de publication, par le workflow Git autorisé. Le contrôleur lit Git sans checkout ni écrasement ; une preuve qui reste seulement sur le runner Hermes n’est pas encore une preuve accessible au contrôle VPS. Une attente de synchronisation reste un état à vérifier, pas un succès inventé.

Les deux clés de brouillon sont `<slug>-linkedin` et `<slug>-x`, liées à l’URL canonique exacte. Le contrôle attend `draft/manual`, sans date d’envoi, approbation ou publication. Il ne les remet jamais en brouillon si Antoine les a déjà modifiés ou validés ; il rapporte leur état réel.

## Fonctionnement autonome

Le timer `aq-friday-news-check.timer` vérifie toutes les cinq minutes. Il ne lance une lecture du site que pour un créneau dû après 07:10 Europe/Zurich ou une vérification encore en attente. Il arrête les lectures d’un créneau déjà vérifié, ce qui évite de considérer une validation humaine ultérieure comme un changement indésirable. Les jours intercalaires sans vérification en attente ne produisent aucune alerte d’article manquant.

Une news ou une preuve non encore disponible reste en attente avant 08:30. Ensuite le défaut est signalé comme blocage, avec une action précise. Une attente ou un blocage peut être revérifié : le premier résultat ne fige pas la journée. Les réessais d’un ancien créneau sont bornés à deux jours ; son historique demeure.

Le collecteur Node s’exécute dans le conteneur CMS avec ses identifiants existants. Il effectue seulement des GET Supabase ciblés ; aucune clé n’est transférée à Hermes ou au Mac. Il lit les champs réels d’approbation et de programmation, sans interpréter les valeurs indisponibles de l’ancien export comme des valeurs nulles.

## Vérifications et rapports

- Page publique HTTP 200, titre et extrait SSR, canonical et image affichée/déclarée.
- PNG public 1200 × 675 et moins de 5 Mo, SHA-256 égal au manifeste dédié, palette violette et tracés réels dans le SVG, hashes des assets de marque, revue visuelle déclarée et liée au même PNG. Le contrôleur ne prétend pas réaliser une nouvelle inspection humaine ou IA.
- Exactement un brouillon LinkedIn et un brouillon X liés à cette news, avec les clés stables et les champs réels `draft/manual`, approbation/programmation/publication nulles. Aucune mutation CMS.

Les observations JSON et Markdown datées, l’état et les événements dédupliqués restent privés sous `/home/ubuntu/friday-news-control/private/`. Le contrôle continue quand le Mac dort. Le suivi Codex peut relire ces rapports via l’accès SSH existant à sa prochaine reprise ; aucun envoi social, email ou notification externe n’est ajouté. Ce contrat est distinct du contrôle Hermes des douze missions à 09:15 et ne modifie pas sa carte Santé.
