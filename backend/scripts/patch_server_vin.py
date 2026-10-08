# -*- coding: utf-8 -*-
"""
Correctif de vin-decoder-api/server.js — normalisation du VIN saisi (lot 1, 07/10/2026).
Même règle que la base (vpic.decode_vin_flat) et le script d'import :
  majuscules ; remplissage de fin (_ et espaces) retiré ;
  frappe AZERTY sans majuscule & é " ' ( è _ ç à -> 1 2 3 4 5 7 8 9 0 ;
  I -> 1, O -> 0, Q -> 0 ; apostrophe en tête laissée telle quelle.

Usage (sur le VPS) :
  sudo python3 patch_server_vin.py /root/mutuellepro-site/vin-decoder-api/server.js
Une copie <fichier>.avant_lot1_07102026 est créée avant toute modification.
"""
import shutil
import sys

chemin = sys.argv[1]
texte = open(chemin, encoding="utf-8").read()

if "function normaliserVin(" in texte:
    sys.exit("Déjà corrigé : normaliserVin est présent, rien à faire.")

FONCTION = r'''// Normalisation du VIN saisi (lot 1, 07/10/2026) — identique à la base
// (vpic.decode_vin_flat) et au script d'import systeme_catalogue_vehicules.py.
const CORRECTION_VIN = { '&': '1', 'É': '2', '"': '3', "'": '4', '(': '5', 'È': '7', '_': '8', 'Ç': '9', 'À': '0', I: '1', O: '0', Q: '0' };
function normaliserVin(valeur) {
  const vin = String(valeur || '').trim().toUpperCase().replace(/[_ ]+$/, '');
  if (vin.startsWith("'")) return vin; // préfixe texte d'Excel : laissé tel quel
  return vin.replace(/[&É"'(È_ÇÀIOQ]/g, (c) => CORRECTION_VIN[c]);
}

'''

ancre = "app.get('/api/vin/recherche'"
remplacements = [
    ("req.params.vin.trim().toUpperCase()", "normaliserVin(req.params.vin)", 2),
    ("req.params.vinPartiel.trim().toUpperCase()", "normaliserVin(req.params.vinPartiel)", 1),
]

if texte.count(ancre) != 1:
    sys.exit(f"Ancre introuvable ou multiple : {ancre}")
for avant, apres, attendu in remplacements:
    trouve = texte.count(avant)
    if trouve != attendu:
        sys.exit(f"Attendu {attendu} occurrence(s) de « {avant} », trouvé {trouve} : rien n'a été modifié.")

shutil.copy2(chemin, chemin + ".avant_lot1_07102026")
texte = texte.replace(ancre, FONCTION + ancre, 1)
for avant, apres, _ in remplacements:
    texte = texte.replace(avant, apres)
open(chemin, "w", encoding="utf-8").write(texte)
print("server.js corrigé : normaliserVin ajoutée, 3 lectures du VIN normalisées.")
