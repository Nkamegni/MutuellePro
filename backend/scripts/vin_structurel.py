# -*- coding: utf-8 -*-
"""
Décodeur VIN STRUCTUREL AUTONOME (sans appel réseau, sans base externe)
========================================================================

Ce script décode uniquement ce qui est réellement contenu dans la
STRUCTURE du VIN au sens ISO 3779/3780 :
    - Pays de fabrication          (fiable, standardisé)
    - Constructeur (WMI)           (fiable si présent dans la table)
    - Année-modèle                 (fiable, cycle standardisé)
    - Validité du VIN               (chiffre de contrôle recalculé)

CE QUE CE SCRIPT NE PEUT PAS FAIRE, ET POURQUOI :
    - Puissance moteur, carburant, nombre de places, modèle précis
    - Ces informations NE SONT PAS codées de façon standardisée dans
      le VIN. Chaque constructeur choisit librement le contenu des
      positions 4-8 (VDS). Sans accord/table du constructeur, ces
      données sont structurellement indécodables. C'est pour cela que
      NHTSA vPIC échoue aussi (erreur 8 "No detailed data available")
      sur les véhicules non homologués USA : la donnée n'existe dans
      AUCUNE base, pas seulement absente d'un algorithme.

Ce script peut néanmoins être ÉTENDU avec des tables spécifiques par
constructeur (voir section MODELE_TABLES en fin de fichier) quand ces
informations sont documentées publiquement pour une marque donnée.
"""

from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# 1. TABLE DES PAYS (position 1) — norme ISO 3780, stable
# ---------------------------------------------------------------------------

PAYS_PAR_CARACTERE = {
    "1": "États-Unis", "4": "États-Unis", "5": "États-Unis",
    "2": "Canada",
    "3": "Mexique",
    "6": "Australie",
    "7": "Nouvelle-Zélande",
    "8": "Argentine",
    "9": "Brésil",
    "A": "Afrique du Sud", "B": "Angola", "C": "Côte d'Ivoire",
    "D": "Allemagne (zone D-G réservée Afrique, rarement utilisée)",
    "J": "Japon", "K": "Corée du Sud", "L": "Chine (tous les VIN chinois commencent par L)",
    "M": "Inde/Indonésie (zone M)", "N": "Turquie", "P": "Philippines",
    "R": "Taïwan/Émirats (zone R)",
    "S": "Royaume-Uni", "T": "Suisse (zone T)",
    "U": "Roumanie/Danemark (zone U)",
    "V": "Autriche/France (zone V)",
    "W": "Allemagne",
    "X": "Russie/CEI (zone X)",
    "Y": "Belgique/Finlande/Suède (zone Y)",
    "Z": "Italie",
}

WMI_TO_PAYS_PRECIS = {
    # Table plus précise par WMI (3 premiers caractères) pour les cas
    # ambigus où le 1er caractère seul ne suffit pas
    "VF": "France", "VS": "Espagne", "VW": "Allemagne (VW)",
    "WB": "Allemagne (BMW)", "WD": "Allemagne (Mercedes-Benz)",
    "WV": "Allemagne (Volkswagen utilitaires)",
    "WP": "Allemagne (Porsche)",
    "SA": "Royaume-Uni (Land Rover/Jaguar)",
    "SB": "Royaume-Uni",
    "AH": "Afrique du Sud (Toyota/Ford/autres — voir WMI 3 caractères)",
    "ZF": "Italie (Fiat)",
    "JT": "Japon (Toyota)", "JH": "Japon (Honda)", "JN": "Japon (Nissan)",
    "JM": "Japon (Mazda)", "JS": "Japon (Suzuki)", "JA": "Japon (Isuzu)",
    "JF": "Japon (Fuji/Subaru)",
    "MR": "Thaïlande (assemblage Toyota)",
    "MM": "Thaïlande (assemblage Isuzu/Mitsubishi)",
    "KM": "Corée du Sud (Hyundai)", "KN": "Corée du Sud (Kia)",
    "LB": "Chine", "LS": "Chine", "LV": "Chine",
}


# ---------------------------------------------------------------------------
# 2. TABLE WMI -> CONSTRUCTEUR (3 caractères)
#    Non exhaustive : couvre les marques les plus courantes sur le
#    marché camerounais/africain. À compléter selon vos besoins.
# ---------------------------------------------------------------------------

