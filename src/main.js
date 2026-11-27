import * as THREE from "three";
import { progetti } from "./progetti.js";
import { paginaProgetto, paginaChiSiamo, vociMenu } from "./pagine.js";
import { avviaScheda, prossimoProgetto } from "./schede.js";

/*
  Come funziona (stessa idea di engine.land):
  - Blender renderizza la stanza come foto a 360° vista dal centro (panorama.jpg)
  - qui la foto viene incollata all'interno di una sfera attorno alla camera
  - i punti cliccabili arrivano da Blender (Empty "HOTSPOT_...") dentro stanza.json
  Per non sprecare il computer di chi guarda, la stanza si ridisegna SOLO quando cambia qualcosa (vedi "ciclo").
  Il vecchio «3D dal vivo» (il modello stanza.glb) è stato tolto: l'utente non lo voleva e appesantiva il sito.
*/

const CARTELLA = "/stanza/";
// il titolo della hall: lo stesso scritto in index.html e in vite.config.js; torna quando si chiude una pagina
const TITOLO_SITO = "Reddoak · Il quartier generale delle nostre app e dei nostri progetti digitali";
const $ = (id) => document.getElementById(id);
const canvas = $("scena");
const riquadro = $("riquadro"); // la stanza vive in un riquadro con la cornice attorno, come su engine.land

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#d9d0c4");

const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 900);
camera.rotation.order = "YXZ";

// ------------------------------------------------------------------ sguardo
const PITCH_MIN = -0.62;
const PITCH_MAX = 0.85; // si può alzare lo sguardo fino al lucernario
// Quanto è larga la vista e dove guarda dipendono dalla forma del riquadro (li sceglie ridimensiona()).
// Su telefono (riquadro alto e stretto) e nelle finestre quasi quadrate lo sguardo resta DRITTO, in piano, e per
// far entrare gli schermi alti nove metri si sposta l'inquadratura verso l'alto ("sposta": quanta parte
// dell'altezza), come fa l'obiettivo decentrabile dei fotografi di architettura. Così le linee verticali restano
// verticali e gli schermi si vedono di fronte. Alzando lo sguardo (pitch) sembravano «ripresi dal basso verso
// l'alto», e all'utente non piaceva; non gli piaceva nemmeno la vista larga con il pavimento in primo piano, né
// lo zoom stretto su un solo schermo («troppo vicino»).
const INQUADRATURE = [
  { finoA: 0.8, fov: 66, pitch: 0, sposta: 0.26 }, // telefono in verticale
  { finoA: 1.25, fov: 66, pitch: 0, sposta: 0.27 }, // finestra quasi quadrata, tablet
  { finoA: Infinity, fov: 70, pitch: 0.13, sposta: 0 }, // computer: ampia, fa sentire lo spazio grande (approvata così)
];
let pitchVista = 0.13; // lo sguardo "di riposo": un po' verso l'alto, per vedere gli schermi interi e il logo Reddoak
const PITCH_VICINO = 0.2; // davanti a uno stand: un po' verso l'alto, per vederlo tutto
const vista = { yaw: 0, pitch: pitchVista, yawArrivo: 0, pitchArrivo: pitchVista, fov: 68, fovArrivo: 68, fovBase: 68 };

