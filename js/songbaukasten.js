/* Songbaukasten (#/songbaukasten): eigene kleine Songs in Kästchen bauen.

   Oben das Raster für Töne (unten tief, oben hoch, Grundtöne etwas betont),
   darunter drei Spuren Schlagzeug: Hi-Hat, Snare, Bassdrum – mit denselben
   Icons wie im Drumcomputer, alles in den Farben der Seite. Antippen
   setzt oder löscht ein Kästchen, Ziehen malt weiter. Die Einstellungen
   bestimmen Länge (Takte), Schläge je Takt, Teilung der Schläge, Tonleiter,
   Grundton mit Lage und Umfang (Oktaven).

   Abgespielt wird über eine Taktuhr (js/metronom.js), Töne über Ton.anschlag,
   Schläge über Drums.spielen. Der Song im Bau liegt im Browser; angemeldete
   Kinder speichern ihn beim Worker unter einer fünfstelligen Nummer und
   öffnen ihn damit wieder (#/songbaukasten/48213 öffnet direkt).

   Gespeichert wird nur: { v: 1, takte, schlaege, teile, tonleiter, grundton,
   lage, umfang, bpm, klang, noten: [[schritt, zeile], …], drums: [[schritt, spur], …] }
   – zeile 0 = tiefster Ton, spur 0 = Hi-Hat, 1 = Snare, 2 = Bassdrum. */
