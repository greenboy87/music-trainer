/* Die Spiele. Jedes Spiel liefert Stufen und erzeugt Aufgaben; das Abspielen,
   Antworten, Punkte und Sterne übernimmt app.js.

   Eine Aufgabe ist ein Objekt mit:
     frage      Text über der Aufgabe
     bild       SVG (optional)
     hoeren()   spielt etwas ab, gibt die Dauer in Sekunden zurück (optional)
     optionen   Liste der Antworten (Text oder SVG), richtig = Index
     eigen(el, antwort)  statt optionen: eigene Eingabe; antwort(ok, loesung)
     loesung    Satz, der nach einer falschen Antwort erscheint
     nachher()  läuft nach jeder Antwort (z. B. Note vorspielen)
     tasten     Tastatur-Kürzel je Option (optional, sonst 1, 2, 3 …)          */

const zufall = liste => liste[Math.floor(Math.random() * liste.length)];
const zahl = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const mische = liste => {
  const l = [...liste];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
};

/* Stufen in der Reihenfolge zum Spielen. Neue Stufen hängen hinten an, weil
   gespeicherte Ergebnisse an der Nummer hängen; „reihe“ stellt sie an ihren Platz. */
const stufenReihe = spiel => spiel.reihe || spiel.stufen.map((_, i) => i);

const INTERVALLE = [
  { name: 'Prime', h: 0 },
  { name: 'kleine Sekunde', h: 1 },
  { name: 'große Sekunde', h: 2 },
  { name: 'kleine Terz', h: 3 },
  { name: 'große Terz', h: 4 },
  { name: 'Quarte', h: 5 },
  { name: 'Quinte', h: 7 },
  { name: 'kleine Sexte', h: 8 },
  { name: 'große Sexte', h: 9 },
  { name: 'kleine Septime', h: 10 },
  { name: 'große Septime', h: 11 },
  { name: 'Oktave', h: 12 },
];

/* Intervall hören, dann aus drei Notenbildern das passende wählen. Nur Stammtöne,
   gezählt in Stufen (Terz = zwei Stufen weiter), damit kein Vorzeichen nötig ist.
   Alle drei Bilder beginnen mit demselben Ton. */
const INTERVALL_NAMEN = ['Prime', 'Sekunde', 'Terz', 'Quarte', 'Quinte', 'Sexte', 'Septime', 'Oktave'];
function intervallInNoten(st) {
  const weite = zufall(st.noten);
  // Ablenker: bei „knapp“ die Nachbarintervalle, sonst beliebige aus der Stufe
  const andere = st.noten.filter(w => w !== weite)
    .sort((x, y) => st.knapp ? Math.abs(x - weite) - Math.abs(y - weite) || Math.random() - 0.5 : Math.random() - 0.5)
    .slice(0, 2);
  const reihe = mische([weite, ...andere]);
  const start = zahl(0, 9 - Math.max(...reihe));          // höchstens bis e''
  const unten = { stufe: start, vz: 0 };
  const oben = w => ({ stufe: start + w, vz: 0 });
  return {
    frage: 'Welches Notenbild passt zu dem, was du hörst?',
    hoeren() {
      Ton.klavier(Tonname.midi(unten), 0, 0.8);
      Ton.klavier(Tonname.midi(oben(weite)), 0.85, 1);
      return 1.9;
    },
    optionen: reihe.map(w => Notenbild.noten([unten, oben(w)])),
    notenwahl: true,
    richtig: reihe.indexOf(weite),
    loesung: `Das war eine ${INTERVALL_NAMEN[weite]}: von ${Stufe.vollerName(start)} nach ${Stufe.vollerName(start + weite)}.`,
  };
}

/* Akkorde: Aufbau in Halbtönen über dem Grundton */
const AKKORDE = {
  dur: { name: 'Dur', satz: 'Dur', h: [0, 4, 7], bau: 'große Terz + kleine Terz' },
  moll: { name: 'Moll', satz: 'Moll', h: [0, 3, 7], bau: 'kleine Terz + große Terz' },
  ueb: { name: 'übermäßig', satz: 'ein übermäßiger Akkord', h: [0, 4, 8], bau: 'zwei große Terzen' },
  verm: { name: 'vermindert', satz: 'ein verminderter Akkord', h: [0, 3, 6], bau: 'zwei kleine Terzen' },
  d7: { name: 'Dominantseptakkord', knopf: 'Dominant&shy;septakkord', satz: 'ein Dominantseptakkord', h: [0, 4, 7, 10], bau: 'Dur-Dreiklang + kleine Septime' },
  m7: { name: 'kleiner Moll-Septakkord', satz: 'ein kleiner Moll-Septakkord', h: [0, 3, 7, 10], bau: 'Moll-Dreiklang + kleine Septime' },
};

/* ---------------- Rhythmus-Detektiv ----------------
   Die falschen Antworten entstehen aus der richtigen: an genau einer Stelle
   wird etwas geändert (Viertel ↔ zwei Achtel, Note ↔ Pause, zwei Bausteine
   tauschen, Halbe ↔ zwei Viertel …). So bleiben Notendichte und Notenzahl
   fast gleich, und man muss wirklich hinhören. Ein Stück ist eine Liste von
   Takten, ein Takt eine Liste von Bausteinen (RhythmusBausteine). */
