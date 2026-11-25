/* Klavier-Prüfung (#/klavierpruefung): das Intro von „In the End“ auf dem
   Keyboard. Die Zeile wird zweimal gespielt, beim zweiten Mal endet sie auf dem
   ersten Ton von Takt 4 und bleibt liegen.

   Urheberrecht: Die Noten stehen nicht hier im (öffentlichen) Code, sondern kommen
   vom Worker (GET /api/stueck/in-the-end, Variable STUECKE im Cloudflare-Dashboard)
   und nur für angemeldete Kinder. Format je Hand: Einträge „Schlag:Dauer:Stufe[+Stufe]:…“ (der vierte Teil
   wird nicht mehr gebraucht),
   Schlag und Dauer in Vierteln ab Beginn, Stufe wie in Notenbild (c' = 0, H = -8),
   vz = Vorzeichen der Tonart (-1 = ein ♭: jedes H ist ein B).

   Üben: rechte Hand, linke Hand oder beide. Drei Arten:
   – Üben (intern „mit“): Cursor läuft im Tempo, ein Takt wird eingezählt, am Ende wie viele
     Töne getroffen wurden.
   – Schritt für Schritt: Der Cursor läuft mit, bleibt aber an der nächsten Note
     stehen, bis die richtige(n) Taste(n) gedrückt sind.
   – Sterne sammeln: wie Üben, aber gewertet und nie mit leuchtenden Tasten
     (beim Üben per Schalter „Tasten leuchten“, anfangs aus).
   Wahlweise spielt die andere Hand mit. Gewertet wird nur „Sterne sammeln“: Sterne wie bei der
   Rhythmus-Prüfung (ab 95 % sechs), gespeichert als Spiel „klavier-pruefung“, Stufe 0 = rechte
   Hand, 1 = linke Hand, 2 = beide – damit im Konto und im School-Tool. */
