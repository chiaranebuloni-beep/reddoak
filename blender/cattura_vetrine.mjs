// Fotografa le pagine vere dei progetti per le schede del sito: la pagina intera vista da computer
// e da telefono (scorrono da sole dentro una finestra e un telefono in 3D). Per Quiz Patente, che è
// un'app, prende anche le immagini di presentazione dall'App Store.
//   node blender/cattura_vetrine.mjs            (tutti)      node blender/cattura_vetrine.mjs relatia   (uno)
// Usa Google Chrome già installato. Scrive public/progetti/pagina-<id>.webp e mobile-<id>.webp
import { chromium } from "playwright-core";
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const QUI = path.dirname(fileURLToPath(import.meta.url));
const DEST = path.join(QUI, "..", "public", "progetti");
const SITI = {
  meraviglia: "https://meraviglialab.com/",
  mypushop: "https://mypushop.com/",
  "quiz-patente": "https://apps.apple.com/it/app/quiz-patente-ufficiale-2024/id635361447",
  "mister-lavaggio": "https://www.misterlavaggio.com/",
  relatia: "https://relatiacrm.com/",
};
const solo = process.argv.slice(2);
// i banner dei cookie vengono solo nascosti nella foto: non si accetta niente
const NASCONDI = `
  #iubenda-cs-banner, .iubenda-cs-container, #CybotCookiebotDialog, #onetrust-consent-sdk,
  .cky-consent-container, .cky-overlay, #cookie-law-info-bar, .cc-window, .cmplz-cookiebanner,
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [aria-label*="cookie" i] { display: none !important; visibility: hidden !important; }
  html { scroll-behavior: auto !important; }
`;

async function pagina(browser, url, opzioni, altezzaMax) {
  const p = await browser.newPage(opzioni);
  await p.goto(url, { waitUntil: "load", timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.addStyleTag({ content: NASCONDI });
  // via anche i riquadri fissi che coprono la pagina (avviso dei cookie, invito a scaricare l'app): solo nella foto
  await p.evaluate(() => {
    for (const el of document.querySelectorAll("body *")) {
      const stile = getComputedStyle(el);
      if (stile.position !== "fixed" && stile.position !== "sticky") continue;
      const testo = (el.innerText || "").toLowerCase();
      if (/cookie|app store|google play|accetta/.test(testo) && el.getBoundingClientRect().top > 120) el.style.setProperty("display", "none", "important");
    }
  });
  // scorro fino in fondo: così si caricano le immagini e partono le animazioni "al passaggio"
  const alta = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(alta, altezzaMax); y += 500) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(220);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(900);
  const { width } = p.viewportSize();
  const foto = await p.screenshot({ fullPage: true, clip: undefined });
  const meta = await sharp(foto).metadata();
  const scala = meta.width / width;
  const taglio = Math.min(meta.height, Math.round(altezzaMax * scala));
  const img = sharp(foto).extract({ left: 0, top: 0, width: meta.width, height: taglio });
  return { p, img, altezza: Math.round(taglio / scala) };
}

const browser = await chromium.launch({ channel: "chrome", headless: true });

// "--anteprime": rifà solo le immagini di presentazione dell'app di Quiz Patente, a risoluzione tripla (quelle
// fatte insieme alla pagina sono piccole e, ingrandite, sgranate). Non tocca le pagine già catturate.
if (solo.includes("--anteprime")) {
  const id = "quiz-patente";
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3, locale: "it-IT" });
  await p.goto(SITI[id], { waitUntil: "load", timeout: 60000 });
  await p.waitForTimeout(3000);
  await p.addStyleTag({ content: NASCONDI });
  const immagini = await p.evaluate(() =>
    [...document.querySelectorAll("img, picture")]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
      })
      .filter((r) => r.w > 150 && r.h / r.w > 1.5 && r.h / r.w < 2.6),
  );
  const viste = [];
  for (const r of immagini) if (!viste.some((v) => Math.abs(v.x - r.x) < 20 && Math.abs(v.y - r.y) < 20)) viste.push(r);
  let n = 0;
  for (const r of viste.slice(0, 4)) {
    const foto = await p.screenshot({ fullPage: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    const m = await sharp(foto).metadata();
    await sharp(foto).webp({ quality: 90 }).toFile(path.join(DEST, `promo-${id}-${++n}-grande.webp`));
    console.log("  anteprima", n, `${m.width}×${m.height}`);
  }
  await browser.close();
  process.exit(0);
}

for (const [id, url] of Object.entries(SITI)) {
  if (solo.length && !solo.includes(id)) continue;
  try {
    const grande = await pagina(browser, url, { viewport: { width: 1440, height: 900 }, locale: "it-IT" }, 5200);
    await grande.img.resize(1280).webp({ quality: 80 }).toFile(path.join(DEST, `pagina-${id}.webp`));
    if (id === "quiz-patente") {
      // le immagini di presentazione dell'app: sono quelle alte e strette nella striscia delle anteprime
      const immagini = await grande.p.evaluate(() =>
        [...document.querySelectorAll("img, picture")]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
          })
          .filter((r) => r.w > 150 && r.h / r.w > 1.5 && r.h / r.w < 2.6),
      );
      const viste = [];
      for (const r of immagini) if (!viste.some((v) => Math.abs(v.x - r.x) < 20 && Math.abs(v.y - r.y) < 20)) viste.push(r);
      let n = 0;
      for (const r of viste.slice(0, 4)) {
        await grande.p.screenshot({ path: path.join(DEST, `_promo.png`), fullPage: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
        await sharp(path.join(DEST, `_promo.png`)).resize(520).webp({ quality: 84 }).toFile(path.join(DEST, `promo-${id}-${++n}.webp`));
      }
      console.log("  anteprime dell'app:", n);
    }
    await grande.p.close();
    const piccolo = await pagina(
      browser,
      url,
      { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "it-IT",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
      4200,
    );
    await piccolo.img.resize(600).webp({ quality: 80 }).toFile(path.join(DEST, `mobile-${id}.webp`));
    await piccolo.p.close();
    console.log("ok", id, `computer ${grande.altezza}px, telefono ${piccolo.altezza}px`);
  } catch (e) {
    console.log("ERRORE", id, e.message.split("\n")[0]);
  }
}
await browser.close();
