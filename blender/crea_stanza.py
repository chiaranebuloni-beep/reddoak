"""
Crea da zero "Il quartier generale", il grande salone della sede Reddoak
(vista frontale: i 5 progetti ad arco davanti a chi entra), in versione FOTOGRAFICA (materiali, arredi e cielo veri) e la salva in
blender/stanza.blend.

    npm run stanza:crea

Prima servono, una volta sola:
    python3 blender/scarica_risorse.py     (cielo, materiali e arredi da Poly Haven)
    node blender/cattura_schermate.mjs     (foto dei siti veri dei progetti)
    node blender/crea_schermi.mjs          (contenuto dei 5 grandi schermi)

ATTENZIONE: riscrive stanza.blend. Dopo aver modificato la stanza a mano in
Blender NON rilanciare questo script (perderesti le modifiche): usa solo
"npm run stanza:esporta".

Regole che l'esportazione verso three.js si aspetta (vedi esporta_stanza.py):
  - la camera a 360 gradi si chiama "Camera360" e sta al centro della stanza
  - ogni punto cliccabile e' un Empty il cui nome inizia con "HOTSPOT_"
  - gli oggetti con la proprieta' "solo_foto" (gli alberi, pesantissimi) finiscono
    nella foto a 360 gradi ma non nel modello del "3D dal vivo"
"""

import math
import os
import random

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

QUI = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(QUI, "textures")
RIS = os.path.join(QUI, "risorse")
USCITA = os.path.join(QUI, "stanza.blend")

# ---------------------------------------------------------------- misure (metri, tutto in scala reale)
# Vista frontale: chi guarda sta vicino all'ingresso e ha davanti i 5 progetti disposti ad arco.
ALTEZZA = 14.0      # altezza del salone: e' questo che lo fa sembrare grande
OCCHI = 1.6         # altezza della camera
R_ARCO = 16.5       # distanza del muro di fondo (ad arco) da chi guarda
PASSO = 36.0        # gradi tra uno schermo e il successivo: quasi 10 metri da centro a centro
SETTO = 7.0         # larghezza del muro pieno dietro ogni schermo: ai lati ci sono le vetrate
DIST_TOTEM = 0.8    # distanza del totem dal muro di fondo
SCHERMO_L, SCHERMO_H = 5.6, 8.96   # misura di ogni schermo: 5,6 metri per 9: riempiono la vista
ZOCCOLO = 1.2       # altezza da terra del bordo basso dello schermo (i salottini non lo coprono)
Z_ROVERE = 10.8      # da qui in su il muro di fondo e' rivestito in rovere, con il logo Reddoak
SGUARDO_BORDO = 87.0   # limite di cio' che si puo' vedere girando lo sguardo (gradi per lato)
FONDO_Y = -7.0      # la parete d'ingresso, alle spalle di chi guarda
R_LUCERNARIO = 6.0
VETRO_ALT, SPESSORE_MURO = 12.6, 0.4

ROSSO_REDDOAK = "#FB0020"
CIELO = "#C3D4E6"       # sfondo del "3D dal vivo" (nella foto c'e' il cielo vero)
ROT_CIELO = 186.0       # gira il panorama della citta' attorno alla stanza (gradi)
LUCE_CIELO = 1.3        # quanto il cielo illumina la stanza
VISTA_CIELO = 0.8       # quanto e' luminoso il cielo che si vede dalle vetrate

# I 5 progetti, da sinistra a destra come li vede chi entra (quello al centro e' proprio di fronte).
PROGETTI = [
    dict(id="quiz-patente", nome="Quiz Patente", colore="#F39A2E"),
    dict(id="mypushop", nome="myPushop", colore="#EB255A"),
    dict(id="meraviglia", nome="meravigliä", colore="#247DFF"),      # al centro, di fronte a chi entra
    dict(id="relatia", nome="Relatia", colore="#6A3DF0"),
    dict(id="mister-lavaggio", nome="Mister Lavaggio", colore="#2282C0"),
]


# ================================================================ utilita'
def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def colore(hex_):
    h = hex_.lstrip("#")
    return (lin(int(h[0:2], 16)), lin(int(h[2:4], 16)), lin(int(h[4:6], 16)), 1.0)


def imposta(nodo, nome, valore):
    if nome in nodo.inputs:
        nodo.inputs[nome].default_value = valore


def carica(percorso, dati=False):
    """Carica un'immagine dal disco (una volta sola). dati=True per le mappe che non sono colori."""
    img = bpy.data.images.load(percorso, check_existing=True)
    if dati:
        img.colorspace_settings.name = "Non-Color"
    return img


def variante(origine, destinazione, funzione):
    """Copia modificata di un'immagine (es. l'intonaco schiarito). funzione lavora sui colori 0-1."""
    im = bpy.data.images.load(origine)
    w, h = im.size
    px = np.empty(w * h * 4, dtype=np.float32)
    im.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    px[..., :3] = np.clip(funzione(px[..., :3]), 0, 1)
    px[..., 3] = 1.0
    out = bpy.data.images.new("variante", w, h, alpha=False)
    out.pixels.foreach_set(px.ravel())
    out.filepath_raw = destinazione
    out.file_format = "JPEG"
    out.save()
    bpy.data.images.remove(out)
    bpy.data.images.remove(im)
    return destinazione


_materiali = {}


def nuovo_materiale(nome):
    m = bpy.data.materials.new(nome)
    if m.node_tree is None:
        m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (320, 0)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m, nt, b


def materiale(nome, hex_, ruvidita=0.5, metallo=0.0, vernice=0.0, luce=0.0):
    """Materiale a tinta unita (metalli, laccati, luci)."""
    if nome in _materiali:
        return _materiali[nome]
    m, nt, b = nuovo_materiale(nome)
    rgba = colore(hex_)
    imposta(b, "Base Color", rgba)
    imposta(b, "Roughness", ruvidita)
    imposta(b, "Metallic", metallo)
    imposta(b, "Coat Weight", vernice)
    imposta(b, "Coat Roughness", 0.08)
    if luce > 0:
        imposta(b, "Emission Color", rgba)
        imposta(b, "Emission Strength", luce)
    m.diffuse_color = rgba
    m.roughness = ruvidita
    _materiali[nome] = m
    return m


