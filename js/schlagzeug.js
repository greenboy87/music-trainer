/* Schlagzeug zum freien Spielen (#/schlagzeug, #/schlagzeug/drumset, #/schlagzeug/drumcomputer).

   Drei Reiter:
   – Pads: drei große Pads, Klang je Pad wählbar (Hi-Hat, Snare, Bassdrum vorgegeben).
   – Drumset: ein gezeichnetes Schlagzeug; was man abwählt, wird grau und klingt nicht.
   – Drumcomputer: 16 Sechzehntel in vier Vierergruppen je Instrument, mit Tempo und Vorlagen.
   Der Drumcomputer läuft beim Wechsel des Reiters weiter – so kann man auf den Pads
   oder am Drumset dazu spielen. Die Klänge sind im Browser erzeugt, wie in der
   Rhythmus-Werkstatt (Becken, Bassdrum, Toms aus js/beat.js und js/drumset.js, Snare
   und Klatschen aus js/audio.js); Bongos und Kuhglocke sind neu. Auswahl, Tempo und
   Beat merkt sich der Browser. */

/* ---------- Klänge ---------- */
const Drums = {
  KLAENGE: {
    hh: 'Hi-Hat', ho: 'Hi-Hat offen', s: 'Snare', b: 'Bassdrum', crash: 'Becken (Crash)', ride: 'Ride',
    t1: 'Tom 1', t2: 'Tom 2', t3: 'Standtom', clap: 'Klatschen', bh: 'Bongo hoch', bt: 'Bongo tief', kuh: 'Kuhglocke',
  },
  /* Farbfamilie: Becken gelb, Snare orange, Bassdrum blau, Toms grün, Percussion rosa */
  FAMILIE: { hh: 'becken', ho: 'becken', crash: 'becken', ride: 'becken', s: 'snare', b: 'bass',
    t1: 'tom', t2: 'tom', t3: 'tom', clap: 'perc', bh: 'perc', bt: 'perc', kuh: 'perc' },
  TOM_HZ: { t1: 210, t2: 155, t3: 105 },
  offen: null,          // Hüllkurve der offenen Hi-Hat – die geschlossene würgt sie ab

  /* Alle Schläge über eine Summe mit Begrenzer in Ton.ausgang, damit Ton.stopp() sie mit beendet */
  ziel() {
    const c = Ton.audio();
    if (this.busAusgang !== Ton.ausgang) {
      this.bus = c.createGain();
      this.bus.gain.value = 0.8;
      const b = c.createDynamicsCompressor();
      b.threshold.value = -8; b.knee.value = 4; b.ratio.value = 10;
      b.attack.value = 0.002; b.release.value = 0.12;
      this.bus.connect(b).connect(Ton.ausgang);
      this.busAusgang = Ton.ausgang;
      this.offen = null;
    }
    return this.bus;
  },

  /* Ein Schlag. zeit: AudioContext-Zeit (leer = sofort) */
  spielen(k, zeit, staerke = 1) {
    const c = Ton.audio();
    const ziel = this.ziel();
    const t = zeit ?? c.currentTime + 0.005;
    if (k === 'hh' || k === 'ho') this.abwuergen(t);
    if (k === 'b') this.bassdrum(c, t, ziel, staerke);
    else if (k === 's') this.snare(c, t, ziel, staerke);
    else if (this.TOM_HZ[k]) this.tom(c, t, ziel, k, staerke);
    else if (k === 'clap') this.klatschen(c, t, ziel, staerke);
    else if (k === 'bh' || k === 'bt') this.bongo(c, t, ziel, k === 'bh' ? 400 : 285, staerke);
    else if (k === 'kuh') this.kuhglocke(c, t, ziel, staerke);
    else {
      const g = this.becken(c, t, ziel, k, staerke);
      if (k === 'ho') this.offen = g;
    }
  },

  abwuergen(t) {
    if (!this.offen) return;
    this.offen.gain.cancelScheduledValues(t);
    this.offen.gain.setTargetAtTime(0.0001, t, 0.012);
    this.offen = null;
  },

  rauschen(c, sek) {
    const n = Math.max(1, Math.floor(c.sampleRate * sek));
    const p = c.createBuffer(1, n, c.sampleRate);
    const d = p.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const q = c.createBufferSource();
    q.buffer = p;
    return q;
  },

  huelle(c, t, laut, dauer) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, laut), t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    return g;
  },

  /* Becken: sechs Rechtecktöne mit „schiefen“ Frequenzen wie bei der Roland 808, dazu Rauschen */
  becken(c, t, ziel, art, st) {
    const P = {
      hh: { band: 10000, hoch: 7000, dauer: 0.06, laut: 2.0, rausch: 0.5 },
      ho: { band: 9000, hoch: 6000, dauer: 0.42, laut: 1.5, rausch: 0.5 },
      ride: { band: 5500, hoch: 3500, dauer: 0.9, laut: 0.75, rausch: 0.15 },
      crash: { band: 7000, hoch: 3000, dauer: 1.6, laut: 0.95, rausch: 0.9 },
    }[art];
    const summe = c.createGain();
    summe.gain.value = 0.16;
    [205.3, 304.4, 369.6, 522.7, 540, 800].forEach(f => {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = art === 'ride' ? f * 1.4 : f;
      o.connect(summe);
      o.start(t); o.stop(t + P.dauer + 0.05);
    });
    const r = this.rauschen(c, P.dauer + 0.05);
    const rg = c.createGain();
    rg.gain.value = P.rausch;
    r.connect(rg).connect(summe);
    r.start(t);
    const band = c.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = P.band; band.Q.value = 0.7;
    const hoch = c.createBiquadFilter();
    hoch.type = 'highpass'; hoch.frequency.value = P.hoch;
    const g = this.huelle(c, t, P.laut * st, P.dauer);
    summe.connect(band).connect(hoch).connect(g).connect(ziel);
    return g;
  },

  /* Bassdrum: Sinus mit schnellem Tonhöhenabfall (150 → 48 Hz) und Klick des Schlegels */
  bassdrum(c, t, ziel, st) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    o.connect(this.huelle(c, t, st, 0.42)).connect(ziel);
    o.start(t); o.stop(t + 0.45);
    const k = c.createOscillator();
    k.type = 'triangle';
    k.frequency.setValueAtTime(1100, t);
    k.frequency.exponentialRampToValueAtTime(200, t + 0.015);
    k.connect(this.huelle(c, t, 0.3 * st, 0.02)).connect(ziel);
    k.start(t); k.stop(t + 0.03);
  },

  /* Snare: Fell (zwei Töne), Anschlag und Teppich (gefiltertes Rauschen) */
  snare(c, t, ziel, st) {
    const s = 1.3 * st;
    const ton = (f0, f1, laut, dauer) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(laut * s, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      o.connect(g).connect(ziel);
      o.start(t); o.stop(t + dauer + 0.02);
    };
    ton(195, 165, 0.26, 0.11);
    ton(335, 290, 0.1, 0.07);
    const r = this.rauschen(c, 0.24);
    const hoch = c.createBiquadFilter();
    hoch.type = 'highpass'; hoch.frequency.value = 1400;
    const glocke = c.createBiquadFilter();
    glocke.type = 'peaking'; glocke.frequency.value = 5000; glocke.Q.value = 0.9; glocke.gain.value = 5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.27 * s, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.07 * s, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    r.connect(hoch).connect(glocke).connect(g).connect(ziel);
    r.start(t);
  },

  /* Toms: Sinus mit Tonhöhenabfall wie die Bassdrum, nur höher, dazu etwas Fell-Rauschen */
  tom(c, t, ziel, k, st) {
    const f = this.TOM_HZ[k];
    const dauer = k === 't3' ? 0.7 : 0.5;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(f * 0.85, t + dauer);
    o.connect(this.huelle(c, t, 0.95 * st, dauer)).connect(ziel);
    o.start(t); o.stop(t + dauer + 0.05);
    const r = this.rauschen(c, 0.08);
    const band = c.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = f * 8; band.Q.value = 0.9;
    r.connect(band).connect(this.huelle(c, t, 0.35 * st, 0.07)).connect(ziel);
    r.start(t);
  },

  /* Klatschen: drei schnell aufeinanderfolgende Rauschstöße wie mehrere Hände */
  klatschen(c, t, ziel, st) {
    [0, 0.011, 0.023].forEach((v, i) => {
      const n = Math.floor(c.sampleRate * (i === 2 ? 0.14 : 0.03));
      const p = c.createBuffer(1, n, c.sampleRate);
      const d = p.getChannelData(0);
      for (let j = 0; j < n; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / n, 3);
      const q = c.createBufferSource();
      q.buffer = p;
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
      const g = c.createGain();
      g.gain.value = 1.1 * st;
      q.connect(f).connect(g).connect(ziel);
      q.start(t + v);
    });
  },

  /* Bongo: kurzer, hoher Sinus mit kleinem Tonhöhenabfall und hellem Fingeranschlag */
  bongo(c, t, ziel, f, st) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.35, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
    const dauer = f > 300 ? 0.17 : 0.24;
    o.connect(this.huelle(c, t, 0.85 * st, dauer)).connect(ziel);
    o.start(t); o.stop(t + dauer + 0.03);
    const r = this.rauschen(c, 0.03);
    const band = c.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = 3200; band.Q.value = 1.2;
    r.connect(band).connect(this.huelle(c, t, 0.3 * st, 0.025)).connect(ziel);
    r.start(t);
  },

  /* Kuhglocke: zwei Rechtecktöne (540 und 800 Hz) durch einen Bandpass, wie bei der 808 */
  kuhglocke(c, t, ziel, st) {
    const band = c.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = 900; band.Q.value = 1.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * st, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.12 * st, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    band.connect(g).connect(ziel);
    [540, 800].forEach(f => {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      o.connect(band);
      o.start(t); o.stop(t + 0.37);
    });
  },
};

