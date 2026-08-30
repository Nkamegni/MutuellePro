-- =====================================================================
-- Mutuelle Pro Assurances — Sentinelle : mot de passe du compte racine
-- Rédigé le 27/08/2026
-- =====================================================================
-- "Personne ne doit pouvoir changer mon mot de passe à part moi-même"
-- (Roger, 27/08/2026). Même limite que la sentinelle de suppression
-- (migration 017) : un titulaire des pleins droits PostgreSQL pourrait
-- toujours supprimer ce trigger avant d'agir -- pas contournable
-- autrement qu'en detruisant la sentinelle elle-meme au prealable.
--
-- Fonctionnement : le mot de passe du compte racine ne peut etre
-- modifie QUE si la requete provient d'une session identifiee comme
-- etant celle de ce meme compte (variable de session PostgreSQL
-- app.id_staff_acteur, positionnee par l'application avant l'UPDATE).
-- Absence de cette variable = blocage par defaut (sur par defaut).
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION site.fn_proteger_mot_de_passe_racine()
RETURNS trigger AS $$
BEGIN
    IF OLD.est_compte_racine AND NEW.mot_de_passe_hache IS DISTINCT FROM OLD.mot_de_passe_hache THEN
        IF current_setting('app.id_staff_acteur', true) IS DISTINCT FROM OLD.id_staff::text THEN
            RAISE EXCEPTION 'Seul le titulaire du compte racine peut changer son propre mot de passe.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proteger_mot_de_passe_racine
    BEFORE UPDATE ON site.staff
    FOR EACH ROW
    EXECUTE FUNCTION site.fn_proteger_mot_de_passe_racine();

COMMIT;
