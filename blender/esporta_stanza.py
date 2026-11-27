"""
Porta la hall da Blender al sito (three.js). Da lanciare ogni volta che si
modifica stanza.blend:

    npm run stanza:esporta      (qualita' piena: tutte le viste, circa un'ora)
    npm run stanza:bozza        (veloce e sgranata, per provare: pochi minuti)
    npm run stanza:punti        (solo hotspot, camere e modello 3D: non rifa' i render)

Per rifare una sola vista si aggiunge il suo nome, per esempio:
    npm run stanza:esporta -- --vista hall
    npm run stanza:esporta -- --vista relatia

Scrive in public/stanza/:
  panorama.jpg          foto a 360 gradi vista da "Camera360" (la hall, vista d'insieme)
  panorama-4096.jpg     la stessa, piu' leggera, per i telefoni
  panorama-<id>.jpg     foto a 360 gradi da vicino, una per ogni camera "Camera360_<id>"
  stanza.glb            il modello 3D vero, per la modalita' "3D dal vivo"
  cielo.jpg             il cielo con la citta', sfondo del "3D dal vivo"
  stanza.json           camere, viste e punti cliccabili (Empty "HOTSPOT_...")
"""

import json
import math
import os
import sys
import time

import bpy
from mathutils import Vector

argomenti = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
BOZZA = "--bozza" in argomenti
SOLO_DATI = "--solo-dati" in argomenti   # aggiorna hotspot, camere e modello senza rifare le foto
SOLO_VISTA = argomenti[argomenti.index("--vista") + 1] if "--vista" in argomenti else None

QUI = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(os.path.dirname(QUI), "public", "stanza")
os.makedirs(DEST, exist_ok=True)
PERCORSO_JSON = os.path.join(DEST, "stanza.json")

scena = bpy.context.scene


def tre(v):
    """Coordinate Blender (Z in alto) -> coordinate three.js (Y in alto)."""
    return [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]


