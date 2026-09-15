---
ticket: AQ-STACK-001
linear: ANT-22
---

# AQ-STACK-001 — Recherche technique

## Besoin validé

Antoine veut maintenir depuis le dashboard les technologies présentées sur la
landing page et dans le footer. Le modèle doit distinguer `Quotidien`,
`Maîtrisé` et `Déjà utilisé`, permettre l'ordre et la visibilité par surface,
offrir une prévisualisation FR/EN/DE, puis publier explicitement. Le ticket
Linear `ANT-22` est la source de suivi et reste au Backlog pendant la
planification.

## Chemin actuel vérifié

- `app/components/sections/AboutSection.vue` contient un tableau `tools`
  statique de vingt éléments et rend directement chaque entrée avec
  `UiTechnologyIcon`. Toute modification exige donc aujourd'hui une édition de
  code et un déploiement.
- `app/components/layout/AppFooter.vue` contient un second tableau `stack`
  statique, plus court. Les deux listes peuvent diverger car elles n'ont aucune
  source partagée.
- `app/components/ui/TechnologyIcon.vue` importe les chemins de
  `simple-icons` et n'accepte qu'une union fermée de clés. Cette fermeture est
  une bonne frontière à conserver : aucun SVG, HTML ou chemin arbitraire ne
  doit être stocké ou rendu.
- `app/pages/index.vue` précharge déjà les données publiques de projets, avis
  et articles via `useAsyncData`, mais aucune donnée de stack n'est chargée.
  La nouvelle source publique doit rester rendue côté serveur pour éviter un
  flash vide et préserver la découverte sans JavaScript.
- `tests/landing-mobile-first.test.ts` protège actuellement le titre localisé,
  la présence des technologies ajoutées et l'utilisation de pictogrammes. Ces
  assertions devront évoluer vers le contrat de données et conserver une
  preuve de rendu mobile.

## Conventions d'intégration vérifiées

- Les endpoints privés utilisent `requireAdmin` (`server/utils/requireAdmin.ts`),
  qui impose authentification, organisation, MFA et au moins le rôle
  `manager`. Le ticket exige `owner` ou `admin` pour publier : l'endpoint devra
  vérifier explicitement `org.role` après ce garde-fou, sans élargir
  `requireAdmin` pour les autres fonctions.
- `server/utils/organizationAccess.ts` choisit l'organisation à partir de
  l'adhésion authentifiée et de `x-organization-id`. Les lectures et écritures
  de stack doivent ajouter `organization_id = org.id`; la valeur envoyée par le
  navigateur ne doit jamais être utilisée.
- Les réglages e-mail fournissent un précédent de réglage par organisation via
  `server/api/admin/email-settings.get.ts` et `.put.ts`, avec validation serveur
  et `upsert` tenant-safe.
- Les pages publiques dynamiques, par exemple
  `server/api/public/articles.get.ts`, résolvent l'organisation canonique via
  `server/utils/publicOrganization.ts` et ne dérivent pas leur tenant des
  cookies ou des en-têtes du visiteur.
- `server/utils/audit.ts` écrit dans `audit_logs`. Les sauvegardes de brouillon
  et publications peuvent y inscrire seulement la révision, le nombre
  d'entrées et les types de changement, sans recopier un payload complet.
- L'administration suit une densité calme, des cibles mobiles de 44 px et des
  états explicites (`app/layouts/admin.vue`,
  `app/pages/admin/emails/index.vue`, `DESIGN.md`). Une entrée `Stack` appartient
  au groupe `Publier` de la navigation.
- Les tables opérationnelles sensibles récentes révoquent l'accès `anon` et
  `authenticated`, activent RLS et réservent l'accès au `service_role`, comme
  `email_delivery_settings` dans
  `supabase/migrations/20260915072438_add_lumail_delivery_automation.sql`.

## Modèle recommandé

Une ligne `technology_stack_settings` par organisation contient deux tableaux
JSONB bornés : `draft_items` et `published_items`, accompagnés d'une révision,
de `updated_at` et de `published_at`. Cette forme rend la publication de toute
la liste atomique : le public ne peut jamais voir un ordre partiellement
enregistré. La base vérifie que chaque valeur est un tableau et que sa taille
reste bornée; un module partagé applique ensuite le contrat fermé de chaque
entrée : clé stable, libellé court, clé d'icône autorisée, niveau autorisé,
position unique et deux booléens de visibilité.

La migration initialise brouillon et publication avec la liste actuellement
visible. Par prudence éditoriale, les éléments existants commencent dans
`Déjà utilisé` : aucune technologie n'est affirmée comme quotidienne sans une
décision ultérieure d'Antoine dans le dashboard. Le footer conserve sa
sélection actuelle grâce aux booléens initiaux.

## Parcours cible

1. `/admin/stack` charge le brouillon de l'organisation authentifiée.
2. Antoine ajoute, modifie, masque ou réordonne les entrées localement.
3. Les onglets FR/EN/DE prévisualisent les intitulés de section et de niveaux;
   les noms de produits restent des noms de marque communs aux trois langues.
4. `Enregistrer le brouillon` valide et persiste sans modifier le site public.
5. `Publier` exige une confirmation, applique une comparaison de révision pour
   éviter l'écrasement concurrent, copie atomiquement le brouillon vers la
   version publiée et écrit un événement d'audit.
6. L'accueil et le footer lisent uniquement la version publiée de
   l'organisation publique canonique. En l'absence de ligne lors d'un rollback
   applicatif, le catalogue statique partagé conserve le rendu actuel.

## Risques et protections

- **Contenu exécutable :** aucune URL d'icône, donnée SVG ou HTML libre; le
  sélecteur envoie uniquement une clé présente dans l'allowlist partagée.
- **Fuite inter-tenant :** toutes les routes admin filtrent par `org.id`; la
  route publique utilise uniquement l'organisation canonique.
- **Publication partielle :** le document complet est validé avant une unique
  écriture; brouillon et publication restent séparés.
- **Écrasement concurrent :** la sauvegarde et la publication utilisent une
  révision attendue et répondent `409` si le document a changé.
- **Disponibilité publique :** la landing page utilise le dernier document
  publié valide ou le catalogue initial partagé; elle n'utilise jamais le
  brouillon.
- **Régression SEO/hydratation :** la stack est chargée en SSR et le HTML
  initial reste identique au rendu hydraté.
- **Migration et rollback :** la nouvelle table est additive. L'ancienne image
  ignore la table; la nouvelle image peut retomber sur le catalogue partagé si
  la ligne n'existe pas. Aucun `DROP` n'est requis.

## Tests nécessaires

- Tests purs du parseur : allowlists, longueurs, doublons, ordre, visibilité et
  fallback.
- Tests API : authentification/MFA héritée, refus `manager`, isolation tenant,
  conflit de révision, brouillon non public et publication atomique.
- Test pgTAP : structure, contraintes, RLS, privilèges et unicité par
  organisation.
- Tests UI statiques et composants : navigation, états chargement/vide/erreur,
  réordonnancement clavier, confirmation et prévisualisation des trois langues.
- E2E mobile et desktop : modifier un brouillon, prouver que le public ne change
  pas, publier, vérifier landing/footer, puis restaurer exactement les données
  initiales.

## Question résolue par défaut sûr

Le dépôt prouve les technologies utilisées par cette application, mais pas la
fréquence réelle d'utilisation personnelle. Le seed classe donc toutes les
entrées comme `Déjà utilisé`. Antoine pourra déclarer lui-même les niveaux
`Quotidien` et `Maîtrisé`; aucune affirmation n'est inventée.
