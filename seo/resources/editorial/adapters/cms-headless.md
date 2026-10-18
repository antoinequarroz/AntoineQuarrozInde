# Adaptateur Antoine Quarroz : Markdown vers API Hermes

Le CMS du site reçoit les articles via l'API restreinte existante. Ne pas ajouter un nouveau schéma, une langue, une route ou un champ CMS pour ce lot. Le corps est du Markdown ; le titre numéroté reste dans le champ `title`, sans second H1 dans le corps.

Le payload utilise uniquement les champs admis par `server/utils/hermesArticlePayload.ts` : `site`, `title`, `slug`, `excerpt`, `content`, `tags`, `readTime`, `published`, `coverImageDataUrl`, `sourceUrls`, `coverStyle`. Le site fixe est `https://www.antoinequarroz.ch` et `published=true`. Pour les nouvelles couvertures violettes validées des articles 036–041, le contrat est `coverStyle=aq-editorial-violet-space-grotesk-v1`, à utiliser uniquement après confirmation du déploiement serveur et de sa prise en charge par le script. L'ancien identifiant `aq-editorial-photorealistic-v1` concerne les visuels historiques ; son acceptation pour compatibilité ne permet pas de lui attribuer un visuel violet. Si le nouveau contrat n'est pas encore déployé, signaler précisément ce blocage sans modifier l'étiquette pour contourner le contrôle. Fournir deux à douze sources HTTPS distinctes et une image dédiée vérifiée. Ne pas imprimer le JSON contenant l'image encodée.

`scripts/hermes/publish_article.py` calcule une clé stable à partir du slug et du corps, envoie le payload puis cherche un extrait distinctif sur la page publique. Le jeton doit rester exclusivement dans l'environnement privé autorisé. Aucun accès direct en écriture à la base n'est nécessaire.

Une correction de la couverture d'un article déjà public passe par `PUT /api/hermes/articles`, avec les seuls champs `site`, `articleId`, `coverImageDataUrl` et `coverStyle`, une clé d'idempotence dédiée et une preuve publique de l'image remplacée. Ne pas recréer le contenu ou réutiliser la route de création pour corriger la couverture 036.

La validation permanente d'Antoine pour les articles de cette file remplace l'étape générique de nouvelle approbation humaine ; les contrôles factuels et visuels restent obligatoires. Cette autorisation n'est pas transmise aux posts sociaux.

Le front existant est responsable des métadonnées, du canonical et du JSON-LD. Vérifier le résultat réel ; ne pas annoncer un type de schéma absent et ne pas modifier le front dans un cycle de rédaction. Les défauts de rendu empêchant une publication correcte sont remontés avec leur preuve.
