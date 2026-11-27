// Le schede dei progetti: testi, colori e immagini. Ogni scheda è una pagina che scorre (vedi schede.js):
// apertura con titolo e sito vero, «Cosa fa» in tre punti, immagini vere, numeri grandi su nero, chiusura.
// Fondo bianco per tutte; "accento" e "secondo" sono i colori del progetto.
//   claim    pezzi del titolo: { em } è la parte nel colore del progetto, "br" va a capo, "heart" è il cuore
//   desc     il testo completo sotto il titolo (l'utente lo vuole: la frase sola "intro" toglieva informazioni)
//   intro    la versione in una frase (usata solo dalla pagina che scorre, conservata in src/vecchie/)
//   punti    tre coppie [titolo, testo]: riassunti miei dei testi del sito Reddoak 2, da far rivedere all'utente
//   stats    i numeri: il PRIMO è quello che conta di più (finisce anche nel cartellino sulla finestra)
//   forza    per chi non ha numeri (Relatia): le parole che vanno nella fascia nera
//   foto     ritagli veri del sito, [larghezza, altezza] di public/progetti/pezzo-<id>-<n>.webp
//            (li rifà `node blender/ritaglia_pezzi.mjs`); "app: true" = schermate dell'app, in fila
export const schede = {
  "quiz-patente": {
    tag: "App · Education · Patente B",
    accento: "#1c56b8", // il blu dell'app (la bandiera europea dell'icona)
    secondo: "#6ea8ff",
    logo: { src: "/progetti/schede/quizpatente-icon.png", scritta: ["Quiz Patente", "Ufficiale"] },
    claim: ["Prendi la patente ", { em: "divertendoti." }],
    intro: "L'app per preparare l'esame della patente: quiz ministeriali ufficiali, teoria e videolezioni in un posto solo.",
    desc: "Quiz ministeriali ufficiali e simulazioni d'esame da 30 domande in 20 minuti, quiz per argomento, manuale di teoria integrato e ripasso degli errori. L'insegnante può correggere i quiz in tempo reale, le videolezioni approfondiscono ogni argomento e il font EasyReading lo rende accessibile anche a chi ha DSA.",
    punti: [
      ["Quiz ufficiali", "Simulazioni d'esame da 30 domande in 20 minuti, quiz per argomento e ripasso degli errori."],
      ["Teoria e videolezioni", "Il manuale di teoria è dentro l'app, e le videolezioni approfondiscono ogni argomento."],
      ["Per tutti", "L'insegnante corregge i quiz in tempo reale e il font EasyReading lo rende accessibile anche a chi ha DSA."],
    ],
    stats: [
      { n: 8, unit: "milioni", label: "di download" },
      { n: 150, unit: "mila", label: "utenti ogni giorno" },
      { n: 0, plain: "4,6", unit: "★", label: "su App Store, 130K voti" },
    ],
    foto: { app: true, misure: [[478, 1030], [478, 1030], [478, 1030]] },
    bottoni: [
      { testo: "App Store", url: "https://apps.apple.com/it/app/quiz-patente-ufficiale-2024/id635361447" },
      { testo: "Google Play", url: "https://play.google.com/store/apps/details?id=com.bokapp.quizpatente", vuoto: true },
    ],
  },
  relatia: {
    tag: "CRM · Automazione · AI",
    accento: "#e9336f",
    secondo: "#7c3aed",
    logo: { src: "/progetti/schede/relatia-scuro.png" },
    claim: ["Dal caos dei contatti", "br", "a ", { em: "clienti fedeli." }],
    intro: "Il CRM che raccoglie i contatti in un posto solo e li trasforma in clienti. Zero Excel, zero perdite di tempo, zero scuse.",
    desc: "I contatti si perdono tra Meta, form, siti e fogli Excel. Relatia li raccoglie in un solo posto, li segmenta da sola e li trasforma in clienti con automazioni che vendono anche mentre dormi. Zero Excel, zero perdite di tempo, zero scuse.",
    punti: [
      ["Raccoglie da ovunque", "Meta, form, siti e fogli Excel: i contatti non si perdono più in mille posti diversi."],
      ["Lavora da sola", "Segmenta i contatti e li segue con automazioni e AI che vendono anche mentre dormi."],
      ["Parla dove serve", "Email, SMS e WhatsApp dallo stesso posto, con report senza fuffa."],
    ],
    forza: ["Raccolta da ovunque", "Automazioni + AI", "Email · SMS · WhatsApp", "Report senza fuffa"],
    cartello: "Automazioni + AI",
    foto: { misure: [[1160, 700], [1160, 400], [1280, 370]] },
    bottoni: [{ testo: "Scopri Relatia", url: "https://relatiacrm.com/" }],
  },
  "mister-lavaggio": {
    tag: "Car wash · Eco · On demand",
    accento: "#1273c4",
    secondo: "#13aff0",
    logo: { src: "/progetti/schede/misterlavaggio.png" },
    claim: ["Lavaggio auto a domicilio, ", { em: "di qualità." }],
    intro: "Cambiamo il modo di pensare il lavaggio auto: comodo, ecologico, senza rubarti tempo.",
    desc: "Cambiamo il modo di pensare il lavaggio auto: un'attività comoda, ecologica, che non ti ruba tempo. Noi veniamo da te, tu fai altro.",
    punti: [
      ["Viene da te", "A casa o in ufficio: noi veniamo da te, tu intanto fai altro."],
      ["Ecologico", "Un lavaggio che non spreca acqua: 3 milioni di litri risparmiati finora."],
      ["Ti ridà tempo", "Niente code e niente attese: 26 mila ore restituite ai nostri clienti."],
    ],
    stats: [
      { n: 35, unit: "mila", label: "auto lavate" },
      { n: 3, unit: "milioni", label: "litri d'acqua risparmiati" },
      { n: 26, unit: "mila", label: "ore restituite" },
      { n: 78, unit: "milioni", label: "acari in fuga" },
    ],
    foto: { misure: [[1280, 680], [1120, 560], [1160, 600]] },
    bottoni: [{ testo: "Scopri Mister Lavaggio", url: "https://www.misterlavaggio.com/" }],
  },
  meraviglia: {
    tag: "Digital marketing agency",
    accento: "#247dff",
    secondo: "#0b1220",
    logo: { src: "/progetti/schede/meraviglia.webp" },
    claim: ["La digital agency che ", { em: "trasforma" }, " il tuo business."],
    intro: "Strategie social su misura e piani editoriali personalizzati per portare alle attività i clienti giusti.",
    desc: "Strategie social su misura e piani editoriali personalizzati per raggiungere i clienti giusti. Social media advertising, graphic design, branding, web design e modelli di business replicabili. E Regaly, il catalogo premi fedeltà usato da migliaia di attività.",
    punti: [
      ["Social su misura", "Strategie e piani editoriali personalizzati, con social media advertising per raggiungere i clienti giusti."],
      ["Dal marchio al sito", "Graphic design, branding e web design, con modelli di business replicabili."],
      ["Regaly", "Il catalogo premi fedeltà usato da migliaia di attività."],
    ],
    stats: [
      // la prima è quella che conta di più per l'utente: finisce nel cartellino sulla finestra
      { n: 12, unit: "mila", label: "attività seguite" },
      { n: 100, unit: "mila", label: "recensioni ai progetti" },
      { n: 900, unit: "", label: "siti web creati" },
    ],
    foto: { misure: [[940, 560], [1000, 420], [1040, 560]] },
    bottoni: [{ testo: "Scopri meravigliä", url: "https://meraviglialab.com/" }],
  },
  mypushop: {
    tag: "App · Retail locale",
    accento: "#e30049",
    secondo: "#ff8fb0",
    logo: { src: "/progetti/schede/mypushop.png" },
    claim: ["We ", "heart", " ", { em: "local shopping." }],
    intro: "La prima app pensata per riportare le persone nei negozi sotto casa.",
    desc: "La prima app pensata per riportare le persone nei negozi, contro centri commerciali ed e-commerce. Si mette a fianco delle attività locali per riportare i clienti in negozio e a spendere sotto casa.",
    punti: [
      ["Per chi compra", "Trovi l'attività commerciale che cerchi ed esplori negozi e locali della tua zona."],
      ["Per chi vende", "Si mette a fianco delle attività locali per riportare i clienti in negozio."],
      ["Per la città", "Contro centri commerciali ed e-commerce: si torna a spendere sotto casa."],
    ],
    stats: [
      { n: 100, unit: "K+", label: "download" },
      { n: 35, unit: "K+", label: "utenti" },
      { n: 3000, unit: "", label: "shop" },
      { n: 17, unit: "", label: "regioni" },
    ],
    foto: { misure: [[1180, 560], [1040, 370], [1180, 400]] },
    bottoni: [{ testo: "Scopri myPushop", url: "https://mypushop.com/" }],
  },
};
