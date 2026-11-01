/* Stilrichtungen und Spielweisen (Bereich Hören).

   Nur echte Aufnahmen, nichts selbst erzeugt: Wikimedia Commons und Freesound,
   alle gemeinfrei, CC0, CC BY oder CC BY-SA. Je ein Ausschnitt von etwa
   10 Sekunden in klaenge/stile/ und klaenge/spielweisen/; bei den Spielweisen
   kommen die Solo-Aufnahmen aus dem Instrumentenspiel (klaenge/) dazu.
   Nachweis für jede Aufnahme auf quellen.html. */

const STILE = {
  klassik: { name: 'Klassik', merkmal: 'Orchester oder Streicher, keine Band, kein Schlagzeug', klaenge: [
    ['stile/klassik-nachtmusik', 10, 'W. A. Mozart: Eine kleine Nachtmusik'],
    ['stile/klassik-beethoven5', 10, 'L. v. Beethoven: 5. Sinfonie'],
    ['stile/klassik-fruehling', 10, 'A. Vivaldi: Der Frühling'],
  ] },
  jazz: { name: 'Jazz', merkmal: 'Big Band mit Saxofonen und Trompeten, swingender Rhythmus', klaenge: [
    ['stile/jazz-bohica', 10, '„Mr. Bo Hica“, Dimensions in Blue'],
    ['stile/jazz-sheridan', 10, '„Sheridan Square“, Airmen of Note'],
    ['stile/jazz-boogaloo', 10, '„Small Note Boogaloo“, Airmen of Note'],
  ] },
  pop: { name: 'Pop', merkmal: 'Gesang im Vordergrund, eingängige Melodie, Band', klaenge: [
    ['stile/pop-followme', 10, '„Follow Me“, Max Impact'],
    ['stile/pop-one', 10, '„One“, Max Impact'],
    ['stile/pop-whatiwant', 10, '„What I Want“, Max Impact'],
    ['stile/pop-everybodyup', 10, '„Everybody Up“, Sascha Ende'],
  ] },
  rock: { name: 'Rock', merkmal: 'laute, verzerrte E-Gitarren und kräftiges Schlagzeug', klaenge: [
    ['stile/rock-bigrock', 10, '„Big Rock“, Kevin MacLeod'],
    ['stile/rock-rawk', 10, '„Summon the Rawk“, Kevin MacLeod'],
    ['stile/rock-london', 10, '„Rock Over London“, Kevin MacLeod'],
  ] },
  welt: { name: 'Weltmusik', merkmal: 'Instrumente und Rhythmen aus anderen Ländern', klaenge: [
    ['stile/welt-gamelan', 10, 'Gamelan aus Java (Indonesien)'],
    ['stile/welt-sitar', 10, 'Sitar aus Indien'],
    ['stile/welt-samba', 10, 'Samba-Trommeln aus Brasilien'],
    ['stile/welt-oud', 10, 'Oud, eine arabische Laute'],
    ['stile/welt-mariachi', 10, 'Mariachi aus Mexiko'],
  ] },
  elektro: { name: 'Elektronische Musik', merkmal: 'Klänge aus Synthesizer und Computer, gleichmäßiger Beat', klaenge: [
    ['stile/elektro-house', 10, 'House-Musik'],
    ['stile/elektro-loyalty', 10, '„High Technologic Beat Explosion“, Loyalty Freak Music'],
    ['stile/elektro-trance', 10, '„Cut Trance“, Kevin MacLeod'],
  ] },
  marsch: { name: 'Marschmusik', merkmal: 'Blasorchester mit Trommeln, Takt zum Marschieren', klaenge: [
    ['stile/marsch-radetzky', 10, 'J. Strauss (Vater): Radetzky-Marsch'],
    ['stile/marsch-sousa', 10, 'J. P. Sousa: The Stars and Stripes Forever'],
  ] },
};