def reale(nome, cartella, ruvidita=1.0, rilievo=1.0, colore_da=None):
    """Materiale fotografato dal vero (Poly Haven): colore, ruvidita' e rilievo da immagini.
    Le misure vere arrivano dalle coordinate UV in metri (vedi uv_metri)."""
    if nome in _materiali:
        return _materiali[nome]
    base = os.path.join(RIS, "materiali", cartella)
    m, nt, b = nuovo_materiale(nome)
    d = nt.nodes.new("ShaderNodeTexImage")
    d.location = (-420, 240)
    d.image = carica(colore_da or os.path.join(base, "diff.jpg"))
    nt.links.new(d.outputs["Color"], b.inputs["Base Color"])
    r = nt.nodes.new("ShaderNodeTexImage")
    r.location = (-420, -40)
    r.image = carica(os.path.join(base, "rough.jpg"), dati=True)
    if ruvidita == 1.0:
        nt.links.new(r.outputs["Color"], b.inputs["Roughness"])
    else:
        mol = nt.nodes.new("ShaderNodeMath")
        mol.operation = "MULTIPLY"
        mol.use_clamp = True
        mol.location = (-140, -40)
        mol.inputs[1].default_value = ruvidita
        nt.links.new(r.outputs["Color"], mol.inputs[0])
        nt.links.new(mol.outputs[0], b.inputs["Roughness"])
    n = nt.nodes.new("ShaderNodeTexImage")
    n.location = (-420, -320)
    n.image = carica(os.path.join(base, "nor.jpg"), dati=True)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nm.location = (-140, -320)
    nm.inputs["Strength"].default_value = rilievo
    nt.links.new(n.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    _materiali[nome] = m
    return m


def materiale_schermo(nome, file_immagine):
    """Schermo acceso: nero da spento, l'immagine e' la luce che emette."""
    m, nt, b = nuovo_materiale(nome)
    imposta(b, "Base Color", (0.004, 0.004, 0.005, 1.0))
    imposta(b, "Roughness", 0.45)
    t = nt.nodes.new("ShaderNodeTexImage")
    t.location = (-340, 0)
    t.image = carica(os.path.join(TEX, file_immagine))
    nt.links.new(t.outputs["Color"], b.inputs["Emission Color"])
    imposta(b, "Emission Strength", 1.0)
    return m


def materiale_logo(nome, file_immagine, luce=1.0):
    """Logo applicato sul muro: si vede solo dove il PNG non e' trasparente, ed e' retroilluminato."""
    m, nt, b = nuovo_materiale(nome)
    t = nt.nodes.new("ShaderNodeTexImage")
    t.location = (-340, 0)
    t.image = carica(os.path.join(TEX, file_immagine))
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(t.outputs["Color"], b.inputs["Emission Color"])
    nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    imposta(b, "Emission Strength", luce)
    imposta(b, "Roughness", 0.4)
    try:
        m.surface_render_method = "BLENDED"
    except Exception:
        pass
    return m


def collezione(nome, madre=None):
    c = bpy.data.collections.new(nome)
    (madre or bpy.context.scene.collection).children.link(c)
    return c


def uv_metri(ob, lato=1.0, ruota=False, sposta=(0.0, 0.0)):
    """Coordinate UV 'a scatola' in metri: lato = quanti metri copre l'immagine del materiale.
    Sulle facce verticali l'alto dell'immagine va verso l'alto (le venature del legno restano dritte)."""
    me = ob.data
    uvl = me.uv_layers.get("UVMap") or me.uv_layers.new(name="UVMap")
    su = Vector((0, 0, 1))
    for poly in me.polygons:
        n = poly.normal
        t = Vector((1, 0, 0)) if abs(n.z) > 0.9 else su.cross(n).normalized()
        b = n.cross(t)
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            u, v = p.dot(t) / lato + sposta[0], p.dot(b) / lato + sposta[1]
            uvl.data[li].uv = (v, u) if ruota else (u, v)
    return ob


def da_bmesh(nome, bm, mat, coll, ricalcola=True):
    if ricalcola:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    coll.objects.link(ob)
    if mat:
        me.materials.append(mat)
    return ob


def prisma(nome, pianta, z0, z1, mat, coll, liscio=False):
    """Solido chiuso: una pianta (lista di punti x,y) alzata da z0 a z1."""
    bm = bmesh.new()
    giu = [bm.verts.new((p[0], p[1], z0)) for p in pianta]
    su = [bm.verts.new((p[0], p[1], z1)) for p in pianta]
    n = len(pianta)
    bm.faces.new(giu[::-1])
    bm.faces.new(su)
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((giu[i], giu[j], su[j], su[i]))
        f.smooth = liscio
    return da_bmesh(nome, bm, mat, coll)


def cerchio(raggio, cx=0.0, cy=0.0, lati=64):
    return [(cx + raggio * math.cos(2 * math.pi * i / lati),
             cy + raggio * math.sin(2 * math.pi * i / lati)) for i in range(lati)]


def cilindro(nome, raggio, z0, z1, mat, coll, cx=0.0, cy=0.0):
    return prisma(nome, cerchio(raggio, cx, cy), z0, z1, mat, coll, liscio=True)


def sfera(nome, raggio, centro, mat, coll, scala=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=raggio)
    for f in bm.faces:
        f.smooth = True
    ob = da_bmesh(nome, bm, mat, coll)
    ob.location = centro
    if scala:
        ob.scale = scala
    return ob


def scatola(nome, dim, centro, mat, coll, smusso=0.0, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= dim[0]
        v.co.y *= dim[1]
        v.co.z *= dim[2]
    ob = da_bmesh(nome, bm, mat, coll)
    ob.location = centro
    if rot:
        ob.rotation_euler = rot
    if smusso > 0:
        mod = ob.modifiers.new("Smusso", "BEVEL")
        mod.width = min(smusso, min(dim) * 0.49)
        mod.segments = 3
    return ob


def cono(nome, r_base, r_cima, altezza, centro, mat, coll):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=48,
                          radius1=r_base, radius2=r_cima, depth=altezza)
    for f in bm.faces:
        f.smooth = len(f.verts) == 4
    ob = da_bmesh(nome, bm, mat, coll)
    ob.location = centro
    return ob


def tubo(nome, a, b, raggio, mat, coll):
    """Cilindro tra due punti (cavi, steli)."""
    a, b = Vector(a), Vector(b)
    lung = (b - a).length
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=raggio, radius2=raggio, depth=lung)
    for f in bm.faces:
        f.smooth = len(f.verts) == 4
    ob = da_bmesh(nome, bm, mat, coll)
    ob.location = (a + b) / 2
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = (b - a).to_track_quat("Z", "Y")
    return ob


def vuoto(nome, coll, padre=None, loc=(0, 0, 0), rot=(0, 0, 0), dimensione=0.2):
    e = bpy.data.objects.new(nome, None)
    e.empty_display_size = dimensione
    coll.objects.link(e)
    e.parent = padre
    e.location = loc
    e.rotation_euler = rot
    return e


def piano_orientato(nome, verts, mat, coll, verso, lato=None):
    """Faccia singola con la normale girata verso il punto 'verso' (serve a three.js)."""
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new(v) for v in verts])
    bm.normal_update()
    if f.normal.dot(Vector(verso) - f.calc_center_median()) < 0:
        f.normal_flip()
    ob = da_bmesh(nome, bm, mat, coll, ricalcola=False)
    if lato:
        uv_metri(ob, lato)
    return ob


def piano_immagine(nome, larghezza, altezza, mat, coll):
    """Rettangolo in piedi che guarda verso -Y, con l'immagine dritta."""
    w, h = larghezza / 2, altezza / 2
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new(v) for v in ((-w, 0, -h), (w, 0, -h), (w, 0, h), (-w, 0, h))])
    uv = bm.loops.layers.uv.new("UVMap")
    for loop, coord in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop[uv].uv = coord
    bm.normal_update()
    if f.normal.y > 0:
        f.normal_flip()
    return da_bmesh(nome, bm, mat, coll, ricalcola=False)


