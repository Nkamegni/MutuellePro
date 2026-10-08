# -*- coding: utf-8 -*-
"""
Nettoyage du fichier Vehicules.csv (extrait agences) -- v2
=============================================================

Organisation des dossiers (confirmee le 02/08/2026) :
    C:\\MutuellePro\\backend\\VIN\\        <- fichiers CSV (source, nettoye, rapport, anomalies)
    C:\\MutuellePro\\backend\\scripts\\    <- ce script et les autres .py

Les chemins sont calcules automatiquement par rapport a l'emplacement
de ce script (VIN_DIR = dossier parent du script, puis /VIN) -- pas
besoin de modifier le code si le projet est deplace, tant que la
structure relative scripts/ + VIN/ est conservee.
"""

import sys
from pathlib import Path

import pandas as pd
import unicodedata


# ---------------------------------------------------------------------------
# Organisation des dossiers
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent          # ...\backend\scripts
BASE_DIR = SCRIPT_DIR.parent                            # ...\backend
VIN_DIR = BASE_DIR / "VIN"                               # ...\backend\VIN

FICHIER_SOURCE = VIN_DIR / "Vehicules.csv"
FICHIER_NETTOYE = VIN_DIR / "Vehicules_nettoye.csv"
FICHIER_RAPPORT = VIN_DIR / "rapport_nettoyage.txt"
FICHIER_ANOMALIES = VIN_DIR / "anomalies_nettoyage.csv"


def etape(numero, total, libelle):
    print(f"[{numero}/{total}] {libelle}", flush=True)


# ---------------------------------------------------------------------------
# Normalisation ENERGIE
# ---------------------------------------------------------------------------

MAPPING_ENERGIE = {
    "ESSENCE": "Essence", "GAS-OIL": "Diesel", "GASS-OIL": "Diesel",
    "GS-OIL": "Diesel", "DIESEL": "Diesel", "AUTRE": "Autre",
    "E": "Essence", "ES": "Essence",
}
VALEURS_A_VERIFIER_MANUELLEMENT = {"00", "0", "2"}


def normaliser_energie(valeur, genre="") -> tuple:
    if pd.isna(valeur):
        return (valeur, True)

    brut = str(valeur).strip()
    cle = brut.upper()
    genre_str = str(genre).strip().lower()

    if brut in ("0", "00") and "remorque" in genre_str:
        return ("Sans objet (remorque)", False)

    if brut in VALEURS_A_VERIFIER_MANUELLEMENT:
        return (brut, True)

    if cle in MAPPING_ENERGIE:
        return (MAPPING_ENERGIE[cle], False)

    return (brut, True)


def normaliser_genre(valeur) -> str:
    if pd.isna(valeur):
        return valeur
    brut = str(valeur).strip()
    if brut.upper() in ("V.P.", "V.P", "4X4"):
        return brut.upper()
    return brut.title()


# ---------------------------------------------------------------------------
# Traitement principal
# ---------------------------------------------------------------------------

def nettoyer_fichier(chemin_entree: Path, chemin_sortie: Path, chemin_rapport: Path,
                       chemin_anomalies: Path):
    TOTAL_ETAPES = 6

    etape(1, TOTAL_ETAPES, f"Lecture du fichier source : {chemin_entree}")
    if not chemin_entree.exists():
        print(f"  ERREUR : fichier introuvable a cet emplacement.")
        sys.exit(1)
    df = pd.read_csv(chemin_entree, encoding="ISO-8859-1", sep=None, engine="python")
    print(f"  -> {len(df)} lignes chargees.")

    etape(2, TOTAL_ETAPES, "Normalisation du champ Energie...")
    resultats = df.apply(lambda r: normaliser_energie(r["Energie"], r["Genre"]), axis=1)
    df["Energie_Normalisee"] = resultats.apply(lambda x: x[0])
    df["Energie_A_Verifier"] = resultats.apply(lambda x: x[1])
    nb_corrections_energie = (df["Energie"].astype(str).str.strip() != df["Energie_Normalisee"].astype(str).str.strip()).sum()
    print(f"  -> {nb_corrections_energie} valeurs corrigees.")

    etape(3, TOTAL_ETAPES, "Normalisation du champ Genre (casse)...")
    df["Genre_Normalise"] = df["Genre"].apply(normaliser_genre)
    nb_recasages_genre = (df["Genre"].astype(str).str.strip() != df["Genre_Normalise"].astype(str).str.strip()).sum()
    print(f"  -> {nb_recasages_genre} lignes recasees.")

    etape(4, TOTAL_ETAPES, f"Ecriture du fichier nettoye : {chemin_sortie}")
    df.to_csv(chemin_sortie, index=False, encoding="utf-8-sig")
    print(f"  -> Termine.")

    etape(5, TOTAL_ETAPES, f"Ecriture des anomalies a verifier : {chemin_anomalies}")
    a_verifier = df[df["Energie_A_Verifier"] == True]  # noqa: E712
    a_verifier[["Reference", "Marque", "Modele", "Genre", "Energie", "Puissance"]].to_csv(
        chemin_anomalies, index=False, encoding="utf-8-sig"
    )
    print(f"  -> {len(a_verifier)} ligne(s) exportee(s).")

    etape(6, TOTAL_ETAPES, f"Ecriture du rapport : {chemin_rapport}")
    with open(chemin_rapport, "w", encoding="utf-8") as f:
        f.write("RAPPORT DE NETTOYAGE -- Vehicules.csv\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Fichier source                         : {chemin_entree}\n")
        f.write(f"Lignes totales                          : {len(df)}\n")
        f.write(f"Lignes avec Energie corrigee             : {nb_corrections_energie}\n")
        f.write(f"Lignes avec Genre recase                 : {nb_recasages_genre}\n")
        f.write(f"Lignes Energie a verifier manuellement    : {len(a_verifier)}\n\n")
        if len(a_verifier) > 0:
            f.write("Detail des valeurs Energie non reconnues :\n")
            f.write(a_verifier["Energie"].value_counts().to_string())
            f.write("\n")
    print(f"  -> Termine.")

    print()
    print("=" * 60)
    print("NETTOYAGE TERMINE AVEC SUCCES")
    print("=" * 60)
    print(f"  Fichier nettoye  : {chemin_sortie}")
    print(f"  Rapport          : {chemin_rapport}")
    print(f"  Anomalies        : {chemin_anomalies}")


if __name__ == "__main__":
    entree = Path(sys.argv[1]) if len(sys.argv) > 1 else FICHIER_SOURCE
    nettoyer_fichier(entree, FICHIER_NETTOYE, FICHIER_RAPPORT, FICHIER_ANOMALIES)
