/* Drumgrooves (eigene Kategorie, nach Toms Stunde „Der Drumgroove“, Klasse 7).

   1. Groove-Trainer (#/drumgrooves): die fünf Grooves aus der Stunde (Groove 1 = Note 5 …
      Groove 5 = Note 1) auf drei Pads oder am Drumset mitspielen. Jeder Groove wird
      aufgebaut: erst Hi-Hat + Snare, dann Bassdrum + Snare, dann alles. Reihenfolge der
      Pads umschaltbar (Hi-Hat · Bassdrum · Snare oder Snare · Bassdrum · Hi-Hat).
      „Mitspielen“ übt (keine Sterne, Pads leuchten auf Wunsch), „Sterne sammeln“ wertet
      den ganzen Groove: Spiel „drumgrooves“, Stufe 0–4 = Groove 1–5, Sterne wie bei der
      Rhythmus-Prüfung (ab 95 % sechs).
   2. Zwei Spiele im Bereich „Drumgrooves“ (SPIELE):
      – „Wo steht welches Instrument?“: Instrument zur Note, dann die Zählzeit.
      – „Welcher Groove?“: Groove hören und das Notenbild bzw. die Bassdrum finden.

   Ein Groove ist ein Takt in Achteln (Position 0–7 = 1 + 2 + 3 + 4 +). Die Hi-Hat spielt
   alle Achtel, die Snare den Backbeat (2 und 4), die Bassdrum macht die Grooves schwerer. */
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
  /* Instrumente: Name, Bodypercussion aus der Stunde, Farbfamilie, y im Notensystem (oberste Linie 20,
     Linienabstand 10), x = Kreuz statt Notenkopf */
  INSTR: {
    hh: { name: 'Hi-Hat', koerper: 'Brust · rechte Hand', fam: 'becken', y: 15, x: true },
    s: { name: 'Snare', koerper: 'Oberschenkel · linke Hand', fam: 'snare', y: 35 },
    b: { name: 'Bassdrum', koerper: 'Stampfen · rechter Fuß', fam: 'bass', y: 55 },
    crash: { name: 'Crash-Becken', fam: 'becken', y: 10, x: true, hilfslinie: true },
    ride: { name: 'Ride-Becken', fam: 'becken', y: 20, x: true },
    t1: { name: 'Tom', fam: 'tom', y: 25 },
    t3: { name: 'Floor-Tom', fam: 'tom', y: 45 },
  },
  /* Die Schläge eines Grooves: [{ k, p }] */
  schlaege(g, stimmen = ['hh', 's', 'b']) {
    const l = [];
    if (stimmen.includes('hh')) this.HH.forEach(p => l.push({ k: 'hh', p }));
    if (stimmen.includes('s')) this.SNARE.forEach(p => l.push({ k: 's', p }));
    if (stimmen.includes('b')) g.bass.forEach(p => l.push({ k: 'b', p }));
    return l;
  },
  bassText(g) { return g.bass.map(p => this.ZAEHL[p] === '+' ? `${this.ZAEHL[p - 1]}+` : this.ZAEHL[p]).join(' · '); },

  /* Ein Takt Schlagzeug-Notation. noten: [{ k, p }]; aus: Instrumente blass; markiert: { k, p }
     hervorgehoben; zaehlen: Zählzeiten darüber; klein: fürs Quiz */
  svg(noten, { aus = [], markiert = null, zaehlen = true, cursor = false, klasse = '' } = {}) {
    const B = 52, X0 = 58, RAND = 22;
    const breite = X0 + RAND + 8 * B;
    const x = p => X0 + RAND + p * B;
    let s = '';
    for (let l = 0; l < 5; l++) s += `<line x1="4" x2="${breite - 6}" y1="${20 + l * 10}" y2="${20 + l * 10}" class="nl"/>`;
    s += '<rect x="10" y="30" width="3.4" height="20" class="nb"/><rect x="17" y="30" width="3.4" height="20" class="nb"/>';
    s += '<text x="40" y="38" class="nt dg-takt">4</text><text x="40" y="58" class="nt dg-takt">4</text>';
    s += `<line x1="${breite - 13}" x2="${breite - 13}" y1="20" y2="60" class="nh"/><rect x="${breite - 10}" y="20" width="4" height="40" class="nb"/>`;
    if (zaehlen) this.ZAEHL.forEach((z, p) => { s += `<text x="${x(p)}" y="-22" class="dg-zahl${z === '+' ? ' und' : ''}">${z}</text>`; });
    const positionen = [...new Set(noten.map(n => n.p))].sort((a, b) => a - b);
    const BALKEN = -10;
    positionen.forEach(p => {
      const hier = noten.filter(n => n.p === p);
      const tief = Math.max(...hier.map(n => this.INSTR[n.k].y));
      const xs = x(p) + 5.6;
      s += `<line x1="${xs}" x2="${xs}" y1="${tief - 1}" y2="${BALKEN}" class="nh"/>`;
      hier.forEach(n => {
        const i = this.INSTR[n.k];
        const kl = `dg-n${aus.includes(n.k) ? ' dg-aus' : ''}${markiert && markiert.k === n.k && markiert.p === p ? ' dg-markiert' : ''}`;
        const kopf = i.x
          ? `<path d="M${x(p) - 5} ${i.y - 5} L${x(p) + 5} ${i.y + 5} M${x(p) - 5} ${i.y + 5} L${x(p) + 5} ${i.y - 5}" class="dg-kreuz"/>`
          : `<ellipse cx="${x(p)}" cy="${i.y}" rx="6.4" ry="4.6" transform="rotate(-20 ${x(p)} ${i.y})" class="nk"/>`;
        const linie = i.hilfslinie ? `<line x1="${x(p) - 10}" x2="${x(p) + 10}" y1="${i.y}" y2="${i.y}" class="nl"/>` : '';
        s += `<g class="${kl}" data-k="${n.k}" data-p="${p}">${linie}${kopf}</g>`;
      });
    });
    // Balken je halber Takt (vier Achtel), einzelne Achtel bekommen ein Fähnchen
    [[0, 3], [4, 7]].forEach(([a, e]) => {
      const in_ = positionen.filter(p => p >= a && p <= e);
      if (in_.length >= 2) {
        const x1 = x(in_[0]) + 4.4, x2 = x(in_[in_.length - 1]) + 6.8;
        s += `<rect x="${x1}" y="${BALKEN}" width="${x2 - x1}" height="5" class="nb"/>`;
      } else if (in_.length === 1) {
        const xs = x(in_[0]) + 5.6;
        s += `<path d="M${xs} ${BALKEN} q 2 9 9 13 q -6 -3 -9 -5 z" class="nb"/>`;
      }
    });
    if (cursor) s += `<rect class="kp-cursor" x="0" y="-36" width="3" height="104" rx="1.5" hidden/>`;
    const oben = zaehlen ? 42 : 24;
    return `<svg class="notenbild dg-system ${klasse}" viewBox="0 ${-oben} ${breite} ${70 + oben}" role="img" aria-label="Schlagzeug-Noten">${s}</svg>`;
  },
  xVon(p) { return 58 + 22 + p * 52; },
};