/* ---------- Seite ---------- */
const Schlagzeugseite = {
  REITER: { pads: 'Pads', drumset: 'Drumset', drumcomputer: 'Drumcomputer' },
  reiter: 'pads',

  /* Pads: Klang je Pad und Taste */
  pads: ['hh', 's', 'b'],
  PAD_TASTEN: ['a', 's', 'd'],

  /* Drumset: Teile mit Taste (wie im Drumset der Rhythmus-Werkstatt) */
  SET: [
    { k: 'crash', name: 'Crash', taste: '1' },
    { k: 'hh', name: 'Hi-Hat', taste: '2' },
    { k: 'ride', name: 'Ride', taste: '4' },
    { k: 's', name: 'Snare', taste: 'q' },
    { k: 't1', name: 'Tom 1', taste: 'w' },
    { k: 't2', name: 'Tom 2', taste: 'e' },
    { k: 't3', name: 'Standtom', taste: 'r' },
    { k: 'b', name: 'Bassdrum', taste: 'b' },
  ],
  setAn: { crash: true, hh: true, ride: true, s: true, t1: true, t2: true, t3: true, b: true },
  hhOffen: false,
  namen: true,

  /* Drumcomputer */
  /* Reihenfolge und Farben wie bei Step-Sequenzern auf dem Tablet: Bassdrum oben, je Spur eine Farbe */
  SPUREN: ['b', 's', 'clap', 'hh', 'ho', 'crash', 'ride', 't1', 'bh', 'bt'],
  /* Einfache Ansicht für den Anfang: nur Bassdrum, Snare, Hi-Hat und Becken */
  EINFACH: ['b', 's', 'hh', 'crash'],
  einfach: true,
  SPUR_NAMEN: { crash: 'Becken', ride: 'Ride', ho: 'Hi-Hat offen', hh: 'Hi-Hat', clap: 'Klatschen', s: 'Snare', t1: 'Tom', bh: 'Bongo hoch', bt: 'Bongo tief', b: 'Bassdrum' },
  SPUR_KURZ: { crash: 'Becken', ride: 'Ride', ho: 'HH offen', hh: 'Hi-Hat', clap: 'Klatschen', s: 'Snare', t1: 'Tom', bh: 'Bongo ↑', bt: 'Bongo ↓', b: 'Bass' },
  SPUR_FARBE: { b: '#e055d2', s: '#eaa93c', clap: '#eaa93c', hh: '#4fd3dc', ho: '#4fd3dc', crash: '#62a8ff', ride: '#62a8ff', t1: '#5ed65e', bh: '#a46cf5', bt: '#a46cf5' },
  SPUR_ICON: {
    b: '<circle cx="12" cy="11" r="8"/><circle cx="12" cy="11" r="3"/><path d="M6.5 17.5 4.5 21.5M17.5 17.5l2 4"/>',
    s: '<ellipse cx="12" cy="8" rx="9" ry="3"/><path d="M3 8v7.5c0 1.7 4 3 9 3s9-1.3 9-3V8"/><path d="M6.5 10.6v7M10 11v7.4M14 11v7.4M17.5 10.6v7"/>',
    clap: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v8M14 11.5V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 16.5L3 13a1.5 1.5 0 0 1 2.6-1.4L8 14"/>',
    hh: '<ellipse cx="12" cy="8" rx="9.5" ry="2"/><ellipse cx="12" cy="11" rx="9.5" ry="2"/><path d="M12 13v8M8.5 21h7"/>',
    ho: '<ellipse cx="12" cy="4.5" rx="9.5" ry="2"/><ellipse cx="12" cy="12" rx="9.5" ry="2"/><path d="M12 6.5V10M12 14v7M8.5 21h7"/>',
    crash: '<ellipse cx="12" cy="8" rx="10" ry="2.3" transform="rotate(-12 12 8)"/><path d="M12 10.5V21M8 21l4-3 4 3"/>',
    ride: '<ellipse cx="12" cy="9" rx="10.5" ry="2.4"/><path d="M9.8 7a2.2 1.3 0 0 1 4.4 0"/><path d="M12 11.5V21M8 21l4-3 4 3"/>',
    t1: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-12"/><path d="M8.5 7.8v11.5M15.5 7.8v11.5"/>',
    bh: '<ellipse cx="8" cy="8" rx="5" ry="1.8"/><path d="M3 8l1.6 10h6.8L13 8"/><ellipse cx="17.5" cy="9.5" rx="3.6" ry="1.4" fill="currentColor"/><path d="M13.9 9.5l1 7.5h5.2l1-7.5"/>',
    bt: '<ellipse cx="8" cy="8" rx="5" ry="1.8" fill="currentColor"/><path d="M3 8l1.6 10h6.8L13 8"/><ellipse cx="17.5" cy="9.5" rx="3.6" ry="1.4"/><path d="M13.9 9.5l1 7.5h5.2l1-7.5"/>',
  },
  SILBEN: ['', 'e', '+', 'e'],
  VORLAGEN: {
    rock: { name: 'Rock', bpm: 100, beat: { hh: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', b: 'x.......x.x.....', crash: 'x...............' } },
    pop: { name: 'Pop', bpm: 108, beat: { hh: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', b: 'x..x..x.x.......' } },
    disco: { name: 'Disco', bpm: 120, beat: { hh: 'x...x...x...x...', ho: '..x...x...x...x.', s: '....x.......x...', b: 'x...x...x...x...' } },
    funk: { name: 'Funk', bpm: 96, beat: { hh: 'xxxxxxxxxxxxxxxx', s: '....x..x.x..x...', b: 'x.x.......x..x..' } },
    hiphop: { name: 'Hip-Hop', bpm: 88, beat: { hh: 'x.x.x.x.x.x.x.x.', clap: '....x.......x...', b: 'x......xx.x.....' } },
    bongo: { name: 'Bongo-Groove', bpm: 104, beat: { bh: 'x.xx..x.x.xx..x.', bt: '...x.x.....x.x.x', hh: '..x...x...x...x.', b: 'x.......x.......' } },
    leer: { name: 'Leer', bpm: 100, beat: {} },
  },
  bpm: 100,
  beat: {},             // Spur → Array mit 16 Wahrheitswerten
  laeuft: false,        // Drumcomputer spielt
  metroAn: false,       // Metronom klickt – beide laufen über dieselbe Taktuhr

  merken(s, wert) {
    try { localStorage.setItem(`musiktrainer-schlagzeug-${s}`, typeof wert === 'string' ? wert : JSON.stringify(wert)); } catch { /* privates Fenster */ }
  },
  lies(s) {
    try { return localStorage.getItem(`musiktrainer-schlagzeug-${s}`); } catch { return null; }
  },

  laden() {
    try {
      const p = JSON.parse(this.lies('pads'));
      if (Array.isArray(p) && p.length === 3 && p.every(k => k in Drums.KLAENGE)) this.pads = p;
      const a = JSON.parse(this.lies('set'));
      if (a && typeof a === 'object') this.SET.forEach(({ k }) => { if (typeof a[k] === 'boolean') this.setAn[k] = a[k]; });
      this.hhOffen = this.lies('hh-offen') === 'an';
      this.einfach = this.lies('ansicht') !== 'profi';
      this.namen = this.lies('namen') !== 'aus';
      const bpm = Number(this.lies('bpm'));
      if (bpm >= 50 && bpm <= 200) this.bpm = bpm;
      const b = JSON.parse(this.lies('beat'));
      if (b && typeof b === 'object') { this.beatSetzen(b); return; }
    } catch { /* kaputt oder privat */ }
    this.vorlageLaden('rock', false);
  },

  /* Beat aus Text: x = Schlag, . = Pause */
  beatSetzen(text) {
    this.beat = {};
    this.SPUREN.forEach(k => {
      const s = typeof text[k] === 'string' ? text[k] : '';
      this.beat[k] = Array.from({ length: 16 }, (_, i) => s[i] === 'x');
    });
  },
  beatText() {
    const t = {};
    this.SPUREN.forEach(k => { if (this.beat[k].some(Boolean)) t[k] = this.beat[k].map(x => (x ? 'x' : '.')).join(''); });
    return t;
  },
  beatMerken() { this.merken('beat', this.beatText()); },

  vorlageLaden(id, mitTempo = true) {
    const v = this.VORLAGEN[id];
    this.beatSetzen(v.beat);
    if (mitTempo && id !== 'leer') this.bpm = v.bpm;
  },

  zeigen(el, reiter) {
    this.el = el;
    this.laden();
    if (reiter in this.REITER) this.reiter = reiter;
    else if (this.lies('reiter') in this.REITER) this.reiter = this.lies('reiter');
    this.laeuft = false;
    el.innerHTML = `
      <a class="zurueck" href="#/">${Icons.raw('back')}Alle Spiele</a>
      <section class="card sz-seite">
        <div class="klavier-kopf">
          <h2>${Icons.raw('drum')}Schlagzeug</h2>
          <div class="sz-kopf-rechts">
            <button type="button" class="small sz-laeuft" id="sz-mini-stopp" hidden title="Drumcomputer anhalten (Leertaste)">■ Beat stoppen</button>
            <div class="klavier-groesse sz-reiter" role="tablist" aria-label="Ansicht">
              ${Object.entries(this.REITER).map(([id, name]) => `<button type="button" role="tab" data-reiter="${id}">${name}</button>`).join('')}
            </div>
          </div>
        </div>
        <div class="sz-metro"></div>
        <div class="sz-inhalt"></div>
      </section>`;
    this.inhalt = el.querySelector('.sz-inhalt');
    this.metroAn = false;
    this.uhr = new Taktuhr(() => this.bpm, (i, zeit) => this.schritt(i, zeit), i => this.laufmarke(i));
    this.leiste = new Tempoleiste(el.querySelector('.sz-metro'), {
      bpm: this.bpm,
      beiTempo: b => { this.bpm = b; this.merken('bpm', String(b)); },
      beiMetronom: () => this.metronom(!this.metroAn),
    });
    el.querySelectorAll('[data-reiter]').forEach(b => b.addEventListener('click', () => {
      Ton.audio();
      this.reiterZeigen(b.dataset.reiter);
    }));
    el.querySelector('#sz-mini-stopp').addEventListener('click', () => this.stoppen());
    this.reiterZeigen(this.reiter);

    const taste = e => this.taste(e);
    const weg = () => { if (document.hidden) { this.stoppen(); this.metronom(false); } };
    document.addEventListener('keydown', taste);
    document.addEventListener('visibilitychange', weg);
    App.beimAufraeumen(() => {
      document.removeEventListener('keydown', taste);
      document.removeEventListener('visibilitychange', weg);
      this.laeuft = this.metroAn = false;
      this.uhr.stoppen();
    });
  },

  /* Reiter wechseln, ohne die Seite neu aufzubauen – der Drumcomputer läuft weiter */
  reiterZeigen(id) {
    this.reiter = id;
    this.merken('reiter', id);
    const ziel = `#/schlagzeug${id === 'pads' ? '' : `/${id}`}`;
    if (location.hash !== ziel) history.replaceState(null, '', ziel);
    this.el.querySelectorAll('[data-reiter]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.reiter === id));
      b.setAttribute('aria-selected', String(b.dataset.reiter === id));
    });
    this.gitter = null;
    if (id === 'pads') this.padsZeigen();
    else if (id === 'drumset') this.setZeigen();
    else this.computerZeigen();
    this.miniStopp();
  },

  miniStopp() {
    this.el.querySelector('#sz-mini-stopp').hidden = !this.laeuft || this.reiter === 'drumcomputer';
  },

  taste(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.('select, input[type="number"], input[type="text"]')) return;
    if (e.code === 'Space') {
      if (e.target.closest?.('button') && this.reiter !== 'drumcomputer') return;
      e.preventDefault();
      if (!e.repeat) this.laeuft ? this.stoppen() : this.starten();
      return;
    }
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'm' && !e.target.closest?.('input')) { e.preventDefault(); this.metronom(!this.metroAn); return; }
    if (this.reiter === 'pads') {
      const i = this.PAD_TASTEN.indexOf(k);
      if (i >= 0) { e.preventDefault(); this.padSchlag(i); }
    } else if (this.reiter === 'drumset') {
      if (k === '3') { e.preventDefault(); this.setSchlag('hh', true); return; }
      const t = this.SET.find(s => s.taste === k);
      if (t) { e.preventDefault(); this.setSchlag(t.k); }
    }
  },

  /* Kurzes Aufleuchten: Klasse entfernen, neu zeichnen lassen, wieder setzen */
  aufblitzen(el, klasse = 'schlag') {
    if (!el) return;
    el.classList.remove(klasse);
    void el.getBoundingClientRect();
    el.classList.add(klasse);
  },

  /* ---------- Pads ---------- */
  padsZeigen() {
    const optionen = sel => Object.entries(Drums.KLAENGE).map(([k, n]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${n}</option>`).join('');
    this.inhalt.innerHTML = `
      <div class="sz-pads">
        ${this.pads.map((k, i) => `
          <div class="sz-pad-feld">
            <button type="button" class="sz-pad" data-pad="${i}" data-fam="${Drums.FAMILIE[k]}" aria-label="${Drums.KLAENGE[k]} spielen">
              <span class="sz-pad-name">${Drums.KLAENGE[k]}</span>
              <span class="sz-taste">${this.PAD_TASTEN[i].toUpperCase()}</span>
            </button>
            <label class="klavier-klang sz-pad-wahl"><span class="sr-only">Klang für Pad ${i + 1}</span>
              <select data-wahl="${i}">${optionen(k)}</select>
            </label>
          </div>`).join('')}
      </div>
      <p class="hint sz-hinweis">Tippe auf die Pads – auch mit mehreren Fingern gleichzeitig. Unter jedem Pad stellst du den Klang ein.</p>`;
    this.inhalt.querySelectorAll('.sz-pad').forEach(p => {
      p.addEventListener('pointerdown', e => { e.preventDefault(); this.padSchlag(Number(p.dataset.pad)); });
      p.addEventListener('click', e => { if (e.detail === 0) this.padSchlag(Number(p.dataset.pad)); });
      p.addEventListener('contextmenu', e => e.preventDefault());
      // iPad: Ton erst nach dem Loslassen freigegeben
      p.addEventListener('pointerup', () => Ton.audio());
    });
    this.inhalt.querySelectorAll('[data-wahl]').forEach(s => s.addEventListener('change', () => {
      const i = Number(s.dataset.wahl);
      this.pads[i] = s.value;
      this.merken('pads', this.pads);
      const p = this.inhalt.querySelector(`[data-pad="${i}"]`);
      p.dataset.fam = Drums.FAMILIE[s.value];
      p.querySelector('.sz-pad-name').textContent = Drums.KLAENGE[s.value];
      p.setAttribute('aria-label', `${Drums.KLAENGE[s.value]} spielen`);
      this.padSchlag(i);
    }));
  },

  padSchlag(i) {
    Drums.spielen(this.pads[i]);
    this.aufblitzen(this.inhalt.querySelector(`[data-pad="${i}"]`));
  },

  /* ---------- Drumset ---------- */
  /* Trommel schräg von vorn: Kessel und Fell (Ellipse) */
  trommel(cx, cy, rx, h, kessel = 'sz-kessel') {
    const ry = rx * 0.32;
    return `<path class="${kessel}" d="M${cx - rx} ${cy} v${h} a${rx} ${ry} 0 0 0 ${2 * rx} 0 v${-h} z"/>
      <path class="sz-reif" d="M${cx - rx} ${cy + h} a${rx} ${ry} 0 0 0 ${2 * rx} 0" fill="none"/>
      <ellipse class="sz-fell" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  },
  becken(cx, cy, rx) {
    return `<ellipse class="sz-becken" cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.16}"/>
      <ellipse class="sz-glocke" cx="${cx}" cy="${cy - 2}" rx="${rx * 0.16}" ry="${rx * 0.06}"/>`;
  },
  beschriftung(k, x, y) {
    const t = this.SET.find(s => s.k === k);
    return `<text class="sz-name" x="${x}" y="${y}">${t.name}<tspan class="sz-tk"> · ${t.taste.toUpperCase()}</tspan></text>`;
  },

  setSvg() {
    const teil = (k, inhalt) => `<g class="sz-teil" data-k="${k}"${this.setAn[k] ? '' : ' data-aus=""'} role="button" tabindex="0" aria-label="${this.SET.find(s => s.k === k).name}">${inhalt}</g>`;
    const staender = (x, y1, y2) => `<line class="sz-staender" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><path class="sz-staender" d="M${x - 26} ${y2} L${x} ${y2 - 18} L${x + 26} ${y2}" fill="none"/>`;
    return `<svg class="sz-set" viewBox="0 48 820 452" aria-label="Schlagzeug zum Antippen">
      <ellipse class="sz-boden" cx="410" cy="470" rx="400" ry="26"/>
      ${staender(165, 110, 468)}${staender(665, 120, 468)}${staender(90, 236, 468)}
      ${teil('crash', `<g class="sz-schwing">${this.becken(165, 108, 100)}</g>${this.beschriftung('crash', 165, 70)}`)}
      ${teil('ride', `<g class="sz-schwing">${this.becken(665, 118, 112)}</g>${this.beschriftung('ride', 665, 80)}`)}
      ${teil('b', `<g class="sz-wackel"><circle class="sz-kessel-b" cx="410" cy="360" r="112"/><circle class="sz-fell-b" cx="410" cy="360" r="96"/>
        <text class="sz-logo" x="410" y="368">greenboy</text></g>${this.beschriftung('b', 410, 494)}`)}
      ${teil('t1', `<g class="sz-wackel">${this.trommel(338, 196, 58, 50)}</g>${this.beschriftung('t1', 338, 150)}`)}
      ${teil('t2', `<g class="sz-wackel">${this.trommel(484, 196, 58, 50)}</g>${this.beschriftung('t2', 484, 150)}`)}
      ${teil('t3', `<g class="sz-wackel"><line class="sz-staender" x1="598" y1="380" x2="588" y2="466"/><line class="sz-staender" x1="694" y1="380" x2="704" y2="466"/>
        ${this.trommel(646, 300, 80, 95)}</g>${this.beschriftung('t3', 646, 250)}`)}
      ${teil('s', `<line class="sz-staender" x1="210" y1="360" x2="210" y2="468"/><path class="sz-staender" d="M184 468 L210 448 L236 468" fill="none"/>
        <g class="sz-wackel">${this.trommel(210, 318, 72, 38, 'sz-kessel-s')}</g>${this.beschriftung('s', 210, 270)}`)}
      ${teil('hh', `<g class="sz-hh${this.hhOffen ? ' offen' : ''}"><g class="sz-hh-oben">${this.becken(90, 226, 64)}</g>${this.becken(90, 240, 64)}</g>
        ${this.beschriftung('hh', 90, 200)}`)}
    </svg>`;
  },

  setZeigen() {
    this.inhalt.innerHTML = `
      <div class="sz-auswahl" role="group" aria-label="Instrumente auswählen">
        <span class="sz-auswahl-titel">Instrumente</span>
        ${this.SET.map(({ k, name }) => `<button type="button" class="sz-chip" data-chip="${k}" data-fam="${Drums.FAMILIE[k]}" aria-pressed="${this.setAn[k]}">${name}</button>`).join('')}
        <button type="button" class="small" data-schnell="grund" title="Nur Hi-Hat, Snare und Bassdrum">Nur Grundbeat</button>
        <button type="button" class="small" data-schnell="alle">Alle</button>
      </div>
      <div class="sz-set-optionen">
        <label class="schalter"><input type="checkbox" role="switch" id="sz-hh-offen" ${this.hhOffen ? 'checked' : ''}><span class="schalter-bahn"></span>Hi-Hat offen <span class="sz-tk">(oder Taste 3)</span></label>
        <label class="schalter"><input type="checkbox" role="switch" id="sz-namen" ${this.namen ? 'checked' : ''}><span class="schalter-bahn"></span>Namen</label>
      </div>
      <div class="sz-set-rahmen${this.namen ? '' : ' ohne-namen'}">${this.setSvg()}</div>`;
    const svg = this.inhalt.querySelector('.sz-set');
    svg.addEventListener('pointerdown', e => {
      const g = e.target.closest('.sz-teil');
      if (!g || g.hasAttribute('data-aus')) return;
      e.preventDefault();
      this.setSchlag(g.dataset.k);
    });
    svg.addEventListener('pointerup', () => Ton.audio());
    svg.addEventListener('keydown', e => {
      const g = e.target.closest('.sz-teil');
      if (g && (e.key === 'Enter' || e.key === ' ') && !g.hasAttribute('data-aus')) { e.preventDefault(); e.stopPropagation(); this.setSchlag(g.dataset.k); }
    });
    svg.addEventListener('contextmenu', e => e.preventDefault());
    this.inhalt.querySelectorAll('[data-chip]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.chip;
      this.setAn[k] = !this.setAn[k];
      this.auswahlAnwenden();
      if (this.setAn[k]) this.setSchlag(k);
    }));
    this.inhalt.querySelectorAll('[data-schnell]').forEach(b => b.addEventListener('click', () => {
      const grund = b.dataset.schnell === 'grund';
      this.SET.forEach(({ k }) => { this.setAn[k] = !grund || ['hh', 's', 'b'].includes(k); });
      this.auswahlAnwenden();
    }));
    this.inhalt.querySelector('#sz-hh-offen').addEventListener('change', e => {
      this.hhOffen = e.target.checked;
      this.merken('hh-offen', this.hhOffen ? 'an' : 'aus');
      this.inhalt.querySelector('.sz-hh').classList.toggle('offen', this.hhOffen);
    });
    this.inhalt.querySelector('#sz-namen').addEventListener('change', e => {
      this.namen = e.target.checked;
      this.merken('namen', this.namen ? 'an' : 'aus');
      this.inhalt.querySelector('.sz-set-rahmen').classList.toggle('ohne-namen', !this.namen);
    });
  },

  auswahlAnwenden() {
    this.merken('set', this.setAn);
    this.SET.forEach(({ k }) => {
      this.inhalt.querySelector(`[data-chip="${k}"]`).setAttribute('aria-pressed', String(this.setAn[k]));
      const g = this.inhalt.querySelector(`.sz-teil[data-k="${k}"]`);
      g.toggleAttribute('data-aus', !this.setAn[k]);
      g.setAttribute('aria-disabled', String(!this.setAn[k]));
    });
  },

  /* offen: nur dieses eine Mal offen (Taste 3), sonst gilt der Schalter */
  setSchlag(k, offen = false) {
    if (!this.setAn[k] || !this.inhalt) return;
    const klang = k === 'hh' && (offen || this.hhOffen) ? 'ho' : k;
    Drums.spielen(klang);
    const g = this.inhalt.querySelector(`.sz-teil[data-k="${k}"]`);
    if (k === 'hh') this.aufblitzen(g, klang === 'ho' ? 'schlag-offen' : 'schlag');
    else this.aufblitzen(g);
  },

  /* ---------- Drumcomputer ---------- */
  /* Die sichtbaren Spuren – nur sie klingen, damit nichts Unsichtbares mitspielt */
  spuren() { return this.einfach ? this.SPUREN.filter(k => this.EINFACH.includes(k)) : this.SPUREN; },

  /* Vorlagen, die nur sichtbare Spuren brauchen */
  vorlagen() {
    const sp = this.spuren();
    return Object.entries(this.VORLAGEN).filter(([, v]) => Object.keys(v.beat).every(k => sp.includes(k)));
  },

  computerZeigen() {
    const kopf = Array.from({ length: 16 }, (_, i) => `<span class="sz-zaehl${i % 4 ? '' : ' schlag'}">${i % 4 ? this.SILBEN[i % 4] : i / 4 + 1}</span>`).join('');
    this.inhalt.innerHTML = `
      <div class="sz-steuerung">
        <button type="button" class="primary sz-play" id="sz-play"></button>
        <label class="klavier-klang">Vorlage
          <select id="sz-vorlage"><option value="">– wählen –</option>${this.vorlagen().map(([id, v]) => `<option value="${id}">${v.name}</option>`).join('')}</select>
        </label>
        <button type="button" id="sz-loeschen" class="small">${Icons.raw('reset')}Alles löschen</button>
        <div class="klavier-groesse sz-ansicht" role="group" aria-label="Ansicht">
          <button type="button" data-ansicht="einfach" aria-pressed="${this.einfach}" title="Nur Bassdrum, Snare, Hi-Hat und Becken">Einfach</button>
          <button type="button" data-ansicht="profi" aria-pressed="${!this.einfach}" title="Alle Instrumente">Fortgeschritten</button>
        </div>
      </div>
      <div class="sz-gitter-rahmen">
        <div class="sz-gitter${this.einfach ? ' einfach' : ''}" role="grid" aria-label="Beat: 16 Sechzehntel je Instrument">
          <span class="sz-ecke"></span>${kopf}
          ${this.spuren().map(k => `
            <button type="button" class="sz-spur" data-spur="${k}" style="--farbe:${this.SPUR_FARBE[k]}" title="${this.SPUR_NAMEN[k]} anhören" aria-label="${this.SPUR_NAMEN[k]} anhören">
              <svg viewBox="0 0 24 24" aria-hidden="true">${this.SPUR_ICON[k]}</svg><span>${this.SPUR_KURZ[k]}</span></button>
            ${this.beat[k].map((an, i) => `<button type="button" class="sz-zelle${an ? ' an' : ''}" data-k="${k}" data-i="${i}" style="--farbe:${this.SPUR_FARBE[k]}" aria-pressed="${an}" aria-label="${this.SPUR_NAMEN[k]}, Sechzehntel ${i + 1}"></button>`).join('')}`).join('')}
        </div>
      </div>
      <p class="hint sz-hinweis">Kästchen antippen setzt einen Schlag – mit gedrücktem Finger kannst du über mehrere Kästchen streichen. Jede Vierergruppe ist ein Viertel (1 e + e). Leertaste: Start/Stopp, M: Metronom. Der Beat läuft weiter, wenn du zu den Pads oder zum Drumset wechselst.</p>`;
    this.gitter = this.inhalt.querySelector('.sz-gitter');
    this.playKnopf();
    const play = this.inhalt.querySelector('#sz-play');
    play.addEventListener('click', () => (this.laeuft ? this.stoppen() : this.starten()));
    this.inhalt.querySelectorAll('[data-ansicht]').forEach(b => b.addEventListener('click', () => {
      this.einfach = b.dataset.ansicht === 'einfach';
      this.merken('ansicht', this.einfach ? 'einfach' : 'profi');
      this.computerZeigen();
    }));
    this.inhalt.querySelector('#sz-vorlage').addEventListener('change', e => {
      if (!e.target.value) return;
      this.vorlageLaden(e.target.value);
      this.leiste.setzen(this.bpm);
      this.beatMerken();
      this.computerZeigen();
    });
    this.inhalt.querySelector('#sz-loeschen').addEventListener('click', () => {
      this.vorlageLaden('leer');
      this.beatMerken();
      this.computerZeigen();
    });
    this.gitter.querySelectorAll('.sz-spur').forEach(b => b.addEventListener('click', () => Drums.spielen(b.dataset.spur)));
    this.gitterBedienen();
  },

  playKnopf() {
    const b = this.inhalt?.querySelector('#sz-play');
    if (!b) return;
    b.innerHTML = this.laeuft ? '■ Stopp' : `${Icons.raw('play')}Start`;
    b.setAttribute('aria-pressed', String(this.laeuft));
  },

  /* Antippen schaltet um; streicht der Finger weiter, setzen (oder löschen) alle Kästchen
     unter ihm dasselbe wie das erste */
  gitterBedienen() {
    const g = this.gitter;
    let malt = null;
    const unter = e => {
      const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('.sz-zelle');
      return z && g.contains(z) ? z : null;
    };
    const setzen = (z, an) => {
      const k = z.dataset.k, i = Number(z.dataset.i);
      if (this.beat[k][i] === an) return;
      this.beat[k][i] = an;
      z.classList.toggle('an', an);
      z.setAttribute('aria-pressed', String(an));
      if (an && !this.laeuft) Drums.spielen(k);
    };
    g.addEventListener('pointerdown', e => {
      const z = e.target.closest('.sz-zelle');
      if (!z) return;
      e.preventDefault();
      Ton.audio();
      malt = !this.beat[z.dataset.k][Number(z.dataset.i)];
      try { g.setPointerCapture(e.pointerId); } catch { /* egal */ }
      setzen(z, malt);
    });
    g.addEventListener('pointermove', e => {
      if (malt === null) return;
      const z = unter(e);
      if (z) setzen(z, malt);
    });
    const ende = () => { if (malt !== null) { malt = null; this.beatMerken(); } };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => g.addEventListener(n, ende));
    // Tastatur: Eingabe/Leertaste auf einem Kästchen
    g.addEventListener('click', e => {
      const z = e.detail === 0 && e.target.closest('.sz-zelle');
      if (!z) return;
      setzen(z, !this.beat[z.dataset.k][Number(z.dataset.i)]);
      this.beatMerken();
    });
    g.addEventListener('keydown', e => { if (e.code === 'Space' && e.target.closest('.sz-zelle')) e.stopPropagation(); });
  },

  /* Beat starten: Läuft das Metronom schon, steigt der Beat an der Stelle im Takt ein,
     an der die Uhr gerade ist – beide bleiben zusammen */
  starten() {
    if (this.laeuft) return;
    this.laeuft = true;
    this.uhr.starten();
    this.playKnopf();
    this.miniStopp();
  },

  stoppen() {
    if (!this.laeuft) return;
    this.laeuft = false;
    this.gitter?.querySelectorAll('.jetzt').forEach(z => z.classList.remove('jetzt'));
    // Läuft das Metronom nicht weiter: Uhr anhalten, schon Eingeplantes verstummt
    if (!this.metroAn) { this.uhr.stoppen(); Ton.stopp(); }
    this.playKnopf();
    if (this.el?.isConnected) this.miniStopp();
  },

  metronom(an) {
    if (an === this.metroAn) return;
    this.metroAn = an;
    this.leiste.an(an);
    if (an) this.uhr.starten();
    else if (!this.laeuft) { this.uhr.stoppen(); Ton.stopp(); }
  },

  /* Ein Sechzehntel planen: Beat (nur die sichtbaren Spuren) und Metronom-Klick */
  schritt(i, zeit) {
    if (this.laeuft) this.spuren().forEach(k => {
      if (this.beat[k][i]) Drums.spielen(k, zeit, k.startsWith('h') || k === 'ride' ? (i % 4 ? 0.75 : 1) : 1);
    });
    if (this.metroAn && i % 4 === 0) Metronom.klick(zeit, i === 0);
  },

  /* Die Spalte, die gerade klingt, leuchtet; die Punkte des Metronoms zeigen das Viertel */
  laufmarke(i) {
    if (this.metroAn && i % 4 === 0) this.leiste.schlag(i / 4);
    if (!this.laeuft || !this.gitter) return;
    this.gitter.querySelectorAll('.jetzt').forEach(z => z.classList.remove('jetzt'));
    this.gitter.querySelectorAll(`[data-i="${i}"], .sz-zaehl:nth-of-type(${i + 2})`).forEach(z => z.classList.add('jetzt'));
    this.gitter.querySelectorAll(`.sz-zelle.an[data-i="${i}"]`).forEach(z => this.aufblitzen(z));
  },
};
