# AQ-SEO-009 — Revue finale et sécurité

## Périmètre

Revue du diff final de la branche
`codex/aq-seo-009-blog-author-freshness` contre `origin/main`
(`c83397515344f7529d2b9cc958742adcd98f95c0`). La story
`docs/product/stories.md:174-192`, la recherche
`docs/research/AQ-SEO-009.md` et le plan humainement validé
`docs/plans/AQ-SEO-009.md` servent de références.

La revue couvre la migration append-only, la RPC éditoriale, le contrat public,
le CRM, le rendu SSR visible, le JSON-LD `BlogPosting`, les tests et la preuve
de release. Les fichiers utilisateur non suivis et sans rapport avec le ticket
n'ont pas été modifiés.

## Findings

### Critical

Aucun.

### Major

Aucun finding majeur restant.

Le finding initial sur la fausse fraîcheur a été corrigé dans le diff final. La
nouvelle migration append-only compare les champs éditoriaux significatifs et
conserve `old.updated_at` si le payload est identique; une vraie modification
continue d'utiliser `statement_timestamp()`
(`supabase/migrations/20260904171054_preserve_article_timestamp_on_noop_update.sql:1-60`).
Le schéma de référence porte la même définition (`supabase/schema.sql:132-183`).

La preuve de non-régression exécute la RPC une première fois sans changement et
exige la conservation exacte de `published_at` et `updated_at`, puis modifie le
contenu et exige que seule la date de modification avance
(`supabase/tests/database/aqseo009_article_attribution.test.sql:201-272`). Les
82 assertions pgTAP passent après rejeu complet des migrations, dont les 18 du
ticket.

### Minor

Aucun.

## Vérification des autres critères

- La clé auteur canonique est rétro-remplie, obligatoire et bornée à la valeur
  approuvée (`supabase/migrations/20260904163123_add_article_author_attribution.sql:1-27`).
- La RPC garde sa signature pour la compatibilité migration-before-image,
  conserve l'auteur des anciens payloads et journalise l'auteur lors des
  décisions de publication (`supabase/migrations/20260904163123_add_article_author_attribution.sql:29-108,122-176`).
- Le serveur rejette une clé auteur absente de la liste approuvée avant la RPC
  (`server/utils/articlePayload.ts:3-26`).
- La projection publique est fermée et ne transporte que l'auteur et les dates
  nécessaires au détail public (`server/utils/publicContent.ts:3-17,70-85`).
- La page relie visiblement Antoine à `/#about`, affiche la publication et
  construit un `BlogPosting` cohérent avec le canonical, l'image et l'entité
  `/#person` (`app/pages/blog/[slug].vue:40-94,131-155`).
- Les articles dont l'auteur ou les dates ne sont pas valides échouent fermés
  dans le rendu public (`app/pages/blog/[slug].vue:27-38`).

Ces points sont conformes et la source `updated_at` est désormais fiable aussi
pour une sauvegarde CRM sans changement.

## Revue sécurité

Aucun finding de sécurité nouveau ou aggravé par AQ-SEO-009.

- **Autorisation et isolation :** l'API d'écriture exige `requireAdmin`, fournit
  l'organisation et l'identité résolues côté serveur, puis la RPC verrouille la
  ligne par `organization_id` et `id` (`server/api/articles.put.ts:1-23`,
  `supabase/migrations/20260904163123_add_article_author_attribution.sql:111-120`).
- **Privilèges DB :** la RPC est `security invoker`, fixe un `search_path` vide,
  retire l'exécution à `public`, `anon` et `authenticated`, et l'accorde
  uniquement à `service_role`
  (`supabase/migrations/20260904163123_add_article_author_attribution.sql:32-43,183-186`).
- **Validation et exposition :** `authorKey` doit correspondre exactement à
  l'identité approuvée et l'API publique utilise une projection explicite
  (`server/utils/articlePayload.ts:9-25`, `server/utils/publicContent.ts:3-17`).
- **Injection JSON-LD :** la page emploie le sérialiseur neutralisant déjà
  validé au lieu d'injecter directement le contenu éditorial
  (`app/pages/blog/[slug].vue:70-94`).
- **Secrets et dépendances :** aucun secret, fichier d'environnement, token,
  dépendance, bucket ou permission Data API n'est ajouté par le diff.

Risque préexistant hors ticket : le corps Markdown est toujours transformé puis
rendu avec `v-html` sans assainissement complet. Ce point était déjà présent et
n'est pas introduit par AQ-SEO-009; il mérite une story de sécurité dédiée.

## Contrôles observés

Tous les travaux bornés ont été exécutés via Portly pendant l'implémentation.

- Tests ciblés finaux : `29/29` réussis.
- Tests SEO AQ-SEO-009 : `9/9` réussis.
- Tests ciblés après correction de revue : `16/16` réussis.
- Suite Vitest complète : `54` fichiers, `321/321` tests réussis.
- Typecheck : réussi.
- Build Nuxt : réussi.
- Budgets de production : réussis.
- Préflight Supabase : `82` assertions pgTAP réussies, lint de schéma sans
  erreur et aucun avis sécurité.
- Syntaxe Bash des scripts d'exploitation : réussie.
- `git diff --check origin/main...HEAD` : réussi.

Le préflight couvre explicitement la sauvegarde éditoriale identique et la
modification réelle; les autres contrôles confirment l'absence de régression
applicative.

## Verdict

La story satisfait le plan validé et ses critères d'acceptation. Le finding de
fraîcheur a été corrigé et couvert sans modifier la migration historique ni les
garanties de sécurité. Aucun changement de production n'a été réalisé pendant
cette revue.

Max severity: none
Ship allowed: yes
