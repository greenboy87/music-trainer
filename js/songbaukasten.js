/* Songbaukasten (#/songbaukasten): eigene kleine Songs in Kästchen bauen.

   Aufgebaut wie ein Song-Maker: die Seite füllt das ganze Fenster und scrollt
   nicht (auch kein Zoomen). Oben das Raster für Töne (unten tief, oben hoch,
   jeder Ton in seiner Farbe), darunter drei Zeilen Schlagzeug. Antippen setzt
   oder löscht ein Kästchen, Finger draufhalten und ziehen malt weiter. Passen
   nicht alle Takte nebeneinander, blättert der Schieber darunter weiter.
   Unten: Abspielen, Klang und Schlagzeug (Antippen schaltet weiter), Tempo,
   Einstellungen (Länge, Schläge, Teilung, Tonleiter, Grundton, Umfang,
   Notennamen, Metronom), Rückgängig, Speichern. Zurück führt zur Übersicht.

   Abgespielt wird über eine Taktuhr (js/metronom.js), Töne über Ton.anschlag,
   Schläge über Drums.spielen. Der Song im Bau liegt im Browser; angemeldete
   Kinder speichern ihn beim Worker unter einer fünfstelligen Nummer und
   öffnen ihn damit wieder (#/songbaukasten/48213 öffnet direkt).

   Gespeichert wird nur: { v: 1, takte, schlaege, teile, tonleiter, grundton,
   lage, umfang, bpm, klang, kit, noten: [[schritt, zeile], …], drums: [[schritt, spur], …] }
   – zeile 0 = tiefster Ton, spur 0–2 = die drei Klänge des Schlagzeugs (KITS,
   beim normalen Schlagzeug Hi-Hat, Snare, Bassdrum). kit fehlt in älteren Songs. */
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
  /* Schlagzeuge zum Durchschalten: je drei Klänge für die drei Zeilen (oben → unten) */
  KITS: {
    rock: { name: 'Schlagzeug', spuren: ['hh', 's', 'b'], kurz: ['HH', 'SN', 'BD'] },
    jazz: { name: 'Jazz', spuren: ['ride', 's', 'b'], kurz: ['RD', 'SN', 'BD'] },
    toms: { name: 'Toms', spuren: ['t1', 't2', 't3'], kurz: ['T1', 'T2', 'T3'] },
    perc: { name: 'Percussion', spuren: ['kuh', 'bh', 'bt'], kurz: ['KG', 'BO', 'BT'] },
    klatsch: { name: 'Klatschen', spuren: ['hh', 'clap', 'b'], kurz: ['HH', 'KL', 'BD'] },
  },
  spurKlang(d) { return (this.KITS[this.song.kit] || this.KITS.rock).spuren[d]; },
  GRENZEN: { takte: [1, 16], schlaege: [2, 6], teile: [1, 4], umfang: [1, 3] },
  KEY: 'musiktrainer-songbaukasten',

  neu() {
    return { v: 1, takte: 4, schlaege: 4, teile: 2, tonleiter: 'dur', grundton: 0, lage: 4, umfang: 2,
      bpm: 100, klang: 'marimba', kit: 'rock', noten: [], drums: [] };
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
      kit: s.kit in this.KITS ? s.kit : n.kit,
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
    this.alles();
  },

  /* ---------- Seite: füllt das ganze Fenster, nichts scrollt ---------- */
  zeigen(el, nummer) {
    this.el = el;
    this.verlauf = [];
    this.laeuft = false;
    this.metroAn = false;
    this.x = 0;             // wie weit das Raster nach links geschoben ist (px)
    this.aktuell = null;    // Schritt, der gerade klingt
    let gemerkt = null;
    try { gemerkt = JSON.parse(localStorage.getItem(this.KEY)); } catch { /* nichts */ }
    this.setzen(gemerkt?.song || this.neu());
    this.nummer = gemerkt?.nummer || null;
    this.eigener = !!gemerkt?.eigener;
    this.namenAn = true;
    try { this.namenAn = localStorage.getItem(this.KEY + '-namen') !== 'aus'; } catch { /* egal */ }

    const werkzeug = (id, icon, text, titel) => `
      <button type="button" class="sb-werkzeug" id="${id}" title="${titel}">
        <span class="sb-kreis">${Icons.raw(icon)}</span><span class="sb-beschr">${text}</span></button>`;
    document.body.classList.add('sb-offen');
    el.innerHTML = `
      <div class="sb-app">
        <header class="sb-kopf">
          <div class="sb-kopf-seite">
            <a class="sb-rund" href="#/" title="Zurück zur Übersicht" aria-label="Zurück zur Übersicht">${Icons.raw('back')}</a>
            <button type="button" class="sb-rund" id="sb-vollbild" title="Vollbild" aria-label="Vollbild">${Icons.raw('expand')}</button>
          </div>
          <h2 class="sb-titel">Songbaukasten<span id="sb-titel-nr"></span></h2>
          <div class="sb-kopf-seite rechts">
            <button type="button" class="sb-text" id="sb-neu" title="Alles leeren und neu anfangen">${Icons.raw('neu')}<span>Neu</span></button>
          </div>
        </header>
        <div class="sb-buehne" id="sb-buehne"><canvas id="sb-feld" aria-label="Raster für Töne und Schlagzeug"></canvas>
          <div class="sb-toast" id="sb-toast" hidden></div></div>
        <div class="sb-schieber" id="sb-schieber" title="Ziehen, um durch die Takte zu blättern"><div class="sb-daumen" id="sb-daumen"></div></div>
        <footer class="sb-fuss">
          <button type="button" class="sb-play" id="sb-play" title="Abspielen oder anhalten (Leertaste)" aria-label="Abspielen">${Icons.raw('play')}</button>
          ${werkzeug('sb-klang', 'piano', '', 'Antippen: nächster Klang')}
          ${werkzeug('sb-kit', 'drum', '', 'Antippen: nächstes Schlagzeug')}
          <label class="sb-tempo"><span>Tempo</span>
            <input type="range" id="sb-tempo" min="50" max="200" step="1" aria-label="Tempo in BPM">
            <b id="sb-bpm"></b></label>
          <div class="sb-fuss-rechts">
            ${werkzeug('sb-einst', 'regler', 'Einstellungen', 'Takte, Tonleiter, Notennamen …')}
            ${werkzeug('sb-zurueck', 'undo', 'Rückgängig', 'Rückgängig (⌘Z / Strg+Z)')}
            ${werkzeug('sb-sichern', 'check', 'Speichern', 'Speichern und öffnen über eine Nummer')}
          </div>
        </footer>
        <div class="sb-blatt" id="sb-blatt" hidden>
          <div class="sb-blatt-karte">
            <div class="sb-blatt-kopf"><h3 id="sb-blatt-titel"></h3>
              <button type="button" class="sb-rund" id="sb-blatt-zu" aria-label="Schließen">${Icons.raw('x')}</button></div>
            <div class="sb-blatt-inhalt" id="sb-blatt-inhalt"></div>
          </div>
        </div>
      </div>`;
    this.app = el.querySelector('.sb-app');
    this.buehne = el.querySelector('#sb-buehne');
    this.canvas = el.querySelector('#sb-feld');
    this.uhr = new Taktuhr(() => this.song.bpm, (i, zeit) => this.schritt(i, zeit), i => this.laufmarke(i),
      { teile: () => this.song.teile, laenge: () => this.schritte() });

    const $ = s => el.querySelector(s);
    $('#sb-play').addEventListener('click', () => this.umschalten());
    $('#sb-zurueck').addEventListener('click', () => this.zurueck());
    $('#sb-klang').addEventListener('click', () => this.weiter('klang'));
    $('#sb-kit').addEventListener('click', () => this.weiter('kit'));
    $('#sb-einst').addEventListener('click', () => this.blatt('einstellungen'));
    $('#sb-sichern').addEventListener('click', () => this.blatt('speichern'));
    $('#sb-blatt-zu').addEventListener('click', () => this.blattZu());
    $('#sb-blatt').addEventListener('pointerdown', e => { if (e.target.id === 'sb-blatt') this.blattZu(); });
    $('#sb-neu').addEventListener('click', () => {
      if ((this.noten.size || this.drums.size) && !confirm('Alles leeren und einen neuen Song beginnen?')) return;
      this.vorher();
      this.noten.clear();
      this.drums.clear();
      this.nummer = null;
      this.eigener = false;
      this.x = 0;
      this.sichern();
      this.alles();
    });
    const tempo = $('#sb-tempo');
    tempo.addEventListener('input', () => {
      this.song.bpm = Number(tempo.value);
      $('#sb-bpm').textContent = this.song.bpm;
    });
    tempo.addEventListener('change', () => this.sichern());
    this.vollbildEinrichten();
    this.malenEinrichten();
    this.schieberEinrichten();

    const taste = e => {
      if (e.target.closest?.('input:not([type=range]), select, textarea')) return;
      if (e.key === 'Escape' && !$('#sb-blatt').hidden) this.blattZu();
      else if (e.key === ' ' && !e.repeat) { e.preventDefault(); this.umschalten(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.zurueck(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        this.schieben(this.x + (e.key === 'ArrowRight' ? 1 : -1) * this.m.proTakt * this.m.spalte);
      }
    };
    const weg = () => { if (document.hidden) this.stoppen(); };
    // Safari auf dem iPad: kein Zoomen mit zwei Fingern
    const kneifen = e => e.preventDefault();
    const ro = new ResizeObserver(() => this.malen());
    ro.observe(this.buehne);
    document.addEventListener('keydown', taste);
    document.addEventListener('visibilitychange', weg);
    document.addEventListener('gesturestart', kneifen);
    const thema = new MutationObserver(() => this.malen());
    thema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    App.beimAufraeumen(() => {
      document.removeEventListener('keydown', taste);
      document.removeEventListener('visibilitychange', weg);
      document.removeEventListener('gesturestart', kneifen);
      ro.disconnect();
      thema.disconnect();
      this.uhr.stoppen();
      this.laeuft = false;
      clearTimeout(this.toastUhr);
      document.body.classList.remove('sb-offen');
    });

    this.alles();
    if (/^\d{5}$/.test(nummer || '')) this.oeffnen(nummer);
  },

  /* Knopf oben links (wie beim Original): echtes Vollbild des Browsers, wo es das gibt */
  vollbildEinrichten() {
    const k = this.el.querySelector('#sb-vollbild');
    if (!Vollbild.moeglich()) { k.hidden = true; return; }
    let selbst = false;
    const zeigen = () => {
      const an = !!Vollbild.echt();
      k.innerHTML = Icons.raw(an ? 'shrink' : 'expand');
      k.title = an ? 'Vollbild beenden' : 'Vollbild';
      if (!an) selbst = false;
    };
    k.addEventListener('click', () => {
      if (Vollbild.echt()) Vollbild.raus(); else { selbst = true; Vollbild.rein(); }
    });
    document.addEventListener('fullscreenchange', zeigen);
    document.addEventListener('webkitfullscreenchange', zeigen);
    App.beimAufraeumen(() => {
      document.removeEventListener('fullscreenchange', zeigen);
      document.removeEventListener('webkitfullscreenchange', zeigen);
      if (selbst) Vollbild.raus();
    });
    zeigen();
  },

  /* Klang oder Schlagzeug durchschalten – Antippen nimmt den nächsten */
  weiter(was) {
    const liste = Object.keys(was === 'klang' ? Ton.KLAENGE : this.KITS);
    this.vorher();
    this.song[was] = liste[(liste.indexOf(this.song[was]) + 1) % liste.length];
    this.sichern();
    this.knoepfeZeigen();
    Ton.audio();
    if (was === 'klang') {
      [0, 2, 4].forEach((z, n) => setTimeout(() => {
        const aus = Ton.anschlag(this.midi(z), this.song.klang);
        setTimeout(aus, 300);
      }, n * 110));
    } else {
      const c = Ton.audio();
      [2, 0, 1, 0].forEach((d, n) => Drums.spielen(this.spurKlang(d), c.currentTime + 0.02 + n * 0.16, 0.9));
    }
  },

  knoepfeZeigen() {
    const $ = s => this.el.querySelector(s);
    $('#sb-klang .sb-beschr').textContent = Ton.KLAENGE[this.song.klang];
    $('#sb-kit .sb-beschr').textContent = this.KITS[this.song.kit].name;
    $('#sb-tempo').value = this.song.bpm;
    $('#sb-bpm').textContent = this.song.bpm;
    $('#sb-zurueck').disabled = !this.verlauf.length;
    $('#sb-titel-nr').textContent = this.nummer ? ` · Nr. ${this.nummer}` : '';
  },

  alles() {
    this.knoepfeZeigen();
    this.malen();
    const offen = this.el.querySelector('#sb-blatt').hidden ? null : this.blattArt;
    if (offen === 'einstellungen') this.panelZeichnen();
    if (offen === 'speichern') this.speicherZeichnen();
  },

  /* Einstellungen und Speichern liegen auf einem Blatt über dem Raster */
  blatt(art) {
    this.blattArt = art;
    const b = this.el.querySelector('#sb-blatt');
    this.el.querySelector('#sb-blatt-titel').textContent = art === 'einstellungen' ? 'Einstellungen' : 'Speichern und öffnen';
    const inhalt = this.el.querySelector('#sb-blatt-inhalt');
    if (art === 'einstellungen') {
      inhalt.innerHTML = `
        <div class="sb-einstellungen" id="sb-panel"></div>
        <div class="sb-schalter">
          <label class="schalter"><input type="checkbox" role="switch" id="sb-namen"${this.namenAn ? ' checked' : ''}><span class="schalter-bahn"></span>Notennamen am Rand</label>
          <label class="schalter"><input type="checkbox" role="switch" id="sb-metro"${this.metroAn ? ' checked' : ''}><span class="schalter-bahn"></span>Metronom beim Abspielen</label>
        </div>`;
      this.panelZeichnen();
      inhalt.querySelector('#sb-namen').addEventListener('change', e => {
        this.namenAn = e.target.checked;
        try { localStorage.setItem(this.KEY + '-namen', this.namenAn ? 'an' : 'aus'); } catch { /* egal */ }
        this.malen();
      });
      inhalt.querySelector('#sb-metro').addEventListener('change', e => { this.metroAn = e.target.checked; });
    } else {
      inhalt.innerHTML = '<div class="sb-speicher" id="sb-speicher"></div>';
      this.speicherZeichnen();
    }
    b.hidden = false;
  },
  blattZu() { this.el.querySelector('#sb-blatt').hidden = true; this.blattArt = null; },

  /* Kurze Meldung über dem Raster */
  toast(text, fehler = false) {
    const t = this.el.querySelector('#sb-toast');
    if (!t) return;
    t.textContent = text;
    t.classList.toggle('fehler', fehler);
    t.hidden = false;
    clearTimeout(this.toastUhr);
    this.toastUhr = setTimeout(() => { t.hidden = true; }, 3500);
  },

  /* ---------- Raster auf einer Zeichenfläche ----------
     Es passen so viele Takte nebeneinander, dass die Kästchen gut zu treffen sind
     (beim iPad quer meist vier); der Rest liegt rechts daneben und wird mit dem
     Schieber unten erreicht. Die Höhe teilen sich alle Tonzeilen gleichmäßig,
     darunter die drei Schlagzeug-Zeilen. */
  mass() {
    const W = this.buehne.clientWidth, H = this.buehne.clientHeight;
    const { teile, schlaege, takte } = this.song;
    const proTakt = teile * schlaege, S = this.schritte(), Z = this.zeilen();
    const namen = this.namenAn ? (W < 600 ? 34 : 48) : 0;
    const breite = W - namen;
    let n = Math.max(1, Math.min(takte, Math.floor(breite / (proTakt * 30))));
    while (n < takte && breite / (n * proTakt) > 64) n++;
    const spalte = breite / (n * proTakt);
    const trommel = Math.max(26, Math.min(54, H * 0.075));
    const luecke = 8;
    const tonH = Math.max(40, H - 3 * trommel - luecke);
    const maxX = Math.max(0, S * spalte - breite);
    this.x = Math.max(0, Math.min(maxX, this.x));
    this.m = { W, H, namen, breite, spalte, proTakt, S, Z, zeile: tonH / Z, tonH, trommel, luecke, maxX, sicht: n };
    return this.m;
  },

  farbe(z, hell) {
    const l = this.leiter().length, stufe = z % l;
    const ton = (this.song.grundton + this.leiter()[stufe]) % 12;
    // Jeder Ton (c, d, e …) hat immer dieselbe Farbe, egal in welcher Tonart
    const hue = (ton * 30 + 350) % 360;
    return `hsl(${hue} ${hell ? 72 : 78}% ${hell ? 52 : 62}%)`;
  },

  malen() {
    if (!this.canvas?.isConnected) return;
    const m = this.mass();
    const c = this.canvas, dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(m.W * dpr) || c.height !== Math.round(m.H * dpr)) {
      c.width = Math.round(m.W * dpr);
      c.height = Math.round(m.H * dpr);
    }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(this.app);
    const v = n => css.getPropertyValue(n).trim();
    const hell = document.documentElement.dataset.theme === 'light';
    const F = { feld: v('--sb-feld'), feld2: v('--sb-feld2'), linie: v('--sb-linie'), schlag: v('--sb-schlag'),
      takt: v('--sb-takt'), oktave: v('--sb-oktave'), punkt: v('--sb-punkt'), akzent: v('--accent'), text: v('--muted'), lauf: v('--sb-lauf') };
    const { namen, spalte, proTakt, S, Z, zeile, tonH, trommel, luecke } = m;
    const teile = this.song.teile;
    const y0 = tonH + luecke;
    g.clearRect(0, 0, m.W, m.H);

    const von = Math.max(0, Math.floor(this.x / spalte)), bis = Math.min(S, Math.ceil((this.x + m.breite) / spalte));
    const sx = s => namen + s * spalte - this.x;
    g.save();
    g.beginPath();
    g.rect(namen, 0, m.breite, m.H);
    g.clip();
    // Hintergrund: jeder zweite Takt leicht getönt
    for (let s = von; s < bis; s++) {
      g.fillStyle = Math.floor(s / proTakt) % 2 ? F.feld2 : F.feld;
      g.fillRect(sx(s), 0, spalte + 0.5, tonH);
      g.fillRect(sx(s), y0, spalte + 0.5, 3 * trommel);
    }
    // Laufender Schritt
    if (this.laeuft && this.aktuell !== null) {
      g.fillStyle = F.lauf;
      g.fillRect(sx(this.aktuell), 0, spalte, m.H);
    }
    // Waagrechte Linien, über jedem Grundton (Oktave) kräftiger
    for (let r = 1; r < Z; r++) {
      const z = Z - r;               // Zeile darunter ist z - 1 … die Linie liegt über Zeile z-1
      const y = Math.round(r * zeile) + 0.5;
      g.strokeStyle = (z - 1) % this.leiter().length === this.leiter().length - 1 ? F.oktave : F.linie;
      g.lineWidth = (z - 1) % this.leiter().length === this.leiter().length - 1 ? 2 : 1;
      g.beginPath(); g.moveTo(namen, y); g.lineTo(m.W, y); g.stroke();
    }
    // Senkrechte Linien: Teil dünn, Schlag mittel, Takt kräftig
    for (let s = von; s <= bis; s++) {
      const x = Math.round(sx(s)) + 0.5;
      const takt = s % proTakt === 0, schlag = s % teile === 0;
      g.strokeStyle = takt ? F.takt : schlag ? F.schlag : F.linie;
      g.lineWidth = takt ? 2 : 1;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, tonH); g.moveTo(x, y0); g.lineTo(x, y0 + 3 * trommel); g.stroke();
    }
    // Töne
    for (const k of this.noten) {
      const [s, z] = k.split(':').map(Number);
      if (s < von || s >= bis) continue;
      const klingt = this.laeuft && s === this.aktuell;
      const y = (Z - 1 - z) * zeile;
      g.fillStyle = this.farbe(z, hell);
      const e = klingt ? -1.5 : 0.5;
      g.fillRect(sx(s) + e, y + e, spalte - 2 * e, zeile - 2 * e);
      if (klingt) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(sx(s) + e, y + e, spalte - 2 * e, zeile - 2 * e); }
    }
    // Schlagzeug: leer ein Punkt (auf dem Schlag größer), gesetzt eine Form
    for (let d = 0; d < 3; d++) {
      const cy = y0 + (d + 0.5) * trommel;
      for (let s = von; s < bis; s++) {
        const cx = sx(s) + spalte / 2;
        const an = this.drums.has(`${s}:${d}`);
        if (!an) {
          g.fillStyle = F.punkt;
          g.beginPath(); g.arc(cx, cy, s % teile === 0 ? 3.2 : 2, 0, 7); g.fill();
          continue;
        }
        const r = Math.min(spalte, trommel) * (this.laeuft && s === this.aktuell ? 0.42 : 0.34);
        g.fillStyle = F.akzent;
        g.beginPath();
        if (d === 0) { g.moveTo(cx, cy - r); g.lineTo(cx + r * 1.05, cy + r * 0.8); g.lineTo(cx - r * 1.05, cy + r * 0.8); g.closePath(); }
        else if (d === 1) { g.moveTo(cx, cy - r * 1.1); g.lineTo(cx + r * 1.1, cy); g.lineTo(cx, cy + r * 1.1); g.lineTo(cx - r * 1.1, cy); g.closePath(); }
        else g.arc(cx, cy, r, 0, 7);
        g.fill();
      }
    }
    g.restore();
    // Trennlinie zwischen Tönen und Schlagzeug
    g.fillStyle = F.takt;
    g.fillRect(namen, tonH + luecke / 2 - 1, m.breite, 2);
    // Notennamen am Rand
    if (namen) {
      g.fillStyle = F.feld;
      g.fillRect(0, 0, namen, m.H);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const gr = Math.min(16, Math.max(10, zeile * 0.58));
      for (let z = 0; z < Z; z++) {
        const grund = z % this.leiter().length === 0;
        g.font = `${grund ? 800 : 600} ${gr}px system-ui, sans-serif`;
        g.fillStyle = grund ? F.akzent : F.text;
        g.fillText(this.zeilenName(z), namen / 2, (Z - 1 - z + 0.5) * zeile);
      }
      g.font = `700 ${Math.min(11, gr)}px system-ui, sans-serif`;
      g.fillStyle = F.text;
      this.KITS[this.song.kit].kurz.forEach((k, d) => g.fillText(k, namen / 2, y0 + (d + 0.5) * trommel));
    }
    this.schieberZeigen();
  },

  neuMalen() {
    if (this.malt) return;
    this.malt = requestAnimationFrame(() => { this.malt = null; this.malen(); });
  },

  /* Welches Kästchen liegt unter dem Finger? */
  zelleBei(e) {
    const m = this.m, r = this.canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    if (px < m.namen || px >= m.W || py < 0 || py >= m.H) return null;
    const s = Math.floor((px - m.namen + this.x) / m.spalte);
    if (s < 0 || s >= m.S) return null;
    if (py < m.tonH) return { art: 'ton', s, z: m.Z - 1 - Math.min(m.Z - 1, Math.floor(py / m.zeile)) };
    if (py < m.tonH + m.luecke) return null;
    return { art: 'drum', s, z: Math.min(2, Math.floor((py - m.tonH - m.luecke) / m.trommel)) };
  },

  zelleSetzen(k, an, still = false) {
    const set = k.art === 'drum' ? this.drums : this.noten;
    const schl = `${k.s}:${k.z}`;
    if (set.has(schl) === an) return false;
    if (an) set.add(schl); else set.delete(schl);
    if (an && !this.laeuft && !still) {
      // Zum Hören kurz anspielen
      if (k.art === 'drum') Drums.spielen(this.spurKlang(k.z), undefined, 0.8);
      else { const aus = Ton.anschlag(this.midi(k.z), this.song.klang); setTimeout(aus, 250); }
    }
    this.neuMalen();
    return true;
  },

  /* Antippen schaltet um; Finger draufhalten und ziehen malt weiter (setzt oder
     löscht wie beim ersten Kästchen) – bei Tönen oder beim Schlagzeug, wo man begann.
     Nur ein Finger zählt; Zoomen und Scrollen gibt es auf dem Raster nicht. */
  malenEinrichten() {
    const c = this.canvas;
    let modus = null, art = null, geaendert = false, zeiger = null, letzte = null;
    c.addEventListener('pointerdown', e => {
      if (zeiger !== null) return;
      const k = this.zelleBei(e);
      if (!k) return;
      e.preventDefault();
      Ton.audio();
      zeiger = e.pointerId;
      try { c.setPointerCapture(e.pointerId); } catch { /* egal */ }
      art = k.art;
      letzte = k;
      modus = !(art === 'drum' ? this.drums : this.noten).has(`${k.s}:${k.z}`);
      this.vorher();
      geaendert = this.zelleSetzen(k, modus);
    });
    // Schnelles Ziehen springt über Kästchen – die dazwischen werden mitgemalt
    c.addEventListener('pointermove', e => {
      if (e.pointerId !== zeiger) return;
      const k = this.zelleBei(e);
      if (!k || k.art !== art) return;
      const n = Math.max(Math.abs(k.s - letzte.s), Math.abs(k.z - letzte.z));
      for (let i = 1; i <= n; i++) {
        const z = { art, s: Math.round(letzte.s + (k.s - letzte.s) * i / n), z: Math.round(letzte.z + (k.z - letzte.z) * i / n) };
        if (this.zelleSetzen(z, modus, i < n)) geaendert = true;
      }
      letzte = k;
    });
    const ende = e => {
      if (e.pointerId !== zeiger) return;
      zeiger = null;
      if (geaendert) this.sichern(); else this.verlauf.pop();
      this.el.querySelector('#sb-zurueck').disabled = !this.verlauf.length;
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => c.addEventListener(n, ende));
    c.addEventListener('contextmenu', e => e.preventDefault());
    // Am Rechner: mit dem Trackpad oder Mausrad seitlich blättern
    c.addEventListener('wheel', e => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!this.m.maxX) return;
      e.preventDefault();
      this.schieben(this.x + d);
    }, { passive: false });
  },

  /* ---------- Schieber unter dem Raster ---------- */
  schieben(x) {
    this.x = Math.max(0, Math.min(this.m.maxX, x));
    this.neuMalen();
  },

  schieberZeigen() {
    const sch = this.el.querySelector('#sb-schieber'), d = this.el.querySelector('#sb-daumen');
    const m = this.m, B = sch.clientWidth;
    const gesamt = m.S * m.spalte;
    const w = m.maxX ? Math.max(48, B * m.breite / gesamt) : B;
    d.style.width = `${w}px`;
    d.style.transform = `translateX(${m.maxX ? (B - w) * this.x / m.maxX : 0}px)`;
    sch.classList.toggle('voll', !m.maxX);
  },

  schieberEinrichten() {
    const sch = this.el.querySelector('#sb-schieber'), d = this.el.querySelector('#sb-daumen');
    let start = null;
    sch.addEventListener('pointerdown', e => {
      if (!this.m.maxX) return;
      e.preventDefault();
      try { sch.setPointerCapture(e.pointerId); } catch { /* egal */ }
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right) {
        // Neben den Daumen getippt: dorthin springen (Mitte des Daumens unter den Finger)
        const B = sch.clientWidth, w = r.width, links = sch.getBoundingClientRect().left;
        this.schieben((e.clientX - links - w / 2) / (B - w) * this.m.maxX);
      }
      start = { x: e.clientX, wert: this.x };
    });
    sch.addEventListener('pointermove', e => {
      if (!start) return;
      const B = sch.clientWidth, w = d.offsetWidth;
      this.schieben(start.wert + (e.clientX - start.x) / Math.max(1, B - w) * this.m.maxX);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => sch.addEventListener(n, () => { start = null; }));
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
    k.innerHTML = Icons.raw('stop');
    k.setAttribute('aria-label', 'Anhalten');
    k.classList.add('laeuft');
  },

  stoppen() {
    this.laeuft = false;
    this.uhr.stoppen();
    this.aktuell = null;
    const k = this.el.querySelector('#sb-play');
    if (!k) return;
    k.innerHTML = Icons.raw('play');
    k.setAttribute('aria-label', 'Abspielen');
    k.classList.remove('laeuft');
    this.malen();
  },

  schritt(i, zeit) {
    const dauer = 60 / this.song.bpm / this.song.teile;
    for (let z = 0; z < this.zeilen(); z++) {
      if (!this.noten.has(`${i}:${z}`)) continue;
      const aus = Ton.anschlag(this.midi(z), this.song.klang, zeit);
      aus(zeit + dauer * 0.92);
    }
    for (let d = 0; d < 3; d++) {
      if (!this.drums.has(`${i}:${d}`)) continue;
      const k = this.spurKlang(d);
      // Becken auf dem Schlag etwas lauter als dazwischen
      Drums.spielen(k, zeit, Drums.FAMILIE[k] === 'becken' && i % this.song.teile ? 0.7 : 0.9);
    }
    if (this.metroAn && i % this.song.teile === 0) Metronom.klick(zeit, i % (this.song.teile * this.song.schlaege) === 0);
  },

  /* Der klingende Schritt leuchtet; läuft er aus dem Bild, blättert das Raster weiter */
  laufmarke(i) {
    this.aktuell = i;
    const m = this.m;
    const x = i * m.spalte;
    if (x < this.x - 1 || x + m.spalte > this.x + m.breite + 1) {
      const seite = m.sicht * m.proTakt * m.spalte;
      this.x = Math.min(m.maxX, Math.floor(x / seite) * seite);
    }
    this.neuMalen();
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
    const p = this.el.querySelector('#sb-panel');
    if (!p) return;
    p.innerHTML = `
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
    if (!ort) return;
    if (!Konto.verfuegbar()) { ort.innerHTML = '<p class="hint">Speichern geht hier nicht – dieser Browser merkt sich deinen Song aber.</p>'; return; }
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
    ort.querySelector('#sb-oeffnen-form').addEventListener('submit', e => {
      e.preventDefault();
      const n = ort.querySelector('#sb-nr').value.replace(/\D/g, '');
      if (!/^\d{5}$/.test(n)) { this.meldung('Die Nummer hat fünf Ziffern.', true); return; }
      this.oeffnen(n);
    });
    ort.querySelectorAll('[data-nr]').forEach(b => b.addEventListener('click', () => this.oeffnen(b.dataset.nr)));
  },

  /* Meldung im offenen Speichern-Blatt, sonst kurz über dem Raster */
  meldung(text, fehler = false) {
    const m = this.el.querySelector('.sb-meldung');
    if (m) { m.innerHTML = text; m.classList.toggle('fehler', fehler); }
    else this.toast(text.replace(/<[^>]+>/g, ''), fehler);
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
      this.knoepfeZeigen();
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
      this.x = 0;
      this.sichern();
      this.blattZu();
      this.alles();
      this.toast(this.eigener ? `Dein Song ${n} ist offen.`
        : `Song ${n} ist offen. Wenn du etwas änderst, speichere ihn als deinen eigenen Song.`);
      if (location.hash !== '#/songbaukasten') history.replaceState(null, '', '#/songbaukasten');
    } catch (e) {
      if (e.status === 401) { Konto.abmelden(); App.abgemeldet(e.message); return; }
      this.meldung(esc(e.message || 'Öffnen hat nicht geklappt – ist das Internet da?'), true);
    }
  },
};
