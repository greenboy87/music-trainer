/* Klavier-Prüfung Klasse 8 (#/klavierpruefung): das Intro von „In the End“ auf dem
   Keyboard. Die Zeile wird zweimal gespielt, beim zweiten Mal endet sie auf dem
   ersten Ton von Takt 4 und bleibt liegen.

   Urheberrecht: Die Noten stehen nicht hier im (öffentlichen) Code, sondern kommen
   vom Worker (GET /api/stueck/in-the-end, Variable STUECKE im Cloudflare-Dashboard)
   und nur für angemeldete Kinder. Format je Hand: Einträge „Schlag:Dauer:Stufe[+Stufe]:…“ (der vierte Teil
   wird nicht mehr gebraucht),
   Schlag und Dauer in Vierteln ab Beginn, Stufe wie in Notenbild (c' = 0, H = -8),
   vz = Vorzeichen der Tonart (-1 = ein ♭: jedes H ist ein B).

   Üben: rechte Hand, linke Hand oder beide. Drei Arten:
   – Mitspielen: Cursor läuft im Tempo, ein Takt wird eingezählt, am Ende wie viele
     Töne getroffen wurden.
   – Schritt für Schritt: Der Cursor läuft mit, bleibt aber an der nächsten Note
     stehen, bis die richtige(n) Taste(n) gedrückt sind.
   – Sterne sammeln: wie Mitspielen, aber gewertet und nie mit leuchtenden Tasten
     (beim Mitspielen per Schalter „Tasten leuchten“, anfangs aus).
   Wahlweise spielt die andere Hand mit. Gewertet wird nur „Sterne sammeln“: Sterne wie bei der
   Rhythmus-Prüfung (ab 95 % sechs), gespeichert als Spiel „klavier-pruefung“, Stufe 0 = rechte
   Hand, 1 = linke Hand, 2 = beide – damit im Konto und im School-Tool. */