const Klavierpruefung = {
  /* Lieder: In the End kommt geschützt vom Worker; Jingle Bells (James Lord Pierpont, 1857, gemeinfrei)
     steht offen hier im Code – Toms Fassung aus der Stunde „Mein erster Song“ (Klasse 6): Melodie mit
     den Tasten 1–5 (c¹–g¹), Begleitakkorde wie auf dem Arbeitsblatt (C, A7, Dm, G7, D7) in der linken Hand,
     die auf Wunsch der Computer spielt. Ohne Wiederholung: 16 Takte, je Zeile 4, die Zeile blättert mit. */
  LIEDER: {
    'in-the-end': {
      server: true, untertitel: 'Intro', wiederholung: true, fermate: 12, bpm: 60, bpmMax: 120,
      VON: 43, BIS: 71, GROSS: [45, 69], groesseText: 'A bis a¹', andereText: 'Andere Hand spielt mit',
      NUMMER: { lh: { 45: '1', 46: '2', 47: '–', 48: '3', 50: '4', 52: '5', 53: '6' },
                rh: { 62: '1', 64: '2', 65: '3', 67: '4', 69: '5' } },
      SPIEL: 'klavier-pruefung', HAENDE: ['rh', 'lh', 'beide'],
    },
    'jingle-bells': {
      untertitel: 'Mein erster Song', wiederholung: false, bpm: 90, bpmMax: 160,
      VON: 55, BIS: 76, GROSS: [57, 74], groesseText: 'a bis d²', andereText: 'Begleitung spielt mit',
      NUMMER: { lh: {}, rh: { 60: '1', 62: '2', 64: '3', 65: '4', 67: '5' } },
      SPIEL: 'klavier-jingle-bells', HAENDE: ['rh'], laufend: true,
      AKKORDE: { C: '-7+-5+-3', A7: '-9+-7#+-5+-3', Dm: '-6+-4+-2', G7: '-10+-8+-6+-4', D7: '-6+-4#+-2+0' },
      roh: {
        titel: 'Jingle Bells', von: 'James Lord Pierpont', vz: 0, takte: 16,
        rh: '0:1:2 1:1:2 2:2:2 4:1:2 5:1:2 6:2:2 8:1:2 9:1:4 10:1:0 11:1:1 12:2:2 ' +
            '16:1:3 17:1:3 18:1:3 19:1:3 20:1:3 21:1:2 22:1:2 23:1:2 24:1:2 25:1:1 26:1:1 27:1:2 28:2:1 30:2:4 ' +
            '32:1:2 33:1:2 34:2:2 36:1:2 37:1:2 38:2:2 40:1:2 41:1:4 42:1:0 43:1:1 44:2:2 ' +
            '48:1:3 49:1:3 50:1:3 51:1:3 52:1:3 53:1:2 54:1:2 55:1:2 56:1:4 57:1:4 58:1:3 59:1:1 60:2:0',
        // Linke Hand: die Begleitakkorde vom Arbeitsblatt (spielt der Computer), mit Namen
        // C = c e g · A7 = A cis e g · Dm = d f a · G7 = G h d f · D7 = d fis a c¹
        lh: '0:4:-7+-5+-3=C 4:4:-7+-5+-3=C 8:4:-7+-5+-3=C 12:2:-7+-5+-3=C 14:2:-9+-7#+-5+-3=A7 16:2:-6+-4+-2=Dm ' +
            '18:2:-10+-8+-6+-4=G7 20:4:-7+-5+-3=C 24:4:-6+-4#+-2+0=D7 28:4:-10+-8+-6+-4=G7 32:4:-7+-5+-3=C ' +
            '36:4:-7+-5+-3=C 40:4:-7+-5+-3=C 44:2:-7+-5+-3=C 46:2:-9+-7#+-5+-3=A7 48:2:-6+-4+-2=Dm ' +
            '50:2:-10+-8+-6+-4=G7 52:4:-7+-5+-3=C 56:4:-10+-8+-6+-4=G7 60:4:-7+-5+-3=C',
      },
    },
  },
  ID: 'in-the-end',
  stuecke: {},
  zeile: 0,
  VON: 43, BIS: 71,             // Tasten G bis h¹ (gespielt wird A bis a¹, je eine weiße Taste Rand)
  GROSS: [45, 69],              // „Größer“: nur A bis a¹, die Tasten werden breiter
  gross: false,
  SCHWARZ: [1, 3, 6, 8, 10],
  FARBE: { rh: '#e07b2e', lh: '#3d86d0' },
  /* Toms Tastennummern (Aufkleber am Keyboard, keine Fingersätze): links A=1, B=2, H=–,
     c=3 … f=6; rechts d¹=1 … a¹=5. Stehen unter bzw. über den Noten und auf den Tasten. */
  NUMMER: { lh: { 45: '1', 46: '2', 47: '–', 48: '3', 50: '4', 52: '5', 53: '6' },
            rh: { 62: '1', 64: '2', 65: '3', 67: '4', 69: '5' } },
  /* Zeichnung: je Zeile vier Takte im Klaviersystem */
  OBEN: 80, UNTEN_Y: 170,       // y der untersten Linie (Violin, Bass)
  X0: 92, TAKT: 214, RAND: 20, SCHLAG: 45,
  FENSTER: 0.18,                // Mitspielen: so viele Sekunden daneben zählt noch

  stueck: null,
  hand: 'rh', art: 'schritt', bpm: 60, andere: true, metro: true, namen: false, leuchten: false,
  HAENDE: ['rh', 'lh', 'beide'],
  SPIEL: 'klavier-pruefung',

  schluessel(s) { return `musiktrainer-kp-${this.ID === 'in-the-end' ? '' : `${this.ID}-`}${s}`; },
  lies(s) { try { return localStorage.getItem(this.schluessel(s)); } catch { return null; } },
  merken(s, w) { try { localStorage.setItem(this.schluessel(s), String(w)); } catch { /* privat */ } },

  async zeigen(el, id = 'in-the-end') {
    this.el = el;
    this.stopp();
    if (!this.LIEDER[id]) id = 'in-the-end';
    this.ID = id;
    this.L = this.LIEDER[id];
    Object.assign(this, { NUMMER: this.L.NUMMER, SPIEL: this.L.SPIEL, HAENDE: this.L.HAENDE });
    this.stueck = this.stuecke[id] || null;
    this.zeile = 0;
    this.hand = this.HAENDE[0];
    this.bpm = this.L.bpm;
    if (this.HAENDE.includes(this.lies('hand'))) this.hand = this.lies('hand');
    this.bereichSetzen();
    if (['schritt', 'mit', 'sterne'].includes(this.lies('art'))) this.art = this.lies('art');
    const b = Number(this.lies('bpm'));
    if (b >= 40 && b <= this.L.bpmMax) this.bpm = b;
    this.andere = this.lies('andere') !== 'aus';
    this.metro = this.lies('metro') !== 'aus';
    this.namen = this.lies('namen') === 'an';
    this.gross = this.lies('gross') === 'an';
    this.leuchten = this.lies('leuchten') === 'an';   // Notennamen auf den Tasten: standardmäßig aus
    const rahmen = inhalt => {
      el.innerHTML = `
        <a class="zurueck" href="#/">${Icons.raw('back')}Übersicht</a>
        <section class="card kp-seite">${inhalt}</section>`;
    };
    App.beimAufraeumen(() => { this.stopp(); this.zoomFrei(); });
    this.zoomSperren();
    if (!this.stueck && !this.L.server) this.stueck = this.stuecke[id] = this.lesen(this.L.roh);
    if (this.L.server && !Konto.angemeldet()) {
      return rahmen(`<h2>In the End</h2>
        <p class="hint">Die Noten gibt es nur für angemeldete Schülerinnen und Schüler – das Stück ist
          urheberrechtlich geschützt und darf nur im Unterricht genutzt werden.</p>
        <a class="knopf primary" href="#/anmelden">Anmelden</a>`);
    }
    if (!this.stueck) {
      rahmen('<h2>In the End</h2><p class="hint">Noten werden geladen …</p>');
      try { this.stueck = this.stuecke[id] = this.lesen((await Konto.api(`/api/stueck/${id}`)).stueck); }
      catch (e) {
        if (App.art !== 'klavierpruefung') return;
        return rahmen(`<h2>In the End</h2><p class="hint">${e.status === 404
          ? 'Die Noten sind noch nicht eingerichtet. Sag deiner Lehrkraft Bescheid.'
          : e.status === 401 ? 'Deine Anmeldung ist abgelaufen – bitte neu anmelden.'
          : 'Die Noten ließen sich nicht laden. Bist du online?'}</p>`);
      }
      if (App.art !== 'klavierpruefung') return;
    }
    rahmen('');
    this.aufbauen();
  },

  /* „0:1:1:1 …“ → [{ start, dauer, stufen, finger, midis, hand, i }] */
  lesen(roh) {
    const hand = (text, h) => text.trim().split(/\s+/).map(e => {
      const [start, dauer, stRoh, fi = ''] = e.split(':');
      const [st, akkord] = stRoh.split('=');
      const teile = st.split('+');
      const stufen = teile.map(t => parseInt(t, 10));
      const kreuz = teile.map(t => t.endsWith('#'));          // „-7#“ = cis: Kreuz nur an diesem Ton
      return { start: Number(start), dauer: Number(dauer), stufen, kreuz, finger: fi ? fi.split('+') : [],
        midis: stufen.map((s, k) => this.midi(s, roh.vz) + (kreuz[k] ? 1 : 0)), hand: h, akkord,
        // Klang der Begleitung: ganzer Akkord, wenn das Lied ihn kennt
        klang: akkord && this.L?.AKKORDE?.[akkord] ? this.L.AKKORDE[akkord].split('+').map(t => this.midi(parseInt(t, 10), roh.vz) + (t.endsWith('#') ? 1 : 0)) : null };
    });
    const noten = [...hand(roh.rh, 'rh'), ...hand(roh.lh, 'lh')].map((n, i) => ({ ...n, i }));
    /* Gezeichnet ist die Zeile nur einmal (mit Wiederholung): Noten des zweiten Durchgangs
       leuchten an der Note, die an derselben Stelle der Zeile steht */
    const zeile = 16;
    if (!this.L?.wiederholung) { noten.forEach(n => { n.bild = n.i; }); return { titel: roh.titel, von: roh.von, vz: roh.vz, takte: roh.takte, noten }; }
    noten.forEach(n => {
      const an = n.start % zeile;
      const vorbild = noten.find(v => v.hand === n.hand && v.start === an);
      n.bild = vorbild ? vorbild.i : n.i;
    });
    return { titel: roh.titel, von: roh.von, vz: roh.vz, takte: roh.takte, noten };
  },
  midi(stufe, vz) {
    const m = Stufe.midi(stufe);
    if (vz < 0 && ((stufe % 7) + 7) % 7 === 6) return m - 1;   // H → B
    return m;
  },
  ende() { return Math.max(...this.stueck.noten.map(n => n.start + n.dauer)); },
  meine() { return this.stueck.noten.filter(n => this.hand === 'beide' || n.hand === this.hand); },
  fremde() { return this.stueck.noten.filter(n => this.hand !== 'beide' && n.hand !== this.hand); },

  aufbauen() {
    const s = this.stueck;
    const knopf = (gruppe, wert, text, an) => `<button type="button" data-${gruppe}="${wert}" aria-pressed="${an}">${text}</button>`;
    this.el.querySelector('.kp-seite').innerHTML = `
      <div class="kp-kopf">
        <h2><a class="karte-zurueck" href="#/" title="Zur Startseite" aria-label="Zur Startseite">${Icons.raw('back')}</a>${s.titel} <span class="hint">${s.von} · ${this.L.untertitel}</span>
          <button type="button" class="kp-i" id="kp-i" aria-expanded="false" aria-controls="kp-hilfe" title="Erklärung" aria-label="Erklärung">i</button>
          <span class="kp-oben-rechts">${Vollbild.knopf()}</span></h2>
        <div class="kp-hilfe" id="kp-hilfe" hidden>
          ${this.L.wiederholung ? `<p>Spiel die Zeile <strong>zweimal</strong>. Beim zweiten Mal hörst du auf dem ersten Ton von Takt 4 auf
            (Fermate <span class="ns">\u{1D110}</span>) und lässt ihn liegen.</p>
          <p>Die Zahlen über und unter den Noten stehen auch auf den Tasten.</p>`
          : `<p>Die Melodie spielst du mit der <strong>rechten Hand</strong>. Die Zahlen über den Noten stehen auf den Tasten:
            c = 1, d = 2, e = 3, f = 4, g = 5 – wie auf dem Arbeitsblatt. 16 Takte.</p>
          <p>Die <strong>Begleitung</strong> (Akkorde C, A7, Dm, G7, D7) spielt auf Wunsch mit. Die Noten laufen mit –
            rechts siehst du schon, was als Nächstes kommt. Gut klingt es ab Tempo 140.</p>`}
          <ul>
            <li><strong>Schritt für Schritt:</strong> Der Cursor wartet an jeder Note, bis du die richtige Taste drückst – die leuchtende.</li>
            <li><strong>Üben:</strong> Ein Takt wird eingezählt, dann läuft der Cursor im Tempo. Gibt keine Sterne.
              Mit dem Schalter ${Icons.raw('tastenLicht')} leuchten die Tasten mit.</li>
            <li><strong>Sterne sammeln:</strong> Wie Üben, aber es zählt. Ab 95 % gibt es sechs Sterne.</li>
            <li><strong>Größer:</strong> Nur die mittleren Tasten, dafür breiter.</li>
          </ul>
        </div>
      </div>
      <div class="kp-leiste">
        <div class="klavier-groesse" role="group" aria-label="Hand"${this.HAENDE.length < 2 ? ' hidden' : ''}>
          ${this.HAENDE.map(h => knopf('hand', h, (this.L.HAND_TEXT || { rh: 'Rechte Hand', lh: 'Linke Hand', beide: 'Beide' })[h], this.hand === h)).join('')}
        </div>
        <div class="klavier-groesse" role="group" aria-label="Übeart">
          ${knopf('art', 'schritt', 'Schritt für Schritt', this.art === 'schritt')}${knopf('art', 'mit', 'Üben', this.art === 'mit')}${knopf('art', 'sterne', `${Icons.raw('star')}Sterne sammeln`, this.art === 'sterne')}
        </div>
        <span class="kp-tempo" role="group" aria-label="Tempo">Tempo
          <button type="button" class="kp-pm" data-bpm="-5" aria-label="Langsamer">−</button>
          <span id="kp-bpm-text" aria-live="polite">${this.bpm}</span>
          <button type="button" class="kp-pm" data-bpm="5" aria-label="Schneller">+</button></span>
      </div>
      <div class="kp-start">
        <button type="button" class="primary" id="kp-los">${Icons.raw('play')}Start</button>
        <span class="kp-ergebnis" id="kp-ergebnis" aria-live="polite"></span>
      </div>
      <div class="kp-noten">${this.svg()}<div class="pz-einzaehler" hidden aria-hidden="true"><span></span></div></div>
      <div class="kp-tasten-kopf"><span class="kp-schalter"><label class="schalter" id="kp-andere-feld"><input type="checkbox" role="switch" id="kp-andere" ${this.andere ? 'checked' : ''}><span class="schalter-bahn"></span>${this.L.andereText}</label><label class="schalter kp-licht" id="kp-leuchten-feld" title="Tasten leuchten mit"><input type="checkbox" role="switch" id="kp-leuchten" aria-label="Tasten leuchten mit" ${this.leuchten ? 'checked' : ''}><span class="schalter-bahn"></span>${Icons.raw('tastenLicht')}</label><label class="schalter kp-licht" title="Metronom"><input type="checkbox" role="switch" id="kp-metro" aria-label="Metronom" ${this.metro ? 'checked' : ''}><span class="schalter-bahn"></span>${Icons.raw('metronom')}</label><label class="schalter kp-licht" title="Notennamen auf den Tasten"><input type="checkbox" role="switch" id="kp-namen" aria-label="Notennamen auf den Tasten" ${this.namen ? 'checked' : ''}><span class="schalter-bahn"></span>${Icons.raw('tastenName')}</label></span><button type="button" class="small kp-gross" id="kp-gross" aria-pressed="${this.gross}" title="Tasten größer: nur die mittleren Tasten">${Icons.raw(this.gross ? 'lupeMinus' : 'lupePlus')}<span>${this.gross ? 'Kleiner' : 'Größer'}</span></button></div>
      <div class="klaviatur kp-tasten${this.namen ? '' : ' ohne-namen'}" role="group" aria-label="Klaviertasten"></div>`;
    // Wie das Klavier: festes Bild über dem ganzen Fenster, Tasten von Rand zu Rand
    Vollbild.binden(this.el.querySelector('.kp-seite'));
    this.tastenZeichnen();
    this.bedienen();
    this.leisteZeigen();
  },

  leisteZeigen() {
    const el = this.el;
    el.querySelectorAll('button[data-hand]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hand === this.hand)));
    el.querySelectorAll('[data-art]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.art === this.art)));
    el.querySelector('#kp-andere-feld').hidden = this.hand === 'beide';
    el.querySelector('#kp-leuchten-feld').hidden = this.art !== 'mit';
    el.querySelectorAll('.kp-n').forEach(g => g.classList.toggle('kp-aus', this.hand !== 'beide' && g.dataset.hand !== this.hand));
    this.zuruecksetzen();
    this.besteZeigen();
  },
  /* Beste Sterne je Hand an den Knöpfen */
  besteZeigen() {
    this.el.querySelectorAll('button[data-hand]').forEach(b => {
      const st = Fortschritt.bester(this.SPIEL, this.HAENDE.indexOf(b.dataset.hand)).sterne;
      let m = b.querySelector('.kp-best');
      if (!m) { m = document.createElement('span'); m.className = 'kp-best'; b.append(m); }
      m.innerHTML = st ? ` ${Icons.raw('star')}${st}` : '';
    });
  },
  sterneSumme(id = 'in-the-end') { const L = this.LIEDER[id]; return L.HAENDE.reduce((s, _, i) => s + Fortschritt.bester(L.SPIEL, i).sterne, 0); },
  sterneMax(id = 'in-the-end') { return this.LIEDER[id].HAENDE.length * 6; },

  /* Kein Zoomen (Zwei-Finger, Doppeltipp) und kein Markieren, solange die Seite offen ist –
     beim Spielen mit mehreren Fingern vergrößert Safari sonst versehentlich */
  zoomSperren() {
    if (this.sperre) return;
    const halt = e => e.preventDefault();
    const zwei = e => { if (e.touches && e.touches.length > 1) e.preventDefault(); };
    let letzter = 0;
    const doppel = e => { const t = Date.now(); if (t - letzter < 350 && !e.target.closest('input, textarea')) e.preventDefault(); letzter = t; };
    const meta = document.querySelector('meta[name="viewport"]');
    const vorher = meta?.content;
    if (meta) meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.documentElement.classList.add('kp-gesperrt');
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(n => document.addEventListener(n, halt, { passive: false }));
    document.addEventListener('touchmove', zwei, { passive: false });
    document.addEventListener('touchend', doppel, { passive: false });
    document.addEventListener('selectstart', halt);
    this.sperre = () => {
      if (meta && vorher) meta.content = vorher;
      document.documentElement.classList.remove('kp-gesperrt');
      ['gesturestart', 'gesturechange', 'gestureend'].forEach(n => document.removeEventListener(n, halt));
      document.removeEventListener('touchmove', zwei);
      document.removeEventListener('touchend', doppel);
      document.removeEventListener('selectstart', halt);
    };
  },
  zoomFrei() { this.sperre?.(); this.sperre = null; },

  /* ---------- Noten ---------- */
  taktX(t) { return this.X0 + t * this.TAKT; },
  /* x zur Zeit in Schlägen – beide Durchgänge laufen über dieselbe Zeile */
  x(zeit) {
    const laufend = !!this.L?.laufend;
    const z = laufend ? zeit : this.L?.wiederholung === false ? zeit - this.zeile * 16 : zeit >= 16 ? zeit - 16 : zeit;
    const t = Math.min(laufend ? (this.stueck?.takte || 16) - 1 : 3, Math.max(0, Math.floor(z / 4)));
    return this.taktX(t) + this.RAND + (z - t * 4) * this.SCHLAG;
  },
  y(stufe, hand) {
    return hand === 'rh' ? this.OBEN - (stufe - 2) * 5 : this.UNTEN_Y - (stufe + 10) * 5;
  },

  svg() {
    if (this.L.laufend) return this.svgLaufend();
    const breite = this.taktX(4) + 6;
    let s = Notenbild.klavierLinien(breite);
    // Vorzeichen der Tonart (ein ♭ auf h¹ bzw. H) und 4/4
    if (this.stueck.vz < 0) {
      s += `<text x="56" y="${this.y(6, 'rh') + 3}" class="ns ns-vz">♭</text>`;
      s += `<text x="56" y="${this.y(-8, 'lh') + 3}" class="ns ns-vz">♭</text>`;
    }
    [this.OBEN, this.UNTEN_Y].forEach(u => {
      s += `<text x="78" y="${u - 21}" class="nt kp-takt">4</text><text x="78" y="${u - 1}" class="nt kp-takt">4</text>`;
    });
    const oben = this.OBEN - 40;
    const letzte = !this.L.wiederholung && (this.zeile + 1) * 16 >= this.ende() - 0.01;
    if (!this.L.wiederholung) s += `<text x="${this.X0 + 4}" y="${this.OBEN - 58}" class="kp-taktnr">${this.zeile * 4 + 1}</text>`;
    for (let t = 1; t <= 4; t++) {
      const x = this.taktX(t) - 1;
      if (t < 4 || (!this.L.wiederholung && !letzte)) s += `<line x1="${x}" x2="${x}" y1="${oben}" y2="${this.UNTEN_Y}" class="nh"/>`;
      else if (letzte) s += `<line x1="${x - 7}" x2="${x - 7}" y1="${oben}" y2="${this.UNTEN_Y}" class="nh"/><rect x="${x - 4}" y="${oben}" width="4" height="${this.UNTEN_Y - oben}" class="nb"/>`;
      else {
        // Wiederholungszeichen: Punkte, dünner und dicker Strich
        s += `<line x1="${x - 7}" x2="${x - 7}" y1="${oben}" y2="${this.UNTEN_Y}" class="nh"/><rect x="${x - 4}" y="${oben}" width="4" height="${this.UNTEN_Y - oben}" class="nb"/>`;
        [this.OBEN, this.UNTEN_Y].forEach(u => { s += `<circle cx="${x - 13}" cy="${u - 25}" r="2.4" class="nb"/><circle cx="${x - 13}" cy="${u - 15}" r="2.4" class="nb"/>`; });
      }
    }
    const noten = this.L.wiederholung ? this.stueck.noten.filter(n => n.start < 16)
      : this.stueck.noten.filter(n => Math.floor(n.start / 16) === this.zeile);
    s += this.notenInhalt(noten, this.L.wiederholung ? null : this.zeile * 4, 4);
 // Ende beim 2. Mal: Pfeil über dem ersten Ton von Takt 4, liegen lassen
    const xe = this.x(this.L.fermate ?? 12);
    if (this.L.fermate !== undefined) s += `<g class="kp-endpfeil"><text x="${xe}" y="${this.OBEN - 66}" class="ns kp-fermate">\u{1D110}</text></g>`;
    s += `<rect class="kp-cursor" x="0" y="${oben - 14}" width="3" height="${this.UNTEN_Y - oben + 28}" rx="1.5" hidden/>`;
    return `<svg class="notenbild kp-system" viewBox="0 ${oben - 50} ${breite} ${this.UNTEN_Y - oben + 82}" role="img" aria-label="Noten">${s}</svg>`;
  },
  /* Noten, Pausen (nur ab != null: Takte ab … ab+anzahl-1) und Balken als SVG-Text */
  notenInhalt(noten, ab, anzahl) {
    let s = '';
    // Pausen der rechten Hand (Halbe, Ganze, Viertel) – Lücken in jedem Takt
    if (ab !== null) for (let t = 0; t < anzahl; t++) {
      const a = (ab + t) * 4;
      const frei = [0, 1, 2, 3].filter(b => !noten.some(n => n.hand === 'rh' && n.start <= a + b && n.start + n.dauer > a + b));
      for (let i = 0; i < frei.length;) {
        let j = i; while (j + 1 < frei.length && frei[j + 1] === frei[j] + 1) j++;
        let b = frei[i], laenge = j - i + 1;
        while (laenge > 0) {
          const d = laenge >= 4 && b === 0 ? 4 : laenge >= 2 && b % 2 === 0 ? 2 : 1;
          const xp = this.x(a + b);
          s += d === 4 ? `<rect x="${xp - 7}" y="${this.OBEN - 30}" width="14" height="5" class="nb"/>`
            : d === 2 ? `<rect x="${xp - 7}" y="${this.OBEN - 25}" width="14" height="5" class="nb"/>`
            : `<path transform="translate(${xp - 4} ${this.OBEN - 34})" class="np" d="M2 0 L9 8 L4 14 L10 22 C5 20 2 23 6 29 C-1 25 0 18 6 20 L0 13 L5 7 Z"/>`;
          b += d; laenge -= d;
        }
        i = j + 1;
      }
    }
    const achtel = noten.filter(n => n.dauer === 0.5 && n.hand === 'rh');
    for (const n of noten) {
      const x = this.x(n.start);
      let g = '';
      const hohl = n.dauer >= 2;
      n.stufen.forEach((st, k) => {
        const y = this.y(st, n.hand);
        g += this.hilfslinien(x, y, n.hand) + Notenbild.kopf(x, y, hohl);
        if (n.kreuz?.[k]) g += `<text x="${x - 20}" y="${y + 5}" class="ns ns-vz">♯</text>`;
        if (n.dauer < 4) {
          const hoch = n.hand === 'rh' ? st < 6 : st < -6;
          if (k === 0) g += hoch
            ? `<line x1="${x + 5.8}" x2="${x + 5.8}" y1="${y - 1}" y2="${y - 31}" class="nh"/>`
            : `<line x1="${x - 5.8}" x2="${x - 5.8}" y1="${y + 1}" y2="${y + 31}" class="nh"/>`;
        }
      });
      // Tastennummern: rechte Hand über dem oberen System, linke unter dem unteren (hoher Ton zuerst)
      const nr = [...n.midis].sort((a, b) => b - a).map(m => this.NUMMER[n.hand][m]).filter(Boolean);
      g += n.hand === 'rh'
        ? nr.map(z => `<text x="${x}" y="${this.OBEN - 50}" class="kp-finger">${z}</text>`).join('')
        : nr.map((z, k) => `<text x="${x}" y="${this.UNTEN_Y + 17 + k * 14}" class="kp-finger">${z}</text>`).join('');
      s += `<g class="kp-n" data-i="${n.i}" data-hand="${n.hand}" style="--hand:${this.FARBE[n.hand]}">${g}</g>`;
      // Akkordname zwischen den Systemen – immer gut sichtbar, auch wenn die linke Hand blass ist
      if (n.akkord) s += `<text x="${x}" y="${this.OBEN + 34}" class="kp-akkord" style="--hand:${this.FARBE.lh}">${n.akkord}</text>`;
    }
    // Achtelpaare mit Balken
    for (let k = 0; k + 1 < achtel.length; k += 2) {
      const [a, b] = [achtel[k], achtel[k + 1]];
      const xa = this.x(a.start) + 5.8, xb = this.x(b.start) + 5.8;
      const ya = this.y(a.stufen[0], 'rh') - 31, yb = this.y(b.stufen[0], 'rh') - 31;
      s += `<path d="M${xa - .8} ${ya} L${xb + .8} ${yb} L${xb + .8} ${yb + 5} L${xa - .8} ${ya + 5} Z" class="nb kp-balken" data-i="${a.i}"/>`;
    }
    return s;
  },

  /* Laufende Notenzeile: das ganze Lied als Streifen in einer Gruppe, die beim Spielen nach links gleitet
     (cursor → laufen). Schlüssel, Vorzeichen und Taktart bleiben fest; der Streifen ist links davon abgeschnitten. */
  svgLaufend() {
    const takte = this.stueck.takte || 16;
    const fenster = this.taktX(4) + 6;
    const ende = this.taktX(takte);
    const oben = this.OBEN - 40;
    let fest = Notenbild.klavierLinien(fenster);
    [this.OBEN, this.UNTEN_Y].forEach(u => {
      fest += `<text x="78" y="${u - 21}" class="nt kp-takt">4</text><text x="78" y="${u - 1}" class="nt kp-takt">4</text>`;
    });
    let s = '';
    for (let t = 0; t < takte; t++) {
      s += `<text x="${this.taktX(t) + 2}" y="${this.OBEN - 68}" class="kp-taktnr">${t + 1}</text>`;
      if (t > 0) s += `<line x1="${this.taktX(t) - 1}" x2="${this.taktX(t) - 1}" y1="${oben}" y2="${this.UNTEN_Y}" class="nh"/>`;
    }
    // Schlussstrich und die Linien bis dorthin (der feste Teil zeichnet sie nur über das Fenster)
    s += Notenbild.linien(fenster - 10, ende - 1, this.OBEN) + Notenbild.linien(fenster - 10, ende - 1, this.UNTEN_Y);
    s += `<line x1="${ende - 8}" x2="${ende - 8}" y1="${oben}" y2="${this.UNTEN_Y}" class="nh"/><rect x="${ende - 5}" y="${oben}" width="4" height="${this.UNTEN_Y - oben}" class="nb"/>`;
    s += this.notenInhalt(this.stueck.noten, 0, takte);
    s += `<rect class="kp-cursor" x="0" y="${oben - 14}" width="3" height="${this.UNTEN_Y - oben + 28}" rx="1.5" hidden/>`;
    const id = 'kp-clip';
    return `<svg class="notenbild kp-system kp-laufend" viewBox="0 ${oben - 50} ${fenster} ${this.UNTEN_Y - oben + 82}" role="img" aria-label="Noten">
      <defs><clipPath id="${id}"><rect x="${this.X0 - 2}" y="${oben - 80}" width="${fenster}" height="${this.UNTEN_Y - oben + 140}"/></clipPath></defs>
      ${fest}<g clip-path="url(#${id})"><g class="kp-lauf">${s}</g></g></svg>`;
  },

  hilfslinien(x, y, hand) {
    const unten = hand === 'rh' ? this.OBEN : this.UNTEN_Y;
    let s = '';
    for (let ly = unten + 10; ly <= y + 0.1; ly += 10) s += `<line x1="${x - 11}" x2="${x + 11}" y1="${ly}" y2="${ly}" class="nl"/>`;
    for (let ly = unten - 50; ly >= y - 0.1; ly -= 10) s += `<line x1="${x - 11}" x2="${x + 11}" y1="${ly}" y2="${ly}" class="nl"/>`;
    return s;
  },

  /* ---------- Tasten ---------- */
  weiss(m) { return !this.SCHWARZ.includes(m % 12); },
  tastenZeichnen() {
    const weisse = [];
    const [von, bis] = this.gross ? this.GROSS : [this.VON, this.BIS];
    for (let m = von; m <= bis; m++) if (this.weiss(m)) weisse.push(m);
    const b = 100 / weisse.length;
    let html = weisse.map((m, i) => `<button type="button" class="kt w" data-m="${m}" style="left:${i * b}%;width:${b}%" aria-label="${Klavierseite.name(m)}">
      <span class="kt-name">${Klavierseite.name(m)}</span></button>`).join('');
    // Schwarze Tasten etwas breiter als am echten Klavier (leichter zu treffen). Liegt am Rand
    // noch eine schwarze Taste (Größer: Gis links, Ais rechts), ist sie halb zu sehen – zur
    // Orientierung, die Klaviatur schneidet den Rest ab.
    const sb = 0.68;
    const schwarz = (m, rechts) => {
      const [kreuz, be] = Klavierseite.namenSchwarz(m);
      html += `<button type="button" class="kt s" data-m="${m}" style="left:${(rechts - sb / 2) * b}%;width:${b * sb}%" aria-label="${kreuz} oder ${be}">
        <span class="kt-name">${kreuz}<br>${be}</span></button>`;
    };
    if (!this.weiss(weisse[0] - 1)) schwarz(weisse[0] - 1, 0);
    weisse.forEach((m, i) => { if (!this.weiss(m + 1)) schwarz(m + 1, i + 1); });
    this.tastenEl = this.el.querySelector('.kp-tasten');
    this.tastenEl.innerHTML = html;
    for (const h of ['lh', 'rh']) for (const [m, z] of Object.entries(this.NUMMER[h])) {
      const k = this.taste(Number(m));
      if (k) k.insertAdjacentHTML('afterbegin', `<span class="kp-nr" style="--hand:${this.FARBE[h]}">${z}</span>`);
    }
    this.tastenEl.style.setProperty('--taste', `${this.tastenEl.clientWidth / weisse.length}px`);
  },
  taste(m) { return this.tastenEl.querySelector(`[data-m="${m}"]`); },

  bedienen() {
    const el = this.el;
    el.querySelectorAll('button[data-hand]').forEach(b => b.addEventListener('click', () => {
      this.hand = b.dataset.hand; this.merken('hand', this.hand); this.stopp(); this.bereichSetzen(); this.tastenZeichnen(); this.leisteZeigen();
    }));
    el.querySelectorAll('[data-art]').forEach(b => b.addEventListener('click', () => {
      this.art = b.dataset.art; this.merken('art', this.art); this.stopp(); this.leisteZeigen();
    }));
    el.querySelectorAll('[data-bpm]').forEach(b => b.addEventListener('click', () => {
      this.bpm = Math.min(this.L.bpmMax, Math.max(40, this.bpm + Number(b.dataset.bpm)));
      el.querySelector('#kp-bpm-text').textContent = this.bpm;
      this.merken('bpm', this.bpm);
      if (this.lauf) this.lauf.tempoNeu = true;
    }));
    const schalter = (id, feld) => el.querySelector(id).addEventListener('change', e => {
      this[feld] = e.target.checked; this.merken(feld, this[feld] ? 'an' : 'aus');
      if (feld === 'namen') this.tastenEl.classList.toggle('ohne-namen', !this.namen);
      if (feld === 'leuchten' && this.lauf) { this.zielSchluessel = null; this.zielZeigen(); }
    });
    schalter('#kp-andere', 'andere'); schalter('#kp-metro', 'metro'); schalter('#kp-namen', 'namen'); schalter('#kp-leuchten', 'leuchten');
    el.querySelector('#kp-gross').addEventListener('click', e => {
      this.gross = !this.gross; this.merken('gross', this.gross ? 'an' : 'aus');
      const b = e.currentTarget;
      b.setAttribute('aria-pressed', String(this.gross));
      b.innerHTML = `${Icons.raw(this.gross ? 'lupeMinus' : 'lupePlus')}<span>${this.gross ? 'Kleiner' : 'Größer'}</span>`;
      this.tastenZeichnen();
      this.zielSchluessel = null;
      if (this.lauf) this.zielZeigen();
    });
    // Erklärung hinter dem i: auf, zu, oder irgendwo anders hintippen
    const i = el.querySelector('#kp-i'), hilfe = el.querySelector('#kp-hilfe');
    const hilfeZeigen = an => { hilfe.hidden = !an; i.setAttribute('aria-expanded', String(an)); };
    i.addEventListener('click', e => { e.stopPropagation(); hilfeZeigen(hilfe.hidden); });
    el.querySelector('.kp-seite').addEventListener('pointerdown', e => {
      if (!hilfe.hidden && !hilfe.contains(e.target) && e.target !== i) hilfeZeigen(false);
    });
    el.querySelector('#kp-los').addEventListener('click', () => { Ton.audio(); this.lauf ? this.stopp() : this.starten(); });

    // Finger: drücken, gleiten, loslassen – wie am Klavier
    const t = this.tastenEl;
    this.finger = new Map();
    this.gedrueckt = new Map();
    // iPad: keine Textauswahl/Menü; liegt kein Finger mehr auf, ist auch keine Taste mehr gedrückt
    Vollbild.beruehrung(t, () => this.allesLos());
    const unter = e => {
      const k = document.elementFromPoint(e.clientX, e.clientY)?.closest('.kt');
      return k && t.contains(k) ? Number(k.dataset.m) : null;
    };
    t.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { t.setPointerCapture(e.pointerId); } catch { /* egal */ }
      this.drueck(e.pointerId, unter(e));
    });
    t.addEventListener('pointermove', e => {
      if (!this.finger.has(e.pointerId)) return;
      const m = unter(e);
      if (m === (this.finger.get(e.pointerId)?.m ?? null)) return;
      this.los(e.pointerId);
      this.drueck(e.pointerId, m);
    });
    const ende = e => { Ton.audio(); this.los(e.pointerId); this.finger.delete(e.pointerId); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => t.addEventListener(n, ende));
    t.addEventListener('contextmenu', e => e.preventDefault());
    const groesse = () => this.tastenEl?.style.setProperty('--taste', `${this.tastenEl.clientWidth / this.tastenEl.querySelectorAll('.kt.w').length}px`);
    window.addEventListener('resize', groesse);
    App.beimAufraeumen(() => window.removeEventListener('resize', groesse));
  },

  drueck(id, m) {
    if (m === null) { this.finger.set(id, null); return; }
    this.finger.set(id, { m, aus: Ton.anschlag(m, 'klavier') });
    this.gedrueckt.set(m, (this.gedrueckt.get(m) || 0) + 1);
    this.taste(m)?.classList.add('an');
    this.angeschlagen(m);
  },
  allesLos() {
    if (!this.finger) return;
    [...this.finger.keys()].forEach(id => this.los(id));
    this.finger.clear();
    this.gedrueckt?.clear();
    this.tastenEl?.querySelectorAll('.kt.an').forEach(k => k.classList.remove('an'));
  },
  los(id) {
    const f = this.finger.get(id);
    if (!f) return;
    f.aus();
    const n = (this.gedrueckt.get(f.m) || 1) - 1;
    if (n > 0) this.gedrueckt.set(f.m, n); else { this.gedrueckt.delete(f.m); this.taste(f.m)?.classList.remove('an'); }
    this.finger.set(id, null);
  },

  /* ---------- Üben ---------- */
  uhr() { return performance.now() / 1000; },
  spb() { return 60 / this.bpm; },

  /* Schritte für „Schritt für Schritt“: alle eigenen Noten, die gleichzeitig beginnen */
  schritte() {
    const zeiten = [...new Set(this.meine().map(n => n.start))].sort((a, b) => a - b);
    return zeiten.map(z => {
      const noten = this.meine().filter(n => n.start === z);
      return { zeit: z, noten, midis: [...new Set(noten.flatMap(n => n.midis))] };
    });
  },

  starten() {
    this.zuruecksetzen();
    const imTempo = this.art !== 'schritt';
    const vorlauf = imTempo ? 4 : 0;
    this.lauf = {
      t: -vorlauf,                     // Schläge ab Beginn, beim Mitspielen erst der Einzähltakt
      zuletzt: this.uhr(),
      schritte: this.art === 'schritt' ? this.schritte() : null, s: 0,
      erwartet: imTempo ? this.meine().flatMap(n => n.midis.map(m => ({ m, start: n.start, n, ok: false }))) : null,
      falsch: 0,
      auto: this.andere && this.hand !== 'beide' ? this.fremde().map(n => ({ n, an: null, fertig: false })) : [],
      schlag: Math.floor(-vorlauf) - 1,
    };
    this.el.querySelector('#kp-los').innerHTML = '■ Stopp';
    this.el.querySelectorAll('.kp-cursor').forEach(c => c.removeAttribute('hidden'));
    this.zielZeigen();
    const schritt = () => {
      if (!this.lauf) return;
      this.weiter();
      this.raf = requestAnimationFrame(schritt);
    };
    this.raf = requestAnimationFrame(schritt);
  },

  weiter() {
    const l = this.lauf;
    const jetzt = this.uhr();
    let t = l.t + (jetzt - l.zuletzt) / this.spb();
    l.zuletzt = jetzt;
    if (l.schritte) {
      const s = l.schritte[l.s];
      if (s && t > s.zeit) t = s.zeit;          // wartet auf die richtige Taste
    }
    // Metronom auf jedem Schlag
    const schlag = Math.floor(t + 1e-6);
    if (schlag > l.schlag) {
      l.schlag = schlag;
      if ((this.metro || schlag < 0) && schlag < this.ende()) Ton.klick(0, ((schlag % 4) + 4) % 4 === 0);
      // Einzähltakt groß über den Noten: 1 – 2 – 3 – 4, auf jedem Schlag neu angestoßen
      const ez = this.el.querySelector('.kp-noten .pz-einzaehler');
      if (ez) {
        ez.hidden = schlag >= 0;
        if (schlag < 0) {
          const zahl = ez.firstChild;
          zahl.textContent = schlag + 5;
          zahl.classList.remove('schlag'); void zahl.offsetWidth; zahl.classList.add('schlag');
        }
      }
    }
    if (this.L.wiederholung && l.t < 16 && t >= 16) this.el.querySelectorAll('.kp-ok, .kp-falsch').forEach(g => g.classList.remove('kp-ok', 'kp-falsch'));
    l.t = t;
    // Die andere Hand
    for (const a of l.auto) {
      if (!a.an && !a.fertig && t >= a.n.start) {
        a.an = (a.n.klang || a.n.midis).map(m => Ton.anschlag(m, 'klavier'));
        this.markieren(a.n.bild, 'kp-spielt', true);
      }
      if (a.an && t >= a.n.start + a.n.dauer - 0.04) {
        a.an.forEach(aus => aus()); a.an = null; a.fertig = true;
        this.markieren(a.n.bild, 'kp-spielt', false);
      }
    }
    this.cursor(t);
    if (l.erwartet) {
      // Mitspielen: was vorbei ist und nicht getroffen wurde, ist verpasst
      for (const e of l.erwartet) if (!e.ok && !e.verpasst && (t - e.start) * this.spb() > this.FENSTER) {
        e.verpasst = true;
        if (l.erwartet.filter(x => x.n === e.n).every(x => x.ok || x.verpasst)) this.markieren(e.n.bild, 'kp-falsch', true);
      }
      this.zielZeigen();
    }
    if (t >= this.ende() + (l.schritte ? 0 : 1)) this.fertig();
  },

  angeschlagen(m) {
    const l = this.lauf;
    if (!l || l.t + (this.uhr() - l.zuletzt) / this.spb() < -0.5) return;
    if (l.schritte) {
      const s = l.schritte[l.s];
      if (!s) return;
      if (!s.midis.includes(m)) { this.falschBlitz(m); l.falsch++; return; }
      if (!s.midis.every(x => this.gedrueckt.has(x))) return;   // Akkord: alle Tasten zusammen
      s.noten.forEach(n => this.markieren(n.bild, 'kp-ok', true));
      l.t = Math.max(l.t, s.zeit);
      l.s++;
      this.zielZeigen();
      if (l.s >= l.schritte.length) l.endeBei = this.ende();
      return;
    }
    // Mitspielen: der nächste passende, noch offene Ton im Zeitfenster – gemessen am
    // Moment des Drückens, nicht am letzten gezeichneten Bild
    const sek = this.spb();
    const t = l.t + (this.uhr() - l.zuletzt) / sek;
    const kand = l.erwartet.filter(e => e.m === m && !e.ok && !e.verpasst && Math.abs(e.start - t) * sek <= this.FENSTER);
    if (!kand.length) { l.falsch++; this.falschBlitz(m); return; }
    const e = kand.sort((a, b) => Math.abs(a.start - t) - Math.abs(b.start - t))[0];
    e.ok = true;
    if (l.erwartet.filter(x => x.n === e.n).every(x => x.ok)) this.markieren(e.n.bild, 'kp-ok', true);
  },

  /* Leuchtende Tasten: Schritt für Schritt die nächste, Mitspielen (Schalter) die gerade fälligen */
  zielZeigen() {
    const l = this.lauf;
    let ziele = [];
    if (l?.schritte) {
      const s = l.schritte[l.s];
      if (s) ziele = s.noten.flatMap(n => n.midis.map(m => [m, n.hand]));
    } else if (l && this.art === 'mit' && this.leuchten) {   // Mitspielen: nur mit Schalter, Sterne sammeln nie
      ziele = this.meine().filter(n => l.t >= n.start - 0.15 && l.t < n.start + Math.min(n.dauer, 1) - 0.1)
        .flatMap(n => n.midis.map(m => [m, n.hand]));
    }
    const schluessel = ziele.map(z => z.join()).join('|');
    if (schluessel === this.zielSchluessel) return;
    this.zielSchluessel = schluessel;
    this.tastenEl.querySelectorAll('.ziel').forEach(k => { k.classList.remove('ziel'); k.style.removeProperty('--hand'); });
    for (const [m, h] of ziele) {
      const k = this.taste(m);
      if (k) { k.classList.add('ziel'); k.style.setProperty('--hand', this.FARBE[h]); }
    }
  },
  falschBlitz(m) {
    const k = this.taste(m);
    if (!k) return;
    k.classList.remove('falsch'); void k.offsetWidth; k.classList.add('falsch');
  },
  markieren(i, klasse, an) {
    this.el.querySelectorAll(`.kp-n[data-i="${i}"], .kp-balken[data-i="${i}"]`).forEach(g => g.classList.toggle(klasse, an));
  },

  /* Ohne Wiederholung: die Zeile mit der Zeit t zeigen (neu gezeichnet, Markierungen fallen weg) */
  /* Tastenbereich: je Lied, bei zwei Händen ggf. weiter nach links (BEIDE) */
  bereichSetzen() {
    const b = this.hand === 'beide' && this.L.BEIDE ? this.L.BEIDE : this.L;
    Object.assign(this, { VON: b.VON, BIS: b.BIS, GROSS: b.GROSS, groesseText: b.groesseText || this.L.groesseText });
  },
  /* Laufende Zeile: den Streifen so verschieben, dass der Cursor etwa im ersten Takt des Fensters steht –
     rechts sieht man gut drei Takte voraus. Am Ende bleibt der letzte Takt am rechten Rand stehen. */
  laufen(t) {
    const g = this.el.querySelector('.kp-lauf');
    if (!g) return;
    const fenster = this.taktX(4) + 6;
    const max = Math.max(0, this.taktX(this.stueck.takte || 16) + 6 - fenster);
    const dx = t < 0 ? 0 : Math.min(max, Math.max(0, this.x(Math.min(t, this.ende() - 0.01)) - (this.X0 + this.TAKT * 0.6)));
    g.setAttribute('transform', `translate(${-dx.toFixed(1)} 0)`);
  },
  zeileZeigen(z) {
    const max = Math.max(0, Math.ceil(this.ende() / 16) - 1);
    z = Math.min(max, Math.max(0, z));
    if (z === this.zeile && this.el.querySelector('.kp-system')) return;
    this.zeile = z;
    const alt = this.el.querySelector('.kp-noten .kp-system');
    if (!alt) return;
    alt.outerHTML = this.svg();
    this.el.querySelectorAll('.kp-n').forEach(g => g.classList.toggle('kp-aus', this.hand !== 'beide' && g.dataset.hand !== this.hand));
  },
  cursor(t) {
    if (this.L.laufend) this.laufen(t);
    else if (this.L.wiederholung === false && t >= 0) this.zeileZeigen(Math.floor(Math.min(t, this.ende() - 0.01) / 16));
    const c = this.el.querySelector('.kp-cursor');
    if (t < 0) { c.setAttribute('hidden', ''); return; }
    c.removeAttribute('hidden');
    // Am Ende (liegen lassen) bleibt der Cursor auf dem letzten Ton stehen
    c.setAttribute('x', this.x(Math.min(t, this.L.wiederholung ? 28 : this.ende() - 0.01)) - 1.5);
    this.el.querySelector('.kp-endpfeil')?.classList.toggle('jetzt', t >= 16);
  },

  fertig() {
    const l = this.lauf;
    this.stopp(false);
    const erg = this.el.querySelector('#kp-ergebnis');
    if (l.schritte) {
      erg.innerHTML = `${Icons.raw('check')} Geschafft!${l.falsch ? ` ${l.falsch}× daneben gedrückt.` : ' Kein einziger falscher Ton.'}
        ${l.falsch <= 2 ? 'Probier es jetzt mit „Üben“.' : ''}`;
    } else if (this.art === 'mit') {
      const ok = l.erwartet.filter(e => e.ok).length;
      const p = Math.max(0, Math.round((ok - l.falsch * 0.5) / l.erwartet.length * 100));
      erg.innerHTML = `${p} % · ${ok} von ${l.erwartet.length} Tönen${l.falsch ? ` · ${l.falsch}× daneben` : ''}.
        ${p >= 80 ? 'Gut! Jetzt probier es bei „Sterne sammeln“.' : 'Weiter üben – gern etwas langsamer.'}`;
    } else {
      const ok = l.erwartet.filter(e => e.ok).length;
      // Falsche Töne ziehen ab, sonst wäre wildes Drücken ein Trick
      const p = Math.max(0, Math.round((ok - l.falsch * 0.5) / l.erwartet.length * 100));
      const sterne = Math.max(1, Pruefungsseite.sterne(p));
      const stufe = this.HAENDE.indexOf(this.hand);
      const alt = Fortschritt.bester(this.SPIEL, stufe).punkte || 0;
      Fortschritt.eintragen(this.SPIEL, stufe, sterne, p, ok, l.erwartet.length, Math.round(this.ende() * this.spb()));
      erg.innerHTML = `<span class="kp-sterne">${sterneHtml(sterne)}</span>
        <span>${p} % · ${ok} von ${l.erwartet.length} Tönen${l.falsch ? ` · ${l.falsch}× daneben` : ''}${p > alt && alt ? ' · <strong>Neuer Bestwert!</strong>' : ''}.
        ${p >= 95 ? 'Perfekt – versuch es schneller!' : p >= 80 ? 'Super – noch ein paar Mal!' : p >= 55 ? 'Schon gut – weiter üben.' : 'Übe erst bei „Üben“ oder langsamer.'}</span>`;
      const felder = [...erg.querySelectorAll('.stern.an')];
      felder.forEach(f => f.classList.remove('an'));
      const leiter = [72, 74, 76, 79, 81, 84];
      felder.forEach((f, i) => App.spaeter(() => { f.classList.add('an'); Ton.klavier(leiter[i], 0, 0.35, 0.12); }, 250 + i * 220));
      this.besteZeigen();
    }
  },

  stopp(aufraeumen = true) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    const l = this.lauf;
    this.lauf = null;
    const ez = this.el?.querySelector('.kp-noten .pz-einzaehler');
    if (ez) ez.hidden = true;
    l?.auto.forEach(a => { a.an?.forEach(aus => aus()); a.an = null; });
    if (!this.el?.querySelector('.kp-seite')) return;
    const los = this.el.querySelector('#kp-los');
    if (los) los.innerHTML = `${Icons.raw('play')}${l ? 'Nochmal' : 'Start'}`;
    this.el.querySelectorAll('.kp-spielt').forEach(g => g.classList.remove('kp-spielt'));
    this.zielSchluessel = null;
    this.tastenEl?.querySelectorAll('.ziel').forEach(k => { k.classList.remove('ziel'); k.style.removeProperty('--hand'); });
    if (aufraeumen) this.el.querySelectorAll('.kp-cursor').forEach(c => c.setAttribute('hidden', ''));
  },

  zuruecksetzen() {
    if (!this.el?.querySelector('.kp-seite')) return;
    if (this.L?.laufend) this.laufen(-1);
    else if (this.L && !this.L.wiederholung) this.zeileZeigen(0);
    this.el.querySelectorAll('.kp-ok, .kp-falsch').forEach(g => g.classList.remove('kp-ok', 'kp-falsch'));
    const erg = this.el.querySelector('#kp-ergebnis');
    if (erg) erg.textContent = '';
    this.el.querySelectorAll('.kp-cursor').forEach(c => c.setAttribute('hidden', ''));
  },
};
