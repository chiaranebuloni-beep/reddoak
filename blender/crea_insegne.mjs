// Prepara le immagini delle insegne luminose (logo centrato su fondo bianco).
// Per cambiare un'insegna basta sostituire il PNG in blender/textures e riesportare.
import sharp from "sharp";

const T = new URL("./textures/", import.meta.url).pathname;
const insegne = [
  ["meraviglia", "meraviglia.png", 1760, 720, 0.74, 0.5],
  ["mypushop", "mypushop.png", 1760, 720, 0.74, 0.5],
  ["quiz-patente", "quiz-patente-ufficiale.png", 1760, 720, 0.8, 0.82],
  ["mister-lavaggio", "mister-lavaggio.png", 1760, 720, 0.74, 0.74],
  ["relatia", "relatia-scuro.png", 1760, 720, 0.7, 0.5],
  ["reddoak", "reddoak-logo.png", 2040, 660, 0.72, 0.5],
];

for (const [id, file, W, H, fw, fh] of insegne) {
  const logo = await sharp(T + file)
    .resize({ width: Math.round(W * fw), height: Math.round(H * fh), fit: "inside" })
    .toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(`${T}insegna-${id}.png`);
  console.log("insegna-" + id + ".png");
}
