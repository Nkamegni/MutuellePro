# -*- coding: utf-8 -*-
"""
Export des anomalies journalisees (catalogue.anomalie_fusion) vers CSV,
pour revue manuelle. Trie par gravite (bloquant en premier).
"""

import os
import sys
from pathlib import Path

import pandas as pd
import psycopg2

SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parent
VIN_DIR = BASE_DIR / "VIN"
FICHIER_SORTIE = VIN_DIR / "anomalies_fusion_export.csv"

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "vpiclist",
    "user": "postgres",
    "password": os.environ.get("PGPASSWORD", ""),   # jamais en clair dans le code
}
SCHEMA = "catalogue"


def etape(numero, total, libelle):
    print(f"[{numero}/{total}] {libelle}", flush=True)


def exporter():
    TOTAL_ETAPES = 3

    etape(1, TOTAL_ETAPES, f"Connexion a PostgreSQL (base='{DB_CONFIG['dbname']}')...")
    conn = psycopg2.connect(**DB_CONFIG)
    print("  -> CONNEXION REUSSIE.")

    etape(2, TOTAL_ETAPES, "Extraction des anomalies (triees par gravite)...")
    ordre_gravite = "CASE gravite WHEN 'bloquant' THEN 0 WHEN 'avertissement' THEN 1 ELSE 2 END"
    requete = f"""
        SELECT vin, site_origine, id_reference, champ, valeur_catalogue, valeur_nouvelle,
               gravite, code_erreur, message, statut, date_detection
        FROM {SCHEMA}.anomalie_fusion
        ORDER BY {ordre_gravite}, date_detection DESC
    """
    df = pd.read_sql(requete, conn)
    conn.close()
    print(f"  -> {len(df)} anomalie(s) recuperee(s).")

    print("\nRepartition par gravite :")
    print(df["gravite"].value_counts().to_string())
    print("\nRepartition par code d'erreur :")
    print(df["code_erreur"].value_counts().to_string())

    etape(3, TOTAL_ETAPES, f"Ecriture du fichier : {FICHIER_SORTIE}")
    df.to_csv(FICHIER_SORTIE, index=False, encoding="utf-8-sig")
    print("  -> Termine.")

    print()
    print("=" * 60)
    print("EXPORT TERMINE AVEC SUCCES")
    print("=" * 60)
    print(f"  Fichier : {FICHIER_SORTIE}")


if __name__ == "__main__":
    exporter()
