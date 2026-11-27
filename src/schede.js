// Le schede dei progetti (si aprono con «VAI!»), «a riquadri» come l'esempio scelto dall'utente: su fondo bianco,
// etichetta e titolo al centro e sotto una griglia di tessere. Una schermata sola con dentro tutto.
//   1. il sito vero che scorre, con il logo in alto e davanti l'elemento animato (il quiz, le liste «in diretta»)
//   2. grigia: il testo completo e i pulsanti
//   3. nel colore del progetto: il numero che conta di più
//   4. nera: gli altri numeri
// Testi e colori sono in src/schede-dati.js, lo stile in src/schede.css. Le versioni di prima sono in src/vecchie/.
import { progetti } from "./progetti.js";
import { schede } from "./schede-dati.js";

const stringi = (v, a, b) => Math.min(b, Math.max(a, v));
const fermo = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pulito = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ------------------------------------------------------------------ l'elemento animato davanti al sito
// Un pezzo di interfaccia che racconta il progetto.
const DOMANDE = [
  ["Il segnale preannuncia una strada che si restringe da entrambi i lati.", true,
    '<path d="M50 8 94 84H6z" fill="#fff" stroke="#d9141f" stroke-width="9" stroke-linejoin="round"/><path d="M39 74V61q0-7 6-12V37M61 74V61q0-7-6-12V37" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/>'],
  ["Il segnale vieta sia la fermata sia la sosta dei veicoli.", false,
    '<circle cx="50" cy="48" r="38" fill="#1c56b8" stroke="#d9141f" stroke-width="9"/><path d="M24 22 76 74" stroke="#d9141f" stroke-width="9"/>'],
  ["Il segnale obbliga a fermarsi e a dare la precedenza.", true,
    '<path d="M32 6h36l26 26v32L68 90H32L6 64V32z" fill="#d9141f" stroke="#fff" stroke-width="4"/><text x="50" y="57" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">STOP</text>'],
];
// meravigliä: canale, tipo di campagna e migliaia di persone raggiunte alla partenza
const CAMPAGNE = [["IG", "Instagram", "Reel sponsorizzato", 18.4], ["FB", "Facebook", "Campagna locale", 12.1], ["TT", "TikTok", "Video", 9.6], ["G", "Google", "Ricerca", 7.3]];

// Le liste «in diretta» (lo stile che piace all'utente, nato per Relatia): quattro righe che a turno avanzano di
// una fase; alla terza il numero in fondo sale e al giro dopo la riga lascia il posto alla voce successiva.
const iniziali = (nome) => nome.split(" ").map((x) => x[0]).join("").slice(0, 2);
const migliaia = (n) => String(n).replace(/\B(?=(\d{3})+$)/g, ".");
const LISTE = {
  relatia: {
    classe: "",
    titolo: "Contatti",
    piede: "Clienti fedeli",
    parte: 128,
    sale: 1,
    voci: [["Giulia R.", "Meta"], ["Marco B.", "Sito web"], ["Sara T.", "Form"], ["Luca P.", "Instagram"], ["Elena V.", "Google Ads"], ["Paolo D.", "Excel"]],
    riga: ([nome, da]) => `<b>${nome}</b>da ${da}`,
    etichetta: (v, fase) => ["Nuovo", "In trattativa", "Cliente"][fase],
  },
  // i negozi sotto casa: l'offerta viene salvata e il cliente entra in negozio
  mypushop: {
    classe: "pr-negozi",
    titolo: "Vicino a te",
    piede: "Clienti in negozio oggi",
    parte: 128,
    sale: 1,
    voci: [["Panificio Rosa", 120, "-20% oggi"], ["Fiorista Lia", 250, "Novità"], ["Libreria Blu", 400, "2 × 1"], ["Gelateria Polo", 90, "-15% oggi"], ["Enoteca Mille", 180, "-10% oggi"], ["Ottica Viva", 310, "Saldi"]],
    riga: ([nome, metri]) => `<b>${nome}</b>a ${metri} m`,
    etichetta: (v, fase) => [v[2], "♥ Salvata", "In negozio"][fase],
  },
  // i lavaggi a domicilio della giornata; ogni auto lavata risparmia circa 86 litri (3 milioni di litri su 35 mila auto)
  "mister-lavaggio": {
    classe: "pr-lavaggi",
    titolo: "Lavaggi di oggi",
    piede: "Litri d'acqua risparmiati",
    parte: 1290,
    sale: 86,
    voci: [["Marta G.", "SUV · sotto casa"], ["Davide L.", "Berlina · in ufficio"], ["Silvia C.", "City car · a casa"], ["Andrea M.", "SUV · in azienda"], ["Irene C.", "Utilitaria · a casa"], ["Fabio N.", "Berlina · al lavoro"]],
    riga: ([nome, dove]) => `<b>${nome}</b>${dove}`,
    etichetta: (v, fase) => ["In arrivo", "Lavaggio", "Fatto ✓"][fase],
  },
};
const htmlLista = (c) => `
    <div class="vt-primo pr-lead ${c.classe}">
      <p class="pr-riga"><span><b>${c.titolo}</b></span><em>in diretta</em></p>
      <ul class="ld-lista">${c.voci.slice(0, 4)
        .map((v, k) => `<li data-fase="${k % 3}"><i>${iniziali(v[0])}</i><span>${c.riga(v)}</span><u>${c.etichetta(v, k % 3)}</u></li>`)
        .join("")}</ul>
      <p class="ld-piede">${c.piede} <b class="ld-n">${migliaia(c.parte)}</b></p>
    </div>`;
