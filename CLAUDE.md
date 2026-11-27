# Reddoak 3 · Il quartier generale

Una grande hall da fiera dentro la sede Reddoak, con cinque stand, uno per
progetto (meravigliä, myPushop, Quiz Patente, Mister Lavaggio, Relatia),
modellata in Blender e mostrata sul web con three.js.
Riferimento: https://www.engine.land/en/room/market

## Cosa vuole l'utente (in ordine di tempo: ogni riga corregge la precedente)

1. 26/11/2026: Reddoak deve sembrare GRANDE. Bocciata la "casa sull'albero"
   (piccola e carina), scelto il "quartier generale" di una grande azienda.
2. 27/11: «non voglio illustrata, voglio reale». Bocciate le scenette a forme
   semplici e colori piatti con gli omini stilizzati.
3. 27/11: bocciato il pentagono visto dal centro («non mi fa impazzire»).
4. 27/11: bocciati i cinque totem con lo schermo, tutti uguali e vicini («solo
   dei LED»): vuole stand caratteristici, uno diverso dall'altro, «stile Engine».
5. 27/11: bocciata anche la disposizione ad arco degli stand: «troppo vicini».
   Vuole una hall più grande con gli stand lontani tra loro.

6. 27/11: bocciata anche la hall con gli stand "a tema" costruiti da me (auto,
   negozio, autolavaggio): «sono comunque illustrazioni, non è veritiera», e
   gli stand piccoli in una hall enorme «sembra che non interessi a nessuno».
7. 27/11: «Engine mi piace moltissimo perché quasi sembra reale». E la versione
   che gli piaceva era quella con i grandi schermi LED, ma sullo schermo vuole
   SOLO IL LOGO, non il sito.

Lezione: con forme semplici (scatole, sfere, cilindri) qualunque oggetto a tema
sembra un giocattolo, e all'utente non va. Sembra vero solo ciò che è fotografato
o scansionato dal vero (materiali, arredi, piante, cielo di Poly Haven) e
l'architettura pulita. Niente scenette costruite a mano, niente spazi vuoti.

## Com'è adesso (scelte dell'utente del 27/11/2026)

- **Salone fotografico** alto 14 m: pavimento in pietra, intonaco, fascia in
  rovere con il logo Reddoak rosso al centro, lucernario a pentagono.
- Ordine degli schermi deciso dall'utente, da sinistra: Quiz Patente, myPushop,
  **meravigliä al centro**, Relatia, Mister Lavaggio (lista `PROGETTI`).
- **Cinque grandi schermi LED** (5,6 × 9 m) su totem in alluminio scuro,
  disposti ad arco davanti a chi entra, a quasi 10 m l'uno dall'altro (`PASSO`
  = 36°). Sullo schermo c'è solo il logo bianco sul colore del progetto
  (`blender/crea_schermi.mjs`, tabella `LOGHI`); Quiz Patente usa l'icona dell'app.
- Dietro ogni schermo un setto d'intonaco che prende la luce nel colore del
  marchio; tra uno schermo e l'altro una vetrata sui grattacieli.
- Davanti a ogni schermo un salottino vero (tappeto, due poltrone, tavolino);
  piante davanti alle vetrate, lampade a sospensione, querce rosse ai lati.
- Alle spalle di chi entra: grande parete in rovere con la foglia Reddoak e il
  motto «Diamo vita alle tue idee», reception larga davanti, un salottino per
  lato, piante. Nel mezzo del salone sei sedute rotonde con una pianta al centro.
- NIENTE VUOTI: l'utente ha bocciato sia la hall enorme con gli stand piccoli
  sia il lato ingresso spoglio («vuotissimo, non voglio vuoti assurdi»). Si
  guarda a 360°, quindi ogni direzione deve avere qualcosa: prima di un render
  controllare anche la vista alle spalle.
