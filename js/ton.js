/* Klangerzeugung im Browser – keine Audiodateien.

   Ein Klavierton entsteht aus drei Obertönen mit schnellem Anschlag und
   langsamem Ausklingen; Rhythmen klingen als Snare wie in der Rhythmus-Werkstatt.
   Alles läuft über einen gemeinsamen Ausgang, damit „stopp()“ eine
   laufende Wiedergabe sofort abbrechen kann (neue Aufgabe, Seite verlassen). */
const Ton = {
  ctx: null,
  ausgang: null,

  audio() {
    if (!this.ctx || this.ctx.state === 'closed') { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.ausgang = null; }
    // iPad: nach Sperrbildschirm, Anruf oder anderer Musik steht der Ton auf „interrupted“ –
    // dann läuft auch currentTime nicht weiter. Bei jedem Zugriff wieder anstoßen.
    if (this.ctx.state !== 'running') this.ctx.resume?.().catch?.(() => {});
    if (!this.ausgang) this.neuerAusgang();
    return this.ctx;
  },

  neuerAusgang() {
    this.ausgang = this.ctx.createGain();
    this.ausgang.gain.value = 0.9;
    this.ausgang.connect(this.ctx.destination);
  },

  jetzt() { return this.audio().currentTime; },

  /* Wie spät der Ton tatsächlich aus dem Lautsprecher kommt – wichtig beim
     Vergleich von Tipp-Zeitpunkten mit geplanten Tönen */
  verzoegerung() {
    const c = this.audio();
    return (c.outputLatency || 0) + (c.baseLatency || 0);
  },

  /* Klangdateien (Instrumente): laufen als Audio-Element, stopp() hält sie mit an */
  medien: new Set(),
  datei(url) {
    this.audio();   // im Klick entsperren, wie bei den erzeugten Tönen
    const a = new Audio(url);
    this.medien.add(a);
    a.addEventListener('ended', () => this.medien.delete(a));
    a.play().catch(() => {});
    return a;
  },

  stopp() {
    this.medien.forEach(a => a.pause());
    this.medien.clear();
    if (!this.ctx || !this.ausgang) return;
    const alt = this.ausgang;
    alt.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    setTimeout(() => alt.disconnect(), 200);
    this.neuerAusgang();
  },

  frequenz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); },

  /* Ein Klavierton. start in Sekunden ab jetzt. */
  klavier(midi, start = 0, dauer = 1, laut = 0.3) {
    const c = this.audio();
    const t = c.currentTime + start + 0.02;
    const f = this.frequenz(midi);
    const huelle = c.createGain();
    huelle.gain.setValueAtTime(0, t);
    huelle.gain.linearRampToValueAtTime(laut, t + 0.008);
    huelle.gain.exponentialRampToValueAtTime(laut * 0.35, t + 0.25);
    huelle.gain.exponentialRampToValueAtTime(0.0008, t + dauer + 0.6);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(f * 8, 9000), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(f * 2, 400), t + dauer);
    huelle.connect(filter).connect(this.ausgang);
    [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([mal, form, anteil]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = form;
      o.frequency.value = f * mal;
      g.gain.value = anteil;
      o.connect(g).connect(huelle);
      o.start(t);
      o.stop(t + dauer + 0.7);
    });
  },

  /* Klänge der Klavierseite – alle im Browser erzeugt, ohne Aufnahmen */
  KLAENGE: { klavier: 'Klavier', epiano: 'E-Piano', orgel: 'Orgel', cembalo: 'Cembalo', streicher: 'Streicher',
    glockenspiel: 'Glockenspiel', marimba: 'Marimba', vibraphon: 'Vibraphon', gitarre: 'Gitarre', harfe: 'Harfe', koto: 'Koto',
    floete: 'Flöte', blech: 'Blechbläser', synth: 'Synthesizer', synthbass: 'Synth-Bass' },

  /* Ein Ton zum freien Spielen: klingt, solange die Taste gedrückt ist. Gibt eine Funktion
     zum Loslassen zurück. Alle Töne laufen über einen Kompressor, damit Akkorde mit vielen
     Fingern nicht übersteuern. Jeder Oszillator bekommt genau ein stop() – entweder beim
     Loslassen oder wenn der Ton von selbst ausgeklungen ist.
     zeit: AudioContext-Zeit für vorausgeplante Töne (Songbaukasten), leer = sofort;
     die Funktion zum Loslassen nimmt dann ebenso einen Zeitpunkt. */
  anschlag(midi, klang = 'klavier', zeit) {
    const c = this.audio();
    if (this.busAusgang !== this.ausgang) {
      this.bus = c.createDynamicsCompressor();
      this.bus.threshold.value = -12;
      this.bus.knee.value = 10;
      this.bus.ratio.value = 5;
      this.bus.attack.value = 0.003;
      this.bus.release.value = 0.25;
      this.bus.connect(this.ausgang);
      this.busAusgang = this.ausgang;
    }
    const t = zeit ?? c.currentTime + 0.005;
    const aus = c.createGain();
    aus.connect(this.bus);
    const quellen = [];
    const w = {
      osz: (typ, frequenz, ziel) => {
        const o = c.createOscillator();
        o.type = typ;
        o.frequency.value = frequenz;
        o.connect(ziel);
        o.start(t);
        quellen.push(o);
        return o;
      },
      verst: (wert, ziel = aus) => {
        const g = c.createGain();
        g.gain.value = wert;
        g.connect(ziel);
        return g;
      },
      /* Hüllkurve: [[Zeit ab Anschlag, Wert], …] – der erste Punkt sofort, dann linear auf den
         zweiten (Anschlag), danach exponentiell (Ausklingen) */
      huelle: (punkte, ziel = aus) => {
        const g = c.createGain();
        punkte.forEach(([zeit, wert], i) => {
          if (i === 0) g.gain.setValueAtTime(wert, t + zeit);
          else if (i === 1) g.gain.linearRampToValueAtTime(wert, t + zeit);
          else g.gain.exponentialRampToValueAtTime(wert, t + zeit);
        });
        g.connect(ziel);
        return g;
      },
      tiefpass: (von, bis, dauer, ziel = aus) => {
        const fl = c.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.setValueAtTime(von, t);
        if (bis !== von) fl.frequency.exponentialRampToValueAtTime(bis, t + dauer);
        fl.connect(ziel);
        return fl;
      },
    };
    const { ende, loslassen } = (this.stimmen[klang] || this.stimmen.klavier)(c, t, this.frequenz(midi), midi, w);
    let gestoppt = false, uhr = 0, los = false;
    const stoppen = wann => {
      if (gestoppt) return;
      gestoppt = true;
      clearTimeout(uhr);
      quellen.forEach(o => { try { o.stop(wann); } catch { /* egal */ } });
    };
    uhr = setTimeout(() => stoppen(c.currentTime + 0.05), Math.max(0, ende - c.currentTime) * 1000);
    return wann => {
      if (los || !loslassen) return;          // Glockenspiel: klingt aus wie angeschlagen
      los = true;
      // Ganz kurzes Tippen klingt trotzdem kurz an
      const ab = Math.max(wann ?? c.currentTime, t + 0.09);
      aus.gain.setTargetAtTime(0, ab, loslassen);
      stoppen(ab + loslassen * 8);
    };
  },

  /* Die Stimmen. Jede baut ihre Oszillatoren mit den Werkzeugen „w“ und sagt, wann sie von
     selbst zu Ende ist und wie schnell sie beim Loslassen verstummt (Zeitkonstante in
     Sekunden). Die Pegel sind so gewählt, dass alle Klänge etwa gleich laut sind. */
  stimmen: {
    /* Wie Ton.klavier: Dreieck mit zwei Obertönen, tiefe Töne klingen länger */
    klavier(c, t, f, midi, w) {
      const lang = Math.min(7, Math.max(1.2, 2 + (84 - midi) * 0.08));
      const h = w.huelle([[0, 0], [0.006, 0.24], [0.3, 0.096], [lang, 0.0005]],
        w.tiefpass(Math.min(f * 8, 9000), Math.max(f * 2, 400), Math.min(lang, 2)));
      [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([mal, typ, anteil]) => w.osz(typ, f * mal, w.verst(anteil, h)));
      return { ende: t + lang + 0.1, loslassen: 0.07 };
    },

    /* Frequenzmodulation 1 : 1 – hell im Anschlag, dann weich, dazu ein leiser Glockenton */
    epiano(c, t, f, midi, w) {
      const lang = Math.min(6, Math.max(1.5, 3 + (84 - midi) * 0.05));
      const traeger = w.osz('sine', f, w.huelle([[0, 0], [0.004, 0.15], [0.6, 0.075], [lang, 0.0005]]));
      const tiefe = c.createGain();
      tiefe.gain.setValueAtTime(f * 1.8, t);
      tiefe.gain.exponentialRampToValueAtTime(f * 0.2, t + 0.9);
      tiefe.connect(traeger.frequency);
      w.osz('sine', f, tiefe);
      if (f * 4 < 14000) w.osz('sine', f * 4, w.huelle([[0, 0], [0.002, 0.03], [0.3, 0.0005]]));
      return { ende: t + lang + 0.1, loslassen: 0.1 };
    },

    /* Zugriegel wie bei der Hammondorgel (16', 8', 4', 2⅔', 2'); klingt, solange man drückt */
    orgel(c, t, f, midi, w) {
      const h = w.huelle([[0, 0], [0.015, 0.085]]);
      [[0.5, 0.5], [1, 0.8], [2, 0.6], [3, 0.35], [4, 0.3]].forEach(([mal, anteil]) => {
        if (f * mal < 12000) w.osz('sine', f * mal, w.verst(anteil, h));
      });
      return { ende: t + 30, loslassen: 0.025 };
    },

    /* Gezupft: zwei Register (8' und 4'), heller Anschlag, der Filter schließt schnell */
    cembalo(c, t, f, midi, w) {
      const lang = Math.min(4, Math.max(0.9, 1.8 + (84 - midi) * 0.04));
      const h = w.huelle([[0, 0], [0.002, 0.36], [0.2, 0.13], [lang, 0.0005]],
        w.tiefpass(Math.min(f * 16, 14000), Math.max(f * 3, 1200), 0.5));
      w.osz('sawtooth', f, w.verst(1, h));
      w.osz('sawtooth', f * 2, w.verst(0.3, h));
      return { ende: t + lang + 0.1, loslassen: 0.035 };
    },

    /* Drei leicht verstimmte Sägezähne, weicher Bogenstrich, Vibrato setzt später ein */
    streicher(c, t, f, midi, w) {
      const h = w.huelle([[0, 0], [0.2, 0.32]], w.tiefpass(Math.min(f * 5, 7000), Math.min(f * 5, 7000), 0));
      const vibrato = c.createGain();
      vibrato.gain.setValueAtTime(0, t);
      vibrato.gain.linearRampToValueAtTime(f * 0.004, t + 0.6);
      w.osz('sine', 5.5, vibrato);
      [-0.005, 0, 0.005].forEach(d => vibrato.connect(w.osz('sawtooth', f * (1 + d), w.verst(0.33, h)).frequency));
      return { ende: t + 30, loslassen: 0.2 };
    },

    /* Metallstab: Teiltöne bei 1 : 2,76 : 5,40 : 8,93, die hohen klingen schneller ab;
       klingt aus wie angeschlagen, auch wenn man loslässt */
    glockenspiel(c, t, f, midi, w) {
      const lang = Math.min(2.5, Math.max(0.8, 1.5 + (72 - midi) * 0.03));
      [[1, 1, 1], [2.76, 0.35, 0.35], [5.4, 0.15, 0.18], [8.93, 0.08, 0.1]].forEach(([mal, anteil, dauer]) => {
        if (f * mal < 15000) w.osz('sine', f * mal, w.huelle([[0, 0], [0.002, 0.22 * anteil], [lang * dauer, 0.0005]]));
      });
      return { ende: t + lang + 0.1, loslassen: null };
    },

    /* Holzplatte mit Resonanzrohr: Grundton und der 4. Teilton (bei der Marimba so gestimmt),
       weicher Schlägel, kurz – klingt aus wie angeschlagen */
    marimba(c, t, f, midi, w) {
      const lang = Math.min(1.6, Math.max(0.4, 1 + (60 - midi) * 0.02));
      w.osz('sine', f, w.huelle([[0, 0], [0.004, 0.39], [lang, 0.0005]]));
      if (f * 4 < 14000) w.osz('sine', f * 4, w.huelle([[0, 0], [0.002, 0.09], [lang * 0.25, 0.0005]]));
      if (f * 10 < 15000) w.osz('sine', f * 10, w.huelle([[0, 0], [0.001, 0.026], [0.05, 0.0005]]));
      return { ende: t + lang + 0.1, loslassen: null };
    },

    /* Metallplatten, lang klingend, mit dem typischen Schweben (Tremolo); Loslassen = Dämpfer */
    vibraphon(c, t, f, midi, w) {
      const lang = Math.min(5, Math.max(2, 3.5 + (60 - midi) * 0.03));
      const trem = w.verst(1);
      const tiefe = c.createGain();
      tiefe.gain.value = 0.3;
      tiefe.connect(trem.gain);
      w.osz('sine', 5.5, tiefe);
      w.osz('sine', f, w.huelle([[0, 0], [0.003, 0.17], [lang, 0.0005]], trem));
      if (f * 4 < 14000) w.osz('sine', f * 4, w.huelle([[0, 0], [0.002, 0.035], [0.4, 0.0005]], trem));
      return { ende: t + lang + 0.1, loslassen: 0.15 };
    },

    /* Gezupfte Saite: heller Anschlag, der Klang wird schnell weicher */
    gitarre(c, t, f, midi, w) {
      const lang = Math.min(4, Math.max(1.2, 2.5 + (60 - midi) * 0.04));
      const h = w.huelle([[0, 0], [0.003, 0.69], [0.25, 0.28], [lang, 0.0005]],
        w.tiefpass(Math.min(f * 10, 9000), Math.max(f * 1.6, 300), 0.6));
      w.osz('sawtooth', f, w.verst(0.55, h));
      w.osz('triangle', f * 2, w.verst(0.25, h));
      return { ende: t + lang + 0.1, loslassen: 0.12 };
    },

    /* Harfe: weicher als die Gitarre, lang ausklingend – klingt aus wie gezupft */
    harfe(c, t, f, midi, w) {
      const lang = Math.min(5, Math.max(1.5, 3 + (60 - midi) * 0.05));
      const h = w.huelle([[0, 0], [0.004, 0.2], [0.4, 0.094], [lang, 0.0005]],
        w.tiefpass(Math.min(f * 6, 8000), Math.max(f * 1.5, 300), 1));
      w.osz('triangle', f, w.verst(1, h));
      w.osz('sine', f * 2, w.verst(0.3, h));
      w.osz('sine', f * 3, w.verst(0.1, h));
      return { ende: t + lang + 0.1, loslassen: null };
    },

    /* Koto (japanische Wölbbrettzither): hell und etwas näselnd gezupft, die Tonhöhe rutscht
       beim Anschlag kurz von oben in den Ton, später leichtes Vibrato wie beim Drücken der Saite;
       klingt aus wie gezupft */
    koto(c, t, f, midi, w) {
      const lang = Math.min(3.5, Math.max(1, 2.2 + (60 - midi) * 0.03));
      const h = w.huelle([[0, 0], [0.002, 1], [0.12, 0.38], [lang, 0.0005]],
        w.tiefpass(Math.min(f * 14, 11000), Math.max(f * 2.5, 500), 0.35));
      const vibrato = c.createGain();
      vibrato.gain.setValueAtTime(0, t);
      vibrato.gain.setValueAtTime(0, t + 0.35);
      vibrato.gain.linearRampToValueAtTime(f * 0.008, t + 0.9);
      w.osz('sine', 5.2, vibrato);
      [['sawtooth', 1, 0.5], ['square', 2, 0.18], ['sine', 3, 0.12]].forEach(([typ, mal, anteil]) => {
        if (f * mal > 14000) return;
        const o = w.osz(typ, f * mal, w.verst(anteil, h));
        o.frequency.setValueAtTime(f * mal * 1.018, t);
        o.frequency.exponentialRampToValueAtTime(f * mal, t + 0.06);
        vibrato.connect(o.frequency);
      });
      return { ende: t + lang + 0.1, loslassen: null };
    },

    /* Flöte: fast reiner Sinus, sanfter Einsatz, später etwas Vibrato; klingt, solange man drückt */
    floete(c, t, f, midi, w) {
      const h = w.huelle([[0, 0], [0.07, 0.095]]);
      const vibrato = c.createGain();
      vibrato.gain.setValueAtTime(0, t);
      vibrato.gain.linearRampToValueAtTime(f * 0.006, t + 0.5);
      w.osz('sine', 5, vibrato);
      [[1, 'sine', 1], [2, 'sine', 0.18], [3, 'sine', 0.06]].forEach(([mal, typ, anteil]) => {
        if (f * mal < 14000) vibrato.connect(w.osz(typ, f * mal, w.verst(anteil, h)).frequency);
      });
      return { ende: t + 30, loslassen: 0.06 };
    },

    /* Blechbläser: Sägezahn, der Filter öffnet sich beim Einsatz wie beim Anblasen */
    blech(c, t, f, midi, w) {
      const h = w.huelle([[0, 0], [0.04, 0.2]], w.tiefpass(Math.max(f * 1.2, 300), Math.min(f * 5, 6000), 0.09));
      [-0.003, 0.003].forEach(d => w.osz('sawtooth', f * (1 + d), w.verst(0.5, h)));
      return { ende: t + 30, loslassen: 0.08 };
    },

    /* Synthesizer: zwei leicht verstimmte Rechtecke mit Tiefpass, klingt, solange man drückt */
    synth(c, t, f, midi, w) {
      const h = w.huelle([[0, 0], [0.01, 0.16], [0.3, 0.11]], w.tiefpass(Math.min(f * 8, 8000), Math.min(f * 3, 5000), 0.3));
      [-0.006, 0.006].forEach(d => w.osz('square', f * (1 + d), w.verst(0.5, h)));
      return { ende: t + 30, loslassen: 0.05 };
    },

    /* Synth-Bass: Sägezahn mit einem Sinus eine Oktave tiefer, der Filter schließt schnell –
       am besten in der tiefen Lage */
    synthbass(c, t, f, midi, w) {
      const h = w.huelle([[0, 0], [0.005, 0.19], [0.25, 0.125]], w.tiefpass(Math.min(f * 12, 5000), Math.max(f * 2, 200), 0.25));
      w.osz('sawtooth', f, w.verst(0.6, h));
      w.osz('sine', f / 2, w.verst(0.6, h));
      return { ende: t + 30, loslassen: 0.04 };
    },
  },

  akkord(midis, start = 0, dauer = 1.4, laut = 0.2) {
    midis.forEach(m => this.klavier(m, start, dauer, laut));
  },

  /* Snare Drum für Rhythmen – übernommen aus der Rhythmus-Werkstatt
     (js/audio.js, snareKlang): das Fell als zwei kurze Töne mit leichtem
     Tonhöhenabfall, der Teppich als gefiltertes, ausklingendes Rauschen.
     staerke: 1 = normal, Werte darüber betonen (Rhythmus-Werkstatt: 0.45 / 1.3). */
  snare(start = 0, staerke = 1) {
    const c = this.audio();
    const t = c.currentTime + start + 0.02;
    const st = 0.45 * staerke;
    const ton = (f0, f1, laut, dauer) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(laut * st, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      o.connect(g).connect(this.ausgang);
      o.start(t); o.stop(t + dauer + 0.02);
    };
    ton(195, 165, 0.26, 0.11);
    ton(335, 290, 0.1, 0.07);

    const quelle = c.createBufferSource();
    quelle.buffer = this.rauschen();
    // Teppich: Hochpass gegen Wummern, Glocke um 5 kHz für das Schnarren
    const hoch = c.createBiquadFilter();
    hoch.type = 'highpass'; hoch.frequency.value = 1400;
    const glocke = c.createBiquadFilter();
    glocke.type = 'peaking'; glocke.frequency.value = 5000; glocke.Q.value = 0.9; glocke.gain.value = 5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.27 * st, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.07 * st, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    quelle.connect(hoch).connect(glocke).connect(g).connect(this.ausgang);
    quelle.start(t);
    quelle.stop(t + 0.25);
  },

  /* Ein Rauschen für alle Snare-Schläge, damit nicht jeder Schlag neu rechnet */
  rauschen() {
    if (!this.rauschPuffer) {
      const laenge = Math.floor(this.ctx.sampleRate * 0.24);
      this.rauschPuffer = this.ctx.createBuffer(1, laenge, this.ctx.sampleRate);
      const d = this.rauschPuffer.getChannelData(0);
      for (let i = 0; i < laenge; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.rauschPuffer;
  },

  /* Leiser Metronom-Klick, damit er sich vom Rhythmus abhebt */
  klick(start = 0, betont = false) {
    const c = this.audio();
    const t = c.currentTime + start + 0.02;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = betont ? 2000 : 1500;
    g.gain.setValueAtTime(betont ? 0.09 : 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.03);
    o.connect(g).connect(this.ausgang);
    o.start(t);
    o.stop(t + 0.04);
  },
};
