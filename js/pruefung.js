/* Prüfungszeilen Klasse 5 und 6 (#/pruefung, #/pruefung/<note> für Klasse 5,
   #/pruefung/k6 und #/pruefung/k6-<note> für Klasse 6): „Wähle deine Zeile – und
   klatsch sie vor!“ Fünf Zeilen mit vier Takten; wer die Zeile für Note 5 kann, hat
   die 5, die nächste schwerere Zeile ist die 4 und so weiter.

   Üben: einen Takt einzählen, dann spielt man die Zeile auf den Pads mit, während
   das Metronom weiterklickt. Obere Noten (c'', 3. Zwischenraum) = Snare bzw.
   klatschen, untere (f', 1. Zwischenraum) = Bassdrum bzw. stampfen – wie in der
   Schlagzeug-Notenschrift. Am Ende: wie genau, welche Noten getroffen, zu früh
   oder zu spät, wo es noch hakt. Gespeichert wird nur der beste Versuch je Zeile im
   Browser – nichts geht an den Server.

   Klasse 6: alles auf der Snare, zwei Pads für rechte und linke Hand (R, L). Der
   Handsatz steht über den Noten zum Üben. Gewertet wird nur das Timing – außer
   man schaltet „Handsatz mitbewerten“ ein: dann zählt eine Note mit der falschen
   Hand nur halb und wird lila markiert.

   Bausteine wie im übrigen music-trainer (G H V AA Vp), ein „_“ dahinter heißt:
   untere Stimme. Klasse 5: keine punktierten Noten.
   hand: Handsatz je Note als Text (R/L), leer = keiner angezeigt. */