function ridimensiona() {
  const w = Math.max(1, riquadro.clientWidth);
  const h = Math.max(1, riquadro.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const scelta = INQUADRATURE.find((q) => camera.aspect < q.finoA);
  vista.fovArrivo += scelta.fov - vista.fovBase;
  vista.fovBase = scelta.fov;
  vista.pitchArrivo += scelta.pitch - pitchVista;
  pitchVista = scelta.pitch;
  // l'inquadratura spostata verso l'alto, tenendo lo sguardo in piano
  if (scelta.sposta) camera.setViewOffset(w, h, 0, -scelta.sposta * h, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  daDisegnare = true;
}
window.addEventListener("resize", ridimensiona);
new ResizeObserver(ridimensiona).observe(riquadro);

let trascino = null;
let mosso = false;
canvas.addEventListener("pointerdown", (e) => {
  trascino = { x: e.clientX, y: e.clientY, vx: 0, t: performance.now() };
  mosso = false;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("presa");
});
canvas.addEventListener("pointermove", (e) => {
  if (!trascino) return;
  const dx = e.clientX - trascino.x;
  const dy = e.clientY - trascino.y;
  const ora = performance.now();
  const perPixel = THREE.MathUtils.degToRad(vista.fov) / riquadro.clientHeight;
  vista.yawArrivo += dx * perPixel;
  vista.pitchArrivo = THREE.MathUtils.clamp(vista.pitchArrivo + dy * perPixel, PITCH_MIN, PITCH_MAX);
  // velocità smorzata (radianti al millisecondo), usata per lo slancio al rilascio
  trascino.vx = trascino.vx * 0.6 + ((dx * perPixel) / Math.max(8, ora - trascino.t)) * 0.4;
  trascino.x = e.clientX;
  trascino.y = e.clientY;
  trascino.t = ora;
  if (Math.abs(dx) + Math.abs(dy) > 2 && !mosso) {
    mosso = true;
    $("suggerimento").classList.add("via");
  }
});
function rilascia() {
  if (!trascino) return;
  // un po' di slancio, mai più di un quinto di giro
  if (performance.now() - trascino.t < 60) vista.yawArrivo += THREE.MathUtils.clamp(trascino.vx * 220, -0.45, 0.45);
  trascino = null;
  canvas.classList.remove("presa");
}
canvas.addEventListener("pointerup", rilascia);
canvas.addEventListener("pointercancel", rilascia);
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    vista.fovArrivo = THREE.MathUtils.clamp(vista.fovArrivo + e.deltaY * 0.03, vista.fovBase - 24, vista.fovBase + 8);
  },
  { passive: false },
);

// ------------------------------------------------------------------ stanza
let dati = null;
let sfera = null; // la foto a 360°
let daDisegnare = true; // c'è qualcosa di nuovo da mostrare (foto arrivata, finestra ridimensionata…)
const ridisegna = () => (daDisegnare = true);
const punti = []; // { dati, posizione, yaw, pitch, bottone, voce }
let attivo = -1;

function avviso(testo) {
  const el = $("avviso");
  if (!testo) return el.classList.add("via");
  el.textContent = testo;
  el.classList.remove("via");
}

function carica(url, Caricatore) {
  return new Promise((ok, ko) => new Caricatore().load(url, ok, undefined, ko));
}

// La schermata di caricamento resta almeno il tempo di leggere il motto, poi scorre via verso l'alto.
const DURATA_MINIMA_CARICAMENTO = 900;
function fineCaricamento() {
  const el = $("caricamento");
  if (!el) return;
  const attesa = Math.max(0, DURATA_MINIMA_CARICAMENTO - performance.now());
  setTimeout(() => {
    el.classList.add("via");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 1200); // se l'animazione è disattivata
  }, attesa);
}

// foto a 360° di una vista (la hall o uno stand da vicino): caricata una volta, poi tenuta in memoria
const foto360 = new Map(); // file → promessa della foto
const pronte = new Map(); // file → foto già arrivata
let fotoMostrata = null; // quale foto (hall di giorno, di sera, uno stand) sta mostrando la sfera
function immagine(file) {
  if (!foto360.has(file)) {
    foto360.set(
      file,
      carica(`${CARTELLA}${file}?${dati.versione}`, THREE.TextureLoader).then(async (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        await t.image.decode?.().catch(() => {}); // la prepara in disparte, così quando compare non c'è uno scatto
        pronte.set(file, t);
        return t;
      }),
    );
  }
  return foto360.get(file);
}
// La foto arriva a tappe, dalla più leggera alla più nitida: prima un'anteprima piccola (un centinaio di KB,
// la stanza compare subito), poi quella a 4096, poi quella grande. Ognuna prende il posto della precedente
// appena è pronta. Sui telefoni o con schede grafiche piccole ci si ferma a quella a 4096.
function tappe(pano) {
  // "piccolo" = un telefono vero (si tocca con le dita e ha lo schermo stretto) o una scheda grafica che non regge
  // la foto grande. Una finestra stretta su un computer NON è piccola: lì la foto a 4096 si vedeva sfocata.
  const telefono = window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820;
  const piccolo = renderer.capabilities.maxTextureSize < pano.larghezza || telefono;
  const tutte = [pano.anteprima, pano.leggero, piccolo && pano.leggero ? null : pano.file].filter(Boolean);
  return tutte.length ? tutte : [pano.file];
}
function caricaFoto(pano) {
  const lista = tappe(pano);
  let da = 0; // si parte dalla migliore già arrivata
  lista.forEach((f, i) => pronte.has(f) && (da = i));
  (async () => {
    for (const f of lista.slice(da + 1)) {
      const nitida = await immagine(f).catch(() => null);
      if (nitida && fotoMostrata === pano && sfera) mostraFoto(pano, nitida);
    }
  })();
  return immagine(lista[da]);
}
function mostraFoto(pano, foto) {
  fotoMostrata = pano;
  const migliore = tappe(pano).reverse().map((f) => pronte.get(f)).find(Boolean) ?? foto;
  const prima = sfera.material.map;
  sfera.material.map = migliore;
  sfera.material.needsUpdate = true;
  // la tappa precedente della stessa foto non serve più: si libera la memoria della scheda grafica
  if (prima && prima !== migliore && tappe(pano).some((f) => pronte.get(f) === prima)) prima.dispose();
  daDisegnare = true;
}