function listaViva(el, c) {
  const righe = [...el.querySelectorAll(".ld-lista li")];
  const conta = el.querySelector(".ld-n");
  const voce = righe.map((_, k) => k);
  const fase = righe.map((_, k) => k % 3);
  let totale = c.parte;
  let prossima = righe.length;
  let ultimo = -1;
  ciclo(el, 1700, (p) => {
    const giro = Math.floor(performance.now() / 1700);
    if (giro === ultimo || p > 0.5) return;
    ultimo = giro;
    const k = giro % righe.length;
    if (fase[k] === 2) {
      voce[k] = prossima++ % c.voci.length;
      righe[k].querySelector("i").textContent = iniziali(c.voci[voce[k]][0]);
      righe[k].querySelector("span").innerHTML = c.riga(c.voci[voce[k]]);
      fase[k] = 0;
    } else if (++fase[k] === 2) conta.textContent = migliaia((totale += c.sale));
    righe[k].dataset.fase = String(fase[k]);
    righe[k].querySelector("u").textContent = c.etichetta(c.voci[voce[k]], fase[k]);
    righe[k].classList.remove("mosso");
    void righe[k].offsetWidth;
    righe[k].classList.add("mosso");
  });
}

const PRIMO_PIANO = {
  // una domanda del quiz, con il segnale e la risposta giusta che si accende
  "quiz-patente": () => `
    <div class="vt-primo pr-quiz">
      <p class="pr-riga"><span>Domanda <b class="q-n">12</b>/30</span><em class="q-tempo">08:14</em></p>
      <svg class="q-segnale" viewBox="0 0 100 96"></svg>
      <p class="q-testo"></p>
      <p class="q-risposte"><span class="q-v">Vero</span><span class="q-f">Falso</span></p>
      <p class="q-punti">${"<i></i>".repeat(10)}</p>
    </div>`,
  "mister-lavaggio": () => htmlLista(LISTE["mister-lavaggio"]),
  mypushop: () => htmlLista(LISTE.mypushop),
  relatia: () => htmlLista(LISTE.relatia),
  // le campagne sui social, con le persone raggiunte che salgono
  meraviglia: () => `
    <div class="vt-primo pr-lead pr-campagne">
      <p class="pr-riga"><span><b>Campagne</b></span><em>in diretta</em></p>
      <ul class="ld-lista">${CAMPAGNE.map(([sigla, canale, tipo]) => `<li><i>${sigla}</i><span><b>${canale}</b>${tipo}</span><u></u><s><b></b></s></li>`).join("")}</ul>
      <p class="ld-piede">Persone raggiunte <b class="ld-n"></b></p>
    </div>`,
};