def luce_spot(nome, coll, loc, verso, watt, cono_gradi=50.0, colore_luce=(1.0, 0.955, 0.9), padre=None):
    dati = bpy.data.lights.new(nome, "SPOT")
    dati.energy = watt
    dati.spot_size = math.radians(cono_gradi)
    dati.spot_blend = 0.6
    dati.shadow_soft_size = 0.12
    dati.color = colore_luce
    ob = bpy.data.objects.new(nome, dati)
    coll.objects.link(ob)
    ob.parent = padre
    ob.location = loc
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = (Vector(verso) - Vector(loc)).to_track_quat("-Z", "Y")
    return ob


# ================================================================ scena pulita
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)
for blocco in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.images):
    for d in list(blocco):
        if d.users == 0:
            blocco.remove(d)

scena = bpy.context.scene
scena.name = "Stanza Reddoak"
scena.unit_settings.system = "METRIC"
rng = random.Random(2014)   # Reddoak nasce nel 2014

# ================================================================ materiali
# l'intonaco fotografato e' grigio: lo porto a un bianco caldo, da atrio
def _bianco_caldo(c):
    return c * (0.84 / float(c.mean())) * np.array([1.0, 0.992, 0.972], dtype=np.float32)


intonaco_chiaro = variante(os.path.join(RIS, "materiali", "painted_plaster_wall", "diff.jpg"),
                           os.path.join(TEX, "intonaco-chiaro.jpg"), _bianco_caldo)

M_PIETRA = reale("Pavimento in pietra", "marble_01", ruvidita=0.55, rilievo=0.6)        # lastre da 1,5 m
M_INTONACO = reale("Intonaco", "painted_plaster_wall", rilievo=0.5, colore_da=intonaco_chiaro)
M_ROVERE = reale("Rovere", "oak_veneer_01", ruvidita=0.9, rilievo=0.6)
M_TESSUTO = reale("Tappeto di lana", "poly_wool_herringbone", rilievo=1.0)
M_CEMENTO = reale("Cemento fioriere", "concrete_floor_02", rilievo=0.8)
LATO_PIETRA, LATO_INTONACO, LATO_ROVERE, LATO_TESSUTO, LATO_CEMENTO = 1.5, 2.0, 1.83, 0.55, 2.0

M_BIANCO = materiale("Bianco opaco", "#ECE9E3", ruvidita=0.6)
M_PIANO = materiale("Piano in quarzo", "#F2F0EB", ruvidita=0.18)
M_ROSSO_LUCE = materiale("Rosso Reddoak · luce", ROSSO_REDDOAK, ruvidita=0.4, luce=6.0)
M_ANTRACITE = materiale("Alluminio antracite", "#1E2024", ruvidita=0.42, metallo=0.85)
M_NERO = materiale("Nero opaco", "#0D0D0F", ruvidita=0.55)
M_ACCIAIO = materiale("Acciaio satinato", "#B9BCC0", ruvidita=0.32, metallo=1.0)
M_BRONZO = materiale("Bronzo lucido", "#B8773C", ruvidita=0.2, metallo=1.0)
M_BRONZO_SCURO = materiale("Bronzo brunito", "#5E3F26", ruvidita=0.42, metallo=1.0)
M_TERRA = materiale("Terriccio", "#2A1F18", ruvidita=0.95)
M_LUCE_ANELLO = materiale("Luce anello", "#FFF1DC", luce=5.0)
M_FARETTO = materiale("Faretto acceso", "#FFE9CC", luce=45.0)
M_MONITOR = materiale("Monitor reception", "#EEF2F7", ruvidita=0.3, luce=0.9)

# ================================================================ modelli veri (Poly Haven)
_stampi = {}
c_stampi = collezione("Stampi (cancellati a fine script)")


def modello(nome, etichetta, coll, padre=None, loc=(0, 0, 0), rot_z=0.0, scala=1.0, altezza=None, solo_foto=False):
    """Mette nella stanza una copia di un modello Poly Haven. Poggia a terra sul punto 'loc'.
    altezza = quanto dev'essere alto in metri (se manca usa 'scala')."""
    if nome not in _stampi:
        prima = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(RIS, "modelli", nome, nome + ".gltf"))
        nuovi = [o for o in bpy.data.objects if o not in prima]
        bpy.context.view_layer.update()
        pts = [o.matrix_world @ Vector(c) for o in nuovi if o.type == "MESH" for c in o.bound_box]
        lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        for o in nuovi:
            for c in list(o.users_collection):
                c.objects.unlink(o)
            c_stampi.objects.link(o)
        _stampi[nome] = (nuovi, lo, hi)
        d = hi - lo
        print(f"Modello {nome}: {d.x:.2f} x {d.y:.2f} x {d.z:.2f} m, {len(nuovi)} oggetti")
    nuovi, lo, hi = _stampi[nome]
    if altezza:
        scala = altezza / (hi.z - lo.z)
    g = vuoto(etichetta, coll, padre, loc, (0, 0, rot_z), 0.25)
    g.scale = (scala, scala, scala)
    copie = {}
    for o in nuovi:
        c = o.copy()
        c.name = f"{etichetta} · {o.name}"
        coll.objects.link(c)
        if solo_foto:
            c["solo_foto"] = True
        copie[o] = c
    piede = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for o, c in copie.items():
        if o.parent in copie:
            c.parent = copie[o.parent]
        else:
            c.parent = g
            c.location = Vector(o.location) - piede
    return g


_rossi = {}


def _foglie_rosse(c):
    """Da foglie verdi a foglie da quercia rossa in autunno."""
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    return np.stack([np.clip(g * 1.55 + 0.05, 0, 1), r * 0.42, b * 0.3], axis=-1)


def arrossa(gruppo):
    """Trasforma un albero verde in una quercia rossa: stesso modello, foglie ricolorate."""
    for ob in gruppo.children_recursive:
        if ob.type != "MESH":
            continue
        if ob.data.name not in _rossi:
            mesh = ob.data.copy()
            for i, m in enumerate(mesh.materials):
                if m is None:
                    continue
                immagini = [n for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image
                            and "leaves_diff" in os.path.basename(n.image.filepath)]
                if not immagini:
                    continue
                m2 = m.copy()
                m2.name = m.name + " · rosso"
                for n in m2.node_tree.nodes:
                    if n.type == "TEX_IMAGE" and n.image and "leaves_diff" in os.path.basename(n.image.filepath):
                        origine = bpy.path.abspath(n.image.filepath)
                        n.image = carica(variante(origine, os.path.join(TEX, "foglie-rosse.jpg"), _foglie_rosse))
                mesh.materials[i] = m2
            _rossi[ob.data.name] = mesh
        ob.data = _rossi[ob.data.name]


