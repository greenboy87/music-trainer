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
    ],
    aufgabe(st) {
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
    titel: 'Dur oder Moll?',
    text: 'Klingt es eher hell und fröhlich (Dur) oder eher dunkel und traurig (Moll)?',
    icon: 'sun',
    farbe: '#fcd34d',
    stufen: [
      { name: 'Akkord zusammen', art: 'akkord' },
      { name: 'Akkord gebrochen', art: 'gebrochen' },
      { name: 'Kurze Melodie', art: 'melodie' },
    ],
    aufgabe(st) {
      const dur = Math.random() < 0.5;
      const g = zahl(55, 64);
      const terz = dur ? 4 : 3;
      return {
        frage: st.art === 'melodie' ? 'Steht die Melodie in Dur oder in Moll?' : 'Ist der Akkord Dur oder Moll?',
        hoeren() {
          if (st.art === 'akkord') { Ton.akkord([g, g + terz, g + 7], 0, 1.8); return 2; }
          if (st.art === 'gebrochen') {
            // Grundton, Terz, Quinte nacheinander, dann der Akkord zusammen
            [0, terz, 7].forEach((h, i) => Ton.klavier(g + h, i * 0.45, 0.6));
            Ton.akkord([g, g + terz, g + 7], 1.5, 1.4, 0.15);
            return 3.0;
          }
          const tonleiter = dur ? [0, 2, 4, 5, 7, 5, 4, 2, 0] : [0, 2, 3, 5, 7, 5, 3, 2, 0];
          tonleiter.forEach((h, i) => Ton.klavier(g + h, i * 0.35, 0.45));
          return tonleiter.length * 0.35 + 0.4;
        },
        optionen: ['Dur', 'Moll'],
        richtig: dur ? 0 : 1,
        loesung: dur ? 'Das war Dur: große Terz unten.' : 'Das war Moll: kleine Terz unten.',
      };
    },
  },

  /* ---------------- Rhythmus ---------------- */
  {
    id: 'rhythmus-detektiv',
    bereich: 'Rhythmus',
    titel: 'Rhythmus-Detektiv',
    text: 'Du hörst einen Takt. Welcher der notierten Rhythmen war es?',
    icon: 'music',
    farbe: '#fda4af',
    stufen: [
      { name: 'Halbe und Viertel', bausteine: ['H', 'V'] },
      { name: 'Dazu Achtel', bausteine: ['H', 'V', 'AA'] },
      { name: 'Dazu Viertelpausen', bausteine: ['H', 'V', 'AA', 'Vp'] },
    ],
    aufgabe(st) {
      const takte = [Rhythmus.zufall(st.bausteine)];
      const klang = t => Rhythmus.einsaetze(t).join(',');
      for (let v = 0; takte.length < 3 && v < 200; v++) {
        const t = Rhythmus.zufall(st.bausteine);
        if (!takte.some(x => klang(x) === klang(t))) takte.push(t);
      }
      const richtigerTakt = takte[0];
      const reihe = mische(takte);
      return {
        frage: 'Welchen Rhythmus hörst du? (Erst vier Klicks zum Einzählen)',
        hoeren: () => Rhythmus.abspielen(richtigerTakt, 80).dauer,
        optionen: reihe.map(t => Notenbild.rhythmus(t)),
        breit: true,
        richtig: reihe.indexOf(richtigerTakt),
        loesung: 'Der richtige Rhythmus ist jetzt grün markiert.',
      };
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
