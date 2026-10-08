# -*- coding: utf-8 -*-
"""
Systeme catalogue vehicules -- PostgreSQL (v4, revisee le 02/08/2026)
=======================================================================

REGLE DEFINITIVE DU 02/08/2026 (Roger) :

    La base source n'a jamais ete constituee avec des references
    strictes, et le parc camerounais est a plus de 80% des vehicules
    d'occasion -- les changements de motorisation (panne moteur
    remplace) y sont frequents et legitimes.

    En consequence : on n'impose plus UNE verite unique par VIN. Des
    qu'un enregistrement differe sur les colonnes descriptives d'un VIN
    deja connu (Marque, Modele, Genre, Energie, Puissance, ChargeUtile,
    NombrePlaces), on AJOUTE UN NOUVEAU PROFIL pour ce VIN -- apres
    avoir applique :
        1. Les corrections de fautes de frappe (ex: "Crorolla" -> "Corolla",
           seuil de similarite >= 0.80, calibre empiriquement le
           02/08/2026 : "COROLLA" vs "COROLLA VERSO" ne depasse que 0.70,
           donc jamais fusionnes a tort).
        2. Les criteres de validation WMI (seulement pour un VIN
           VRAIMENT nouveau -- une marque manifestement incompatible
           avec le WMI reste bloquee, mais un VIN deja connu n'est
           JAMAIS bloque sur simple divergence avec un profil existant).

    Une meme VIN peut donc porter PLUSIEURS profils distincts en base.
    Toute interrogation par VIN retourne le JEU COMPLET de profils
    connus (plafonne a 30, meme principe que la cascade de prefixes).

Prerequis :
    pip install psycopg2-binary pandas --break-system-packages
"""

import re
import unicodedata
import sys
import difflib
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

from vin_structurel import (
    WMI_CONSTRUCTEUR,
    PAYS_PAR_CARACTERE,
    WMI_TO_PAYS_PRECIS,
    compute_check_digit,
)


SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parent
VIN_DIR = BASE_DIR / "VIN"

FICHIER_NETTOYE_PAR_DEFAUT = VIN_DIR / "Vehicule.csv"


def etape(numero, total, libelle):
    print(f"[{numero}/{total}] {libelle}", flush=True)


def _lire_env(chemin_env: Path) -> dict:
    """Lecture minimale d'un fichier .env (CLE=VALEUR par ligne), sans
    dependance externe. Ignore les lignes vides/commentaires."""
    valeurs = {}
    if not chemin_env.exists():
        return valeurs
    for ligne in chemin_env.read_text(encoding="utf-8").splitlines():
        ligne = ligne.strip()
        if not ligne or ligne.startswith("#") or "=" not in ligne:
            continue
        cle, _, valeur = ligne.partition("=")
        valeurs[cle.strip()] = valeur.strip().strip('"').strip("'")
    return valeurs


FICHIER_ENV = Path(r"C:\MutuellePro\vin-decoder-api\.env")
_env = _lire_env(FICHIER_ENV)

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "vpiclist",
    "user": _env.get("PGUSER", "postgres"),
    "password": _env.get("PGPASSWORD", "VOTRE_MOT_DE_PASSE"),
}
if _env:
    print(f"Identifiants PostgreSQL charges depuis {FICHIER_ENV} (utilisateur='{DB_CONFIG['user']}').")
SCHEMA = "catalogue"

NIVEAUX_CASCADE = [17, 14, 11, 10, 8, 5, 3]
SEUIL_MAX_RESULTATS = 30
TAILLE_VIN_PAR_DEFAUT = 17
SEUIL_CORRECTION_TYPO = 0.80


class Decision:
    REJETE_GENRE_INCONNU           = "REJETE_GENRE_INCONNU"
    CREE_VEHICULE_NOUVEAU          = "CREE_VEHICULE_NOUVEAU"
    NOUVEAU_PROFIL_AJOUTE          = "NOUVEAU_PROFIL_AJOUTE"
    SOURCE_LIEE_PROFIL_EXISTANT    = "SOURCE_LIEE_PROFIL_EXISTANT"
    AVERTISSEMENT_MARQUE_HORS_TABLE = "AVERTISSEMENT_MARQUE_HORS_TABLE"
    DEJA_IMPORTE                   = "DEJA_IMPORTE"
    BLOQUE_MARQUE_INCOMPATIBLE_WMI = "BLOQUE_MARQUE_INCOMPATIBLE_WMI"
    REJETE_FORMAT_VIN              = "REJETE_FORMAT_VIN"
    REJETE_REFERENCE_MANQUANTE     = "REJETE_REFERENCE_MANQUANTE"


DECISIONS_BLOQUANTES = {
    Decision.BLOQUE_MARQUE_INCOMPATIBLE_WMI,
    Decision.REJETE_FORMAT_VIN,
    Decision.REJETE_REFERENCE_MANQUANTE,
    Decision.REJETE_GENRE_INCONNU,
}


