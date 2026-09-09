-- =====================================================================
-- Mutuelle Pro Assurances -- Normalisation des numeros de telephone
-- Redige le 03/09/2026, demande de Roger : aucun numero ne doit etre
-- stocke sans son prefixe international. Prefixe par defaut : +237
-- (Cameroun, siege de l'entreprise).
--
-- 7 colonnes concernees, sur 6 tables (site.partenaires en a deux) :
--   site.utilisateurs.telephone       site.tickets.telephone_contact
--   site.staff.telephone              site.partenaires.telephone
--   site.prospects.telephone          site.partenaire_contacts.telephone
-- =====================================================================

BEGIN;

-- Fonction de normalisation, reutilisee par tous les triggers ci-dessous.
-- - Deja un "+" : nettoie juste les espaces/tirets eventuels.
-- - Commence par "237" (prefixe oublie mais indicatif present) : ajoute
--   juste le "+", sans dupliquer l'indicatif.
-- - Commence par "0" (convention locale frequente) : le "0" est retire
--   avant d'ajouter le prefixe (0697717334 -> +237697717334, pas
--   +2370697717334).
-- - Sinon : prefixe directement avec +237.
CREATE OR REPLACE FUNCTION site.normaliser_numero_telephone(numero text) RETURNS text AS $$
DECLARE
    chiffres text;
BEGIN
    IF numero IS NULL OR btrim(numero) = '' THEN
        RETURN numero;
    END IF;
    IF numero ~ '^\+' THEN
        RETURN '+' || regexp_replace(substring(numero from 2), '[^0-9]', '', 'g');
    END IF;
    chiffres := regexp_replace(numero, '[^0-9]', '', 'g');
    IF chiffres ~ '^237' THEN
        RETURN '+' || chiffres;
    END IF;
    chiffres := regexp_replace(chiffres, '^0', '');
    RETURN '+237' || chiffres;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Deux fonctions de trigger, selon le nom de colonne concerne --
-- PL/pgSQL ne permet pas de referencer NEW.<colonne dynamique>, donc
-- une fonction par nom de colonne plutot qu'une seule totalement
-- generique. Reutilisees telles quelles sur toutes les tables listees.
CREATE OR REPLACE FUNCTION site.trig_normaliser_telephone() RETURNS trigger AS $$
BEGIN
    NEW.telephone := site.normaliser_numero_telephone(NEW.telephone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION site.trig_normaliser_telephone_contact() RETURNS trigger AS $$
BEGIN
    NEW.telephone_contact := site.normaliser_numero_telephone(NEW.telephone_contact);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rattrapage des donnees deja en base -- le trigger seul ne corrige
-- que les futures ecritures, pas l'existant.
UPDATE site.utilisateurs SET telephone = site.normaliser_numero_telephone(telephone) WHERE telephone IS NOT NULL;
UPDATE site.staff SET telephone = site.normaliser_numero_telephone(telephone) WHERE telephone IS NOT NULL;
UPDATE site.prospects SET telephone = site.normaliser_numero_telephone(telephone) WHERE telephone IS NOT NULL;
UPDATE site.partenaires SET telephone = site.normaliser_numero_telephone(telephone) WHERE telephone IS NOT NULL;
UPDATE site.tickets SET telephone_contact = site.normaliser_numero_telephone(telephone_contact) WHERE telephone_contact IS NOT NULL;
UPDATE site.partenaire_contacts SET telephone = site.normaliser_numero_telephone(telephone) WHERE telephone IS NOT NULL;

-- Triggers -- déclenchés avant écriture, sur les 7 colonnes.
CREATE TRIGGER trig_normaliser_telephone BEFORE INSERT OR UPDATE ON site.utilisateurs
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone();

CREATE TRIGGER trig_normaliser_telephone BEFORE INSERT OR UPDATE ON site.staff
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone();

CREATE TRIGGER trig_normaliser_telephone BEFORE INSERT OR UPDATE ON site.prospects
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone();

CREATE TRIGGER trig_normaliser_telephone BEFORE INSERT OR UPDATE ON site.partenaires
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone();

CREATE TRIGGER trig_normaliser_telephone_contact BEFORE INSERT OR UPDATE ON site.tickets
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone_contact();

CREATE TRIGGER trig_normaliser_telephone BEFORE INSERT OR UPDATE ON site.partenaire_contacts
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone();

COMMIT;
