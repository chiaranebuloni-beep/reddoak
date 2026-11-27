// Configurazione di Vite. Oltre a far partire il sito, qui si prepara tutto quello che serve a farlo trovare:
//  - SEO (motori di ricerca): ogni pagina ha il suo indirizzo, titolo, descrizione, immagine di condivisione,
//    più robots.txt e sitemap.xml, e soprattutto i CONTENUTI VERI scritti dentro la pagina. Il sito è una stanza
//    in 3D disegnata dal computer di chi guarda: un motore di ricerca, da solo, vedrebbe una pagina vuota. Per
//    questo testi, numeri e link vengono scritti anche come normale pagina (sezione «contenuti», non visibile a
//    schermo ma letta da motori, AI e lettori di schermo).
//  - GEO (le risposte delle AI: ChatGPT, Gemini, Perplexity…): dati strutturati (chi è Reddoak, dove sta, quali
//    progetti ha) e un riassunto pensato per loro in /llms.txt.
// PAGINE: la hall (/), una per progetto (/progetti/<id>/) e /chi-siamo/. Sono tutte lo stesso sito (stessa
// stanza, stesso programma: src/main.js legge l'indirizzo e apre la scheda giusta), ma ognuna viene scritta come
// file a sé con la sua intestazione e i suoi contenuti: in locale al volo, nella versione da pubblicare dentro
// dist/ (dist/progetti/<id>/index.html, dist/chi-siamo/index.html).
// Tutto viene ricavato dagli stessi file dei testi del sito (src/progetti.js, src/schede-dati.js,
// src/reddoak.js): cambiando un testo lì, cambia anche qui. Niente da aggiornare a mano.
import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { progetti } from "./src/progetti.js";
import { schede } from "./src/schede-dati.js";
import { reddoak } from "./src/reddoak.js";

// L'indirizzo definitivo del sito (confermato dall'utente il 27/11/2026).
const SITO = "https://reddoak.com";
// Per adesso il sito è online su Vercel a un indirizzo provvisorio (….vercel.app). Finché è lì NON deve finire
// su Google: si avrebbe un doppione del sito con l'indirizzo sbagliato. Si capisce da solo: quando al progetto
// Vercel verrà collegato reddoak.com e il sito verrà ripubblicato, la porta ai motori di ricerca si apre.
const PROVVISORIO = !!process.env.VERCEL && !(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "").endsWith(new URL(SITO).hostname);

const pulito = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const accorcia = (t, n = 158) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n - 1)).replace(/[,;:.\s]+$/, "") + "…");
const numeri = (s) => (s.stats ?? []).map((st) => `${st.plain ?? st.n} ${st.unit} ${st.label}`.replace(/\s+/g, " ").trim());
const elenco = Object.entries(progetti).map(([id, p]) => ({ id, p, s: schede[id] ?? {}, percorso: `/progetti/${id}/` }));
const nomi = elenco.map(({ p }) => p.nome);
const eApp = ({ p, s }) => /^App/i.test(p.categoria) || /^App/i.test(s.tag ?? "");
const [via, citta] = reddoak.sede;

