/* Drums: Drumgrooves und Groove + Fill (Kategorie „Drums“ mit zwei Unterkategorien, nach Toms Stunde „Der Drumgroove“, Klasse 7).

   1. Groove-Trainer (#/drumgrooves): die fünf Grooves aus der Stunde (Groove 1 = Note 5 …
      Groove 5 = Note 1) auf drei Pads oder am Drumset mitspielen. Jeder Groove wird
      aufgebaut: erst Hi-Hat + Snare, dann Bassdrum + Snare, dann alles. Reihenfolge der
      Pads umschaltbar (Hi-Hat · Snare · Bassdrum oder Bassdrum · Snare · Hi-Hat, die Snare immer in der Mitte).
      „Mitspielen“ übt (keine Sterne, Pads leuchten auf Wunsch), „Sterne sammeln“ wertet
      den ganzen Groove: Spiel „drumgrooves“, Stufe 0–4 = Groove 1–5, Sterne wie bei der
      Rhythmus-Prüfung (ab 95 % sechs). Der Groove läuft nach dem Einzählen 4×.
   2. Groove + Fill (#/groovefill): 1 Takt Groove (Groove 2: Bassdrum auf 1 und 3) + 1 Takt
      Fill auf Snare und Toms, insgesamt 4×. Acht einfache Fills, vier in Vierteln, vier in
      Achteln. Aufbau: erst nur der Fill (den Groove spielt der Computer), dann beides.
      Sechs Pads (oben die Toms) oder das Drumset. Spiel „groove-fill“, Stufe 0–7 = Fill 1–8.
   3. Spiele (SPIELE, Bereich „Drums“, Feld unter = Unterkategorie): „Welcher Groove?“
      (Drumgrooves) und „Welcher Fill?“ (Groove + Fill). Auf der Startseite stehen sie mit den
      beiden Trainern unter der Kategorie „Drums“.

   Ein Takt hat acht Achtel-Positionen (0–7 = 1 + 2 + 3 + 4 +), zwei Takte 0–15. */