const SPIELWEISEN = {
  gestrichen: { name: 'gestrichen', merkmal: 'Ein Bogen streicht über die Saiten, der Ton kann lange klingen', klaenge: [
    ['violine-gavotte', 9, 'Violine'], ['violine-allemanda', 9, 'Violine'],
    ['cello-praeludium', 9, 'Violoncello'], ['cello-praeludium2', 9, 'Violoncello'],
    ['spielweisen/streich-skala', 8.2, 'Violine'], ['spielweisen/streich-techniken', 7.3, 'Violine'],
  ] },
  gezupft: { name: 'gezupft', merkmal: 'Die Saiten werden mit den Fingern gezupft, jeder Ton klingt schnell aus', klaenge: [
    ['spielweisen/zupf-pizzicato', 10, 'Violine, gezupft (pizzicato)'],
    ['spielweisen/zupf-romanze', 10, 'Gitarre'], ['spielweisen/zupf-alhambra', 10, 'Gitarre'],
    ['spielweisen/zupf-harfe', 10, 'Harfe'],
  ] },
  geblasen: { name: 'geblasen', merkmal: 'Die Luft im Instrument bringt den Ton zum Klingen', klaenge: [
    ['querfloete-bourree', 9, 'Querflöte'], ['querfloete-syrinx', 9, 'Querflöte'],
    ['trompete-mahler', 10, 'Trompete'], ['klarinette-beethoven', 10, 'Klarinette'],
    ['oboe-ferling', 9, 'Oboe'], ['fagott-beethoven', 10, 'Fagott'],
    ['spielweisen/blas-trompete', 10, 'Trompete'], ['spielweisen/blas-blockfloete', 10, 'Blockflöte'],
  ] },
  angeschlagen: { name: 'angeschlagen', merkmal: 'Mit Händen, Schlägeln oder Stöcken angeschlagen, jeder Schlag ist deutlich zu hören', klaenge: [
    ['spielweisen/schlag-djembe', 10, 'Djembe (Trommel)'], ['spielweisen/schlag-schlagzeug', 10, 'Schlagzeug'],
    ['spielweisen/schlag-pauke', 8.4, 'Pauken'], ['spielweisen/schlag-bali', 10, 'Xylofon aus Bali'],
  ] },
};

/* Ein Hörspiel aus Gruppen von Aufnahmen: Aufnahme hören, Gruppe wählen */
function hoerbeispielAufgabe(gruppen, st, vorher, frage) {
  let art, klang;
  do {
    art = zufall(st.arten);
    klang = zufall(gruppen[art].klaenge);
  } while (vorher && klang[0] === vorher.klang);
  const [datei, dauer, was] = klang;
  const g = gruppen[art];
  return {
    klang: datei,
    frage,
    hoeren() { Ton.datei(`klaenge/${datei}.m4a`); return dauer; },
    optionen: st.arten.map(a => gruppen[a].name),
    drei: st.arten.length > 4,
    richtig: st.arten.indexOf(art),
    loesung: `Das war ${g.name}: ${was}. Typisch: ${g.merkmal}.`,
  };
}

SPIELE.splice(SPIELE.findIndex(s => s.bereich === 'Rhythmus'), 0, {
  id: 'stilrichtungen',
  bereich: 'Hören',
  titel: 'Stilrichtungen',
  text: 'Klassik, Jazz, Pop, Rock und mehr: Welche Musikrichtung hörst du?',
  icon: 'music',
  farbe: '#fdba74',
  stufen: [
    { name: 'Junior', info: 'Klassik, Rock oder Marschmusik?', arten: ['klassik', 'rock', 'marsch'] },
    { name: 'Anfänger', info: 'Klassik, Jazz, Pop oder Rock?', arten: ['klassik', 'jazz', 'pop', 'rock'] },
    { name: 'Fortgeschritten', info: 'Dazu Weltmusik und Elektronische Musik', arten: ['klassik', 'jazz', 'pop', 'rock', 'welt', 'elektro'] },
    { name: 'Profi', info: 'Alle sieben Stilrichtungen', arten: Object.keys(STILE) },
  ],
  aufgabe(st, vorher) { return hoerbeispielAufgabe(STILE, st, vorher, 'Welche Stilrichtung ist das?'); },
}, {
  id: 'spielweisen',
  bereich: 'Hören',
  titel: 'Wie entsteht der Ton?',
  text: 'Gestrichen, gezupft, geblasen oder angeschlagen: Hör genau hin, wie der Ton erzeugt wird.',
  icon: 'hand',
  farbe: '#bef264',
  stufen: [
    { name: 'Junior', info: 'Geblasen oder angeschlagen?', arten: ['geblasen', 'angeschlagen'] },
    { name: 'Anfänger', info: 'Saiten: gestrichen oder gezupft?', arten: ['gestrichen', 'gezupft'] },
    { name: 'Fortgeschritten', info: 'Alle vier Arten', arten: Object.keys(SPIELWEISEN) },
  ],
  aufgabe(st, vorher) { return hoerbeispielAufgabe(SPIELWEISEN, st, vorher, 'Wie wird der Ton erzeugt?'); },
});
