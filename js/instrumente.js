/* Instrumente erkennen (Bereich Hören).

   Klänge: University of Iowa Electronic Music Studios, Musical Instrument
   Samples – „ohne Einschränkungen“ nutzbar. Aus den Einzeltönen sind zwei
   bekannte Melodien zusammengesetzt (Ode an die Freude, Hänschen klein), jeder
   Ton auf die genaue Tonhöhe nachgestimmt: klaenge/<id>-ode.m4a, <id>-haenschen.m4a.
   Wo es eine gute freie Solo-Aufnahme gibt, steht sie zusätzlich in KLAENGE.
   Bilder: Wikimedia Commons, freie Lizenzen; Urheber und Lizenz in
   bilder/instrumente/quellen.json, angezeigt auf quellen.html. */

const INSTRUMENTE = [
  { id: 'violine', artikel: 'die', name: 'Violine', familie: 'Streichinstrumente' },
  { id: 'viola', artikel: 'die', name: 'Bratsche', familie: 'Streichinstrumente' },
  { id: 'cello', artikel: 'das', name: 'Violoncello', familie: 'Streichinstrumente' },
  { id: 'kontrabass', artikel: 'der', name: 'Kontrabass', familie: 'Streichinstrumente' },
  { id: 'querfloete', artikel: 'die', name: 'Querflöte', familie: 'Holzblasinstrumente' },
  { id: 'oboe', artikel: 'die', name: 'Oboe', familie: 'Holzblasinstrumente' },
  { id: 'klarinette', artikel: 'die', name: 'Klarinette', familie: 'Holzblasinstrumente' },
  { id: 'fagott', artikel: 'das', name: 'Fagott', familie: 'Holzblasinstrumente' },
  { id: 'horn', artikel: 'das', name: 'Horn', familie: 'Blechblasinstrumente' },
  { id: 'trompete', artikel: 'die', name: 'Trompete', familie: 'Blechblasinstrumente' },
  { id: 'posaune', artikel: 'die', name: 'Posaune', familie: 'Blechblasinstrumente' },
  { id: 'tuba', artikel: 'die', name: 'Tuba', familie: 'Blechblasinstrumente' },
];
const FAMILIEN = ['Streichinstrumente', 'Holzblasinstrumente', 'Blechblasinstrumente'];

/* Hörbeispiele je Instrument: Datei in klaenge/ und Länge in Sekunden */
const KLAENGE = Object.fromEntries(INSTRUMENTE.map(i => [i.id, [
  { datei: `${i.id}-ode`, dauer: 6.4 },
  { datei: `${i.id}-haenschen`, dauer: 6.4 },
]]));

const instrumentKarte = i =>
  `<span class="instrument-bild"><img src="bilder/instrumente/${i.id}.jpg" alt="" loading="lazy"></span><span class="instrument-name">${i.name}</span>`;

SPIELE.splice(SPIELE.findIndex(s => s.bereich === 'Rhythmus'), 0, {
  id: 'instrumente',
  bereich: 'Hören',
  titel: 'Instrumente erkennen',
  text: 'Welches Orchesterinstrument spielt? Erst die Familie, dann das genaue Instrument.',
  icon: 'ear',
  farbe: '#f9a8d4',
  stufen: [
    { name: 'Junior', info: 'Welche Instrumentenfamilie?', art: 'familie' },
    { name: 'Anfänger', info: 'Sechs gut unterscheidbare Instrumente', auswahl: ['violine', 'kontrabass', 'querfloete', 'klarinette', 'trompete', 'tuba'] },
    { name: 'Fortgeschritten', info: 'Alle zwölf Orchesterinstrumente' },
    { name: 'Profi', info: 'Alle zwölf – zur Auswahl nur Instrumente derselben Familie', gleicheFamilie: true },
  ],
  aufgabe(st, vorher) {
    const vorrat = st.auswahl ? INSTRUMENTE.filter(i => st.auswahl.includes(i.id)) : INSTRUMENTE;
    let inst;
    do { inst = zufall(vorrat); } while (vorher && vorrat.length > 1 && inst.id === vorher.instrument);
    const klang = zufall(KLAENGE[inst.id]);
    const hoeren = () => { Ton.datei(`klaenge/${klang.datei}.m4a`); return klang.dauer; };
    if (st.art === 'familie') {
      return {
        instrument: inst.id,
        frage: 'Zu welcher Familie gehört das Instrument?',
        hoeren,
        optionen: FAMILIEN,
        richtig: FAMILIEN.indexOf(inst.familie),
        loesung: `Das war ${inst.artikel} ${inst.name} – ein ${inst.familie.replace(/e$/, '')}.`,
      };
    }
    const andere = vorrat.filter(i => i.id !== inst.id && (!st.gleicheFamilie || i.familie === inst.familie));
    const reihe = mische([inst, ...mische(andere).slice(0, 3)]);
    return {
      instrument: inst.id,
      frage: 'Welches Instrument hörst du?',
      hoeren,
      optionen: reihe.map(instrumentKarte),
      bilder: true,
      richtig: reihe.indexOf(inst),
      loesung: `Das war: ${inst.name} (${inst.familie}).`,
    };
  },
});
