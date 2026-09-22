-- =====================================================================
-- Mutuelle Pro Assurances -- Correction de message (16/09/2026)
-- Ajout au Lot E : l'auteur d'un message peut corriger son propre
-- contenu après envoi (coquilles) -- traçabilité conservée (modifie +
-- date_modification), pas de suppression, pas d'historique des
-- versions précédentes (hors périmètre demandé).
-- =====================================================================

ALTER TABLE site.messages_dossier
    ADD COLUMN IF NOT EXISTS modifie BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS date_modification TIMESTAMPTZ;