// ------------------------------------------------------------------ la scheda
// Un numero che gira come un contatore: ogni cifra è una colonna con 0-9 ripetuto quattro volte, che all'apertura
// scorre e si ferma sulla cifra giusta (lo stile è in schede.css, «i numeri che girano»).
const COLONNA = "0123456789".repeat(4).split("").map((c) => `<span>${c}</span>`).join("");
function numero(st) {
  const testo = String(st.plain ?? st.n);
  let k = 0;
  const cifre = [...testo]
    .map((c) => (/\d/.test(c) ? `<span class="rl" style="--d:${c};--k:${k++}"><span class="rl-n">${COLONNA}</span></span>` : `<span>${pulito(c)}</span>`))
    .join("");
  return `<b class="giri" role="img" aria-label="${pulito(testo)}">${cifre}</b><i>${pulito(st.unit)}</i>`;
}

// A riquadri, come nell'esempio dell'utente: etichetta e titolo al centro, sotto quattro tessere.
//   1. il sito vero che scorre, con il logo in alto e davanti l'elemento animato (il quiz, le liste)
//   2. grigia: il testo completo e i pulsanti
//   3. nel colore del progetto: il numero che conta di più
//   4. nera: gli altri numeri
// Chi non ha numeri (Relatia) mette nelle ultime due i suoi punti di forza.
function riquadri(id, s, x) {
  const [primo, ...altri] = s.stats ?? [];
  const colore = primo
    ? `<p class="bq-etichetta">${pulito(primo.label)}</p><p class="bq-numero">${numero(primo)}</p>`
    : `<p class="bq-etichetta">In breve</p><p class="bq-parola">${pulito(s.forza[0])}</p>`;
  const nero = primo
    ? altri.map((st) => `<li><span>${pulito(st.label)}</span><p>${numero(st)}</p></li>`).join("")
    : s.forza.slice(1).map((f) => `<li><p class="parola">${pulito(f)}</p></li>`).join("");
  return `
        <header class="bq-testa">
          <p class="sk-tag"><b>${x.posto}</b>${pulito(s.tag)}</p>
          <div class="bq-marchio">${x.logo}</div>
          <h1 class="bq-claim">${x.claim}</h1>
        </header>
        <div class="bq-griglia">
          <section class="bq-t bq-sito">
            <img class="bq-pagina" src="/progetti/pagina-${id}.webp" alt="" />
            <div class="bq-logo" aria-hidden="true">${x.logo}</div>
            <div class="bq-davanti" aria-hidden="true">${PRIMO_PIANO[id]?.() ?? ""}</div>
          </section>
          <section class="bq-t bq-grigio">
            <p class="bq-etichetta">Il progetto</p>
            <p class="bq-desc">${pulito(s.desc)}</p>
            <p class="sk-azioni">${x.pulsanti}</p>
          </section>
          <section class="bq-t bq-colore">${colore}</section>
          <ul class="bq-t bq-nero">${nero}</ul>
        </div>`;
}

export function htmlScheda(id) {
  const p = progetti[id];
  const s = schede[id];
  if (!p || !s) return null;
  const ids = Object.keys(progetti);
  const x = {
    posto: String(ids.indexOf(id) + 1).padStart(2, "0"),
    claim: s.claim
      .map((c) => (c === "br" ? "<br />" : c === "heart" ? '<span class="sk-cuore">♥</span>' : c.em ? `<em>${pulito(c.em)}</em>` : pulito(c)))
      .join(""),
    logo: s.logo.scritta
      ? `<div class="sk-logo con-scritta"><img src="${s.logo.src}" alt="" /><span>${pulito(s.logo.scritta[0])}<br /><b>${pulito(s.logo.scritta[1])}</b></span></div>`
      : `<div class="sk-logo"><img src="${s.logo.src}" alt="${pulito(p.nome)}" /></div>`,
    pulsanti: s.bottoni
      .map((b) => `<a class="sk-bottone${b.vuoto ? " vuoto" : ""}" href="${pulito(b.url)}" target="_blank" rel="noopener noreferrer">${pulito(b.testo)} <span aria-hidden="true">↗</span></a>`)
      .join(""),
  };
  return {
    titolo: p.nome,
    colore: "#ffffff",
    inchiostro: "#14110f",
    html: `
      <article class="sk bq" data-id="${id}" style="--a:${s.accento};--a2:${s.secondo}">
        ${riquadri(id, s, x)}
      </article>`,
  };
}