def dati_camera(cam):
    bpy.context.view_layer.update()
    avanti = (cam.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
    if abs(avanti.z) > 0.02:
        print(f"ATTENZIONE: {cam.name} non e' in piano, il panorama sul sito risultera' storto.")
    # direzione verso cui guarda la camera, come rotazione attorno all'asse verticale di three.js
    return {"posizione": tre(cam.matrix_world.translation), "yaw": round(math.atan2(-avanti.x, avanti.y), 5)}, avanti


# ---------------------------------------------------------------- camere: la vista d'insieme e quelle da vicino
cam = scena.objects.get("Camera360")
if cam is None:
    raise SystemExit('ERRORE: manca la camera panoramica "Camera360" nella scena.')
vicine = sorted((o for o in scena.objects if o.type == "CAMERA" and o.name.startswith("Camera360_")), key=lambda o: o.name)
for c in [cam] + vicine:
    c.data.type = "PANO"
    try:
        c.data.panorama_type = "EQUIRECTANGULAR"
    except Exception:
        c.data.cycles.panorama_type = "EQUIRECTANGULAR"
camera_hall, avanti = dati_camera(cam)
pos_cam = cam.matrix_world.translation.copy()
# Limite dello sguardo sul sito: l'angolo (a destra e a sinistra) oltre il quale non si deve vedere niente.
# Senza la proprieta' "sguardo_bordo_gradi" sulla camera ci si gira a 360 gradi.
camera_hall["sguardoBordo"] = round(math.radians(float(cam["sguardo_bordo_gradi"])), 5) if cam.get("sguardo_bordo_gradi") else None

# ---------------------------------------------------------------- hotspot
hotspot = []
for ob in scena.objects:
    if not ob.name.upper().startswith("HOTSPOT_"):
        continue
    ident = ob.name[len("HOTSPOT_"):].split(".")[0].strip().lower()
    p = ob.matrix_world.translation
    d = p - pos_cam
    orario = math.atan2(d.x * avanti.y - d.y * avanti.x, d.x * avanti.x + d.y * avanti.y) % (2 * math.pi)
    hotspot.append({"id": ident, "titolo": str(ob.get("titolo", ident)), "posizione": tre(p), "_ordine": orario})
if camera_hall["sguardoBordo"]:   # vista frontale: da sinistra a destra, come li vede chi guarda
    for h in hotspot:
        h["_ordine"] = (h["_ordine"] + math.pi) % (2 * math.pi)
hotspot.sort(key=lambda h: h["_ordine"])
for h in hotspot:
    del h["_ordine"]
print(f"Hotspot trovati: {[h['id'] for h in hotspot]}")

# ---------------------------------------------------------------- schermi LED
# I quattro angoli di ogni schermo (oggetti che si chiamano "... · schermo"): il sito ci disegna sopra
# il contenuto animato, cosi' gli schermi "vivono" anche dentro la foto a 360 gradi.
schermi = []
for ob in scena.objects:
    if ob.type == "MESH" and ob.name.endswith("· schermo") and len(ob.data.vertices) == 4:
        padre = ob.parent
        ident = padre.name.split("_", 2)[2] if padre and padre.name.startswith("ANGOLO_") else ob.name
        # ordine: basso-sinistra, basso-destra, alto-destra, alto-sinistra (visto da davanti)
        schermi.append({"id": ident, "angoli": [tre(ob.matrix_world @ v.co) for v in ob.data.vertices]})
print(f"Schermi trovati: {[s_['id'] for s_ in schermi]}")
print(f"Viste da vicino: {[c.name[len('Camera360_'):] for c in vicine]}")

# ---------------------------------------------------------------- modello glb
percorso_glb = os.path.join(DEST, "stanza.glb")
voluti = dict(
    filepath=percorso_glb,
    export_format="GLB",
    export_apply=False,         # cosi' gli oggetti ripetuti (piante, poltrone) pesano una volta sola
    export_yup=True,
    export_lights=True,
    export_cameras=False,
    export_extras=True,
    use_visible=False,          # anche cio' che e' nascosto nella vista (il soffitto)
    use_renderable=True,        # ma solo cio' che compare nel render
    export_animations=True,
)
disponibili = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
# gli oggetti "solo_foto" (alberi pesantissimi) restano fuori dal modello del 3D dal vivo
solo_foto = [o for o in scena.objects if o.get("solo_foto") and not o.hide_render]
for o in solo_foto:
    o.hide_render = True
try:
    bpy.ops.export_scene.gltf(**{k: v for k, v in voluti.items() if k in disponibili})
finally:
    for o in solo_foto:
        o.hide_render = False
print(f"Modello: {percorso_glb} ({os.path.getsize(percorso_glb) / 1e6:.1f} MB)")

# ---------------------------------------------------------------- cielo per il 3D dal vivo
# Se il cielo e' una foto a 360 gradi (HDR) e accanto c'e' la stessa foto in JPG, la copio nel sito:
# nel "3D dal vivo" fa da sfondo, cosi' dalle vetrate si vede la stessa citta' della foto.
cielo_foto = None
try:
    nodi = scena.world.node_tree.nodes
    foto = next(n for n in nodi if n.type == "TEX_ENVIRONMENT" and n.image)
    giro = next((n.inputs["Rotation"].default_value[2] for n in nodi if n.type == "MAPPING"), 0.0)
    jpg = os.path.splitext(bpy.path.abspath(foto.image.filepath))[0] + ".jpg"
    if os.path.exists(jpg):
        im = bpy.data.images.load(jpg)
        im.scale(4096, 2048)
        im.filepath_raw = os.path.join(DEST, "cielo.jpg")
        im.file_format = "JPEG"
        im.save(quality=86)
        bpy.data.images.remove(im)
        cielo_foto = {"file": "cielo.jpg", "rotazione": round(giro, 5)}
except Exception as e:
    print("Cielo fotografico non esportato:", e)

# ---------------------------------------------------------------- quello che c'era gia' nel sito
vecchi = {}
if os.path.exists(PERCORSO_JSON):
    with open(PERCORSO_JSON, encoding="utf-8") as f:
        vecchi = json.load(f)
dati = {
    "versione": int(time.time()),
    "bozza": BOZZA if not SOLO_DATI else vecchi.get("bozza", False),
    "camera": camera_hall,
    "panorama": vecchi.get("panorama"),
    "modello": "stanza.glb",
    "cielo": (scena.world.get("cielo") if scena.world else None) or "#d9d0c4",
    "cieloFoto": cielo_foto,
    "hotspot": hotspot,
    "schermi": schermi,
    "momenti": vecchi.get("momenti", {}),
    "viste": {},
}
for c in vicine:
    ident = c.name[len("Camera360_"):]
    dati["viste"][ident] = {"camera": dati_camera(c)[0], "panorama": (vecchi.get("viste", {}).get(ident) or {}).get("panorama")}


def salva():
    with open(PERCORSO_JSON, "w", encoding="utf-8") as f:
        json.dump(dati, f, ensure_ascii=False, indent=2)


if SOLO_DATI:
    if not dati["panorama"]:
        raise SystemExit("ERRORE: non c'e' ancora un panorama. Lancia prima: npm run stanza:esporta")
    salva()
    print("Fatto: hotspot, camere e modello aggiornati, foto lasciate com'erano.")
    raise SystemExit(0)

# ---------------------------------------------------------------- foto a 360 gradi
scena.render.engine = "CYCLES"
try:
    pref = bpy.context.preferences.addons["cycles"].preferences
    pref.compute_device_type = "METAL"
    try:
        pref.refresh_devices()
    except Exception:
        pref.get_devices()
    for d in pref.devices:
        d.use = True
    scena.cycles.device = "GPU"
    print("Render con:", [d.name for d in pref.devices if d.use])
except Exception as e:
    scena.cycles.device = "CPU"
    print("Scheda grafica non disponibile, uso il processore:", e)

# Larghezza della foto a 360 gradi. Engine usa 5760, ma sugli schermi ad alta densità (Mac, telefoni) risultava
# morbida: a 8192 un punto della foto corrisponde circa a un punto dello schermo. È anche il massimo che le
# schede grafiche comuni accettano; chi non ci arriva riceve la copia a 4096.
LARG_HALL = 8192
if BOZZA:
    scena.cycles.samples = 24
scena.render.resolution_percentage = 100
scena.cycles.use_denoising = True
# pulizia del rumore che non impasta i materiali: guarda anche colore e forma delle superfici
for nome, valore in (("denoiser", "OPENIMAGEDENOISE"), ("denoising_input_passes", "RGB_ALBEDO_NORMAL"),
                     ("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
    try:
        setattr(scena.cycles, nome, valore)
    except Exception as e:
        print("Impostazione non disponibile:", nome, e)
if not BOZZA:
    scena.cycles.filter_width = 1.2         # bordi un po' più netti (il valore solito è 1,5)
scena.render.use_persistent_data = True     # tra una vista e l'altra non ricarica la scena
img_set = scena.render.image_settings
if hasattr(img_set, "media_type"):
    img_set.media_type = "IMAGE"
img_set.file_format = "JPEG"
img_set.color_mode = "RGB"
img_set.quality = 92
scena.render.use_file_extension = False


def fotografa(camera, nome_file, larghezza, leggero=None):
    """Rende la foto a 360 gradi vista da una camera. leggero = nome della copia piccola per i telefoni."""
    scena.camera = camera
    scena.render.resolution_x, scena.render.resolution_y = larghezza, larghezza // 2
    percorso = os.path.join(DEST, nome_file)
    scena.render.filepath = percorso
    inizio = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"Foto {nome_file}: {time.time() - inizio:.0f} s", flush=True)
    if leggero and larghezza > 4096:
        try:
            im = bpy.data.images.load(percorso)
            im.scale(4096, 2048)
            im.filepath_raw = os.path.join(DEST, leggero)
            im.file_format = "JPEG"
            im.save(quality=88)
            bpy.data.images.remove(im)
        except Exception as e:
            print("Copia leggera non riuscita:", e)
            leggero = None
    else:
        leggero = None
    return {"file": nome_file, "leggero": leggero, "larghezza": larghezza, "altezza": larghezza // 2}


if SOLO_VISTA in (None, "hall"):
    dati["panorama"] = fotografa(cam, "panorama.jpg", 2048 if BOZZA else LARG_HALL, "panorama-4096.jpg")
    salva()   # si salva a ogni foto: se il render si interrompe, quelle fatte restano
for c in vicine:
    ident = c.name[len("Camera360_"):]
    if SOLO_VISTA in (None, ident):
        dati["viste"][ident]["panorama"] = fotografa(c, f"panorama-{ident}.jpg", 2048 if BOZZA else 4096)
        salva()
# ---------------------------------------------------------------- la stessa stanza in altri momenti della giornata
# Il sito mostra la foto giusta secondo l'ora di chi guarda: di giorno "panorama.jpg", di sera "panorama-sera.jpg".
# Qui si cambia solo la luce: il cielo diventa scuro e blu, il sole si spegne, le luci dell'interno contano di piu'.
MOMENTI = {
    "sera": dict(vista=0.16, luce=0.07, tinta=(0.26, 0.4, 1.0), sole=0.0, luci=1.5, accese={"Luce anello": 1.5}),
}


def applica_momento(m):
    nt = scena.world.node_tree
    miscela = next(n for n in nt.nodes if n.type == "MIX_SHADER")
    for presa, forza in ((1, m["luce"]), (2, m["vista"])):     # 1 = il cielo che illumina, 2 = il cielo che si vede
        sfondo = miscela.inputs[presa].links[0].from_node
        sfondo.inputs[1].default_value = forza
        if sfondo.inputs[0].links:                              # tinge la foto del cielo
            origine = sfondo.inputs[0].links[0].from_socket
            tinta = nt.nodes.new("ShaderNodeMix")
            tinta.data_type = "RGBA"
            tinta.blend_type = "MULTIPLY"
            tinta.inputs[0].default_value = 1.0
            nt.links.new(origine, tinta.inputs[6])
            tinta.inputs[7].default_value = (*m["tinta"], 1.0)
            nt.links.new(tinta.outputs[2], sfondo.inputs[0])
    for luce in bpy.data.lights:
        luce.energy = m["sole"] if luce.type == "SUN" else luce.energy * m["luci"]
    for nome, quanto in m.get("accese", {}).items():
        mat = bpy.data.materials.get(nome)
        if mat and mat.node_tree:
            for n in mat.node_tree.nodes:
                if n.type == "BSDF_PRINCIPLED":
                    n.inputs["Emission Strength"].default_value *= quanto


for nome, m in MOMENTI.items():
    if SOLO_VISTA in (None, nome):
        applica_momento(m)
        dati["momenti"][nome] = fotografa(cam, f"panorama-{nome}.jpg", 2048 if BOZZA else LARG_HALL, f"panorama-{nome}-4096.jpg")
        salva()

if not dati["panorama"]:
    raise SystemExit("ERRORE: manca ancora la vista d'insieme. Lancia: npm run stanza:esporta -- --vista hall")
salva()
print("Fatto: public/stanza/ aggiornata.")
