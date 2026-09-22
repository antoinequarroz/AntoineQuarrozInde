# Mesure marketing et conventions de campagne

## Tableaux

L’administration présente trois vues complémentaires :

- **Acquisition** : sources et évolution de l’audience.
- **Contenu** : articles et projets réellement consultés.
- **Business** : intentions de contact, demandes, newsletter et rendez-vous.

Le parcours hebdomadaire relie visite, lecture d’un contenu, clic vers le contact et formulaire envoyé. Il indique combien de visiteurs uniques ont atteint chaque étape pendant la période ; il ne prétend pas attribuer une vente à une seule page sans preuve CRM.

## UTM canoniques

| Canal | Source | Medium | Campagne | Contenu |
|---|---|---|---|---|
| LinkedIn | `linkedin` | `social` | `article_<slug>` | `post` |
| X | `x` | `social` | `article_<slug>` | `post` |
| Lumail | `lumail` | `email` | `article_<slug>` | `post` ou emplacement précis |

Le publieur Hermes remplace les anciens paramètres `utm_*` au moment de l’envoi LinkedIn ou X et conserve les autres paramètres du lien. Pour un lien Lumail, utiliser `tracked_article_url(url, "lumail", placement="article_cta")` dans l’outil de préparation afin de distinguer le bouton principal.

## Rituel hebdomadaire FRIDAY

Le rapport compare les sept derniers jours aux sept jours précédents, liste les contenus les plus consultés et propose au maximum trois décisions. Avant vingt visiteurs hebdomadaires, il conserve le statut « référence en constitution » et ne recommande aucune refonte fondée sur le volume.
