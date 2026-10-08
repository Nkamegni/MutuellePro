# -*- coding: utf-8 -*-
"""
Tri des anomalies journalisees (anomalies_fusion_export.csv) en 3
categories, pour prioriser la revue manuelle :

    1. FAUTES DE FRAPPE PROBABLES (champ Marque, forte similarite
       textuelle avec la valeur attendue) -- basse priorite, correction
       en masse possible.
    2. VRAIES DIVERGENCES A EXAMINER (champ Marque, faible similarite --
       marques reellement differentes) -- priorite reelle.
    3. AUTRES ANOMALIES (Energie, TailleVIN, Reference...) -- ne se
       preterent pas au meme heuristique, a verifier au cas par cas.

Entree  : VIN\\anomalies_fusion_export.csv (produit par exporter_anomalies.py)
Sorties : VIN\\anomalies_1_fautes_frappe.csv
          VIN\\anomalies_2_vraies_divergences.csv
          VIN\\anomalies_3_autres.csv
"""

import sys
import difflib
from pathlib import Path

import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parent
VIN_DIR = BASE_DIR / "VIN"

FICHIER_ENTREE = VIN_DIR / "anomalies_fusion_export.csv"
FICHIER_TYPOS = VIN_DIR / "anomalies_1_fautes_frappe.csv"
FICHIER_DIVERGENCES = VIN_DIR / "anomalies_2_vraies_divergences.csv"
FICHIER_AUTRES = VIN_DIR / "anomalies_3_autres.csv"

SEUIL_SIMILARITE = 0.6   # en-dessous : consideree comme vraie divergence


def etape(numero, total, libelle):
    print(f"[{numero}/{total}] {libelle}", flush=True)


def extraire_marque_attendue(valeur_catalogue: str) -> str:
    """
    valeur_catalogue peut prendre 2 formes selon l'origine de l'alerte :
      - Texte de la table WMI curatee, ex: "Toyota — Japon (WMI...)"
      - Liste de marques du portefeuille separees par '|', ex: "TOYOTA|NISSAN"
    On extrait dans les 2 cas le nom de marque principal, pour la
    comparaison de similarite.
    """
    if pd.isna(valeur_catalogue):
        return ""
    texte = str(valeur_catalogue)
    if "|" in texte:
        return texte.split("|")[0].strip()
    return texte.split("(")[0].split("\u2014")[0].strip()


def similarite(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, str(a).upper(), str(b).upper()).ratio()


def trier():
    TOTAL_ETAPES = 4

    etape(1, TOTAL_ETAPES, f"Lecture de : {FICHIER_ENTREE}")
    if not FICHIER_ENTREE.exists():
        print("  ERREUR : fichier introuvable. Lancez d'abord exporter_anomalies.py.")
        sys.exit(1)
    df = pd.read_csv(FICHIER_ENTREE, encoding="utf-8-sig")
    print(f"  -> {len(df)} anomalie(s) chargee(s).")

    etape(2, TOTAL_ETAPES, "Classification des anomalies de type Marque...")
    marque_mask = df["champ"] == "Marque"
    df_marque = df[marque_mask].copy()
    df_autres = df[~marque_mask].copy()

    df_marque["marque_attendue"] = df_marque["valeur_catalogue"].apply(extraire_marque_attendue)
    df_marque["similarite"] = df_marque.apply(
        lambda r: similarite(r["marque_attendue"], r["valeur_nouvelle"]), axis=1
    )

    fautes_frappe = df_marque[df_marque["similarite"] >= SEUIL_SIMILARITE].sort_values(
        "similarite", ascending=False
    )
    vraies_divergences = df_marque[df_marque["similarite"] < SEUIL_SIMILARITE].sort_values(
        "similarite"
    )
    print(f"  -> {len(fautes_frappe)} faute(s) de frappe probable(s) "
          f"(similarite >= {int(SEUIL_SIMILARITE*100)}%)")
    print(f"  -> {len(vraies_divergences)} vraie(s) divergence(s) a examiner")
    print(f"  -> {len(df_autres)} autre(s) anomalie(s) (Energie, TailleVIN, Reference...)")

    etape(3, TOTAL_ETAPES, "Ecriture des 3 fichiers de sortie...")
    fautes_frappe.to_csv(FICHIER_TYPOS, index=False, encoding="utf-8-sig")
    vraies_divergences.to_csv(FICHIER_DIVERGENCES, index=False, encoding="utf-8-sig")
    df_autres.to_csv(FICHIER_AUTRES, index=False, encoding="utf-8-sig")
    print("  -> Termine.")

    etape(4, TOTAL_ETAPES, "Resume par gravite (vraies divergences uniquement)...")
    if len(vraies_divergences) > 0:
        print(vraies_divergences["gravite"].value_counts().to_string())

    print()
    print("=" * 60)
    print("TRI TERMINE AVEC SUCCES")
    print("=" * 60)
    print(f"  Basse priorite (fautes de frappe)  : {FICHIER_TYPOS}")
    print(f"  PRIORITE REELLE (a examiner)        : {FICHIER_DIVERGENCES}")
    print(f"  Autres champs (Energie, etc.)        : {FICHIER_AUTRES}")


if __name__ == "__main__":
    trier()