def albero(etichetta, coll, padre, loc, alto, rosso=False):
    """Albero vero in una grande fioriera di cemento."""
    g = vuoto(etichetta, coll, padre, loc, (0, 0, 0), 0.3)
    vaso = uv_metri(cilindro(f"{etichetta} · fioriera", 0.6, 0.0, 0.62, M_CEMENTO, coll), LATO_CEMENTO)
    vaso.parent = g
    cilindro(f"{etichetta} · terra", 0.54, 0.6, 0.625, M_TERRA, coll).parent = g
    t = modello("tree_small_02", f"{etichetta} · albero", coll, g, (0, 0, 0.6), rng.uniform(0, 6.28),
                altezza=alto, solo_foto=True)
    if rosso:
        arrossa(t)
    return g


# ================================================================ struttura: il salone con l'arco dei progetti
c_stanza = collezione("Salone")
c_soffitto = collezione("Soffitto (nascosto nella vista, si vede nel render)")
c_verde = collezione("Alberi e piante")
centro_occhi = (0, 0, OCCHI)


def direzione(gradi):
    """Da chi guarda: 0 = dritto davanti (+Y), positivo = verso destra."""
    a = math.radians(gradi)
    return Vector((math.sin(a), math.cos(a), 0.0))


# pianta del salone: l'arco di fondo a 5 facce (una per progetto), due pareti laterali e l'ingresso alle spalle
R_SPIGOLI = R_ARCO / math.cos(math.radians(PASSO / 2))
SPIGOLI = [direzione(-2.5 * PASSO + PASSO * i) * R_SPIGOLI for i in range(6)]
MEZZA_LARG = SPIGOLI[5].x
CONTORNO = [(v.x, v.y) for v in SPIGOLI] + [(MEZZA_LARG, FONDO_Y), (-MEZZA_LARG, FONDO_Y)]

piano_orientato("Pavimento", [(x, y, 0.0) for x, y in CONTORNO], M_PIETRA, c_stanza, (0, 0, 10), lato=LATO_PIETRA)


def trave(nome, a, b, larg, alt, z, mat, coll, smusso=0.02):
    a, b = Vector(a), Vector(b)
    d = b - a
    return scatola(nome, (d.length, larg, alt), ((a.x + b.x) / 2, (a.y + b.y) / 2, z), mat, coll,
                   smusso=smusso, rot=(0, 0, math.atan2(d.y, d.x)))


# ---------------------------------------------------------------- muro di fondo ad arco: intonaco sotto, rovere in alto
for k in range(5):
    a, b = SPIGOLI[k], SPIGOLI[k + 1]
    gradi = (k - 2) * PASSO
    faccia = vuoto(f"MURO_{k + 1}", c_stanza, None, tuple(direzione(gradi) * R_ARCO), (0, 0, -math.radians(gradi)), 0.3)
    larg_faccia = (b - a).length
    # dietro lo schermo un setto pieno d'intonaco (ci cade la luce colorata); ai due lati vetrate sulla citta'
    for nome_, dim, loc in ((f"Muro di fondo {k + 1} · setto", (SETTO, 0.4, ALTEZZA), (0, 0.2, ALTEZZA / 2)),
                            (f"Muro di fondo {k + 1} · fascia alta", (larg_faccia, 0.4, ALTEZZA - Z_ROVERE), (0, 0.2, (ALTEZZA + Z_ROVERE) / 2))):
        pezzo = scatola(nome_, dim, loc, M_INTONACO, c_stanza)
        uv_metri(pezzo, LATO_INTONACO)
        pezzo.parent = faccia
    for lato in (-1, 1):
        x0, x1 = SETTO / 2, larg_faccia / 2
        lv, cx = x1 - x0, lato * (x0 + x1) / 2
        telaio = [("montante al muro", (0.1, 0.18, Z_ROVERE), (lato * (x0 + 0.05), 0.2, Z_ROVERE / 2)),
                  ("montante d'angolo", (0.16, 0.26, Z_ROVERE), (lato * (x1 - 0.03), 0.2, Z_ROVERE / 2)),
                  ("montante", (0.06, 0.16, Z_ROVERE), (cx, 0.2, Z_ROVERE / 2)),
                  ("telaio basso", (lv, 0.18, 0.1), (cx, 0.2, 0.05)),
                  ("telaio alto", (lv, 0.18, 0.1), (cx, 0.2, Z_ROVERE - 0.05))]
        telaio += [(f"traverso {i + 1}", (lv, 0.16, 0.06), (cx, 0.2, 2.4 * (i + 1))) for i in range(3)]
        for nome_, dim, loc in telaio:
            scatola(f"Vetrata arco {k + 1} {'sx' if lato < 0 else 'dx'} · {nome_}", dim, loc, M_ANTRACITE, c_stanza).parent = faccia
    COLONNE, RIGHE, FUGA = 4, 2, 0.012
    lp, ap = larg_faccia / COLONNE, (ALTEZZA - Z_ROVERE) / RIGHE
    for c in range(COLONNE):
        for r in range(RIGHE):
            pan = scatola(f"Boiserie {k + 1}.{c + 1}.{r + 1}", (lp - FUGA, 0.05, ap - FUGA),
                          (-larg_faccia / 2 + lp * (c + 0.5), -0.025, Z_ROVERE + ap * (r + 0.5)), M_ROVERE, c_stanza, smusso=0.004)
            uv_metri(pan, LATO_ROVERE, sposta=(rng.random(), rng.random()))
            pan.parent = faccia
    # filo di luce calda sotto la fascia di rovere
    scatola(f"Gola luminosa {k + 1}", (larg_faccia, 0.06, 0.03), (0, -0.03, Z_ROVERE - 0.02), M_LUCE_ANELLO, c_stanza).parent = faccia
    if k == 2:   # il logo Reddoak, gigante, in alto al centro
        logo = piano_immagine("Reddoak · logo", 6.0, 6.0 * 180 / 770, materiale_logo("Logo Reddoak", "reddoak-logo.png", 1.0), c_stanza)
        logo.parent = faccia
        logo.location = (0, -0.058, Z_ROVERE + (ALTEZZA - Z_ROVERE) / 2)