const Pruefungsseite = {
  klasse: 5,
  ZEILEN5: [
    { note: 5, farbe: '#1f7f86', takte: [['G'], ['V', 'V', 'V', 'V'], ['H', 'H'], ['V', 'V', 'H']] },
    { note: 4, farbe: '#1f7f86', takte: [['G_'], ['V', 'V', 'V', 'V'], ['H_', 'H'], ['V_', 'V_', 'H']] },
    { note: 3, farbe: '#e07b2e', takte: [['V', 'V', 'H'], ['V', 'V', 'H'], ['H', 'H'], ['AA', 'AA', 'H']] },
    { note: 2, farbe: '#e07b2e', takte: [['V_', 'V_', 'H'], ['V', 'V', 'H_'], ['H', 'H_'], ['AA', 'AA', 'H_']] },
    { note: 1, farbe: '#8c2332', takte: [['V', 'AA', 'V', 'Vp'], ['AA', 'AA', 'V', 'Vp'], ['Vp', 'V', 'AA', 'V'], ['AA', 'Vp', 'AA', 'Vp']] },
  ],
  ZEILEN6: [
    { note: 5, farbe: '#1f7f86', hand: 'RRL RLRLRL RLRLRL RLR', takte: [['H', 'V', 'V'], ['AA', 'AA', 'V', 'V'], ['V', 'V', 'AA', 'AA'], ['V', 'V', 'H']] },
    { note: 4, farbe: '#1f7f86', hand: 'RLRLR RLRLR RRRL RRLRL', takte: [['AA', 'AA', 'H'], ['AA', 'AA', 'H'], ['H', 'V', 'AA'], ['V', 'AA', 'V', 'V']] },
    { note: 3, farbe: '#e07b2e', hand: 'RLRLR RRLRRL RLLRRL RRLRLR', takte: [['V', 'V', 'AA', 'V'], ['V', 'AA', 'V', 'AA'], ['AA', 'V', 'V', 'AA'], ['V', 'AA', 'AA', 'V']] },
    { note: 2, farbe: '#e07b2e', hand: 'RLRLRRL RLRRLRL RLRRLRL RRLRLRL', takte: [['AA', 'AA', 'V', 'AA'], ['AA', 'V', 'AA', 'AA'], ['AA', 'V', 'AA', 'AA'], ['V', 'AA', 'AA', 'AA']] },
    { note: 1, farbe: '#8c2332', hand: 'RRL RRLRRL RLRRRL RLRL', takte: [['V', 'Vp', 'AA', 'Vp'], ['V', 'AA', 'V', 'AA'], ['AA', 'V', 'V', 'AA'], ['V', 'V', 'AA', 'Vp']] },
  ],
  bpm: 80,
  /* Prüfung: Leiter ab der Zeile für Note 5, je Zeile bis zu 3 Versuche, bestanden ab
     BESTANDEN %, festes Tempo. Nichts wird gespeichert – jede Prüfung beginnt neu. */
  PRUEF_BPM: 80,        // Klasse 5: fest
  PRUEF_BPM6: 72,       // Klasse 6: mindestens, schneller darf man
  BESTANDEN: 80,
  VERSUCHE: 3,
  pruefung: null,       // { i: Zeile in der Leiter, versuch, ergebnis: [{ note, prozent, versuch, ok }] }
  zeilen() { return this.klasse === 6 ? this.ZEILEN6 : this.ZEILEN5; },
  /* Adressen und Speicher: Klasse 5 wie bisher ohne Kürzel */
  /* Adressen: #/pruefung (Klasse wählen) → #/pruefung/k5 (Modus wählen) → #/pruefung/k5-liste
     (Zeilen) → #/pruefung/3 bzw. #/pruefung/k6-3 (eine Zeile; Klasse 5 wie früher ohne Kürzel) */
  adresse(note) {
    if (note) return this.klasse === 6 ? `#/pruefung/k6-${note}` : `#/pruefung/${note}`;
    return `#/pruefung/k${this.klasse}-liste`;
  },
  wahlAdresse() { return `#/pruefung/k${this.klasse}`; },

  /* Zeichnung: 5 Linien, obere Stimme Hals nach oben, untere nach unten */
  B: 46,                // Breite eines Schlags
  RAND: 14,             // Abstand vom Taktstrich zur ersten Note
  X0: 52,               // nach Schlüssel und Taktart
  Y_OBEN: 35, Y_UNTEN: 55,

  merken(s, w) { try { localStorage.setItem(`musiktrainer-pruefung-${s}`, String(w)); } catch { /* privat */ } },
  lies(s) { try { return localStorage.getItem(`musiktrainer-pruefung-${s}`); } catch { return null; } },
  bester(note, klasse = this.klasse) { return Number(this.lies(`best-${klasse === 6 ? 'k6-' : ''}${note}`)) || 0; },
  bestMerken(note, w) { this.merken(`best-${this.klasse === 6 ? 'k6-' : ''}${note}`, w); },
  /* Sterne beim Üben (wie in den Spielen 1–6) aus der Genauigkeit */
  STERNE_AB: [55, 70, 80, 88, 95],   // ab diesen Prozent 2, 3, 4, 5, 6 Sterne
  sterne(prozent) { return prozent > 0 ? 1 + this.STERNE_AB.filter(g => prozent >= g).length : 0; },
  sterneSumme() {
    return this.ZEILEN5.reduce((s, z) => s + this.sterne(this.bester(z.note, 5)), 0)
      + this.ZEILEN6.reduce((s, z) => s + this.sterne(this.bester(z.note, 6)), 0);
  },
  geuebt() { return this.ZEILEN5.filter(z => this.bester(z.note, 5)).length + this.ZEILEN6.filter(z => this.bester(z.note, 6)).length; },

  /* Alle Noten einer Zeile: { zeit (Schläge ab Zeile), stimme 'o'|'u', takt, b (Baustein), i } */
  noten(z) {
    const liste = [];
    z.takte.forEach((takt, ti) => {
      let pos = 0;
      takt.forEach(roh => {
        const b = roh.replace('_', '');
        const stimme = roh.endsWith('_') ? 'u' : 'o';
        const { einsaetze, schlaege } = RhythmusBausteine[b];
        // dauer: wie lange die Note beim Vorspielen leuchtet (Achtel ½, Halbe 2 …)
        einsaetze.forEach(e => liste.push({ zeit: ti * 4 + pos + e, dauer: schlaege / einsaetze.length, stimme, takt: ti, b }));
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
    const hand = (z.hand || '').replace(/[^RL]/g, '');
    const buchstabe = x => (hand[n] ? `<g class="pz-hand ${hand[n]}"><rect x="${x - 6.5}" y="-17" width="13" height="14" rx="2.5"/><text x="${x}" y="-6.2">${hand[n]}</text></g>` : '');
    z.takte.forEach((takt, ti) => {
      let pos = 0;
      takt.forEach(roh => {
        const b = roh.replace('_', '');
        const unten = roh.endsWith('_');
        const y = unten ? this.Y_UNTEN : this.Y_OBEN;
        const x = this.taktX(ti) + this.RAND + pos * this.B;
        const g = inhalt => { const h = buchstabe(x2n); return `${h}<g class="pz-n" data-n="${n++}">${inhalt}</g>`; };
        let x2n = x;
        if (b === 'G') s += g(kopf(x, y, true));
        else if (b === 'H') s += g(kopf(x, y, true) + hals(x, y, unten));
        else if (b === 'V') s += g(kopf(x, y) + hals(x, y, unten));
        else if (b === 'AA') {
          const x2 = x + this.B / 2;
          s += g(kopf(x, y) + hals(x, y, unten));
          x2n = x2;
          s += g(kopf(x2, y) + hals(x2, y, unten));
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
    const oben = hand ? 22 : 4;     // Platz für den Handsatz über den Hälsen
    const hoehe = (gross ? (this.zweiStimmen(z) ? 116 : 92) : 92) + oben - 4;
    return `<svg class="notenbild pz-zeile${gross ? ' gross' : ''}" viewBox="0 ${-oben} ${ende + 6} ${hoehe}" role="img" aria-label="Rhythmus, vier Takte">
      ${s}<g class="pz-marken"></g><rect class="pz-kopfzeiger" x="0" y="8" width="3" height="64" rx="1.5" hidden/></svg>`;
  },

  zeigen(el, id) {
    this.el = el;
    this.pruefung = null;
    this.handPruefen = this.lies('hand') === 'an';
    this.cursorAn = this.lies('cursor') !== 'aus';
    this.handZeigen = this.lies('hand-zeigen') !== 'aus';
    const b = Number(this.lies('bpm'));
    this.bpm = b >= 50 && b <= 140 ? b : 80;
    const m = /^k([56])(?:-(\d|liste))?$/.exec(id || '');
    this.klasse = m ? Number(m[1]) : 5;
    if (!id) return this.einstieg();
    if (m && !m[2]) return this.moduswahl();
    if (m && m[2] === 'liste') return this.liste();
    const z = this.zeilen().find(r => String(r.note) === (m ? m[2] : id));
    if (z) this.ueben(z);
    else this.einstieg();
  },

  /* Einstieg wie bei den Spielen: erst die Klasse */
  einstieg() {
    const summe = zeilen => zeilen.reduce((s, z) => s + this.sterne(this.bester(z.note, zeilen === this.ZEILEN6 ? 6 : 5)), 0);
    this.el.innerHTML = `
      <a class="zurueck" href="#/">${Icons.raw('back')}Alle Spiele</a>
      <section class="card spiel-intro pz-seite" style="--farbe:#5eead4">
        <span class="spiel-icon gross">${Icons.raw('drum')}</span>
        <h2>Rhythmus Prüfung</h2>
        <p class="hint">Wähle deine Zeile – und spiel sie vor! Zeile 5 sicher spielen = Note 5, die nächste Zeile = Note 4 …
          je schwieriger, desto besser die Note. Du spielst auf den Pads mit, das Metronom zählt einen Takt ein.</p>
        <div class="stufen">
          ${[[5, 'Klatschen und Stampfen', 'Snare und Bassdrum', this.ZEILEN5], [6, 'Snare mit Handsatz', 'rechte und linke Hand', this.ZEILEN6]].map(([k, name, info, zeilen]) => `
            <a class="knopf stufe" href="#/pruefung/k${k}">
              <span class="stufe-nr">Klasse ${k}</span>
              <span class="stufe-name">${name}</span>
              <span class="stufe-sterne">${Icons.raw('star')} ${summe(zeilen)} / 30</span>
              <span class="hint">5 Zeilen · ${info}</span>
            </a>`).join('')}
        </div>
      </section>`;
  },

  /* Umschalter Üben | Sterne sammeln – derselbe in der Liste und bei jeder Zeile */
  umschalter() {
    return `<div class="klavier-groesse pz-umschalter" role="group" aria-label="Modus">
      <button type="button" data-um="ueben" aria-pressed="${this.cursorAn}">${Icons.raw('target')}Üben</button>
      <button type="button" data-um="sterne" aria-pressed="${!this.cursorAn}">${Icons.raw('star')}Sterne sammeln</button>
    </div>`;
  },
  modusText() {
    return this.cursorAn
      ? `${Icons.raw('target')}<span><strong>Üben:</strong> Der Cursor läuft mit. Das zählt nicht – keine Sterne.</span>`
      : `${Icons.raw('star')}<span><strong>Sterne sammeln:</strong> Kein Cursor. Jede Zeile zählt.</span>`;
  },
  umschalterBinden() {
    this.el.querySelectorAll('[data-um]').forEach(b => b.addEventListener('click', () => {
      if (this.zustand === 'zaehlen' || this.zustand === 'spielen') return;
      this.cursorAn = b.dataset.um === 'ueben';
      this.merken('cursor', this.cursorAn ? 'an' : 'aus');
      this.el.querySelectorAll('[data-um]').forEach(k => k.setAttribute('aria-pressed', String((k.dataset.um === 'ueben') === this.cursorAn)));
      this.el.querySelectorAll('.pz-modus').forEach(m => { m.classList.toggle('uebung', this.cursorAn); m.innerHTML = this.modusText(); });
    }));
  },

  /* Dann bewusst entscheiden: mit Sternen spielen, Übungsmodus mit Cursor oder Prüfung */
  moduswahl() {
    const tempo = this.klasse === 6 ? `ab ${this.PRUEF_BPM6} BPM, schneller darfst du` : `${this.PRUEF_BPM} BPM`;
    this.el.innerHTML = `
      <a class="zurueck" href="#/pruefung">${Icons.raw('back')}Rhythmus Prüfung</a>
      <section class="card spiel-intro pz-seite" style="--farbe:#5eead4">
        <span class="spiel-icon gross">${Icons.raw('drum')}</span>
        <h2>Rhythmus Prüfung Klasse ${this.klasse}</h2>
        <p class="hint">Was möchtest du machen?</p>
        <div class="stufen pz-modi">
          <button type="button" class="stufe" data-modus="uebung">
            <span class="stufe-nr">${Icons.raw('target')}1 · Üben</span>
            <span class="stufe-name">Mit Cursor</span>
            <span class="hint">Ein Cursor zeigt dir, wo du bist. <strong>Zählt nicht</strong> – keine Sterne.</span>
          </button>
          <button type="button" class="stufe" data-modus="spielen">
            <span class="stufe-nr">${Icons.raw('star')}2 · Sterne sammeln</span>
            <span class="stufe-name">Ohne Cursor</span>
            <span class="hint">Jede Zeile zählt: bis zu 6 Sterne für deinen besten Versuch.</span>
          </button>
          <button type="button" class="stufe" data-modus="pruefung">
            <span class="stufe-nr">${Icons.raw('trophy')}3 · Prüfung</span>
            <span class="stufe-name">Deine Note</span>
            <span class="hint">Ab Zeile 5 aufwärts, ${this.VERSUCHE} Versuche pro Zeile. Tempo ${tempo}.</span>
          </button>
        </div>
        <p class="pz-wechsel">${Icons.raw('reset')}<span>Zwischen <strong>Üben</strong> und <strong>Sterne sammeln</strong> kannst du jederzeit wechseln – auch bei jeder Zeile über den Noten.</span></p>
      </section>`;
    this.el.querySelectorAll('[data-modus]').forEach(b => b.addEventListener('click', () => {
      const m = b.dataset.modus;
      if (m === 'pruefung') return this.pruefungStarten();
      this.cursorAn = m === 'uebung';
      this.merken('cursor', this.cursorAn ? 'an' : 'aus');
      location.hash = this.adresse();
    }));
  },

  liste() {
    this.el.innerHTML = `
      <a class="zurueck" href="${this.wahlAdresse()}">${Icons.raw('back')}Klasse ${this.klasse}: Modus wählen</a>
      <section class="card pz-seite">
        <h2>${Icons.raw('drum')}Klasse ${this.klasse} · Wähle deine Zeile</h2>
        <p class="hint">${this.klasse === 6
            ? 'Alles auf der <strong>Snare</strong> mit zwei Pads: <strong>R</strong> = rechte Hand, <strong>L</strong> = linke Hand. Übe den Handsatz mit – gewertet wird nur, ob du im Takt bist, außer du schaltest „Handsatz mitbewerten“ ein.'
            : 'Obere Noten auf der <strong>Snare</strong> (klatschen), untere auf der <strong>Bassdrum</strong> (stampfen).'}
          Laut mitzählen!</p>
        <div class="pz-modusleiste">${this.umschalter()}<p class="pz-modus${this.cursorAn ? ' uebung' : ''}">${this.modusText()}</p></div>
        <div class="pz-liste">
          ${this.zeilen().map(z => {
            const best = this.bester(z.note);
            return `<a class="pz-eintrag" href="${this.adresse(z.note)}">
              <span class="pz-nr" style="--farbe:${z.farbe}">${z.note}</span>
              ${this.svg(z)}
              <span class="pz-best">${best ? `<span class="pz-sterne">${sterneHtml(this.sterne(best))}</span>Bester Versuch ${best} %` : 'Noch nicht geübt'}</span>
            </a>`;
          }).join('')}
        </div>
      </section>`;
    this.umschalterBinden();
  },

  pruefungStarten() {
    Ton.audio();
    this.pruefung = { i: 0, versuch: 1, ergebnis: [], bpm: this.klasse === 6 ? this.PRUEF_BPM6 : this.PRUEF_BPM };
    this.ueben(this.zeilen()[0]);
  },

  /* Leiste über der Zeile: alle fünf Stufen, bestandene abgehakt, die aktuelle hervorgehoben */
  leiter() {
    const p = this.pruefung;
    return `<ol class="pz-leiter" aria-label="Prüfung: Fortschritt">${this.zeilen().map((z, i) => {
      const e = p.ergebnis.find(r => r.note === z.note && r.ok);
      const art = e ? 'ok' : i === p.i ? 'jetzt' : 'offen';
      return `<li class="${art}" style="--farbe:${z.farbe}"><span>${e ? Icons.raw('check') : z.note}</span>Note ${z.note}</li>`;
    }).join('')}</ol>`;
  },

  ueben(z) {
    const pr = this.pruefung;
    this.tempoUeben = this.tempoUeben ?? this.bpm;
    this.bpm = pr ? pr.bpm : this.tempoUeben;
    const tempoFest = pr && this.klasse === 5;
    const zwei = this.zweiStimmen(z);
    this.el.innerHTML = `
      <a class="zurueck" href="${pr ? this.wahlAdresse() : this.adresse()}">${Icons.raw('back')}${pr ? 'Prüfung abbrechen' : `Alle Zeilen Klasse ${this.klasse}`}</a>
      <section class="card pz-seite pz-ueben${pr ? ' pz-im-test' : ''}">
        ${pr ? this.leiter() : ''}
        <div class="pz-kopf">
          <span class="pz-nr gross" style="--farbe:${z.farbe}">${z.note}</span>
          <div>
            <h2>${pr ? `Prüfung Klasse ${this.klasse} · Zeile für Note ${z.note}` : `Klasse ${this.klasse} · Zeile für Note ${z.note}`}</h2>
            <p class="hint">${this.klasse === 6 ? `Alles auf der Snare: R = rechte Hand, L = linke Hand${z.hand ? ' – der Handsatz zählt nur, wenn „Handsatz mitbewerten“ an ist' : ''}`
              : zwei ? 'Obere Noten: Snare (klatschen) · untere Noten: Bassdrum (stampfen)' : 'Alle Noten auf der Snare (klatschen)'}
              ${pr ? ` · <strong>Versuch ${pr.versuch} von ${this.VERSUCHE}</strong> · ab ${this.BESTANDEN} % bestanden`
                : this.bester(z.note) ? ` · Bester Versuch: ${this.bester(z.note)} %` : ''}</p>
          </div>
        </div>
        <div class="pz-noten${this.handZeigen ? '' : ' ohne-hand'}">${this.svg(z, { gross: true })}<div class="pz-einzaehler" hidden aria-hidden="true"><span></span></div></div>
        <div class="pz-steuerung">
          <button type="button" class="primary pz-los" id="pz-los">${Icons.raw('play')}${pr ? `Versuch ${pr.versuch} starten` : 'Los – ich spiele'}</button>
          <button type="button" id="pz-hoeren"${pr ? ' hidden' : ''}>${Icons.raw('volume')}Vorspielen</button>
          ${tempoFest ? `<span class="sz-bpm-wert">${this.PRUEF_BPM} BPM</span>` : ''}
          <div class="sz-tempo" role="group" aria-label="Tempo"${tempoFest ? ' hidden' : ''}>
            <span>Tempo</span>
            <button type="button" class="sz-pm" data-pm="-4" aria-label="Langsamer">−</button>
            <span class="sz-bpm-wert"><span id="pz-bpm">${this.bpm}</span> BPM</span>
            <button type="button" class="sz-pm" data-pm="4" aria-label="Schneller">+</button>
          </div>
          <span class="metro-punkte pz-punkte" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          ${pr ? '' : this.umschalter()}
          ${this.klasse === 6 && z.hand ? `<label class="schalter"><input type="checkbox" role="switch" id="pz-hand-zeigen" ${this.handZeigen ? 'checked' : ''}><span class="schalter-bahn"></span>Handsatz zeigen</label>` : ''}
          ${this.klasse === 6 && z.hand && !pr ? `<label class="schalter"><input type="checkbox" role="switch" id="pz-hand" ${this.handPruefen ? 'checked' : ''}><span class="schalter-bahn"></span>Handsatz mitbewerten</label>` : ''}
        </div>
        ${pr ? '' : `<p class="pz-modus${this.cursorAn ? ' uebung' : ''}">${this.modusText()}</p>`}
        <p class="pz-status" aria-live="polite">${pr ? `Tippe auf „Versuch ${pr.versuch} starten“: ein Takt wird eingezählt, dann spielst du.` : 'Tippe auf „Los“: ein Takt wird eingezählt, dann spielst du mit.'}</p>
        <div class="pz-ergebnis" hidden></div>
        <div class="pz-pads${zwei || this.klasse === 6 ? ' zwei' : ''}">
          ${this.klasse === 6
            ? `<button type="button" class="sz-pad pz-pad" data-pad="L" data-stimme="o" data-fam="snare"><span class="sz-pad-name pz-hand-gross">L<small>linke Hand · F</small></span></button>
               <button type="button" class="sz-pad pz-pad" data-pad="R" data-stimme="o" data-fam="snare"><span class="sz-pad-name pz-hand-gross">R<small>rechte Hand · J</small></span></button>`
            : `${zwei ? `<button type="button" class="sz-pad pz-pad" data-pad="u" data-stimme="u" data-fam="bass"><span class="sz-pad-name">Bassdrum<small>stampfen · F</small></span></button>` : ''}
               <button type="button" class="sz-pad pz-pad" data-pad="o" data-stimme="o" data-fam="snare"><span class="sz-pad-name">Snare<small>klatschen · ${zwei ? 'J' : 'Leertaste'}</small></span></button>`}
        </div>
      </section>`;
    this.z = z;
    this.zwei = zwei;
    this.gleicheAdresse();
    this.umschalterBinden();
    const zeigeKnopf = this.el.querySelector('#pz-hand-zeigen');
    zeigeKnopf?.addEventListener('change', () => {
      this.handZeigen = zeigeKnopf.checked;
      this.merken('hand-zeigen', zeigeKnopf.checked ? 'an' : 'aus');
      this.el.querySelector('.pz-noten').classList.toggle('ohne-hand', !this.handZeigen);
    });
    const handKnopf = this.el.querySelector('#pz-hand');
    handKnopf?.addEventListener('change', () => { this.handPruefen = handKnopf.checked; this.merken('hand', handKnopf.checked ? 'an' : 'aus'); });
    this.zustand = 'bereit';
    const ort = this.el.querySelector('.pz-ueben');
    ort.querySelector('#pz-los').addEventListener('click', () => (this.zustand === 'bereit' ? this.durchlauf(true) : this.abbrechen()));
    ort.querySelector('#pz-hoeren').addEventListener('click', () => (this.zustand === 'bereit' ? this.durchlauf(false) : this.abbrechen()));
    ort.querySelectorAll('[data-pm]').forEach(b => b.addEventListener('click', () => {
      if (this.zustand !== 'bereit') return;
      if (pr) this.bpm = pr.bpm = Math.max(this.PRUEF_BPM6, Math.min(140, this.bpm + Number(b.dataset.pm)));
      else {
        this.bpm = this.tempoUeben = Math.max(52, Math.min(140, this.bpm + Number(b.dataset.pm)));
        this.merken('bpm', this.bpm);
      }
      ort.querySelector('#pz-bpm').textContent = this.bpm;
    }));
    ort.querySelectorAll('.pz-pad').forEach(p => {
      p.addEventListener('pointerdown', e => { e.preventDefault(); this.schlag(p.dataset.stimme, p.dataset.pad); });
      p.addEventListener('pointerup', () => Ton.audio());
      p.addEventListener('contextmenu', e => e.preventDefault());
    });
    const taste = e => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.target.closest?.('input, select')) return;
      const k = e.key.toLowerCase();
      if (e.code === 'Space' || k === 'j') { e.preventDefault(); this.schlag('o', this.klasse === 6 ? 'R' : 'o'); }
      else if (k === 'f' && this.klasse === 6) { e.preventDefault(); this.schlag('o', 'L'); }
      else if (k === 'f' && this.zwei) { e.preventDefault(); this.schlag('u', 'u'); }
    };
    // Nächste Zeile der Prüfung: alten Hörer erst abmelden
    if (this.taste) document.removeEventListener('keydown', this.taste);
    this.taste = taste;
    document.addEventListener('keydown', taste);
    App.beimAufraeumen(() => {
      document.removeEventListener('keydown', taste);
      this.taste = null;
      this.tempoUeben = null;
      cancelAnimationFrame(this.raf);
      this.zustand = 'weg';
    });
  },

  /* Ein Schlag auf ein Pad: klingt immer; während der Aufnahme wird die Zeit gemerkt */
  schlag(stimme, padId = stimme) {
    if (!this.el?.isConnected) return;
    Drums.spielen(stimme === 'u' ? 'b' : 's');
    const pad = this.el.querySelector(`.pz-pad[data-pad="${padId}"]`);
    if (pad) { pad.classList.remove('schlag'); void pad.offsetWidth; pad.classList.add('schlag'); }
    if (this.zustand === 'spielen' || this.zustand === 'zaehlen') {
      this.tipps.push({ zeit: (Ton.jetzt() - Ton.verzoegerung() - this.beginn) / this.schlagDauer, stimme, hand: padId });
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
    this.abgebrochen = false;
    // Mit Cursor gespielt: Rückmeldung ja, aber kein bester Versuch
    this.mitCursor = mitspielen && this.cursorAn && !this.pruefung;
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
    ort.querySelectorAll('[data-pm], [data-um]').forEach(b => { b.disabled = true; });
    const status = ort.querySelector('.pz-status');
    const punkte = [...ort.querySelectorAll('.pz-punkte i')];
    const zeiger = ort.querySelector('.pz-noten .pz-kopfzeiger');
    const einzaehler = ort.querySelector('.pz-einzaehler');
    const notenEl = [...ort.querySelectorAll('.pz-noten .pz-n')];
    this.leuchtet = '';
    let letzter = -1;
    const malen = () => {
      if (this.zustand !== 'zaehlen' && this.zustand !== 'spielen') return;
      const jetzt = c.currentTime - Ton.verzoegerung();
      const b = (jetzt - this.beginn) / this.schlagDauer;     // Schläge ab Zeilenanfang, Einzählen negativ
      const ganz = Math.floor(b);
      if (ganz !== letzter && b >= -4) {
        letzter = ganz;
        punkte.forEach((p, i) => p.classList.toggle('an', i === ((ganz % 4) + 4) % 4));
        if (b < 0) {
          status.textContent = `Einzählen: ${ganz + 5} …${ganz === -1 ? (mitspielen ? ' – gleich geht’s los!' : '') : ''}`;
          // Groß über den Noten: 1 – 2 – 3 – 4, auf jedem Schlag neu angestoßen
          einzaehler.hidden = false;
          const zahl = einzaehler.firstChild;
          zahl.textContent = ganz + 5;
          zahl.classList.remove('schlag'); void zahl.offsetWidth; zahl.classList.add('schlag');
        } else {
          einzaehler.hidden = true;
          if (ganz < 16) status.textContent = `${mitspielen ? 'Spiel mit!' : 'Hör zu und zähl mit:'} Takt ${Math.floor(ganz / 4) + 1} · ${ganz % 4 + 1}`;
        }
      }
      // SVG kennt .hidden nicht – das Attribut selbst entfernen
      // Cursor: beim Vorspielen immer, beim Mitspielen nur zum Üben (Schalter), in der Prüfung nie
      const mitCursor = !mitspielen || (this.cursorAn && !this.pruefung);
      if (b >= 0 && this.zustand !== 'spielen') {
        this.zustand = 'spielen';
        if (this.pruefung && mitspielen) los.innerHTML = '■ Abbrechen (zählt als Versuch)';
      }
      if (b >= 0 && mitCursor) { zeiger.removeAttribute('hidden'); zeiger.setAttribute('x', this.x(Math.min(b, 15.99)) - 1.5); }
      // Vorspielen: die Note, die gerade klingt, leuchtet
      if (!mitspielen) {
        const jetzt = noten.filter(n => b >= n.zeit && b < n.zeit + n.dauer).map(n => n.i);
        const schluessel = jetzt.join(',');
        if (schluessel !== this.leuchtet) {
          this.leuchtet = schluessel;
          notenEl.forEach((g, i) => g.classList.toggle('klingt', jetzt.includes(i)));
        }
      }
      if (b >= 16.5) return this.fertig();
      this.raf = requestAnimationFrame(malen);
    };
    this.raf = requestAnimationFrame(malen);
  },

  /* Abbrechen: beim Einzählen frei; in der Prüfung nach dem Einzählen zählt es als
     nicht bestandener Versuch – ausgewertet wird, was bis dahin gespielt war */
  abbrechen() {
    const zaehlt = this.pruefung && this.mitspielen && this.zustand === 'spielen';
    cancelAnimationFrame(this.raf);
    Ton.stopp();
    this.zustand = 'bereit';
    this.knoepfeZurueck();
    if (zaehlt) { this.abgebrochen = true; this.auswerten(); return; }
    this.el.querySelector('.pz-status').textContent = this.pruefung
      ? 'Beim Einzählen abgebrochen – zählt nicht als Versuch.'
      : 'Abgebrochen. Tippe auf „Los“, wenn du bereit bist.';
  },

  knoepfeZurueck() {
    const ort = this.el.querySelector('.pz-ueben');
    ort.querySelector('#pz-los').innerHTML = `${Icons.raw('play')}${this.pruefung ? `Versuch ${this.pruefung.versuch} starten` : 'Los – ich spiele'}`;
    ort.querySelector('#pz-hoeren').innerHTML = `${Icons.raw('volume')}Vorspielen`;
    ort.querySelectorAll('#pz-los, #pz-hoeren, [data-pm], [data-um]').forEach(b => { b.disabled = false; });
    ort.querySelectorAll('.pz-punkte i').forEach(p => p.classList.remove('an'));
    ort.querySelector('.pz-noten .pz-kopfzeiger').setAttribute('hidden', '');
    ort.querySelector('.pz-einzaehler').hidden = true;
    ort.querySelectorAll('.pz-noten .pz-n.klingt').forEach(g => g.classList.remove('klingt'));
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
    const hand = (this.z.hand || '').replace(/[^RL]/g, '');
    const mitHand = this.klasse === 6 && this.handPruefen && hand.length > 0 && !this.pruefung;
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
      if (mitHand && hand[n.i] && best.hand !== hand[n.i]) { n.wert /= 2; n.status = 'hand'; }
    });
    const zuViel = frei.filter(t => t.frei);
    const summe = noten.reduce((s, n) => s + n.wert, 0);
    const prozent = Math.round(100 * summe / (noten.length + zuViel.length));
    const getroffen = noten.filter(n => n.status !== 'fehlt');
    const genau = noten.filter(n => n.status === 'genau').length;
    const falscheHand = noten.filter(n => n.status === 'hand').length;
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

    const alt = this.pruefung || this.mitCursor ? Infinity : this.bester(this.z.note);
    if (prozent > alt) this.bestMerken(this.z.note, prozent);
    const pr = this.pruefung;
    const ok = prozent >= this.BESTANDEN && !this.abgebrochen;
    const lob = pr && this.abgebrochen ? 'Abgebrochen – zählt als nicht bestandener Versuch.'
      : pr ? (ok ? `Bestanden! Die Zeile für Note ${this.z.note} sitzt.` : `Noch nicht bestanden – ${this.BESTANDEN} % brauchst du.`)
      : this.mitCursor ? (prozent >= 75 ? 'Gut! Jetzt probier es bei „Sterne sammeln“.' : 'Weiter üben – gern etwas langsamer.')
      : prozent >= 90 ? 'Super – das sitzt! Bereit für die Prüfung.'
      : prozent >= 75 ? 'Gut! Noch ein paar Mal, dann sitzt es.'
      : prozent >= 50 ? 'Schon ordentlich – übe weiter, gern etwas langsamer.'
      : 'Nimm ein langsameres Tempo und zähl laut mit.';
    const richtung = Math.abs(schnitt) < 25 ? 'genau im Takt' : `im Schnitt ${Math.round(Math.abs(schnitt))} ms zu ${schnitt < 0 ? 'früh' : 'spät'}`;
    const erg = ort.querySelector('.pz-ergebnis');
    erg.hidden = false;
    erg.innerHTML = `
      ${this.mitCursor ? `<p class="pz-nicht-gewertet">${Icons.raw('target')}Üben – dieser Versuch zählt nicht, keine Sterne. Wechsle zu „Sterne sammeln“, damit er zählt.</p>` : ''}
      <div class="pz-prozent" style="--wert:${prozent}"><strong>${prozent} %</strong><span>genau</span></div>
      <div class="pz-auswertung">
        <h3>${lob}${prozent > alt && alt ? ' <span class="rekord">Neuer Bestwert!</span>' : ''}</h3>
        ${!pr && !this.mitCursor ? `<div class="pz-sterne gross">${sterneHtml(this.sterne(prozent))}</div>` : ''}
        <ul>
          <li><span class="pz-punkt genau"></span>${genau} von ${noten.length} Noten genau getroffen</li>
          ${getroffen.length - genau - falscheHand ? `<li><span class="pz-punkt knapp"></span>${getroffen.length - genau - falscheHand} knapp daneben</li>` : ''}
          ${falscheHand ? `<li><span class="pz-punkt hand"></span>${falscheHand} mit der falschen Hand</li>` : ''}
          ${mitHand && !falscheHand && getroffen.length ? `<li>${Icons.raw('check')}Handsatz stimmt</li>` : ''}
          ${noten.length - getroffen.length ? `<li><span class="pz-punkt fehlt"></span>${noten.length - getroffen.length} ${this.zwei ? 'verpasst oder falsches Pad' : 'verpasst'}</li>` : ''}
          ${zuViel.length ? `<li><span class="pz-punkt zuviel"></span>${zuViel.length} Schl${zuViel.length === 1 ? 'ag' : 'äge'} zu viel</li>` : ''}
          ${getroffen.length ? `<li>${Icons.raw('timer')}${richtung}</li>` : ''}
          ${prozent < 95 && proTakt[schwach] < 0.9 ? `<li>${Icons.raw('target')}Übe besonders Takt ${schwach + 1}</li>` : ''}
        </ul>
        ${pr ? '<div class="pz-pruef-weiter"></div>' : `<p class="hint">${this.bpm} BPM${prozent >= 90 && this.bpm < 100 ? ' – probier es auch etwas schneller.' : ''}</p>
        <div class="pz-pruef-weiter">
          <button type="button" id="pz-nochmal">${Icons.raw('reset')}Nochmal spielen</button>
          ${this.naechsteZeile() ? `<a class="knopf primary" href="${this.adresse(this.naechsteZeile().note)}">Weiter zur Zeile für Note ${this.naechsteZeile().note}${Icons.raw('next')}</a>` : ''}
        </div>`}
      </div>`;
    erg.classList.toggle('bestanden', !!pr && ok);
    erg.classList.toggle('durchgefallen', !!pr && !ok);
    if (pr) this.pruefungWeiter(prozent, ok);
    else {
      this.el.querySelector('.pz-status').textContent = 'Nochmal? Tippe auf „Los“.';
      erg.querySelector('#pz-nochmal').addEventListener('click', () => this.durchlauf(true));
      if (!this.mitCursor) this.sterneZeigen(erg);
    }
  },

  /* Die nächste, schwerere Zeile (Note 5 → 4 …), bei Note 1 keine */
  naechsteZeile() {
    const z = this.zeilen();
    return z[z.indexOf(this.z) + 1] || null;
  },

  /* Sterne nacheinander aufleuchten lassen, mit aufsteigendem Ton – wie am Ende der Spiele */
  sterneZeigen(erg) {
    const felder = [...erg.querySelectorAll('.pz-sterne.gross .stern.an')];
    felder.forEach(f => f.classList.remove('an'));
    const leiter = [72, 74, 76, 79, 81, 84];
    felder.forEach((f, i) => App.spaeter(() => { f.classList.add('an'); Ton.klavier(leiter[i], 0, 0.35, 0.12); }, 250 + i * 220));
  },

  /* Nach einem Prüfungsversuch: nächste Zeile, nochmal oder Ende */
  pruefungWeiter(prozent, ok) {
    const p = this.pruefung;
    const z = this.z;
    p.ergebnis.push({ note: z.note, prozent, versuch: p.versuch, ok, bpm: this.bpm });
    const ort = this.el.querySelector('.pz-pruef-weiter');
    const los = this.el.querySelector('#pz-los');
    const status = this.el.querySelector('.pz-status');
    const naechste = this.zeilen()[p.i + 1];
    if (ok && naechste) {
      los.hidden = true;
      status.textContent = `Bestanden im ${p.versuch}. Versuch!`;
      ort.innerHTML = `<button type="button" class="primary" id="pz-naechste">Weiter zur Zeile für Note ${naechste.note}${Icons.raw('next')}</button>
        <button type="button" id="pz-aufhoeren">Hier aufhören – Note ${z.note}</button>`;
      ort.querySelector('#pz-naechste').addEventListener('click', () => { p.i++; p.versuch = 1; this.ueben(naechste); window.scrollTo(0, 0); });
      ort.querySelector('#pz-aufhoeren').addEventListener('click', () => this.pruefungEnde());
    } else if (ok || p.versuch >= this.VERSUCHE) {
      los.hidden = true;
      status.textContent = ok ? 'Alle Zeilen bestanden!' : `Alle ${this.VERSUCHE} Versuche gespielt.`;
      ort.innerHTML = `<button type="button" class="primary" id="pz-ende">Zur Endnote${Icons.raw('next')}</button>`;
      ort.querySelector('#pz-ende').addEventListener('click', () => this.pruefungEnde());
    } else {
      p.versuch++;
      const rest = this.VERSUCHE - p.versuch + 1;
      status.textContent = `Noch ${rest} Versuch${rest === 1 ? '' : 'e'} für diese Zeile.`;
      los.innerHTML = `${Icons.raw('play')}Versuch ${p.versuch} starten`;
      this.el.querySelector('.pz-kopf .hint strong').textContent = `Versuch ${p.versuch} von ${this.VERSUCHE}`;
    }
  },

  /* Prüfung und Endnote laufen unter der Adresse der Liste: ein Link dorthin löst dann
     kein hashchange aus – die Seite selbst neu aufbauen */
  gleicheAdresse() {
    this.el.querySelectorAll('a[href^="#/pruefung"]').forEach(a => a.addEventListener('click', e => {
      if (a.getAttribute('href') !== location.hash) return;
      e.preventDefault();
      App.route();
    }));
  },

  /* Endnote: die schwerste bestandene Zeile, keine bestanden = 6. Nichts wird gespeichert. */
  pruefungEnde() {
    const p = this.pruefung;
    const bestanden = p.ergebnis.filter(r => r.ok);
    const note = bestanden.length ? Math.min(...bestanden.map(r => r.note)) : 6;
    const wort = Bewertung.NOTEN[note];
    if (this.taste) { document.removeEventListener('keydown', this.taste); this.taste = null; }
    this.el.innerHTML = `
      <a class="zurueck" href="${this.wahlAdresse()}">${Icons.raw('back')}Klasse ${this.klasse}: Modus wählen</a>
      <section class="card pz-seite pz-endnote">
        <p class="hint">Prüfung Klasse ${this.klasse}${this.klasse === 5 ? ` · ${this.PRUEF_BPM} BPM` : ''}</p>
        <div class="pz-endnote-zahl" style="--farbe:${(this.zeilen().find(z => z.note === note) || { farbe: '#6b7280' }).farbe}">${note}</div>
        <h2>Endnote ${note} <span>${wort}</span></h2>
        <ul class="pz-endnote-liste">
          ${this.zeilen().map(z => {
            const v = p.ergebnis.filter(r => r.note === z.note);
            if (!v.length) return `<li class="offen"><span class="pz-nr" style="--farbe:${z.farbe}">${z.note}</span> nicht gespielt</li>`;
            const ok = v.find(r => r.ok);
            return `<li class="${ok ? 'ok' : 'nein'}"><span class="pz-nr" style="--farbe:${z.farbe}">${z.note}</span>
              ${ok ? `${Icons.raw('check')}bestanden im ${ok.versuch}. Versuch` : `${Icons.raw('x')}nicht bestanden`}
              <span class="hint">${v.map(r => `${r.prozent} %${this.klasse === 6 ? ` (${r.bpm} BPM)` : ''}`).join(' · ')}</span></li>`;
          }).join('')}
        </ul>
        <div class="btn-row mitte">
          <button type="button" class="primary" id="pz-neu">${Icons.raw('reset')}Prüfung neu starten</button>
          <a class="knopf" href="${this.adresse()}">Weiter üben</a>
        </div>
      </section>`;
    this.el.querySelector('#pz-neu').addEventListener('click', () => this.pruefungStarten());
    this.gleicheAdresse();
    window.scrollTo(0, 0);
    Ton.audio();
    if (note <= 2) [72, 76, 79, 84].forEach((m, i) => Ton.klavier(m, i * 0.1, 0.5, 0.13));
  },
};
