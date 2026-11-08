/* Notenbilder als SVG: einzelne Noten im Notensystem und einfache Rhythmen
   auf einer Linie.

   Tonhöhen werden als „Stufe“ gezählt: Stammtöne ab c' (c' = 0, d' = 1, …,
   h' = 6, c'' = 7, h = -1). Das passt zum Notensystem, in dem jede Stufe eine
   halbe Linienbreite ist. Notennamen deutsch, H statt B. */
const Stufe = {
  NAMEN: ['C', 'D', 'E', 'F', 'G', 'A', 'H'],
  HALBTOENE: [0, 2, 4, 5, 7, 9, 11],

  name(stufe) { return this.NAMEN[((stufe % 7) + 7) % 7]; },

  midi(stufe) {
    const oktave = Math.floor(stufe / 7);
    return 60 + 12 * oktave + this.HALBTOENE[((stufe % 7) + 7) % 7];
  },

  /* Name mit Oktavstrichen: c', a, c'', H */
  vollerName(stufe) {
    const oktave = Math.floor(stufe / 7);
    const n = this.name(stufe);
    if (oktave >= 0) return n.toLowerCase() + "'".repeat(oktave + 1);
    if (oktave === -1) return n.toLowerCase();
    return n;
  },
};

const Notenbild = {
  ABSTAND: 10,          // Linienabstand
  UNTEN: 80,            // y der untersten Linie
  /* Stufe der untersten Linie: e' im Violinschlüssel, G im Bassschlüssel */
  UNTERSTE: { violin: 2, bass: -10 },

  yVon(stufe, schluessel) {
    return this.UNTEN - (stufe - this.UNTERSTE[schluessel]) * (this.ABSTAND / 2);
  },

  linien(x1, x2) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const y = this.UNTEN - i * this.ABSTAND;
      s += `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" class="nl"/>`;
    }
    return s;
  },

  schluessel(art) {
    return art === 'bass'
      ? `<text x="10" y="${this.UNTEN + 5}" class="ns ns-bass">\u{1D122}</text>`
      : `<text x="10" y="${this.UNTEN}" class="ns ns-violin">\u{1D11E}</text>`;
  },

  hilfslinien(x, y) {
    let s = '';
    const oben = this.UNTEN - 4 * this.ABSTAND;
    for (let ly = this.UNTEN + this.ABSTAND; ly <= y + 0.1; ly += this.ABSTAND)
      s += `<line x1="${x - 11}" x2="${x + 11}" y1="${ly}" y2="${ly}" class="nl"/>`;
    for (let ly = oben - this.ABSTAND; ly >= y - 0.1; ly -= this.ABSTAND)
      s += `<line x1="${x - 11}" x2="${x + 11}" y1="${ly}" y2="${ly}" class="nl"/>`;
    return s;
  },

  kopf(x, y, hohl = false) {
    return `<ellipse cx="${x}" cy="${y}" rx="6.4" ry="4.6" transform="rotate(-20 ${x} ${y})" ` +
      `class="${hohl ? 'nk-hohl' : 'nk'}"/>`;
  },

  /* ♯ oder ♭ links vor dem Notenkopf, in Höhe des Kopfes */
  vorzeichen(x, y, vz) {
    if (!vz) return '';
    return vz > 0
      ? `<text x="${x - 19}" y="${y + 2}" class="ns ns-vz">♯</text>`
      : `<text x="${x - 18}" y="${y + 3}" class="ns ns-vz">♭</text>`;
  },

  /* Eine oder mehrere Viertelnoten im System. Ein Ton ist eine Stufe oder
     { stufe, vz } mit Vorzeichen. Hals wie im Unterricht: unter der 3. Linie
     rechts nach oben, ab der 3. Linie links nach unten. */
  noten(toene, schluessel = 'violin') {
    const breite = 90 + toene.length * 40;
    const mitte = this.UNTEN - 2 * this.ABSTAND;
    let s = this.linien(4, breite - 6) + this.schluessel(schluessel);
    toene.forEach((ton, i) => {
      const st = typeof ton === 'number' ? ton : ton.stufe;
      const x = 80 + i * 40;
      const y = this.yVon(st, schluessel);
      s += this.hilfslinien(x, y) + this.vorzeichen(x, y, ton.vz) + this.kopf(x, y);
      s += y > mitte
        ? `<line x1="${x + 5.8}" x2="${x + 5.8}" y1="${y - 1}" y2="${y - 34}" class="nh"/>`
        : `<line x1="${x - 5.8}" x2="${x - 5.8}" y1="${y + 1}" y2="${y + 34}" class="nh"/>`;
    });
    // Mehr Noten = breiteres Bild, sonst würde jede Note winzig
    return `<svg class="notenbild" viewBox="0 0 ${breite} 120" style="max-width:${200 + toene.length * 50}px" role="img" aria-label="Noten">${s}</svg>`;
  },

  /* Rhythmus auf einer Linie. Eingabe: ein Takt (Liste von Bausteinen wie
     ['V', 'AA', 'H']) oder mehrere Takte (Liste von Takten). Bausteine siehe
     RhythmusBausteine. Optionen:
       schlaege  Viertel je Takt (2, 3, 4) – steht als Taktart vorne
       luecke    [takt, nr]: dieser Baustein wird als „?“-Kästchen gezeichnet
       markiert  Nummer eines Taktes, der farbig hinterlegt wird
       frei      nur die Noten, ohne Taktart und Taktstrich (Antwortknöpfe)
       eng       jeder Baustein nur eine Viertel breit (Bausteinkarten)
       linie     false = ohne die Notenlinie (Rhythmus nachbauen)               */
  rhythmus(eingabe, { schlaege = 4, luecke = null, markiert = null, frei = false, eng = false, linie: mitLinie = true } = {}) {
    const takte = typeof eingabe[0] === 'string' ? [eingabe] : eingabe;
    const SCHLAG = 48, y = 62, halsOben = 26;
    let x = frei ? -4 : 52, s = '', hinten = '';
    // Frei: wie weit die Zeichen links und rechts über den ersten Notenkopf reichen, zum Mittig-Setzen
    const AUSDEHNUNG = { AA: [-7, 31], pA: [-5, 38], Ap: [-7, 34], Vp: [-4, 6] };
    let links = Infinity, rechts = -Infinity;
    if (!frei) s += `<text x="22" y="${y - 3}" class="nt">${schlaege}</text><text x="22" y="${y + 21}" class="nt">4</text>`;
    takte.forEach((takt, ti) => {
      const von = x;
      takt.forEach((b, bi) => {
        const breite = eng ? SCHLAG : SCHLAG * RhythmusBausteine[b].schlaege;
        if (luecke && luecke[0] === ti && luecke[1] === bi) {
          s += `<rect x="${x + 2}" y="${halsOben - 6}" width="${breite - 8}" height="${y - halsOben + 18}" rx="6" class="rb-luecke"/>` +
            `<text x="${x + breite / 2 - 2}" y="${y - 4}" class="rb-frage">?</text>`;
        } else s += this.rhythmusZeichen(b, x + 10, y, halsOben);
        const [l, r] = AUSDEHNUNG[b] || [-7, 7];
        links = Math.min(links, x + 10 + l); rechts = Math.max(rechts, x + 10 + r);
        x += breite;
      });
      x += 4;
      if (markiert === ti) hinten += `<rect x="${von + 2}" y="14" width="${x - von - 4}" height="68" rx="6" class="rb-mark"/>`;
      if (!frei) s += `<line x1="${x}" x2="${x}" y1="${y - 12}" y2="${y + 12}" class="nh"/>`;
      if (ti < takte.length - 1) x += 6;
    });
    if (frei) {
      // Antwortknopf: nur der Ausschnitt um die Noten, die Noten genau in der Mitte
      const mitte = (links + rechts) / 2;
      const w = Math.max(rechts - links + 20, mitLinie ? 84 : 44);
      const l0 = mitte - w / 2;
      const linie = mitLinie ? `<line x1="${l0 + 4}" x2="${l0 + w - 4}" y1="${y}" y2="${y}" class="nl"/>` : '';
      return `<svg class="notenbild rhythmusbild rb-frei" viewBox="${l0} 20 ${w} 60" style="max-width:${Math.round(w * 1.3)}px" role="img" aria-label="Rhythmus">${linie}${s}</svg>`;
    }
    const linie = mitLinie ? `<line x1="6" x2="${x}" y1="${y}" y2="${y}" class="nl"/>` : '';
    const breite = x + 8;
    // Mehrere Takte: breiteres Bild, damit die Noten nicht winzig werden
    const max = Math.max(360, breite * 1.25);
    return `<svg class="notenbild rhythmusbild" viewBox="0 0 ${breite} 100" style="max-width:${Math.round(max)}px" role="img" aria-label="Rhythmus">${hinten}${linie}${s}</svg>`;
  },

  /* Ein Baustein, nx = x des ersten Notenkopfs */
  rhythmusZeichen(b, nx, y, halsOben) {
    const hals = hx => `<line x1="${hx + 5.8}" x2="${hx + 5.8}" y1="${y - 1}" y2="${halsOben}" class="nh"/>`;
    const fahne = hx => `<path d="M${hx + 5.8} ${halsOben} q1.5 8 8 12 q3 4 0.5 10" class="nh" fill="none"/>`;
    const achtelpause = px => `<g transform="translate(${px - 5} ${y - 16})"><circle cx="3" cy="3.2" r="2.9" class="np"/>` +
      `<path d="M3 5.6 Q7 6.2 10 1.5 L5.2 19" class="nh" fill="none"/></g>`;
    const halb = 24;
    switch (b) {
      case 'G': return this.kopf(nx, y, true);
      case 'H': return this.kopf(nx, y, true) + hals(nx);
      case 'V': return this.kopf(nx, y) + hals(nx);
      case 'AA': {
        const nx2 = nx + halb;
        return this.kopf(nx, y) + hals(nx) + this.kopf(nx2, y) + hals(nx2) +
          `<rect x="${nx + 5}" y="${halsOben}" width="${nx2 - nx + 1.6}" height="5" class="nb"/>`;
      }
      case 'pA': return achtelpause(nx) + this.kopf(nx + halb, y) + hals(nx + halb) + fahne(nx + halb);
      case 'Ap': return this.kopf(nx, y) + hals(nx) + fahne(nx) + achtelpause(nx + halb);
      case 'Vp': return `<path transform="translate(${nx - 4} ${y - 16})" class="np" ` +
        'd="M2 0 L9 8 L4 14 L10 22 C5 20 2 23 6 29 C-1 25 0 18 6 20 L0 13 L5 7 Z"/>';
      // Auf einer Linie: die halbe Pause liegt auf, die ganze hängt
      case 'Hp': return `<rect x="${nx - 7}" y="${y - 5}" width="14" height="5" class="nb"/>`;
      case 'Gp': return `<rect x="${nx - 7}" y="${y}" width="14" height="5" class="nb"/>`;
    }
    return '';
  },
};