// ------------------------------------------------------------------ dati strutturati (schema.org)
const azienda = (completa) => ({
  "@type": "Organization",
  "@id": `${SITO}/#reddoak`,
  name: "Reddoak",
  url: `${SITO}/`,
  logo: `${SITO}/brand/reddoak-logo.svg`,
  ...(completa && {
    image: `${SITO}/og.jpg`,
    slogan: "Diamo vita alle tue idee",
    description: PAGINE["/"].descrizione,
    foundingDate: reddoak.anno,
    email: reddoak.email,
    telephone: reddoak.telefono[1].replace("tel:00", "+"),
    address: {
      "@type": "PostalAddress",
      streetAddress: via,
      postalCode: citta.match(/\d{5}/)?.[0],
      addressLocality: citta.replace(/\d{5}\s*/, "").replace(/\s*\(.*\)/, ""),
      addressRegion: citta.match(/\((\w+)\)/)?.[1],
      addressCountry: "IT",
    },
    brand: elenco.map(({ id }) => ({ "@id": `${SITO}/#${id}` })),
  }),
});
const marchio = (v) => ({
  "@type": eApp(v) ? ["Brand", "MobileApplication"] : "Brand",
  "@id": `${SITO}/#${v.id}`,
  name: v.p.nome,
  slogan: v.p.frase,
  description: v.s.desc ?? v.p.testo,
  url: v.p.url,
  mainEntityOfPage: `${SITO}${v.percorso}`,
  ...(eApp(v) && { applicationCategory: v.p.categoria, operatingSystem: "iOS, Android" }),
});
const sitoWeb = { "@type": "WebSite", "@id": `${SITO}/#sito`, url: `${SITO}/`, name: "Reddoak", inLanguage: "it", publisher: { "@id": `${SITO}/#reddoak` } };
const briciole = (...passi) => ({
  "@type": "BreadcrumbList",
  itemListElement: passi.map(([name, percorso], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITO}${percorso}` })),
});

// ------------------------------------------------------------------ i contenuti veri, come pagina normale
const sezione = (dentro) => `
    <section class="contenuti" id="contenuti" aria-label="Contenuti della pagina">${dentro}
    </section>`;
const schedaTesto = ({ id, p, s, percorso }, titolo = "h3") => `
      <article id="progetto-${id}">
        <${titolo}>${pulito(p.nome)}: ${pulito(p.frase)}</${titolo}>
        <p>${pulito(s.tag ?? p.categoria)}</p>
        <p>${pulito(s.desc ?? p.testo)}</p>
        ${numeri(s).length ? `<ul>${numeri(s).map((n) => `<li>${pulito(n)}</li>`).join("")}</ul>` : ""}
        ${(s.forza ?? []).length ? `<ul>${s.forza.map((f) => `<li>${pulito(f)}</li>`).join("")}</ul>` : ""}
        <p>${(s.bottoni ?? [{ testo: p.vai, url: p.url }]).map((b) => `<a href="${pulito(b.url)}" rel="noopener">${pulito(b.testo)}${b.testo.includes(p.nome) ? "" : ` · ${pulito(p.nome)}`}</a>`).join(" · ")}${titolo === "h3" ? ` · <a href="${percorso}">La scheda di ${pulito(p.nome)}</a>` : ""}</p>
      </article>`;
const contatti = () => `
      <h2>Contatti</h2>
      <address>
        Reddoak, ${reddoak.sede.map(pulito).join(", ")}.
        Telefono <a href="${pulito(reddoak.telefono[1])}">${pulito(reddoak.telefono[0])}</a>.
        Email <a href="mailto:${pulito(reddoak.email)}">${pulito(reddoak.email)}</a>.
      </address>
      <p>${pulito(reddoak.legale)} · <a href="${pulito(reddoak.privacy)}">Privacy policy</a></p>`;
const chiSiamoTesto = () => `
      <p>Reddoak nasce nel ${pulito(reddoak.anno)}. ${reddoak.storia.map(pulito).join(" ")}</p>
      <ul>${reddoak.valori.map(([t, d]) => `<li><strong>${pulito(t)}.</strong> ${pulito(d)}</li>`).join("")}</ul>`;
const numeriReddoak = () => `<ul>${reddoak.numeri.map(([n, cosa]) => `<li>${pulito(n)} ${pulito(cosa)}</li>`).join("")}</ul>`;

// ------------------------------------------------------------------ le pagine: indirizzo → intestazione, contenuti, dati
const PAGINE = {
  "/": {
    titolo: "Reddoak · Il quartier generale delle nostre app e dei nostri progetti digitali",
    descrizione: `Reddoak crea e fa crescere app e servizi digitali dal ${reddoak.anno}: ${nomi.slice(0, -1).join(", ")} e ${nomi.at(-1)}. Entra nel quartier generale e scopri i progetti.`,
    immagine: "/og.jpg",
    contenuti: () =>
      sezione(`
      <h1>Reddoak: app e progetti digitali usati da milioni di persone</h1>
      <p>${pulito(reddoak.storiaTitolo)} ${pulito(reddoak.titolo.join(" "))} ${pulito(reddoak.sottotitolo)}</p>
      ${numeriReddoak()}
      <h2>I progetti Reddoak</h2>${elenco.map((v) => schedaTesto(v)).join("")}
      <h2><a href="/chi-siamo/">Chi siamo</a></h2>${chiSiamoTesto()}${contatti()}`),
    dati: () => [
      azienda(true),
      sitoWeb,
      { "@type": "ItemList", name: "I progetti Reddoak", itemListElement: elenco.map(({ id, percorso }, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITO}${percorso}`, item: { "@id": `${SITO}/#${id}` } })) },
      ...elenco.map(marchio),
    ],
  },
  "/chi-siamo/": {
    titolo: "Chi siamo · Reddoak, dal 2014 app e progetti digitali",
    descrizione: accorcia(`${reddoak.storiaTitolo} ${reddoak.storia.join(" ")}`),
    immagine: "/og.jpg",
    contenuti: () =>
      sezione(`
      <p><a href="/">Reddoak</a> › Chi siamo</p>
      <h1>${pulito(reddoak.titolo.join(" "))}</h1>
      <p>${pulito(reddoak.sottotitolo)} ${pulito(reddoak.storiaTitolo)}</p>
      ${numeriReddoak()}
      <h2>La nostra storia</h2>${chiSiamoTesto()}
      <h2>I nostri progetti</h2>
      <ul>${elenco.map(({ p, percorso }) => `<li><a href="${percorso}">${pulito(p.nome)}</a>: ${pulito(p.categoria)}</li>`).join("")}</ul>${contatti()}`),
    dati: () => [azienda(true), sitoWeb, { "@type": "AboutPage", url: `${SITO}/chi-siamo/`, name: "Chi siamo", about: { "@id": `${SITO}/#reddoak` }, isPartOf: { "@id": `${SITO}/#sito` } }, briciole(["Reddoak", "/"], ["Chi siamo", "/chi-siamo/"])],
  },
};
for (const v of elenco) {
  PAGINE[v.percorso] = {
    titolo: `${v.p.nome} · ${v.p.categoria} | Reddoak`,
    descrizione: accorcia(`${v.p.frase} ${v.s.desc ?? v.p.testo}`),
    immagine: `/progetti/og-${v.id}.jpg`,
    contenuti: () =>
      sezione(`
      <p><a href="/">Reddoak</a> › Progetti › ${pulito(v.p.nome)}</p>${schedaTesto(v, "h1")}
      <h2>Gli altri progetti Reddoak</h2>
      <ul>${elenco.filter((x) => x !== v).map(({ p, percorso }) => `<li><a href="${percorso}">${pulito(p.nome)}</a>: ${pulito(p.categoria)}</li>`).join("")}</ul>
      <p><a href="/chi-siamo/">Chi siamo</a></p>`),
    dati: () => [
      azienda(false),
      sitoWeb,
      marchio(v),
      { "@type": "WebPage", url: `${SITO}${v.percorso}`, name: `${v.p.nome} · ${v.p.categoria}`, about: { "@id": `${SITO}/#${v.id}` }, isPartOf: { "@id": `${SITO}/#sito` }, inLanguage: "it" },
      briciole(["Reddoak", "/"], [v.p.nome, v.percorso]),
    ],
  };
}