const Drumgrooves = {
  SPIEL: 'drumgrooves',
  TEILE: {
    hs: { name: 'Hi-Hat + Snare', stimmen: ['hh', 's'] },
    bs: { name: 'Bassdrum + Snare', stimmen: ['b', 's'] },
    alle: { name: 'Alles', stimmen: ['hh', 's', 'b'] },
  },
  TAKTE: 4,                   // so oft läuft der Groove nach dem Einzählen
  FENSTER: 0.13,              // Sekunden daneben zählen noch
  PAD_TASTEN: ['a', 's', 'd'],
  REIHEN: { hbs: ['hh', 'b', 's'], sbh: ['s', 'b', 'hh'] },
  g: 0, teil: 'hs', art: 'mit', bpm: 70, metro: true, leuchten: false, koerper: true, instrument: 'pads', reihe: 'hbs',

  lies(s) { try { return localStorage.getItem(`musiktrainer-dg-${s}`); } catch { return null; } },
  merken(s, w) { try { localStorage.setItem(`musiktrainer-dg-${s}`, String(w)); } catch { /* privat */ } },

  groove() { return DG.GROOVES[this.g]; },
  /* Groove 1 hat keine Bassdrum: dort gibt es nur einen Teil */
  teile() { return this.groove().bass.length ? ['hs', 'bs', 'alle'] : ['hs']; },
  stimmen() { return this.art === 'sterne' ? this.TEILE.alle.stimmen : this.TEILE[this.teil].stimmen; },
  sterneSumme() { return DG.GROOVES.reduce((s, _, i) => s + Fortschritt.bester(this.SPIEL, i).sterne, 0); },

  zeigen(el) {
    this.el = el;
    this.stopp();
    const g = Number(this.lies('g'));
    if (g >= 0 && g < 5) this.g = g;
    if (this.TEILE[this.lies('teil')]) this.teil = this.lies('teil');
    if (['mit', 'sterne'].includes(this.lies('art'))) this.art = this.lies('art');
    if (['pads', 'set'].includes(this.lies('instrument'))) this.instrument = this.lies('instrument');
    if (this.REIHEN[this.lies('reihe')]) this.reihe = this.lies('reihe');
    const b = Number(this.lies('bpm'));
    if (b >= 50 && b <= 130) this.bpm = b;
    this.metro = this.lies('metro') !== 'aus';
    this.leuchten = this.lies('leuchten') === 'an';
    this.koerper = this.lies('koerper') !== 'aus';
    if (!this.teile().includes(this.teil)) this.teil = 'hs';
    App.beimAufraeumen(() => { this.stopp(); Klavierpruefung.zoomFrei(); window.removeEventListener('keydown', this.tasteFn); });
    Klavierpruefung.zoomSperren();
    el.innerHTML = '<section class="card kp-seite dg-seite"></section>';
    this.aufbauen();
  },

  aufbauen() {
    const knopf = (gruppe, wert, text, an) => `<button type="button" data-${gruppe}="${wert}" aria-pressed="${an}">${text}</button>`;
    this.el.querySelector('.dg-seite').innerHTML = `
      <div class="kp-kopf">
        <h2><a class="karte-zurueck" href="#/" title="Zur Startseite" aria-label="Zur Startseite">${Icons.raw('back')}</a>Drumgrooves
          <button type="button" class="kp-i" id="kp-i" aria-expanded="false" aria-controls="kp-hilfe" title="Erklärung" aria-label="Erklärung">i</button>
          <span class="kp-oben-rechts">${Vollbild.knopf()}</span></h2>
        <div class="kp-hilfe" id="kp-hilfe" hidden>
          <p>Fünf Grooves von leicht (Groove 1 = Note 5) bis schwer (Groove 5 = Note 1). Die <strong>Hi-Hat</strong> spielt alle Achtel,
            die <strong>Snare</strong> den Backbeat auf 2 und 4, die <strong>Bassdrum</strong> wird von Groove zu Groove schwerer.</p>
          <ul>
            <li><strong>Aufbauen:</strong> erst Hi-Hat + Snare, dann Bassdrum + Snare, dann alles.</li>
            <li><strong>Mitspielen:</strong> Ein Takt wird eingezählt, dann läuft der Groove ${this.TAKTE}× durch. Zum Üben, gibt keine Sterne.
              Mit ${Icons.raw('tastenLicht')} leuchten die Pads mit.</li>
            <li><strong>Sterne sammeln:</strong> der ganze Groove, gewertet. Ab 95 % gibt es sechs Sterne.</li>
            <li><strong>Anhören:</strong> So klingt der Groove.</li>
            <li><strong>Pads</strong> oder <strong>Drumset</strong> – mit ⇄ drehst du die Pads um. Tasten am Computer: A, S, D.</li>
            <li><strong>Bodypercussion:</strong> Hi-Hat = Brust (rechte Hand), Snare = Oberschenkel (linke Hand), Bassdrum = stampfen (rechter Fuß).</li>
          </ul>
        </div>
      </div>
      <div class="kp-leiste">
        <div class="klavier-groesse dg-grooves" role="group" aria-label="Groove">
          ${DG.GROOVES.map((gr, i) => knopf('g', i, `Groove ${gr.nr}<small>Note ${gr.note}</small><span class="kp-best"></span>`, i === this.g)).join('')}
        </div>
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
          <label class="schalter" title="Bodypercussion auf den Pads zeigen"><input type="checkbox" role="switch" id="dg-koerper" ${this.koerper ? 'checked' : ''}><span class="schalter-bahn"></span>Bodypercussion</label>
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

  /* Groove, Teil, Übeart oder Instrument geändert: Leiste, Noten und Spielfeld neu */
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
    const alle = DG.schlaege(this.groove());
    const aus = ['hh', 's', 'b'].filter(k => !this.stimmen().includes(k));
    el.querySelector('.dg-noten').innerHTML = DG.svg(alle, { aus, cursor: true, klasse: 'dg-gross' }) +
      '<div class="pz-einzaehler" hidden aria-hidden="true"><span></span></div><span class="dg-takt-zaehler" hidden></span>';
    this.spielfeld();
    this.besteZeigen();
    el.querySelector('#kp-ergebnis').textContent = '';
  },

  besteZeigen() {
    this.el.querySelectorAll('button[data-g]').forEach(b => {
      const st = Fortschritt.bester(this.SPIEL, Number(b.dataset.g)).sterne;
      b.querySelector('.kp-best').innerHTML = st ? ` ${Icons.raw('star')}${st}` : '';
    });
  },

  spielfeld() {
    const feld = this.el.querySelector('.dg-spielfeld');
    const stimmen = this.stimmen();
    if (this.instrument === 'pads') {
      feld.innerHTML = `<div class="sz-pads dg-pads${this.koerper ? '' : ' ohne-koerper'}">${this.REIHEN[this.reihe].map((k, i) => {
        const ins = DG.INSTR[k];
        return `<button type="button" class="sz-pad dg-pad" data-k="${k}" data-fam="${ins.fam}"${stimmen.includes(k) ? '' : ' data-aus=""'} aria-label="${ins.name}">
          <span class="sz-pad-name">${ins.name}<small class="dg-koerper">${ins.koerper}</small></span>
          <span class="sz-taste">${this.PAD_TASTEN[i].toUpperCase()}</span></button>`;
      }).join('')}</div>`;
    } else {
      // Das Drumset des Schlagzeugs, nur Hi-Hat, Snare und Bassdrum spielbar
      const set = Object.create(Schlagzeugseite);
      set.setAn = Object.fromEntries(Schlagzeugseite.SET.map(({ k }) => [k, stimmen.includes(k)]));
      set.hhOffen = false;
      feld.innerHTML = `<div class="sz-set-rahmen dg-set">${set.setSvg()}</div>`;
    }
    const ziel = e => {
      const p = e.target.closest('.dg-pad, .sz-teil');
      return p && !p.hasAttribute('data-aus') && feld.contains(p) ? p : null;
    };
    feld.addEventListener('pointerdown', e => {
      const p = ziel(e);
      if (!p) return;
      e.preventDefault();
      this.schlag(p.dataset.k);
    });
    feld.addEventListener('pointerup', () => Ton.audio());
    feld.addEventListener('contextmenu', e => e.preventDefault());
  },
  padEl(k) { return this.el.querySelector(`.dg-spielfeld [data-k="${k}"]`); },

  bedienen() {
    const el = this.el;
    el.querySelectorAll('button[data-g]').forEach(b => b.addEventListener('click', () => {
      this.g = Number(b.dataset.g); this.merken('g', this.g);
      if (!this.teile().includes(this.teil)) this.teil = 'hs';
      this.allesZeigen();
    }));
    el.querySelectorAll('button[data-art]').forEach(b => b.addEventListener('click', () => {
      this.art = b.dataset.art; this.merken('art', this.art); this.allesZeigen();
    }));
    el.querySelectorAll('button[data-instrument]').forEach(b => b.addEventListener('click', () => {
      this.instrument = b.dataset.instrument; this.merken('instrument', this.instrument); this.allesZeigen();
    }));
    el.querySelector('#dg-drehen').addEventListener('click', () => {
      this.reihe = this.reihe === 'hbs' ? 'sbh' : 'hbs'; this.merken('reihe', this.reihe); this.stopp(); this.spielfeld();
    });
    el.querySelectorAll('[data-bpm]').forEach(b => b.addEventListener('click', () => {
      this.bpm = Math.min(130, Math.max(50, this.bpm + Number(b.dataset.bpm)));
      el.querySelector('#kp-bpm-text').textContent = this.bpm;
      this.merken('bpm', this.bpm);
    }));
    const schalter = (id, feld) => el.querySelector(id).addEventListener('change', e => {
      this[feld] = e.target.checked; this.merken(feld, this[feld] ? 'an' : 'aus');
      if (feld === 'koerper') el.querySelector('.dg-pads')?.classList.toggle('ohne-koerper', !this.koerper);
    });
    schalter('#kp-leuchten', 'leuchten'); schalter('#kp-metro', 'metro'); schalter('#dg-koerper', 'koerper');
    el.querySelector('#kp-los').addEventListener('click', () => { Ton.audio(); this.lauf ? this.stopp() : this.starten(false); });
    el.querySelector('#dg-hoeren').addEventListener('click', () => { Ton.audio(); this.lauf ? this.stopp() : this.starten(true); });
    const i = el.querySelector('#kp-i'), hilfe = el.querySelector('#kp-hilfe');
    const hilfeZeigen = an => { hilfe.hidden = !an; i.setAttribute('aria-expanded', String(an)); };
    i.addEventListener('click', e => { e.stopPropagation(); hilfeZeigen(hilfe.hidden); });
    el.querySelector('.dg-seite').addEventListener('pointerdown', e => {
      if (!hilfe.hidden && !hilfe.contains(e.target) && e.target !== i) hilfeZeigen(false);
    });
    // Computer: A S D wie die Pads von links nach rechts
    window.removeEventListener('keydown', this.tasteFn);
    this.tasteFn = e => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.target.closest?.('input, textarea, select')) return;
      const i = this.PAD_TASTEN.indexOf(e.key.toLowerCase());
      if (i < 0) return;
      const k = this.REIHEN[this.reihe][i];
      if (!this.stimmen().includes(k)) return;
      e.preventDefault();
      this.schlag(k);
    };
    window.addEventListener('keydown', this.tasteFn);
  },

  /* ---------- Spielen ---------- */
  uhr() { return performance.now() / 1000; },
  spb() { return 60 / this.bpm; },
  ende() { return this.TAKTE * 4; },

  schlag(k) {
    Drums.spielen(k);
    const p = this.padEl(k);
    if (p) { p.classList.remove('schlag'); void p.getBoundingClientRect(); p.classList.add('schlag'); }
    const l = this.lauf;
    if (!l || l.hoeren) return;
    const t = l.t + (this.uhr() - l.zuletzt) / this.spb();
    if (t < -0.5) return;
    const kand = l.erwartet.filter(e => e.k === k && !e.ok && !e.verpasst && Math.abs(e.t - t) * this.spb() <= this.FENSTER);
    if (!kand.length) { l.falsch++; this.markieren({ k, p: Math.round((((t % 4) + 4) % 4) * 2) % 8 }, 'dg-falsch'); return; }
    const e = kand.sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    e.ok = true;
    this.markieren(e, 'dg-ok');
  },
  markieren(e, klasse) {
    const g = this.el.querySelector(`.dg-noten .dg-n[data-k="${e.k}"][data-p="${e.p}"]`);
    if (!g) return;
    g.classList.remove('dg-ok', 'dg-falsch'); g.classList.add(klasse);
  },

  /* hoeren: der Groove spielt sich selbst vor (eingezählt, zwei Takte), sonst spielt man mit */
  starten(hoeren) {
    this.stopp();
    this.el.querySelector('#kp-ergebnis').textContent = '';
    const stimmen = hoeren ? this.TEILE.alle.stimmen.filter(k => this.stimmen().includes(k)) : this.stimmen();
    const takte = hoeren ? 2 : this.TAKTE;
    const noten = DG.schlaege(this.groove(), stimmen);
    const erwartet = [];
    for (let t = 0; t < takte; t++) noten.forEach(n => erwartet.push({ ...n, t: t * 4 + n.p / 2, ok: false }));
    this.lauf = { t: -4, zuletzt: this.uhr(), schlag: -5, takte, hoeren, erwartet, falsch: 0, takt: -1 };
    const knopf = this.el.querySelector(hoeren ? '#dg-hoeren' : '#kp-los');
    knopf.innerHTML = '■ Stopp';
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
    const ende = l.takte * 4;
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
    // Neuer Takt: Markierungen weg, Zähler „Takt 2 von 4“
    const takt = Math.floor(t / 4);
    if (t >= 0 && takt !== l.takt && takt < l.takte) {
      l.takt = takt;
      this.el.querySelectorAll('.dg-noten .dg-ok, .dg-noten .dg-falsch').forEach(g => g.classList.remove('dg-ok', 'dg-falsch'));
      const z = this.el.querySelector('.dg-takt-zaehler');
      z.hidden = false; z.textContent = `Takt ${takt + 1} von ${l.takte}`;
    }
    // Vorspielen bzw. verpasste Schläge
    for (const e of l.erwartet) {
      if (l.hoeren) {
        if (!e.ok && t >= e.t) { e.ok = true; Drums.spielen(e.k); const p = this.padEl(e.k); if (p) { p.classList.remove('schlag'); void p.getBoundingClientRect(); p.classList.add('schlag'); } }
      } else if (!e.ok && !e.verpasst && (t - e.t) * this.spb() > this.FENSTER) {
        e.verpasst = true;
        this.markieren(e, 'dg-falsch');
      }
    }
    l.t = t;
    // Cursor über dem einen gezeichneten Takt
    const c = this.el.querySelector('.dg-noten .kp-cursor');
    if (t < 0 || t >= ende) c.setAttribute('hidden', '');
    else { c.removeAttribute('hidden'); c.setAttribute('x', DG.xVon(0) - 8 + (t % 4) * 2 * 52); }
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
    const alt = Fortschritt.bester(this.SPIEL, this.g).punkte || 0;
    Fortschritt.eintragen(this.SPIEL, this.g, sterne, p, ok, l.erwartet.length, Math.round(this.ende() * this.spb()));
    erg.innerHTML = `<span class="kp-sterne">${sterneHtml(sterne)}</span>
      <span>${p} %${l.falsch ? ` · ${l.falsch}× daneben` : ''}${p > alt && alt ? ' · <strong>Neuer Bestwert!</strong>' : ''}.
      ${p >= 95 ? (this.g < 4 ? 'Perfekt – weiter zum nächsten Groove!' : 'Perfekt – alle Grooves!') : p >= 80 ? 'Super – noch ein paar Mal!' : 'Übe erst bei „Mitspielen“ oder langsamer.'}</span>`;
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
  },
};

/* ---------- Spiele im Bereich „Drumgrooves“ ---------- */
SPIELE.splice(SPIELE.map(s => s.bereich).lastIndexOf('Rhythmus') + 1, 0,
  {
    id: 'drum-notation',
    bereich: 'Drumgrooves',
    titel: 'Wo steht welches Instrument?',
    text: 'Schlagzeug-Noten lesen: Welches Instrument ist markiert, und auf welcher Zählzeit wird es gespielt?',
    icon: 'drum',
    farbe: '#fcd34d',
    stufen: [
      { name: 'Hi-Hat, Snare, Bassdrum', info: 'Die drei Instrumente im Groove', art: 'instrument', instr: ['hh', 's', 'b'] },
      { name: 'Das ganze Drumset', info: 'Dazu Becken und Toms', art: 'instrument', instr: ['hh', 's', 'b', 'crash', 'ride', 't3', 't1'] },
      { name: 'Zählzeiten', info: '1 + 2 + 3 + 4 + – wann wird gespielt?', art: 'zaehlzeit' },
    ],
    aufgabe(st) {
      const g = zufall(DG.GROOVES.slice(1));
      if (st.art === 'zaehlzeit') {
        const noten = DG.schlaege(g);
        // Meist Snare oder Bassdrum, manchmal die Hi-Hat
        const ziel = zufall(Math.random() < 0.75 ? noten.filter(n => n.k !== 'hh') : noten);
        const name = p => (DG.ZAEHL[p] === '+' ? `${DG.ZAEHL[p - 1]}+` : DG.ZAEHL[p]);
        const andere = mische([0, 1, 2, 3, 4, 5, 6, 7].filter(p => p !== ziel.p)).slice(0, 3);
        const reihe = [ziel.p, ...andere].sort((a, b) => a - b);
        return {
          frage: `Auf welcher Zählzeit spielt die markierte ${DG.INSTR[ziel.k].name}?`,
          bild: DG.svg(noten, { markiert: ziel, zaehlen: false, klasse: 'dg-quiz' }),
          optionen: reihe.map(name),
          richtig: reihe.indexOf(ziel.p),
          loesung: `Das war die ${DG.INSTR[ziel.k].name} auf „${name(ziel.p)}“.`,
        };
      }
      const k = zufall(st.instr);
      const p = zahl(0, 7);
      const optionen = mische([k, ...mische(st.instr.filter(x => x !== k)).slice(0, Math.min(3, st.instr.length - 1))]);
      return {
        frage: 'Welches Instrument ist markiert?',
        bild: DG.svg([{ k, p }], { markiert: { k, p }, zaehlen: false, klasse: 'dg-quiz' }),
        optionen: optionen.map(x => DG.INSTR[x].name),
        richtig: optionen.indexOf(k),
        loesung: `Das war: ${DG.INSTR[k].name}${DG.INSTR[k].x ? ' – Becken stehen als Kreuz' : ''}.`,
        nachher: () => Drums.spielen(k),
      };
    },
  },
  {
    id: 'groove-hoeren',
    bereich: 'Drumgrooves',
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
      const s = 60 / st.tempo;
      return {
        frage: st.text ? 'Auf welchen Zählzeiten spielt die Bassdrum?' : 'Welcher Groove läuft?',
        hoeren() {
          const c = Ton.audio();
          const start = c.currentTime + 0.1;
          for (let b = 0; b < 4; b++) Ton.klick(0.1 + b * s, b === 0);
          for (let t = 0; t < 2; t++) DG.schlaege(g).forEach(n => Drums.spielen(n.k, start + (4 + t * 4 + n.p / 2) * s, n.k === 'hh' ? 0.6 : 1));
          return 0.1 + 12 * s + 0.3;
        },
        optionen: reihe.map(x => (st.text ? (DG.bassText(DG.GROOVES[x]) || 'keine Bassdrum') : DG.svg(DG.schlaege(DG.GROOVES[x]), { zaehlen: false, klasse: 'dg-quiz' }))),
        breit: !st.text,
        richtig: reihe.indexOf(i),
        loesung: `Das war Groove ${g.nr}: ${g.bass.length ? `Bassdrum auf ${DG.bassText(g)}` : 'ohne Bassdrum'}, die Snare auf 2 und 4.`,
      };
    },
  });