const Songbaukasten = {
  TONLEITERN: {
    dur: { name: 'Dur', stufen: [0, 2, 4, 5, 7, 9, 11] },
    moll: { name: 'Moll', stufen: [0, 2, 3, 5, 7, 8, 10] },
    penta: { name: 'Pentatonik', stufen: [0, 2, 4, 7, 9] },
    hm5: { name: 'HM5 (Phrygisch-Dominant)', stufen: [0, 1, 4, 5, 7, 8, 10] },
    chromatisch: { name: 'Chromatisch', stufen: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  },
  GRUNDTOENE: ['c', 'cis', 'd', 'es', 'e', 'f', 'fis', 'g', 'as', 'a', 'b', 'h'],
  NAMEN: ['c', 'cis', 'd', 'es', 'e', 'f', 'fis', 'g', 'as', 'a', 'b', 'h'],
  LAGEN: { 3: 'tief', 4: 'mittel', 5: 'hoch' },
  SPUREN: [
    { k: 'hh', name: 'Hi-Hat' },
    { k: 's', name: 'Snare' },
    { k: 'b', name: 'Bass' },
  ],
  GRENZEN: { takte: [1, 16], schlaege: [2, 6], teile: [1, 4], umfang: [1, 3] },
  KEY: 'musiktrainer-songbaukasten',

  neu() {
    return { v: 1, takte: 4, schlaege: 4, teile: 2, tonleiter: 'dur', grundton: 0, lage: 4, umfang: 2,
      bpm: 100, klang: 'klavier', noten: [], drums: [] };
  },

  /* Name einer Zeile: bei Tonleitern mit sieben Stufen richtig geschrieben (jede Stufe
     ein eigener Buchstabe, also in e-HM5 gis statt as), sonst wie auf der Klavierseite */
  BUCHSTABEN: ['c', 'd', 'e', 'f', 'g', 'a', 'h'],
  NATUR: [0, 2, 4, 5, 7, 9, 11],
  GRUND_BUCHSTABE: [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6],
  zeilenName(z) {
    const m = this.midi(z), l = this.leiter();
    if (l.length !== 7) return this.name(m);
    const b = (this.GRUND_BUCHSTABE[this.song.grundton] + z % 7) % 7;
    let d = (m % 12 - this.NATUR[b] + 12) % 12;
    if (d > 6) d -= 12;
    if (Math.abs(d) > 1) return this.name(m);
    const buchstabe = this.BUCHSTABEN[b];
    const n = d === 1 ? buchstabe + 'is'
      : d === -1 ? ({ e: 'es', a: 'as', h: 'b' }[buchstabe] || buchstabe + 'es') : buchstabe;
    const o = Math.floor((m - d) / 12) - 1;
    return o >= 3 ? n + "'".repeat(o - 3) : n[0].toUpperCase() + n.slice(1) + (o === 1 ? '₁' : '');
  },

  /* ---------- Song: Größe, Töne, Speichern im Browser ---------- */
  schritte() { return this.song.takte * this.song.schlaege * this.song.teile; },
  leiter() { return (this.TONLEITERN[this.song.tonleiter] || this.TONLEITERN.dur).stufen; },
  zeilen() { return this.song.umfang * this.leiter().length + 1; },
  midi(z) {
    const l = this.leiter();
    return 12 * (this.song.lage + 1) + this.song.grundton + 12 * Math.floor(z / l.length) + l[z % l.length];
  },
  /* Deutscher Name mit Oktavstrichen wie auf der Klavierseite */
  name(m) {
    const o = Math.floor(m / 12) - 1;
    const n = this.NAMEN[m % 12];
    return o >= 3 ? n + "'".repeat(o - 3) : n.toUpperCase() + (o === 1 ? '₁' : '');
  },

  pruefen(s) {
    const n = this.neu();
    if (!s || typeof s !== 'object') return n;
    const zahl = (w, [a, b], d) => (Number.isInteger(w) && w >= a && w <= b ? w : d);
    const song = {
      v: 1,
      takte: zahl(s.takte, this.GRENZEN.takte, n.takte),
      schlaege: zahl(s.schlaege, this.GRENZEN.schlaege, n.schlaege),
      teile: zahl(s.teile, this.GRENZEN.teile, n.teile),
      tonleiter: s.tonleiter in this.TONLEITERN ? s.tonleiter : n.tonleiter,
      grundton: zahl(s.grundton, [0, 11], n.grundton),
      lage: zahl(s.lage, [3, 5], n.lage),
      umfang: zahl(s.umfang, this.GRENZEN.umfang, n.umfang),
      bpm: zahl(s.bpm, [50, 200], n.bpm),
      klang: s.klang in Ton.KLAENGE ? s.klang : n.klang,
      noten: [], drums: [],
    };
    this.song = song;
    const sch = this.schritte(), ze = this.zeilen();
    const paare = (liste, max) => (Array.isArray(liste) ? liste : [])
      .filter(p => Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[0] < sch && p[1] >= 0 && p[1] < max);
    song.noten = paare(s.noten, ze);
    song.drums = paare(s.drums, 3);
    return song;
  },

  setzen(song) {
    this.song = this.pruefen(song);
    this.noten = new Set(this.song.noten.map(([s, z]) => `${s}:${z}`));
    this.drums = new Set(this.song.drums.map(([s, z]) => `${s}:${z}`));
  },

  /* Sets zurück in den Song (sortiert, damit gleiche Songs gleich aussehen) */
  packen() {
    const liste = set => [...set].map(k => k.split(':').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    this.song.noten = liste(this.noten);
    this.song.drums = liste(this.drums);
    return this.song;
  },

  sichern() {
    this.packen();
    try {
      localStorage.setItem(this.KEY, JSON.stringify({ song: this.song, nummer: this.nummer, eigener: this.eigener }));
    } catch { /* privates Fenster */ }
  },

  /* Rückgängig: Stand vor jeder Änderung merken */
  vorher() {
    this.packen();
    this.verlauf.push(JSON.stringify(this.song));
    if (this.verlauf.length > 60) this.verlauf.shift();
    this.el.querySelector('#sb-zurueck').disabled = false;
  },

  zurueck() {
    const alt = this.verlauf.pop();
    if (!alt) return;
    this.setzen(JSON.parse(alt));
    this.el.querySelector('#sb-zurueck').disabled = !this.verlauf.length;
    this.leiste.setzen(this.song.bpm);
    this.el.querySelector('#sb-klang').value = this.song.klang;
    this.alles();
  },

  /* ---------- Seite ---------- */
  zeigen(el, nummer) {
    this.el = el;
    this.verlauf = [];
    this.laeuft = false;
    this.metroAn = false;
    let gemerkt = null;
    try { gemerkt = JSON.parse(localStorage.getItem(this.KEY)); } catch { /* nichts */ }
    this.setzen(gemerkt?.song || this.neu());
    this.nummer = gemerkt?.nummer || null;
    this.eigener = !!gemerkt?.eigener;

    el.innerHTML = `
      <a class="zurueck" href="#/">${Icons.raw('back')}Alle Spiele</a>
      <section class="card sb-seite">
        <div class="klavier-kopf">
          <h2>${Icons.raw('raster')}Songbaukasten</h2>
          <div class="sz-kopf-rechts">
            ${Vollbild.knopf()}
            <label class="klavier-klang">Klang
              <select id="sb-klang">${Object.entries(Ton.KLAENGE).map(([id, n]) =>
                `<option value="${id}"${id === this.song.klang ? ' selected' : ''}>${n}</option>`).join('')}</select>
            </label>
            <label class="schalter"><input type="checkbox" role="switch" id="sb-namen"><span class="schalter-bahn"></span>Notennamen</label>
          </div>
        </div>
        <div class="sb-steuer">
          <button type="button" class="primary sb-play" id="sb-play" title="Abspielen oder anhalten (Leertaste)">${Icons.raw('play')}<span>Abspielen</span></button>
          <div class="sb-metro"></div>
        </div>
        <div class="sb-rahmen">
          <div class="sb-gitter" id="sb-gitter"></div>
        </div>
        <div class="sb-werkzeuge">
          <button type="button" class="small" id="sb-einstellungen" aria-expanded="false">${Icons.raw('regler')}Einstellungen</button>
          <button type="button" class="small" id="sb-zurueck" disabled title="Rückgängig (⌘Z / Strg+Z)">${Icons.raw('reset')}Rückgängig</button>
          <button type="button" class="small" id="sb-leeren" title="Alle Kästchen leeren">${Icons.raw('x')}Leeren</button>
          <span class="sb-info hint" id="sb-info"></span>
        </div>
        <div class="sb-einstellungen" id="sb-panel" hidden></div>
        <div class="sb-speicher" id="sb-speicher"></div>
      </section>`;
    this.gitter = el.querySelector('#sb-gitter');
    Vollbild.binden(el.querySelector('.sb-seite'));
    this.zoomSperre();

    this.uhr = new Taktuhr(() => this.song.bpm, (i, zeit) => this.schritt(i, zeit), i => this.laufmarke(i),
      { teile: () => this.song.teile, laenge: () => this.schritte() });
    this.leiste = new Tempoleiste(el.querySelector('.sb-metro'), {
      bpm: this.song.bpm,
      beiTempo: b => { this.song.bpm = b; this.sichern(); },
      beiMetronom: () => { this.metroAn = !this.metroAn; this.leiste.an(this.metroAn); },
    });

    let namen = true;
    try { namen = localStorage.getItem(this.KEY + '-namen') !== 'aus'; } catch { /* egal */ }
    const nk = el.querySelector('#sb-namen');
    nk.checked = namen;
    this.gitter.classList.toggle('ohne-namen', !namen);
    nk.addEventListener('change', () => {
      this.gitter.classList.toggle('ohne-namen', !nk.checked);
      try { localStorage.setItem(this.KEY + '-namen', nk.checked ? 'an' : 'aus'); } catch { /* egal */ }
    });
    el.querySelector('#sb-klang').addEventListener('change', e => {
      this.vorher();
      this.song.klang = e.target.value;
      this.sichern();
      const aus = Ton.anschlag(this.midi(0), this.song.klang);
      setTimeout(aus, 400);
    });
    el.querySelector('#sb-play').addEventListener('click', () => this.umschalten());
    el.querySelector('#sb-zurueck').addEventListener('click', () => this.zurueck());
    el.querySelector('#sb-leeren').addEventListener('click', () => {
      if (!this.noten.size && !this.drums.size) return;
      this.vorher();
      this.noten.clear();
      this.drums.clear();
      this.sichern();
      this.gitterZeichnen();
    });
    el.querySelector('#sb-einstellungen').addEventListener('click', e => {
      const p = el.querySelector('#sb-panel');
      p.hidden = !p.hidden;
      e.currentTarget.setAttribute('aria-expanded', String(!p.hidden));
      if (!p.hidden) this.panelZeichnen();
    });
    this.malenEinrichten();

    const taste = e => {
      if (e.target.closest?.('input, select, textarea')) return;
      if (e.key === ' ' && !e.repeat) { e.preventDefault(); this.umschalten(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.zurueck(); }
    };
    const weg = () => { if (document.hidden) this.stoppen(); };
    document.addEventListener('keydown', taste);
    document.addEventListener('visibilitychange', weg);
    App.beimAufraeumen(() => {
      document.removeEventListener('keydown', taste);
      document.removeEventListener('visibilitychange', weg);
      this.uhr.stoppen();
      this.laeuft = false;
    });

    this.alles();
    if (/^\d{5}$/.test(nummer || '')) this.oeffnen(nummer);
  },

  alles() {
    this.gitterZeichnen();
    if (!this.el.querySelector('#sb-panel').hidden) this.panelZeichnen();
    this.speicherZeichnen();
  },

  /* Das Raster: oben die Takt-Nummern, dann die Töne (höchster zuerst), dann die drei
     Schlagzeug-Spuren. Zwischen den Takten liegt eine eigene schmale Spalte mit einem
     durchgehenden Strich – so bleiben alle Kästchen gleich breit. Jeder Schlag beginnt
     mit einem helleren Kästchen, jeder zweite Takt ist leicht getönt. */
  gitterZeichnen() {
    const S = this.schritte(), Z = this.zeilen(), { teile, schlaege, takte } = this.song;
    const proTakt = teile * schlaege;
    const zeilenGesamt = 1 + Z + this.SPUREN.length;
    const sp = s => 2 + s + Math.floor(s / proTakt);           // Spalte im Raster (1 = Namen)
    const klassen = s => {
      const c = [];
      if (s % teile === 0) c.push('schlag');
      if (Math.floor(s / proTakt) % 2) c.push('getoent');
      return c.join(' ');
    };
    const ort = (spalte, zeile) => `grid-area: ${zeile} / ${spalte}`;
    let html = `<div class="sb-name sb-kopf" style="${ort(1, 1)}"></div>`;
    for (let t = 0; t < takte; t++) {
      html += `<div class="sb-taktnr${t % 2 ? ' getoent' : ''}" style="grid-area: 1 / ${sp(t * proTakt)} / 2 / span ${proTakt}">${t + 1}</div>`;
      if (t) html += `<div class="sb-trenner" style="grid-area: 1 / ${sp(t * proTakt) - 1} / ${zeilenGesamt + 1} / span 1"></div>`;
    }
    for (let z = Z - 1; z >= 0; z--) {
      const zeile = 2 + (Z - 1 - z);
      const grund = z % this.leiter().length === 0;
      html += `<div class="sb-name${grund ? ' grund' : ''}" style="${ort(1, zeile)}">${this.zeilenName(z)}</div>`;
      for (let s = 0; s < S; s++) {
        const an = this.noten.has(`${s}:${z}`);
        html += `<div class="sb-z ton ${klassen(s)}${grund ? ' grundzeile' : ''}${an ? ' an' : ''}" data-s="${s}" data-z="${z}" style="${ort(sp(s), zeile)}"></div>`;
      }
    }
    this.SPUREN.forEach((spur, i) => {
      const zeile = 2 + Z + i;
      html += `<div class="sb-name drum${i === 0 ? ' erste' : ''}" title="${spur.name}" style="${ort(1, zeile)}"><svg viewBox="0 0 24 24" aria-hidden="true">${Schlagzeugseite.SPUR_ICON[spur.k]}</svg><span>${spur.name}</span></div>`;
      for (let s = 0; s < S; s++) {
        const an = this.drums.has(`${s}:${i}`);
        html += `<div class="sb-z drum ${klassen(s)}${i === 0 ? ' erste' : ''}${an ? ' an' : ''}" data-s="${s}" data-d="${i}" style="${ort(sp(s), zeile)}"></div>`;
      }
    });
    html += '<div class="sb-lauf" hidden></div>';
    const takt = `repeat(${proTakt}, minmax(20px, 1fr))`;
    this.gitter.style.gridTemplateColumns = `var(--namen) ${Array.from({ length: takte }, () => takt).join(' 9px ')}`;
    this.gitter.style.setProperty('--spalten', S);
    this.gitter.style.setProperty('--takte', takte);
    this.gitter.style.setProperty('--zeilen', Z);
    this.gitter.innerHTML = html;
    this.lauf = this.gitter.querySelector('.sb-lauf');
    this.infoZeigen();
  },

  infoZeigen() {
    const l = this.TONLEITERN[this.song.tonleiter].name;
    this.el.querySelector('#sb-info').textContent =
      `${this.song.takte} Takte · ${this.song.schlaege}/4 · ${this.GRUNDTOENE[this.song.grundton]}-${l}`;
  },

  zelleSetzen(k, an) {
    const d = k.dataset.d !== undefined;
    const schl = `${k.dataset.s}:${d ? k.dataset.d : k.dataset.z}`;
    const set = d ? this.drums : this.noten;
    if (set.has(schl) === an) return false;
    if (an) set.add(schl); else set.delete(schl);
    k.classList.toggle('an', an);
    if (an && !this.laeuft) {
      // Zum Hören kurz anspielen
      if (d) Drums.spielen(this.SPUREN[k.dataset.d].k, undefined, 0.8);
      else { const aus = Ton.anschlag(this.midi(Number(k.dataset.z)), this.song.klang); setTimeout(aus, 250); }
    }
    return true;
  },

  /* Kein Zoom auf dieser Seite: Doppeltippen und zwei Finger würden die Seite
     vergrößern, und zurück ginge es nicht, weil jeder Finger im Raster ein
     Kästchen setzt. (touch-action allein reicht dem iPad hier nicht.) Der
     zweite Tipp auf einen Knopf wird dabei selbst ausgelöst. */
  zoomSperre() {
    let zuletzt = 0;
    const zwei = e => { if (e.touches.length > 1) e.preventDefault(); };
    const tipp = e => {
      if (e.touches.length || e.changedTouches.length !== 1) return;
      const jetzt = e.timeStamp;
      if (jetzt - zuletzt < 400 && !e.target.closest?.('input, select, textarea')) {
        e.preventDefault();
        e.target.closest?.('button, a, label')?.click();
        zuletzt = 0;
        return;
      }
      zuletzt = jetzt;
    };
    const geste = e => e.preventDefault();
    document.addEventListener('touchstart', zwei, { passive: false });
    document.addEventListener('touchend', tipp, { passive: false });
    ['gesturestart', 'gesturechange'].forEach(n => document.addEventListener(n, geste));
    App.beimAufraeumen(() => {
      document.removeEventListener('touchstart', zwei);
      document.removeEventListener('touchend', tipp);
      ['gesturestart', 'gesturechange'].forEach(n => document.removeEventListener(n, geste));
    });
  },

  /* Antippen schaltet um; beim Ziehen wird wie beim ersten Kästchen weitergemalt
     (gesetzt oder gelöscht) – in der Tonzeile oder Drumspur, in der man begonnen hat */
  malenEinrichten() {
    const g = this.gitter;
    let modus = null, art = null, geaendert = false;
    const finger = new Set();   // Finger, die gerade auf dem Raster liegen
    const zelle = e => {
      const k = document.elementFromPoint(e.clientX, e.clientY)?.closest('.sb-z');
      return k && g.contains(k) ? k : null;
    };
    g.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') finger.add(e.pointerId);
      const k = e.target.closest('.sb-z');
      if (!k) return;
      e.preventDefault();
      /* Zweiter Finger (Zwei-Finger-Geste): nichts eintragen, den angefangenen
         Strich zurücknehmen */
      if (finger.size > 1) {
        if (modus !== null) { modus = null; this.zurueck(); }
        return;
      }
      Ton.audio();
      try { g.setPointerCapture(e.pointerId); } catch { /* egal */ }
      art = k.dataset.d !== undefined ? 'drum' : 'ton';
      const set = art === 'drum' ? this.drums : this.noten;
      modus = !set.has(`${k.dataset.s}:${art === 'drum' ? k.dataset.d : k.dataset.z}`);
      this.vorher();
      geaendert = this.zelleSetzen(k, modus);
    });
    g.addEventListener('pointermove', e => {
      if (modus === null) return;
      const k = zelle(e);
      if (!k || (k.dataset.d !== undefined ? 'drum' : 'ton') !== art) return;
      if (this.zelleSetzen(k, modus)) geaendert = true;
    });
    const ende = e => {
      if (e.type !== 'lostpointercapture') finger.delete(e.pointerId);
      if (modus === null) return;
      modus = null;
      if (geaendert) this.sichern(); else this.verlauf.pop();
      this.el.querySelector('#sb-zurueck').disabled = !this.verlauf.length;
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => g.addEventListener(n, ende));
    // Finger, die außerhalb des Rasters losgelassen werden
    const weg = e => finger.delete(e.pointerId);
    ['pointerup', 'pointercancel'].forEach(n => window.addEventListener(n, weg));
    App.beimAufraeumen(() => ['pointerup', 'pointercancel'].forEach(n => window.removeEventListener(n, weg)));
    g.addEventListener('contextmenu', e => e.preventDefault());
  },

  /* ---------- Abspielen ---------- */
  umschalten() {
    Ton.audio();
    if (this.laeuft) this.stoppen(); else this.starten();
  },

  starten() {
    this.laeuft = true;
    this.uhr.starten();
    const k = this.el.querySelector('#sb-play');
    k.innerHTML = `<span class="sb-stopp-zeichen">■</span><span>Stopp</span>`;
    k.setAttribute('aria-pressed', 'true');
  },

  stoppen() {
    this.laeuft = false;
    this.uhr.stoppen();
    const k = this.el.querySelector('#sb-play');
    if (!k) return;
    k.innerHTML = `${Icons.raw('play')}<span>Abspielen</span>`;
    k.setAttribute('aria-pressed', 'false');
    if (this.lauf) this.lauf.hidden = true;
    this.gitter.querySelectorAll('.klingt').forEach(z => z.classList.remove('klingt'));
    this.leiste.schlag(-1);
  },

  schritt(i, zeit) {
    const dauer = 60 / this.song.bpm / this.song.teile;
    for (let z = 0; z < this.zeilen(); z++) {
      if (!this.noten.has(`${i}:${z}`)) continue;
      const aus = Ton.anschlag(this.midi(z), this.song.klang, zeit);
      aus(zeit + dauer * 0.92);
    }
    this.SPUREN.forEach((sp, d) => { if (this.drums.has(`${i}:${d}`)) Drums.spielen(sp.k, zeit, 0.9); });
    if (this.metroAn && i % this.song.teile === 0) Metronom.klick(zeit, i % (this.song.teile * this.song.schlaege) === 0);
  },

  /* Ein senkrechter Balken läuft mit; was gerade klingt, leuchtet auf */
  laufmarke(i) {
    if (!this.lauf) return;
    const c = this.gitter.querySelector(`.sb-z[data-s="${i}"]`);
    if (!c) return;
    this.lauf.hidden = false;
    this.lauf.style.left = `${c.offsetLeft}px`;
    this.lauf.style.width = `${c.offsetWidth}px`;
    this.gitter.querySelectorAll('.klingt').forEach(z => z.classList.remove('klingt'));
    this.gitter.querySelectorAll(`.sb-z.an[data-s="${i}"]`).forEach(z => z.classList.add('klingt'));
    if (i % this.song.teile === 0) this.leiste.schlag((i / this.song.teile) % 4);
    // Bei langen Songs mitscrollen
    const r = this.el.querySelector('.sb-rahmen');
    const x = c.offsetLeft;
    if (x < r.scrollLeft + 60 || x > r.scrollLeft + r.clientWidth - 60) r.scrollLeft = Math.max(0, x - 80);
  },

  /* ---------- Einstellungen ---------- */
  panelZeichnen() {
    const s = this.song;
    const zahl = (id, text, wert) => `
      <div class="sb-zeile"><span>${text}</span>
        <div class="sb-wert"><b>${wert}</b>
          <button type="button" class="sz-pm" data-feld="${id}" data-d="-1" aria-label="${text}: weniger">−</button>
          <button type="button" class="sz-pm" data-feld="${id}" data-d="1" aria-label="${text}: mehr">+</button>
        </div></div>`;
    const auswahl = (id, werte, wert) => `<select data-wahl="${id}">${Object.entries(werte).map(([k, n]) =>
      `<option value="${k}"${String(k) === String(wert) ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
    this.el.querySelector('#sb-panel').innerHTML = `
      <div class="sb-spalte">
        ${zahl('takte', 'Länge', `${s.takte} ${s.takte === 1 ? 'Takt' : 'Takte'}`)}
        ${zahl('schlaege', 'Schläge pro Takt', s.schlaege)}
        ${zahl('teile', 'Schläge teilen in', s.teile)}
      </div>
      <div class="sb-spalte">
        <div class="sb-zeile"><span>Tonleiter</span><div class="sb-wert">${auswahl('tonleiter',
          Object.fromEntries(Object.entries(this.TONLEITERN).map(([k, t]) => [k, t.name])), s.tonleiter)}</div></div>
        <div class="sb-zeile"><span>Beginnt mit</span><div class="sb-wert">${auswahl('lage', this.LAGEN, s.lage)}${auswahl('grundton',
          Object.fromEntries(this.GRUNDTOENE.map((n, i) => [i, n])), s.grundton)}</div></div>
        ${zahl('umfang', 'Umfang', `${s.umfang} ${s.umfang === 1 ? 'Oktave' : 'Oktaven'}`)}
      </div>`;
    const p = this.el.querySelector('#sb-panel');
    p.querySelectorAll('[data-feld]').forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.feld, [a, z] = this.GRENZEN[f];
      const neu = Math.max(a, Math.min(z, s[f] + Number(b.dataset.d)));
      if (neu !== s[f]) this.aendern(f, neu);
    }));
    p.querySelectorAll('[data-wahl]').forEach(w => w.addEventListener('change', () => {
      const f = w.dataset.wahl;
      this.aendern(f, f === 'tonleiter' ? w.value : Number(w.value));
    }));
  },

  /* Einstellung ändern und die Kästchen mitnehmen, so gut es geht: Schläge und
     Teilung rechnen die Position um, Tonleiter und Lage behalten die Zeile.
     Was nicht mehr ins Raster passt, fällt weg (Rückgängig holt es zurück). */
  aendern(feld, wert) {
    this.vorher();
    this.packen();
    const alt = { ...this.song };
    const um = s => {
      const pt = alt.teile * alt.schlaege;
      const takt = Math.floor(s / pt), schlag = Math.floor((s % pt) / alt.teile), teil = s % alt.teile;
      const n = { ...alt, [feld]: wert };
      if (schlag >= n.schlaege) return -1;
      // Auf den nächsten Teil runden (die „und“ von 2 landet bei 3 auf dem dritten Teil und zurück)
      const t = Math.round(teil * n.teile / alt.teile);
      if (t >= n.teile) return -1;
      return takt * n.teile * n.schlaege + schlag * n.teile + t;
    };
    const neu = { ...alt, [feld]: wert };
    if (feld === 'schlaege' || feld === 'teile') {
      neu.noten = alt.noten.map(([s, z]) => [um(s), z]).filter(([s]) => s >= 0);
      neu.drums = alt.drums.map(([s, z]) => [um(s), z]).filter(([s]) => s >= 0);
    }
    this.setzen(neu);
    this.sichern();
    if (this.laeuft) { this.uhr.stoppen(); this.uhr.starten(); }
    this.alles();
  },

  /* ---------- Speichern und Öffnen über eine Nummer ---------- */
  meine() {
    if (!Konto.angemeldet()) return [];
    try { return JSON.parse(localStorage.getItem(`${this.KEY}-nummern-k${Konto.daten.id}`)) || []; } catch { return []; }
  },
  meineMerken(n) {
    const liste = [n, ...this.meine().filter(x => x !== n)].slice(0, 8);
    try { localStorage.setItem(`${this.KEY}-nummern-k${Konto.daten.id}`, JSON.stringify(liste)); } catch { /* egal */ }
  },

  speicherZeichnen(meldung = '') {
    const ort = this.el.querySelector('#sb-speicher');
    if (!Konto.verfuegbar()) { ort.innerHTML = ''; return; }
    if (!Konto.angemeldet()) {
      ort.innerHTML = `<p class="hint">${Icons.raw('user')}Zum Speichern und Öffnen über eine Nummer bitte
        <a href="#/anmelden">anmelden</a>. Bis dahin merkt sich dieser Browser deinen Song.</p>`;
      return;
    }
    const eigen = this.nummer && this.eigener;
    const meine = this.meine();
    ort.innerHTML = `
      <div class="sb-speicher-reihe">
        <div class="sb-speicher-teil">
          <h3>Speichern</h3>
          ${eigen ? `<p class="hint">Dein Song hat die Nummer <b class="sb-nr-klein">${this.nummer}</b>.</p>` : ''}
          <div class="sb-knoepfe">
            <button type="button" class="primary" id="sb-speichern">${Icons.raw('check')}${eigen ? `Nr. ${this.nummer} speichern` : 'Speichern'}</button>
            ${this.nummer ? '<button type="button" id="sb-neu-speichern">Als neuer Song</button>' : ''}
            <button type="button" id="sb-neuer">Neuer leerer Song</button>
          </div>
        </div>
        <div class="sb-speicher-teil">
          <h3>Song öffnen</h3>
          <form class="sb-oeffnen" id="sb-oeffnen-form">
            <input id="sb-nr" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="Nummer, z. B. 48213" aria-label="Nummer des Songs" autocomplete="off">
            <button type="submit">Öffnen</button>
          </form>
          ${meine.length ? `<div class="sb-meine"><span class="hint">Zuletzt:</span>${meine.map(n => `<button type="button" class="small" data-nr="${n}">${n}</button>`).join('')}</div>` : ''}
        </div>
      </div>
      <div class="sb-meldung" aria-live="polite">${meldung}</div>`;
    ort.querySelector('#sb-speichern').addEventListener('click', () => this.speichern(!eigen));
    ort.querySelector('#sb-neu-speichern')?.addEventListener('click', () => this.speichern(true));
    ort.querySelector('#sb-neuer').addEventListener('click', () => {
      if ((this.noten.size || this.drums.size) && !confirm('Neuen leeren Song beginnen? Ist der jetzige gespeichert?')) return;
      this.vorher();
      const s = this.neu();
      ['takte', 'schlaege', 'teile', 'tonleiter', 'grundton', 'lage', 'umfang', 'bpm', 'klang'].forEach(k => { s[k] = this.song[k]; });
      this.setzen(s);
      this.nummer = null;
      this.eigener = false;
      this.sichern();
      this.alles();
    });
    ort.querySelector('#sb-oeffnen-form').addEventListener('submit', e => {
      e.preventDefault();
      const n = ort.querySelector('#sb-nr').value.replace(/\D/g, '');
      if (!/^\d{5}$/.test(n)) { this.meldung('Die Nummer hat fünf Ziffern.', true); return; }
      this.oeffnen(n);
    });
    ort.querySelectorAll('[data-nr]').forEach(b => b.addEventListener('click', () => this.oeffnen(b.dataset.nr)));
  },

  meldung(text, fehler = false) {
    const m = this.el.querySelector('.sb-meldung');
    if (m) { m.innerHTML = text; m.classList.toggle('fehler', fehler); }
  },

  async speichern(alsNeu) {
    if (!this.noten.size && !this.drums.size) { this.meldung('Setz erst ein paar Töne – ein leerer Song lässt sich nicht speichern.', true); return; }
    this.packen();
    this.meldung('Speichert …');
    try {
      const d = alsNeu || !this.nummer
        ? await Konto.api('/api/songs', { methode: 'POST', body: { daten: this.song } })
        : await Konto.api(`/api/songs/${this.nummer}`, { methode: 'PATCH', body: { daten: this.song } });
      this.nummer = String(d.nummer);
      this.eigener = true;
      this.meineMerken(this.nummer);
      this.sichern();
      this.speicherZeichnen(`<div class="sb-nummer"><span>Gespeichert! Deine Nummer:</span><b>${this.nummer}</b>
        <span class="hint">Schreib sie dir auf – damit öffnest du den Song wieder, auch auf einem anderen Gerät.</span></div>`);
    } catch (e) {
      if (e.status === 401) { Konto.abmelden(); App.abgemeldet(e.message); return; }
      this.meldung(esc(e.message || 'Speichern hat nicht geklappt – ist das Internet da?'), true);
    }
  },

  async oeffnen(n) {
    if (!Konto.angemeldet()) { this.speicherZeichnen(); this.meldung('Zum Öffnen über eine Nummer bitte anmelden.', true); return; }
    this.meldung(`Öffnet Song ${n} …`);
    try {
      const d = await Konto.api(`/api/songs/${n}`);
      this.stoppen();
      this.vorher();
      this.setzen(d.daten);
      this.nummer = String(d.nummer);
      this.eigener = !!d.eigener;
      if (this.eigener) this.meineMerken(this.nummer);
      this.sichern();
      this.leiste.setzen(this.song.bpm);
      this.el.querySelector('#sb-klang').value = this.song.klang;
      this.gitterZeichnen();
      if (!this.el.querySelector('#sb-panel').hidden) this.panelZeichnen();
      this.speicherZeichnen(this.eigener ? `Dein Song ${n} ist offen.`
        : `Song ${n} ist offen. Wenn du etwas änderst, speichere ihn als deinen eigenen Song.`);
      if (location.hash !== '#/songbaukasten') history.replaceState(null, '', '#/songbaukasten');
    } catch (e) {
      if (e.status === 401) { Konto.abmelden(); App.abgemeldet(e.message); return; }
      this.meldung(esc(e.message || 'Öffnen hat nicht geklappt – ist das Internet da?'), true);
    }
  },
};