// Scrive in una copia di index.html intestazione e contenuti della pagina che sta a quell'indirizzo.
function riempi(html, percorso) {
  const pg = PAGINE[percorso] ?? PAGINE["/"];
  const indirizzo = `${SITO}${PAGINE[percorso] ? percorso : "/"}`;
  const meta = (chi, cosa, valore) => `<meta ${chi}="${cosa}" content="${pulito(valore)}" />`;
  const testa = [
    ...(PROVVISORIO ? [meta("name", "robots", "noindex, nofollow")] : []),
    meta("name", "description", pg.descrizione),
    `<link rel="canonical" href="${indirizzo}" />`,
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", "Reddoak"),
    meta("property", "og:locale", "it_IT"),
    meta("property", "og:url", indirizzo),
    meta("property", "og:title", pg.titolo),
    meta("property", "og:description", pg.descrizione),
    meta("property", "og:image", `${SITO}${pg.immagine}`),
    meta("property", "og:image:width", "1200"),
    meta("property", "og:image:height", "630"),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", pg.titolo),
    meta("name", "twitter:description", pg.descrizione),
    meta("name", "twitter:image", `${SITO}${pg.immagine}`),
    `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": pg.dati() }).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
  return html
    .replace(/<title>.*?<\/title>/, `<title>${pulito(pg.titolo)}</title>`)
    .replace("<!-- testa -->", testa)
    .replace("<!-- contenuti -->", pg.contenuti());
}

// ------------------------------------------------------------------ i file per motori e AI
const robots = () => (PROVVISORIO ? `User-agent: *\nDisallow: /\n` : `User-agent: *\nAllow: /\n\nSitemap: ${SITO}/sitemap.xml\n`);
const sitemap = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(PAGINE)
    .map((p) => `  <url><loc>${SITO}${p}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;
// llms.txt: un riassunto in testo semplice pensato per le AI che rispondono alle domande delle persone
const llms = () => `# Reddoak

> ${PAGINE["/"].descrizione}

Reddoak è un'azienda italiana fondata nel ${reddoak.anno}, con sede in ${reddoak.sede.join(", ")}. ${reddoak.storia.join(" ")}

## In numeri
${reddoak.numeri.map(([n, cosa]) => `- ${n} ${cosa}`).join("\n")}

## Progetti
${elenco
  .map(({ p, s, percorso }) => `- [${p.nome}](${SITO}${percorso}): ${p.categoria}. ${p.frase} ${s.desc ?? p.testo}${numeri(s).length ? ` Numeri: ${numeri(s).join("; ")}.` : ""} Sito ufficiale: ${p.url}`)
  .join("\n")}

## Valori
${reddoak.valori.map(([t, d]) => `- ${t}: ${d}`).join("\n")}

## Pagine
- [La hall con tutti i progetti](${SITO}/)
- [Chi siamo](${SITO}/chi-siamo/)

## Contatti
- Email: ${reddoak.email}
- Telefono: ${reddoak.telefono[0]}
- Indirizzo: ${reddoak.sede.join(", ")}, Italia
`;
const FILE = { "/robots.txt": [robots, "text/plain"], "/sitemap.xml": [sitemap, "application/xml"], "/llms.txt": [llms, "text/plain"] };

function trovabile() {
  let costruzione = false;
  return {
    name: "reddoak-trovabile",
    configResolved(c) {
      costruzione = c.command === "build";
    },
    // in locale ogni indirizzo riceve al volo la sua pagina; nella costruzione i segnaposto restano e si riempiono dopo
    transformIndexHtml(html, ctx) {
      if (costruzione) return html;
      const percorso = (ctx.originalUrl ?? "/").split(/[?#]/)[0].replace(/\/?$/, "/");
      return riempi(html, percorso);
    },
    // in locale i tre file si leggono allo stesso indirizzo che avranno online
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const voce = FILE[req.url?.split("?")[0]];
        if (!voce) return next();
        res.setHeader("Content-Type", `${voce[1]}; charset=utf-8`);
        res.end(voce[0]());
      });
    },
    generateBundle() {
      for (const [nome, [crea]] of Object.entries(FILE)) this.emitFile({ type: "asset", fileName: nome.slice(1), source: crea() });
    },
    closeBundle() {
      if (!costruzione || !fs.existsSync("dist/index.html")) return;
      // una pagina scritta per ogni indirizzo, partendo da quella costruita
      const base = fs.readFileSync("dist/index.html", "utf8");
      for (const percorso of Object.keys(PAGINE)) {
        const cartella = path.join("dist", percorso);
        fs.mkdirSync(cartella, { recursive: true });
        fs.writeFileSync(path.join(cartella, "index.html"), riempi(base, percorso));
      }
      console.log(`pagine scritte: ${Object.keys(PAGINE).join("  ")}`);
      // il modello 3D della stanza (70 MB) e il suo cielo servivano solo al vecchio «3D dal vivo»: non vanno online
      for (const f of ["dist/stanza/stanza.glb", "dist/stanza/cielo.jpg"]) fs.rmSync(f, { force: true });
    },
  };
}

export default defineConfig({
  plugins: [trovabile()],
  build: { target: "es2022" },
});