const Klavierpruefung = {
  ID: 'in-the-end',
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

  lies(s) { try { return localStorage.getItem(`musiktrainer-kp-${s}`); } catch { return null; } },
  merken(s, w) { try { localStorage.setItem(`musiktrainer-kp-${s}`, String(w)); } catch { /* privat */ } },

  async zeigen(el) {
    this.el = el;
    this.stopp();
    if (['rh', 'lh', 'beide'].includes(this.lies('hand'))) this.hand = this.lies('hand');
    if (['schritt', 'mit', 'sterne'].includes(this.lies('art'))) this.art = this.lies('art');
    const b = Number(this.lies('bpm'));
    if (b >= 40 && b <= 120) this.bpm = b;
    this.andere = this.lies('andere') !== 'aus';
    this.metro = this.lies('metro') !== 'aus';
    this.namen = this.lies('namen') === 'an';
    this.gross = this.lies('gross') === 'an';
    this.leuchten = this.lies('leuchten') === 'an';   // Notennamen auf den Tasten: standardmäßig aus
    const rahmen = inhalt => {
      el.innerHTML = `
        <a class="zurueck" href="#/pruefung">${Icons.raw('back')}Prüfungen</a>
        <section class="card kp-seite">${inhalt}</section>`;
    };
    App.beimAufraeumen(() => { this.stopp(); this.zoomFrei(); });
    this.zoomSperren();
    if (!Konto.angemeldet()) {
      return rahmen(`<h2>Klavier-Prüfung Klasse 8</h2>
        <p class="hint">Die Noten gibt es nur für angemeldete Schülerinnen und Schüler – das Stück ist
          urheberrechtlich geschützt und darf nur im Unterricht genutzt werden.</p>
        <a class="knopf primary" href="#/anmelden">Anmelden</a>`);
    }
    if (!this.stueck) {
      rahmen('<h2>Klavier-Prüfung Klasse 8</h2><p class="hint">Noten werden geladen …</p>');
      try { this.stueck = this.lesen((await Konto.api(`/api/stueck/${this.ID}`)).stueck); }
      catch (e) {
        if (App.art !== 'klavierpruefung') return;
        return rahmen(`<h2>Klavier-Prüfung Klasse 8</h2><p class="hint">${e.status === 404
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
      const [start, dauer, st, fi = ''] = e.split(':');
      const stufen = st.split('+').map(Number);
      return { start: Number(start), dauer: Number(dauer), stufen, finger: fi ? fi.split('+') : [],
        midis: stufen.map(s => this.midi(s, roh.vz)), hand: h };
    });
    const noten = [...hand(roh.rh, 'rh'), ...hand(roh.lh, 'lh')].map((n, i) => ({ ...n, i }));
    /* Gezeichnet ist die Zeile nur einmal (mit Wiederholung): Noten des zweiten Durchgangs
       leuchten an der Note, die an derselben Stelle der Zeile steht */
    const zeile = 16;
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
        <h2><a class="karte-zurueck" href="#/pruefung" title="Zurück zu den Prüfungen" aria-label="Zurück zu den Prüfungen">${Icons.raw('back')}</a>Klavier-Prüfung Klasse 8 · ${s.titel} <span class="hint">${s.von} · Intro</span>
          <button type="button" class="kp-i" id="kp-i" aria-expanded="false" aria-controls="kp-hilfe" title="Erklärung" aria-label="Erklärung">i</button></h2>
        <div class="kp-hilfe" id="kp-hilfe" hidden>
          <p>Spiel die Zeile <strong>zweimal</strong>. Beim zweiten Mal hörst du auf dem ersten Ton von Takt 4 auf
            (Fermate <span class="ns">\u{1D110}</span>) und lässt ihn liegen.</p>
          <p>Die Zahlen über und unter den Noten stehen auch auf den Tasten.</p>
          <ul>
            <li><strong>Schritt für Schritt:</strong> Der Cursor wartet an jeder Note, bis du die richtige Taste drückst – die leuchtende.</li>
            <li><strong>Mitspielen:</strong> Ein Takt wird eingezählt, dann läuft der Cursor im Tempo. Zum Üben, gibt keine Sterne.
              Mit dem Schalter ${Icons.raw('tastenLicht')} leuchten die Tasten mit.</li>
            <li><strong>Sterne sammeln:</strong> Wie Mitspielen, aber es zählt. Ab 95 % gibt es sechs Sterne.</li>
            <li><strong>Größer:</strong> Nur die Tasten von A bis a¹, dafür breiter.</li>
          </ul>
        </div>
      </div>
      <div class="kp-leiste">
        <div class="klavier-groesse" role="group" aria-label="Hand">
          ${knopf('hand', 'rh', 'Rechte Hand', this.hand === 'rh')}${knopf('hand', 'lh', 'Linke Hand', this.hand === 'lh')}${knopf('hand', 'beide', 'Beide', this.hand === 'beide')}
        </div>
        <div class="klavier-groesse" role="group" aria-label="Übeart">
          ${knopf('art', 'schritt', 'Schritt für Schritt', this.art === 'schritt')}${knopf('art', 'mit', 'Mitspielen', this.art === 'mit')}${knopf('art', 'sterne', `${Icons.raw('star')}Sterne sammeln`, this.art === 'sterne')}
        </div>
        <span class="kp-tempo" role="group" aria-label="Tempo">Tempo
          <button type="button" class="kp-pm" data-bpm="-5" aria-label="Langsamer">−</button>
          <span id="kp-bpm-text" aria-live="polite">${this.bpm}</span>
          <button type="button" class="kp-pm" data-bpm="5" aria-label="Schneller">+</button></span>
        <label class="schalter" id="kp-andere-feld"><input type="checkbox" role="switch" id="kp-andere" ${this.andere ? 'checked' : ''}><span class="schalter-bahn"></span>Andere Hand spielt mit</label>
        <label class="schalter kp-licht" id="kp-leuchten-feld" title="Tasten leuchten mit"><input type="checkbox" role="switch" id="kp-leuchten" aria-label="Tasten leuchten mit" ${this.leuchten ? 'checked' : ''}><span class="schalter-bahn"></span>${Icons.raw('tastenLicht')}</label>
        <label class="schalter"><input type="checkbox" role="switch" id="kp-metro" ${this.metro ? 'checked' : ''}><span class="schalter-bahn"></span>Metronom</label>
        <label class="schalter"><input type="checkbox" role="switch" id="kp-namen" ${this.namen ? 'checked' : ''}><span class="schalter-bahn"></span>Notennamen</label>
      </div>
      <div class="kp-start">
        <button type="button" class="primary" id="kp-los">${Icons.raw('play')}Start</button>
        <span class="kp-ergebnis" id="kp-ergebnis" aria-live="polite"></span>
        ${Vollbild.knopf()}
      </div>
      <div class="kp-noten">${this.svg()}<div class="pz-einzaehler" hidden aria-hidden="true"><span></span></div></div>
      <div class="kp-tasten-kopf"><button type="button" class="small kp-gross" id="kp-gross" aria-pressed="${this.gross}" title="Tasten größer: ohne die Randtasten G und h">${Icons.raw(this.gross ? 'lupeMinus' : 'lupePlus')}<span>${this.gross ? 'Kleiner' : 'Größer'}</span></button></div>
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
  sterneSumme() { return this.HAENDE.reduce((s, _, i) => s + Fortschritt.bester(this.SPIEL, i).sterne, 0); },

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
    const z = zeit >= 16 ? zeit - 16 : zeit;
    const t = Math.min(3, Math.max(0, Math.floor(z / 4)));
    return this.taktX(t) + this.RAND + (z - t * 4) * this.SCHLAG;
  },
  y(stufe, hand) {
    return hand === 'rh' ? this.OBEN - (stufe - 2) * 5 : this.UNTEN_Y - (stufe + 10) * 5;
  },

  svg() {
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
    for (let t = 1; t <= 4; t++) {
      const x = this.taktX(t) - 1;
      if (t < 4) s += `<line x1="${x}" x2="${x}" y1="${oben}" y2="${this.UNTEN_Y}" class="nh"/>`;
      else {
        // Wiederholungszeichen: Punkte, dünner und dicker Strich
        s += `<line x1="${x - 7}" x2="${x - 7}" y1="${oben}" y2="${this.UNTEN_Y}" class="nh"/><rect x="${x - 4}" y="${oben}" width="4" height="${this.UNTEN_Y - oben}" class="nb"/>`;
        [this.OBEN, this.UNTEN_Y].forEach(u => { s += `<circle cx="${x - 13}" cy="${u - 25}" r="2.4" class="nb"/><circle cx="${x - 13}" cy="${u - 15}" r="2.4" class="nb"/>`; });
      }
    }
    const noten = this.stueck.noten.filter(n => n.start < 16);
    const achtel = noten.filter(n => n.dauer === 0.5 && n.hand === 'rh');
    for (const n of noten) {
      const x = this.x(n.start);
      let g = '';
      const hohl = n.dauer >= 2;
      n.stufen.forEach((st, k) => {
        const y = this.y(st, n.hand);
        g += this.hilfslinien(x, y, n.hand) + Notenbild.kopf(x, y, hohl);
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
    }
    // Achtelpaare mit Balken
    for (let k = 0; k + 1 < achtel.length; k += 2) {
      const [a, b] = [achtel[k], achtel[k + 1]];
      const xa = this.x(a.start) + 5.8, xb = this.x(b.start) + 5.8;
      const ya = this.y(a.stufen[0], 'rh') - 31, yb = this.y(b.stufen[0], 'rh') - 31;
      s += `<path d="M${xa - .8} ${ya} L${xb + .8} ${yb} L${xb + .8} ${yb + 5} L${xa - .8} ${ya + 5} Z" class="nb kp-balken" data-i="${a.i}"/>`;
    }
 // Ende beim 2. Mal: Pfeil über dem ersten Ton von Takt 4, liegen lassen
    const xe = this.x(12);
    s += `<g class="kp-endpfeil"><text x="${xe}" y="${this.OBEN - 66}" class="ns kp-fermate">\u{1D110}</text></g>`;
    s += `<rect class="kp-cursor" x="0" y="${oben - 14}" width="3" height="${this.UNTEN_Y - oben + 28}" rx="1.5" hidden/>`;
    return `<svg class="notenbild kp-system" viewBox="0 ${oben - 66} ${breite} ${this.UNTEN_Y - oben + 100}" role="img" aria-label="Noten">${s}</svg>`;
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
      this.hand = b.dataset.hand; this.merken('hand', this.hand); this.stopp(); this.leisteZeigen();
    }));
    el.querySelectorAll('[data-art]').forEach(b => b.addEventListener('click', () => {
      this.art = b.dataset.art; this.merken('art', this.art); this.stopp(); this.leisteZeigen();
    }));
    el.querySelectorAll('[data-bpm]').forEach(b => b.addEventListener('click', () => {
      this.bpm = Math.min(120, Math.max(40, this.bpm + Number(b.dataset.bpm)));
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
    if (l.t < 16 && t >= 16) this.el.querySelectorAll('.kp-ok, .kp-falsch').forEach(g => g.classList.remove('kp-ok', 'kp-falsch'));
    l.t = t;
    // Die andere Hand
    for (const a of l.auto) {
      if (!a.an && !a.fertig && t >= a.n.start) {
        a.an = a.n.midis.map(m => Ton.anschlag(m, 'klavier'));
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

  cursor(t) {
    const c = this.el.querySelector('.kp-cursor');
    if (t < 0) { c.setAttribute('hidden', ''); return; }
    c.removeAttribute('hidden');
    // Am Ende (liegen lassen) bleibt der Cursor auf dem letzten Ton stehen
    c.setAttribute('x', this.x(Math.min(t, 28)) - 1.5);
    this.el.querySelector('.kp-endpfeil')?.classList.toggle('jetzt', t >= 16);
  },

  fertig() {
    const l = this.lauf;
    this.stopp(false);
    const erg = this.el.querySelector('#kp-ergebnis');
    if (l.schritte) {
      erg.innerHTML = `${Icons.raw('check')} Geschafft!${l.falsch ? ` ${l.falsch}× daneben gedrückt.` : ' Kein einziger falscher Ton.'}
        ${l.falsch <= 2 ? 'Probier es jetzt mit „Mitspielen“.' : ''}`;
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
        ${p >= 95 ? 'Perfekt – versuch es schneller!' : p >= 80 ? 'Super – noch ein paar Mal!' : p >= 55 ? 'Schon gut – weiter üben.' : 'Übe erst bei „Mitspielen“ oder langsamer.'}</span>`;
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
    this.el.querySelectorAll('.kp-ok, .kp-falsch').forEach(g => g.classList.remove('kp-ok', 'kp-falsch'));
    const erg = this.el.querySelector('#kp-ergebnis');
    if (erg) erg.textContent = '';
    this.el.querySelectorAll('.kp-cursor').forEach(c => c.setAttribute('hidden', ''));
  },
};
