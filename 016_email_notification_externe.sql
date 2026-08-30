-- =====================================================================
-- Mutuelle Pro Assurances — Séparation adresse interne / notification
-- Rédigé le 21/08/2026
-- =====================================================================
-- site.partenaires.email reste la boîte interne (mailbox IMAP réelle,
-- identifiant de connexion à la plateforme). email_notification est une
-- adresse EXTERNE (personnelle, déjà utilisée par le partenaire) qui
-- reçoit : le lien d'activation initial (chicken-and-egg résolu — on ne
-- peut pas notifier quelqu'un sur une boîte qu'il n'a pas encore
-- configurée), et les futures notifications "vous avez un message".
-- =====================================================================

BEGIN;

ALTER TABLE site.partenaires ADD COLUMN email_notification citext;

COMMIT;
