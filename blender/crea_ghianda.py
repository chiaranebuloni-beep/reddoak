"""
La ghianda della schermata di caricamento: cromata a specchio, che ruota in 3D.
Renderizza i fotogrammi di un giro completo (sfondo trasparente) e li impagina
in un'unica immagine a griglia, che il sito fa scorrere come un filmato.

    npm run ghianda

Scrive public/brand/ghianda-giro.png (griglia COLONNE x RIGHE) e ghianda.png
(un fotogramma fermo). "npm run ghianda" poi converte la griglia in WebP.
"""

import math
import os
import shutil
import tempfile

import bmesh
import bpy
import numpy as np
from mathutils import Vector

QUI = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.join(os.path.dirname(QUI), "public", "brand")
COLONNE, RIGHE, LATO = 10, 6, 400          # 60 fotogrammi da 400 px
FOTOGRAMMI = COLONNE * RIGHE

for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
scena = bpy.context.scene


def materiale(nome, rgb, ruvidita, metallo=1.0, luce=0.0):
    m = bpy.data.materials.new(nome)
    if m.node_tree is None:
        m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Metallic"].default_value = metallo
    b.inputs["Roughness"].default_value = ruvidita
    if luce:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = luce
    return m


def tornio(nome, profilo, mat, giri=220, rilievo=None):
    """Solido di rotazione: profilo = lista di (raggio, quota) dal basso verso l'alto."""
    # profilo infittito e ammorbidito (spline di Catmull-Rom)
    pts = [Vector((r, z)) for r, z in profilo]
    fitto = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        for s in range(10):
            t = s / 10
            fitto.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                                + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t))
    fitto.append(pts[-1])
    bm = bmesh.new()
    anelli = []
    for j, p in enumerate(fitto):
        anello = []
        for i in range(giri):
            a = 2 * math.pi * i / giri
            r = max(p.x, 0.0)
            if rilievo and r > 0.02:
                r += rilievo(a, j / (len(fitto) - 1))
            anello.append(bm.verts.new((r * math.cos(a), r * math.sin(a), p.y)))
        anelli.append(anello)
    uv = bm.loops.layers.uv.new("UVMap")   # u = giro attorno all'asse, v = quota: serve per stampare il logo
    quota_max = max(p.y for p in fitto) or 1.0
    for j in range(len(anelli) - 1):
        for i in range(giri):
            k = (i + 1) % giri
            f = bm.faces.new((anelli[j][i], anelli[j][k], anelli[j + 1][k], anelli[j + 1][i]))
            coord = ((i / giri, fitto[j].y / quota_max), ((i + 1) / giri, fitto[j].y / quota_max),
                     ((i + 1) / giri, fitto[j + 1].y / quota_max), (i / giri, fitto[j + 1].y / quota_max))
            for loop, c in zip(f.loops, coord):
                loop[uv].uv = c
    bm.faces.new(anelli[0][::-1])
    bm.faces.new(anelli[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0004)
    for f in bm.faces:
        f.smooth = True
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    scena.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


CROMO_CAPPELLO = materiale("Oro satinato", (1.0, 0.64, 0.22), 0.26)


def smalto_con_logo():
    """Corpo in smalto bianco lucido con la foglia Reddoak stampata davanti e dietro (come un'etichetta)."""
    m = bpy.data.materials.new("Smalto bianco con logo")
    if m.node_tree is None:
        m.use_nodes = True
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Roughness"].default_value = 0.1
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.03
    logo = bpy.data.images.load(os.path.join(QUI, "textures", "reddoak-foglia.png"))
    coord = nt.nodes.new("ShaderNodeTexCoord")
    larg_u, alt_v = 0.31, 0.31 * 1.87 / 0.72 * 409 / 610     # la foglia e' larga circa 58 cm sul "giro"
    colore_ = None
    for centro_u in (0.25, 0.75):
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1 / larg_u, 1 / alt_v, 1)
        mp.inputs["Location"].default_value = (-(centro_u - larg_u / 2) / larg_u, -(0.47 - alt_v / 2) / alt_v, 0)
        tx = nt.nodes.new("ShaderNodeTexImage")
        tx.image = logo
        tx.extension = "CLIP"
        nt.links.new(coord.outputs["UV"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], tx.inputs["Vector"])
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        nt.links.new(tx.outputs["Alpha"], mix.inputs["Factor"])
        if colore_ is None:
            mix.inputs["A"].default_value = (0.93, 0.92, 0.9, 1)
        else:
            nt.links.new(colore_, mix.inputs["A"])
        mix.inputs["B"].default_value = (0.96, 0.0, 0.012, 1)     # rosso Reddoak
        colore_ = mix.outputs["Result"]
    nt.links.new(colore_, b.inputs["Base Color"])
    return m


CROMO = smalto_con_logo()