const Detektiv = {
  dauer: b => RhythmusBausteine[b].schlaege,
  toene: takte => Rhythmus.einsaetzeTakte(takte).length,
  klang: (takte, schlaege) => Rhythmus.einsaetzeTakte(takte, schlaege).join(','),

  /* Passt ein Baustein an diese Stelle? Halbe (und halbe Pause) nicht über die
     Taktmitte im 4/4-Takt, im 2/4-Takt nur auf der 1; Ganze nur als ganzer 4/4-Takt. */
  passt(b, pos, schlaege) {
    const n = this.dauer(b);
    if (pos + n > schlaege) return false;
    if (n === 4) return pos === 0 && schlaege === 4;
    if (n === 2 && schlaege === 4 && pos % 2) return false;
    return true;
  },

  gueltig(takt, schlaege, erlaubt) {
    let pos = 0;
    for (const b of takt) {
      if (!erlaubt.includes(b) || !this.passt(b, pos, schlaege)) return false;
      pos += this.dauer(b);
    }
    if (pos !== schlaege) return false;
    const stumm = takt.filter(b => !RhythmusBausteine[b].einsaetze.length).reduce((s, b) => s + this.dauer(b), 0);
    // Höchstens die Hälfte Pausen, mindestens ein Ton
    return Rhythmus.einsaetze(takt).length >= 1 && stumm * 2 <= schlaege;
  },

  takt(erlaubt, schlaege) {
    for (let v = 0; v < 100; v++) {
      const takt = [];
      let pos = 0;
      while (pos < schlaege) {
        const moeglich = erlaubt.filter(b => this.passt(b, pos, schlaege));
        if (!moeglich.length) break;
        const b = zufall(moeglich);
        takt.push(b);
        pos += this.dauer(b);
      }
      // Ganze Takte selten, sonst mindestens zwei Töne
      if (takt.length === 1 && Math.random() < 0.6) continue;
      if (this.gueltig(takt, schlaege, erlaubt) && (takt.length === 1 || Rhythmus.einsaetze(takt).length >= 2)) return takt;
    }
    return Array(schlaege).fill('V');
  },

  stueck(st, anzahl, schlaege) {
    const mitNeu = st.neu && Math.random() < 0.8;
    for (let v = 0; v < 200; v++) {
      const takte = Array.from({ length: anzahl }, () => this.takt(st.bausteine, schlaege));
      if (mitNeu && !takte.flat().some(b => st.neu.includes(b))) continue;
      // Mehrere Takte: nicht alle gleich
      if (anzahl > 1 && new Set(takte.map(t => t.join())).size === 1) continue;
      return takte;
    }
    return Array.from({ length: anzahl }, () => this.takt(st.bausteine, schlaege));
  },

  /* Alle Takte, die an genau einer Stelle anders sind */
  varianten(takt, schlaege, erlaubt) {
    const ersetzen = {
      V: [['AA'], ['Vp'], ['pA'], ['Ap']],
      AA: [['V'], ['pA'], ['Ap']],
      Vp: [['V']],
      pA: [['AA'], ['Ap'], ['V']],
      Ap: [['AA'], ['pA']],
      H: [['V', 'V'], ['Hp']],
      Hp: [['H'], ['V', 'Vp'], ['Vp', 'V']],
      G: [['H', 'H']],
    };
    const liste = [];
    takt.forEach((b, i) => (ersetzen[b] || []).forEach(neu => liste.push([...takt.slice(0, i), ...neu, ...takt.slice(i + 1)])));
    for (let i = 0; i + 1 < takt.length; i++) {
      const [x, y] = [takt[i], takt[i + 1]];
      if (x !== y) liste.push([...takt.slice(0, i), y, x, ...takt.slice(i + 2)]);
      if (x === 'V' && y === 'V') liste.push([...takt.slice(0, i), 'H', ...takt.slice(i + 2)]);
      if (x === 'H' && y === 'H') liste.push(['G']);
    }
    return liste.filter(t => this.gueltig(t, schlaege, erlaubt));
  },

  /* Eine Änderung in einem zufälligen Takt; gibt das neue Stück und den Takt zurück */
  aendern(takte, schlaege, erlaubt) {
    const reihe = mische(takte.map((_, i) => i));
    for (const k of reihe) {
      const v = this.varianten(takte[k], schlaege, erlaubt)
        .filter(t => Rhythmus.einsaetze(t).join() !== Rhythmus.einsaetze(takte[k]).join());
      if (v.length) return { takte: takte.map((t, i) => (i === k ? zufall(v) : t)), takt: k };
    }
    return null;
  },

  /* „anzahl“ verschieden klingende Stücke mit je einer Änderung */
  aehnliche(takte, anzahl, schlaege, erlaubt) {
    const gesehen = new Set([this.klang(takte, schlaege)]);
    const n = this.toene(takte);
    const liste = [];
    for (let v = 0; v < 200 && liste.length < anzahl; v++) {
      const neu = this.aendern(takte, schlaege, erlaubt);
      if (!neu) break;
      const k = this.klang(neu.takte, schlaege);
      if (gesehen.has(k) || Math.abs(this.toene(neu.takte) - n) > 1) continue;
      gesehen.add(k);
      liste.push(neu.takte);
    }
    return liste.length === anzahl ? liste : null;
  },

  schlaege: st => zufall(st.schlaege || [4]),
  tempo: (st, schlaege) => (st.tempo || 80) + (schlaege === 3 ? 8 : 0),

  /* Hören und aus mehreren Notenbildern das richtige wählen */
  waehlen(st) {
    const schlaege = this.schlaege(st);
    const takte = this.stueck(st, st.takte || 1, schlaege);
    const andere = this.aehnliche(takte, (st.optionen || 3) - 1, schlaege, st.bausteine);
    if (!andere) return null;
    const reihe = mische([takte, ...andere]);
    const tempo = this.tempo(st, schlaege);
    return {
      frage: `Welchen Rhythmus hörst du? Die Antworten unterscheiden sich nur an einer Stelle. (Erst ${schlaege === 2 ? 4 : schlaege} Klicks zum Einzählen)`,
      hoeren: () => Rhythmus.abspielenTakte(takte, tempo, schlaege),
      optionen: reihe.map(t => Notenbild.rhythmus(t, { schlaege })),
      breit: true,
      lang: takte.length > 2,
      richtig: reihe.indexOf(takte),
      loesung: 'Der richtige Rhythmus ist jetzt grün markiert. Hör noch einmal hin, wo er sich von deinem unterscheidet.',
    };
  },

  /* Ein Baustein fehlt: welcher gehört in die Lücke? Alle Antworten sind gleich lang. */
  luecke(st) {
    const schlaege = this.schlaege(st);
    const takte = this.stueck(st, st.takte || 1, schlaege);
    const stellen = [];
    takte.forEach((t, ti) => t.forEach((b, bi) => { if (this.dauer(b) <= 2) stellen.push([ti, bi]); }));
    // Lieber eine Stelle, an der etwas klingt
    const klingend = stellen.filter(([ti, bi]) => RhythmusBausteine[takte[ti][bi]].einsaetze.length);
    const [ti, bi] = zufall(klingend.length && Math.random() < 0.8 ? klingend : stellen);
    const soll = takte[ti][bi];
    const n = this.dauer(soll);
    const einer = st.bausteine.filter(b => this.dauer(b) === 1);
    const kandidaten = n === 1 ? einer.map(b => [b])
      : [...st.bausteine.filter(b => this.dauer(b) === 2).map(b => [b]), ...einer.flatMap(x => einer.map(y => [x, y]))];
    const mit = teil => takte.map((t, i) => (i === ti ? [...t.slice(0, bi), ...teil, ...t.slice(bi + 1)] : t));
    const gesehen = new Set([this.klang(takte, schlaege)]);
    const tSoll = Rhythmus.einsaetze([soll]).length;
    const andere = [];
    mische(kandidaten).forEach(teil => {
      const neu = mit(teil);
      const k = this.klang(neu, schlaege);
      if (andere.length >= (st.optionen || 3) - 1 || gesehen.has(k)) return;
      if (!this.gueltig(neu[ti], schlaege, st.bausteine)) return;
      if (Math.abs(Rhythmus.einsaetze(teil).length - tSoll) > 1) return;
      gesehen.add(k);
      andere.push(teil);
    });
    if (andere.length < 2) return null;
    const reihe = mische([[soll], ...andere]);
    const richtig = reihe.findIndex(t => t.length === 1 && t[0] === soll);
    const tempo = this.tempo(st, schlaege);
    return {
      frage: 'Was gehört in die Lücke? Hör genau hin.',
      bild: Notenbild.rhythmus(takte, { schlaege, luecke: [ti, bi], linie: false }),
      hoeren: () => Rhythmus.abspielenTakte(takte, tempo, schlaege),
      optionen: reihe.map(t => Notenbild.rhythmus(t, { frei: true, eng: true, linie: false })),
      richtig,
      loesung: `In die Lücke gehört: ${RhythmusBausteine[soll].wort}.`,
      nachher() { document.getElementById('r-bild').innerHTML = Notenbild.rhythmus(takte, { schlaege, markiert: ti, linie: false }); },
    };
  },

  /* Die Noten stehen da, gespielt wird in einem Takt etwas anderes: in welchem? */
  fehler(st) {
    const schlaege = this.schlaege(st);
    const anzahl = st.fehlerTakte || st.takte || 2;
    const takte = this.stueck(st, anzahl, schlaege);
    const neu = this.aendern(takte, schlaege, st.bausteine);
    if (!neu || Math.abs(this.toene(neu.takte) - this.toene(takte)) > 1) return null;
    const tempo = this.tempo(st, schlaege);
    return {
      frage: 'Detektiv-Auftrag: In einem Takt wird etwas anderes gespielt, als dasteht. In welchem?',
      bild: Notenbild.rhythmus(takte, { schlaege }),
      hoeren: () => Rhythmus.abspielenTakte(neu.takte, tempo, schlaege),
      optionen: takte.map((_, i) => `Takt ${i + 1}`),
      richtig: neu.takt,
      loesung: `In Takt ${neu.takt + 1} klang es anders. Oben siehst du, was gespielt wurde.`,
      nachher() {
        document.getElementById('r-bild').innerHTML = '<p class="hint">Notiert:</p>' + Notenbild.rhythmus(takte, { schlaege, markiert: neu.takt }) +
          `<p class="hint">Gespielt wurde:</p>` + Notenbild.rhythmus(neu.takte, { schlaege, markiert: neu.takt });
      },
    };
  },
};

