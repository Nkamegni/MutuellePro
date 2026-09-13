-- =====================================================================
-- Mutuelle Pro Assurances — site.no_reply_messages_envoyes
-- 13/09/2026 -- rédigée par myspace.html en réponse à la session Git.
-- Table créée par la session "Création d'un serveur de messagerie"
-- pour ses propres tests (jamais versionnée par elle), réutilisée
-- telle quelle par le journal no-reply de myspace.html depuis le
-- 11/09. Schéma reconstruit à partir de son usage réel dans nos 15
-- fichiers (INSERT/SELECT), PAS une lecture directe de leur script
-- de création d'origine -- à confronter avec la structure réelle en
-- base avant application si un doute subsiste (`\d site.no_reply_
-- messages_envoyes` sous psql).
-- =====================================================================

CREATE TABLE IF NOT EXISTS site.no_reply_messages_envoyes (
    id               BIGSERIAL PRIMARY KEY,
    message_id       TEXT NOT NULL UNIQUE,
    destinataire     TEXT NOT NULL,
    type_message     TEXT NOT NULL,
    reference_compte TEXT,
    date_envoi       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_no_reply_messages_date_envoi
    ON site.no_reply_messages_envoyes (date_envoi DESC);

GRANT SELECT, INSERT, DELETE ON site.no_reply_messages_envoyes TO mutuellepro;
GRANT USAGE, SELECT ON site.no_reply_messages_envoyes_id_seq TO mutuellepro;