# ---------------------------------------------------------------- pareti vetrate (lati e ingresso): la citta' tutto attorno
def facciata(nome, A, B):
    """Parete quasi tutta di vetro tra i punti A e B: telaio in alluminio scuro, intonaco solo ai bordi."""
    A, B = Vector((A[0], A[1], 0)), Vector((B[0], B[1], 0))
    lung = (B - A).length
    lungo = (B - A).normalized()
    mezzo = (A + B) / 2
    dentro = Vector((-lungo.y, lungo.x, 0))
    if dentro.dot(-mezzo + Vector((0, 4, 0))) < 0:
        dentro = -dentro
    S_, bordo = SPESSORE_MURO, 0.6

    def p(t, z, fuori=0.0):
        v = A + lungo * t - dentro * fuori
        return (v.x, v.y, z)

    t0, t1 = bordo, lung - bordo
    centro_vetro = Vector(p(lung / 2, VETRO_ALT / 2, S_ / 2))
    for pezzo, verts, verso, mat, lato in (
        ("sinistra", [p(0, 0), p(t0, 0), p(t0, ALTEZZA), p(0, ALTEZZA)], centro_occhi, M_INTONACO, LATO_INTONACO),
        ("destra", [p(t1, 0), p(lung, 0), p(lung, ALTEZZA), p(t1, ALTEZZA)], centro_occhi, M_INTONACO, LATO_INTONACO),
        ("sopra", [p(t0, VETRO_ALT), p(t1, VETRO_ALT), p(t1, ALTEZZA), p(t0, ALTEZZA)], centro_occhi, M_INTONACO, LATO_INTONACO),
        ("spalla sx", [p(t0, 0), p(t0, 0, S_), p(t0, VETRO_ALT, S_), p(t0, VETRO_ALT)], centro_vetro, M_INTONACO, LATO_INTONACO),
        ("spalla dx", [p(t1, 0), p(t1, 0, S_), p(t1, VETRO_ALT, S_), p(t1, VETRO_ALT)], centro_vetro, M_INTONACO, LATO_INTONACO),
        ("architrave", [p(t0, VETRO_ALT), p(t1, VETRO_ALT), p(t1, VETRO_ALT, S_), p(t0, VETRO_ALT, S_)], centro_vetro, M_INTONACO, LATO_INTONACO),
        ("soglia", [p(t0, 0), p(t1, 0), p(t1, 0, S_), p(t0, 0, S_)], centro_vetro, M_PIETRA, LATO_PIETRA),
    ):
        piano_orientato(f"{nome} · {pezzo}", verts, mat, c_stanza, verso, lato=lato)
    # +X locale lungo la parete, +Y locale verso fuori
    vet = vuoto(f"VETRATA_{nome}", c_stanza, None, (mezzo.x, mezzo.y, 0), (0, 0, math.atan2(lungo.y, lungo.x)), 0.3)
    fuori_y = 0.22 if Vector((-lungo.y, lungo.x, 0)).dot(dentro) < 0 else -0.22
    larg = t1 - t0
    pezzi = [("telaio sx", (0.1, 0.18, VETRO_ALT), (-larg / 2 + 0.05, fuori_y, VETRO_ALT / 2)),
             ("telaio dx", (0.1, 0.18, VETRO_ALT), (larg / 2 - 0.05, fuori_y, VETRO_ALT / 2)),
             ("telaio alto", (larg, 0.18, 0.1), (0, fuori_y, VETRO_ALT - 0.05)),
             ("telaio basso", (larg, 0.18, 0.1), (0, fuori_y, 0.05))]
    campate = max(2, round(larg / 1.6))
    for i in range(1, campate):
        pezzi.append((f"montante {i}", (0.06, 0.16, VETRO_ALT), (-larg / 2 + larg * i / campate, fuori_y, VETRO_ALT / 2)))
    z = 2.8
    while z < VETRO_ALT - 1.0:
        pezzi.append((f"traverso {z:.1f}", (larg, 0.16, 0.06), (0, fuori_y, z)))
        z += 2.8
    for n_, dim, loc in pezzi:
        scatola(f"{nome} · {n_}", dim, loc, M_ANTRACITE, c_stanza).parent = vet


facciata("Vetrata destra", CONTORNO[5], CONTORNO[6])
facciata("Vetrata ingresso", CONTORNO[6], CONTORNO[7])
facciata("Vetrata sinistra", CONTORNO[7], CONTORNO[0])

# ---------------------------------------------------------------- soffitto con il grande lucernario a pentagono (5 progetti)
C_LUC = Vector((0.0, 6.0, 0.0))


def pent(k, raggio):
    a = math.radians(90.0 - 72.0 * (k % 5))
    return C_LUC + Vector((raggio * math.cos(a), raggio * math.sin(a), 0.0))


bm = bmesh.new()
est = [bm.verts.new((x, y, ALTEZZA)) for x, y in CONTORNO]
inn = [bm.verts.new((pent(k, R_LUCERNARIO).x, pent(k, R_LUCERNARIO).y, ALTEZZA)) for k in range(5)]
bordi = [bm.edges.new((est[i], est[(i + 1) % len(est)])) for i in range(len(est))]
bordi += [bm.edges.new((inn[i], inn[(i + 1) % 5])) for i in range(5)]
bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=bordi)
bm.normal_update()
for f in bm.faces:
    if f.normal.z > 0:
        f.normal_flip()
uv_metri(da_bmesh("Soffitto", bm, M_INTONACO, c_soffitto, ricalcola=False), LATO_INTONACO)

R_ANELLO, Z_ANELLO = 4.2, 10.2
for k in range(5):
    a0, b0 = pent(k, R_LUCERNARIO), pent(k + 1, R_LUCERNARIO)
    piano_orientato(f"Lucernario {k + 1} · pozzo",
                    [(a0.x, a0.y, ALTEZZA), (b0.x, b0.y, ALTEZZA), (b0.x, b0.y, ALTEZZA + 1.0), (a0.x, a0.y, ALTEZZA + 1.0)],
                    M_INTONACO, c_soffitto, (C_LUC.x, C_LUC.y, ALTEZZA + 0.5), lato=LATO_INTONACO)
    trave(f"Lucernario · raggio {k + 1}", C_LUC, pent(k, R_LUCERNARIO), 0.1, 0.18, ALTEZZA + 0.9, M_ANTRACITE, c_soffitto, 0.0)
    trave(f"Lucernario · bordo {k + 1}", pent(k, R_LUCERNARIO), pent(k + 1, R_LUCERNARIO), 0.1, 0.18, ALTEZZA + 0.9, M_ANTRACITE, c_soffitto, 0.0)
    trave(f"Lucernario · mezzo {k + 1}", pent(k, R_LUCERNARIO / 2), pent(k + 1, R_LUCERNARIO / 2), 0.08, 0.14, ALTEZZA + 0.9, M_ANTRACITE, c_soffitto, 0.0)
    # grande anello luminoso sospeso: alluminio scuro sopra, luce sotto
    trave(f"Anello · corpo {k + 1}", pent(k, R_ANELLO), pent(k + 1, R_ANELLO), 0.16, 0.1, Z_ANELLO + 0.06, M_ANTRACITE, c_soffitto, 0.01)
    trave(f"Anello · luce {k + 1}", pent(k, R_ANELLO), pent(k + 1, R_ANELLO), 0.12, 0.03, Z_ANELLO, M_LUCE_ANELLO, c_soffitto, 0.0)
    pa = pent(k, R_ANELLO)
    tubo(f"Anello cavo {k + 1}", (pa.x, pa.y, Z_ANELLO + 0.1), (pa.x, pa.y, ALTEZZA + 0.9), 0.008, M_ACCIAIO, c_soffitto)

# faretti incassati lungo l'arco
for i in range(15):
    f_ = direzione(-84 + 12 * i) * 13.6
    cilindro(f"Faretto {i + 1} · ghiera", 0.1, ALTEZZA - 0.012, ALTEZZA, M_ANTRACITE, c_soffitto, f_.x, f_.y)
    cilindro(f"Faretto {i + 1}", 0.07, ALTEZZA - 0.016, ALTEZZA - 0.01, M_FARETTO, c_soffitto, f_.x, f_.y)

