# Changelog — index.html (site public)

Convention de version : `AAAA.MM.JJ-lettre` (lettre incrémentée à chaque déploiement distinct le même jour).

---

## 2026.09.04-a
- Formulaires Contact, Devis et Sinistre : champ "Nom complet" scindé en "Nom"/"Prénom" séparés — cohérence avec la reconstruction des 4 tables centrales côté `myspace.html`
- Seul le formulaire Sinistre touche réellement nos données (création de Ticket via `POST /api/tickets`) ; Contact et Devis restent des envois directs (WhatsApp/email), changement purement cosmétique pour ces deux-là

---

*Entrées antérieures au 04/09/2026 non reconstituées rétroactivement.*
