// Fotografa i siti veri dei progetti: le immagini finiscono sugli schermi della stanza.
//   node blender/cattura_schermate.mjs
// Usa Google Chrome gia' installato sul Mac. Scrive blender/textures/schermata-<id>.png
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const QUI = path.dirname(fileURLToPath(import.meta.url));
const SITI = {
  meraviglia: "https://meraviglialab.com/",
  mypushop: "https://mypushop.com/",
  "quiz-patente": "https://apps.apple.com/it/app/quiz-patente-ufficiale-2024/id635361447",
  "mister-lavaggio": "https://www.misterlavaggio.com/",
  relatia: "https://relatiacrm.com/",
  reddoak: "https://reddoak.com/",
};
const solo = process.argv.slice(2);

// i banner dei cookie vengono solo nascosti nella foto: non si accetta niente
const NASCONDI = `
  #iubenda-cs-banner, .iubenda-cs-container, #CybotCookiebotDialog, #onetrust-consent-sdk,
  .cky-consent-container, .cky-overlay, #cookie-law-info-bar, .cc-window, .cmplz-cookiebanner,
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [aria-label*="cookie" i] { display: none !important; visibility: hidden !important; }
  html, body { overflow: auto !important; }
`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const [id, url] of Object.entries(SITI)) {
  if (solo.length && !solo.includes(id)) continue;
  const pagina = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "it-IT" });
  try {
    await pagina.goto(url, { waitUntil: "load", timeout: 45000 });
    await pagina.waitForTimeout(3500);
    await pagina.addStyleTag({ content: NASCONDI });
    await pagina.waitForTimeout(600);
    const file = path.join(QUI, "textures", `schermata-${id}.png`);
    await pagina.screenshot({ path: file });
    console.log("ok", id, await pagina.title());
  } catch (e) {
    console.log("ERRORE", id, e.message.split("\n")[0]);
  }
  await pagina.close();
}
await browser.close();