# ---------------------------------------------------------------- lato ingresso: la parete Reddoak con la reception
# Alle spalle di chi guarda NON deve esserci un vuoto (richiesta dell'utente): una grande parete in rovere
# con il motto, la reception davanti, due salottini ai lati, piante e alberi.
try:
    CARATTERE = bpy.data.fonts.load("/System/Library/Fonts/Supplemental/Arial Black.ttf")
except Exception:
    CARATTERE = None


def testo(nome, scritta, alto, mat, coll, spessore=0.05):
    """Scritta in rilievo, in piedi, che guarda verso -Y."""
    cu = bpy.data.curves.new(nome, "FONT")
    if CARATTERE:
        cu.font = CARATTERE
    cu.body = scritta
    cu.size = alto
    cu.extrude = spessore
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.materials.append(mat)
    ob = bpy.data.objects.new(nome, cu)
    coll.objects.link(ob)
    ob.rotation_euler = (math.pi / 2, 0, 0)
    return ob


def salottino(nome, coll, padre, loc, rot_z):
    """Tappeto, due poltrone, tavolino e vaso: un angolo dove sedersi."""
    g = vuoto(nome, coll, padre, loc, (0, 0, rot_z), 0.3)
    tap = scatola(f"{nome} · tappeto", (3.8, 2.6, 0.018), (0, 0, 0.009), M_TESSUTO, coll, smusso=0.004)
    uv_metri(tap, LATO_TESSUTO)
    tap.parent = g
    modello("mid_century_lounge_chair", f"{nome} · poltrona sx", coll, g, (-1.4, 0.2, 0.018), math.radians(62))
    modello("mid_century_lounge_chair", f"{nome} · poltrona dx", coll, g, (1.4, 0.2, 0.018), math.radians(-62))
    modello("coffee_table_round_01", f"{nome} · tavolino", coll, g, (0, -0.05, 0.018), rng.uniform(0, 6.28))
    modello("ceramic_vase_01", f"{nome} · vaso", coll, g, (0.1, -0.05, 0.44), 0.0, altezza=0.3)
    return g


PARETE_L = 11.5
retro = vuoto("PARETE_RECEPTION", c_stanza, None, (0, FONDO_Y + 1.0, 0), (0, 0, math.pi), 0.4)   # -Y locale verso la stanza
muro_r = scatola("Parete reception · muro", (PARETE_L, 0.5, ALTEZZA), (0, 0.25, ALTEZZA / 2), M_INTONACO, c_stanza)
uv_metri(muro_r, LATO_INTONACO)
muro_r.parent = retro
COL_R, RIG_R = 5, 6
for c in range(COL_R):
    for r in range(RIG_R):
        pan = scatola(f"Parete reception · boiserie {c + 1}.{r + 1}", (PARETE_L / COL_R - 0.012, 0.05, ALTEZZA / RIG_R - 0.012),
                      (-PARETE_L / 2 + PARETE_L / COL_R * (c + 0.5), -0.025, ALTEZZA / RIG_R * (r + 0.5)), M_ROVERE, c_stanza, smusso=0.004)
        uv_metri(pan, LATO_ROVERE, sposta=(rng.random(), rng.random()))
        pan.parent = retro
M_LETTERE = materiale("Lettere bianche", "#FFFFFF", ruvidita=0.3, luce=0.7)
for riga, z in (("DIAMO VITA", 8.55), ("ALLE TUE IDEE", 7.25)):
    scritta_ = testo(f"Motto · {riga}", riga, 1.0, M_LETTERE, c_stanza)
    scritta_.parent = retro
    scritta_.location = (0, -0.11, z)
foglia = piano_immagine("Reddoak · foglia", 3.6, 3.6 * 409 / 610, materiale_logo("Foglia Reddoak", "reddoak-foglia.png", 1.0), c_stanza)
foglia.parent = retro
foglia.location = (0, -0.058, 10.9)

banco_g = vuoto("RECEPTION", c_stanza, retro, (0, -2.7, 0), (0, 0, 0), 0.4)   # il davanti del banco guarda la stanza
banco = scatola("Reception · banco", (5.6, 0.85, 0.98), (0, 0, 0.59), M_ROVERE, c_stanza, smusso=0.006)
uv_metri(banco, LATO_ROVERE, ruota=True)
for ob in (
    banco,
    scatola("Reception · zoccolo", (5.5, 0.75, 0.1), (0, 0, 0.05), M_ANTRACITE, c_stanza),
    scatola("Reception · filo rosso", (5.56, 0.81, 0.012), (0, 0, 0.094), M_ROSSO_LUCE, c_stanza),
    scatola("Reception · piano", (5.8, 1.0, 0.045), (0, -0.02, 1.1025), M_PIANO, c_stanza, smusso=0.006),
):
    ob.parent = banco_g
for i, x in enumerate((-1.3, 1.3)):   # i due computer, visti da dietro
    scatola(f"Reception · monitor {i + 1}", (0.62, 0.02, 0.38), (x, 0.18, 1.42), M_NERO, c_stanza, smusso=0.004).parent = banco_g
    tubo(f"Reception · monitor {i + 1} stelo", (x, 0.2, 1.125), (x, 0.2, 1.34), 0.018, M_ACCIAIO, c_stanza).parent = banco_g
modello("potted_plant_04", "Reception · pianta", c_stanza, banco_g, (2.3, -0.05, 1.125), 1.1, altezza=0.34)
# la ghianda in bronzo sul banco (da piccola ghianda a grande quercia)
ghianda = vuoto("GHIANDA", c_stanza, banco_g, (-2.3, -0.05, 1.125), (0, 0, 0), 0.2)
ghianda.scale = (0.6, 0.6, 0.6)
punta = cono("Ghianda · punta", 0.05, 0.0, 0.09, (0, 0, 0.06), M_BRONZO, c_stanza)
punta.rotation_euler = (math.pi, 0, 0)
for ob in (
    sfera("Ghianda · corpo", 0.3, (0, 0, 0.45), M_BRONZO, c_stanza, scala=(1, 1, 1.28)),
    sfera("Ghianda · cappello", 0.33, (0, 0, 0.71), M_BRONZO_SCURO, c_stanza, scala=(1, 1, 0.56)),
    tubo("Ghianda · picciolo", (0, 0, 0.83), (0.05, 0, 1.01), 0.03, M_BRONZO_SCURO, c_stanza),
    punta,
):
    ob.parent = ghianda
luce_spot("Faro reception", c_stanza, (0, FONDO_Y + 4.6, ALTEZZA - 0.4), (0, FONDO_Y + 3.4, 0.9), 7000, 34)
for lato in (-1, 1):
    luce_spot(f"Faro parete reception {lato}", c_stanza, (lato * 2.8, FONDO_Y + 5.2, ALTEZZA - 0.4), (lato * 2.4, FONDO_Y + 1.0, 7.6), 5000, 44)
    # un salottino per lato della reception, girato verso il centro
    salottino(f"Salottino ingresso {'sx' if lato < 0 else 'dx'}", c_stanza, None, (lato * 9.3, -3.9, 0), math.pi - lato * 0.5)
    modello("potted_plant_02", f"Pianta ingresso {lato}a", c_verde, None, (lato * 6.4, FONDO_Y + 1.5, 0), rng.uniform(0, 6.28), altezza=1.5)
    modello("potted_plant_01", f"Pianta ingresso {lato}b", c_verde, None, (lato * 7.3, FONDO_Y + 1.2, 0), rng.uniform(0, 6.28), altezza=1.15)

