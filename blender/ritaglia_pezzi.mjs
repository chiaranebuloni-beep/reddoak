// Ritaglia dalle pagine vere già catturate (public/progetti/pagina-<id>.webp, vedi cattura_vetrine.mjs) i pezzi
// che le schede dei progetti mostrano nella sezione delle immagini: public/progetti/pezzo-<id>-<n>.webp
// Ogni riga: [sinistra, alto, larghezza, altezza] in punti della pagina catturata (larga 1280).
// Per Quiz Patente si ritaglia solo lo schermo dell'app dalle immagini dell'App Store (senza lo sfondo arancione,
// che all'utente non piace): promo-quiz-patente-<n>-grande.webp, fatte da `node blender/cattura_vetrine.mjs --anteprime`
// Uso: node blender/ritaglia_pezzi.mjs
import sharp from "sharp";

const PEZZI = {
  meraviglia: [[170, 770, 940, 560], [140, 2050, 1000, 420], [120, 130, 1040, 560]],
  mypushop: [[50, 1650, 1180, 560], [120, 830, 1040, 370], [50, 400, 1180, 400]],
  "mister-lavaggio": [[0, 1880, 1280, 680], [80, 1230, 1120, 560], [60, 3900, 1160, 600]],
  relatia: [[60, 3790, 1160, 700], [60, 660, 1160, 400], [0, 2440, 1280, 370]],
};
const SCHERMI_APP = { "quiz-patente": [[2, [151, 652, 478, 1030]], [3, [151, 652, 478, 1030]], [4, [151, 652, 478, 1030]]] };

for (const [id, pezzi] of Object.entries(PEZZI)) {
  for (const [n, [left, top, width, height]] of pezzi.entries()) {
    await sharp(`public/progetti/pagina-${id}.webp`).extract({ left, top, width, height }).webp({ quality: 88 }).toFile(`public/progetti/pezzo-${id}-${n + 1}.webp`);
  }
  console.log(id, pezzi.length, "pezzi");
}
for (const [id, schermi] of Object.entries(SCHERMI_APP)) {
  for (const [n, [promo, [left, top, width, height]]] of schermi.entries()) {
    await sharp(`public/progetti/promo-${id}-${promo}-grande.webp`).extract({ left, top, width, height }).webp({ quality: 90 }).toFile(`public/progetti/pezzo-${id}-${n + 1}.webp`);
  }
  console.log(id, schermi.length, "schermate dell'app");
}

// L'immagine che compare quando si condivide la pagina di un progetto (1200 × 630): la cima del suo sito vero.
for (const id of [...Object.keys(PEZZI), ...Object.keys(SCHERMI_APP)]) {
  await sharp(`public/progetti/pagina-${id}.webp`).extract({ left: 0, top: 0, width: 1280, height: 672 }).resize(1200, 630).jpeg({ quality: 84, mozjpeg: true }).toFile(`public/progetti/og-${id}.jpg`);
}
console.log("immagini di condivisione dei progetti fatte");