// Il cielo fuori dalle vetrate segue l'ora di chi guarda: di giorno la foto chiara, dal tramonto all'alba quella
// con il cielo scuro (stessa stanza, renderizzata due volte). Le ore sono quelle medie in Italia, mese per mese.
// Per provare: aggiungere all'indirizzo ?cielo=sera oppure ?cielo=giorno
const ALBA = [8, 7, 6, 7, 6, 6, 6, 6, 7, 7, 7, 8];
const TRAMONTO = [17, 18, 18, 20, 20, 21, 21, 20, 19, 18, 17, 17];
function fotoDelMomento() {
  const forzato = new URLSearchParams(location.search).get("cielo");
  const adesso = new Date();
  const ora = adesso.getHours();
  const sera = forzato ? forzato === "sera" : ora >= TRAMONTO[adesso.getMonth()] || ora < ALBA[adesso.getMonth()];
  return sera && dati.momenti?.sera ? dati.momenti.sera : dati.panorama;
}

async function avvia() {
  ridimensiona();
  try {
    const r = await fetch(`${CARTELLA}stanza.json?${Date.now()}`);
    dati = await r.json();
  } catch {
    avviso("La stanza non è ancora stata esportata da Blender (npm run stanza:esporta).");
    fineCaricamento();
    return;
  }

  camera.position.fromArray(dati.camera.posizione);
  vista.yaw = vista.yawArrivo = dati.camera.yaw;

  const pano = fotoDelMomento();
  const foto = await caricaFoto(pano);

  const geo = new THREE.SphereGeometry(100, 96, 48);
  geo.scale(-1, 1, 1); // si guarda dall'interno
  sfera = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ map: null, toneMapped: false, depthTest: false, depthWrite: false, transparent: true }),
  );
  sfera.renderOrder = 999;
  sfera.position.copy(camera.position);
  sfera.rotation.y = -Math.PI / 2 + dati.camera.yaw; // il centro della foto è dove guarda Camera360
  scene.add(sfera);
  mostraFoto(pano, foto);

  creaPunti();
  creaSchermi();
  avviso(null);
  requestAnimationFrame(ciclo);
  mostraRotta(); // se l'indirizzo punta già a una pagina, la apre
  fineCaricamento();
  // a stanza pronta, con calma, si scaricano già le immagini delle schede: così «VAI!» le apre all'istante
  const dopo = window.requestIdleCallback ?? ((f) => setTimeout(f, 1500));
  dopo(() => {
    for (const id of Object.keys(progetti)) new Image().src = `/progetti/pagina-${id}.webp`;
  }, { timeout: 4000 });
}