# sedute rotonde con una pianta al centro, sparse nel mezzo del salone: riempiono il pavimento senza coprire gli schermi
for i, gradi in enumerate((-54, -18, 18, 54, -128, 128)):
    centro_ = direzione(gradi) * (9.2 if abs(gradi) < 90 else 8.6)
    isola = vuoto(f"SEDUTA_{i + 1}", c_stanza, None, (centro_.x, centro_.y, 0), (0, 0, 0), 0.3)
    cilindro(f"Seduta {i + 1} · base", 0.9, 0.0, 0.1, M_ANTRACITE, c_stanza).parent = isola
    cusc = uv_metri(cilindro(f"Seduta {i + 1} · cuscino", 1.0, 0.1, 0.46, M_TESSUTO, c_stanza), LATO_TESSUTO)
    cusc.parent = isola
    vasca = uv_metri(cilindro(f"Seduta {i + 1} · fioriera", 0.42, 0.46, 0.8, M_CEMENTO, c_stanza), LATO_CEMENTO)
    vasca.parent = isola
    cilindro(f"Seduta {i + 1} · terra", 0.38, 0.78, 0.805, M_TERRA, c_stanza).parent = isola
    modello("potted_plant_02" if i % 2 else "potted_plant_01", f"Seduta {i + 1} · pianta", c_verde, isola, (0, 0, 0.5),
            rng.uniform(0, 6.28), altezza=1.0 if i % 2 else 0.9)

# due querce rosse incorniciano l'arco (il simbolo di Reddoak), alberi verdi accanto alle vetrate
for lato in (-1, 1):
    q = direzione(lato * 93) * 13.2
    albero(f"Quercia rossa {'sinistra' if lato < 0 else 'destra'}", c_verde, None, (q.x, q.y, 0), 5.4, rosso=True)
    albero(f"Albero ingresso {'sinistra' if lato < 0 else 'destra'}", c_verde, None, (lato * 13.6, -4.9, 0), 5.6)
for i, gradi in enumerate((-88, -54, -18, 18, 54, 88)):   # piante davanti alle vetrate, tra uno schermo e l'altro
    pp = direzione(gradi) * (R_ARCO - 1.5)
    modello("potted_plant_02" if i % 2 else "potted_plant_01", f"Pianta arco {i + 1}", c_verde, None, (pp.x, pp.y, 0),
            rng.uniform(0, 6.28), altezza=1.5 if i % 2 else 1.25)
    # lampade a sospensione tra un salottino e l'altro
    lp_ = direzione(gradi) * 12.3
    z = 3.4 if i % 2 else 2.9
    lamp = modello("modern_ceiling_lamp_01", f"Lampada {i + 1}", c_stanza, None, (lp_.x, lp_.y, z), rng.uniform(0, 6.28))
    _, lo_, hi_ = _stampi["modern_ceiling_lamp_01"]
    tubo(f"Lampada {i + 1} cavo", (lp_.x, lp_.y, z + (hi_.z - lo_.z) - 0.02), (lp_.x, lp_.y, ALTEZZA), 0.004, M_NERO, c_stanza)
    pl = bpy.data.lights.new(f"Lampadina {i + 1}", "POINT")
    pl.energy = 160
    pl.shadow_soft_size = 0.12
    pl.color = (1.0, 0.89, 0.76)
    pl_ob = bpy.data.objects.new(f"Lampadina {i + 1}", pl)
    c_stanza.objects.link(pl_ob)
    pl_ob.location = (lp_.x, lp_.y, z - 0.12)

# ================================================================ i 5 progetti: grande schermo e salottino, uno accanto all'altro
c_hotspot = collezione("Hotspot (punti cliccabili sul sito)")
CORPO_L, CORPO_P, CORPO_H = SCHERMO_L + 0.16, 0.32, ZOCCOLO + SCHERMO_H + 0.1   # il totem che regge lo schermo
POLTRONE = ("modern_arm_chair_01", "mid_century_lounge_chair")

for k, prog in enumerate(PROGETTI):
    coll = collezione(f"Progetto {k + 1} · {prog['nome']}")
    N = prog["nome"]
    gradi = (k - 2) * PASSO

    # Tutto il progetto e' agganciato a questo Empty: spostandolo si sposta tutto insieme.
    # +Y locale va verso il muro di fondo, -Y verso chi guarda, +X e' la destra di chi guarda.
    base = vuoto(f"ANGOLO_{k + 1}_{prog['id']}", coll, None, tuple(direzione(gradi) * (R_ARCO - DIST_TOTEM)),
                 (0, 0, -math.radians(gradi)), 0.5)
    base.empty_display_type = "ARROWS"

    def S(ob, base=base):
        ob.parent = base
        return ob

    # totem in alluminio scuro con il grande schermo verticale
    S(scatola(f"{N} · totem", (CORPO_L, CORPO_P, CORPO_H), (0, 0, CORPO_H / 2), M_ANTRACITE, coll, smusso=0.01))
    schermo = S(piano_immagine(f"{N} · schermo", SCHERMO_L, SCHERMO_H,
                               materiale_schermo(f"Schermo {N}", f"schermo-{prog['id']}.png"), coll))
    schermo.location = (0, -CORPO_P / 2 - 0.004, ZOCCOLO + SCHERMO_H / 2)
    # luce nel colore del progetto dietro e sopra il totem: tinge il muro alle sue spalle
    m_alone = materiale(f"{N} · alone", prog["colore"], luce=14.0)
    for lato in (-1, 1):
        S(scatola(f"{N} · alone {'sx' if lato < 0 else 'dx'}", (0.03, CORPO_P - 0.08, CORPO_H - 0.1),
                  (lato * (CORPO_L / 2 + 0.012), 0.02, CORPO_H / 2), m_alone, coll))
    S(scatola(f"{N} · alone sopra", (CORPO_L - 0.1, CORPO_P - 0.08, 0.03), (0, 0.02, CORPO_H + 0.012), m_alone, coll))
    S(scatola(f"{N} · alone dietro", (CORPO_L - 0.3, 0.03, CORPO_H - 0.3), (0, CORPO_P / 2 + 0.012, CORPO_H / 2), m_alone, coll))

    # salottino davanti allo schermo
    tappeto = S(scatola(f"{N} · tappeto", (3.8, 2.6, 0.018), (0, -3.3, 0.009), M_TESSUTO, coll, smusso=0.004))
    uv_metri(tappeto, LATO_TESSUTO)
    poltrona = POLTRONE[k % 2]
    modello(poltrona, f"{N} · poltrona sx", coll, base, (-1.4, -3.1, 0.018), math.radians(62))
    modello(poltrona, f"{N} · poltrona dx", coll, base, (1.4, -3.1, 0.018), math.radians(-62))
    modello("coffee_table_round_01", f"{N} · tavolino", coll, base, (0, -3.35, 0.018), rng.uniform(0, 6.28))
    modello("ceramic_vase_03" if k % 2 else "ceramic_vase_01", f"{N} · vaso", coll, base,
            (0.12, -3.3, 0.018 + 0.42), rng.uniform(0, 6.28), altezza=0.3)
    luce_spot(f"Faro {N}", coll, (0, -3.6, ALTEZZA - 0.4), (0, -3.3, 0.3), 7000, 34, padre=base)

    # punto cliccabile: sul sito diventa il bollino rotante del progetto (sopra il tavolino del salottino)
    hs = bpy.data.objects.new(f"HOTSPOT_{prog['id']}", None)
    hs.empty_display_type = "SPHERE"
    hs.empty_display_size = 0.16
    hs["titolo"] = N
    c_hotspot.objects.link(hs)
    hs.parent = base
    hs.location = (0, -3.35, 0.3)