- NON ci si gira a 360° (richiesta dell'utente: «voglio che tutto lo spazio sia
  occupato dai 5 progetti»): lo sguardo scorre solo sull'arco degli schermi. Il
  limite è la proprietà `sguardo_bordo_gradi` di `Camera360` (87°: poco oltre
  l'ultimo schermo); il sito ci toglie metà inquadratura, così vale per ogni
  schermo, dal computer al telefono. Toglierla = giro completo.
- «VAI!» apre direttamente la pagina del progetto.
- Il sito sa anche gestire viste da vicino (camere `Camera360_<id>` in Blender:
  «VAI!» porta lì e «SCOPRI» apre la pagina), ma in questa versione non ce ne sono.

Versioni precedenti conservate in `blender/`: `crea_stanza_illustrata.py.bak`,
`crea_stanza_pentagono.py.bak`, `crea_stanza_schermi.py.bak` (schermi con il
sito, vicini), `crea_stanza_arco_stand.py.bak` e `crea_stanza_hall_stand.py.bak`
(stand a tema costruiti a mano).

Colori: vista "Khronos PBR Neutral" in Blender, perché AgX slavava i colori dei
marchi.

## Come fa Engine (verificato leggendo il suo codice il 26/11/2026)

Le stanze di Engine NON sono modelli 3D in tempo reale. Ogni stanza è una foto
a 360° (JPG equirettangolare 5760×2880, circa 1 MB) renderizzata in un programma
3D e incollata all'interno di una sfera in three.js. Sopra ci sono i punti
cliccabili ("GO!") e si trascina per guardarsi intorno, con lo sguardo limitato
in alto e in basso. Qui si fa lo stesso.

## Da Blender a three.js

File sorgente: `blender/stanza.blend` (Blender 5.3, in /Applications).

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | sito in locale su http://localhost:3130 |
| `npm run stanza:esporta` | porta la stanza nel sito, qualità piena (circa 25 minuti per ogni foto a 360°; ora sono due, giorno e sera) |
| `npm run stanza:esporta -- --vista hall` | rifà una sola foto (`hall` oppure l'id di uno stand, es. `relatia`) |
| `npm run stanza:bozza` | come sopra ma veloce e sgranata (meno di un minuto per foto) |
| `npm run stanza:punti` | aggiorna solo hotspot, camere e modello 3D, senza rifare le foto (pochi secondi) |
| `npm run stanza:sera` | rifà solo la foto serale della stanza (circa 25 minuti) |
| `npm run ghianda` | rifà la ghianda che ruota nella schermata di caricamento |
| `npm run pubblica` | pubblica il sito su Vercel (https://reddoak3.vercel.app) così com'è su questo Mac |
| `npm run anteprima` | costruisce il sito come andrà online (cartella `dist/`, circa 19 MB) e lo apre su http://localhost:3131 |
| `node blender/anteprime_foto.mjs` | rifà le anteprime leggere delle foto e l'immagine di condivisione `public/og.jpg` (lo lanciano già da soli i comandi `stanza:esporta`, `stanza:sera`, `stanza:bozza`) |
| `npm run stanza:crea` | RICREA stanza.blend da zero: cancella le modifiche fatte a mano |

Materiale di partenza (serve solo se manca o va aggiornato):

| Comando | Cosa fa |
| --- | --- |
| `python3 blender/scarica_risorse.py` | scarica cielo, materiali e arredi da Poly Haven in `blender/risorse/` (250 MB) |
| `node blender/cattura_schermate.mjs` | fotografa i siti veri dei progetti (usa Google Chrome) |
| `node blender/crea_schermi.mjs` | compone i 5 contenuti degli schermi: `blender/textures/schermo-<id>.png` |

Testi e numeri sugli schermi vengono da `src/progetti.js`: cambiati lì, vanno
rifatti gli schermi (`crea_schermi.mjs`) e poi il render.

L'esportazione (`blender/esporta_stanza.py`) scrive in `public/stanza/`:

- `panorama.jpg` (+ `panorama-4096.jpg` per i telefoni): render Cycles a 360° visto da `Camera360` (la hall).
  Larga 8192 (`LARG_HALL` in `esporta_stanza.py`): a 5760 come Engine all'utente sembrava sfocata sul Mac. Il sito
  mostra subito la copia a 4096 e la sostituisce con quella nitida appena è arrivata (`caricaFoto()` in `src/main.js`)
- `panorama-<id>.jpg`: la foto a 360° da vicino di ogni stand, vista da `Camera360_<id>`
- `panorama-anteprima.jpg` (e `-sera-anteprima`): copia piccolissima, larga 1536, fatta da `anteprime_foto.mjs`: il
  sito la mostra per prima, poi passa a quella a 4096 e infine a quella grande
- `stanza.glb` e `cielo.jpg`: il modello vero per il vecchio «3D dal vivo». NON più usati dal sito (il codice è stato
  tolto) e non vanno online: `vite.config.js` li toglie da `dist/`. Li scrive ancora l'esportazione da Blender
- `stanza.json`: camere, viste da vicino e punti cliccabili

Regole perché ciò che si crea in Blender arrivi sul sito:

1. La camera a 360° della hall si chiama `Camera360` e deve restare in piano (si
   può spostare o girare attorno all'asse verticale). Ogni camera che si chiama
   `Camera360_<id>` diventa una vista da vicino: basta aggiungerne una in
   Blender perché sul sito «VAI!» di quel progetto porti lì.
2. Un punto cliccabile è un Empty il cui nome inizia con `HOTSPOT_`. Quello che
   segue è l'id del progetto in `src/progetti.js` (es. `HOTSPOT_relatia`).
   Un id sconosciuto compare lo stesso, con il nome dell'Empty.
3. Nella foto a 360° arriva TUTTO quello che Blender sa renderizzare (qualsiasi
   materiale, luce, riflesso, il cielo vero). Nel 3D dal vivo arrivano solo
   geometria, materiali Principled BSDF, texture immagine e luci: niente nodi
   procedurali, niente cielo fotografico (lì le finestre mostrano un colore).
4. Un oggetto con la proprietà personalizzata `solo_foto` compare nella foto ma
   NON nel 3D dal vivo: serve per i modelli pesantissimi (gli alberi, 95 MB).
5. Le superfici grandi usano materiali veri con UV in metri (`uv_metri` in
   `crea_stanza.py`): un oggetto nuovo con quei materiali ha bisogno di UV.

Ogni stand ha una sua collezione e un Empty `ANGOLO_n_id` a cui è agganciato
tutto (pedana, costruzione, insegna, luci, albero, hotspot e la camera da
vicino): spostando o girando quello si sposta tutto lo stand. La collezione "Soffitto" è nascosta nella vista 3D ma compare nel
render. Il cielo con la città è il "World" (foto HDR `canary_wharf`): si gira
con `ROT_CIELO` in `crea_stanza.py` o dal nodo Mapping del World.

Attenzione ai tempi: con il Mac chiuso e a batteria i render vanno avanti solo
nei brevi risvegli (una bozza da 30 secondi può metterci 20 minuti). Per
renderizzare serve il Mac aperto, meglio se attaccato alla corrente.

## Velocità, SEO e GEO (richiesta dell'utente del 27/11: «soprattutto più veloce»)

Velocità (tutto in `src/main.js`):

- La stanza si ridisegna SOLO quando cambia qualcosa (`ciclo()`, variabile `daDisegnare`): prima veniva ridisegnata
  60 volte al secondo anche da ferma o con una scheda aperta sopra. Chi cambia qualcosa a mano (una foto nuova,
  uno sguardo spostato di colpo) deve mettere `daDisegnare = true`.
- La foto arriva a tappe (`tappe()`, `caricaFoto()`): anteprima da circa 90 KB, poi 4096, poi 8192. I telefoni veri
  si fermano a 4096; una finestra stretta su un computer NO (era il motivo per cui l'utente, che guarda l'anteprima
  a 620 punti, vedeva la stanza sfocata).
- A stanza pronta si scaricano già le immagini delle schede, così «VAI!» le apre subito.
- Schermata di caricamento: almeno 0,9 secondi. Tolto il codice del 3D dal vivo (il programma pesa 566 KB, 146 compressi).

SEO e GEO (tutto in `vite.config.js`, che legge gli stessi file dei testi del sito: niente da aggiornare a mano):

- titolo, descrizione, indirizzo ufficiale, immagine di condivisione (`public/og.jpg`), icone;
- la sezione «contenuti» scritta dentro la pagina: testi, numeri e link veri di progetti, chi siamo e contatti come
  pagina normale. A schermo non si vede (la mostra la stanza), ma la leggono motori di ricerca, AI e lettori di
  schermo: senza, vedrebbero una pagina vuota, perché il sito è disegnato dal computer di chi guarda;
- dati strutturati schema.org (azienda, sede, i 5 progetti come marchi; le app anche come applicazioni);
- `/robots.txt`, `/sitemap.xml` e `/llms.txt` (riassunto in testo semplice per le AI).

Pagine con indirizzo proprio (richiesta dell'utente: «Sì, falle»): la hall `/`, una per progetto
`/progetti/<id>/` e `/chi-siamo/`. È sempre lo stesso sito (stessa stanza: `src/main.js` legge l'indirizzo in
`mostraRotta()` e apre la scheda giusta; `vai()` cambia indirizzo senza ricaricare; i link interni sono normali
`<a href="/...">`), ma ogni indirizzo ha la sua pagina già scritta, con titolo, descrizione, immagine di
condivisione (`public/progetti/og-<id>.jpg`, fatta da `ritaglia_pezzi.mjs`), contenuti e dati strutturati propri
(tabella `PAGINE` in `vite.config.js`). In locale le scrive al volo, nella versione da pubblicare finiscono in
`dist/progetti/<id>/index.html` e `dist/chi-siamo/index.html`. I vecchi indirizzi con il cancelletto
(`#/progetto/<id>`) portano da soli a quelli nuovi. Aggiungendo un progetto in `src/progetti.js` la sua pagina,
la mappa del sito e il riassunto per le AI si aggiornano da soli.

## Online (dal 27/11/2026, su richiesta dell'utente: «per adesso mettilo su Vercel e su GitHub»)

- **Vercel**: progetto `reddoak3` nella squadra «meraviglia's projects», indirizzo provvisorio
  https://reddoak3.vercel.app . Si ripubblica con `npm run pubblica` (carica i file da questo Mac; `.vercelignore`
  lascia fuori Blender e le versioni vecchie). Impostazioni in `vercel.json` (indirizzi con la barra finale, foto e
  programma tenuti in memoria dal browser).
- **Indirizzo definitivo**: `https://reddoak.com`, confermato dall'utente, NON ancora collegato. Finché il sito
  sta sull'indirizzo provvisorio dice ai motori di ricerca di non contarlo (`PROVVISORIO` in `vite.config.js`:
  «noindex» e robots.txt chiuso), per non creare un doppione. Quando reddoak.com viene collegato al progetto
  Vercel e si ripubblica, si apre da solo.
- **GitHub**: https://github.com/chiaranebuloni-beep/reddoak (creato dall'utente; ramo `main`, identità copiata
  dal progetto domunica). NON è collegato a Vercel: caricare su GitHub non ripubblica il sito, e viceversa. Si
  carica con `git push` solo quando l'utente lo chiede. Restano FUORI da GitHub,
  perché troppo grandi: `blender/stanza.blend` (174 MB, si ricrea con `npm run stanza:crea` ma le modifiche fatte
  a mano in Blender NON sarebbero salvate: tenerne una copia), `blender/risorse/` (si riscarica) e
  `public/stanza/stanza.glb`.
- Testi di «Chi siamo» ancora provvisori: l'utente deve mandare quelli definitivi.

## Sito

Vite + three.js senza framework: `index.html`, `src/main.js`, `src/style.css`,
`src/progetti.js` (testi presi dal sito Reddoak 2). Solo italiano, font Geist.
È online su Vercel (vedi «Online»): pubblicare solo quando l'utente lo chiede.

Impostazione della pagina come engine.land (richieste dell'utente il 27/11/2026:
«mi piace molto il fatto che il video stia solo nel riquadro», bollini «GO!»,
barra con le tre righe e menu a tutto schermo, schermata di caricamento):

- La stanza NON è a tutto schermo: vive in `#riquadro`, un rettangolo con gli
  angoli arrotondati dentro una cornice rosso Reddoak. Sopra scorre il nastro
  «Benvenuti nel quartier generale Reddoak».
- Cornice in basso: a sinistra il progetto che si ha davanti (porta alla sua
  pagina), al centro le tre righe che aprono il menu, a destra «Chi siamo».
- Menu a tutto schermo (`#menu`): fondo rosso, voci giganti bianche con
  sottotitolo nero (L'atrio, i 5 progetti, Chi siamo, Contatti), tasto con la X
  in basso. Le voci sono in `vociMenu()` di `src/pagine.js`.
- Punti cliccabili: bollino rotante con sigillo dentellato e il nome del
  progetto che gli gira attorno (`bollino()` in `src/main.js`). Nella hall dice
  «VAI!» e porta davanti allo stand (`#/stand/<id>`); lì dice «SCOPRI» e apre
  la pagina. In Blender l'Empty `HOTSPOT_` sta sul bordo davanti della pedana.
- Pagine dentro il riquadro, sopra la stanza, con indirizzo proprio:
  `/progetti/<id>/` e `/chi-siamo/` (testi in `src/reddoak.js`). Salgono dal
  basso; «Torna nella hall» le chiude.
- Scheda di un progetto: «A RIQUADRI», UNA SCHERMATA SOLA con dentro tutto, su
  fondo bianco (`src/schede.js` struttura, `src/schede-dati.js` testi e colori,
  `src/schede.css` stile, collegato da `index.html`). Scelta dall'utente il
  27/11 su un suo esempio («preferisco questa versione nuova»): etichetta e
  titolo sottile in minuscolo al centro, sotto una griglia di tessere con gli
  angoli tondi:
  1. a sinistra, alta quanto la griglia, il SITO VERO che scorre da solo
     (`pagina-<id>.webp`), con il logo in alto e davanti un pezzo di interfaccia
     animato (`PRIMO_PIANO` e `VIVI`: il quiz vero/falso per Quiz Patente, le
     liste «in diretta» per gli altri, in `LISTE`/`CAMPAGNE`);
  2. grigia, «Il progetto»: il TESTO COMPLETO (`desc`) e i pulsanti. Alta solo
     quanto il suo testo: grande, con il vuoto sopra, non gli piaceva;
  3. nel colore del progetto: il primo numero di `stats`, quello che conta;
  4. nera: gli altri numeri (per Relatia, che non ne ha, i punti di forza `forza`).
  I numeri GIRANO come un contatore all'apertura e quando ci si passa sopra
  (`numero()` e classe `.partiti`): l'utente li vuole in movimento, «che
  sembrino importanti».
  L'utente guarda l'anteprima a 620 punti di larghezza: anche lì deve stare
  tutto in una schermata. Su telefono le tessere vanno una sotto l'altra.
  Non togliere contenuti dalle schede senza chiederglielo: quando ho accorciato
  i testi a una frase li ha rivoluti («cancellavi informazioni che servivano»).
  Per meravigliä il primo numero è «12 mila attività seguite».
  Un solo carattere in tutto il sito: quello "da macchina da scrivere" è stato
  bocciato («non c'entra niente»), resta solo nella ghianda.
  Bocciati, in ordine: pagine a tinta piatta del colore del progetto (odiava
  l'arancione di Quiz Patente), fondo neutro con il rosso Reddoak uguale per
  tutti, disegni in ASCII art, la copia pari pari delle schede del sito Reddoak
  2, le scenette a forme piatte («troppo bambineschi»), il telefono davanti al
  sito, le card con una foto presa dal sito, i cartellini di vetro larghi, la
  pagina che scorre a sezioni («preferivo un'unica schermata in cui c'era un
  po' tutto»), e la scheda con testo a sinistra e vetrina 3D a destra (gli
  sembrava che «qualcosa non andasse»). Le ultime due sono in `src/vecchie/`.
  Vuole «wow, come un sito fatto da esperti».
  Le immagini le rifà `node blender/cattura_vetrine.mjs`. «Prossimo progetto» è
  nella barra rossa in basso a sinistra mentre una scheda è aperta; scorrendo
  una pagina il logo Reddoak in alto si nasconde.
- Menu: due gruppi affiancati, «I progetti» e «Reddoak» (Chi siamo, Contatti),
  divisi da un filo. La voce «La hall» è stata tolta su richiesta.
- «Chi siamo»: come le sezioni del primo sito Reddoak che piacciono all'utente:
  titolone «Milioni di persone usano le nostre app.», 4 numeri in colonna,
  scritta nera gigante «Cambiamo le regole del gioco» che scorre; poi una fascia
  color crema con «2014» e i tre valori su schede inclinate di colore diverso
  (bianca, rossa, nera) attaccate con il nastro adesivo; in fondo il saluto
  «Ci vediamo al prossimo progetto.» con i contatti e la scritta «reddoak»
  bianca a tutta larghezza (`public/brand/reddoak-wordmark.svg`). Le tre schede
  bianche tutte uguali sono state bocciate. I testi sono PROVVISORI (presi dal
  primo sito): l'utente manderà quelli definitivi.
- Cielo che segue l'ora (richiesta dell'utente): la stanza è renderizzata due
  volte, di giorno (`panorama.jpg`) e di sera (`panorama-sera.jpg`: cielo blu
  scuro, sole spento, luci interne più forti; i valori sono in `MOMENTI` dentro
  `blender/esporta_stanza.py`). Il sito sceglie in base all'ora di chi guarda,
  con alba e tramonto medi per mese (`fotoDelMomento()` in `src/main.js`).
  Per provare: `?cielo=sera` o `?cielo=giorno` nell'indirizzo.
  `npm run stanza:esporta` rifà entrambe le foto (circa 50 minuti).
- Il «3D dal vivo» è stato tolto su richiesta, pulsante e codice: resta solo la
  foto a 360°.
- MAI testi in corsivo (richiesta dell'utente): le parti in evidenza cambiano
  solo colore. `em` e `i` sono senza corsivo in tutto il sito.
- Frecce ai lati della hall (richiesta dell'utente: far capire che oltre ai tre
  progetti che si vedono ce ne sono altri): girano lo sguardo di un progetto
  alla volta (`gira()` in `src/main.js`) e spariscono quando da quel lato si è
  arrivati in fondo.
- Inquadratura della hall secondo la forma del riquadro (`INQUADRATURE` in
  `src/main.js`). Su telefono in verticale la vista è stretta (uno zoom) e
  guarda più in su: uno schermo riempie il telefono e si passa agli altri con
  le frecce o trascinando. Richiesta dell'utente: «preferirei uno zoom,
  piuttosto che vedere in primo piano il pavimento». Sul computer resta ampia.
- POCO MOVIMENTO nella hall (richiesta dell'utente: «mi fa mal la testa se vedo
  le cosine girare e le bande sopra ai LED»). Sugli schermi LED il sito
  ridisegna, FERMI, il logo e le due bande diagonali con nome e categoria
  (`disegnaSchermo()` in `src/main.js`; posizioni da Blender, oggetti
  «… · schermo» → `schermi` in `stanza.json`; loghi in
  `public/progetti/logo-<id>.png`). Le bande piacciono («andavano anche bene»),
  dava fastidio solo che scorressero. La scritta attorno ai bollini «VAI!» gira
  solo quando ci si passa sopra con il mouse. Non aggiungere animazioni
  continue nella hall.
- Velocità (richiesta dell'utente: «rendere tutto più veloce»): caricamento minimo
  1,5 s, pagine e menu che si aprono in mezzo secondo, sguardo più pronto.
  Non riallungare i tempi.
- Schermata di caricamento (`#caricamento`): fondo rosso, motto gigante «Diamo
  vita alle tue idee» con i puntini che lampeggiano e sotto la ghianda che
  ruota disegnata in ASCII art (caratteri bianchi), come chiesto dall'utente.
  Lo script è in `index.html`: legge i 60 fotogrammi di
  `public/brand/ghianda-giro.webp` (rifatti con `npm run ghianda`) e trasforma
  ogni puntino in un carattere. Bocciate prima la ghianda dorata ferma e poi
  quella a colori che ruotava.
- Bollini «VAI!»: il nome del progetto che gira attorno è in minuscolo.
- Nastro in alto: stesso carattere dei titoloni (peso 900, stretto), non tutto
  maiuscolo.
- Il CSS è collegato da `index.html` (non importato dal JS), così la schermata
  di caricamento è già disegnata al primo istante.
- Titoloni: carattere scelto con `--titoli` in `src/style.css`. Ora è Geist 900;
  all'utente piace lo stile del primo sito (Unbounded), non ancora installato.
- Da Engine si copia l'impostazione e il tipo di movimento, mai font, immagini o logo.
