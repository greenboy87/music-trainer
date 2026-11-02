/* Klavier zum freien Spielen (#/klavier).

   Sichtbar sind zwei Oktaven von c bis c'' (auf schmalen Bildschirmen eine).
   Die Pfeile – am Rechner auch ← und → – verschieben die Lage oktavweise über
   die 88 Tasten eines echten Klaviers, von A₂ bis c'''''. Die Leiste darüber
   zeigt, wo man gerade ist, und lässt sich antippen. Mehrere Finger zugleich
   und Gleiten über die Tasten gehen; ein Ton klingt, solange seine Taste
   gedrückt ist (Ton.anschlag). Lage und Notennamen merkt sich der Browser. */
const Klavierseite = {
  TIEFSTE: 21,          // A₂, die tiefste Taste
  HOECHSTE: 108,        // c''''', die höchste
  SCHWARZ: [1, 3, 6, 8, 10],
  NAMEN: ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'ais', 'h'],
  B_NAMEN: { 1: 'des', 3: 'es', 6: 'ges', 8: 'as', 10: 'b' },

  von: 48,              // tiefste sichtbare Taste
  okt: 2,               // sichtbare Oktaven
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

  /* Mögliche tiefste Tasten der Lage: A₂ und jedes C, solange die Lage nicht über c''''' hinausgeht */
  anfaenge() {
    const liste = [this.TIEFSTE];
    for (let c = 24; c + 12 * this.okt <= this.HOECHSTE; c += 12) liste.push(c);
    return liste;
  },

  /* Die nächste mögliche Lage zu einer gewünschten tiefsten Taste */
  gueltig(s) {
    return this.anfaenge().reduce((best, a) => (Math.abs(a - s) < Math.abs(best - s) ? a : best));
  },

  /* Die weißen Tasten der Lage: sieben je Oktave und eine dazu (c bis c'') */
  weisse(von = this.von) {
    const liste = [];
    for (let m = von; liste.length < 7 * this.okt + 1; m++) if (this.weiss(m)) liste.push(m);
    return liste;
  },

  alleWeissen() {
    const liste = [];
    for (let m = this.TIEFSTE; m <= this.HOECHSTE; m++) if (this.weiss(m)) liste.push(m);
    return liste;
  },

  /* Unter 600 Pixeln Breite wären 15 Tasten zu schmal für Finger */
  passendeOktaven() { return this.tastenEl.clientWidth < 600 ? 1 : 2; },

  zeigen(el) {
    this.el = el;
    let gemerkt = null;
    try {
      this.namen = localStorage.getItem('musiktrainer-klavier-namen') !== 'aus';
      gemerkt = Number(localStorage.getItem('musiktrainer-klavier-lage')) || null;
    } catch { /* privates Fenster */ }
    el.innerHTML = `
      <a class="zurueck" href="#/">${Icons.raw('back')}Alle Spiele</a>
      <section class="card klavier-seite">
        <div class="klavier-kopf">
          <h2>${Icons.raw('piano')}Klavier</h2>
          <div class="klavier-lage">
            <button type="button" data-schritt="-1" aria-label="Eine Oktave tiefer" title="Eine Oktave tiefer (←)">${Icons.raw('back')}</button>
            <span class="klavier-lage-text" aria-live="polite"></span>
            <button type="button" data-schritt="1" aria-label="Eine Oktave höher" title="Eine Oktave höher (→)">${Icons.raw('next')}</button>
          </div>
          <label class="schalter"><input type="checkbox" role="switch" id="k-namen" ${this.namen ? 'checked' : ''}><span class="schalter-bahn"></span>Notennamen</label>
        </div>
        <div class="uebersicht" title="Die 88 Tasten eines Klaviers – antippen, um dorthin zu springen"></div>
        <div class="klaviatur${this.namen ? '' : ' ohne-namen'}" role="group" aria-label="Klaviertasten"></div>
        <p class="hint klavier-tipp">Spiel mit mehreren Fingern gleichzeitig oder gleite über die Tasten. Die Pfeile – am Rechner
          auch ← und → – verschieben die Lage um eine Oktave; die Leiste oben zeigt, wo du auf den 88 Tasten eines Klaviers bist.</p>
        <p class="hint klavier-quer">Tipp: Halte das Gerät quer, dann werden die Tasten breiter.</p>
      </section>`;
    this.tastenEl = el.querySelector('.klaviatur');
    this.uebersichtEl = el.querySelector('.uebersicht');
    this.finger.clear();
    this.gedrueckt.clear();
    this.okt = this.passendeOktaven();
    this.von = this.gueltig(gemerkt ?? (this.okt === 2 ? 48 : 60));
    this.uebersichtZeichnen();
    this.zeichnen();

    el.querySelectorAll('[data-schritt]').forEach(b => b.addEventListener('click', () => {
      Ton.audio();
      this.schieben(+b.dataset.schritt);
    }));
    el.querySelector('#k-namen').addEventListener('change', e => {
      Ton.audio();
      this.namen = e.target.checked;
      this.tastenEl.classList.toggle('ohne-namen', !this.namen);
      try { localStorage.setItem('musiktrainer-klavier-namen', this.namen ? 'an' : 'aus'); } catch { /* egal */ }
    });
    this.tastenBedienen();
    this.uebersichtBedienen();

    const pfeile = e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      this.schieben(e.key === 'ArrowLeft' ? -1 : 1);
    };
    // Gerät gedreht: eine oder zwei Oktaven
    const groesse = () => {
      const okt = this.passendeOktaven();
      if (okt === this.okt) return;
      this.okt = okt;
      this.von = this.gueltig(this.von);
      this.zeichnen();
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

  /* Tasten der Lage neu aufbauen; dazu Lage-Anzeige, Pfeile und Rahmen in der Leiste */
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

    this.el.querySelector('.klavier-lage-text').textContent = `${this.name(weisse[0])} – ${this.name(weisse[weisse.length - 1])}`;
    const a = this.anfaenge();
    this.el.querySelector('[data-schritt="-1"]').disabled = this.von <= a[0];
    this.el.querySelector('[data-schritt="1"]').disabled = this.von >= a[a.length - 1];
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
    try { localStorage.setItem('musiktrainer-klavier-lage', String(s)); } catch { /* egal */ }
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
      if (k) setTimeout(Ton.anschlag(Number(k.dataset.m)), 500);
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
    this.finger.set(id, { m, aus: Ton.anschlag(m) });
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
