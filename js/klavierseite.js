/* Klavier zum freien Spielen (#/klavier).

   Die Tastengröße bestimmt, wie viele Tasten zu sehen sind: „klein“ zeigt zwei
   Oktaven von c bis c'', „mittel“ und „groß“ breitere Tasten wie in Musik-Apps
   auf dem Tablet. Die Pfeile – am Rechner auch ← und → – verschieben die Lage
   oktavweise über die 88 Tasten eines echten Klaviers, von A₂ bis c'''''; die
   Leiste daneben zeigt, wo man gerade ist, und lässt sich antippen. Mehrere
   Finger zugleich und Gleiten über die Tasten gehen; ein Ton klingt, solange
   seine Taste gedrückt ist (Ton.anschlag, Klänge in Ton.KLAENGE). Lage, Größe,
   Klang, Notennamen und das Tempo des Metronoms (js/metronom.js, Taste M) merkt
   sich der Browser. */
const Klavierseite = {
  TIEFSTE: 21,          // A₂, die tiefste Taste
  HOECHSTE: 108,        // c''''', die höchste
  SCHWARZ: [1, 3, 6, 8, 10],
  NAMEN: ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'ais', 'h'],
  B_NAMEN: { 1: 'des', 3: 'es', 6: 'ges', 8: 'as', 10: 'b' },
  /* Breite einer weißen Taste in Pixeln; klein = zwei Oktaven, so breit es eben geht */
  GROESSEN: { klein: 0, mittel: 95, gross: 130 },
  GROESSEN_TEXT: { klein: 'klein', mittel: 'mittel', gross: 'groß' },

  von: 60,              // tiefste sichtbare Taste
  n: 12,                // sichtbare weiße Tasten
  groesse: 'mittel',
  klang: 'klavier',
  namen: true,
  finger: new Map(),    // Zeiger → { m, aus } – null, wenn der Finger neben den Tasten liegt
  gedrueckt: new Map(), // Taste → wie viele Finger gerade darauf liegen

  weiss(m) { return !this.SCHWARZ.includes(m % 12); },

  /* Deutscher Name mit Oktavlage: A₂ B₂ H₂ · C₁ … H₁ · C … H · c … h · c' … h' · c'' … */
  name(m) {
    const o = Math.floor(m / 12) - 1;             // Oktave wie bei MIDI, c' = 4
    const n = this.NAMEN[m % 12];
    if (o >= 3) return n + "'".repeat(o - 3);
    return n.toUpperCase() + ['₂', '₁', ''][o];
  },

  /* Schwarze Taste: beide Namen ohne Oktavstriche, in den tiefen Oktaven groß (Cis, Des) */
  namenSchwarz(m) {
    const gross = Math.floor(m / 12) - 1 <= 2;
    return [this.NAMEN[m % 12], this.B_NAMEN[m % 12]].map(n => (gross ? n[0].toUpperCase() + n.slice(1) : n));
  },

  alleWeissen() {
    const liste = [];
    for (let m = this.TIEFSTE; m <= this.HOECHSTE; m++) if (this.weiss(m)) liste.push(m);
    return liste;
  },

  /* Wie viele weiße Tasten zu sehen sind – nie schmaler als 42 Pixel, nie mehr als zwei Oktaven */
  anzahl() {
    const breite = this.tastenEl.clientWidth;
    const ziel = this.GROESSEN[this.groesse];
    const n = ziel ? Math.round(breite / ziel) : 15;
    return Math.max(5, Math.min(n, 15, Math.floor(breite / 42)));
  },

  /* Mögliche tiefste Tasten: A₂, jedes C und zuletzt die Lage, die genau mit c''''' endet */
  anfaenge() {
    const alle = this.alleWeissen();
    const liste = [21, 24, 36, 48, 60, 72, 84, 96].filter(s => alle.indexOf(s) + this.n <= alle.length);
    const oben = alle[alle.length - this.n];
    if (oben > liste[liste.length - 1]) liste.push(oben);
    return liste;
  },

  /* Die nächste mögliche Lage zu einer gewünschten tiefsten Taste */
  gueltig(s) {
    return this.anfaenge().reduce((best, a) => (Math.abs(a - s) < Math.abs(best - s) ? a : best));
  },

  /* Zwei Oktaven beginnen bei c (c bis c''), weniger Tasten bei c' */
  standard() { return this.n >= 15 ? 48 : 60; },

  weisse(von = this.von) {
    const alle = this.alleWeissen();
    const i = alle.indexOf(von);
    return alle.slice(i, i + this.n);
  },

  merken(schluessel, wert) {
    try { localStorage.setItem(`musiktrainer-klavier-${schluessel}`, String(wert)); } catch { /* privates Fenster */ }
  },

  zeigen(el) {
    this.el = el;
    let gemerkt = null;
    try {
      const lies = s => localStorage.getItem(`musiktrainer-klavier-${s}`);
      this.namen = lies('namen') !== 'aus';
      if (lies('groesse') in this.GROESSEN) this.groesse = lies('groesse');
      if (lies('klang') in Ton.KLAENGE) this.klang = lies('klang');
      gemerkt = Number(lies('von')) || null;
      localStorage.removeItem('musiktrainer-klavier-lage');    // Lage bis 02.11.2026, galt für zwei Oktaven
    } catch { /* privates Fenster */ }
    el.innerHTML = `
      <a class="zurueck" href="#/">${Icons.raw('back')}Alle Spiele</a>
      <section class="card klavier-seite">
        <div class="klavier-kopf">
          <h2>${Icons.raw('piano')}Klavier</h2>
          <div class="klavier-einstellungen">
            ${Vollbild.knopf()}
            <label class="klavier-klang">Klang
              <select id="k-klang">${Object.entries(Ton.KLAENGE).map(([id, name]) =>
                `<option value="${id}"${id === this.klang ? ' selected' : ''}>${name}</option>`).join('')}</select>
            </label>
            <div class="klavier-groesse" role="group" aria-label="Tastengröße">
              <span>Tasten</span>
              ${Object.keys(this.GROESSEN).map(g => `<button type="button" data-groesse="${g}">${this.GROESSEN_TEXT[g]}</button>`).join('')}
            </div>
            <label class="schalter"><input type="checkbox" role="switch" id="k-namen" ${this.namen ? 'checked' : ''}><span class="schalter-bahn"></span>Notennamen</label>
          </div>
        </div>
        <div class="klavier-navi">
          <div class="klavier-lage">
            <button type="button" data-schritt="-1" aria-label="Eine Oktave tiefer" title="Eine Oktave tiefer (←)">${Icons.raw('back')}</button>
            <span class="klavier-lage-text" aria-live="polite"></span>
            <button type="button" data-schritt="1" aria-label="Eine Oktave höher" title="Eine Oktave höher (→)">${Icons.raw('next')}</button>
          </div>
          <div class="uebersicht" title="Die 88 Tasten eines Klaviers – antippen, um dorthin zu springen"></div>
        </div>
        <div class="klavier-metro"></div>
        <div class="klaviatur${this.namen ? '' : ' ohne-namen'}" role="group" aria-label="Klaviertasten"></div>
      </section>`;
    this.tastenEl = el.querySelector('.klaviatur');
    Vollbild.binden(el.querySelector('.klavier-seite'));
    // Metronom zum Üben im Takt, Tempo merkt sich der Browser
    let bpm = 80;
    try { bpm = Number(localStorage.getItem('musiktrainer-klavier-bpm')) || 80; } catch { /* privates Fenster */ }
    this.metronom = new Metronomuhr(el.querySelector('.klavier-metro'), {
      bpm: Math.max(50, Math.min(200, bpm)),
      merken: b => this.merken('bpm', b),
    });
    this.uebersichtEl = el.querySelector('.uebersicht');
    this.finger.clear();
    this.gedrueckt.clear();
    this.n = this.anzahl();
    this.von = this.gueltig(gemerkt ?? this.standard());
    this.uebersichtZeichnen();
    this.zeichnen();

    el.querySelectorAll('[data-schritt]').forEach(b => b.addEventListener('click', () => {
      Ton.audio();
      this.schieben(Number(b.dataset.schritt));
    }));
    el.querySelectorAll('[data-groesse]').forEach(b => b.addEventListener('click', () => {
      Ton.audio();
      this.groesse = b.dataset.groesse;
      this.merken('groesse', this.groesse);
      this.anpassen();
    }));
    el.querySelector('#k-klang').addEventListener('change', e => {
      this.klang = e.target.value;
      this.merken('klang', this.klang);
      setTimeout(Ton.anschlag(60, this.klang), 450);      // zum Hören einmal c'
    });
    el.querySelector('#k-namen').addEventListener('change', e => {
      Ton.audio();
      this.namen = e.target.checked;
      this.tastenEl.classList.toggle('ohne-namen', !this.namen);
      this.merken('namen', this.namen ? 'an' : 'aus');
    });
    this.tastenBedienen();
    this.uebersichtBedienen();

    const pfeile = e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.target.closest?.('select')) return;
      e.preventDefault();
      this.schieben(e.key === 'ArrowLeft' ? -1 : 1);
    };
    // Gerät gedreht oder Fenster schmaler: Tastenzahl anpassen, Schrift mitwachsen lassen
    const groesse = () => {
      if (this.anzahl() !== this.n) this.anpassen();
      else this.tastenEl.style.setProperty('--taste', `${this.tastenEl.clientWidth / this.n}px`);
    };
    const weg = () => this.allesLoslassen();
    document.addEventListener('keydown', pfeile);
    window.addEventListener('resize', groesse);
    window.addEventListener('blur', weg);
    App.beimAufraeumen(() => {
      document.removeEventListener('keydown', pfeile);
      window.removeEventListener('resize', groesse);
      window.removeEventListener('blur', weg);
      this.allesLoslassen();
    });
  },

  /* Nach anderer Tastengröße oder Drehen: Lage behalten – stand sie auf der
     Standardlage, auf die Standardlage der neuen Größe */
  anpassen() {
    const warStandard = this.von === this.standard();
    this.n = this.anzahl();
    this.von = warStandard ? this.standard() : this.gueltig(this.von);
    this.zeichnen();
  },

  /* Tasten der Lage neu aufbauen; dazu Lage-Anzeige, Pfeile, Größenwahl und Rahmen in der Leiste */
  zeichnen() {
    this.allesLoslassen();
    const weisse = this.weisse();
    const b = 100 / weisse.length;
    let html = weisse.map((m, i) => `<button type="button" class="kt w" data-m="${m}" style="left:${i * b}%;width:${b}%" aria-label="${this.name(m)}">
      <span class="kt-name">${this.name(m)}</span></button>`).join('');
    weisse.forEach((m, i) => {
      if (i === weisse.length - 1 || this.weiss(m + 1)) return;
      const [kreuz, be] = this.namenSchwarz(m + 1);
      html += `<button type="button" class="kt s" data-m="${m + 1}" style="left:${(i + 0.7) * b}%;width:${b * 0.6}%" aria-label="${kreuz} oder ${be}">
        <span class="kt-name">${kreuz}<br>${be}</span></button>`;
    });
    this.tastenEl.innerHTML = html;
    this.tastenEl.style.setProperty('--taste', `${this.tastenEl.clientWidth / weisse.length}px`);
    this.merken('von', this.von);

    this.el.querySelector('.klavier-lage-text').textContent = `${this.name(weisse[0])} – ${this.name(weisse[weisse.length - 1])}`;
    const a = this.anfaenge();
    this.el.querySelector('[data-schritt="-1"]').disabled = this.von <= a[0];
    this.el.querySelector('[data-schritt="1"]').disabled = this.von >= a[a.length - 1];
    this.el.querySelectorAll('[data-groesse]').forEach(k => k.setAttribute('aria-pressed', String(k.dataset.groesse === this.groesse)));
    const alle = this.alleWeissen();
    const rahmen = this.uebersichtEl.querySelector('.ue-rahmen');
    rahmen.style.left = `${alle.indexOf(weisse[0]) / alle.length * 100}%`;
    rahmen.style.width = `${weisse.length / alle.length * 100}%`;
  },

  /* Die Leiste: alle 88 Tasten klein, die C beschriftet, die sichtbare Lage eingerahmt */
  uebersichtZeichnen() {
    const alle = this.alleWeissen();
    const b = 100 / alle.length;
    let html = alle.map((m, i) => `<span class="ue w" data-m="${m}" style="left:${i * b}%;width:${b}%"></span>`).join('');
    alle.forEach((m, i) => {
      if (i < alle.length - 1 && !this.weiss(m + 1)) html += `<span class="ue s" data-m="${m + 1}" style="left:${(i + 0.7) * b}%;width:${b * 0.6}%"></span>`;
    });
    html += alle.filter(m => m % 12 === 0).map(m => `<span class="ue-c" style="left:${(alle.indexOf(m) + 0.5) * b}%">${this.name(m)}</span>`).join('');
    this.uebersichtEl.innerHTML = `${html}<span class="ue-rahmen"></span>`;
  },

  lageSetzen(s) {
    if (s === this.von) return;
    this.von = s;
    this.zeichnen();
  },

  schieben(richtung) {
    const a = this.anfaenge();
    const i = a.indexOf(this.von) + richtung;
    if (i >= 0 && i < a.length) this.lageSetzen(a[i]);
  },

  /* Lage so wählen, dass die Taste m möglichst in der Mitte liegt */
  lageUm(m) {
    const mitte = s => { const w = this.weisse(s); return (w[0] + w[w.length - 1]) / 2; };
    this.lageSetzen(this.anfaenge().reduce((best, a) => (Math.abs(mitte(a) - m) < Math.abs(mitte(best) - m) ? a : best)));
  },

  /* Jeder Finger (Zeiger) für sich: drücken, über die Tasten gleiten, loslassen.
     Welche Taste unter dem Finger liegt, sagt elementFromPoint – so klingt beim
     Gleiten jede Taste an, über die der Finger fährt. */
  tastenBedienen() {
    const t = this.tastenEl;
    const unter = e => {
      const k = document.elementFromPoint(e.clientX, e.clientY)?.closest('.kt');
      return k && t.contains(k) ? Number(k.dataset.m) : null;
    };
    t.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { t.setPointerCapture(e.pointerId); } catch { /* egal */ }
      this.anschlagen(e.pointerId, unter(e));
    });
    t.addEventListener('pointermove', e => {
      if (!this.finger.has(e.pointerId)) return;
      const m = unter(e);
      if (m === (this.finger.get(e.pointerId)?.m ?? null)) return;
      this.loslassen(e.pointerId);
      this.anschlagen(e.pointerId, m);
    });
    // Ton.audio() beim Loslassen: Das iPad gibt den Ton erst bei einem Antippen frei
    const ende = e => { Ton.audio(); this.loslassen(e.pointerId); this.finger.delete(e.pointerId); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => t.addEventListener(n, ende));
    t.addEventListener('contextmenu', e => e.preventDefault());
    // Mit der Tastatur angewählte Taste (Eingabe oder Leertaste) klingt kurz an
    t.addEventListener('click', e => {
      const k = e.detail === 0 && e.target.closest('.kt');
      if (k) setTimeout(Ton.anschlag(Number(k.dataset.m), this.klang), 500);
    });
  },

  uebersichtBedienen() {
    const u = this.uebersichtEl;
    let zieht = false;
    const zu = e => {
      const r = u.getBoundingClientRect();
      const alle = this.alleWeissen();
      const i = Math.floor((e.clientX - r.left) / r.width * alle.length);
      this.lageUm(alle[Math.max(0, Math.min(alle.length - 1, i))]);
    };
    u.addEventListener('pointerdown', e => {
      e.preventDefault();
      zieht = true;
      try { u.setPointerCapture(e.pointerId); } catch { /* egal */ }
      zu(e);
    });
    u.addEventListener('pointermove', e => { if (zieht) zu(e); });
    ['pointerup', 'pointercancel'].forEach(n => u.addEventListener(n, () => { zieht = false; }));
  },

  anschlagen(id, m) {
    if (m === null) { this.finger.set(id, null); return; }
    this.finger.set(id, { m, aus: Ton.anschlag(m, this.klang) });
    this.markieren(m, 1);
  },

  loslassen(id) {
    const f = this.finger.get(id);
    if (!f) return;
    f.aus();
    this.markieren(f.m, -1);
    this.finger.set(id, null);
  },

  allesLoslassen() {
    [...this.finger.keys()].forEach(id => this.loslassen(id));
    this.finger.clear();
  },

  /* Gedrückte Tasten leuchten auf der Klaviatur und in der Leiste */
  markieren(m, d) {
    const n = (this.gedrueckt.get(m) || 0) + d;
    if (n > 0) this.gedrueckt.set(m, n); else this.gedrueckt.delete(m);
    this.el.querySelectorAll(`[data-m="${m}"]`).forEach(k => k.classList.toggle('an', n > 0));
  },
};