const DG = {
  GROOVES: [
    { nr: 1, note: 5, bass: [] },
    { nr: 2, note: 4, bass: [0, 4] },
    { nr: 3, note: 3, bass: [0, 4, 5] },
    { nr: 4, note: 2, bass: [0, 3, 4] },
    { nr: 5, note: 1, bass: [0, 3, 5] },
  ],
  SNARE: [2, 6],
  HH: [0, 1, 2, 3, 4, 5, 6, 7],
  ZAEHL: ['1', '+', '2', '+', '3', '+', '4', '+'],
  /* Fills: je Achtel-Position ein Instrument (Viertel: nur auf 1 2 3 4) */
  FILLS: [
    { nr: 1, art: 'Viertel', name: 'Snare', v: true, schlaege: ['s', 's', 's', 's'] },
    { nr: 2, art: 'Viertel', name: 'Snare – Tom 1', v: true, schlaege: ['s', 's', 't1', 't1'] },
    { nr: 3, art: 'Viertel', name: 'Snare – Toms abwärts', v: true, schlaege: ['s', 't1', 't2', 't3'] },
    { nr: 4, art: 'Viertel', name: 'Tom 1 – Floor-Tom', v: true, schlaege: ['t1', 't1', 't3', 't3'] },
    { nr: 5, art: 'Achtel', name: 'Snare', schlaege: ['s', 's', 's', 's', 's', 's', 's', 's'] },
    { nr: 6, art: 'Achtel', name: 'Snare – Tom 1 – Floor-Tom', schlaege: ['s', 's', 's', 's', 't1', 't1', 't3', 't3'] },
    { nr: 7, art: 'Achtel', name: 'Snare – Toms abwärts', schlaege: ['s', 's', 't1', 't1', 't2', 't2', 't3', 't3'] },
    { nr: 8, art: 'Achtel', name: 'Toms abwärts', schlaege: ['t1', 't1', 't2', 't2', 't3', 't3', 't3', 't3'] },
  ],
  /* Instrumente: Name, Bodypercussion aus der Stunde, Farbfamilie, y im Notensystem (oberste Linie 20,
     Linienabstand 10), x = Kreuz statt Notenkopf */
  INSTR: {
    hh: { name: 'Hi-Hat', koerper: 'Brust · rechte Hand', fam: 'becken', y: 15, x: true },
    s: { name: 'Snare', koerper: 'Oberschenkel · linke Hand', fam: 'snare', y: 35 },
    b: { name: 'Bassdrum', koerper: 'Stampfen · rechter Fuß', fam: 'bass', y: 55 },
    crash: { name: 'Crash-Becken', fam: 'becken', y: 10, x: true, hilfslinie: true },
    ride: { name: 'Ride-Becken', fam: 'becken', y: 20, x: true },
    t1: { name: 'Tom 1', fam: 'tom', y: 25 },
    t2: { name: 'Tom 2', fam: 'tom', y: 30 },
    t3: { name: 'Floor-Tom', fam: 'tom', y: 45 },
  },
  /* Die Schläge eines Grooves: [{ k, p }] */
  schlaege(g, stimmen = ['hh', 's', 'b']) {
    const l = [];
    // Handsatz wie in der Stunde: Hi-Hat rechts (übergekreuzt), Snare links, Bassdrum Fuß
    if (stimmen.includes('hh')) this.HH.forEach(p => l.push({ k: 'hh', p, h: 'R' }));
    if (stimmen.includes('s')) this.SNARE.forEach(p => l.push({ k: 's', p, h: 'L' }));
    if (stimmen.includes('b')) g.bass.forEach(p => l.push({ k: 'b', p, h: 'F' }));
    return l;
  },
  /* Die Schläge eines Fills, ab Position ab */
  /* Fills: Snare immer links (wie im Groove), Toms im Wechsel – immer die andere Hand als zuvor, zuerst rechts */
  fillSchlaege(f, ab = 0) {
    let zuvor = 'L';
    return f.schlaege.map((k, i) => {
      const h = k === 's' ? 'L' : zuvor === 'L' ? 'R' : 'L';
      zuvor = h;
      return { k, p: ab + (f.v ? i * 2 : i), v: !!f.v, h };
    });
  },
  zaehlName(p) { const z = this.ZAEHL[p % 8]; return z === '+' ? `${this.ZAEHL[(p % 8) - 1]}+` : z; },
  bassText(g) { return g.bass.map(p => this.zaehlName(p)).join(' · '); },

  /* Schlagzeug-Notation, ein oder zwei Takte. noten: [{ k, p, v }] (v = Viertel, ohne Balken);
     aus: Instrumente blass; ausAb/ausBis: Positionen blass; markiert: { k, p }; zaehlen: Zählzeiten */
  B: 52, X0: 58, RAND: 22, LUECKE: 34,
  x(p) { return this.X0 + this.RAND + p * this.B + Math.floor(p / 8) * (this.LUECKE + this.RAND); },
  svg(noten, { takte = 1, aus = [], ausTakt = null, markiert = null, zaehlen = true, cursor = false, klasse = '' } = {}) {
    const x = p => this.x(p);
    const breite = x(takte * 8 - 1) + this.B + 4;
    let s = '';
    for (let l = 0; l < 5; l++) s += `<line x1="4" x2="${breite - 6}" y1="${20 + l * 10}" y2="${20 + l * 10}" class="nl"/>`;
    s += '<rect x="10" y="30" width="3.4" height="20" class="nb"/><rect x="17" y="30" width="3.4" height="20" class="nb"/>';
    s += '<text x="40" y="38" class="nt dg-takt">4</text><text x="40" y="58" class="nt dg-takt">4</text>';
    for (let t = 1; t < takte; t++) { const xs = x(t * 8) - this.RAND - this.LUECKE / 2; s += `<line x1="${xs}" x2="${xs}" y1="20" y2="60" class="nh"/>`; }
    s += `<line x1="${breite - 13}" x2="${breite - 13}" y1="20" y2="60" class="nh"/><rect x="${breite - 10}" y="20" width="4" height="40" class="nb"/>`;
    if (zaehlen) for (let p = 0; p < takte * 8; p++) { const z = this.ZAEHL[p % 8]; s += `<text x="${x(p)}" y="-22" class="dg-zahl${z === '+' ? ' und' : ''}">${z}</text>`; }
    const positionen = [...new Set(noten.map(n => n.p))].sort((a, b) => a - b);
    const BALKEN = -10;
    positionen.forEach(p => {
      const hier = noten.filter(n => n.p === p);
      const tief = Math.max(...hier.map(n => this.INSTR[n.k].y));
      const xs = x(p) + 5.4;
      const blass = ausTakt !== null && Math.floor(p / 8) === ausTakt ? ' dg-aus' : '';
      const oben = hier.every(n => n.v) ? Math.min(...hier.map(n => this.INSTR[n.k].y)) - 32 : BALKEN;
      // Nur Becken (Kreuze) an dieser Stelle: der Hals beginnt an der oberen Spitze des Kreuzes und läuft
      // nicht hindurch. Mit Snare oder Bassdrum darunter geht er durchgehend vom tiefsten Notenkopf hoch.
      const nurKreuze = hier.every(n => this.INSTR[n.k].x);
      const von = nurKreuze ? Math.min(...hier.map(n => this.INSTR[n.k].y)) - 5 : tief - 1;
      s += `<line x1="${xs}" x2="${xs}" y1="${von}" y2="${oben}" class="nh${blass}"/>`;
      hier.forEach(n => {
        const i = this.INSTR[n.k];
        const kl = `dg-n${aus.includes(n.k) || blass ? ' dg-aus' : ''}${markiert && markiert.k === n.k && markiert.p === p ? ' dg-markiert' : ''}`;
        const kopf = i.x
          ? `<path d="M${x(p) - 5} ${i.y - 5} L${x(p) + 5} ${i.y + 5} M${x(p) - 5} ${i.y + 5} L${x(p) + 5} ${i.y - 5}" class="dg-kreuz"/>`
          : `<ellipse cx="${x(p)}" cy="${i.y}" rx="6.4" ry="4.6" transform="rotate(-20 ${x(p)} ${i.y})" class="nk"/>`;
        const linie = i.hilfslinie ? `<line x1="${x(p) - 10}" x2="${x(p) + 10}" y1="${i.y}" y2="${i.y}" class="nl"/>` : '';
        s += `<g class="${kl}" data-k="${n.k}" data-p="${p}">${linie}${kopf}</g>`;
      });
    });
    // Balken je halber Takt (vier Achtel), einzelne Achtel bekommen ein Fähnchen; Viertel nichts
    for (let a = 0; a < takte * 8; a += 4) {
      const in_ = positionen.filter(p => p >= a && p < a + 4 && !noten.filter(n => n.p === p).every(n => n.v));
      const blass = ausTakt !== null && Math.floor(a / 8) === ausTakt ? ' dg-aus' : '';
      if (in_.length >= 2) {
        const x1 = x(in_[0]) + 4.4, x2 = x(in_[in_.length - 1]) + 6.8;
        s += `<rect x="${x1}" y="${BALKEN}" width="${x2 - x1}" height="5" class="nb${blass}"/>`;
      } else if (in_.length === 1) {
        const xs = x(in_[0]) + 5.6;
        s += `<path d="M${xs} ${BALKEN} q 2 9 9 13 q -6 -3 -9 -5 z" class="nb${blass}"/>`;
      }
    }
    if (cursor) s += `<rect class="kp-cursor" x="0" y="-36" width="3" height="104" rx="1.5" hidden/>`;
    const oben = zaehlen ? 42 : 24;
    return `<svg class="notenbild dg-system ${klasse}" viewBox="0 ${-oben} ${breite} ${70 + oben}" role="img" aria-label="Schlagzeug-Noten">${s}</svg>`;
  },

  /* Ein Groove oder Fill hören: Einzählen, dann zwei Durchgänge der Schläge (Länge takte) */
  vorspielen(noten, takte, tempo) {
    const s = 60 / tempo;
    const start = Ton.audio().currentTime + 0.1;
    for (let b = 0; b < 4; b++) Ton.klick(0.1 + b * s, b === 0);
    for (let d = 0; d < 2; d++) noten.forEach(n => Drums.spielen(n.k, start + (4 + d * takte * 4 + n.p / 2) * s, n.k === 'hh' ? 0.6 : 1));
    return 0.1 + (4 + 2 * takte * 4) * s + 0.3;
  },
};