// ------------------------------------------------------------------ animazioni
// Chiama frame(p) a ogni fotogramma finché l'elemento è nella pagina; p va da 0 a 1 e ricomincia ogni "durata" ms.
function ciclo(el, durata, frame) {
  const inizio = performance.now();
  const passo = (t) => {
    if (!el.isConnected) return;
    frame(fermo() ? 0.7 : ((t - inizio) % durata) / durata);
    requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

const VIVI = {
  "quiz-patente"(el) {
    const segnale = el.querySelector(".q-segnale");
    const testo = el.querySelector(".q-testo");
    const numero = el.querySelector(".q-n");
    const tempo = el.querySelector(".q-tempo");
    const punti = [...el.querySelectorAll(".q-punti i")];
    let ora = -1;
    ciclo(el, 12000, (p) => {
      const i = Math.min(2, Math.floor(p * 3));
      const dentro = (p * 3) % 1;
      if (i !== ora) {
        ora = i;
        segnale.innerHTML = DOMANDE[i][2];
        testo.textContent = DOMANDE[i][0];
        numero.textContent = String(12 + i);
        el.classList.remove("risposta-vero", "risposta-falso");
      }
      el.classList.toggle("cambia", dentro < 0.08 || dentro > 0.95);
      const risposto = dentro > 0.55;
      el.classList.toggle("risposta-vero", risposto && DOMANDE[i][1]);
      el.classList.toggle("risposta-falso", risposto && !DOMANDE[i][1]);
      punti.forEach((pt, k) => pt.classList.toggle("ok", k < 5 + i + (risposto ? 1 : 0)));
      const secondi = 494 - Math.floor(p * 36);
      tempo.textContent = `0${Math.floor(secondi / 60)}:${String(secondi % 60).padStart(2, "0")}`;
    });
  },
  "mister-lavaggio": (el) => listaViva(el, LISTE["mister-lavaggio"]),
  mypushop: (el) => listaViva(el, LISTE.mypushop),
  relatia: (el) => listaViva(el, LISTE.relatia),
  meraviglia(el) {
    const righe = [...el.querySelectorAll(".ld-lista li")];
    const conta = el.querySelector(".ld-n");
    const mille = CAMPAGNE.map((c) => c[3]);
    let ultimo = -1;
    const disegna = () => {
      righe.forEach((r, k) => {
        r.querySelector("u").textContent = `+${mille[k].toFixed(1).replace(".0", "").replace(".", ",")}k`;
        r.querySelector("s b").style.transform = `scaleX(${(mille[k] / (mille[k] + 9)).toFixed(3)})`;
      });
      conta.textContent = Math.round(mille.reduce((a, b) => a + b, 0) * 1000).toLocaleString("it-IT");
    };
    disegna();
    ciclo(el, 1500, (p) => {
      const giro = Math.floor(performance.now() / 1500);
      if (giro === ultimo || p > 0.5) return;
      ultimo = giro;
      const k = giro % righe.length;
      mille[k] += 0.3 + ((giro * 7) % 5) / 10;
      righe[k].classList.remove("mosso");
      void righe[k].offsetWidth;
      righe[k].classList.add("mosso");
      disegna();
    });
  },
};

// Da chiamare dopo aver messo la scheda nella pagina: fa partire i numeri e la scena.
// Da chiamare dopo aver messo la scheda nella pagina.
export function avviaScheda(radice) {
  if (!schede[radice.dataset.id]) return;
  const primo = radice.querySelector(".vt-primo");
  if (primo) VIVI[radice.dataset.id]?.(primo);
  // i numeri partono a girare appena la scheda è salita, e rigirano quando ci si passa sopra con il mouse
  setTimeout(() => radice.classList.add("partiti"), 380);
  if (fermo()) return;
  radice.querySelectorAll(".bq-colore, .bq-nero li").forEach((zona) =>
    zona.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      const colonne = [...zona.querySelectorAll(".rl-n")];
      colonne.forEach((c) => {
        c.style.transition = "none";
        c.style.transform = "translateY(0)";
      });
      void zona.offsetWidth;
      colonne.forEach((c) => {
        c.style.transition = "";
        c.style.transform = "";
      });
    }),
  );
}

// Il progetto che viene dopo (lo usa la barra in basso mentre una scheda è aperta).
export function prossimoProgetto(id) {
  const ids = Object.keys(progetti);
  return ids[(ids.indexOf(id) + 1) % ids.length];
}