WMI_CONSTRUCTEUR = {
    # Toyota
    "JTD": "Toyota (véhicule particulier, marché Japon/export)",
    "JTM": "Toyota (SUV, marché Asie-Pacifique)",
    "JTE": "Toyota (SUV/Minivan)",
    "JTG": "Toyota (Bus)",
    "JTF": "Toyota (Camion/Utilitaire)",
    "JTN": "Toyota (véhicule particulier)",
    "MR0": "Toyota (assemblé en Thaïlande, ex. Hilux/Fortuner export Afrique)",
    # Nissan
    "JN1": "Nissan (véhicule particulier)",
    "JN8": "Nissan (SUV)",
    "VSK": "Nissan (assemblé en Espagne)",
    # Mercedes-Benz
    "WDB": "Mercedes-Benz (Allemagne, gamme historique)",
    "WDD": "Mercedes-Benz (Allemagne, gamme récente)",
    "WDC": "Mercedes-Benz (SUV, ex. GLC/GLE)",
    # Land Rover
    "SAL": "Land Rover (Royaume-Uni, Solihull)",
    # Peugeot / Citroën (groupe Stellantis)
    "VF3": "Peugeot (France)",
    "VF7": "Citroën (France)",
    # Volkswagen
    "WVW": "Volkswagen (véhicule particulier)",
    "WV1": "Volkswagen (utilitaire)",
    # Hyundai / Kia (multi-origine)
    "KMH": "Hyundai (Corée du Sud)",
    "KNA": "Kia (Corée du Sud)",
    "AC5": "Hyundai (Afrique du Sud)",
    "ADD": "Hyundai (Afrique du Sud)",
    "LBE": "Hyundai — Beijing Hyundai (Chine, coentreprise)",
    # Mitsubishi (multi-origine)
    "JA3": "Mitsubishi (Japon)",
    "JA4": "Mitsubishi (Japon)",
    "JMB": "Mitsubishi (Japon — export/modèles spécialisés)",
    "JMY": "Mitsubishi (Japon — commercial/utilitaire)",
    # Suzuki
    "JS1": "Suzuki (Japon)",
    # Isuzu
    "JAA": "Isuzu (Japon, camion/pick-up)",
    # Ford
    "AFA": "Ford (Afrique du Sud)",
    "WF0": "Ford (Allemagne)",
    # Honda
    "JHM": "Honda (Japon)",
    # ---- TOYOTA, TOUTES ORIGINES ----
    # PRIORITAIRE : Toyota domine le parc camerounais, et contrairement
    # aux autres marques, son WMI varie fortement selon le PAYS DE MONTAGE
    # (pas seulement le pays d'origine de la marque). Un Hilux thaïlandais,
    # un Corolla sud-africain et une Land Cruiser japonaise ont 3 WMI
    # totalement différents bien qu'étant tous des "vraies" Toyota.
    "AHT": "Toyota — Afrique du Sud (TSAM, Prospecton/Durban, seule usine "
           "Toyota du continent africain — Hilux/Corolla/Fortuner/Land Cruiser)",
    "JTD": "Toyota — Japon (véhicule particulier)",
    "JTE": "Toyota — Japon (SUV/Minivan)",
    "JTF": "Toyota — Japon (camion/utilitaire, ex. Hilux JDM)",
    "JTG": "Toyota — Japon (bus)",
    "JTH": "Lexus — Japon (véhicule particulier)",
    "JTJ": "Lexus — Japon (SUV)",
    "JTK": "Toyota — Japon",
    "JTL": "Toyota — Japon",
    "JTM": "Toyota — Japon (SUV, marché Asie-Pacifique/export)",
    "JTN": "Toyota — Japon (véhicule particulier)",
    "MR0": "Toyota — Thaïlande (usines Ban Pho/Samrong, gamme générale)",
    "MR1": "Toyota — Thaïlande (usine Samrong, Fortuner)",
    "MR2": "Toyota — Thaïlande (usine Gateway)",
    "LTV": "Toyota — Chine (FAW Toyota, Tianjin, coentreprise)",
    "MHF": "Toyota — Indonésie (TMMIN, Karawang — Avanza/Innova/Fortuner)",
    "NMT": "Toyota — Turquie (TMMT, Sakarya — Corolla/C-HR)",
    "SB1": "Toyota — Royaume-Uni (TMUK, Burnaston — Corolla/Auris)",
    "VNK": "Toyota — France (TMMF, Onnaing-Valenciennes — Yaris)",
    "MBJ": "Toyota — Inde (TKM, Bidadi)",
    "PN1": "Toyota — Malaisie (ASSB)",
    "PN2": "Toyota — Malaisie (ASSB)",
    "4T1": "Toyota — États-Unis (Georgetown, Kentucky)",
    "4T3": "Toyota — États-Unis (Georgetown, Kentucky)",
    "5TD": "Toyota — États-Unis (TMMI, minivan/SUV)",
    "2T1": "Toyota — Canada (Cambridge/Woodstock, Ontario)",

    # Renault
    "VF1": "Renault (France)",
    "UU1": "Dacia (Roumanie, Mioveni — Sandero/Logan/Duster)",
    "UU6": "Dacia — utilitaires (Roumanie)",
    "KNM": "Renault Samsung (Corée du Sud)",

    # ---- CONSTRUCTEURS CHINOIS ----
    # Tous commencent par 'L'. Source : table WMI publique croisée avec
    # les marques chinoises confirmées présentes sur le marché camerounais
    # (BYD, Chery, Great Wall/Haval, Changan, Geely, JAC, DFSK, Foton,
    # Sinotruk — via distributeurs régionaux type Tractafric/Tiger Motors).
    # NOTE : un même constructeur a souvent PLUSIEURS WMI (une par usine/
    # gamme). Cette table n'est donc pas exhaustive par nature.
    "LA9": "BYD (Chine)",
    "LC0": "BYD (Chine)",
    "LGX": "BYD (Chine)",
    "LPE": "BYD (Chine)",
    "LGW": "Great Wall Motors / Haval (Chine)",
    "LS5": "Changan (Chine)",
    "LVV": "Chery (Chine)",
    "LVM": "Chery — véhicules utilitaires (Chine)",
    "LDN": "Chery — filiale Souest (Chine)",
    "LJ1": "JAC / Jianghuai (Chine)",
    "LVZ": "Dongfeng Socon / DFSK (Chine)",
    "LGG": "Dongfeng, usine Liuzhou (Chine)",
    "LGJ": "Dongfeng Aeolus (Chine)",
    "LGA": "Dongfeng utilitaire — camion (Chine)",
    "LGC": "Dongfeng utilitaire — bus (Chine)",
    "L6T": "Geely (Chine)",
    "LB3": "Geely (Chine)",
    "LJU": "Geely — Shanghai Maple/Englon (Chine)",
    "LPS": "Polestar (groupe Geely, Chine)",
    "LVY": "Volvo — usine Chine (groupe Geely)",
    "LYV": "Volvo — usines Chengdu/Luqiao (groupe Geely)",
    "LFB": "FAW — Jilin (Chine)",
    "LFP": "FAW (Chine)",
    "LH1": "FAW-Haima (Chine)",
    "LVA": "Foton (Chine)",
    "LVB": "Foton (Chine)",
    "LVC": "Foton (Chine)",
    "LRD": "Foton-Daimler / Auman, camions (Chine)",
    "LZK": "Sinotruk — bus (Chine)",
    "LZZ": "Sinotruk — Howo/Sitrak, camions (Chine)",
    "LJV": "Sinotruk (Chine)",
}