const Drumgrooves = {
  /* Zwei Seiten mit demselben Trainer */
  MODI: {
    groove: { spiel: 'drumgrooves', titel: 'Drumgrooves', takte: 1, teile: ['hs', 'bs', 'alle'] },
    fill: { spiel: 'groove-fill', titel: 'Groove + Fill', takte: 2, teile: ['fill', 'beide'] },
  },
  TEILE: {
    hs: { name: 'Hi-Hat + Snare', stimmen: ['hh', 's'] },
    bs: { name: 'Bassdrum + Snare', stimmen: ['b', 's'] },
    alle: { name: 'Alles', stimmen: ['hh', 's', 'b'] },
    fill: { name: 'Nur der Fill' },
    beide: { name: 'Groove + Fill' },
  },
  FILL_GROOVE: 1,             // Groove 2 (Bassdrum auf 1 und 3) unter den Fills
  DURCHGAENGE: 4,             // so oft läuft alles nach dem Einzählen
  FENSTER: 0.13,              // Sekunden daneben zählen noch
  PAD_TASTEN: ['a', 's', 'd'],
  TOM_TASTEN: ['q', 'w', 'e'],
  REIHEN: { hsb: ['hh', 's', 'b'], bsh: ['b', 's', 'hh'] },   // Snare immer in der Mitte
  modus: 'groove', g: 0, teil: 'hs', art: 'mit', bpm: 70, metro: true, leuchten: false, koerper: false, sticks: true, instrument: 'pads', reihe: 'hsb',

  m() { return this.MODI[this.modus]; },
  lies(s, modus = this.modus) { try { return localStorage.getItem(`musiktrainer-dg-${modus === 'fill' ? 'fill-' : ''}${s}`); } catch { return null; } },
  merken(s, w) { try { localStorage.setItem(`musiktrainer-dg-${this.modus === 'fill' ? 'fill-' : ''}${s}`, String(w)); } catch { /* privat */ } },
  auswahl() { return this.modus === 'fill' ? DG.FILLS : DG.GROOVES; },
  groove() { return this.modus === 'fill' ? DG.GROOVES[this.FILL_GROOVE] : DG.GROOVES[this.g]; },
  /* Groove 1 hat keine Bassdrum: dort gibt es nur einen Teil */
  teile() { return this.modus === 'groove' && !this.groove().bass.length ? ['hs'] : this.m().teile; },
  teilJetzt() { return this.art === 'sterne' ? this.teile()[this.teile().length - 1] : this.teil; },
  sterneSumme(modus = 'groove') {
    const m = this.MODI[modus];
    return (modus === 'fill' ? DG.FILLS : DG.GROOVES).reduce((s, _, i) => s + Fortschritt.bester(m.spiel, i).sterne, 0);
  },

  /* Was in einem Durchgang erklingt: [{ k, p, v, auto }] – auto spielt der Computer */
  durchgang() {
    const teil = this.teilJetzt();
    if (this.modus === 'groove') return DG.schlaege(this.groove(), this.TEILE[teil].stimmen);
    const groove = DG.schlaege(this.groove()).map(n => ({ ...n, auto: teil === 'fill' }));
    return [...groove, ...DG.fillSchlaege(DG.FILLS[this.g], 8)];
  },
  /* Instrumente, die man selbst spielt bzw. die überhaupt vorkommen */
  meineInstrumente() { return [...new Set(this.durchgang().filter(n => !n.auto).map(n => n.k))]; },
  instrumente() { return this.modus === 'fill' ? ['hh', 's', 'b', 't1', 't2', 't3'] : ['hh', 's', 'b']; },

  zeigen(el, modus = 'groove') {
    this.el = el;
    this.stopp();
    this.modus = modus;
    const g = Number(this.lies('g'));
    this.g = g >= 0 && g < this.auswahl().length ? g : 0;
    this.teil = this.TEILE[this.lies('teil')] && this.m().teile.includes(this.lies('teil')) ? this.lies('teil') : this.m().teile[0];
    this.art = ['mit', 'sterne'].includes(this.lies('art')) ? this.lies('art') : 'mit';
    // Instrument, Reihenfolge, Tempo und Schalter gelten für beide Seiten
    const gemein = s => this.lies(s, 'groove');
    if (['pads', 'set'].includes(gemein('instrument'))) this.instrument = gemein('instrument');
    if (this.REIHEN[gemein('reihe')]) this.reihe = gemein('reihe');
    const b = Number(gemein('bpm'));
    if (b >= 50 && b <= 130) this.bpm = b;
    this.metro = gemein('metro') !== 'aus';
    this.leuchten = gemein('leuchten') === 'an';
    this.koerper = gemein('koerper') === 'an';   // Bodypercussion standardmäßig aus
    this.sticks = gemein('sticks') !== 'aus';
    if (!this.teile().includes(this.teil)) this.teil = this.teile()[0];
    App.beimAufraeumen(() => { this.stopp(); Klavierpruefung.zoomFrei(); window.removeEventListener('keydown', this.tasteFn); });
    Klavierpruefung.zoomSperren();
    el.innerHTML = '<section class="card kp-seite dg-seite"></section>';
    this.aufbauen();
  },
  merkenGemein(s, w) { try { localStorage.setItem(`musiktrainer-dg-${s}`, String(w)); } catch { /* privat */ } },

  aufbauen() {
    const knopf = (gruppe, wert, text, an) => `<button type="button" data-${gruppe}="${wert}" aria-pressed="${an}">${text}</button>`;
    const fill = this.modus === 'fill';
    const hilfe = fill ? `
          <p>Ein Takt <strong>Groove</strong> (Groove 2: Hi-Hat in Achteln, Snare auf 2 und 4, Bassdrum auf 1 und 3), dann ein Takt
            <strong>Fill</strong> auf Snare und Toms – insgesamt ${this.DURCHGAENGE}×. Fill 1–4 in Vierteln, Fill 5–8 in Achteln.</p>
          <ul>
            <li><strong>Aufbauen:</strong> erst nur der Fill (den Groove spielt der Computer), dann Groove + Fill.</li>
            <li><strong>Mitspielen:</strong> Ein Takt wird eingezählt. Zum Üben, gibt keine Sterne. Mit ${Icons.raw('tastenLicht')} leuchten die Pads mit.</li>
            <li><strong>Sterne sammeln:</strong> Groove + Fill, gewertet. Ab 95 % gibt es sechs Sterne.</li>
            <li><strong>Pads:</strong> oben die Toms (Q W E), unten Hi-Hat, Snare, Bassdrum (A S D) – mit ⇄ umdrehen. Oder das Drumset.</li>
          </ul>` : `
          <p>Fünf Grooves von leicht (Groove 1 = Note 5) bis schwer (Groove 5 = Note 1). Die <strong>Hi-Hat</strong> spielt alle Achtel,
            die <strong>Snare</strong> den Backbeat auf 2 und 4, die <strong>Bassdrum</strong> wird von Groove zu Groove schwerer.</p>
          <ul>
            <li><strong>Aufbauen:</strong> erst Hi-Hat + Snare, dann Bassdrum + Snare, dann alles.</li>
            <li><strong>Mitspielen:</strong> Ein Takt wird eingezählt, dann läuft der Groove ${this.DURCHGAENGE}× durch. Zum Üben, gibt keine Sterne.
              Mit ${Icons.raw('tastenLicht')} leuchten die Pads mit.</li>
            <li><strong>Sterne sammeln:</strong> der ganze Groove, gewertet. Ab 95 % gibt es sechs Sterne.</li>
            <li><strong>Pads</strong> oder <strong>Drumset</strong> – mit ⇄ drehst du die Pads um. Tasten am Computer: A, S, D.</li>
            <li><strong>Bodypercussion:</strong> Hi-Hat = Brust (rechte Hand), Snare = Oberschenkel (linke Hand), Bassdrum = stampfen (rechter Fuß).</li>
          </ul>`;
    const wahl = fill
      ? DG.FILLS.map((f, i) => knopf('g', i, `Fill ${f.nr}<small>${f.art}</small><span class="kp-best"></span>`, i === this.g)).join('')
      : DG.GROOVES.map((gr, i) => knopf('g', i, `Groove ${gr.nr}<small>Note ${gr.note}</small><span class="kp-best"></span>`, i === this.g)).join('');
    this.el.querySelector('.dg-seite').innerHTML = `
      <div class="kp-kopf">
        <h2><a class="karte-zurueck" href="#/" title="Zur Startseite" aria-label="Zur Startseite">${Icons.raw('back')}</a>${this.m().titel}
          <button type="button" class="kp-i" id="kp-i" aria-expanded="false" aria-controls="kp-hilfe" title="Erklärung" aria-label="Erklärung">i</button>
          <span class="kp-oben-rechts">${Vollbild.knopf()}</span></h2>
        <div class="kp-hilfe" id="kp-hilfe" hidden>${hilfe}
          <p class="hint">Anhören: So klingt es.</p>
        </div>
      </div>
      <div class="kp-leiste">
        <div class="klavier-groesse dg-grooves" role="group" aria-label="${fill ? 'Fill' : 'Groove'}">${wahl}</div>
        <div class="klavier-groesse" role="group" aria-label="Übeart">
          ${knopf('art', 'mit', 'Mitspielen', this.art === 'mit')}${knopf('art', 'sterne', `${Icons.raw('star')}Sterne sammeln`, this.art === 'sterne')}
        </div>
        <span class="kp-tempo" role="group" aria-label="Tempo">Tempo
          <button type="button" class="kp-pm" data-bpm="-5" aria-label="Langsamer">−</button>
          <span id="kp-bpm-text" aria-live="polite">${this.bpm}</span>
          <button type="button" class="kp-pm" data-bpm="5" aria-label="Schneller">+</button></span>
      </div>
      <div class="kp-start">
        <button type="button" class="primary" id="kp-los">${Icons.raw('play')}Start</button>
        <button type="button" id="dg-hoeren">${Icons.raw('ear')}Anhören</button>
        <div class="klavier-groesse dg-teile" role="group" aria-label="Aufbau"></div>
        <span class="kp-ergebnis" id="kp-ergebnis" aria-live="polite"></span>
      </div>
      <div class="kp-noten dg-noten"></div>
      <div class="kp-tasten-kopf"><span class="kp-schalter">
          <label class="schalter kp-licht" id="kp-leuchten-feld" title="Pads leuchten mit"><input type="checkbox" role="switch" id="kp-leuchten" aria-label="Pads leuchten mit" ${this.leuchten ? 'checked' : ''}><span class="schalter-bahn"></span>${Icons.raw('tastenLicht')}</label>
          <label class="schalter kp-licht" title="Metronom"><input type="checkbox" role="switch" id="kp-metro" aria-label="Metronom" ${this.metro ? 'checked' : ''}><span class="schalter-bahn"></span>${Icons.raw('metronom')}</label>
          <label class="schalter" id="dg-sticks-feld" title="Beim Vorspielen schlagen Sticks (R, L) und das Bassdrum-Pedal (F) aufs Drumset"><input type="checkbox" role="switch" id="dg-sticks" ${this.sticks ? 'checked' : ''}><span class="schalter-bahn"></span>Sticks <span class="dg-hand R">R</span><span class="dg-hand L">L</span><span class="dg-hand F">F</span></label>
          ${fill ? '' : `<label class="schalter" title="Bodypercussion auf den Pads zeigen"><input type="checkbox" role="switch" id="dg-koerper" ${this.koerper ? 'checked' : ''}><span class="schalter-bahn"></span>Bodypercussion</label>`}
        </span>
        <span class="dg-instrument">
          <button type="button" class="small" id="dg-drehen" title="Pads umdrehen">⇄<span>Umdrehen</span></button>
          <span class="klavier-groesse" role="group" aria-label="Instrument">
            ${knopf('instrument', 'pads', 'Pads', this.instrument === 'pads')}${knopf('instrument', 'set', 'Drumset', this.instrument === 'set')}
          </span>
        </span>
      </div>
      <div class="dg-spielfeld"></div>`;
    Vollbild.binden(this.el.querySelector('.dg-seite'));
    this.bedienen();
    this.allesZeigen();
  },

  /* Auswahl, Teil, Übeart oder Instrument geändert: Leiste, Noten und Spielfeld neu */
  allesZeigen() {
    const el = this.el;
    this.stopp();
    el.querySelectorAll('button[data-g]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.g) === this.g)));
    el.querySelectorAll('button[data-art]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.art === this.art)));
    el.querySelectorAll('button[data-instrument]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.instrument === this.instrument)));
    const teile = el.querySelector('.dg-teile');
    teile.hidden = this.art === 'sterne' || this.teile().length < 2;
    teile.innerHTML = this.teile().map((t, i) => `<button type="button" data-teil="${t}" aria-pressed="${t === this.teil}">${i + 1}. ${this.TEILE[t].name}</button>`).join('');
    teile.querySelectorAll('[data-teil]').forEach(b => b.addEventListener('click', () => {
      this.teil = b.dataset.teil; this.merken('teil', this.teil); this.allesZeigen();
    }));
    el.querySelector('#kp-leuchten-feld').hidden = this.art !== 'mit';
    el.querySelector('#dg-drehen').hidden = this.instrument !== 'pads';
    el.querySelector('#dg-sticks-feld').hidden = this.instrument !== 'set';
    const takte = this.m().takte;
    const alle = this.modus === 'fill'
      ? [...DG.schlaege(this.groove()), ...DG.fillSchlaege(DG.FILLS[this.g], 8)]
      : DG.schlaege(this.groove());
    const aus = this.modus === 'groove' ? ['hh', 's', 'b'].filter(k => !this.meineInstrumente().includes(k)) : [];
    const ausTakt = this.modus === 'fill' && this.teilJetzt() === 'fill' ? 0 : null;
    el.querySelector('.dg-noten').innerHTML = DG.svg(alle, { takte, aus, ausTakt, cursor: true, klasse: 'dg-gross' }) +
      '<div class="pz-einzaehler" hidden aria-hidden="true"><span></span></div><span class="dg-takt-zaehler" hidden></span>';
    this.spielfeld();
    this.besteZeigen();
    el.querySelector('#kp-ergebnis').textContent = '';
  },

  besteZeigen() {
    this.el.querySelectorAll('button[data-g]').forEach(b => {
      const st = Fortschritt.bester(this.m().spiel, Number(b.dataset.g)).sterne;
      b.querySelector('.kp-best').innerHTML = st ? ` ${Icons.raw('star')}${st}` : '';
    });
  },

  spielfeld() {
    const feld = this.el.querySelector('.dg-spielfeld');
    const meine = this.meineInstrumente();
    if (this.instrument === 'pads') {
      const pad = (k, taste) => {
        const ins = DG.INSTR[k];
        return `<button type="button" class="sz-pad dg-pad" data-k="${k}" data-fam="${ins.fam}"${meine.includes(k) ? '' : ' data-aus=""'} aria-label="${ins.name}">
          <span class="sz-pad-name">${ins.name}${ins.koerper ? `<small class="dg-koerper">${ins.koerper}</small>` : ''}</span>
          <span class="sz-taste">${taste.toUpperCase()}</span></button>`;
      };
      const unten = this.REIHEN[this.reihe];
      // Toms oben, von hoch nach tief – umgedreht auch die Toms
      const toms = this.reihe === 'hsb' ? ['t1', 't2', 't3'] : ['t3', 't2', 't1'];
      const sechs = this.modus === 'fill';
      feld.innerHTML = `<div class="sz-pads dg-pads${sechs ? ' sechs' : ''}${this.koerper && !sechs ? '' : ' ohne-koerper'}">
        ${sechs ? toms.map((k, i) => pad(k, this.TOM_TASTEN[i])).join('') : ''}${unten.map((k, i) => pad(k, this.PAD_TASTEN[i])).join('')}</div>`;
    } else {
      // Das Drumset des Schlagzeugs, nur die Teile, die hier vorkommen
      const set = Object.create(Schlagzeugseite);
      set.setAn = Object.fromEntries(Schlagzeugseite.SET.map(({ k }) => [k, meine.includes(k)]));
      set.hhOffen = false;
      feld.innerHTML = `<div class="sz-set-rahmen dg-set">${set.setSvg()}</div>`;
      feld.querySelector('.sz-set').insertAdjacentHTML('beforeend', this.STICK_SVG);
      this.sticksZeigen(null);
    }
    const ziel = e => {
      const p = e.target.closest('.dg-pad, .sz-teil');
      return p && !p.hasAttribute('data-aus') && feld.contains(p) ? p : null;
    };
    feld.onpointerdown = e => {
      const p = ziel(e);
      if (!p) return;
      e.preventDefault();
      this.schlag(p.dataset.k);
    };
    feld.onpointerup = () => Ton.audio();
    feld.oncontextmenu = e => e.preventDefault();
  },
  padEl(k) { return this.el.querySelector(`.dg-spielfeld [data-k="${k}"]`); },
  blitz(k) {
    const p = this.padEl(k);
    if (p) { p.classList.remove('schlag'); void p.getBoundingClientRect(); p.classList.add('schlag'); }
  },

  bedienen() {
    const el = this.el;
    el.querySelectorAll('button[data-g]').forEach(b => b.addEventListener('click', () => {
      this.g = Number(b.dataset.g); this.merken('g', this.g);
      if (!this.teile().includes(this.teil)) this.teil = this.teile()[0];
      this.allesZeigen();
    }));
    el.querySelectorAll('button[data-art]').forEach(b => b.addEventListener('click', () => {
      this.art = b.dataset.art; this.merken('art', this.art); this.allesZeigen();
    }));
    el.querySelectorAll('button[data-instrument]').forEach(b => b.addEventListener('click', () => {
      this.instrument = b.dataset.instrument; this.merkenGemein('instrument', this.instrument); this.allesZeigen();
    }));
    el.querySelector('#dg-drehen').addEventListener('click', () => {
      this.reihe = this.reihe === 'hsb' ? 'bsh' : 'hsb'; this.merkenGemein('reihe', this.reihe); this.stopp(); this.spielfeld();
    });
    el.querySelectorAll('[data-bpm]').forEach(b => b.addEventListener('click', () => {
      this.bpm = Math.min(130, Math.max(50, this.bpm + Number(b.dataset.bpm)));
      el.querySelector('#kp-bpm-text').textContent = this.bpm;
      this.merkenGemein('bpm', this.bpm);
    }));
    const schalter = (id, feld) => el.querySelector(id)?.addEventListener('change', e => {
      this[feld] = e.target.checked; this.merkenGemein(feld, this[feld] ? 'an' : 'aus');
      if (feld === 'koerper') el.querySelector('.dg-pads')?.classList.toggle('ohne-koerper', !this.koerper);
      if (feld === 'sticks') this.sticksZeigen(this.lauf?.t ?? null);
    });
    schalter('#kp-leuchten', 'leuchten'); schalter('#kp-metro', 'metro'); schalter('#dg-koerper', 'koerper'); schalter('#dg-sticks', 'sticks');
    el.querySelector('#kp-los').addEventListener('click', () => { Ton.audio(); this.lauf ? this.stopp() : this.starten(false); });
    el.querySelector('#dg-hoeren').addEventListener('click', () => { Ton.audio(); this.lauf ? this.stopp() : this.starten(true); });
    const i = el.querySelector('#kp-i'), hilfe = el.querySelector('#kp-hilfe');
    const hilfeZeigen = an => { hilfe.hidden = !an; i.setAttribute('aria-expanded', String(an)); };
    i.addEventListener('click', e => { e.stopPropagation(); hilfeZeigen(hilfe.hidden); });
    el.querySelector('.dg-seite').addEventListener('pointerdown', e => {
      if (!hilfe.hidden && !hilfe.contains(e.target) && e.target !== i) hilfeZeigen(false);
    });
    // Computer: A S D wie die unteren Pads, Q W E die Toms – jeweils von links nach rechts
    window.removeEventListener('keydown', this.tasteFn);
    this.tasteFn = e => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.target.closest?.('input, textarea, select')) return;
      const t = e.key.toLowerCase();
      const toms = this.reihe === 'hsb' ? ['t1', 't2', 't3'] : ['t3', 't2', 't1'];
      const k = this.PAD_TASTEN.includes(t) ? this.REIHEN[this.reihe][this.PAD_TASTEN.indexOf(t)]
        : this.modus === 'fill' && this.TOM_TASTEN.includes(t) ? toms[this.TOM_TASTEN.indexOf(t)] : null;
      if (!k || !this.meineInstrumente().includes(k)) return;
      e.preventDefault();
      this.schlag(k);
    };
    window.addEventListener('keydown', this.tasteFn);
  },

  /* ---------- Spielen ---------- */
  uhr() { return performance.now() / 1000; },
  spb() { return 60 / this.bpm; },

  schlag(k) {
    Drums.spielen(k);
    this.blitz(k);
    const l = this.lauf;
    if (!l || l.hoeren) return;
    const t = l.t + (this.uhr() - l.zuletzt) / this.spb();
    if (t < -0.5) return;
    const kand = l.erwartet.filter(e => e.k === k && !e.ok && !e.verpasst && Math.abs(e.t - t) * this.spb() <= this.FENSTER);
    if (!kand.length) {
      l.falsch++;
      const p = Math.round((((t % l.laenge) + l.laenge) % l.laenge) * 2) % (l.laenge * 2);
      this.markieren({ k, p }, 'dg-falsch');
      return;
    }
    const e = kand.sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    e.ok = true;
    this.markieren(e, 'dg-ok');
  },
  markieren(e, klasse) {
    const g = this.el.querySelector(`.dg-noten .dg-n[data-k="${e.k}"][data-p="${e.p}"]`);
    if (!g) return;
    g.classList.remove('dg-ok', 'dg-falsch'); g.classList.add(klasse);
  },

  /* hoeren: alles spielt sich selbst vor (eingezählt, zwei Durchgänge), sonst spielt man mit.
     Ein Durchgang ist ein Takt (Groove) bzw. zwei Takte (Groove + Fill), die Zeit t in Schlägen. */
  starten(hoeren) {
    this.stopp();
    this.el.querySelector('#kp-ergebnis').textContent = '';
    const laenge = this.m().takte * 4;
    const durchgaenge = hoeren ? 2 : this.DURCHGAENGE;
    const noten = this.durchgang();
    const erwartet = [], auto = [];
    for (let d = 0; d < durchgaenge; d++) noten.forEach(n => (hoeren || n.auto ? auto : erwartet).push({ ...n, t: d * laenge + n.p / 2, ok: false }));
    // Was die Sticks spielen: alles, was der Computer vorspielt, je Hand nach der Zeit
    const plan = { R: [], L: [], F: [] };
    auto.filter(e => plan[e.h]).forEach(e => plan[e.h].push(e));
    Object.values(plan).forEach(l => l.sort((a, b) => a.t - b.t));
    this.lauf = { t: -4, zuletzt: this.uhr(), schlag: -5, laenge, durchgaenge, hoeren, erwartet, auto, falsch: 0, d: -1, plan };
    this.el.querySelector(hoeren ? '#dg-hoeren' : '#kp-los').innerHTML = '■ Stopp';
    const schritt = () => {
      if (!this.lauf) return;
      this.weiter();
      if (this.lauf) this.raf = requestAnimationFrame(schritt);
    };
    this.raf = requestAnimationFrame(schritt);
  },

  weiter() {
    const l = this.lauf;
    const jetzt = this.uhr();
    const t = l.t + (jetzt - l.zuletzt) / this.spb();
    l.zuletzt = jetzt;
    const ende = l.durchgaenge * l.laenge;
    // Schläge: Metronom, großer Einzähler
    const schlag = Math.floor(t + 1e-6);
    if (schlag > l.schlag) {
      l.schlag = schlag;
      if ((this.metro || schlag < 0) && schlag < ende) Ton.klick(0, ((schlag % 4) + 4) % 4 === 0);
      const ez = this.el.querySelector('.dg-noten .pz-einzaehler');
      ez.hidden = schlag >= 0;
      if (schlag < 0) {
        const zahl = ez.firstChild;
        zahl.textContent = schlag + 5;
        zahl.classList.remove('schlag'); void zahl.offsetWidth; zahl.classList.add('schlag');
      }
    }
    // Neuer Durchgang: Markierungen weg, Zähler „2 von 4“
    const d = Math.floor(t / l.laenge);
    if (t >= 0 && d !== l.d && d < l.durchgaenge) {
      l.d = d;
      this.el.querySelectorAll('.dg-noten .dg-ok, .dg-noten .dg-falsch').forEach(g => g.classList.remove('dg-ok', 'dg-falsch'));
      const z = this.el.querySelector('.dg-takt-zaehler');
      z.hidden = false; z.textContent = `${d + 1} von ${l.durchgaenge}`;
    }
    // Der Computer spielt (Anhören, Groove unter dem Fill); verpasste eigene Schläge
    for (const e of l.auto) if (!e.ok && t >= e.t) { e.ok = true; Drums.spielen(e.k, undefined, e.k === 'hh' ? 0.7 : 1); this.blitz(e.k); }
    for (const e of l.erwartet) if (!e.ok && !e.verpasst && (t - e.t) * this.spb() > this.FENSTER) {
      e.verpasst = true;
      this.markieren(e, 'dg-falsch');
    }
    l.t = t;
    this.sticksZeigen(t);
    // Cursor über dem gezeichneten Durchgang
    const c = this.el.querySelector('.dg-noten .kp-cursor');
    if (t < 0 || t >= ende) c.setAttribute('hidden', '');
    else {
      const p = (t % l.laenge) * 2;
      const ganz = Math.min(Math.floor(p), l.laenge * 2 - 1);
      c.removeAttribute('hidden');
      c.setAttribute('x', DG.x(ganz) + (p - ganz) * DG.B - 8);
    }
    // Pads leuchten (nur Mitspielen mit Schalter): was gerade fällig ist
    if (!l.hoeren && this.art === 'mit' && this.leuchten) {
      const faellig = new Set(l.erwartet.filter(e => t >= e.t - 0.2 && t < e.t + 0.25).map(e => e.k));
      this.el.querySelectorAll('.dg-spielfeld [data-k]').forEach(p => p.classList.toggle('ziel', faellig.has(p.dataset.k)));
    }
    if (t >= ende + 0.5) this.fertig();
  },

  fertig() {
    const l = this.lauf;
    this.stopp();
    if (l.hoeren) return;
    const erg = this.el.querySelector('#kp-ergebnis');
    const ok = l.erwartet.filter(e => e.ok).length;
    const p = Math.max(0, Math.round((ok - l.falsch * 0.5) / l.erwartet.length * 100));
    if (this.art === 'mit') {
      const weiter = this.teile().indexOf(this.teil) < this.teile().length - 1;
      erg.innerHTML = `${p} % · ${ok} von ${l.erwartet.length} Schlägen${l.falsch ? ` · ${l.falsch}× daneben` : ''}.
        ${p >= 85 ? (weiter ? 'Gut! Weiter zum nächsten Schritt.' : 'Gut! Jetzt probier es bei „Sterne sammeln“.') : 'Weiter üben – gern etwas langsamer.'}`;
      return;
    }
    const sterne = Math.max(1, Pruefungsseite.sterne(p));
    const spiel = this.m().spiel;
    const alt = Fortschritt.bester(spiel, this.g).punkte || 0;
    Fortschritt.eintragen(spiel, this.g, sterne, p, ok, l.erwartet.length, Math.round(l.durchgaenge * l.laenge * this.spb()));
    const letzte = this.g >= this.auswahl().length - 1;
    const wort = this.modus === 'fill' ? 'Fill' : 'Groove';
    erg.innerHTML = `<span class="kp-sterne">${sterneHtml(sterne)}</span>
      <span>${p} %${l.falsch ? ` · ${l.falsch}× daneben` : ''}${p > alt && alt ? ' · <strong>Neuer Bestwert!</strong>' : ''}.
      ${p >= 95 ? (letzte ? `Perfekt – alle ${wort}s!` : `Perfekt – weiter zum nächsten ${wort}!`) : p >= 80 ? 'Super – noch ein paar Mal!' : 'Übe erst bei „Mitspielen“ oder langsamer.'}</span>`;
    const felder = [...erg.querySelectorAll('.stern.an')];
    felder.forEach(f => f.classList.remove('an'));
    const leiter = [72, 74, 76, 79, 81, 84];
    felder.forEach((f, i) => App.spaeter(() => { f.classList.add('an'); Ton.klavier(leiter[i], 0, 0.35, 0.12); }, 250 + i * 220));
    this.besteZeigen();
  },

  stopp() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    const l = this.lauf;
    this.lauf = null;
    if (!this.el?.querySelector('.dg-seite .kp-start')) return;
    this.el.querySelector('#kp-los').innerHTML = `${Icons.raw('play')}${l && !l.hoeren ? 'Nochmal' : 'Start'}`;
    this.el.querySelector('#dg-hoeren').innerHTML = `${Icons.raw('ear')}Anhören`;
    this.el.querySelector('.dg-noten .kp-cursor')?.setAttribute('hidden', '');
    const ez = this.el.querySelector('.dg-noten .pz-einzaehler');
    if (ez) ez.hidden = true;
    const z = this.el.querySelector('.dg-takt-zaehler');
    if (z) z.hidden = true;
    this.el.querySelectorAll('.dg-spielfeld .ziel').forEach(p => p.classList.remove('ziel'));
    this.sticksZeigen(null);
  },

  /* ---------- Sticks über dem Drumset (nur beim Vorspielen) ----------
     Von oben gesehen: die Spitze trifft das Fell, der Griff liegt beim Spieler (unten). Farben wie der Handsatz
     der Rhythmus-Prüfung Klasse 6: rechts orange, links türkis; das Bassdrum-Pedal lila. Zwischen zwei Schlägen hebt sich der Stick (Spitze rückt nach oben, Schatten bleibt
     auf dem Fell) und wandert zum nächsten Ziel; im Moment des Schlags liegt die Spitze auf dem Ziel. */
  STICK_ZIEL: { hh: [193, 343], s: [270, 466], t1: [424, 252], t2: [612, 252], t3: [786, 448] },
  STICK_GRIFF: { R: [128, 68], L: [-104, 116] },         // vom Ziel zum Griff – wie Toms Skizze, nicht über Kreuz
  STICK_RUHE: { R: 'hh', L: 's' },
  STICK_SVG: `<g class="dg-sticks" pointer-events="none">
      <g class="dg-pedal"><rect class="dg-pedal-brett" x="484" y="622" width="52" height="74" rx="10"/>
        <line class="dg-pedal-stange" x1="510" y1="676" x2="510" y2="640"/><circle class="dg-pedal-ball" cx="510" cy="640" r="15"/>
        <text class="dg-pedal-f" x="510" y="690">F</text></g>
      ${['L', 'R'].map(h => `<g class="dg-stick ${h}" data-h="${h}">
        <ellipse class="dg-stick-schatten" rx="13" ry="7"/>
        <line class="dg-stick-holz"/>
        <circle class="dg-stick-kopf" r="9"/>
        <g class="dg-stick-griff"><circle r="17"/><text dy="6">${h}</text></g>
      </g>`).join('')}</g>`,
  /* Wie hoch ein Stick bzw. der Schlägel gerade ist: 0 im Moment des Schlags, 1 ausgeholt */
  hebung(plan, t, D = 0.22) {
    let vor = null, nach = null;
    for (const e of plan) { if (e.t <= t) vor = e; else { nach = e; break; } }
    if (!vor && !nach) return { vor, nach, heb: 1 };
    if (!vor) return { vor, nach, heb: Math.max(0, Math.min(1, (nach.t - t) / D)) };
    if (!nach) return { vor, nach, heb: Math.max(0, Math.min(1, (t - vor.t) / D)) };
    const d = Math.min(D, (nach.t - vor.t) / 2);
    return { vor, nach, heb: Math.max(0, Math.min(1, (t - vor.t) / d, (nach.t - t) / d)) };
  },
  sticksZeigen(t) {
    const g = this.el?.querySelector('.dg-set .dg-sticks');
    if (!g) return;
    g.style.display = this.sticks ? '' : 'none';
    if (!this.sticks) return;
    const l = this.lauf;
    // Bassdrum-Pedal: der Schlägel kickt aus der Ruhe (unten) hoch aufs Fell, das Brett wird getreten
    const fuss = this.hebung(t === null || !l ? [] : l.plan.F, t ?? 0, 0.3).heb;
    const ballY = 588 + 58 * fuss;
    g.querySelector('.dg-pedal-stange').setAttribute('y2', ballY);
    g.querySelector('.dg-pedal-ball').setAttribute('cy', ballY);
    g.querySelector('.dg-pedal-brett').style.opacity = 0.55 + 0.45 * (1 - fuss);
    g.querySelector('.dg-pedal').style.display = this.instrumente().includes('b') ? '' : 'none';
    for (const h of ['R', 'L']) {
      const plan = t === null || !l ? [] : l.plan[h];
      let vor = null, nach = null;
      for (const e of plan) { if (e.t <= t) vor = e; else { nach = e; break; } }
      const ziel = k => this.STICK_ZIEL[k] || this.STICK_ZIEL[this.STICK_RUHE[h]];
      // Wohin der Stick gerade zeigt und wie hoch er ist (0 = auf dem Fell, 1 = oben)
      let pos, heb;
      const D = 0.22;                       // Schläge, die er zum Ausholen und Zurückfedern braucht
      if (!vor && !nach) { pos = ziel(this.STICK_RUHE[h]); heb = 1; }
      else if (!vor) { pos = ziel(nach.k); heb = Math.min(1, (nach.t - t) / D); }
      else if (!nach) { pos = ziel(vor.k); heb = Math.min(1, (t - vor.t) / D); }
      else {
        const a = ziel(vor.k), b = ziel(nach.k);
        const f = Math.min(1, Math.max(0, (t - vor.t) / (nach.t - vor.t)));
        const w = f * f * (3 - 2 * f);
        pos = [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
        const d = Math.min(D, (nach.t - vor.t) / 2);
        heb = Math.min(1, (t - vor.t) / d, (nach.t - t) / d);
      }
      heb = Math.max(0, heb);
      const [gx, gy] = this.STICK_GRIFF[h];
      const sx = pos[0], sy = pos[1] - 48 * heb;           // Spitze (gehoben)
      const fx = pos[0] + gx, fy = pos[1] + gy - 18 * heb; // Griff
      const el = g.querySelector(`.dg-stick.${h}`);
      el.querySelector('.dg-stick-schatten').setAttribute('cx', pos[0]);
      el.querySelector('.dg-stick-schatten').setAttribute('cy', pos[1]);
      el.querySelector('.dg-stick-schatten').style.opacity = 0.15 + 0.35 * (1 - heb);
      const holz = el.querySelector('.dg-stick-holz');
      holz.setAttribute('x1', fx); holz.setAttribute('y1', fy); holz.setAttribute('x2', sx); holz.setAttribute('y2', sy);
      el.querySelector('.dg-stick-kopf').setAttribute('cx', sx);
      el.querySelector('.dg-stick-kopf').setAttribute('cy', sy);
      // R/L dort, wo man den Stick hält: im hinteren Drittel, ein Stück vor dem Ende
      const H = 0.74;
      el.querySelector('.dg-stick-griff').setAttribute('transform', `translate(${sx + (fx - sx) * H} ${sy + (fy - sy) * H})`);
    }
  },
};

/* ---------- Spiele im Bereich „Drums“ (Unterkategorien „Drumgrooves“ und „Groove + Fill“) ---------- */
SPIELE.splice(SPIELE.map(s => s.bereich).lastIndexOf('Rhythmus') + 1, 0,
  {
    id: 'groove-hoeren',
    bereich: 'Drums',
    unter: 'Drumgrooves',
    titel: 'Welcher Groove?',
    text: 'Hör genau auf die Bassdrum: Welcher der fünf Grooves aus der Stunde läuft gerade?',
    icon: 'ear',
    farbe: '#f9a8d4',
    stufen: [
      { name: 'Groove 1 bis 3', info: 'Notenbild wählen', grooves: [0, 1, 2], tempo: 84 },
      { name: 'Alle fünf Grooves', info: 'Notenbild wählen', grooves: [0, 1, 2, 3, 4], tempo: 90 },
      { name: 'Bassdrum auf …', info: 'Zählzeiten der Bassdrum', grooves: [1, 2, 3, 4], tempo: 96, text: true },
    ],
    aufgabe(st) {
      const i = zufall(st.grooves);
      const g = DG.GROOVES[i];
      const reihe = mische([i, ...mische(st.grooves.filter(x => x !== i)).slice(0, st.text ? 3 : 2)]);
      return {
        frage: st.text ? 'Auf welchen Zählzeiten spielt die Bassdrum?' : 'Welcher Groove läuft?',
        hoeren: () => DG.vorspielen(DG.schlaege(g), 1, st.tempo),
        optionen: reihe.map(x => (st.text ? (DG.bassText(DG.GROOVES[x]) || 'keine Bassdrum') : DG.svg(DG.schlaege(DG.GROOVES[x]), { zaehlen: false, klasse: 'dg-quiz' }))),
        breit: !st.text,
        richtig: reihe.indexOf(i),
        loesung: `Das war Groove ${g.nr}: ${g.bass.length ? `Bassdrum auf ${DG.bassText(g)}` : 'ohne Bassdrum'}, die Snare auf 2 und 4.`,
      };
    },
  },
  {
    id: 'fill-hoeren',
    bereich: 'Drums',
    unter: 'Groove + Fill',
    titel: 'Welcher Fill?',
    text: 'Ein Takt Groove, ein Takt Fill: Welcher Fill war es – auf Snare oder Toms, in Vierteln oder Achteln?',
    icon: 'ear',
    farbe: '#a5b4fc',
    stufen: [
      { name: 'Viertel-Fills', info: 'Fill 1 bis 4', fills: [0, 1, 2, 3], tempo: 80 },
      { name: 'Achtel-Fills', info: 'Fill 5 bis 8', fills: [4, 5, 6, 7], tempo: 80 },
      { name: 'Alle Fills', info: 'Viertel und Achtel gemischt', fills: [0, 1, 2, 3, 4, 5, 6, 7], tempo: 88 },
    ],
    aufgabe(st) {
      const i = zufall(st.fills);
      const f = DG.FILLS[i];
      const reihe = mische([i, ...mische(st.fills.filter(x => x !== i)).slice(0, 2)]);
      const groove = DG.schlaege(DG.GROOVES[Drumgrooves.FILL_GROOVE]);
      return {
        frage: 'Welcher Fill kommt nach dem Groove?',
        hoeren: () => DG.vorspielen([...groove, ...DG.fillSchlaege(f, 8)], 2, st.tempo),
        optionen: reihe.map(x => DG.svg(DG.fillSchlaege(DG.FILLS[x]), { zaehlen: false, klasse: 'dg-quiz' })),
        breit: true,
        richtig: reihe.indexOf(i),
        loesung: `Das war Fill ${f.nr}: ${f.name} in ${f.art}n.`,
      };
    },
  });