const SPIELE = [
  /* ---------------- Hören ---------------- */
  {
    id: 'hoch-tief',
    bereich: 'Hören',
    titel: 'Hoch oder tief?',
    text: 'Zwei Töne erklingen nacheinander. War der zweite höher oder tiefer?',
    icon: 'stairs',
    farbe: '#5eead4',
    stufen: [
      { name: 'Große Sprünge', min: 5, max: 12 },
      { name: 'Kleine Schritte', min: 2, max: 4 },
      { name: 'Ganz knapp', min: 1, max: 2, gleich: true },
    ],
    aufgabe(st) {
      const a = zahl(55, 74);
      const gleich = st.gleich && Math.random() < 0.25;
      const hoch = Math.random() < 0.5;
      const b = gleich ? a : a + (hoch ? 1 : -1) * zahl(st.min, st.max);
      const optionen = st.gleich ? ['Tiefer', 'Gleich', 'Höher'] : ['Tiefer', 'Höher'];
      const wort = gleich ? 'Gleich' : hoch ? 'Höher' : 'Tiefer';
      return {
        frage: 'Ist der zweite Ton höher oder tiefer als der erste?',
        hoeren() { Ton.klavier(a, 0, 0.8); Ton.klavier(b, 0.9, 0.8); return 1.8; },
        optionen,
        richtig: optionen.indexOf(wort),
        loesung: gleich ? 'Beide Töne waren gleich hoch.' : `Der zweite Ton war ${wort.toLowerCase()}.`,
      };
    },
  },

  {
    id: 'intervall',
    bereich: 'Hören',
    titel: 'Intervall-Ohr',
    text: 'Wie weit liegen die beiden Töne auseinander? Erkenne das Intervall.',
    icon: 'ear',
    farbe: '#c4b5fd',
    stufen: [
      { name: 'Prime, Quinte, Oktave', liste: ['Prime', 'Quinte', 'Oktave'] },
      { name: 'Dazu Terz und Quarte', liste: ['Prime', 'große Terz', 'Quarte', 'Quinte', 'Oktave'] },
      { name: 'Alle Intervalle', liste: INTERVALLE.slice(1).map(i => i.name), harmonisch: true },
      { name: 'In Noten: Sekunde bis Quinte', noten: [1, 2, 3, 4] },
      { name: 'In Noten: bis zur Oktave', noten: [1, 2, 3, 4, 5, 6, 7], knapp: true },
    ],
    aufgabe(st) {
      if (st.noten) return intervallInNoten(st);
      const name = zufall(st.liste);
      const h = INTERVALLE.find(i => i.name === name).h;
      const grund = zahl(55, 67);
      const zusammen = st.harmonisch && Math.random() < 0.4;
      return {
        frage: zusammen ? 'Beide Töne klingen zusammen. Welches Intervall ist das?'
                        : 'Welches Intervall hörst du?',
        hoeren() {
          if (zusammen) { Ton.akkord([grund, grund + h], 0, 1.6, 0.25); return 1.8; }
          Ton.klavier(grund, 0, 0.8); Ton.klavier(grund + h, 0.85, 1); return 1.9;
        },
        optionen: st.liste,
        richtig: st.liste.indexOf(name),
        loesung: `Das war eine ${name} (${h} Halbtonschritte).`,
      };
    },
  },

  {
    id: 'dur-moll',
    bereich: 'Hören',
    titel: 'Akkorde hören',
    text: 'Dur klingt hell, Moll dunkel. In den höheren Stufen kommen übermäßig, vermindert und Septakkorde dazu.',
    icon: 'sun',
    farbe: '#fcd34d',
    // Die ersten drei Stufen hießen früher nur „Akkord zusammen“ usw.; Reihenfolge nicht ändern (gespeicherte Ergebnisse)
    stufen: [
      { name: 'Junior', info: 'Dur oder Moll – Akkord zusammen', art: 'akkord' },
      { name: 'Anfänger', info: 'Dur oder Moll – Akkord gebrochen', art: 'gebrochen' },
      { name: 'Fortgeschritten', info: 'Dur oder Moll – kurze Melodie', art: 'melodie' },
      { name: 'Profi', info: 'Dur, Moll, übermäßig, vermindert', art: 'gebrochen', typen: ['dur', 'moll', 'ueb', 'verm'] },
      { name: 'Profi 2', info: 'Dazu Dominantseptakkord und kleiner Moll-Septakkord', art: 'gebrochen', typen: Object.keys(AKKORDE) },
      { name: 'Profi 3', info: 'Alle sechs, nur zusammen und in wechselnder Lage', art: 'akkord', umkehrung: true, typen: Object.keys(AKKORDE) },
    ],
    aufgabe(st, vorher) {
      const typen = st.typen || ['dur', 'moll'];
      let typ;
      do { typ = zufall(typen); } while (typen.length > 2 && typ === vorher?.typ && Math.random() < 0.7);
      const akk = AKKORDE[typ];
      const g = zahl(53, 62);
      let toene = akk.h.map(h => g + h);
      // Profi 3: unterster Ton eine Oktave nach oben (Umkehrung), manchmal zweimal
      if (st.umkehrung) for (let k = zahl(0, 2); k > 0; k--) toene = [...toene.slice(1), toene[0] + 12];
      const optionen = typen.map(t => AKKORDE[t].knopf || AKKORDE[t].name);
      return {
        typ,
        frage: st.art === 'melodie' ? 'Steht die Melodie in Dur oder in Moll?'
             : typen.length > 2 ? 'Welcher Akkord ist das?' : 'Ist der Akkord Dur oder Moll?',
        hoeren() {
          if (st.art === 'akkord') { Ton.akkord(toene, 0, 1.8); return 2; }
          if (st.art === 'gebrochen') {
            // Töne von unten nach oben nacheinander, dann der Akkord zusammen
            toene.forEach((m, i) => Ton.klavier(m, i * 0.45, 0.6));
            const t = toene.length * 0.45 + 0.15;
            Ton.akkord(toene, t, 1.4, 0.15);
            return t + 1.5;
          }
          const dur = typ === 'dur';
          const tonleiter = dur ? [0, 2, 4, 5, 7, 5, 4, 2, 0] : [0, 2, 3, 5, 7, 5, 3, 2, 0];
          tonleiter.forEach((h, i) => Ton.klavier(g + h, i * 0.35, 0.45));
          return tonleiter.length * 0.35 + 0.4;
        },
        optionen,
        drei: optionen.length > 4,
        richtig: typen.indexOf(typ),
        loesung: typen.length > 2 ? `Das war ${akk.satz}: ${akk.bau}.`
               : typ === 'dur' ? 'Das war Dur: große Terz unten.' : 'Das war Moll: kleine Terz unten.',
      };
    },
  },

  {
    id: 'hoerdiktat',
    bereich: 'Hören',
    titel: 'Hördiktat',
    text: 'Eine kurze Melodie erklingt, der erste Ton steht schon da. Setze die anderen Noten ins Notensystem.',
    icon: 'pen',
    farbe: '#a5b4fc',
    /* Wie auf der Folie „Tonwiederholung, Tonschritt, Tonsprung“: erst nur
       Schritte, dann Terzen, dann Sprünge bis zur Quinte. Nur Stammtöne c'–c''.
       Bis Fortgeschritten erklingt jede gesetzte Note, bei Profi nicht mehr. */
    stufen: [
      { name: 'Junior', info: 'Drei Töne, nur Schritte', laenge: 3, abstaende: [0, 1] },
      { name: 'Anfänger', info: 'Vier Töne, dazu Terzen', laenge: 4, abstaende: [0, 1, 2] },
      { name: 'Fortgeschritten', info: 'Fünf Töne, Sprünge bis zur Quinte', laenge: 5, abstaende: [1, 2, 3, 4] },
      { name: 'Profi', info: 'Sechs Töne, Noten klingen beim Setzen nicht mit', laenge: 6, abstaende: [1, 2, 3, 4], stumm: true },
    ],
    aufgabe(st) {
      // Melodie aus Stufen (c' = 0 … c'' = 7), jeder Schritt aus den erlaubten Abständen
      let toene;
      do {
        toene = [zahl(0, 7)];
        while (toene.length < st.laenge) {
          const moeglich = [];
          st.abstaende.forEach(a => [a, -a].forEach(d => {
            const n = toene[toene.length - 1] + d;
            if (n >= 0 && n <= 7 && !moeglich.includes(n)) moeglich.push(n);
          }));
          toene.push(zufall(moeglich));
        }
      } while (new Set(toene).size < 2);   // nicht nur ein einziger Ton
      return {
        frage: 'Hör zu und schreibe die Melodie auf. Der erste Ton ist vorgegeben – er leuchtet beim Abspielen.',
        hoeren() {
          Diktat.spielen(toene, [0]);   // nur der vorgegebene erste Ton leuchtet mit
          return toene.length * Diktat.ABSTAND + 0.4;
        },
        loesung: `Richtig wäre: ${toene.map(t => Stufe.vollerName(t)).join(' – ')}.`,
        eigen(el, antwort, aufgabe) { Diktat.starte(el, toene, antwort, aufgabe, st); },
      };
    },
  },

  /* ---------------- Rhythmus ---------------- */
  {
    id: 'rhythmus-detektiv',
    bereich: 'Rhythmus',
    titel: 'Rhythmus-Detektiv',
    text: 'Hör genau hin: Welcher Rhythmus war es, was gehört in die Lücke, in welchem Takt steckt der Fehler? Stufen für Klasse 5, Klasse 6 und Profis. Wählen und Fehler-Finden kommen nie in derselben Stufe vor.',
    icon: 'music',
    farbe: '#fda4af',
    /* Die ersten drei Stufen gab es schon (Ergebnisse hängen an der Nummer).
       Klasse 5 nur G H V AA Vp (keine Punktierungen). Klasse 6 ist Klasse 5
       etwas schwerer. Profi (Stufen 12–17): dazu halbe Pause, Achtelpause mit
       Achtel, Zeilen mit vier Takten, Tempo 90 und mehr. Stufennamen ohne Bezug auf
       Stücke oder Hefte (keine Mozart-, Rondo- oder Drumscripts-Titel).
       „Ap“ (Achtel + Achtelpause) fehlt mit Absicht: mit der Snare klingt es wie eine Viertel.
         arten     welche Übungen in der Stufe vorkommen (wählen, lücke, fehler)
         takte     Takte beim Wählen und bei der Lücke; fehlerTakte beim Fehler
         neu       mindestens einer davon kommt meistens vor                    */
    stufen: [
      { name: 'Klasse 5 · 1', info: 'Halbe und Viertel', bausteine: ['H', 'V'] },
      { name: 'Klasse 5 · 2', info: 'Dazu Achtel', bausteine: ['H', 'V', 'AA'], neu: ['AA'] },
      { name: 'Klasse 5 · 3', info: 'Dazu Viertelpausen', bausteine: ['H', 'V', 'AA', 'Vp'], neu: ['Vp'], arten: ['waehlen', 'waehlen', 'luecke'] },
      { name: 'Klasse 5 · 4', info: 'Mit Ganzen – zwei Takte', bausteine: ['G', 'H', 'V', 'AA', 'Vp'], neu: ['G', 'AA'], takte: 2, arten: ['waehlen', 'luecke'] },
      { name: 'Klasse 5 · 5', info: 'Viertel und Achtel – ein Takt', bausteine: ['V', 'AA'] },
      { name: 'Klasse 5 · 7', info: 'Vier Takte – finde den Fehler', bausteine: ['G', 'H', 'V', 'AA', 'Vp'], neu: ['AA', 'Vp'], fehlerTakte: 4, schlaege: [4, 4, 3], arten: ['fehler'] },
      // Klasse 6: wie Klasse 5, etwas schwerer (schneller, mehr Antworten, früher gemischt)
      { name: 'Klasse 6 · 1', info: 'Halbe, Viertel und Achtel', bausteine: ['H', 'V', 'AA'], neu: ['AA'], tempo: 84 },
      { name: 'Klasse 6 · 2', info: 'Dazu Viertelpausen – vier Antworten', bausteine: ['H', 'V', 'AA', 'Vp'], neu: ['Vp'], optionen: 4, tempo: 84, arten: ['waehlen', 'luecke'] },
      { name: 'Klasse 6 · 3', info: 'Mit Ganzen – zwei Takte', bausteine: ['G', 'H', 'V', 'AA', 'Vp'], neu: ['G', 'AA', 'Vp'], takte: 2, tempo: 84, arten: ['waehlen', 'luecke'] },
      { name: 'Klasse 6 · 4', info: '4/4 und 3/4 – zwei Takte', bausteine: ['H', 'V', 'AA', 'Vp'], neu: ['AA', 'Vp'], takte: 2, schlaege: [4, 3], tempo: 84, arten: ['waehlen', 'luecke'] },
      { name: 'Klasse 6 · 5', info: 'Zwei Takte, vier Antworten', bausteine: ['G', 'H', 'V', 'AA', 'Vp'], neu: ['AA', 'Vp'], takte: 2, optionen: 4, tempo: 88, arten: ['waehlen', 'luecke'] },
      { name: 'Klasse 6 · 6', info: 'Vier Takte – finde den Fehler', bausteine: ['G', 'H', 'V', 'AA', 'Vp'], neu: ['AA', 'Vp'], fehlerTakte: 4, schlaege: [4, 4, 3], tempo: 88, arten: ['fehler'] },
      // Profi (bis 11.2026 die Stufen für Klasse 6): halbe Pause, Achtelpause, vier Takte, schneller
      { name: 'Profi · 1', info: 'Viertel und Achtel, vier Antworten', bausteine: ['V', 'AA'], optionen: 4, tempo: 90 },
      { name: 'Profi · 2', info: 'Mit Viertelpausen – zwei Takte', bausteine: ['V', 'AA', 'Vp'], neu: ['Vp'], takte: 2, optionen: 4, tempo: 90, arten: ['waehlen', 'luecke'] },
      { name: 'Profi · 3', info: 'Ganze bis Achtel, dazu die halbe Pause', bausteine: ['G', 'H', 'V', 'AA', 'Vp', 'Hp'], neu: ['Hp', 'Vp'], takte: 2, optionen: 4, tempo: 90, arten: ['waehlen', 'luecke'] },
      { name: 'Profi · 4', info: 'Achtelpause: die Achtel kommt erst auf „und“', bausteine: ['H', 'V', 'AA', 'Vp', 'pA'], neu: ['pA'], takte: 2, optionen: 4, tempo: 90, arten: ['waehlen', 'luecke'] },
      { name: 'Profi · 5', info: 'Vier Takte', bausteine: ['H', 'V', 'AA', 'Vp'], neu: ['AA'], takte: 4, tempo: 92 },
      { name: 'Profi · 6', info: 'Alles, 3/4 und 4/4, schneller', bausteine: ['G', 'H', 'V', 'AA', 'Vp', 'Hp', 'pA'], neu: ['pA', 'Vp'], takte: 2, schlaege: [4, 3], optionen: 4, tempo: 104, arten: ['waehlen', 'luecke'] },
      // Nr. 18 (11.2026): früher steckte das Wählen mit vier Antworten in Klasse 5 · 7 (Fehler finden)
      { name: 'Klasse 5 · 6', info: 'Zwei Takte, vier Antworten', bausteine: ['G', 'H', 'V', 'AA', 'Vp'], neu: ['AA', 'Vp'], takte: 2, schlaege: [4, 4, 3], optionen: 4 },
      // Nr. 19: Fehler finden für Profis (vorher in Profi · 3, 5 und 6 eingestreut)
      { name: 'Profi · 7', info: 'Vier Takte – finde den Fehler', bausteine: ['G', 'H', 'V', 'AA', 'Vp', 'Hp', 'pA'], neu: ['pA', 'Vp'], fehlerTakte: 4, schlaege: [4, 3], tempo: 96, arten: ['fehler'] },
    ],
    // Klasse 5 · 6 (Nr. 18) kommt vor das Fehler-Finden (Nr. 5); Fehler-Finden nie mit Wählen
    // in einer Stufe mischen – das verwirrt (einmal den falschen, einmal den gehörten Takt antippen)
    reihe: [0, 1, 2, 3, 4, 18, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19],
    aufgabe(st, vorher) {
      const arten = st.arten || ['waehlen'];
      let art = zufall(arten);
      if (arten.length > 1 && art === vorher?.art && Math.random() < 0.5) art = zufall(arten);
      for (let v = 0; v < 30; v++) {
        const a = Detektiv[art](st);
        if (a) return { ...a, art };
      }
      return { ...Detektiv.waehlen({ ...st, takte: 1, optionen: 3 }), art: 'waehlen' };
    },
  },

  {
    id: 'rhythmus-echo',
    bereich: 'Rhythmus',
    titel: 'Rhythmus-Echo',
    text: 'Hör dir den Takt an und klopfe ihn danach genau nach – auf die große Fläche oder mit der Leertaste.',
    icon: 'hand',
    farbe: '#86efac',
    stufen: [
      { name: 'Halbe und Viertel', bausteine: ['H', 'V'], tempo: 72, zeigen: true },
      { name: 'Dazu Achtel', bausteine: ['H', 'V', 'AA'], tempo: 76, zeigen: true },
      { name: 'Nur nach Gehör', bausteine: ['H', 'V', 'AA', 'Vp'], tempo: 80, zeigen: false },
    ],
    aufgabe(st) {
      const takt = Rhythmus.zufall(st.bausteine);
      return {
        frage: st.zeigen ? 'Hör zu und klopfe den Rhythmus nach.' : 'Hör gut zu – dann klopfst du nach. Die Noten siehst du erst danach.',
        bild: st.zeigen ? Notenbild.rhythmus(takt) : null,
        loesung: 'So hätte es klingen sollen – oben siehst du die Noten.',
        eigen(el, antwort, aufgabe) { RhythmusEcho.starte(el, takt, st.tempo, antwort, aufgabe); },
        nachLoesung: () => Notenbild.rhythmus(takt),
      };
    },
  },

  {
    id: 'taktfuehler',
    bereich: 'Rhythmus',
    titel: 'Taktgefühl',
    text: 'Wo ist die Eins? Zähle mit und finde heraus, ob ein 2er-, 3er- oder 4er-Takt erklingt.',
    icon: 'wave',
    farbe: '#fdba74',
    stufen: [
      { name: 'Mit Betonung', art: 'klick', tempo: 96 },
      { name: 'Mit Begleitung', art: 'begleitung', tempo: 100 },
      { name: 'Schnell', art: 'begleitung', tempo: 138 },
    ],
    aufgabe(st) {
      const takt = zufall([2, 3, 4]);
      const schlag = 60 / st.tempo;
      const schlaege = takt * Math.ceil(12 / takt);
      const grund = zufall([48, 50, 53, 55]);
      return {
        frage: 'Welche Taktart hörst du?',
        hoeren() {
          for (let i = 0; i < schlaege; i++) {
            const eins = i % takt === 0;
            if (st.art === 'klick') Ton.snare(i * schlag, eins ? 1.5 : 0.5);
            else if (eins) Ton.klavier(grund - 12, i * schlag, schlag * 0.9, 0.4);
            else Ton.akkord([grund + 4, grund + 7, grund + 12], i * schlag, schlag * 0.35, 0.09);
          }
          return schlaege * schlag + 0.4;
        },
        optionen: ['2er-Takt', '3er-Takt', '4er-Takt'],
        richtig: takt - 2,
        loesung: `Das war ein ${takt}er-Takt: ${Array.from({ length: takt }, (_, i) => i + 1).join(' – ')}.`,
      };
    },
  },
];