# corpo: spalle larghe sotto il cappello, pancia piena, punta sottile in basso
corpo = tornio("Corpo", [
    (0.0, 0.0), (0.012, 0.004), (0.022, 0.03), (0.05, 0.062), (0.125, 0.125), (0.205, 0.225),
    (0.262, 0.345), (0.292, 0.47), (0.298, 0.58), (0.285, 0.66), (0.25, 0.71), (0.0, 0.72),
], CROMO)


# cappello: cupola con il bordo arrotondato e la zigrinatura a rombi (le squame)
def squame(angolo, quota):
    """Rombi in rilievo separati da solchi che salgono a spirale nei due versi."""
    forza = min(1.0, max(0.0, (quota - 0.12) / 0.12)) * min(1.0, max(0.0, (0.97 - quota) / 0.1))
    s1 = abs(math.sin(10 * angolo + 13 * quota))
    s2 = abs(math.sin(10 * angolo - 13 * quota))
    return 0.016 * forza * min(s1, s2) ** 0.45


cappello = tornio("Cappello", [
    (0.27, 0.585), (0.318, 0.588), (0.338, 0.612), (0.343, 0.65), (0.33, 0.705), (0.292, 0.765),
    (0.225, 0.818), (0.135, 0.852), (0.05, 0.866), (0.0, 0.868),
], CROMO_CAPPELLO, giri=360, rilievo=squame)

# picciolo curvo, che si assottiglia
bm = bmesh.new()
precedente = None
for i in range(15):
    t = i / 14
    centro = Vector((0.075 * t * t, 0.0, 0.85 + 0.2 * t))
    tang = Vector((0.15 * t, 0.0, 0.2)).normalized()
    lato = Vector((0, 1, 0))
    su = lato.cross(tang)
    r = 0.04 - 0.014 * t
    anello = [bm.verts.new(centro + (su * math.cos(2 * math.pi * k / 28) + lato * math.sin(2 * math.pi * k / 28)) * r)
              for k in range(28)]
    if precedente:
        for k in range(28):
            bm.faces.new((precedente[k], precedente[(k + 1) % 28], anello[(k + 1) % 28], anello[k]))
    precedente = anello
bm.faces.new(precedente)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
for f in bm.faces:
    f.smooth = len(f.verts) == 4
me = bpy.data.meshes.new("Picciolo")
bm.to_mesh(me)
bm.free()
picciolo = bpy.data.objects.new("Picciolo", me)
scena.collection.objects.link(picciolo)
me.materials.append(CROMO_CAPPELLO)

# la ghianda ruota attorno al suo centro: inclinata, gira su se stessa mentre l'asse descrive un cono
CENTRO_Z = 0.5
perno = bpy.data.objects.new("Perno", None)        # gira attorno alla verticale
inclina = bpy.data.objects.new("Inclina", None)    # tiene la ghianda piegata
trottola = bpy.data.objects.new("Trottola", None)  # la ghianda gira su se stessa
for e in (perno, inclina, trottola):
    scena.collection.objects.link(e)
inclina.parent = perno
inclina.rotation_euler = (math.radians(26), 0, 0)
trottola.parent = inclina
for ob in (corpo, cappello, picciolo):
    ob.parent = trottola
    ob.location.z -= CENTRO_Z

scena.frame_start, scena.frame_end = 1, FOTOGRAMMI
for ob, giri_ in ((perno, 1), (trottola, 1)):
    ob.rotation_euler.z = 0
    ob.keyframe_insert("rotation_euler", index=2, frame=1)
    ob.rotation_euler.z = 2 * math.pi * giri_
    ob.keyframe_insert("rotation_euler", index=2, frame=FOTOGRAMMI + 1)
    try:   # velocita' costante: il giro si chiude senza scatti
        for fc in ob.animation_data.action.fcurves:
            for k in fc.keyframe_points:
                k.interpolation = "LINEAR"
    except Exception:
        for area_tipo in ("LINEAR",):
            bpy.context.preferences.edit.keyframe_new_interpolation_type = area_tipo

# studio fotografico: ambiente rosso scuro e grandi luci bianche, che il cromo riflette
mondo = scena.world or bpy.data.worlds.new("Studio")
scena.world = mondo
if mondo.node_tree is None:
    mondo.use_nodes = True
nt = mondo.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputWorld")
bg = nt.nodes.new("ShaderNodeBackground")
bg.inputs[1].default_value = 1.0
# il classico "orizzonte" che fa leggere il cromo: chiaro sopra, scuro sotto, con un riflesso rosso dal basso
coord = nt.nodes.new("ShaderNodeTexCoord")
xyz = nt.nodes.new("ShaderNodeSeparateXYZ")
scala01 = nt.nodes.new("ShaderNodeMapRange")
scala01.inputs["From Min"].default_value = -1.0
scala01.inputs["From Max"].default_value = 1.0
rampa = nt.nodes.new("ShaderNodeValToRGB")
fermi = [(0.0, (0.5, 0.2, 0.2, 1)), (0.36, (0.3, 0.16, 0.16, 1)), (0.47, (0.1, 0.07, 0.07, 1)),
         (0.5, (0.02, 0.02, 0.025, 1)), (0.53, (0.5, 0.52, 0.56, 1)), (1.0, (0.85, 0.87, 0.9, 1))]
