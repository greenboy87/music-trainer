/* Schlagzeug zum freien Spielen (#/schlagzeug, #/schlagzeug/drumset, #/schlagzeug/drumcomputer).

   Drei Reiter:
   – Pads: drei große Pads, Klang je Pad wählbar (Hi-Hat, Snare, Bassdrum vorgegeben).
   – Drumset: von oben gezeichnet wie in GarageBand; was man abwählt, wird grau und klingt nicht.
     Hi-Hat: Becken antippen = mit dem Stock, Klemme (Clutch) in der Mitte = getreten.
   – Drumcomputer: 16 Sechzehntel in vier Vierergruppen je Instrument, mit Tempo und Vorlagen.
   Der Drumcomputer läuft beim Wechsel des Reiters weiter – so kann man auf den Pads
   oder am Drumset dazu spielen. Die Klänge sind im Browser erzeugt, wie in der
   Rhythmus-Werkstatt (Becken, Bassdrum, Toms aus js/beat.js und js/drumset.js, Snare
   und Klatschen aus js/audio.js); Bongos und Kuhglocke sind neu. Nur das Ride ist eine
   Aufnahme (klaenge/drums/, wie in der Beat-Werkstatt). Auswahl, Tempo und
   Beat merkt sich der Browser. */

/* ---------- Klänge ---------- */
const Drums = {
  KLAENGE: {
    hh: 'Hi-Hat', ho: 'Hi-Hat offen', hp: 'Hi-Hat getreten', s: 'Snare', b: 'Bassdrum', crash: 'Becken (Crash)', ride: 'Ride', rb: 'Ride-Kuppe',
    t1: 'Tom 1', t2: 'Tom 2', t3: 'Standtom', clap: 'Klatschen', bh: 'Bongo hoch', bt: 'Bongo tief', kuh: 'Kuhglocke',
  },
  /* Farbfamilie: Becken gelb, Snare orange, Bassdrum blau, Toms grün, Percussion rosa */
  FAMILIE: { hh: 'becken', ho: 'becken', hp: 'becken', crash: 'becken', ride: 'becken', rb: 'becken', s: 'snare', b: 'bass',
    t1: 'tom', t2: 'tom', t3: 'tom', clap: 'perc', bh: 'perc', bt: 'perc', kuh: 'perc' },
  TOM_HZ: { t1: 210, t2: 155, t3: 105 },

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
    }
    return this.bus;
  },

  /* Ein Schlag. zeit: AudioContext-Zeit (leer = sofort) */
  spielen(k, zeit, staerke = 1) {
    const c = Ton.audio();
    const ziel = this.ziel();
    const t = zeit ?? c.currentTime + 0.005;
    if (k === 'b') this.bassdrum(c, t, ziel, staerke);
    else if (k === 's') this.snare(c, t, ziel, staerke);
    else if (this.TOM_HZ[k]) this.tom(c, t, ziel, k, staerke);
    else if (k === 'clap') this.klatschen(c, t, ziel, staerke);
    else if (k === 'bh' || k === 'bt') this.bongo(c, t, ziel, k === 'bh' ? 400 : 285, staerke);
    else if (k === 'kuh') this.kuhglocke(c, t, ziel, staerke);
    else if (k === 'ride') this.ride(c, t, ziel, staerke);
    else if (k === 'hp') this.tritt(c, t, ziel, staerke);
    else if (k === 'crash') this.crash(c, t, ziel, staerke);
    else if (k === 'rb') this.kuppe(c, t, ziel, staerke);
    // Offene und geschlossene Hi-Hat sind unabhängig: keine würgt die andere ab
    else this.becken(c, t, ziel, k, staerke);
  },

  /* Ride als echte Aufnahme wie in der Beat-Werkstatt der Rhythmus-Werkstatt: drei Anschläge
     eines Jazz-Rides (Virtuosity Drums, CC0, siehe quellen.html), abwechselnd gespielt.
     Geholt beim ersten Aufruf, je Audiokontext einmal dekodiert; der Anschlag wird nach dem
     Dekodieren gesucht (AAC setzt je nach Browser etwas Stille davor). Bis alles bereit ist,
     klingt der berechnete Ersatz. */
  RIDE_DATEIEN: ['klaenge/drums/ride1.m4a', 'klaenge/drums/ride2.m4a', 'klaenge/drums/ride3.m4a'],
  rideRoh: null,
  rideProben: new WeakMap(),
  rideNr: 0,
  rideLaden(c) {
    if (this.rideProben.has(c)) return;
    this.rideProben.set(c, []);
    this.rideRoh ||= Promise.all(this.RIDE_DATEIEN.map(d => fetch(d).then(r => {
      if (!r.ok) throw new Error(d);
      return r.arrayBuffer();
    }))).catch(() => null);
    this.rideRoh.then(roh => roh && Promise.all(roh.map(b => new Promise((ja, nein) => c.decodeAudioData(b.slice(0), ja, nein)))))
      .then(puffer => {
        if (!puffer) return;
        this.rideProben.set(c, puffer.map(p => {
          const d = p.getChannelData(0);
          let spitze = 0;
          for (let i = 0; i < d.length; i++) spitze = Math.max(spitze, Math.abs(d[i]));
          let i0 = 0;
          while (i0 < d.length && Math.abs(d[i0]) < spitze * 0.05) i0++;
          // Lautheit der ersten 0,3 s – alle drei gleich laut
          const n = Math.min(d.length - i0, Math.floor(p.sampleRate * 0.3));
          let q = 0;
          for (let i = 0; i < n; i++) q += d[i0 + i] * d[i0 + i];
          const rms = Math.sqrt(q / Math.max(1, n)) || 1;
          return { puffer: p, versatz: Math.max(0, i0 - Math.floor(p.sampleRate * 0.001)) / p.sampleRate, pegel: this.RIDE_PEGEL / rms };
        }));
      }).catch(() => {});
  },
  RIDE_PEGEL: 0.03,   // Lautheit wie der frühere berechnete Ride: unter der Snare, über der Hi-Hat
  ride(c, t, ziel, st) {
    this.rideLaden(c);
    const proben = this.rideProben.get(c);
    if (!proben?.length) { this.becken(c, t, ziel, 'ride', st); return; }
    const pr = proben[this.rideNr++ % proben.length];
    const q = c.createBufferSource(), g = c.createGain();
    q.buffer = pr.puffer;
    g.gain.value = pr.pegel * st;
    q.connect(g).connect(ziel);
    q.start(t, pr.versatz);
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

  huelle(c, t, laut, dauer, einsatz = 0.002) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, laut), t + einsatz);
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
    const g = this.huelle(c, t, P.laut * st, P.dauer, P.einsatz);
    summe.connect(band).connect(hoch).connect(g).connect(ziel);
    return g;
  },

  /* Crash: statt der 808-Rechtecke ein breites Rauschen mit vielen unharmonischen Teiltönen.
     Heller Anschlag, danach ein langes Rauschen („Wash“), das beim Ausklingen dunkler wird –
     wie ein echtes Becken. Die Teiltöne sind je Schlag leicht anders, damit es nicht gleich klingt. */
  CRASH_LAUT: 0.42,    // so laut wie der frühere Crash
  crash(c, t, ziel, st) {
    const dauer = 2.4, s = st * this.CRASH_LAUT;
    const tief = c.createBiquadFilter();           // wird beim Ausklingen dunkler
    tief.type = 'lowpass'; tief.Q.value = 0.3;
    tief.frequency.setValueAtTime(16000, t);
    tief.frequency.exponentialRampToValueAtTime(5000, t + 1.6);
    const hoch = c.createBiquadFilter();
    hoch.type = 'highpass'; hoch.frequency.value = 900;
    tief.connect(hoch).connect(ziel);

    // Anschlag: kurzer, harter Rauschstoß
    const an = this.rauschen(c, 0.06);
    const ah = c.createBiquadFilter();
    ah.type = 'highpass'; ah.frequency.value = 3000;
    const ag = c.createGain();
    ag.gain.setValueAtTime(0.0001, t);
    ag.gain.exponentialRampToValueAtTime(0.5 * s, t + 0.001);
    ag.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    an.connect(ah).connect(ag).connect(tief);
    an.start(t);

    // Wash: Rauschen um 4–8 kHz, schwillt kurz an und klingt lang aus
    const wash = this.rauschen(c, dauer);
    const wb = c.createBiquadFilter();
    wb.type = 'bandpass'; wb.frequency.value = 5500; wb.Q.value = 0.45;
    const wg = c.createGain();
    wg.gain.setValueAtTime(0.0001, t);
    wg.gain.exponentialRampToValueAtTime(0.32 * s, t + 0.006);
    wg.gain.setTargetAtTime(0.0001, t + 0.03, 0.5);
    wash.connect(wb).connect(wg).connect(tief);
    wash.start(t); wash.stop(t + dauer);

    // Teiltöne: unharmonisch verteilt, jeder klingt anders lang
    const tg = c.createGain();
    tg.gain.value = 0.018 * s;
    tg.connect(tief);
    for (let i = 0; i < 36; i++) {
      const f = 1400 * Math.pow(6, i / 36) * (0.96 + Math.random() * 0.08);
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f;
      const a = 0.4 + Math.random() * 0.6;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a, t + 0.003 + Math.random() * 0.01);
      g.gain.setTargetAtTime(0.0001, t + 0.02, 0.25 + Math.random() * 0.6);
      o.connect(g).connect(tg);
      o.start(t); o.stop(t + dauer);
    }
  },

  /* Ride-Kuppe: heller, glockiger „Ping“ – unharmonische Teiltöne über etwa 760 Hz, die tieferen
     klingen länger, dazu ein kurzer Anschlag des Stocks. Berechnet, bis es eine Aufnahme gibt. */
  KUPPE_LAUT: 0.8,     // etwas lauter als ein normaler Ride-Schlag, wie echt
  kuppe(c, t, ziel, st) {
    const s = st * this.KUPPE_LAUT;
    const summe = c.createGain();
    summe.gain.value = 1;
    const hoch = c.createBiquadFilter();
    hoch.type = 'highpass'; hoch.frequency.value = 500;
    summe.connect(hoch).connect(ziel);
    [[1, 0.5, 1.5], [1.48, 0.3, 1.1], [2.03, 0.34, 0.9], [2.63, 0.2, 0.7], [3.2, 0.16, 0.55], [4.18, 0.1, 0.4], [5.4, 0.07, 0.3]].forEach(([v, a, d]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 760 * v * (0.995 + Math.random() * 0.01);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a * 0.12 * s, t + 0.002);
      g.gain.setTargetAtTime(0.0001, t + 0.004, d / 4);
      o.connect(g).connect(summe);
      o.start(t); o.stop(t + d * 1.6);
    });
    const r = this.rauschen(c, 0.03);
    const rh = c.createBiquadFilter();
    rh.type = 'highpass'; rh.frequency.value = 4000;
    r.connect(rh).connect(this.huelle(c, t, 0.12 * s, 0.025)).connect(summe);
    r.start(t);
  },

  /* Hi-Hat getreten („Chick“): die beiden Becken klatschen aufeinander. Nur Rauschen, keine
     Töne (die klängen nach Holzblock): ein harter, heller Knack, gleich danach ein kurzes
     Zischen, das schnell abgewürgt wird, dazu ein Hauch Metall ganz oben. */
  tritt(c, t, ziel, st) {
    st *= 0.22;   // etwa so laut wie die geschlossene Hi-Hat
    const knack = this.rauschen(c, 0.03);
    const kb = c.createBiquadFilter();
    kb.type = 'bandpass'; kb.frequency.value = 3200; kb.Q.value = 0.9;
    const kg = c.createGain();
    kg.gain.setValueAtTime(0.0001, t);
    kg.gain.exponentialRampToValueAtTime(0.55 * st, t + 0.0008);
    kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
    knack.connect(kb).connect(kg).connect(ziel);
    knack.start(t);

    const zisch = this.rauschen(c, 0.14);
    const zh = c.createBiquadFilter();
    zh.type = 'highpass'; zh.frequency.value = 6500;
    const zp = c.createBiquadFilter();
    zp.type = 'peaking'; zp.frequency.value = 9500; zp.Q.value = 1.2; zp.gain.value = 7;
    const zg = c.createGain();
    zg.gain.setValueAtTime(0.0001, t);
    zg.gain.exponentialRampToValueAtTime(0.42 * st, t + 0.004);
    zg.gain.exponentialRampToValueAtTime(0.12 * st, t + 0.03);
    zg.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    zisch.connect(zh).connect(zp).connect(zg).connect(ziel);
    zisch.start(t);

    const metall = c.createGain();
    metall.gain.value = 0.05;
    const mh = c.createBiquadFilter();
    mh.type = 'highpass'; mh.frequency.value = 7500;
    const mg = this.huelle(c, t, 0.9 * st, 0.07);
    metall.connect(mh).connect(mg).connect(ziel);
    [205.3, 304.4, 369.6, 522.7, 540, 800].forEach(f => {
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = f * 2.7;
      o.connect(metall);
      o.start(t); o.stop(t + 0.09);
    });
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
  /* Pads 0–2: die drei Grund-Pads (A S D). Pads 3–5 kommen in der Ansicht „6 Pads“ dazu
     und stehen oben (Q W E) – wie beim Schlagzeug: Becken und Toms über Hi-Hat, Snare, Bassdrum */
  pads: ['hh', 's', 'b', 'crash', 't1', 't3'],
  PAD_TASTEN: ['a', 's', 'd', 'q', 'w', 'e'],
  padAnzahl: 3,

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
  beat: {},             // Spur → Array mit 16 Lautstärken (0 = aus, bis 1 = voll)
  stumm: {},            // Spur → true, wenn sie im Drumcomputer nicht mitspielt
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
      if (Array.isArray(p) && p.length >= 3 && p.every(k => k in Drums.KLAENGE)) p.forEach((k, i) => { if (i < 6) this.pads[i] = k; });
      this.padAnzahl = this.lies('pad-anzahl') === '6' ? 6 : 3;
      const a = JSON.parse(this.lies('set'));
      if (a && typeof a === 'object') this.SET.forEach(({ k }) => { if (typeof a[k] === 'boolean') this.setAn[k] = a[k]; });
      this.hhOffen = this.lies('hh-offen') === 'an';
      this.einfach = this.lies('ansicht') !== 'profi';
      this.namen = this.lies('namen') !== 'aus';
      this.ternaer = this.lies('ternaer') === 'an';
      const bpm = Number(this.lies('bpm'));
      if (bpm >= 50 && bpm <= 200) this.bpm = bpm;
      const st = JSON.parse(this.lies('stumm'));
      this.stumm = st && typeof st === 'object' ? st : {};
      const b = JSON.parse(this.lies('beat'));
      if (b && typeof b === 'object') { this.beatSetzen(b); return; }
    } catch { /* kaputt oder privat */ }
    this.vorlageLaden('rock', false);
  },

  /* Beat aus Text: x = voller Schlag, 1–9 = leiser (Zehntel), . = Pause */
  beatSetzen(text) {
    this.beat = {};
    this.SPUREN.forEach(k => {
      const s = typeof text[k] === 'string' ? text[k] : '';
      this.beat[k] = Array.from({ length: 16 }, (_, i) => (s[i] === 'x' ? 1 : /[1-9]/.test(s[i] || '') ? Number(s[i]) / 10 : 0));
    });
  },
  beatText() {
    const t = {};
    this.SPUREN.forEach(k => {
      if (this.beat[k].some(Boolean)) t[k] = this.beat[k].map(v => (!v ? '.' : v >= 0.95 ? 'x' : String(Math.max(1, Math.round(v * 10))))).join('');
    });
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
    el.innerHTML = `
      <section class="card sz-seite">
        <div class="klavier-kopf">
          <h2><a class="karte-zurueck" href="#/" title="Zurück zur Übersicht" aria-label="Zurück zur Übersicht">${Icons.raw('back')}</a>${Icons.raw('drum')}Schlagzeug${Vollbild.wechsel('schlagzeug')}</h2>
          <div class="sz-kopf-rechts">
            ${Vollbild.knopf()}
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
    Vollbild.binden(el.querySelector('.sz-seite'));
    this.metroAn = false;
    this.tempoEl = null;
    // Läuft der Beat noch (vom Klavier zurück), bleibt seine Uhr – sonst eine neue
    if (!this.laeuft) {
      this.uhr?.stoppen();
      this.uhr = new Taktuhr(() => this.bpm, (i, zeit) => this.schritt(i, zeit), i => this.laufmarke(i));
    }
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
      // Den Beat hält App.aufraeumen an oder lässt ihn (zum Klavier) weiterlaufen
      if (this.metroAn) { this.metroAn = false; if (!this.laeuft) this.uhr.stoppen(); }
      this.gitter = null;
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
    /* Drumcomputer: keine Metronom-Zeile – das Tempo wandert in die Zeile mit Start,
       Vorlage und Ansicht, damit das Raster ganz oben beginnt und ganz aufs iPad passt */
    const dc = id === 'drumcomputer';
    this.el.querySelector('.sz-seite').classList.toggle('reiter-drumcomputer', dc);
    if (dc && this.metroAn) this.metronom(false);
    this.tempoHeim();
    if (id === 'pads') this.padsZeigen();
    else if (id === 'drumset') this.setZeigen();
    else this.computerZeigen();
    this.miniStopp();
  },

  miniStopp() {
    const k = this.el.querySelector('#sz-mini-stopp');   // fehlt, wenn gerade das Klavier offen ist
    if (k) k.hidden = !this.laeuft || this.reiter === 'drumcomputer';
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
    if (k === 'm' && this.reiter !== 'drumcomputer' && !e.target.closest?.('input')) { e.preventDefault(); this.metronom(!this.metroAn); return; }
    if (this.reiter === 'pads') {
      const i = this.PAD_TASTEN.indexOf(k);
      if (i >= 0 && i < this.padAnzahl) { e.preventDefault(); this.padSchlag(i); }
    } else if (this.reiter === 'drumset') {
      if (k === '3') { e.preventDefault(); this.setSchlag('hh', true); return; }
      if (k === 'a') { e.preventDefault(); this.setSchlag('hh', false, true); return; }
      if (k === '5') { e.preventDefault(); this.setSchlag('ride', false, false, true); return; }
      const t = this.SET.find(s => s.taste === k);
      if (t) { e.preventDefault(); this.setSchlag(t.k); }
    }
  },

  /* Kurzes Aufleuchten: Klasse entfernen, neu zeichnen lassen, wieder setzen */
  aufblitzen(el, klasse = 'schlag') {
    if (!el) return;
    el.classList.remove('schlag', 'schlag-offen', 'schlag-tritt');
    void el.getBoundingClientRect();
    el.classList.add(klasse);
  },

  /* ---------- Pads ---------- */
  padsZeigen() {
    const optionen = sel => Object.entries(Drums.KLAENGE).map(([k, n]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${n}</option>`).join('');
    // Bei 6 Pads oben Becken/Toms (3–5), unten die Grund-Pads (0–2)
    const reihe = this.padAnzahl === 6 ? [3, 4, 5, 0, 1, 2] : [0, 1, 2];
    this.inhalt.innerHTML = `
      <div class="sz-pads-kopf">
        <div class="klavier-groesse" role="group" aria-label="Anzahl der Pads">
          <button type="button" data-anzahl="3" aria-pressed="${this.padAnzahl === 3}">3 Pads</button>
          <button type="button" data-anzahl="6" aria-pressed="${this.padAnzahl === 6}">6 Pads</button>
        </div>
      </div>
      <div class="sz-pads${this.padAnzahl === 6 ? ' sechs' : ''}">
        ${reihe.map(i => [this.pads[i], i]).map(([k, i]) => `
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
    this.inhalt.querySelectorAll('[data-anzahl]').forEach(b => b.addEventListener('click', () => {
      this.padAnzahl = Number(b.dataset.anzahl);
      this.merken('pad-anzahl', String(this.padAnzahl));
      this.padsZeigen();
    }));
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
  /* Aufbau wie das Drumset in GarageBand: schräg von oben gesehen, große Flächen, die man gut
     trifft. Links Crash und Hi-Hat, oben die Toms, rechts Ride, vorn Snare, Bassdrum, Standtom.
     Kessel lila mit Chrom; Fell fast rund, darunter sieht man die Kesselwand. */
  KIPP: 0.86,          // Fell: Höhe zu Breite (Trommeln)
  KIPP_B: 0.78,        // Becken liegen etwas flacher
  /* Trommel: Kesselwand mit Böckchen, unterer Reifen, Spannreifen mit Krallen, Fell */
  trommel(cx, cy, r, h) {
    const ry = r * this.KIPP, f = n => n.toFixed(1);
    const boeckchen = [28, 62, 90, 118, 152].map(a => {
      const w = a * Math.PI / 180, x = cx + Math.cos(w) * r * 0.97, y = cy + Math.sin(w) * ry;
      return `<rect class="sz-boeck" x="${f(x - 5)}" y="${f(y + 8)}" width="10" height="${f(Math.max(10, h - 18))}" rx="4"/>`;
    }).join('');
    const krallen = Array.from({ length: 10 }, (_, i) => {
      const w = (i * 36 + 18) * Math.PI / 180, x = cx + Math.cos(w) * r, y = cy + Math.sin(w) * ry;
      return `<rect class="sz-kralle" x="${f(x - 4.5)}" y="${f(y - 6)}" width="9" height="12" rx="3"/>`;
    }).join('');
    return `${h ? `<path class="sz-kessel" d="M${cx - r} ${cy} v${h} a${r} ${f(ry)} 0 0 0 ${2 * r} 0 v${-h} z"/>
      <path class="sz-unterreif" d="M${cx - r} ${cy + h} a${r} ${f(ry)} 0 0 0 ${2 * r} 0"/>
      ${boeckchen}` : ''}
      <ellipse class="sz-reif" cx="${cx}" cy="${cy}" rx="${r}" ry="${f(ry)}"/>${krallen}
      <ellipse class="sz-fell" cx="${cx}" cy="${cy}" rx="${r - 10}" ry="${f(ry - 9)}"/>`;
  },
  /* Becken: Messing mit Rillen, Kuppe und Mutter in der Mitte */
  becken(cx, cy, r) {
    const ry = r * this.KIPP_B, f = n => n.toFixed(1), rb = r * 0.24;
    const rillen = [0.86, 0.72, 0.58, 0.44].map(k => `<ellipse class="sz-rille" cx="${cx}" cy="${cy}" rx="${f(r * k)}" ry="${f(ry * k)}"/>`).join('');
    return `<ellipse class="sz-becken" cx="${cx}" cy="${cy}" rx="${r}" ry="${f(ry)}"/>${rillen}
      <ellipse class="sz-glocke" cx="${cx}" cy="${cy}" rx="${f(rb)}" ry="${f(rb * this.KIPP_B)}"/>
      <ellipse class="sz-mutter" cx="${cx}" cy="${cy}" rx="7" ry="${f(7 * this.KIPP_B)}"/>`;
  },
  /* Bassdrum von vorn: Kessel, Spannreifen mit Böckchen, Resonanzfell mit Ring */
  bassdrumBild(cx, cy, r) {
    const f = n => n.toFixed(1);
    const boeckchen = Array.from({ length: 10 }, (_, i) => {
      const a = i * 36 + 18, w = a * Math.PI / 180, x = cx + Math.cos(w) * (r + 4), y = cy + Math.sin(w) * (r + 4);
      return `<rect class="sz-boeck" x="${f(x - 5)}" y="${f(y - 10)}" width="10" height="20" rx="4" transform="rotate(${a + 90} ${f(x)} ${f(y)})"/>`;
    }).join('');
    return `${boeckchen}<circle class="sz-kessel" cx="${cx}" cy="${cy}" r="${r}"/>
      <circle class="sz-reif" cx="${cx}" cy="${cy}" r="${r - 5}"/>
      <circle class="sz-fell-b" cx="${cx}" cy="${cy}" r="${r - 16}"/>
      <circle class="sz-ring" cx="${cx}" cy="${cy}" r="${f((r - 16) * 0.86)}"/><circle class="sz-ring" cx="${cx}" cy="${cy}" r="${f((r - 16) * 0.81)}"/>
      <text class="sz-logo" x="${cx}" y="${cy - 30}">greenboy</text>`;
  },
  beschriftung(k, x, y, name, taste) {
    const t = this.SET.find(s => s.k === k);
    return `<text class="sz-name" x="${x}" y="${y}">${name || t.name}<tspan class="sz-tk"> · ${(taste || t.taste).toUpperCase()}</tspan></text>`;
  },

  setSvg() {
    const teil = (k, inhalt) => `<g class="sz-teil" data-k="${k}"${this.setAn[k] ? '' : ' data-aus=""'} role="button" tabindex="0" aria-label="${this.SET.find(s => s.k === k).name}">${inhalt}</g>`;
    const stopps = s => s.map(([o, f]) => `<stop offset="${o}" stop-color="${f}"/>`).join('');
    const rund = (id, s) => `<radialGradient id="${id}" cx="42%" cy="38%" r="70%">${stopps(s)}</radialGradient>`;
    const quer = (id, s) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${stopps(s)}</linearGradient>`;
    const staender = (x, y1, y2) => `<line class="sz-staender" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>`;
    const hh = { x: 145, y: 315, r: 118 };
    hh.k = hh.y;                              // in der Mitte sitzt die Klemme
    const sn = { x: 270, y: 465, r: 120 };    // Snare
    const st = { x: 790, y: 455, r: 125 };    // Standtom
    return `<svg class="sz-set" viewBox="0 0 1000 700" aria-label="Schlagzeug zum Antippen">
      <defs>
        ${rund('sz-v-fell', [[0, '#fffdf8'], [0.65, '#eeeadf'], [1, '#d6d0c1']])}
        ${rund('sz-v-becken', [[0, '#fbe7a1'], [0.45, '#e2b445'], [1, '#a9791c']])}
        ${rund('sz-v-glocke', [[0, '#fff1bd'], [1, '#c4952a']])}
        ${rund('sz-v-chrom', [[0, '#ffffff'], [0.55, '#c9ccd6'], [1, '#6f7486']])}
        ${quer('sz-v-kessel', [[0, '#2a0e5c'], [0.14, '#7c3aed'], [0.3, '#4c1d95'], [0.48, '#a78bfa'], [0.62, '#5b21b6'], [0.82, '#7c3aed'], [1, '#22094d']])}
        ${quer('sz-v-wand', [[0, '#6f7486'], [0.3, '#f4f5f8'], [0.55, '#9da2b0'], [0.8, '#e6e8ee'], [1, '#6f7486']])}
      </defs>
      ${staender(248, 128, 300)}${staender(835, 150, 330)}
      ${/* Standtom: drei Füße, hinter der Bassdrum */ ''}
      ${staender(st.x - st.r + 14, st.y + 40, 694)}${staender(st.x + st.r - 14, st.y + 40, 694)}${staender(st.x + 30, st.y + 150, 698)}
      ${teil('b', `<g class="sz-wackel">${this.bassdrumBild(510, 515, 165)}</g>${this.beschriftung('b', 510, 600)}`)}
      ${teil('t1', `<g class="sz-wackel">${this.trommel(422, 245, 92, 42)}</g>${this.beschriftung('t1', 422, 284)}`)}
      ${teil('t2', `<g class="sz-wackel">${this.trommel(612, 245, 92, 42)}</g>${this.beschriftung('t2', 612, 284)}`)}
      ${/* Größen wie echt: Crash 16″, Ride 21″ */ ''}
      ${teil('crash', `<g class="sz-schwing">${this.becken(248, 128, 124)}</g>${this.beschriftung('crash', 248, 180)}`)}
      ${teil('ride', `<g class="sz-schwing">${this.becken(835, 150, 163)}</g>
        <ellipse class="sz-kuppe-flaeche" data-kuppe="" cx="835" cy="150" rx="${(163 * 0.3).toFixed(1)}" ry="${(163 * 0.3 * this.KIPP_B).toFixed(1)}"/>
        ${this.beschriftung('ride', 835, 218)}<text class="sz-name sz-tritt-name" x="835" y="110">Kuppe<tspan class="sz-tk"> · 5</tspan></text>`)}
      ${/* Ständer der Hi-Hat hinter der Snare; die Becken selbst liegen wie echt über der Snare */ ''}
      ${staender(hh.x, hh.y, 470)}
      ${/* Snare-Ständer: Stange mit drei Beinen */ ''}
      ${staender(sn.x, sn.y + 150, 672)}
      <path class="sz-staender" d="M${sn.x - 55} 696 L${sn.x} 668 L${sn.x + 55} 696 M${sn.x} 668 L${sn.x + 8} 698" fill="none"/>
      ${teil('s', `<g class="sz-wackel">${this.trommel(sn.x, sn.y, sn.r, 55)}</g>${this.beschriftung('s', sn.x, sn.y + 50)}`)}
      ${teil('hh', `<g class="sz-hh${this.hhOffen ? ' offen' : ''}"><g class="sz-hh-unten">${this.becken(hh.x, hh.y, hh.r)}</g>
        <g class="sz-hh-oben">${this.becken(hh.x, hh.y, hh.r)}</g></g>
        <g class="sz-tritt" data-tritt="">
          <ellipse class="sz-tritt-flaeche" cx="${hh.x}" cy="${hh.k}" rx="52" ry="36"/>
          <rect class="sz-clutch" x="${hh.x - 20}" y="${hh.k - 11}" width="40" height="18" rx="6"/>
          <ellipse class="sz-mutter" cx="${hh.x}" cy="${hh.k - 2}" rx="6" ry="4.5"/>
        </g>
        ${this.beschriftung('hh', hh.x, hh.y + 58)}<text class="sz-name sz-tritt-name" x="${hh.x}" y="${hh.k - 32}">treten<tspan class="sz-tk"> · A</tspan></text>`)}
      ${teil('t3', `<g class="sz-wackel">${this.trommel(st.x, st.y, st.r, 115)}</g>${this.beschriftung('t3', st.x, st.y + 60)}`)}
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
      <div class="sz-set-rahmen${this.namen ? '' : ' ohne-namen'}">${this.setSvg()}</div>
      <p class="hint sz-hinweis">Auf die Becken der Hi-Hat tippen spielt sie mit dem Stock, auf die Klemme in der Mitte tippen tritt sie mit dem Fuß. Die Kuppe in der Mitte des Rides klingt hell wie eine Glocke.</p>`;
    const svg = this.inhalt.querySelector('.sz-set');
    svg.addEventListener('pointerdown', e => {
      const g = e.target.closest('.sz-teil');
      if (!g || g.hasAttribute('data-aus')) return;
      e.preventDefault();
      // Hi-Hat: auf die Klemme in der Mitte (Clutch) tippen = Pedal treten
      if (g.dataset.k === 'hh' && e.target.closest('[data-tritt]')) this.setSchlag('hh', false, true);
      // Ride: auf die Kuppe tippen = glockiger Kuppenschlag
      else if (g.dataset.k === 'ride' && e.target.closest('[data-kuppe]')) this.setSchlag('ride', false, false, true);
      else this.setSchlag(g.dataset.k);
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

  /* offen: nur dieses eine Mal offen (Taste 3), sonst gilt der Schalter.
     tritt: Hi-Hat mit dem Pedal (Clutch antippen oder Taste A) */
  setSchlag(k, offen = false, tritt = false, kuppe = false) {
    if (!this.setAn[k] || !this.inhalt) return;
    const klang = k === 'ride' && kuppe ? 'rb' : k !== 'hh' ? k : tritt ? 'hp' : offen || this.hhOffen ? 'ho' : 'hh';
    Drums.spielen(klang);
    const g = this.inhalt.querySelector(`.sz-teil[data-k="${k}"]`);
    if (k === 'hh') this.aufblitzen(g, { ho: 'schlag-offen', hp: 'schlag-tritt' }[klang] || 'schlag');
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

  /* Der Tempo-Teil der Leiste: im Drumcomputer in dessen Zeile geliehen, sonst daheim.
     Vor jedem Neuzeichnen zurückholen, sonst verschwindet er mit dem alten Inhalt. */
  tempoHeim() {
    if (!this.tempoEl) this.tempoEl = this.leiste.el.querySelector('.sz-tempo');
    if (this.tempoEl && this.tempoEl.parentElement !== this.leiste.el) this.leiste.el.appendChild(this.tempoEl);
  },

  computerZeigen() {
    this.tempoHeim();
    const kopf = Array.from({ length: 16 }, (_, i) => `<span class="sz-zaehl${i % 4 ? '' : ' schlag'}">${i % 4 ? this.SILBEN[i % 4] : i / 4 + 1}</span>`).join('');
    this.inhalt.innerHTML = `
      <div class="sz-steuerung">
        <button type="button" class="primary sz-play" id="sz-play"></button>
        <label class="klavier-klang">Vorlage
          <select id="sz-vorlage"><option value="">– wählen –</option>${this.vorlagen().map(([id, v]) => `<option value="${id}">${v.name}</option>`).join('')}</select>
        </label>
        <button type="button" id="sz-loeschen" class="small">${Icons.raw('reset')}Alles löschen</button>
        <button type="button" id="sz-ternaer" class="small sz-ternaer" aria-pressed="${!!this.ternaer}" title="Sechzehntel ternär (Shuffle): jede zweite Sechzehntel kommt später, lang–kurz wie in Triolen">Ternär</button>
        <div class="sz-tempo-platz"></div>
        <div class="klavier-groesse sz-ansicht" role="group" aria-label="Ansicht">
          <button type="button" data-ansicht="einfach" aria-pressed="${this.einfach}" title="Nur Bassdrum, Snare, Hi-Hat und Becken">Einfach</button>
          <button type="button" data-ansicht="profi" aria-pressed="${!this.einfach}" title="Alle Instrumente">Fortgeschritten</button>
        </div>
      </div>
      <div class="sz-gitter-rahmen">
        <div class="sz-gitter${this.einfach ? ' einfach' : ''}" style="--n:${this.spuren().length}" role="grid" aria-label="Beat: 16 Sechzehntel je Instrument">
          <span class="sz-ecke"></span>${kopf}
          ${this.spuren().map(k => `
            <button type="button" class="sz-spur${this.stumm[k] ? ' stumm' : ''}" data-spur="${k}" style="--farbe:${this.SPUR_FARBE[k]}" aria-pressed="${!!this.stumm[k]}" title="${this.SPUR_NAMEN[k]}: antippen schaltet stumm oder wieder an" aria-label="${this.SPUR_NAMEN[k]} stumm schalten">
              <svg viewBox="0 0 24 24" aria-hidden="true">${this.SPUR_ICON[k]}</svg><span>${this.SPUR_KURZ[k]}</span></button>
            ${this.beat[k].map((v, i) => `<button type="button" class="sz-zelle${v ? ' an' : ''}${this.stumm[k] ? ' stumm' : ''}" data-k="${k}" data-i="${i}" style="--farbe:${this.SPUR_FARBE[k]};--vel:${v || 1}" aria-pressed="${!!v}" aria-label="${this.SPUR_NAMEN[k]}, Sechzehntel ${i + 1}"></button>`).join('')}`).join('')}
        </div>
      </div>
      <p class="hint sz-hinweis">Kästchen antippen setzt einen Schlag – mit gedrücktem Finger seitlich über mehrere Kästchen streichen, nach oben oder unten ziehen macht den Schlag lauter oder leiser. Instrument links antippen schaltet es stumm. Jede Vierergruppe ist ein Viertel (1 e + e). Leertaste: Start/Stopp, M: Metronom. Der Beat läuft weiter, wenn du zu den Pads oder zum Drumset wechselst.</p>`;
    this.gitter = this.inhalt.querySelector('.sz-gitter');
    this.inhalt.querySelector('.sz-tempo-platz').appendChild(this.tempoEl);
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
    this.inhalt.querySelector('#sz-ternaer').addEventListener('click', e => {
      this.ternaer = !this.ternaer;
      this.merken('ternaer', this.ternaer ? 'an' : 'aus');
      e.currentTarget.setAttribute('aria-pressed', String(this.ternaer));
    });
    this.inhalt.querySelector('#sz-loeschen').addEventListener('click', () => {
      this.vorlageLaden('leer');
      this.beatMerken();
      this.computerZeigen();
    });
    // Instrument antippen: stumm (ausgegraut) oder wieder an – angeschaltet klingt es kurz
    this.gitter.querySelectorAll('.sz-spur').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.spur, stumm = !this.stumm[k];
      if (stumm) this.stumm[k] = true; else delete this.stumm[k];
      this.merken('stumm', this.stumm);
      b.classList.toggle('stumm', stumm);
      b.setAttribute('aria-pressed', String(stumm));
      this.gitter.querySelectorAll(`.sz-zelle[data-k="${k}"]`).forEach(z => z.classList.toggle('stumm', stumm));
      if (!stumm) Drums.spielen(k);
    }));
    this.gitterBedienen();
  },

  playKnopf() {
    const b = this.inhalt?.querySelector('#sz-play');
    if (!b) return;
    b.innerHTML = this.laeuft ? '■ Stopp' : `${Icons.raw('play')}Start`;
    b.setAttribute('aria-pressed', String(this.laeuft));
  },

  /* Antippen schaltet ein Kästchen um. Zieht der Finger zur Seite, setzen (oder löschen)
     alle Kästchen unter ihm dasselbe wie das erste. Zieht er nach oben oder unten, ändert
     er die Lautstärke des ersten Kästchens: hoch = lauter, runter = leiser. Die Richtung
     entscheidet sich nach den ersten paar Pixeln. */
  gitterBedienen() {
    const g = this.gitter;
    let zug = null;
    const unter = e => {
      const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('.sz-zelle');
      return z && g.contains(z) ? z : null;
    };
    const wert = z => this.beat[z.dataset.k][Number(z.dataset.i)];
    const setzen = (z, an, still = false) => {
      const k = z.dataset.k, i = Number(z.dataset.i);
      if (!!this.beat[k][i] === an) return;
      this.beat[k][i] = an ? 1 : 0;
      z.classList.toggle('an', an);
      z.style.setProperty('--vel', 1);
      z.setAttribute('aria-pressed', String(an));
      if (an && !this.laeuft && !still) Drums.spielen(k);
    };
    const lautstaerke = (z, v) => {
      v = Math.round(Math.max(0.15, Math.min(1, v)) * 20) / 20;
      this.beat[z.dataset.k][Number(z.dataset.i)] = v;
      z.style.setProperty('--vel', v);
    };
    g.addEventListener('pointerdown', e => {
      const z = e.target.closest('.sz-zelle');
      if (!z || zug) return;
      e.preventDefault();
      Ton.audio();
      try { g.setPointerCapture(e.pointerId); } catch { /* egal */ }
      const warAn = !!wert(z);
      // Ein leeres Kästchen geht sofort an (man hört es gleich); ein volles erst beim Loslassen aus
      if (!warAn) setzen(z, true);
      zug = { id: e.pointerId, z, warAn, x: e.clientX, y: e.clientY, art: null, start: wert(z) || 1 };
    });
    g.addEventListener('pointermove', e => {
      if (!zug || e.pointerId !== zug.id) return;
      const dx = e.clientX - zug.x, dy = e.clientY - zug.y;
      if (!zug.art) {
        if (Math.hypot(dx, dy) < 10) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          zug.art = 'laut';
          if (!wert(zug.z)) setzen(zug.z, true, true);
          zug.z.classList.add('regelt');
        } else {
          zug.art = 'malen';
          zug.malt = !zug.warAn;
          if (zug.warAn) setzen(zug.z, false);
        }
      }
      if (zug.art === 'laut') lautstaerke(zug.z, zug.start - dy / 140);
      else { const z = unter(e); if (z) setzen(z, zug.malt); }
    });
    const ende = e => {
      if (!zug || (e.pointerId !== undefined && e.pointerId !== zug.id)) return;
      const { z, art, warAn } = zug;
      zug = null;
      z.classList.remove('regelt');
      if (!art && warAn && e.type === 'pointerup') setzen(z, false);
      if (art === 'laut' && !this.laeuft) Drums.spielen(z.dataset.k, undefined, wert(z));
      this.beatMerken();
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => g.addEventListener(n, ende));
    // Tastatur: Eingabe/Leertaste auf einem Kästchen
    g.addEventListener('click', e => {
      const z = e.detail === 0 && e.target.closest('.sz-zelle');
      if (!z) return;
      setzen(z, !wert(z));
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
  /* Ternär (Shuffle): jede zweite Sechzehntel rückt vom halben auf zwei Drittel ihres
     Achtels – lang–kurz wie Triolen. Das sind 1/12 Schlag später. */
  schritt(i, zeit) {
    const t = this.ternaer && i % 2 ? zeit + 60 / this.bpm / 12 : zeit;
    if (this.laeuft) this.spuren().forEach(k => {
      if (this.beat[k][i] && !this.stumm[k]) Drums.spielen(k, t, this.beat[k][i] * (k.startsWith('h') || k === 'ride' ? (i % 4 ? 0.75 : 1) : 1));
    });
    if (this.metroAn && i % 4 === 0) Metronom.klick(zeit, i === 0);
  },

  /* Die Spalte, die gerade klingt, leuchtet; die Punkte des Metronoms zeigen das Viertel */
  laufmarke(i) {
    if (!this.el?.isConnected) return;    // Beat läuft auf der Klavierseite weiter
    if (this.metroAn && i % 4 === 0) this.leiste.schlag(i / 4);
    if (!this.laeuft || !this.gitter) return;
    this.gitter.querySelectorAll('.jetzt').forEach(z => z.classList.remove('jetzt'));
    this.gitter.querySelectorAll(`[data-i="${i}"], .sz-zaehl:nth-of-type(${i + 2})`).forEach(z => z.classList.add('jetzt'));
    this.gitter.querySelectorAll(`.sz-zelle.an[data-i="${i}"]`).forEach(z => this.aufblitzen(z));
  },
};