/* Eingabe fürs Hördiktat: ein Notensystem mit einer Spalte je Ton. Tippen
   setzt die Note in die Spalte, auf die getippt wurde (verschieben durch
   Ziehen oder erneutes Tippen). Die erste Spalte ist vorgegeben. Nach dem
   Prüfen erklingt erst das Original, dann die eigene Version; die klingende
   Spalte leuchtet dabei. */
const Diktat = {
  SPALTE: 50, X0: 85, VON: -3, BIS: 15,
  ABSTAND: 0.65,          // Sekunden zwischen zwei Tönen
  el: null,

  /* Spielt eine Tonfolge; die Spalten in „leuchten“ (Standard: alle) leuchten mit */
  spielen(toene, leuchten, start = 0) {
    toene.forEach((t, i) => {
      const ab = start + i * this.ABSTAND;
      Ton.klavier(Stufe.midi(t), ab, 0.6, 0.28);
      if (!leuchten || leuchten.includes(i)) {
        App.spaeter(() => this.leuchte(i, true), ab * 1000 + 20);
        App.spaeter(() => this.leuchte(i, false), (ab + this.ABSTAND * 0.9) * 1000);
      }
    });
    return toene.length * this.ABSTAND;
  },

  leuchte(i, an) {
    this.el?.querySelector(`.diktat-spalte[data-i="${i}"]`)?.classList.toggle('klingt', an);
  },

  starte(el, soll, antwort, aufgabe, st) {
    const n = soll.length;
    const breite = this.X0 + n * this.SPALTE;
    const ist = [soll[0], ...Array(n - 1).fill(null)];
    const mitKlang = !st.stumm;
    let fertig = false;
    this.el = el;
    el.innerHTML = `
      <div class="diktat">
        <svg class="notenbild diktat-system" viewBox="0 0 ${breite} 120" style="max-width:${170 + n * 80}px" role="img" aria-label="Notensystem zum Antippen">
          ${Notenbild.linien(4, breite - 6)}${Notenbild.schluessel('violin')}
          <g class="diktat-spalten"></g><g class="diktat-noten"></g>
        </svg>
        <p class="hint diktat-phase">Tippe für jeden Ton in seine Spalte. Daneben tippen oder ziehen verschiebt ihn.
          ${mitKlang ? '' : '<strong>Profi: Die Noten klingen beim Setzen nicht mit.</strong>'}</p>
        <button type="button" class="primary diktat-pruefen" disabled>${Icons.raw('check')}Prüfen</button>
      </div>`;
    const svg = el.querySelector('svg');
    const knopf = el.querySelector('.diktat-pruefen');
    const phase = el.querySelector('.diktat-phase');
    const x = i => this.X0 - 10 + i * this.SPALTE;

    const zeichnen = (ergebnis) => {
      const naechste = ist.indexOf(null);
      // Auch die vorgegebene Spalte hat ein (unsichtbares) Feld, damit sie beim Abspielen leuchten kann
      el.querySelector('.diktat-spalten').innerHTML = soll.map((_, i) =>
        `<rect x="${x(i) - 20}" y="4" width="40" height="112" rx="6" data-i="${i}"
           class="diktat-spalte${i === 0 ? ' vorgabe' : ''}${i === naechste && !ergebnis ? ' dran' : ''}"/>`).join('');
      el.querySelector('.diktat-noten').innerHTML = ist.map((st, i) => {
        if (st === null) return '';
        const y = Notenbild.yVon(st, 'violin');
        const klasse = i === 0 ? 'diktat-vorgabe' : ergebnis ? (ergebnis[i] ? 'diktat-gut' : 'diktat-falsch') : 'diktat-eigen';
        let s = `<g class="${klasse}">${Notenbild.hilfslinien(x(i), y)}${Notenbild.kopf(x(i), y, true)}</g>`;
        if (ergebnis && !ergebnis[i]) {
          const ry = Notenbild.yVon(soll[i], 'violin');
          s += `<g class="diktat-gut">${Notenbild.hilfslinien(x(i) + 14, ry)}${Notenbild.kopf(x(i) + 14, ry, true)}</g>`;
        }
        return s;
      }).join('');
      knopf.disabled = fertig || ist.includes(null);
    };

    const ort = e => {
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      const q = p.matrixTransform(svg.getScreenCTM().inverse());
      const spalte = Math.round((q.x - (this.X0 - 10)) / this.SPALTE);
      const stufe = Math.round((Notenbild.UNTEN - q.y) / (Notenbild.ABSTAND / 2)) + Notenbild.UNTERSTE.violin;
      return { spalte: Math.max(1, Math.min(n - 1, spalte)), stufe: Math.max(this.VON, Math.min(this.BIS, stufe)) };
    };

    let gezogen = null;
    const setzen = (e, neu) => {
      const o = ort(e);
      const spalte = gezogen ?? o.spalte;
      if (ist[spalte] === o.stufe && !neu) return;
      ist[spalte] = o.stufe;
      if (mitKlang) Ton.klavier(Stufe.midi(o.stufe), 0, 0.45, 0.22);
      zeichnen();
    };
    svg.addEventListener('pointerdown', e => {
      if (fertig) return;
      e.preventDefault();
      svg.setPointerCapture(e.pointerId);
      setzen(e, true);
      gezogen = ort(e).spalte;
    });
    svg.addEventListener('pointermove', e => { if (gezogen !== null && !fertig) setzen(e, false); });
    svg.addEventListener('pointerup', () => { gezogen = null; });

    knopf.addEventListener('click', () => {
      if (fertig || ist.includes(null)) return;
      fertig = true;
      const ergebnis = soll.map((t, i) => ist[i] === t);
      const ok = ergebnis.every(Boolean);
      zeichnen(ergebnis);
      el.classList.add('gesperrt');
      // Erst das Original, nach einer Pause die eigene Version
      Ton.stopp();
      const pause = 0.9;
      const dauer = this.ABSTAND * n;
      phase.innerHTML = `${Icons.raw('volume')}<strong>Original</strong>`;
      this.spielen(soll, null, 0.2);
      App.spaeter(() => { phase.innerHTML = `${Icons.raw('volume')}<strong>Deine Version</strong>`; }, (0.2 + dauer + pause / 2) * 1000);
      this.spielen(ist, null, 0.2 + dauer + pause);
      App.spaeter(() => { phase.textContent = ok ? 'Beide klingen gleich.' : 'Hörst du den Unterschied?'; }, (0.4 + 2 * dauer + pause) * 1000);
      // Erst weiter, wenn beide Versionen erklungen sind
      aufgabe.wartezeit = (0.2 + 2 * dauer + pause) * 1000 + 1500;
      antwort(ok);
    });
    zeichnen();
  },
};
