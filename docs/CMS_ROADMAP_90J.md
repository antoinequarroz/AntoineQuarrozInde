# CMS Roadmap 90 Jours (AntoineQuarroz)

## Objectif
Construire un back-office unique pour piloter activite freelance + produits digitaux:
- CRM
- Facturation
- Communication
- Suivi projet
- Automatisation

---

## Phase 1 (Jours 1-30) - Operations solides

### 1) CRM exploitable
- [x] Clients CRUD
- [x] Taches CRUD
- [x] Devis CRUD
- [x] Factures CRUD
- [x] Agenda CRUD
- [x] Liaisons clients <-> devis/factures/rdv
- [ ] Vue client 360 (infos + devis + factures + taches + rdv)

### 2) Facturation v1
- [x] Facture liee a devis
- [x] Auto-remplissage montant/devise/client depuis devis
- [ ] Numerotation metier (AQ-YYYY-XXX)
- [ ] Filtre factures: statut/client/periode
- [ ] KPI finance dashboard (a encaisser, en retard)

### 3) Fiabilite
- [ ] Validation metier (dates, montants, statuts)
- [ ] Journal d'audit (actions admin critiques)
- [ ] Tests API CRUD des modules CRM

Deliverable fin Phase 1:
- Admin utilisable au quotidien pour suivi client + facturation basique.

---

## Phase 2 (Jours 31-60) - Productivite et communication

### 1) Documents et emails
- [ ] PDF devis/factures
- [ ] Bouton "Envoyer par email"
- [ ] Templates emails (devis, facture, relance)
- [ ] Historique envoi par client

### 2) Vue projet et execution
- [ ] Kanban taches (todo / in_progress / done)
- [ ] Time tracking par tache/projet
- [ ] Notes de reunion structurees
- [ ] Fichiers livrables par projet

### 3) Agenda utile
- [ ] Vue semaine/mois
- [ ] Rappels RDV automatiques
- [ ] Compte-rendu post-RDV

Deliverable fin Phase 2:
- Pipeline complet de livraison client: lead -> devis -> prod -> facture -> suivi.

---

## Phase 3 (Jours 61-90) - SaaS / Reutilisation

### 1) Multi-tenant et roles
- [ ] Permissions fines (owner/admin/manager/viewer/client)
- [ ] Portail client (suivi + documents)
- [ ] Parametres organisation (branding / emails / TVA)

### 2) Paiements et abonnement
- [ ] Stripe: paiement facture
- [ ] Stripe: abonnements produits
- [ ] Webhooks de statut paiement

### 3) Industrialisation
- [ ] White-label minimum
- [ ] Exports CSV/PDF
- [ ] Monitoring (erreurs API, jobs, delivrabilite mail)

Deliverable fin Phase 3:
- Base SaaS revendable et reutilisable chez d'autres clients.

---

## Backlog prioritaire (ordre d'execution recommande)
1. Vue client 360
2. Numerotation metier devis/factures
3. PDF + envoi email devis/facture
4. Relances automatiques facture
5. Portail client
6. Stripe paiement facture