DDL = """
CREATE SCHEMA IF NOT EXISTS catalogue;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS vehicule_catalogue (
    id_vehicule_catalogue BIGSERIAL PRIMARY KEY,
    vin             VARCHAR(17) NOT NULL,
    wmi             VARCHAR(3) GENERATED ALWAYS AS (LEFT(vin, 3)) STORED,
    marque          TEXT,
    modele          TEXT,
    id_terme_vehicule       INTEGER NOT NULL REFERENCES referentiel.terme_vehicule (id_terme_vehicule),
    avec_remorque           BOOLEAN NOT NULL DEFAULT false,
    avec_double_commande    BOOLEAN NOT NULL DEFAULT false,
    avec_double_cabine      BOOLEAN NOT NULL DEFAULT false,
    code_categorie_suggeree VARCHAR(10),
    energie         TEXT,
    puissance       TEXT,
    charge_utile    INTEGER,
    nombre_places   NUMERIC,
    taille_vin      INTEGER DEFAULT 17,
    date_creation   TIMESTAMP DEFAULT now(),
    UNIQUE NULLS NOT DISTINCT (vin, marque, modele, id_terme_vehicule, avec_remorque, avec_double_commande,
                               avec_double_cabine, code_categorie_suggeree, energie, puissance, charge_utile, nombre_places)
);

CREATE INDEX IF NOT EXISTS idx_vehicule_catalogue_vin ON vehicule_catalogue (vin);
CREATE INDEX IF NOT EXISTS idx_vehicule_catalogue_wmi ON vehicule_catalogue (wmi);
CREATE INDEX IF NOT EXISTS idx_vehicule_catalogue_vin_prefix
    ON vehicule_catalogue (vin text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_vehicule_catalogue_marque ON vehicule_catalogue (marque);
CREATE INDEX IF NOT EXISTS idx_vehicule_catalogue_marque_trgm
    ON vehicule_catalogue USING gin (marque gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicule_catalogue_modele_trgm
    ON vehicule_catalogue USING gin (modele gin_trgm_ops);


CREATE TABLE IF NOT EXISTS vehicule_source (
    id_vehicule_source    BIGSERIAL PRIMARY KEY,
    id_vehicule_catalogue BIGINT NOT NULL REFERENCES vehicule_catalogue(id_vehicule_catalogue),
    vin             VARCHAR(17) NOT NULL,
    site_origine    TEXT NOT NULL,
    id_reference    BIGINT NOT NULL,
    date_import     TIMESTAMP DEFAULT now(),
    UNIQUE (site_origine, id_reference)
);
CREATE INDEX IF NOT EXISTS idx_vehicule_source_vin ON vehicule_source (vin);
CREATE INDEX IF NOT EXISTS idx_vehicule_source_id_vehicule_catalogue ON vehicule_source (id_vehicule_catalogue);


CREATE TABLE IF NOT EXISTS anomalie_fusion (
    id_anomalie_fusion BIGSERIAL PRIMARY KEY,
    vin              VARCHAR(17) NOT NULL,
    site_origine     TEXT NOT NULL,
    id_reference     TEXT,
    champ            TEXT NOT NULL,
    valeur_catalogue TEXT,
    valeur_nouvelle  TEXT,
    gravite          TEXT NOT NULL,
    code_erreur      TEXT NOT NULL,
    message          TEXT NOT NULL,
    statut           TEXT DEFAULT 'a_verifier',
    date_detection   TIMESTAMP DEFAULT now(),
    date_resolution  TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_anomalie_fusion_vin     ON anomalie_fusion (vin);
CREATE INDEX IF NOT EXISTS idx_anomalie_fusion_statut  ON anomalie_fusion (statut);
CREATE INDEX IF NOT EXISTS idx_anomalie_fusion_gravite ON anomalie_fusion (gravite);
"""


MAPPING_ENERGIE = {
    "ESSENCE": "Essence", "GAS-OIL": "Diesel", "GASS-OIL": "Diesel",
    "GS-OIL": "Diesel", "DIESEL": "Diesel", "AUTRE": "Autre",
    "E": "Essence", "ES": "Essence",
}


VIN_EXPLOITABLE = re.compile(r"[A-Z0-9]{10,17}")
_CORRECTION_VIN = str.maketrans({
    # Frappe AZERTY sans majuscule sur la rangee des chiffres
    "&": "1", "\u00c9": "2", '"': "3", "'": "4", "(": "5", "\u00c8": "7", "_": "8", "\u00c7": "9", "\u00c0": "0",
    # Lettres interdites par ISO 3779
    "I": "1", "O": "0", "Q": "0",
})


def normaliser_vin(valeur) -> str:
    """
    Normalisation du VIN (decision de Roger, 07/10/2026) :
      - majuscules, espaces de bord retires ;
      - tirets bas et espaces de remplissage en FIN de VIN retires ;
      - I -> 1, O -> 0, Q -> 0 (lettres interdites par la norme ISO 3779,
        presque toujours saisies a la place d'un chiffre) ;
      - frappe AZERTY sans majuscule : & e " ' ( e _ c a -> 1 2 3 4 5 7 8 9 0
        (le tiret '-' reste un separateur, donc un VIN inexploitable) ;
      - une apostrophe EN TETE (prefixe texte d'Excel) laisse le VIN tel quel :
        il sera rejete comme inexploitable.
    La meme regle est appliquee dans la base et dans l'API : un VIN saisi
    avec un O retrouve le vehicule enregistre avec un 0.
    """
    vin = str(valeur if valeur is not None else "").strip().upper()
    vin = re.sub(r"[_ ]+$", "", vin)
    if vin.startswith("'"):
        return vin
    return vin.translate(_CORRECTION_VIN)