el = rampa.color_ramp.elements
el[0].position, el[0].color = fermi[0]
el[1].position, el[1].color = fermi[-1]
for pos, col in fermi[1:-1]:
    e = el.new(pos)
    e.color = col
nt.links.new(coord.outputs["Generated"], xyz.inputs[0])
nt.links.new(xyz.outputs["Z"], scala01.inputs["Value"])
nt.links.new(scala01.outputs["Result"], rampa.inputs["Fac"])
nt.links.new(rampa.outputs["Color"], bg.inputs[0])
nt.links.new(bg.outputs[0], out.inputs["Surface"])


def pannello(nome, loc, dim, watt, colore_luce=(1, 1, 1)):
    dati = bpy.data.lights.new(nome, "AREA")
    dati.shape = "RECTANGLE"
    dati.size, dati.size_y = dim
    dati.energy = watt
    dati.color = colore_luce
    ob = bpy.data.objects.new(nome, dati)
    scena.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y")
    return ob


pannello("Luce alta", (-1.4, -1.6, 2.6), (2.6, 1.4), 520)
pannello("Striscia destra", (2.6, -0.8, 0.5), (0.5, 3.2), 300)
pannello("Striscia sinistra", (-2.8, 0.6, -0.2), (0.35, 2.6), 160)
pannello("Controluce", (0.6, 2.8, 1.4), (2.2, 1.2), 380)
pannello("Rosso dal basso", (0.2, -1.6, -2.2), (3.0, 2.0), 60, (1.0, 0.03, 0.08))

cam_dati = bpy.data.cameras.new("Camera")
cam_dati.lens = 90
cam = bpy.data.objects.new("Camera", cam_dati)
scena.collection.objects.link(cam)
cam.location = (0.0, -3.05, 0.2)
cam.rotation_mode = "QUATERNION"
cam.rotation_quaternion = (Vector((0, 0, 0)) - Vector(cam.location)).to_track_quat("-Z", "Y")
scena.camera = cam

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
except Exception:
    scena.cycles.device = "CPU"
scena.cycles.samples = 96
scena.cycles.use_denoising = True
scena.render.use_persistent_data = True
scena.render.film_transparent = True
scena.render.resolution_x = scena.render.resolution_y = LATO
scena.render.resolution_percentage = 100
for vista in ("Khronos PBR Neutral", "Standard"):
    try:
        scena.view_settings.view_transform = vista
        break
    except Exception:
        continue
img = scena.render.image_settings
if hasattr(img, "media_type"):
    img.media_type = "IMAGE"
img.file_format = "PNG"
img.color_mode = "RGBA"
scena.render.use_file_extension = False

solo_prova = "--prova" in os.sys.argv      # un solo fotogramma, per guardare com'e'
cartella = tempfile.mkdtemp(prefix="ghianda-")
griglia = np.zeros((RIGHE * LATO, COLONNE * LATO, 4), dtype=np.float32)
for n in range(1 if solo_prova else FOTOGRAMMI):
    scena.frame_set(8 if solo_prova else n + 1)
    file = os.path.join(cartella, f"{n:03d}.png")
    scena.render.filepath = file
    bpy.ops.render.render(write_still=True)
    if n == 0:
        shutil.copy(file, os.path.join(BRAND, "ghianda.png"))
    im = bpy.data.images.load(file)
    px = np.empty(LATO * LATO * 4, dtype=np.float32)
    im.pixels.foreach_get(px)
    bpy.data.images.remove(im)
    riga, col = n // COLONNE, n % COLONNE
    y0 = (RIGHE - 1 - riga) * LATO          # in Blender la riga 0 dell'immagine e' in basso
    griglia[y0:y0 + LATO, col * LATO:(col + 1) * LATO] = px.reshape(LATO, LATO, 4)
    print(f"fotogramma {n + 1}/{FOTOGRAMMI}", flush=True)

if not solo_prova:
    foglio = bpy.data.images.new("ghianda-giro", COLONNE * LATO, RIGHE * LATO, alpha=True)
    foglio.pixels.foreach_set(griglia.ravel())
    foglio.filepath_raw = os.path.join(BRAND, "ghianda-giro.png")
    foglio.file_format = "PNG"
    foglio.save()
shutil.rmtree(cartella, ignore_errors=True)
print("Ghianda salvata in", BRAND)