// ------------------------------------------------------------------ punti cliccabili
// Bollino come su engine.land: un sigillo dentellato con «VAI!» e il nome del progetto che gli gira attorno.
const SIGILLO = (() => {
  const denti = 26;
  let d = "";
  for (let i = 0; i < denti * 2; i++) {
    const r = i % 2 ? 46.5 : 52;
    const a = (Math.PI * i) / denti;
    d += `${i ? "L" : "M"}${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
  }
  return d + "Z";
})();

function bollino(i, nome) {
  const parola = nome.toLowerCase(); // in minuscolo, come lo vuole l'utente
  const volte = Math.max(1, Math.round(46 / (parola.length + 3))); // quante volte il nome sta nel giro
  const scritta = `${parola} • `.repeat(volte);
  const sicura = scritta.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <defs><path id="giro-${i}" d="M100 100m-80 0a80 80 0 1 1 160 0a80 80 0 1 1-160 0" /></defs>
    <g class="giro"><text><textPath href="#giro-${i}" textLength="500" lengthAdjust="spacing">${sicura}</textPath></text></g>
    <path class="sigillo" d="${SIGILLO}" />
    <text class="vai-testo" x="100" y="101" text-anchor="middle" dominant-baseline="central" transform="rotate(-8 100 100)">VAI!</text>
    <text class="vai-testo scopri" x="100" y="101" text-anchor="middle" dominant-baseline="central" transform="rotate(-8 100 100)">SCOPRI</text>
  </svg>`;
}

function creaPunti() {
  const contenitore = $("punti");
  dati.hotspot.forEach((h, i) => {
    const p = progetti[h.id];
    const nome = p?.nome ?? h.titolo;
    const posizione = new THREE.Vector3().fromArray(h.posizione);
    const d = posizione.clone().sub(camera.position);

    const bottone = document.createElement("button");
    bottone.type = "button";
    bottone.className = "punto";
    bottone.style.setProperty("--c", p?.colore ?? "#FB0020");
    bottone.style.setProperty("--i", p?.inchiostro ?? "#ffffff");
    bottone.setAttribute("aria-label", `Scopri ${nome}`);
    bottone.innerHTML = bollino(i, nome);
    // dalla hall «VAI!» porta davanti allo stand; da vicino «SCOPRI» apre la pagina del progetto
    bottone.addEventListener("click", () => {
      vai(vistaCorrente === h.id || !dati.viste?.[h.id]?.panorama ? `/progetti/${h.id}/` : `/stand/${h.id}/`);
    });
    contenitore.append(bottone);

    punti.push({
      dati: h,
      progetto: p,
      nome,
      posizione,
      yaw: Math.atan2(-d.x, -d.z),
      pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)),
      bottone,
    });
  });
}

function differenza(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

// ------------------------------------------------------------------ schermi LED
// Esattamente sopra ogni schermo della foto a 360° (i 4 angoli arrivano da Blender) si ridisegna il logo, così
// resta nitido anche quando ci si avvicina con la rotellina.
const schermi = [];
const SBIANCA = new Set(["meraviglia", "mypushop", "mister-lavaggio"]); // loghi a colori da rendere bianchi
const LARGHEZZA_LOGO = { "quiz-patente": 0.5, "mister-lavaggio": 0.7 };

function logoBianco(img) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

function creaSchermi() {
  for (const d of dati.schermi ?? []) {
    const p = progetti[d.id];
    if (!p) continue;
    const tela = document.createElement("canvas");
    tela.width = 640;
    tela.height = 1024;
    const texture = new THREE.CanvasTexture(tela);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(d.angoli.flat(), 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const mesh = new THREE.Mesh(
      geo,
      // "transparent" serve solo a farlo disegnare dopo la foto (anch'essa trasparente, per le sfumature)
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, depthTest: false, depthWrite: false, side: THREE.DoubleSide, transparent: true }),
    );
    mesh.renderOrder = 1000; // sopra la foto
    mesh.visible = false; // compare quando il logo è caricato: fino ad allora resta lo schermo della foto
    scene.add(mesh);
    const s = {
      id: d.id,
      p,
      tela,
      ctx: tela.getContext("2d"),
      texture,
      mesh,
      logo: null,
      righe: [`${p.nome.toUpperCase()}  ✺  `, `${p.categoria.toUpperCase()}  ✺  `],
    };
    schermi.push(s);
    const img = new Image();
    img.onload = () => {
      s.logo = SBIANCA.has(d.id) ? logoBianco(img) : img;
      disegnaSchermo(s);
      mesh.visible = true;
    };
    img.src = `/progetti/logo-${d.id}.png`;
  }
}

