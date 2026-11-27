// Compone il contenuto dei 5 grandi schermi verticali della stanza: logo,
// schermata vera del sito (da cattura_schermate.mjs), frase e numeri del progetto.
//   node blender/crea_schermi.mjs
// Scrive blender/textures/schermo-<id>.png (1440×2304, cioe' 4 × 6,4 metri sul muro)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { progetti } from "../src/progetti.js";

const QUI = path.dirname(fileURLToPath(import.meta.url));
const TEX = path.join(QUI, "textures");
const font = pathToFileURL(
  path.join(QUI, "..", "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2"),
).href;
const img = (nome) => "data:image/png;base64," + fs.readFileSync(path.join(TEX, nome)).toString("base64");
const ritaglio = { "quiz-patente": "right top" }; // via la colonna laterale dell'App Store

// Sugli schermi compare SOLO il logo (richiesta dell'utente): bianco, grande, sul colore del progetto.
const LOGHI = {
  meraviglia: ["meraviglia.png", 78, true],
  mypushop: ["mypushop.png", 76, true],
  "quiz-patente": ["quiz-patente-ufficiale.png", 56, false], // e' l'icona dell'app: resta a colori
  "mister-lavaggio": ["mister-lavaggio.png", 72, true],
  relatia: ["relatia-bianco.png", 78, false], // e' gia' bianco
};

const pagina = (id, p) => {
  const [file, larghezza, sbianca] = LOGHI[id];
  return `<!doctype html><meta charset="utf-8"><style>
* { box-sizing: border-box; margin: 0; }
body { width: 1440px; height: 2304px; overflow: hidden; display: grid; place-items: center;
  background: linear-gradient(180deg, color-mix(in srgb, ${p.colore} 90%, #fff), ${p.colore} 42%, color-mix(in srgb, ${p.colore} 82%, #000)); }
img { width: ${larghezza}%; ${sbianca ? "filter: brightness(0) invert(1);" : "border-radius: 9%; box-shadow: 0 40px 100px rgba(0,0,0,.28);"} }
</style><img src="${img(file)}">`;
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const [id, p] of Object.entries(progetti)) {
  const pag = await browser.newPage({ viewport: { width: 1440, height: 2304 } });
  await pag.setContent(pagina(id, p), { waitUntil: "load" });
  await pag.evaluate(() => document.fonts.ready);
  await pag.screenshot({ path: path.join(TEX, `schermo-${id}.png`) });
  await pag.close();
  console.log("schermo", id);
}
await browser.close();

// le stesse schermate, alleggerite, servono anche alle pagine dei progetti sul sito
const { default: sharp } = await import("sharp");
const SITO = path.join(QUI, "..", "public", "progetti");
fs.mkdirSync(SITO, { recursive: true });
for (const id of Object.keys(progetti)) {
  await sharp(path.join(TEX, `schermata-${id}.png`)).resize(1440).webp({ quality: 82 }).toFile(path.join(SITO, `${id}.webp`));
}
console.log("schermate per il sito: public/progetti/");
