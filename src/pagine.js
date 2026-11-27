// Le pagine che si aprono dentro il riquadro, sopra la stanza:
// una per ogni progetto (/progetti/<id>/) e «Chi siamo» (/chi-siamo/).
import { progetti } from "./progetti.js";
import { reddoak } from "./reddoak.js";
import { htmlScheda } from "./schede.js";

const pulito = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const cifre = (lista) =>
  lista.length
    ? `<ul class="cifre">${lista.map(([n, cosa]) => `<li><b>${pulito(n)}</b><span>${pulito(cosa)}</span></li>`).join("")}</ul>`
    : "";

// scritta gigante che scorre (come il «Cambiamo le regole del gioco» del primo sito Reddoak)
const scorre = (frasi) => {
  const pezzo = frasi.map((f) => `<span>${pulito(f)}</span><i>✺</i>`).join("");
  return `<div class="scorre" aria-hidden="true"><div>${pezzo.repeat(6)}</div></div>`;
};

// Scheda di un progetto: è fatta in src/schede.js, uguale a quelle del sito Reddoak 2.
export function paginaProgetto(id) {
  return htmlScheda(id);
}

export function paginaChiSiamo() {
  const r = reddoak;
  return {
    titolo: "Chi siamo",
    colore: "#FB0020",
    inchiostro: "#ffffff",
    html: `
      <article class="foglio foglio-chi">
        <header class="testata">
          <p class="occhiello">Chi siamo</p>
          <h1 class="titolone">${r.titolo.map((riga) => `<span><b>${pulito(riga)}</b></span>`).join("")}</h1>
          <p class="sommario">${pulito(r.sottotitolo)}</p>
        </header>
        ${cifre(r.numeri)}
        ${scorre(r.nastro)}
        <div class="chiaro-fascia">
          <section class="storia">
            <div class="storia-anno"><p class="occhiello">Dal</p><p class="anno">${pulito(r.anno)}</p></div>
            <div class="storia-testo">
              <h2>${pulito(r.storiaTitolo)}</h2>
              ${r.storia.map((t) => `<p>${pulito(t)}</p>`).join("")}
            </div>
          </section>
          <section class="valori">
            ${r.valori
              .map(([nome, testo], i) => `<article><i class="nastro-adesivo"></i><span>0${i + 1}</span><h3>${pulito(nome)}</h3><p>${pulito(testo)}</p></article>`)
              .join("")}
          </section>
        </div>
        <footer class="saluto" id="contatti">
          <h2>${r.saluto.map(pulito).join("<br />")}</h2>
          <dl>
            <dt>Scrivici</dt><dd><a href="mailto:${r.email}">${r.email}</a></dd>
            <dt>Chiamaci</dt><dd><a href="${r.telefono[1]}">${pulito(r.telefono[0])}</a></dd>
            <dt>Passa a trovarci</dt><dd>${r.sede.map(pulito).join(" – ")}</dd>
          </dl>
          <img class="scritta-reddoak" src="/brand/reddoak-wordmark.svg" alt="reddoak" />
          <p class="legale"><span>${pulito(r.legale)}</span><a href="${r.privacy}" target="_blank" rel="noopener">Privacy policy</a></p>
        </footer>
      </article>`,
  };
}

// Voci del menu a tutto schermo, divise in due gruppi: i progetti e Reddoak.
// Ogni voce è [titolo, sottotitolo, indirizzo]. (La voce «La hall» è stata tolta: non serviva.)
export function vociMenu() {
  return [
    ["I progetti", Object.entries(progetti).map(([id, p]) => [p.nome, p.categoria, `/progetti/${id}/`])],
    [
      "Reddoak",
      [
        ["Chi siamo", "Scopri Reddoak", "/chi-siamo/"],
        ["Contatti", reddoak.email, `mailto:${reddoak.email}`],
      ],
    ],
  ];
}
