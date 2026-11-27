"""
Scarica da Poly Haven (polyhaven.com, licenza CC0: uso libero) il materiale
fotografato dal vero che rende la stanza realistica: il cielo a 360 gradi con
la citta', i materiali (pietra, intonaco, legno, tessuto) e gli arredi.

    python3 blender/scarica_risorse.py

Scrive in blender/risorse/ e salta cio' che c'e' gia'. Serve una volta sola.
"""

import json
import os
import sys
import urllib.request

QUI = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(QUI, "risorse")
API = "https://api.polyhaven.com/files/"
AGENTE = {"User-Agent": "asset-fetch/1.0"}

CIELO = ("canary_wharf", "8k")
MATERIALI = {            # nome Poly Haven -> risoluzione
    "marble_01": "2k",               # pavimento a grandi lastre di pietra chiara
    "painted_plaster_wall": "2k",    # pareti e soffitto
    "oak_veneer_01": "2k",           # rivestimenti in rovere
    "poly_wool_herringbone": "2k",   # tessuto di divani e tappeti
    "concrete_floor_02": "2k",       # fioriere
}
MAPPE = {"Diffuse": "diff", "nor_gl": "nor", "Rough": "rough"}
MODELLI = {
    "modern_arm_chair_01": "1k",
    "mid_century_lounge_chair": "1k",
    "coffee_table_round_01": "1k",
    "modern_coffee_table_01": "1k",
    "side_table_01": "1k",
    "potted_plant_02": "1k",
    "potted_plant_01": "1k",
    "potted_plant_04": "1k",
    "tree_small_02": "1k",
    "modern_ceiling_lamp_01": "1k",
    "ceramic_vase_01": "1k",
    "ceramic_vase_03": "1k",
}

totale = 0


def leggi(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=AGENTE), timeout=60) as r:
        return r.read()


def scarica(url, percorso, dimensione=None):
    global totale
    os.makedirs(os.path.dirname(percorso), exist_ok=True)
    if os.path.exists(percorso) and (dimensione is None or os.path.getsize(percorso) == dimensione):
        return
    dati = leggi(url)
    with open(percorso + ".parte", "wb") as f:
        f.write(dati)
    os.replace(percorso + ".parte", percorso)
    totale += len(dati)
    print(f"  {os.path.relpath(percorso, DEST)}  ({len(dati) / 1e6:.1f} MB)")


def elenco(nome):
    return json.loads(leggi(API + nome))


print("Cielo")
f = elenco(CIELO[0])["hdri"][CIELO[1]]["hdr"]
scarica(f["url"], os.path.join(DEST, "cielo", CIELO[0] + ".hdr"), f.get("size"))
f = elenco(CIELO[0])["tonemapped"]   # la stessa foto in JPG: e' lo sfondo delle finestre nel "3D dal vivo"
scarica(f["url"], os.path.join(DEST, "cielo", CIELO[0] + ".jpg"), f.get("size"))

print("Materiali")
for nome, ris in MATERIALI.items():
    files = elenco(nome)
    for mappa, sigla in MAPPE.items():
        if mappa not in files:
            print(f"  ({nome}: manca la mappa {mappa})")
            continue
        f = files[mappa][ris]["jpg"]
        scarica(f["url"], os.path.join(DEST, "materiali", nome, f"{sigla}.jpg"), f.get("size"))

print("Modelli")
for nome, ris in MODELLI.items():
    try:
        g = elenco(nome)["gltf"][ris]["gltf"]
    except Exception as e:
        print(f"  ({nome}: non disponibile: {e})")
        continue
    cartella = os.path.join(DEST, "modelli", nome)
    scarica(g["url"], os.path.join(cartella, nome + ".gltf"), g.get("size"))
    for rel, info in g.get("include", {}).items():
        scarica(info["url"], os.path.join(cartella, rel), info.get("size"))

print(f"Fatto: scaricati {totale / 1e6:.0f} MB in {DEST}")
sys.exit(0)
