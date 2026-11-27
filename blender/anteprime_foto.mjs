// Dopo ogni esportazione da Blender: prepara per il sito le versioni piccole delle foto a 360°.
//  - per ogni foto della stanza, un'anteprima leggerissima (public/stanza/<nome>-anteprima.jpg): il sito la
//    mostra per prima, così la stanza compare subito, e poi la sostituisce con quelle nitide;
//    il nome viene scritto in stanza.json (campo "anteprima")
//  - l'immagine che compare quando il sito viene condiviso (public/og.jpg, 1200 × 630): la vista sugli schermi
// Lo lanciano da soli `npm run stanza:esporta`, `stanza:sera` e `stanza:bozza`.  Uso: node blender/anteprime_foto.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CARTELLA = "public/stanza";
const dati = JSON.parse(fs.readFileSync(path.join(CARTELLA, "stanza.json"), "utf8"));
const foto = [dati.panorama, ...Object.values(dati.momenti ?? {}), ...Object.values(dati.viste ?? {}).map((v) => v.panorama)].filter((f) => f?.file);

for (const f of foto) {
  const nome = f.file.replace(/\.jpg$/, "-anteprima.jpg");
  await sharp(path.join(CARTELLA, f.file), { limitInputPixels: false }).resize(1536).jpeg({ quality: 68, mozjpeg: true }).toFile(path.join(CARTELLA, nome));
  f.anteprima = nome;
  console.log(nome, Math.round(fs.statSync(path.join(CARTELLA, nome)).size / 1024), "KB");
}
fs.writeFileSync(path.join(CARTELLA, "stanza.json"), JSON.stringify(dati, null, 2));

// la vista di chi entra: la fascia centrale della foto di giorno, dove ci sono gli schermi
const { width, height } = await sharp(path.join(CARTELLA, dati.panorama.file), { limitInputPixels: false }).metadata();
const larga = Math.round(width * 0.3);
const alta = Math.round((larga * 630) / 1200);
await sharp(path.join(CARTELLA, dati.panorama.file), { limitInputPixels: false })
  .extract({ left: Math.round((width - larga) / 2), top: Math.round(height * 0.448 - alta / 2), width: larga, height: alta })
  .resize(1200, 630)
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile("public/og.jpg");
console.log("og.jpg", Math.round(fs.statSync("public/og.jpg").size / 1024), "KB");