# ---------------------------------------------------------------------------
# 3. Algorithme de validation (chiffre de contrôle, norme NHTSA/ISO)
# ---------------------------------------------------------------------------

TRANSLITERATION = {
    "A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7, "H": 8,
    "J": 1, "K": 2, "L": 3, "M": 4, "N": 5, "P": 7, "R": 9,
    "S": 2, "T": 3, "U": 4, "V": 5, "W": 6, "X": 7, "Y": 8, "Z": 9,
}
for d in "0123456789":
    TRANSLITERATION[d] = int(d)

WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789"


def build_year_map(start_cycle_year: int = 1980) -> dict:
    mapping = {}
    for i, code in enumerate(YEAR_CODES):
        year = start_cycle_year + i
        mapping.setdefault(code, []).extend([year, year + 30])
    return mapping


YEAR_MAP = build_year_map()


def compute_check_digit(vin: str) -> Optional[str]:
    """
    Calcule le chiffre de contrôle attendu.
    Retourne None si le calcul échoue (caractère invalide) — cela
    n'indique PAS forcément un VIN invalide : les véhicules hors
    marché US/Canada n'appliquent pas toujours ce schéma.
    """
    try:
        total = sum(
            TRANSLITERATION[c.upper()] * WEIGHTS[i]
            for i, c in enumerate(vin)
        )
    except (KeyError, IndexError):
        return None
    remainder = total % 11
    return "X" if remainder == 10 else str(remainder)


# ---------------------------------------------------------------------------
# 4. Structure de résultat
# ---------------------------------------------------------------------------

@dataclass
class VinStructurel:
    vin: str
    pays_probable: str
    constructeur_wmi: str
    annees_possibles: list
    check_digit_fourni: str
    check_digit_calcule: Optional[str]
    check_digit_coherent: Optional[bool]
    code_usine: str
    numero_serie: str
    avertissements: list = field(default_factory=list)