# gli stampi dei modelli non servono piu': restano solo le copie messe nella stanza
for nuovi, _, _ in _stampi.values():
    for o in nuovi:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.data.collections.remove(c_stampi)

# ================================================================ sole e cielo vero
sole_dati = bpy.data.lights.new("Sole", "SUN")
sole_dati.energy = 2.2
sole_dati.angle = math.radians(2.5)
sole_dati.color = (1.0, 0.95, 0.88)
sole = bpy.data.objects.new("Sole", sole_dati)
scena.collection.objects.link(sole)
sole.location = (0, 6, ALTEZZA + 8)
azimut, elevazione = math.radians(54), math.radians(64)   # la lama di sole cade davanti, tra i primi due angoli
verso_luce = Vector((math.cos(azimut) * math.cos(elevazione), math.sin(azimut) * math.cos(elevazione), -math.sin(elevazione)))
sole.rotation_mode = "QUATERNION"
sole.rotation_quaternion = verso_luce.to_track_quat("-Z", "Y")

mondo = scena.world or bpy.data.worlds.new("Cielo")
scena.world = mondo
mondo.name = "Cielo vero (Canary Wharf)"
if mondo.node_tree is None:
    mondo.use_nodes = True
# la fotografia a 360 gradi della citta' fa da cielo. Quella che si VEDE dalle vetrate ha la sua
# luminosita', quella che ILLUMINA la stanza e' piu' forte (come una foto esposta per l'interno).
nt = mondo.node_tree
nt.nodes.clear()
w_out = nt.nodes.new("ShaderNodeOutputWorld")
w_coord = nt.nodes.new("ShaderNodeTexCoord")
w_gira = nt.nodes.new("ShaderNodeMapping")
w_gira.inputs["Rotation"].default_value = (0, 0, math.radians(ROT_CIELO))
w_foto = nt.nodes.new("ShaderNodeTexEnvironment")
w_foto.image = carica(os.path.join(RIS, "cielo", "canary_wharf.hdr"))
nt.links.new(w_coord.outputs["Generated"], w_gira.inputs["Vector"])
nt.links.new(w_gira.outputs["Vector"], w_foto.inputs["Vector"])
w_luce = nt.nodes.new("ShaderNodeBackground")
w_luce.inputs[1].default_value = LUCE_CIELO
w_vista = nt.nodes.new("ShaderNodeBackground")
w_vista.inputs[1].default_value = VISTA_CIELO
nt.links.new(w_foto.outputs["Color"], w_luce.inputs[0])
nt.links.new(w_foto.outputs["Color"], w_vista.inputs[0])
w_raggio = nt.nodes.new("ShaderNodeLightPath")
w_mix = nt.nodes.new("ShaderNodeMixShader")
nt.links.new(w_raggio.outputs["Is Camera Ray"], w_mix.inputs[0])
nt.links.new(w_luce.outputs[0], w_mix.inputs[1])
nt.links.new(w_vista.outputs[0], w_mix.inputs[2])
nt.links.new(w_mix.outputs[0], w_out.inputs["Surface"])
mondo.color = colore(CIELO)[:3]
mondo["cielo"] = CIELO   # letto dall'esportazione: e' lo sfondo del "3D dal vivo"

# ================================================================ camera 360
cam_data = bpy.data.cameras.new("Camera360")
cam_data.type = "PANO"
try:
    cam_data.panorama_type = "EQUIRECTANGULAR"
except Exception:
    cam_data.cycles.panorama_type = "EQUIRECTANGULAR"
cam = bpy.data.objects.new("Camera360", cam_data)
scena.collection.objects.link(cam)
cam.location = (0, 0, OCCHI)
cam.rotation_euler = (math.radians(90), 0, 0)   # guarda verso +Y, cioe' lo schermo al centro dell'arco
# Sul sito non ci si puo' girare: si vede solo l'arco dei 5 progetti. Questo e' l'angolo (gradi, a destra e a
# sinistra) oltre il quale non si vede mai niente: poco oltre il bordo dell'ultimo schermo.
cam["sguardo_bordo_gradi"] = SGUARDO_BORDO
scena.camera = cam

# ================================================================ render
scena.render.engine = "CYCLES"
scena.render.resolution_x = 5760      # la stessa misura del panorama di engine.land
scena.render.resolution_y = 2880
scena.render.resolution_percentage = 100
scena.cycles.samples = 160
scena.cycles.use_adaptive_sampling = True
scena.cycles.adaptive_threshold = 0.015
scena.cycles.use_denoising = True
scena.cycles.sample_clamp_indirect = 8.0     # niente puntini bianchi sul pavimento lucido
scena.cycles.caustics_reflective = False
scena.cycles.caustics_refractive = False
try:
    scena.cycles.device = "GPU"
except Exception:
    pass
for nome_vista in ("Khronos PBR Neutral", "Standard", "AgX"):   # la prima tiene i colori dei marchi fedeli
    try:
        scena.view_settings.view_transform = nome_vista
        break
    except Exception:
        continue
for look in ("None",):
    try:
        scena.view_settings.look = look
        break
    except Exception:
        continue

# soffitto nel render ma non davanti agli occhi mentre lavori nella vista dall'alto
for lc in bpy.context.view_layer.layer_collection.children:
    if lc.name.startswith("Soffitto"):
        lc.hide_viewport = True

# vista 3D in modalita' "Anteprima materiale", cosi' si vedono subito i materiali
for schermo_ui in bpy.data.screens:
    for area in schermo_ui.areas:
        if area.type == "VIEW_3D":
            for spazio in area.spaces:
                if spazio.type == "VIEW_3D":
                    spazio.shading.type = "MATERIAL"
                    spazio.clip_end = 200

bpy.ops.wm.save_as_mainfile(filepath=USCITA)
try:   # percorsi relativi: la cartella del progetto si puo' spostare senza perdere immagini
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_mainfile()
except Exception as e:
    print("Percorsi relativi non impostati:", e)
print(f"\nStanza salvata in {USCITA} ({len(bpy.data.objects)} oggetti)")
