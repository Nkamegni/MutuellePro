# -*- coding: utf-8 -*-
"""
Lot S1 de la phase site (07/10/2026) : met le code de vin-decoder-api en accord avec les
nouveaux noms (parametre_site, historique_parametre_site, no_reply_message_envoye).
Usage : sudo python3 patch_s1_node.py /root/mutuellepro-site/vin-decoder-api
Chaque fichier modifié est d'abord copié en <fichier>.avant_s1_07102026.
Rien n'est écrit si un décompte ne correspond pas à l'attendu.
"""
import os, shutil, sys

racine = sys.argv[1]
# (ancien, nouveau, nombre total attendu sur l'ensemble des fichiers ; None = au moins 1)
REMPLACEMENTS = [
    ("INSERT INTO site.no_reply_messages_envoyes (message_id,", "INSERT INTO site.no_reply_message_envoye (message_id_rfc,", 17),
    ("SELECT id, message_id, destinataire, type_message, reference_compte, date_envoi",
     "SELECT id_no_reply_message_envoye, message_id_rfc, destinataire, type_message, reference_compte, date_envoi", 1),
    ("UPDATE site.parametres_site SET valeurs = $1, date_maj = now(), modifie_par = $2 WHERE id = 1",
     "UPDATE site.parametre_site SET valeurs = $1, date_maj = now(), modifie_par = $2 WHERE id_parametre_site = 1", 1),
    ("FROM site.parametres_site WHERE id = 1", "FROM site.parametre_site WHERE id_parametre_site = 1", 3),
    ("INSERT INTO site.historique_parametres_site (utilisateur_id,", "INSERT INTO site.historique_parametre_site (id_staff,", 1),
    # reste : lectures, scripts shell, commentaires et messages
    ("no_reply_messages_envoyes", "no_reply_message_envoye", None),
    ("parametres_site", "parametre_site", None),
]

fichiers = []
for dossier, sous, noms in os.walk(racine):
    sous[:] = [s for s in sous if s not in ("node_modules", ".git") and "Sauvegardes" not in s]
    for nom in noms:
        if nom.endswith((".js", ".sh")) and ".avant_" not in nom:
            fichiers.append(os.path.join(dossier, nom))

contenus = {f: open(f, encoding="utf-8").read() for f in fichiers}
nouveaux = dict(contenus)
for ancien, nouveau, attendu in REMPLACEMENTS:
    total = sum(t.count(ancien) for t in nouveaux.values())
    if (attendu is None and total == 0 and ancien in ("no_reply_messages_envoyes",)) :
        sys.exit(f"Aucune occurrence de « {ancien} » : rien n'a été modifié.")
    if attendu is not None and total != attendu:
        sys.exit(f"« {ancien[:60]}… » : {total} occurrence(s) au lieu de {attendu}. Rien n'a été modifié.")
    nouveaux = {f: t.replace(ancien, nouveau) for f, t in nouveaux.items()}

modifies = [f for f in fichiers if nouveaux[f] != contenus[f]]
for f in modifies:
    shutil.copy2(f, f + ".avant_s1_07102026")
    open(f, "w", encoding="utf-8").write(nouveaux[f])
    print("modifié :", os.path.relpath(f, racine))
print(f"{len(modifies)} fichier(s) corrigé(s).")