def decoder_structure_vin(vin: str) -> VinStructurel:
    vin = vin.strip().upper()
    avertissements = []

    if len(vin) != 17:
        avertissements.append(f"Longueur non standard : {len(vin)} caractères (17 attendus)")

    wmi3 = vin[0:3] if len(vin) >= 3 else ""
    wmi2 = vin[0:2] if len(vin) >= 2 else ""
    premier_char = vin[0] if vin else ""

    # Constructeur : on cherche d'abord le WMI complet (3 car.), sinon le pays
    constructeur = WMI_CONSTRUCTEUR.get(wmi3, "Non répertorié dans la table locale")

    # Pays : priorité au WMI précis (2 car.), sinon au 1er caractère
    pays = WMI_TO_PAYS_PRECIS.get(wmi2, PAYS_PAR_CARACTERE.get(premier_char, "Inconnu"))

    year_code = vin[9] if len(vin) >= 10 else ""
    annees = sorted(set(YEAR_MAP.get(year_code, [])))

    check_fourni = vin[8] if len(vin) >= 9 else ""
    check_calcule = compute_check_digit(vin) if len(vin) == 17 else None
    check_coherent = (check_fourni == check_calcule) if check_calcule else None

    if check_coherent is False:
        avertissements.append(
            "Chiffre de contrôle incohérent : le VIN peut être mal saisi, "
            "OU (cas fréquent hors marché USA/Canada) le constructeur "
            "n'applique pas ce schéma de contrôle pour ce marché."
        )

    if constructeur == "Non répertorié dans la table locale":
        avertissements.append(
            f"WMI '{wmi3}' absent de la table locale — le constructeur n'a "
            f"pas pu être identifié. Table à compléter si ce préfixe revient "
            f"souvent dans votre portefeuille."
        )

    return VinStructurel(
        vin=vin,
        pays_probable=pays,
        constructeur_wmi=constructeur,
        annees_possibles=annees,
        check_digit_fourni=check_fourni,
        check_digit_calcule=check_calcule or "N/A",
        check_digit_coherent=check_coherent,
        code_usine=vin[10] if len(vin) >= 11 else "",
        numero_serie=vin[11:17] if len(vin) >= 17 else "",
        avertissements=avertissements,
    )


def afficher(resultat: VinStructurel) -> None:
    print(f"\n{'='*60}")
    print(f"VIN : {resultat.vin}")
    print(f"{'='*60}")
    print(f"Pays probable          : {resultat.pays_probable}")
    print(f"Constructeur (WMI)     : {resultat.constructeur_wmi}")
    print(f"Année(s)-modèle        : {resultat.annees_possibles}")
    print(f"Code usine (position 11): {resultat.code_usine}")
    print(f"N° série séquentiel    : {resultat.numero_serie}")
    print(f"Chiffre contrôle fourni/calculé : "
          f"{resultat.check_digit_fourni} / {resultat.check_digit_calcule} "
          f"({'cohérent' if resultat.check_digit_coherent else 'incohérent/N.A.'})")

    if resultat.avertissements:
        print("\nAvertissements :")
        for a in resultat.avertissements:
            print(f"  - {a}")

    print("\n[Non disponible structurellement : marque exacte du modèle,")
    print(" puissance moteur, carburant, nombre de places — voir explication")
    print(" en tête de fichier]")


# ---------------------------------------------------------------------------
# Exemple avec les VIN déjà testés dans la conversation
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    exemples = [
        "1HGCM82633A004352",   # Honda Accord
        "WDB93216310215519",   # Mercedes (échec vPIC)
        "SALLDKAS89A776476",   # Land Rover (échec vPIC)
        "1J4GL48596W123793",   # Jeep Liberty
        "LGWEF6A5XJ1123456",   # Great Wall/Haval (WMI illustratif)
        "LC0C24C50NA123456",   # BYD (WMI illustratif)
        "LVVDB11B4EE123456",   # Chery (WMI illustratif)
        "LJ11EAE47M0123456",   # JAC (WMI illustratif)
        "AHTFR22G802123456",   # Toyota Afrique du Sud (WMI illustratif)
        "MR0FZ29G701123456",   # Toyota Thaïlande (WMI illustratif)
        "UU1SD11C123456789",   # Dacia Roumanie (WMI illustratif)
        "AC5DB51CGJ0123456",   # Hyundai Afrique du Sud (WMI illustratif)
    ]
    for vin in exemples:
        afficher(decoder_structure_vin(vin))