function nastroSchermo(ctx, W, y, angolo, fondo, colore, testo) {
  const h = W * 0.125;
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.rotate(angolo);
  ctx.fillStyle = fondo;
  ctx.fillRect(-W, -h / 2, W * 2, h);
  ctx.fillStyle = colore;
  ctx.font = `900 ${Math.round(h * 0.56)}px "Geist Variable", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  const passo = ctx.measureText(testo).width || 1;
  for (let x = -W; x < W; x += passo) ctx.fillText(testo, x, h * 0.04);
  ctx.restore();
}

// Si disegna una volta sola, tutto fermo: il logo bianco sul colore del progetto e le due bande diagonali con
// nome e categoria. Le bande all'utente piacciono, ma quando scorrevano (e il logo "respirava") gli davano il
// mal di testa: niente movimento sugli schermi.
function disegnaSchermo(s) {
  if (!s.logo) return;
  const { ctx, tela, p } = s;
  const W = tela.width;
  const H = tela.height;
  ctx.fillStyle = p.colore;
  ctx.fillRect(0, 0, W, H);
  const lw = W * (LARGHEZZA_LOGO[s.id] ?? 0.78);
  const lh = (lw * s.logo.height) / s.logo.width;
  ctx.drawImage(s.logo, (W - lw) / 2, (H - lh) / 2, lw, lh);
  nastroSchermo(ctx, W, H * 0.17, -0.11, "#14110f", "#ffffff", s.righe[0]);
  nastroSchermo(ctx, W, H * 0.84, 0.09, "#ffffff", p.colore === "#F39A2E" ? "#12357A" : p.colore, s.righe[1]);
  s.texture.needsUpdate = true;
  daDisegnare = true;
}
// le scritte delle bande vanno ridisegnate quando il carattere del sito è arrivato
document.fonts?.load('900 40px "Geist Variable"').then(() => schermi.forEach(disegnaSchermo));

// ------------------------------------------------------------------ viste: la hall e ogni stand da vicino
let vistaCorrente = null; // null = la hall, altrimenti l'id dello stand davanti a cui ci si trova
let cambio = 0;

function orientaPunti() {
  punti.forEach((p) => {
    const d = p.posizione.clone().sub(camera.position);
    p.yaw = Math.atan2(-d.x, -d.z);
    p.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  });
}

function aggiornaCornice() {
  const davanti = punti.find((p) => p.dati.id === vistaCorrente) ?? punti[attivo];
  const voce = $("fondo-progetto");
  if (paginaAperta && progettoAperto) {
    // con una scheda aperta, in basso a sinistra c'è il progetto che viene dopo
    const dopo = prossimoProgetto(progettoAperto);
    voce.innerHTML = `Prossimo<span class="solo-largo">: ${progetti[dopo].nome}</span> →`;
    voce.href = `/progetti/${dopo}/`;
  } else if (davanti) {
    // in basso a sinistra: lo stand che si ha davanti. Dalla hall ci si avvicina, da vicino si apre la pagina
    voce.textContent = `${davanti.nome} →`;
    voce.href = vistaCorrente || !dati.viste?.[davanti.dati.id]?.panorama ? `/progetti/${davanti.dati.id}/` : `/stand/${davanti.dati.id}/`;
  }
  const indietro = $("indietro");
  indietro.hidden = !vistaCorrente && !paginaAperta;
  indietro.textContent = paginaAperta && vistaCorrente ? "← Torna allo stand" : "← Torna nella hall";
  indietro.href = paginaAperta && vistaCorrente ? `/stand/${vistaCorrente}/` : "/";
  document.body.classList.toggle("da-vicino", !!vistaCorrente);
}

// Passa a un'altra vista: la foto sfuma, ci si "sposta" e la nuova foto compare.
async function vaiAllaVista(id, subito = false) {
  const nuova = id && dati.viste?.[id]?.panorama ? id : null;
  if (nuova === vistaCorrente) return;
  const questo = ++cambio;
  const v = nuova ? dati.viste[nuova] : dati;
  if (!subito) {
    canvas.classList.add("velata");
    vista.fovArrivo = vista.fovBase - 22; // un passo avanti verso lo stand
  }
  const pano = nuova ? v.panorama : fotoDelMomento();
  const [foto] = await Promise.all([caricaFoto(pano), new Promise((ok) => setTimeout(ok, subito ? 0 : 300))]);
  if (questo !== cambio) return; // nel frattempo si è scelto un altro stand
  vistaCorrente = nuova;
  mostraFoto(pano, foto);
  camera.position.fromArray(v.camera.posizione);
  sfera.position.copy(camera.position);
  sfera.rotation.y = -Math.PI / 2 + v.camera.yaw;
  vista.yaw = vista.yawArrivo = v.camera.yaw;
  vista.pitch = vista.pitchArrivo = nuova ? PITCH_VICINO : pitchVista;
  vista.fov = vista.fovBase + 10;
  vista.fovArrivo = vista.fovBase;
  camera.fov = vista.fov;
  camera.updateProjectionMatrix();
  orientaPunti();
  if (!nuova) {
    // tornando nella hall si resta girati verso lo stand da cui si arriva
    const da = punti.find((p) => p.dati.id === id);
    if (da) vista.yaw = vista.yawArrivo = da.yaw;
    daDisegnare = true;
  }
  attivo = -1;
  aggiornaCornice();
  $("suggerimento").classList.add("via");
  canvas.classList.remove("velata");
  daDisegnare = true;
}

function vaiA(i) {
  const p = punti[(i + punti.length) % punti.length];
  if (!p) return;
  // con la vista frontale si va dritti al progetto, senza fare il giro da dietro
  vista.yawArrivo = dati.camera.sguardoBordo ? dati.camera.yaw + differenza(p.yaw, dati.camera.yaw) : vista.yaw + differenza(p.yaw, vista.yaw);
  vista.pitchArrivo = pitchVista;
  vista.fovArrivo = vista.fovBase;
  $("suggerimento").classList.add("via");
}

// Le frecce ai lati della hall: girano lo sguardo verso il progetto accanto (oltre l'ultimo si arriva a fine corsa).
$("chiudi-suggerimento").addEventListener("click", () => $("suggerimento").classList.add("via"));
const frecciaSinistra = $("va-sinistra");
const frecciaDestra = $("va-destra");
function gira(verso) {
  if (punti[attivo + verso]) vaiA(attivo + verso);
  else vista.yawArrivo -= verso * 0.6; // non c'è un altro progetto: fino al bordo, dove lo sguardo si ferma da solo
  $("suggerimento").classList.add("via");
}
frecciaSinistra.addEventListener("click", () => gira(-1));
frecciaDestra.addEventListener("click", () => gira(1));

// ------------------------------------------------------------------ pagine (progetti, chi siamo) e menu
const pagina = $("pagina");
// scorrendo una pagina il logo Reddoak in alto si fa da parte, così non copre quello che si legge
pagina.addEventListener("scroll", () => document.body.classList.toggle("scorsa", pagina.scrollTop > 60), { passive: true });
let paginaAperta = false;
let progettoAperto = null; // l'id del progetto di cui si sta guardando la scheda

function apriPagina(p) {
  pagina.innerHTML = p.html;
  const scheda = pagina.querySelector(".sk");
  if (scheda) avviaScheda(scheda); // numeri che salgono e animazione del progetto
  pagina.style.setProperty("--c", p.colore);
  pagina.style.setProperty("--i", p.inchiostro);
  pagina.hidden = false;
  pagina.scrollTop = 0;
  document.body.classList.remove("scorsa");
  document.body.classList.add("con-pagina");
  // lo stesso titolo che la pagina ha quando la si apre direttamente dal suo indirizzo (vite.config.js)
  document.title = progettoAperto ? `${p.titolo} · ${progetti[progettoAperto].categoria} | Reddoak` : `${p.titolo} · Reddoak, dal 2014 app e progetti digitali`;
  paginaAperta = true;
  aggiornaCornice();
  requestAnimationFrame(() => requestAnimationFrame(() => pagina.classList.add("aperta")));
}

function chiudiPagina() {
  if (!paginaAperta) return;
  paginaAperta = false;
  pagina.classList.remove("aperta");
  document.body.classList.remove("scorsa");
  document.body.classList.remove("con-pagina");
  aggiornaCornice();
  document.title = TITOLO_SITO;
  setTimeout(() => {
    if (!paginaAperta) pagina.hidden = true;
  }, 520);
}

// Ogni pagina ha un indirizzo vero: / (la hall), /progetti/<id>/ e /chi-siamo/. Sono indirizzi che i motori di
// ricerca contano come pagine separate (con il cancelletto di prima, #/progetto/<id>, no) e ognuno ha la sua
// pagina già scritta (vedi vite.config.js). Passando da uno all'altro però il sito NON si ricarica: si cambia
// l'indirizzo nella barra e si apre o chiude la scheda, con la stanza sempre lì dietro.
function vai(percorso) {
  if (percorso !== location.pathname) history.pushState(null, "", percorso + location.search);
  mostraRotta();
}
// i link interni (menu, logo, «Torna nella hall», «Prossimo»…) passano tutti da qui
document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[href^='/']");
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
  if (/\.[a-z0-9]+$/i.test(a.pathname)) return; // un file (immagine, llms.txt…): lo apre il browser
  e.preventDefault();
  vai(a.pathname);
});
window.addEventListener("popstate", () => mostraRotta()); // avanti e indietro del browser
// chi arriva con un indirizzo di prima (con il cancelletto) viene portato a quello nuovo
function daCancelletto() {
  if (!location.hash.startsWith("#/")) return false;
  const [tipo, id] = location.hash.slice(2).split("/");
  history.replaceState(null, "", (tipo === "progetto" && id ? `/progetti/${id}/` : tipo === "chi-siamo" ? "/chi-siamo/" : "/") + location.search);
  return true;
}
daCancelletto();
window.addEventListener("hashchange", () => daCancelletto() && mostraRotta());

function mostraRotta() {
  const [cartella, id] = location.pathname.split("/").filter(Boolean);
  const tipo = cartella === "progetti" ? "progetto" : cartella;
  chiudiMenu();
  progettoAperto = tipo === "progetto" && progetti[id] ? id : null;
  if (tipo === "progetto" && progetti[id]) {
    vaiAllaVista(id, true); // dietro la pagina c'è lo stand visto da vicino
    apriPagina(paginaProgetto(id));
  } else if (tipo === "stand" && progetti[id]) {
    chiudiPagina();
    vaiAllaVista(id);
  } else if (tipo === "chi-siamo") {
    apriPagina(paginaChiSiamo());
  } else {
    const da = vistaCorrente;
    chiudiPagina();
    vaiAllaVista(null).then(() => {
      const p = punti.find((q) => q.dati.id === da);
      if (p) vista.yaw = vista.yawArrivo = p.yaw;
      daDisegnare = true;
    });
  }
}

const menu = $("menu");
let nVoce = 0;
$("menu-voci").innerHTML = vociMenu()
  .map(
    ([gruppo, voci]) =>
      `<div class="menu-gruppo"><p class="menu-titolo">${gruppo}</p>${voci
        .map(([titolo, sotto, href]) => `<a href="${href}" style="--n:${nVoce++}"><b>${titolo}</b><span>${sotto}</span></a>`)
        .join("")}</div>`,
  )
  .join("");
function apriMenu() {
  menu.hidden = false;
  $("apri-menu").setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("aperto")));
}
function chiudiMenu() {
  if (menu.hidden) return;
  menu.classList.remove("aperto");
  $("apri-menu").setAttribute("aria-expanded", "false");
  setTimeout(() => {
    if (!menu.classList.contains("aperto")) menu.hidden = true;
  }, 460);
}
$("apri-menu").addEventListener("click", apriMenu);
$("chiudi-menu").addEventListener("click", chiudiMenu);
menu.addEventListener("click", (e) => {
  if (e.target.closest("a")) chiudiMenu(); // anche se la voce porta dove si è già
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!menu.hidden) chiudiMenu();
    else if (paginaAperta || vistaCorrente) vai($("indietro").getAttribute("href"));
  }
  if (!punti.length || paginaAperta || vistaCorrente || !menu.hidden) return;
  if (e.key === "ArrowRight") vaiA(attivo + 1);
  if (e.key === "ArrowLeft") vaiA(attivo - 1);
});

const proiezione = new THREE.Vector3();
const avanti = new THREE.Vector3();
function aggiornaPunti() {
  const w = riquadro.clientWidth;
  const h = riquadro.clientHeight;
  camera.getWorldDirection(avanti);
  let vicino = -1;
  let minimo = Infinity;
  punti.forEach((p, i) => {
    const distanza = Math.abs(differenza(p.yaw, vista.yaw));
    if (distanza < minimo) {
      minimo = distanza;
      vicino = i;
    }
    proiezione.copy(p.posizione).sub(camera.position);
    const davanti = proiezione.dot(avanti) > 0;
    proiezione.copy(p.posizione).project(camera);
    const visibile =
      davanti && Math.abs(proiezione.x) < 1.15 && Math.abs(proiezione.y) < 1.15 && (!vistaCorrente || vistaCorrente === p.dati.id);
    p.bottone.classList.toggle("nascosto", !visibile);
    if (visibile) {
      const x = (proiezione.x * 0.5 + 0.5) * w;
      const y = (-proiezione.y * 0.5 + 0.5) * h;
      p.bottone.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });
  if (vicino !== attivo) {
    attivo = vicino;
    punti.forEach((p, i) => p.bottone.classList.toggle("attivo", i === attivo));
    aggiornaCornice();
  }
}

// ------------------------------------------------------------------ ciclo
// A ogni fotogramma si controlla se lo sguardo deve ancora muoversi o se è arrivato qualcosa di nuovo: solo in
// quel caso si rifanno i conti e si ridisegna la stanza. Da fermi (o con una pagina aperta sopra) non si fa niente:
// prima la stanza veniva ridisegnata sessanta volte al secondo anche se non cambiava nulla.
const orologio = new THREE.Clock();
function ciclo() {
  requestAnimationFrame(ciclo);
  const dt = Math.min(orologio.getDelta(), 0.05);
  const k = 1 - Math.exp(-dt * 9); // quanto in fretta lo sguardo raggiunge il punto d'arrivo
  // Non ci si gira a 360°: si vede solo l'arco dei progetti. Blender dice fin dove si può vedere (sguardoBordo);
  // da lì si toglie metà della larghezza dell'inquadratura, così il bordo della vista non lo supera mai.
  let liberoSinistra = true;
  let liberoDestra = true;
  if (dati.camera.sguardoBordo && !vistaCorrente) {
    const metaLarghezza = Math.atan(Math.tan(THREE.MathUtils.degToRad(vista.fov) / 2) * camera.aspect);
    const limite = Math.max(0, dati.camera.sguardoBordo - metaLarghezza);
    vista.yawArrivo = THREE.MathUtils.clamp(vista.yawArrivo, dati.camera.yaw - limite, dati.camera.yaw + limite);
    // una freccia si spegne quando da quella parte lo sguardo è già arrivato in fondo
    liberoSinistra = dati.camera.yaw + limite - vista.yawArrivo > 0.03;
    liberoDestra = vista.yawArrivo - (dati.camera.yaw - limite) > 0.03;
  }
  if (frecciaSinistra.disabled === liberoSinistra) frecciaSinistra.disabled = !liberoSinistra;
  if (frecciaDestra.disabled === liberoDestra) frecciaDestra.disabled = !liberoDestra;

  const inMoto =
    Math.abs(vista.yawArrivo - vista.yaw) > 0.0002 || Math.abs(vista.pitchArrivo - vista.pitch) > 0.0002 || Math.abs(vista.fovArrivo - vista.fov) > 0.01;
  if (!inMoto && !daDisegnare) return;
  daDisegnare = false;

  vista.yaw += (vista.yawArrivo - vista.yaw) * k;
  vista.pitch += (vista.pitchArrivo - vista.pitch) * k;
  camera.rotation.set(vista.pitch, vista.yaw, 0);
  if (Math.abs(vista.fovArrivo - vista.fov) > 0.01) {
    vista.fov += (vista.fovArrivo - vista.fov) * k;
    camera.fov = vista.fov;
    camera.updateProjectionMatrix();
  }
  aggiornaPunti();
  renderer.render(scene, camera);
}

// per le prove: stato leggibile dalla console
window.__stanza = { vista, punti, camera, scene, renderer, vaiA, vaiAllaVista, ridisegna, get vistaCorrente() { return vistaCorrente; } };

avvia();