def sans_accents(s) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', str(s)) if unicodedata.category(c) != 'Mn')


COLONNES_ATTENDUES = [
    "Reference", "Marque", "Modele", "Genre", "NumeroSerie",
    "Energie", "Puissance", "ChargeUtile", "NombrePlaces", "TailleVIN",
]

# Synonymes CONNUS (pas de simples variantes d'orthographe/casse/accent --
# celles-la sont deja gerees par la normalisation -- mais des noms
# vraiment differents utilises par certaines agences).
ALIAS_COLONNES = {
    "Reference": ["id_reference", "IdReference", "ID", "Ref", "NumRef", "IdVehicule"],
    "NumeroSerie": ["VIN", "Chassis", "NumeroChassis", "NumChassis"],
    "Marque": ["Constructeur", "Brand"],
}


def resoudre_colonnes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Renomme les colonnes du DataFrame vers les noms canoniques attendus,
    de façon tolerante a la casse, aux accents et aux espaces superflus
    (ex: 'référence', 'REFERENCE ', 'Numero_Serie' -> les bons noms),
    ET aux synonymes connus (ex: 'id_reference' -> 'Reference').
    Affiche un diagnostic clair si une colonne attendue reste introuvable.
    """
    def cle_normalisee(nom):
        return sans_accents(str(nom)).upper().replace("_", "").replace(" ", "").strip()

    colonnes_df_normalisees = {cle_normalisee(c): c for c in df.columns}
    renommage = {}
    manquantes = []

    for attendue in COLONNES_ATTENDUES:
        cles_candidates = [attendue] + ALIAS_COLONNES.get(attendue, [])
        colonne_reelle = None
        for candidate in cles_candidates:
            cle = cle_normalisee(candidate)
            if cle in colonnes_df_normalisees:
                colonne_reelle = colonnes_df_normalisees[cle]
                break

        if colonne_reelle:
            if colonne_reelle != attendue:
                renommage[colonne_reelle] = attendue
        else:
            manquantes.append(attendue)

    if renommage:
        print(f"  Colonnes reconnues malgre une orthographe/synonyme different : {renommage}")
        df = df.rename(columns=renommage)

    if manquantes:
        print(f"  ATTENTION : colonnes introuvables meme apres tolerance : {manquantes}")
        print(f"  Colonnes reellement presentes dans le fichier : {list(df.columns)}")

    return df


def normaliser_energie(valeur, genre="") -> Optional[str]:
    if pd.isna(valeur):
        return None
    brut = str(valeur).strip()
    if brut in ("0", "00") and "remorque" in str(genre).lower():
        return "Sans objet (remorque)"
    return MAPPING_ENERGIE.get(brut.upper(), brut)


def normaliser_genre(valeur) -> Optional[str]:
    if pd.isna(valeur):
        return None
    brut = str(valeur).strip()
    return brut.upper() if brut.upper() in ("V.P.", "V.P", "4X4") else brut.title()


def normaliser_marque(valeur) -> Optional[str]:
    if pd.isna(valeur):
        return None
    brut = sans_accents(str(valeur)).upper().strip()
    brut = brut.replace(".", "").replace("-", " ")
    return " ".join(brut.split())


def normaliser_modele(valeur) -> Optional[str]:
    if pd.isna(valeur):
        return None
    return str(valeur).strip().upper()


ALIAS_MARQUE = {
    "LEXUS": "TOYOTA", "DAIHATSU": "TOYOTA", "KIA": "HYUNDAI",
    "CNHTC": "SINOTRUK", "BMW": "B M W",
}


def marques_equivalentes(a: Optional[str], b: Optional[str]) -> bool:
    if not a or not b:
        return False
    if a == b:
        return True
    a_norm = ALIAS_MARQUE.get(a, a)
    b_norm = ALIAS_MARQUE.get(b, b)
    if a_norm == b_norm:
        return True
    return (a_norm in b_norm) or (b_norm in a_norm)


def similarite(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, str(a).upper(), str(b).upper()).ratio()


def corriger_par_proximite(valeur: Optional[str], candidats: list, seuil: float = SEUIL_CORRECTION_TYPO) -> Optional[str]:
    if not valeur or not candidats:
        return valeur
    meilleur, meilleur_score = valeur, 0.0
    for c in candidats:
        if not c:
            continue
        s = similarite(valeur, c)
        if s > meilleur_score:
            meilleur, meilleur_score = c, s
    if meilleur_score >= seuil:
        return meilleur
    return valeur


def nettoyer(brut: dict) -> dict:
    taille_declaree = brut.get("TailleVIN")
    try:
        taille_declaree = int(taille_declaree) if taille_declaree not in (None, "") and not pd.isna(taille_declaree) else TAILLE_VIN_PAR_DEFAUT
    except (TypeError, ValueError):
        taille_declaree = TAILLE_VIN_PAR_DEFAUT

    id_reference = brut.get("Reference")
    if id_reference is not None and not (isinstance(id_reference, float) and pd.isna(id_reference)):
        try:
            id_reference = int(id_reference)
        except (TypeError, ValueError):
            pass

    return {
        "id_reference": id_reference,
        "marque": normaliser_marque(brut.get("Marque")),
        "modele": normaliser_modele(brut.get("Modele")),
        "genre": normaliser_genre(brut.get("Genre")),
        "vin": normaliser_vin(brut.get("NumeroSerie", "")),
        "vin_brut": str(brut.get("NumeroSerie", "")).strip().upper(),
        "energie": normaliser_energie(brut.get("Energie"), brut.get("Genre")),
        "puissance": brut.get("Puissance"),
        "charge_utile": brut.get("ChargeUtile"),
        "nombre_places": brut.get("NombrePlaces"),
        "taille_vin": taille_declaree,
    }


def identifier_wmi_externe(vin: str) -> dict:
    vin = normaliser_vin(vin)
    wmi3 = vin[:3] if len(vin) >= 3 else ""
    wmi2 = vin[:2] if len(vin) >= 2 else ""
    premier = vin[:1] if vin else ""

    constructeur = WMI_CONSTRUCTEUR.get(wmi3)
    pays = WMI_TO_PAYS_PRECIS.get(wmi2, PAYS_PAR_CARACTERE.get(premier))
    check_digit_ok = None
    if len(vin) == 17:
        calcule = compute_check_digit(vin)
        check_digit_ok = (calcule == vin[8]) if calcule else None

    return {
        "wmi": wmi3,
        "constructeur_connu": constructeur,
        "pays_probable": pays,
        "check_digit_coherent": check_digit_ok,
    }


@dataclass
class ResultatCascade:
    vin_interroge: str
    niveau_trouve: Optional[int]
    prefixe: Optional[str]
    nb_references: int
    resultats: list = field(default_factory=list)
    agrege: dict = field(default_factory=dict)
    identification_externe: dict = field(default_factory=dict)


@dataclass
class ResultatTraitement:
    decision: str
    vin: str
    gravite: str
    message: str
    identification_externe: dict = field(default_factory=dict)


class SystemeCatalogue:

    COLONNES_PROFIL = [
        "id_vehicule_catalogue", "vin", "marque", "modele", "genre", "terme_vehicule",
        "code_categorie_suggeree", "avec_remorque", "avec_double_commande", "avec_double_cabine", "energie",
        "puissance", "charge_utile", "nombre_places", "taille_vin",
    ]

    SEUIL_SIMILARITE_DEFAUT = 0.3

    def __init__(self, db_config: dict = DB_CONFIG):
        self.db_config = db_config

    def _connexion(self):
        conn = psycopg2.connect(**self.db_config)
        cur = conn.cursor()
        cur.execute(f"SET search_path TO {SCHEMA}, public")
        cur.close()
        return conn

    def initialiser_schema(self):
        print(f"Connexion a PostgreSQL (base='{self.db_config['dbname']}', "
              f"host='{self.db_config['host']}')...", flush=True)
        conn = self._connexion()
        print(f"  -> CONNEXION REUSSIE.")
        cur = conn.cursor()
        print(f"Creation/verification du schema '{SCHEMA}' et des tables...", flush=True)
        cur.execute(DDL)
        conn.commit()
        cur.close()
        conn.close()
        print(f"  -> Schema pret.")

    def rechercher_cascade(self, vin_partiel: str) -> ResultatCascade:
        vin_partiel = normaliser_vin(vin_partiel)
        conn = self._connexion()
        cur = conn.cursor()

        dernier_valide = None

        for n in NIVEAUX_CASCADE:
            if len(vin_partiel) < n:
                continue
            prefixe = vin_partiel[:n]

            cur.execute(
                "SELECT COUNT(*) FROM vehicule_catalogue WHERE vin LIKE %s || '%%'",
                (prefixe,),
            )
            nb = cur.fetchone()[0]

            if nb == 0:
                continue
            if nb > SEUIL_MAX_RESULTATS:
                break

            colonnes_sql = ", ".join(self.COLONNES_PROFIL)
            cur.execute(
                f"SELECT {colonnes_sql} FROM profil_vehicule WHERE vin LIKE %s || '%%'",
                (prefixe,),
            )
            lignes = [dict(zip(self.COLONNES_PROFIL, l)) for l in cur.fetchall()]
            dernier_valide = (n, prefixe, nb, lignes)

        cur.close()
        conn.close()

        identification = identifier_wmi_externe(vin_partiel)

        if dernier_valide is None:
            return ResultatCascade(vin_interroge=vin_partiel, niveau_trouve=None,
                                     prefixe=None, nb_references=0,
                                     identification_externe=identification)

        n, prefixe, nb, lignes = dernier_valide
        agrege = self._agreger(lignes)
        return ResultatCascade(
            vin_interroge=vin_partiel, niveau_trouve=n, prefixe=prefixe,
            nb_references=nb, resultats=lignes, agrege=agrege,
            identification_externe=identification,
        )

    @staticmethod
    def _agreger(lignes: list) -> dict:
        if not lignes:
            return {}
        df = pd.DataFrame(lignes)
        resultat = {}
        for champ in ["marque", "modele", "energie", "puissance", "nombre_places"]:
            serie = df[champ].dropna()
            if len(serie) == 0:
                resultat[champ] = None
                resultat[f"{champ}_confiance"] = 0.0
                continue
            comptes = serie.value_counts()
            resultat[champ] = comptes.index[0]
            resultat[f"{champ}_confiance"] = round(100 * comptes.iloc[0] / len(serie), 1)
        return resultat

    def rechercher_profils_vin(self, vin: str) -> dict:
        vin = normaliser_vin(vin)
        conn = self._connexion()
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM vehicule_catalogue WHERE vin = %s", (vin,))
        nb = cur.fetchone()[0]

        if nb == 0:
            cur.close()
            conn.close()
            return {"trouve": False, "resultats": [],
                    "identification_externe": identifier_wmi_externe(vin)}

        if nb > SEUIL_MAX_RESULTATS:
            cur.close()
            conn.close()
            return {"trouve": False, "resultats": [], "nb_profils": nb,
                    "message": f"{nb} profils distincts pour ce VIN (> {SEUIL_MAX_RESULTATS}) : "
                               f"cas exceptionnel, verification manuelle recommandee."}

        colonnes_sql = ", ".join(self.COLONNES_PROFIL)
        cur.execute(f"SELECT {colonnes_sql} FROM profil_vehicule WHERE vin = %s", (vin,))
        lignes = [dict(zip(self.COLONNES_PROFIL, l)) for l in cur.fetchall()]
        cur.close()
        conn.close()

        return {"trouve": True, "nb_profils": nb, "resultats": lignes,
                "identification_externe": identifier_wmi_externe(vin)}

    def _traiter_ligne(self, cur, site: str, brut: dict) -> ResultatTraitement:
        propre = nettoyer(brut)
        vin = propre["vin"]
        id_reference = propre["id_reference"]

        if id_reference is None:
            msg = "Champ Reference manquant ou invalide : enregistrement inexploitable."
            self._journaliser(cur, vin or "", site, id_reference, "Reference", None, None,
                               "bloquant", Decision.REJETE_REFERENCE_MANQUANTE, msg)
            return ResultatTraitement(Decision.REJETE_REFERENCE_MANQUANTE, vin or "", "bloquant", msg)

        if not VIN_EXPLOITABLE.fullmatch(vin):
            msg = ("VIN inexploitable : caracteres non autorises a l'interieur, "
                   "ou moins de 10 caracteres apres normalisation (regle du 07/10/2026).")
            self._journaliser(cur, vin or "", site, id_reference, "VIN", None, propre["vin_brut"],
                               "bloquant", Decision.REJETE_FORMAT_VIN, msg)
            return ResultatTraitement(Decision.REJETE_FORMAT_VIN, vin or "", "bloquant", msg)

        # La taille declaree se compare au VIN BRUT : le remplissage de fin
        # (tirets bas) fait partie de la saisie d'origine.
        if len(propre["vin_brut"]) != propre["taille_vin"]:
            msg = (f"VIN de {len(propre['vin_brut'])} caracteres, attendu {propre['taille_vin']} "
                   f"(champ TailleVIN declare pour cet enregistrement).")
            self._journaliser(cur, vin, site, id_reference, "TailleVIN", str(propre["taille_vin"]),
                               str(len(propre["vin_brut"])), "bloquant", Decision.REJETE_FORMAT_VIN, msg)
            return ResultatTraitement(Decision.REJETE_FORMAT_VIN, vin, "bloquant", msg)

        # Lot 3 (07/10/2026) : le libelle de genre de l'agence est rapproche du lexique
        # par referentiel.correspondance_libelle_vehicule ; un libelle inconnu est rejete.
        cur.execute(
            "SELECT id_terme_vehicule, avec_remorque, avec_double_commande, avec_double_cabine, "
            "code_categorie_suggeree FROM referentiel.correspondance_libelle_vehicule "
            "WHERE cle_normalisee = referentiel.fn_normaliser_libelle(%s)",
            (propre["genre"],),
        )
        lexique = cur.fetchone()
        if lexique is None:
            msg = (f"Libelle de genre '{propre['genre']}' absent de la correspondance du lexique : "
                   f"a ajouter dans referentiel.correspondance_libelle_vehicule.")
            self._journaliser(cur, vin, site, id_reference, "Genre", None, propre["genre"],
                               "bloquant", Decision.REJETE_GENRE_INCONNU, msg)
            return ResultatTraitement(Decision.REJETE_GENRE_INCONNU, vin, "bloquant", msg)
        (propre["id_terme_vehicule"], propre["avec_remorque"], propre["avec_double_commande"],
         propre["avec_double_cabine"], propre["code_categorie_suggeree"]) = lexique

        cur.execute(
            "SELECT 1 FROM vehicule_source WHERE site_origine = %s AND id_reference = %s",
            (site, id_reference),
        )
        if cur.fetchone():
            return ResultatTraitement(Decision.DEJA_IMPORTE, vin, "info",
                                        "Deja importe depuis cette source (id_reference connu), rien a faire.")

        identification = identifier_wmi_externe(vin)

        cur.execute(
            "SELECT id_vehicule_catalogue, marque, modele, id_terme_vehicule, avec_remorque, avec_double_commande, "
            "avec_double_cabine, code_categorie_suggeree, energie, puissance, charge_utile, nombre_places "
            "FROM vehicule_catalogue WHERE vin = %s",
            (vin,),
        )
        profils_existants = cur.fetchall()

        if profils_existants:
            marques_connues = [p[1] for p in profils_existants if p[1]]
            modeles_connus = [p[2] for p in profils_existants if p[2]]
            propre["marque"] = corriger_par_proximite(propre["marque"], marques_connues)
            propre["modele"] = corriger_par_proximite(propre["modele"], modeles_connus)
        elif identification["constructeur_connu"]:
            marque_curatee = normaliser_marque(
                identification["constructeur_connu"].split("(")[0].split("\u2014")[0].strip()
            )
            propre["marque"] = corriger_par_proximite(propre["marque"], [marque_curatee])

        alertes = []

        if not profils_existants:
            wmi = vin[:3]
            if identification["constructeur_connu"]:
                attendu = normaliser_marque(
                    identification["constructeur_connu"].split("(")[0].split("\u2014")[0].strip()
                )
                if not marques_equivalentes(attendu, propre["marque"]):
                    alertes.append((
                        "Marque", identification["constructeur_connu"], propre["marque"], "bloquant",
                        Decision.BLOQUE_MARQUE_INCOMPATIBLE_WMI,
                        f"Marque declaree '{propre['marque']}' incompatible avec le WMI '{wmi}', "
                        f"identifie par nos recherches comme '{identification['constructeur_connu']}'. "
                        f"Creation bloquee.",
                    ))
            else:
                cur.execute(
                    "SELECT marque, COUNT(*) FROM vehicule_catalogue WHERE wmi = %s "
                    "AND marque IS NOT NULL GROUP BY marque ORDER BY COUNT(*) DESC LIMIT 5",
                    (wmi,),
                )
                marques_portefeuille = [(m, n) for m, n in cur.fetchall() if m]
                if marques_portefeuille:
                    valides = {m for m, _ in marques_portefeuille}
                    if not any(marques_equivalentes(propre["marque"], m) for m in valides):
                        alertes.append((
                            "Marque", "|".join(m for m, _ in marques_portefeuille), propre["marque"],
                            "avertissement", Decision.AVERTISSEMENT_MARQUE_HORS_TABLE,
                            f"Marque declaree '{propre['marque']}' absente des marques deja vues pour "
                            f"ce WMI dans le portefeuille. WMI absent de la table curatee -> "
                            f"signal moins fiable, cree quand meme.",
                        ))

        for champ, val_cat, val_nouv, gravite, code, message in alertes:
            self._journaliser(cur, vin, site, id_reference, champ, val_cat, val_nouv, gravite, code, message)

        alerte_bloquante = next((a for a in alertes if a[3] == "bloquant"), None)
        if alerte_bloquante:
            return ResultatTraitement(alerte_bloquante[4], vin, "bloquant", alerte_bloquante[5],
                                        identification_externe=identification)

        profil_correspondant = None
        for p in profils_existants:
            (pid, marque, modele, id_terme, remorque, dcommande, dcabine, categorie,
             energie, puissance, charge_utile, nombre_places) = p
            if (marque == propre["marque"] and modele == propre["modele"] and
                    id_terme == propre["id_terme_vehicule"] and remorque == propre["avec_remorque"] and
                    dcommande == propre["avec_double_commande"] and dcabine == propre["avec_double_cabine"] and
                    categorie == propre["code_categorie_suggeree"] and energie == propre["energie"] and
                    puissance == propre["puissance"] and charge_utile == propre["charge_utile"] and
                    nombre_places == propre["nombre_places"]):
                profil_correspondant = pid
                break

        if profil_correspondant is not None:
            id_vehicule_catalogue = profil_correspondant
            decision = Decision.SOURCE_LIEE_PROFIL_EXISTANT
            message = "Correspond exactement a un profil deja connu pour ce VIN (apres correction)."
            gravite = "info"
        else:
            cur.execute(
                "INSERT INTO vehicule_catalogue "
                "(vin, marque, modele, id_terme_vehicule, avec_remorque, avec_double_commande, avec_double_cabine, "
                "code_categorie_suggeree, energie, puissance, charge_utile, nombre_places, taille_vin) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id_vehicule_catalogue",
                (vin, propre["marque"], propre["modele"], propre["id_terme_vehicule"], propre["avec_remorque"],
                 propre["avec_double_commande"], propre["avec_double_cabine"], propre["code_categorie_suggeree"],
                 propre["energie"],
                 propre["puissance"], propre["charge_utile"], propre["nombre_places"], propre["taille_vin"]),
            )
            id_vehicule_catalogue = cur.fetchone()[0]
            if profils_existants:
                decision = Decision.NOUVEAU_PROFIL_AJOUTE
                message = (f"VIN deja connu ({len(profils_existants)} profil(s) existant(s)) : "
                           f"nouveau profil distinct ajoute (changement de motorisation ou variante reelle).")
                gravite = "info"
                self._journaliser(cur, vin, site, id_reference, "Profil", "multiple",
                                    str(propre), "info", Decision.NOUVEAU_PROFIL_AJOUTE, message)
            else:
                decision = Decision.CREE_VEHICULE_NOUVEAU
                message = "Premier profil pour ce VIN, cree sans reserve."
                gravite = "ok"

        cur.execute(
            "INSERT INTO vehicule_source (id_vehicule_catalogue, vin, site_origine, id_reference) "
            "VALUES (%s,%s,%s,%s)",
            (id_vehicule_catalogue, vin, site, id_reference),
        )

        alerte_avertissement = next((a for a in alertes if a[3] == "avertissement"), None)
        if alerte_avertissement:
            return ResultatTraitement(alerte_avertissement[4], vin, "avertissement",
                                        alerte_avertissement[5], identification_externe=identification)

        return ResultatTraitement(decision, vin, gravite, message, identification_externe=identification)

    @staticmethod
    def _journaliser(cur, vin, site, id_reference, champ, val_catalogue, val_nouvelle,
                       gravite, code, message):
        cur.execute(
            "INSERT INTO anomalie_fusion "
            "(vin, site_origine, id_reference, champ, valeur_catalogue, valeur_nouvelle, "
            "gravite, code_erreur, message) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (vin, site, str(id_reference) if id_reference is not None else None, champ,
             val_catalogue, val_nouvelle, gravite, code, message),
        )

    def fusionner_fichier(self, site: str, chemin_csv) -> dict:
        chemin_csv = Path(chemin_csv)
        print(f"Lecture du fichier '{site}' : {chemin_csv}...", flush=True)
        if not chemin_csv.exists():
            print(f"  ERREUR : fichier introuvable.")
            return {}
        try:
            df = pd.read_csv(chemin_csv, encoding="utf-8-sig")
        except UnicodeDecodeError:
            print("  Encodage UTF-8 invalide, nouvelle tentative en ISO-8859-1 "
                  "(fichier brut/export Excel non nettoye)...")
            df = pd.read_csv(chemin_csv, encoding="ISO-8859-1", sep=None, engine="python")
        df = df.where(pd.notnull(df), None)
        print(f"  Colonnes lues dans le fichier : {list(df.columns)}")
        df = resoudre_colonnes(df)
        total = len(df)
        print(f"  -> {total} lignes chargees.")

        print(f"Connexion a PostgreSQL...", flush=True)
        conn = self._connexion()
        print(f"  -> CONNEXION REUSSIE.")
        cur = conn.cursor()

        compteurs = {}
        print(f"Traitement des {total} enregistrements...", flush=True)
        for i, (_, brut) in enumerate(df.iterrows(), start=1):
            resultat = self._traiter_ligne(cur, site, brut.to_dict())
            compteurs[resultat.decision] = compteurs.get(resultat.decision, 0) + 1
            if i % 2000 == 0 or i == total:
                rejetes = sum(n for d, n in compteurs.items() if d in DECISIONS_BLOQUANTES)
                deja_vus = compteurs.get(Decision.DEJA_IMPORTE, 0)
                importes = i - rejetes - deja_vus
                print(f"  ... {i}/{total} traites ({100*i/total:.1f}%) "
                      f"-- importes: {importes}, rejetes/bloques: {rejetes}, deja_importes: {deja_vus}",
                      flush=True)

        conn.commit()
        cur.close()
        conn.close()

        print()
        print("=" * 60)
        print(f"FUSION '{site}' TERMINEE AVEC SUCCES")
        print("=" * 60)
        for decision, n in sorted(compteurs.items(), key=lambda x: -x[1]):
            print(f"  {decision:35s} : {n}")
        return compteurs

    def traiter_nouvelle_reference(self, site: str, donnees_brutes: dict) -> ResultatTraitement:
        conn = self._connexion()
        cur = conn.cursor()
        resultat = self._traiter_ligne(cur, site, donnees_brutes)
        conn.commit()
        cur.close()
        conn.close()
        return resultat

    def rechercher_par_id_reference(self, id_reference, site: Optional[str] = None) -> dict:
        id_reference_str = str(id_reference).strip()
        if not id_reference_str.lstrip("-").isdigit():
            return {"trouve": False, "resultats": [], "message": "id_reference doit etre numerique."}

        conn = self._connexion()
        cur = conn.cursor()
        colonnes_sql = ", ".join(f"c.{c}" for c in self.COLONNES_PROFIL)

        if site:
            cur.execute(
                f"SELECT s.site_origine, s.id_reference, s.date_import, {colonnes_sql} "
                f"FROM vehicule_source s JOIN profil_vehicule c ON c.id_vehicule_catalogue = s.id_vehicule_catalogue "
                f"WHERE s.site_origine = %s AND s.id_reference = %s",
                (site, int(id_reference_str)),
            )
        else:
            cur.execute(
                f"SELECT s.site_origine, s.id_reference, s.date_import, {colonnes_sql} "
                f"FROM vehicule_source s JOIN profil_vehicule c ON c.id_vehicule_catalogue = s.id_vehicule_catalogue "
                f"WHERE s.id_reference = %s",
                (int(id_reference_str),),
            )
        lignes = cur.fetchall()
        cur.close()
        conn.close()

        if not lignes:
            return {"trouve": False, "resultats": []}

        cols = ["site_origine", "id_reference", "date_import"] + self.COLONNES_PROFIL
        resultats = [dict(zip(cols, l)) for l in lignes]
        return {"trouve": True, "nb_sites_differents": len({r["site_origine"] for r in resultats}),
                "resultats": resultats}

    def rechercher_par_reference(self, marque: Optional[str] = None, modele: Optional[str] = None,
                                    energie: Optional[str] = None, puissance: Optional[str] = None,
                                    charge_utile: Optional[float] = None, nombre_places: Optional[float] = None,
                                    seuil_similarite: float = SEUIL_SIMILARITE_DEFAUT,
                                    limite: int = SEUIL_MAX_RESULTATS) -> dict:
        if not marque and not modele:
            return {"trouve": False, "resultats": [],
                    "message": "Au moins Marque ou Modele est necessaire pour cette recherche."}

        marque_norm = normaliser_marque(marque) if marque else None
        modele_norm = str(modele).strip().upper() if modele else None
        energie_norm = normaliser_energie(energie) if energie else None

        conn = self._connexion()
        cur = conn.cursor()

        morceaux_score = []
        params = []
        if marque_norm:
            morceaux_score.append("COALESCE(similarity(marque, %s), 0)")
            params.append(marque_norm)
        if modele_norm:
            morceaux_score.append("COALESCE(similarity(modele, %s), 0)")
            params.append(modele_norm)
        score_sql = " + ".join(morceaux_score) if morceaux_score else "0"

        bonus_sql = []
        if energie_norm:
            bonus_sql.append("(CASE WHEN energie = %s THEN 0.5 ELSE 0 END)")
            params.append(energie_norm)
        if puissance:
            bonus_sql.append("(CASE WHEN puissance = %s THEN 0.3 ELSE 0 END)")
            params.append(str(puissance).strip())
        if nombre_places is not None:
            bonus_sql.append("(CASE WHEN nombre_places = %s THEN 0.3 ELSE 0 END)")
            params.append(nombre_places)
        if charge_utile is not None:
            bonus_sql.append("(CASE WHEN charge_utile = %s THEN 0.2 ELSE 0 END)")
            params.append(charge_utile)

        score_total_sql = score_sql + ("".join(f" + {b}" for b in bonus_sql))

        filtres_seuil = []
        params_filtre = []
        if marque_norm:
            filtres_seuil.append("similarity(marque, %s) > %s")
            params_filtre += [marque_norm, seuil_similarite]
        if modele_norm:
            filtres_seuil.append("similarity(modele, %s) > %s")
            params_filtre += [modele_norm, seuil_similarite]
        filtre_seuil_sql = " OR ".join(filtres_seuil)

        cur.execute(
            f"SELECT COUNT(*) FROM vehicule_catalogue WHERE {filtre_seuil_sql}",
            tuple(params_filtre),
        )
        nb_correspondances = cur.fetchone()[0]

        if nb_correspondances == 0:
            cur.close()
            conn.close()
            return {"trouve": False, "resultats": [],
                    "message": "Aucune correspondance, meme approximative."}

        if nb_correspondances > limite:
            cur.close()
            conn.close()
            return {
                "trouve": False, "resultats": [], "nb_correspondances": nb_correspondances,
                "seuil_trop_permissif": True,
                "message": (
                    f"{nb_correspondances} vehicules correspondent au moins vaguement "
                    f"(seuil de similarite = {seuil_similarite}), soit plus que la limite "
                    f"de {limite}. Precisez le modele, ou augmentez seuil_similarite."
                ),
            }

        colonnes_sql = ", ".join(self.COLONNES_PROFIL)
        requete = (
            f"SELECT {colonnes_sql}, ({score_total_sql}) AS score "
            f"FROM profil_vehicule WHERE {filtre_seuil_sql} ORDER BY score DESC LIMIT %s"
        )
        cur.execute(requete, tuple(params + params_filtre + [limite]))
        lignes = cur.fetchall()
        cur.close()
        conn.close()

        resultats = [dict(zip(self.COLONNES_PROFIL + ["score"], l)) for l in lignes]
        return {"trouve": True, "nb_resultats": len(resultats), "resultats": resultats}


if __name__ == "__main__":
    print("=" * 60)
    print("SYSTEME CATALOGUE VEHICULES -- INITIALISATION")
    print("=" * 60)
    print(f"Dossier scripts : {SCRIPT_DIR}")
    print(f"Dossier VIN     : {VIN_DIR}")
    print()

    systeme = SystemeCatalogue()

    print("--- ETAPE A : schema PostgreSQL ---")
    systeme.initialiser_schema()
    print()

    noms_fichiers = sys.argv[1:] if len(sys.argv) > 1 else ["Vehicule.csv"]

    print(f"--- ETAPE B : import de {len(noms_fichiers)} fichier(s) ---")
    for nom in noms_fichiers:
        chemin = Path(nom)
        if not chemin.is_absolute():
            chemin = VIN_DIR / chemin
        site = chemin.stem.lower()
        print(f"\n>>> Fichier : {chemin}  (site='{site}')")
        systeme.fusionner_fichier(site, chemin)
    print()

    print("--- ETAPE C : exemple de recherche du jeu de profils pour un VIN ---")
    resultat = systeme.rechercher_profils_vin("JT1GF10U310089938")
    print(f"Profils trouves : {resultat.get('nb_profils', 0)}")
    print()
    print("TERMINE.")