/* Rhythmus-Bausteine (Klasse 5: keine punktierten Noten) */
const RhythmusBausteine = {
  G:  { schlaege: 4, einsaetze: [0],      wort: 'Ganze' },
  H:  { schlaege: 2, einsaetze: [0],      wort: 'Halbe' },
  V:  { schlaege: 1, einsaetze: [0],      wort: 'Viertel' },
  AA: { schlaege: 1, einsaetze: [0, 0.5], wort: 'zwei Achtel' },
  Vp: { schlaege: 1, einsaetze: [],       wort: 'Viertelpause' },
  // Klasse 6 (Rhythmus-Detektiv): halbe und ganze Pause, Achtelpause mit Achtel
  Hp: { schlaege: 2, einsaetze: [],       wort: 'halbe Pause' },
  Gp: { schlaege: 4, einsaetze: [],       wort: 'ganze Pause' },
  pA: { schlaege: 1, einsaetze: [0.5],    wort: 'Achtelpause und Achtel' },
  Ap: { schlaege: 1, einsaetze: [0],      wort: 'Achtel und Achtelpause' },
};

const Rhythmus = {
  /* Zufälliger Takt aus den erlaubten Bausteinen. Halbe nur auf 1 oder 3,
     damit die Taktmitte sichtbar bleibt; nicht nur Pausen. */
  zufall(erlaubt) {
    for (let versuch = 0; versuch < 100; versuch++) {
      const takt = [];
      let pos = 0;
      while (pos < 4) {
        const passt = erlaubt.filter(b => {
          const n = RhythmusBausteine[b].schlaege;
          if (pos + n > 4) return false;
          if (n === 2 && pos % 2) return false;
          return true;
        });
        const b = passt[Math.floor(Math.random() * passt.length)];
        takt.push(b);
        pos += RhythmusBausteine[b].schlaege;
      }
      const toene = this.einsaetze(takt).length;
      if (toene >= 2 && takt.filter(b => b === 'Vp').length <= 2) return takt;
    }
    return ['V', 'V', 'V', 'V'];
  },

  /* Einsatzzeiten in Schlägen ab Taktbeginn */
  einsaetze(takt) {
    const liste = [];
    let pos = 0;
    takt.forEach(b => {
      RhythmusBausteine[b].einsaetze.forEach(e => liste.push(pos + e));
      pos += RhythmusBausteine[b].schlaege;
    });
    return liste;
  },

  kennung(takt) { return this.einsaetze(takt).join(',') + '|' + takt.join(''); },

  /* Spielt einen Takt mit Vorzähler. Gibt die Startzeit (Audio-Uhr) der
     Zählzeit 1 und die Gesamtdauer zurück. */
  abspielen(takt, tempo = 80, vorzaehler = 4) {
    const schlag = 60 / tempo;
    for (let i = 0; i < vorzaehler; i++) Ton.klick(i * schlag, i === 0);
    const beginn = vorzaehler * schlag;
    this.einsaetze(takt).forEach(e => Ton.snare(beginn + e * schlag, e === 0 ? 1.3 : 1));
    for (let i = 0; i < 4; i++) Ton.klick(beginn + i * schlag, i === 0);
    return { beginn: Ton.jetzt() + beginn + 0.02, dauer: beginn + 4 * schlag };
  },

  /* Mehrere Takte (Liste von Takten) mit „schlaege“ Vierteln je Takt */
  einsaetzeTakte(takte, schlaege = 4) {
    return takte.flatMap((t, i) => this.einsaetze(t).map(e => i * schlaege + e));
  },

  /* Mehrere Takte mit einem Takt Vorzähler (2/4: zwei Takte). Snare und Betonung
     wie in der Rhythmus-Werkstatt: die 1 jedes Taktes etwas lauter, das Metronom
     klickt leise mit. Gibt die Dauer in Sekunden zurück. */
  abspielenTakte(takte, tempo = 80, schlaege = 4) {
    const schlag = 60 / tempo;
    const vor = schlaege === 2 ? 4 : schlaege;
    for (let i = 0; i < vor; i++) Ton.klick(i * schlag, i % schlaege === 0);
    const beginn = vor * schlag;
    this.einsaetzeTakte(takte, schlaege).forEach(e => Ton.snare(beginn + e * schlag, e % schlaege === 0 ? 1.3 : 1));
    for (let i = 0; i < takte.length * schlaege; i++) Ton.klick(beginn + i * schlag, i % schlaege === 0);
    return beginn + takte.length * schlaege * schlag + 0.3;
  },
};
