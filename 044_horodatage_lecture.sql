-- =====================================================================
-- Mutuelle Pro Assurances -- Horodatage de lecture (16/09/2026)
-- Nécessaire pour le délai de grâce de 30 secondes après lecture
-- (demande de Roger) : les booléens lu_par_* seuls ne suffisent pas,
-- il faut savoir QUAND la lecture a eu lieu pour calculer si le délai
-- est encore ouvert.
-- =====================================================================

ALTER TABLE site.messages_dossier
    ADD COLUMN IF NOT EXISTS date_lecture_client TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_lecture_staff TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS date_lecture_partenaire TIMESTAMPTZ;
