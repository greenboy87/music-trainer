/* Prüfungszeilen Klasse 5 (#/pruefung, #/pruefung/<note>): „Wähle deine Zeile – und
   klatsch sie vor!“ Fünf Zeilen mit vier Takten; wer die Zeile für Note 5 kann, hat
   die 5, die nächste schwerere Zeile ist die 4 und so weiter.

   Üben: einen Takt einzählen, dann spielt man die Zeile auf den Pads mit, während
   das Metronom weiterklickt. Obere Noten (c'', 3. Zwischenraum) = Snare bzw.
   klatschen, untere (f', 1. Zwischenraum) = Bassdrum bzw. stampfen – wie in der
   Schlagzeug-Notenschrift. Am Ende: wie genau, welche Noten getroffen, zu früh
   oder zu spät, wo es noch hakt. Gespeichert wird nur der beste Versuch je Zeile im
   Browser – nichts geht an den Server.

   Bausteine wie im übrigen music-trainer (G H V AA Vp), ein „_“ dahinter heißt:
   untere Stimme. Klasse 5: keine punktierten Noten. */
const Pruefungsseite = {
  ZEILEN: [
    { note: 5, farbe: '#1f7f86', takte: [['G'], ['V', 'V', 'V', 'V'], ['H', 'H'], ['V', 'V', 'H']] },
    { note: 4, farbe: '#1f7f86', takte: [['G_'], ['V', 'V', 'V', 'V'], ['H_', 'H'], ['V_', 'V_', 'H']] },
    { note: 3, farbe: '#e07b2e', takte: [['V', 'V', 'H'], ['V', 'V', 'H'], ['H', 'H'], ['AA', 'AA', 'H']] },
    { note: 2, farbe: '#e07b2e', takte: [['V_', 'V_', 'H'], ['V', 'V', 'H_'], ['H', 'H_'], ['AA', 'AA', 'H_']] },
    { note: 1, farbe: '#8c2332', takte: [['V', 'AA', 'V', 'Vp'], ['AA', 'AA', 'V', 'Vp'], ['Vp', 'V', 'AA', 'V'], ['AA', 'Vp', 'AA', 'Vp']] },
  ],
  bpm: 80,

  /* Zeichnung: 5 Linien, obere Stimme Hals nach oben, untere nach unten */
  B: 46,                // Breite eines Schlags
  RAND: 14,             // Abstand vom Taktstrich zur ersten Note
  X0: 52,               // nach Schlüssel und Taktart
  Y_OBEN: 35, Y_UNTEN: 55,

  merken(s, w) { try { localStorage.setItem(`musiktrainer-pruefung-${s}`, String(w)); } catch { /* privat */ } },
  lies(s) { try { return localStorage.getItem(`musiktrainer-pruefung-${s}`); } catch { return null; } },
  bester(note) { return Number(this.lies(`best-${note}`)) || 0; },

  /* Alle Noten einer Zeile: { zeit (Schläge ab Zeile), stimme 'o'|'u', takt, b (Baustein), i } */
  noten(z) {
    const liste = [];
    z.takte.forEach((takt, ti) => {
      let pos = 0;
      takt.forEach(roh => {
        const b = roh.replace('_', '');
        const stimme = roh.endsWith('_') ? 'u' : 'o';
        RhythmusBausteine[b].einsaetze.forEach(e => liste.push({ zeit: ti * 4 + pos + e, stimme, takt: ti, b }));
        pos += RhythmusBausteine[b].schlaege;
      });
    });
    return liste.map((n, i) => ({ ...n, i }));
  },
  zweiStimmen(z) { return z.takte.flat().some(b => b.endsWith('_')); },

  taktX(ti) { return this.X0 + ti * (this.RAND + 4 * this.B + 8); },
  x(zeit) { const ti = Math.min(3, Math.floor(zeit / 4)); return this.taktX(ti) + this.RAND + (zeit - ti * 4) * this.B; },

  svg(z, { gross = false } = {}) {
    const kopf = (x, y, hohl) => `<ellipse cx="${x}" cy="${y}" rx="6.4" ry="4.6" transform="rotate(-20 ${x} ${y})" class="${hohl ? 'nk-hohl' : 'nk'}"/>`;
    const hals = (x, y, unten) => unten
      ? `<line x1="${x - 5.8}" x2="${x - 5.8}" y1="${y + 1}" y2="${y + 30}" class="nh"/>`
      : `<line x1="${x + 5.8}" x2="${x + 5.8}" y1="${y - 1}" y2="${y - 31}" class="nh"/>`;
    let s = '';
    const ende = this.taktX(4) - 8;
    for (let l = 0; l < 5; l++) s += `<line x1="4" x2="${ende}" y1="${20 + l * 10}" y2="${20 + l * 10}" class="nl"/>`;
    s += '<rect x="10" y="30" width="3.4" height="20" class="nb"/><rect x="17" y="30" width="3.4" height="20" class="nb"/>';
    s += '<text x="36" y="38" class="nt pz-takt">4</text><text x="36" y="58" class="nt pz-takt">4</text>';
    let n = 0;
    z.takte.forEach((takt, ti) => {
      let pos = 0;
      takt.forEach(roh => {
        const b = roh.replace('_', '');
        const unten = roh.endsWith('_');
        const y = unten ? this.Y_UNTEN : this.Y_OBEN;
        const x = this.taktX(ti) + this.RAND + pos * this.B;
        const g = inhalt => `<g class="pz-n" data-n="${n++}">${inhalt}</g>`;
        if (b === 'G') s += g(kopf(x, y, true));
        else if (b === 'H') s += g(kopf(x, y, true) + hals(x, y, unten));
        else if (b === 'V') s += g(kopf(x, y) + hals(x, y, unten));
        else if (b === 'AA') {
          const x2 = x + this.B / 2;
          s += g(kopf(x, y) + hals(x, y, unten)) + g(kopf(x2, y) + hals(x2, y, unten));
          s += unten ? `<rect x="${x - 7.4}" y="${y + 25}" width="${x2 - x + 1.6}" height="5" class="nb"/>`
            : `<rect x="${x + 5}" y="${y - 31}" width="${x2 - x + 1.6}" height="5" class="nb"/>`;
        } else if (b === 'Vp') {
          s += `<path transform="translate(${x - 4} 26)" class="np" d="M2 0 L9 8 L4 14 L10 22 C5 20 2 23 6 29 C-1 25 0 18 6 20 L0 13 L5 7 Z"/>`;
        }
        pos += RhythmusBausteine[b].schlaege;
      });
      const xs = this.taktX(ti + 1) - 8;
      if (ti < 3) s += `<line x1="${xs}" x2="${xs}" y1="20" y2="60" class="nh"/>`;
    });
    // Schlussstrich
    s += `<line x1="${ende - 7}" x2="${ende - 7}" y1="20" y2="60" class="nh"/><rect x="${ende - 4}" y="20" width="4" height="40" class="nb"/>`;
    const hoehe = gross ? (this.zweiStimmen(z) ? 116 : 92) : 92;
    return `<svg class="notenbild pz-zeile${gross ? ' gross' : ''}" viewBox="0 -4 ${ende + 6} ${hoehe}" role="img" aria-label="Rhythmus, vier Takte">
      ${s}<g class="pz-marken"></g><rect class="pz-kopfzeiger" x="0" y="8" width="3" height="64" rx="1.5" hidden/></svg>`;
  },

  zeigen(el, id) {
    this.el = el;
    const b = Number(this.lies('bpm'));
    if (b >= 50 && b <= 140) this.bpm = b;
    const z = this.ZEILEN.find(r => String(r.note) === id);
    if (z) this.ueben(z);
    else this.liste();
  },

  liste() {
    this.el.innerHTML = `
      <a class="zurueck" href="#/">${Icons.raw('back')}Alle Spiele</a>
      <section class="card pz-seite">
        <h2>${Icons.raw('drum')}Wähle deine Zeile – und spiel sie vor!</h2>
        <p class="hint">Zeile 5 sicher spielen = Note 5, die nächste Zeile = Note 4 … – je schwieriger, desto besser die Note.
          Du spielst auf den Pads mit: obere Noten auf der <strong>Snare</strong> (klatschen), untere auf der <strong>Bassdrum</strong> (stampfen).
          Das Metronom zählt einen Takt ein und klickt weiter. Laut mitzählen!</p>
        <div class="pz-liste">
          ${this.ZEILEN.map(z => {
            const best = this.bester(z.note);
            return `<a class="pz-eintrag" href="#/pruefung/${z.note}">
              <span class="pz-nr" style="--farbe:${z.farbe}">${z.note}</span>
              ${this.svg(z)}
              <span class="pz-best">${best ? `Bester Versuch<strong>${best} %</strong>` : 'Noch nicht geübt'}</span>
            </a>`;
          }).join('')}
        </div>
      </section>`;
  },

  ueben(z) {
    const zwei = this.zweiStimmen(z);
    this.el.innerHTML = `
      <a class="zurueck" href="#/pruefung">${Icons.raw('back')}Alle Zeilen</a>
      <section class="card pz-seite pz-ueben">
        <div class="pz-kopf">
          <span class="pz-nr gross" style="--farbe:${z.farbe}">${z.note}</span>
          <div>
            <h2>Zeile für Note ${z.note}</h2>
            <p class="hint">${zwei ? 'Obere Noten: Snare (klatschen) · untere Noten: Bassdrum (stampfen)' : 'Alle Noten auf der Snare (klatschen)'}
              ${this.bester(z.note) ? ` · Bester Versuch: ${this.bester(z.note)} %` : ''}</p>
          </div>
        </div>
        <div class="pz-noten">${this.svg(z, { gross: true })}</div>
        <div class="pz-steuerung">
          <button type="button" class="primary pz-los" id="pz-los">${Icons.raw('play')}Los – ich spiele</button>
          <button type="button" id="pz-hoeren">${Icons.raw('volume')}Vorspielen</button>
          <div class="sz-tempo" role="group" aria-label="Tempo">
            <span>Tempo</span>
            <button type="button" class="sz-pm" data-pm="-4" aria-label="Langsamer">−</button>
            <span class="sz-bpm-wert"><span id="pz-bpm">${this.bpm}</span> BPM</span>
            <button type="button" class="sz-pm" data-pm="4" aria-label="Schneller">+</button>
          </div>
          <span class="metro-punkte pz-punkte" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        </div>
        <p class="pz-status" aria-live="polite">Tippe auf „Los“: ein Takt wird eingezählt, dann spielst du mit.</p>
        <div class="pz-ergebnis" hidden></div>
        <div class="pz-pads${zwei ? ' zwei' : ''}">
          ${zwei ? `<button type="button" class="sz-pad pz-pad" data-stimme="u" data-fam="bass"><span class="sz-pad-name">Bassdrum<small>stampfen · F</small></span></button>` : ''}
          <button type="button" class="sz-pad pz-pad" data-stimme="o" data-fam="snare"><span class="sz-pad-name">Snare<small>klatschen · ${zwei ? 'J' : 'Leertaste'}</small></span></button>
        </div>
      </section>`;
    this.z = z;
    this.zwei = zwei;
    this.zustand = 'bereit';
    const ort = this.el.querySelector('.pz-ueben');
    ort.querySelector('#pz-los').addEventListener('click', () => (this.zustand === 'bereit' ? this.durchlauf(true) : this.abbrechen()));
    ort.querySelector('#pz-hoeren').addEventListener('click', () => (this.zustand === 'bereit' ? this.durchlauf(false) : this.abbrechen()));
    ort.querySelectorAll('[data-pm]').forEach(b => b.addEventListener('click', () => {
      if (this.zustand !== 'bereit') return;
      this.bpm = Math.max(52, Math.min(140, this.bpm + Number(b.dataset.pm)));
      this.merken('bpm', this.bpm);
      ort.querySelector('#pz-bpm').textContent = this.bpm;
    }));
    ort.querySelectorAll('.pz-pad').forEach(p => {
      p.addEventListener('pointerdown', e => { e.preventDefault(); this.schlag(p.dataset.stimme); });
      p.addEventListener('pointerup', () => Ton.audio());
      p.addEventListener('contextmenu', e => e.preventDefault());
    });
    const taste = e => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.target.closest?.('input, select')) return;
      const k = e.key.toLowerCase();
      if (e.code === 'Space' || k === 'j') { e.preventDefault(); this.schlag('o'); }
      else if (k === 'f' && this.zwei) { e.preventDefault(); this.schlag('u'); }
    };
    document.addEventListener('keydown', taste);
    App.beimAufraeumen(() => {
      document.removeEventListener('keydown', taste);
      cancelAnimationFrame(this.raf);
      this.zustand = 'weg';
    });
  },

  /* Ein Schlag auf ein Pad: klingt immer; während der Aufnahme wird die Zeit gemerkt */
  schlag(stimme) {
    if (!this.el?.isConnected) return;
    Drums.spielen(stimme === 'u' ? 'b' : 's');
    const pad = this.el.querySelector(`.pz-pad[data-stimme="${stimme}"]`);
    if (pad) { pad.classList.remove('schlag'); void pad.offsetWidth; pad.classList.add('schlag'); }
    if (this.zustand === 'spielen' || this.zustand === 'zaehlen') {
      this.tipps.push({ zeit: (Ton.jetzt() - Ton.verzoegerung() - this.beginn) / this.schlagDauer, stimme });
    }
  },

  /* Einzählen (4 Klicks), dann 16 Schläge Zeile. mitspielen = aufnehmen, sonst vorspielen. */
  durchlauf(mitspielen) {
    const c = Ton.audio();
    const ort = this.el.querySelector('.pz-ueben');
    this.schlagDauer = 60 / this.bpm;
    const start = c.currentTime + 0.12;
    this.beginn = start + 4 * this.schlagDauer;
    this.tipps = [];
    this.mitspielen = mitspielen;
    for (let i = 0; i < 20; i++) Metronom.klick(start + i * this.schlagDauer, i % 4 === 0);
    const noten = this.noten(this.z);
    if (!mitspielen) noten.forEach(n => Drums.spielen(n.stimme === 'u' ? 'b' : 's', this.beginn + n.zeit * this.schlagDauer, n.zeit % 1 ? 0.85 : 1));
    this.zustand = 'zaehlen';
    ort.querySelector('.pz-ergebnis').hidden = true;
    ort.querySelectorAll('.pz-n').forEach(g => g.removeAttribute('data-wert'));
    ort.querySelector('.pz-marken').innerHTML = '';
    const los = ort.querySelector('#pz-los'), hoeren = ort.querySelector('#pz-hoeren');
    (mitspielen ? los : hoeren).innerHTML = '■ Abbrechen';
    (mitspielen ? hoeren : los).disabled = true;
    ort.querySelectorAll('[data-pm]').forEach(b => { b.disabled = true; });
    const status = ort.querySelector('.pz-status');
    const punkte = [...ort.querySelectorAll('.pz-punkte i')];
    const zeiger = ort.querySelector('.pz-noten .pz-kopfzeiger');
    let letzter = -1;
    const malen = () => {
      if (this.zustand !== 'zaehlen' && this.zustand !== 'spielen') return;
      const jetzt = c.currentTime - Ton.verzoegerung();
      const b = (jetzt - this.beginn) / this.schlagDauer;     // Schläge ab Zeilenanfang, Einzählen negativ
      const ganz = Math.floor(b);
      if (ganz !== letzter && b >= -4) {
        letzter = ganz;
        punkte.forEach((p, i) => p.classList.toggle('an', i === ((ganz % 4) + 4) % 4));
        if (b < 0) status.textContent = `Einzählen: ${ganz + 5} …${ganz === -1 ? (mitspielen ? ' – gleich geht’s los!' : '') : ''}`;
        else if (ganz < 16) status.textContent = `${mitspielen ? 'Spiel mit!' : 'Hör zu und zähl mit:'} Takt ${Math.floor(ganz / 4) + 1} · ${ganz % 4 + 1}`;
      }
      if (b >= 0) { this.zustand = 'spielen'; zeiger.hidden = false; zeiger.setAttribute('x', this.x(Math.min(b, 15.99)) - 1.5); }
      if (b >= 16.5) return this.fertig();
      this.raf = requestAnimationFrame(malen);
    };
    this.raf = requestAnimationFrame(malen);
  },

  abbrechen() {
    cancelAnimationFrame(this.raf);
    Ton.stopp();
    this.zustand = 'bereit';
    this.knoepfeZurueck();
    this.el.querySelector('.pz-status').textContent = 'Abgebrochen. Tippe auf „Los“, wenn du bereit bist.';
  },

  knoepfeZurueck() {
    const ort = this.el.querySelector('.pz-ueben');
    ort.querySelector('#pz-los').innerHTML = `${Icons.raw('play')}Los – ich spiele`;
    ort.querySelector('#pz-hoeren').innerHTML = `${Icons.raw('volume')}Vorspielen`;
    ort.querySelectorAll('#pz-los, #pz-hoeren, [data-pm]').forEach(b => { b.disabled = false; });
    ort.querySelectorAll('.pz-punkte i').forEach(p => p.classList.remove('an'));
    ort.querySelector('.pz-noten .pz-kopfzeiger').hidden = true;
  },

  fertig() {
    this.zustand = 'bereit';
    this.knoepfeZurueck();
    const status = this.el.querySelector('.pz-status');
    if (!this.mitspielen) { status.textContent = 'So klingt die Zeile. Jetzt du: Tippe auf „Los“.'; return; }
    this.auswerten();
  },

  /* Jede Note sucht den nächsten Schlag auf dem richtigen Pad im Fenster ±0,4 Schläge
     (höchstens 300 ms). Bis 50 ms daneben zählt voll, danach weniger, am Fensterrand
     nichts. Schläge, die zu keiner Note passen, zählen als zu viel und senken die Genauigkeit. */
  auswerten() {
    const ms = this.schlagDauer * 1000;
    const fenster = Math.min(0.4, 300 / ms);
    const voll = 50 / ms;
    const noten = this.noten(this.z);
    const frei = this.tipps.filter(t => t.zeit > -0.5 && t.zeit < 16.5).map(t => ({ ...t, frei: true }));
    noten.forEach(n => {
      let best = null;
      frei.forEach(t => {
        if (!t.frei || t.stimme !== n.stimme) return;
        const d = t.zeit - n.zeit;
        if (Math.abs(d) <= fenster && (!best || Math.abs(d) < Math.abs(best.zeit - n.zeit))) best = t;
      });
      if (!best) { n.wert = 0; n.status = 'fehlt'; return; }
      best.frei = false;
      n.d = best.zeit - n.zeit;
      const a = Math.abs(n.d);
      n.wert = a <= voll ? 1 : Math.max(0, 1 - (a - voll) / (fenster - voll));
      n.status = a <= voll * 1.4 ? 'genau' : 'knapp';
    });
    const zuViel = frei.filter(t => t.frei);
    const summe = noten.reduce((s, n) => s + n.wert, 0);
    const prozent = Math.round(100 * summe / (noten.length + zuViel.length));
    const getroffen = noten.filter(n => n.status !== 'fehlt');
    const genau = noten.filter(n => n.status === 'genau').length;
    const schnitt = getroffen.length ? getroffen.reduce((s, n) => s + n.d, 0) / getroffen.length * ms : 0;
    const proTakt = [0, 1, 2, 3].map(t => {
      const nt = noten.filter(n => n.takt === t);
      const extra = zuViel.filter(x => Math.min(3, Math.max(0, Math.floor(x.zeit / 4))) === t).length;
      return nt.reduce((s, n) => s + n.wert, 0) / (nt.length + extra);
    });
    const schwach = proTakt.indexOf(Math.min(...proTakt));

    // Noten einfärben, Schläge unter dem System markieren
    const ort = this.el.querySelector('.pz-ueben');
    noten.forEach(n => ort.querySelector(`.pz-noten .pz-n[data-n="${n.i}"]`)?.setAttribute('data-wert', n.status));
    // Eine Stimme: Punkte dicht unter dem System, Beschriftung darüber; zwei Stimmen: unter den
    // Hälsen der Bassdrum, die kurzen Namen links daneben
    const yMarke = this.zwei ? { o: 95, u: 105 } : { o: 80 };
    ort.querySelector('.pz-noten .pz-marken').innerHTML = (this.zwei
      ? `<text x="4" y="${yMarke.o + 3}" class="pz-marke-text">Snare</text><text x="4" y="${yMarke.u + 3}" class="pz-marke-text">Bass</text>`
      : `<text x="4" y="${yMarke.o - 7}" class="pz-marke-text">Deine Schläge</text>`) +
      frei.map(t => `<circle cx="${this.x(Math.max(0, Math.min(15.99, t.zeit)))}" cy="${yMarke[t.stimme]}" r="3.2" class="pz-marke${t.frei ? ' zuviel' : ''}"/>`).join('');

    const alt = this.bester(this.z.note);
    if (prozent > alt) this.merken(`best-${this.z.note}`, prozent);
    const lob = prozent >= 90 ? 'Super – das sitzt! Bereit für die Prüfung.'
      : prozent >= 75 ? 'Gut! Noch ein paar Mal, dann sitzt es.'
      : prozent >= 50 ? 'Schon ordentlich – übe weiter, gern etwas langsamer.'
      : 'Nimm ein langsameres Tempo und zähl laut mit.';
    const richtung = Math.abs(schnitt) < 25 ? 'genau im Takt' : `im Schnitt ${Math.round(Math.abs(schnitt))} ms zu ${schnitt < 0 ? 'früh' : 'spät'}`;
    const erg = ort.querySelector('.pz-ergebnis');
    erg.hidden = false;
    erg.innerHTML = `
      <div class="pz-prozent" style="--wert:${prozent}"><strong>${prozent} %</strong><span>genau</span></div>
      <div class="pz-auswertung">
        <h3>${lob}${prozent > alt && alt ? ' <span class="rekord">Neuer Bestwert!</span>' : ''}</h3>
        <ul>
          <li><span class="pz-punkt genau"></span>${genau} von ${noten.length} Noten genau getroffen</li>
          ${getroffen.length - genau ? `<li><span class="pz-punkt knapp"></span>${getroffen.length - genau} knapp daneben</li>` : ''}
          ${noten.length - getroffen.length ? `<li><span class="pz-punkt fehlt"></span>${noten.length - getroffen.length} verpasst oder falsches Pad</li>` : ''}
          ${zuViel.length ? `<li><span class="pz-punkt zuviel"></span>${zuViel.length} Schl${zuViel.length === 1 ? 'ag' : 'äge'} zu viel</li>` : ''}
          ${getroffen.length ? `<li>${Icons.raw('timer')}${richtung}</li>` : ''}
          ${prozent < 95 && proTakt[schwach] < 0.9 ? `<li>${Icons.raw('target')}Übe besonders Takt ${schwach + 1}</li>` : ''}
        </ul>
        <p class="hint">${this.bpm} BPM${prozent >= 90 && this.bpm < 100 ? ' – probier es auch etwas schneller.' : ''}</p>
      </div>`;
    this.el.querySelector('.pz-status').textContent = 'Nochmal? Tippe auf „Los“.';
  },
};
