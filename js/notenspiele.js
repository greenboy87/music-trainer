/* Notenlesen nach den Stunden „Stammtöne & Noten lesen“ (Klasse 5) und
   „Tonhöhen, Oktavlagen & Bassschlüssel“ (Klasse 6).

   Vier Bereiche mit denselben fünf Spielen (Noten lesen, Blitzlesen, Note → Taste,
   Noten schreiben, Notenkette), im Violin- oder im Bassschlüssel:
     Stammtöne      Junior 1: c, d, e · Junior 2: c–g · Anfänger 1: c¹–c² · Anfänger 2: c¹–e²
                    · Fortgeschritten: h–g² · Profi: g–d³
     Vorzeichen     Junior: nur ♯ · Anfänger: nur ♭ · Fortgeschritten/Profi: gemischt
     Bassschlüssel  Junior: G–d · Anfänger: G–a · Fortgeschritten: E–c¹ · Profi: C–e¹
     Bassschlüssel Vorzeichen  Junior: nur ♯ · Anfänger: nur ♭ · Fortgeschritten: E–c¹ · Profi: C–e¹
   Dazu der Bereich Oktavlagen (Tonname mit Oktave, unten in dieser Datei).
   Höchstens zwei Hilfslinien. Notennamen klein wie im Unterricht (c, cis, es, b);
   mit Oktave: C … H, c … h, c¹ … h¹, c² … h², c³.

   Ein Ton ist { stufe, vz }: stufe wie in notenbild.js (c¹ = 0, c = -7, C = -14),
   vz = 1 für ♯, -1 für ♭, 0 ohne Vorzeichen. Erlaubt sind nur Vorzeichen, die auf
   eine schwarze Taste führen – eis, his, ces und fes kommen nicht vor. */

const STAMM = ['c', 'd', 'e', 'f', 'g', 'a', 'h'];
const KREUZ_OK = ['c', 'd', 'f', 'g', 'a'];
const B_OK = ['d', 'e', 'g', 'a', 'h'];
const mod7 = n => ((n % 7) + 7) % 7;

const Tonname = {
  vonTon(t) { return this.aus(STAMM[mod7(t.stufe)], t.vz); },

  aus(grund, vz) {
    if (vz === 1) return grund + 'is';
    if (vz === -1) return grund === 'e' ? 'es' : grund === 'a' ? 'as' : grund === 'h' ? 'b' : grund + 'es';
    return grund;
  },

  gueltig(grund, vz) { return vz === 0 || (vz === 1 ? KREUZ_OK : B_OK).includes(grund); },

  midi(t) { return Stufe.midi(t.stufe) + t.vz; },

  /* „fis“ → { grund: 'f', vz: 1 }, „b“ → { grund: 'h', vz: -1 } */
  zerlegen(name) {
    if (name === 'b') return { grund: 'h', vz: -1 };
    if (name === 'es') return { grund: 'e', vz: -1 };
    if (name === 'as') return { grund: 'a', vz: -1 };
    if (name.endsWith('is')) return { grund: name[0], vz: 1 };
    if (name.endsWith('es')) return { grund: name[0], vz: -1 };
    return { grund: name, vz: 0 };
  },

  /* Falsche Antworten, die Kinder typischerweise geben: Stammton vergessen,
     falsches Zeichen, der andere Name derselben Taste, „ees“ statt „es“ */
  ablenker(t) {
    const g = STAMM[mod7(t.stufe)];
    const liste = [];
    const nachbar = d => STAMM[mod7(t.stufe + d)];
    if (t.vz === 0) {
      if (Tonname.gueltig(g, 1)) liste.push(g + 'is');
      if (Tonname.gueltig(g, -1)) liste.push(this.aus(g, -1));
      liste.push(nachbar(1), nachbar(-1));
    } else {
      liste.push(g);
      if (this.gueltig(g, -t.vz)) liste.push(this.aus(g, -t.vz));
      const anders = t.vz === 1 ? nachbar(1) : nachbar(-1);
      liste.push(this.aus(anders, -t.vz));                        // gleiche Taste, anderer Name
      if (t.vz === -1 && ['e', 'a', 'h'].includes(g)) liste.push(g + 'es');   // ees, aes, hes
      [1, -1].forEach(d => { if (this.gueltig(nachbar(d), t.vz)) liste.push(this.aus(nachbar(d), t.vz)); });
    }
    const richtig = this.vonTon(t);
    return mische([...new Set(liste)].filter(n => n !== richtig));
  },
};

/* ---------- Oktavlagen: Tonname mit Oktave ----------
   Jede Oktave („Etage“) beginnt mit c: große Oktave C … H, kleine c … h,
   eingestrichen c¹ … h¹, zweigestrichen c² … h², dreigestrichen c³ … h³.
   Etage 0 = groß (C = -14), 1 = klein (c = -7), 2 = ¹ (c¹ = 0), 3 = ², 4 = ³. */
const Oktavlage = {
  ETAGEN: [
    { name: 'große Oktave', knopf: 'große', kurz: 'Groß', farbe: '#5B7DB1', bsp: 'C – H' },
    { name: 'kleine Oktave', knopf: 'kleine', kurz: 'klein', farbe: '#3FB8AF', bsp: 'c – h' },
    { name: 'eingestrichene Oktave', knopf: 'eingestrichen', kurz: '¹', farbe: '#FFC857', bsp: 'c¹ – h¹' },
    { name: 'zweigestrichene Oktave', knopf: 'zweigestrichen', kurz: '²', farbe: '#FF8C61', bsp: 'c² – h²' },
    { name: 'dreigestrichene Oktave', knopf: 'dreigestrichen', kurz: '³', farbe: '#C98BDB', bsp: 'c³ – h³' },
  ],

  etage: stufe => Math.floor(stufe / 7) + 2,
  etageVonMidi: m => Math.floor((m - 60) / 12) + 2,
  name: stufe => Stufe.vollerName(stufe),

  /* Buchstabe und Etage → Name: ('f', 0) = F, ('f', 1) = f, ('f', 2) = f¹ */
  aus(grund, e) {
    if (e === 0) return grund.toUpperCase();
    return e === 1 ? grund : grund + Stufe.HOCH[e - 2];
  },

  /* Welche Etagen in einer Stufe vorkommen */
  etagenVon(st) {
    const liste = [];
    for (let s = st.von; s <= st.bis; s++) if (!liste.includes(this.etage(s))) liste.push(this.etage(s));
    return liste;
  },

  knopf(e) {
    const E = this.ETAGEN[e];
    return `<span class="etage" style="--etage:${E.farbe}"><span class="etage-name">${E.knopf}</span><small>${E.bsp}</small></span>`;
  },
};

const NOTEN_STUFEN = {
  stamm: [
    { name: 'Junior 1', info: 'Drei Töne: c, d, e', von: 0, bis: 2, kette: 3, ziel: [12, 18, 24] },
    { name: 'Anfänger 1', info: 'Alle Stammtöne von c¹ bis c²', von: 0, bis: 7, kette: 4, ziel: [10, 16, 22] },
    { name: 'Fortgeschritten', info: 'Ein paar Töne mehr: h bis g²', von: -1, bis: 11, kette: 5, ziel: [9, 14, 19] },
    { name: 'Profi', info: 'Bis zu zwei Hilfslinien: g bis d³', von: -3, bis: 15, kette: 6, ziel: [8, 13, 18] },
    { name: 'Junior 2', info: 'Fünf Töne: c, d, e, f, g', von: 0, bis: 4, kette: 3, ziel: [11, 17, 23] },
    { name: 'Anfänger 2', info: 'Zwei Töne mehr: c¹ bis e²', von: 0, bis: 9, kette: 4, ziel: [10, 15, 20] },
  ],
  vz: [
    { name: 'Junior', info: 'Nur Kreuz ♯: cis, dis, fis, gis, ais', von: 0, bis: 6, kette: 3, kreuz: true, ziel: [8, 12, 16] },
    { name: 'Anfänger', info: 'Nur b ♭: des, es, ges, as, b', von: 0, bis: 6, kette: 4, b: true, ziel: [8, 12, 16] },
    { name: 'Fortgeschritten', info: '♯ und ♭ gemischt, h bis g²', von: -1, bis: 11, kette: 5, kreuz: true, b: true, stamm: true, ziel: [7, 11, 15] },
    { name: 'Profi', info: 'Alles gemischt, bis zu zwei Hilfslinien', von: -3, bis: 15, kette: 6, kreuz: true, b: true, stamm: true, ziel: [6, 10, 14] },
  ],
  // Bassschlüssel (Klasse 6): G = -10 (unterste Linie), c = -7, a = -2 (oberste Linie)
  bass: [
    { name: 'Junior', info: 'Fünf Töne: G, A, H, c, d', von: -10, bis: -6, kette: 3, ziel: [11, 17, 23] },
    { name: 'Anfänger', info: 'Alle Töne im System: G bis a', von: -10, bis: -2, kette: 4, ziel: [10, 16, 22] },
    { name: 'Fortgeschritten', info: 'Eine Hilfslinie: E bis c¹', von: -12, bis: 0, kette: 5, ziel: [9, 14, 19] },
    { name: 'Profi', info: 'Bis zu zwei Hilfslinien: C bis e¹', von: -14, bis: 2, kette: 6, ziel: [8, 13, 18] },
  ],
  bassvz: [
    { name: 'Junior', info: 'Nur Kreuz ♯: cis, dis, fis, gis, ais', von: -7, bis: -1, kette: 3, kreuz: true, ziel: [8, 12, 16] },
    { name: 'Anfänger', info: 'Nur b ♭: des, es, ges, as, b', von: -7, bis: -1, kette: 4, b: true, ziel: [8, 12, 16] },
    { name: 'Fortgeschritten', info: '♯ und ♭ gemischt, E bis c¹', von: -12, bis: 0, kette: 5, kreuz: true, b: true, stamm: true, ziel: [7, 11, 15] },
    { name: 'Profi', info: 'Alles gemischt, bis zu zwei Hilfslinien', von: -14, bis: 2, kette: 6, kreuz: true, b: true, stamm: true, ziel: [6, 10, 14] },
  ],
  /* Oktavlagen: schluessel 'klavier' = Klaviersystem, das Kind wählt das System.
     klavier = Tasten von–bis (MIDI) für „Note → Taste“. */
  okt: [
    { name: 'Junior', info: 'Violinschlüssel: c¹ bis c²', von: 0, bis: 7, schluessel: 'violin', ausgleich: true, klavier: [48, 84] },
    { name: 'Anfänger', info: 'Violinschlüssel: a bis c³', von: -2, bis: 14, schluessel: 'violin', ausgleich: true, klavier: [48, 84] },
    { name: 'Fortgeschritten', info: 'Bassschlüssel: C bis c¹', von: -14, bis: 0, schluessel: 'bass', ausgleich: true, klavier: [36, 72] },
    { name: 'Profi', info: 'Klaviersystem: C bis c³, beide Schlüssel', von: -14, bis: 14, schluessel: 'klavier', ausgleich: true, klavier: [36, 84] },
  ],
  // „Gleicher Platz – anderer Ton“: von/bis zählen im Violinschlüssel
  // (gleiche Stufennamen wie die anderen Oktavlagen-Spiele, damit das School-Tool sie gemeinsam wählt)
  platz: [
    { name: 'Junior', info: 'Untere Hälfte: Violin e¹ bis h¹', von: 2, bis: 6 },
    { name: 'Anfänger', info: 'Im Notensystem: Violin e¹ bis f²', von: 2, bis: 10 },
    { name: 'Fortgeschritten', info: 'Eine Hilfslinie: Violin c¹ bis a²', von: 0, bis: 12 },
    { name: 'Profi', info: 'Zwei Hilfslinien: Violin a bis c³', von: -2, bis: 14 },
  ],
};

/* Die vier Bereiche mit denselben fünf Spielen */
const NOTEN_ARTEN = {
  stamm: { bereich: 'Stammtöne', schluessel: 'violin', farben: ['#5eead4', '#67e8f9', '#93c5fd', '#86efac', '#fcd34d'] },
  vz: { bereich: 'Vorzeichen', schluessel: 'violin', vz: true, farben: ['#f0abfc', '#e879f9', '#c4b5fd', '#a5b4fc', '#f9a8d4'] },
  bass: { bereich: 'Bassschlüssel', schluessel: 'bass', farben: ['#7dd3fc', '#a5f3fc', '#99f6e4', '#bef264', '#fde68a'] },
  bassvz: { bereich: 'Bassschlüssel Vorzeichen', schluessel: 'bass', vz: true, farben: ['#fda4af', '#fdba74', '#d8b4fe', '#f5d0fe', '#fecdd3'] },
};

/* Junior 2 und Anfänger 2 kamen im November 2026 dazu. Sie stehen hinten in der
   Liste, weil gespeicherte Ergebnisse an der Stufennummer hängen; gezeigt und
   gespielt werden die Stufen in dieser Reihenfolge. */
const NOTEN_REIHE = { stamm: [0, 4, 1, 5, 2, 3] };

/* Alle Töne einer Stufe. Bei „gemischt“ kommen Vorzeichen doppelt so oft dran. */
function tonVorrat(st) {
  const vorrat = [];
  for (let s = st.von; s <= st.bis; s++) {
    const g = STAMM[mod7(s)];
    if (st.kreuz && KREUZ_OK.includes(g)) vorrat.push({ stufe: s, vz: 1 }, { stufe: s, vz: 1 });
    if (st.b && B_OK.includes(g)) vorrat.push({ stufe: s, vz: -1 }, { stufe: s, vz: -1 });
    if (st.stamm || (!st.kreuz && !st.b)) vorrat.push({ stufe: s, vz: 0 });
  }
  if (!st.ausgleich) return vorrat;
  /* Oktavlagen: Oktaven mit nur ein, zwei Tönen in der Stufe (c² im Junior, c³)
     kommen bis zu dreimal in den Beutel, sonst wären sie kaum dran */
  const etagen = {};
  vorrat.forEach(t => (etagen[Oktavlage.etage(t.stufe)] ||= []).push(t));
  const groesste = Math.max(...Object.values(etagen).map(l => l.length));
  return Object.values(etagen).flatMap(l =>
    Array.from({ length: Math.min(3, Math.floor(groesste / l.length)) }, () => l.map(t => ({ ...t }))).flat());
}

/* Töne werden ohne Zurücklegen aus einem gemischten Beutel je Stufe gezogen:
   Erst wenn alle Töne einmal dran waren, wird neu gemischt. So kommen alle
   gleich oft dran, und derselbe Ton nie zweimal direkt hintereinander. */
const TON_BEUTEL = new Map();

function neuerTon(st, vorher) {
  const gleich = t => vorher && t.stufe === vorher.stufe && t.vz === vorher.vz;
  let beutel = TON_BEUTEL.get(st);
  if (!beutel?.length) TON_BEUTEL.set(st, beutel = mische(tonVorrat(st)));
  let i = beutel.findIndex(t => !gleich(t));
  if (i < 0) { beutel.push(...mische(tonVorrat(st))); i = Math.max(0, beutel.findIndex(t => !gleich(t))); }
  return beutel.splice(i, 1)[0];
}

/* Falsch gelesener Ton: zweimal zurück in den Beutel, bald wieder dran (nicht
   sofort, sondern nach ein bis drei und nach vier bis sieben anderen Tönen) */
function nochmalUeben(st, t) {
  let beutel = TON_BEUTEL.get(st);
  if (!beutel) TON_BEUTEL.set(st, beutel = []);
  [zahl(1, 3), zahl(4, 7)].forEach(pos => beutel.splice(Math.min(pos, beutel.length), 0, { ...t }));
}

/* Klaviatur passend zur Stufe, damit die Lage nicht verrät: im Violinschlüssel
   mindestens c¹–c², im Bassschlüssel mindestens C–c¹ (zwei Oktaven) */
function klavierBereich(st, schluessel = 'violin') {
  const [von, bis] = schluessel === 'bass' ? [36, 60] : [60, 72];
  return [Math.min(von, Stufe.midi(st.von)), Math.max(bis, Stufe.midi(st.bis) + (mod7(st.bis) === 6 ? 1 : 0))];
}

/* ---------- Noten setzen: Tippen ins Notensystem ----------
   schluessel 'violin', 'bass' oder 'klavier' (Klaviersystem: oben Violin, unten
   Bass – getippt wird in das System, das näher liegt). Die gesetzte Note ist
   { stufe, vz, schluessel }. */
const Notensetzer = {
  erzeuge({ vorzeichen, beiFertig, schluessel = 'violin' }) {
    const klavier = schluessel === 'klavier';
    const untenVon = sys => (klavier ? Notenbild.KLAVIER[sys] : Notenbild.UNTEN);
    // Im Klaviersystem bis zwei Hilfslinien zwischen die Systeme: Violin ab a, Bass bis e¹
    const grenzen = sys => (klavier ? (sys === 'violin' ? [-2, 15] : [-15, 2]) : Notenbild.bereich(sys));
    const el = document.createElement('div');
    el.className = 'setzer';
    let vz = 0, gesetzt = null, fertig = false;
    const [hoehe, system] = klavier
      ? [`viewBox="0 8 200 196"`, Notenbild.klavierLinien(200)]
      : [`viewBox="0 0 200 120"`, Notenbild.linien(4, 194) + Notenbild.schluessel(schluessel)];
    el.innerHTML = `
      ${vorzeichen ? `<div class="setzer-vz" role="group" aria-label="Vorzeichen">
        <button type="button" data-vz="0" class="an">ohne</button>
        <button type="button" data-vz="1"><span class="vz-zeichen">♯</span>Kreuz</button>
        <button type="button" data-vz="-1"><span class="vz-zeichen">♭</span>b</button>
      </div>` : ''}
      <svg class="notenbild setzer-system${klavier ? ' klaviersystem' : ''}" ${hoehe} role="img" aria-label="Notensystem zum Antippen">
        ${system}
        <g class="setzer-note"></g>
        <rect x="0" y="0" width="200" height="210" fill="transparent" class="setzer-flaeche"/>
      </svg>
      <p class="hint setzer-tipp">${klavier ? 'Tippe in das passende System.' : 'Tippe in das Notensystem.'} Du kannst die Note noch verschieben.</p>
      <button type="button" class="primary setzer-fertig" disabled>${Icons.raw('check')}Fertig</button>`;
    const svg = el.querySelector('svg');
    const noteG = el.querySelector('.setzer-note');
    const knopf = el.querySelector('.setzer-fertig');

    const noteHtml = (x, t, sys) => {
      const u = untenVon(sys), y = Notenbild.yVon(t.stufe, sys, u);
      return Notenbild.hilfslinien(x, y, u) + Notenbild.vorzeichen(x, y, t.vz) + Notenbild.kopf(x, y, true);
    };
    const zeichnen = () => { noteG.innerHTML = gesetzt ? noteHtml(125, gesetzt, gesetzt.schluessel) : ''; };

    const ortAus = e => {
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      const y = p.matrixTransform(svg.getScreenCTM().inverse()).y;
      const K = Notenbild.KLAVIER;
      const sys = klavier ? (y < (K.violin + K.bass - 4 * Notenbild.ABSTAND) / 2 ? 'violin' : 'bass') : schluessel;
      const s = Math.round((untenVon(sys) - y) / (Notenbild.ABSTAND / 2)) + Notenbild.UNTERSTE[sys];
      const [von, bis] = grenzen(sys);
      return { stufe: Math.max(von, Math.min(bis, s)), schluessel: sys };
    };

    let drueckt = false;
    const setzen = e => {
      if (fertig) return;
      gesetzt = { ...ortAus(e), vz };
      zeichnen();
      knopf.disabled = false;
    };
    svg.addEventListener('pointerdown', e => { e.preventDefault(); drueckt = true; svg.setPointerCapture(e.pointerId); setzen(e); });
    svg.addEventListener('pointermove', e => { if (drueckt) setzen(e); });
    svg.addEventListener('pointerup', () => { drueckt = false; });

    el.querySelectorAll('[data-vz]').forEach(b => b.addEventListener('click', () => {
      if (fertig) return;
      vz = +b.dataset.vz;
      el.querySelectorAll('[data-vz]').forEach(x => x.classList.toggle('an', x === b));
      if (gesetzt) { gesetzt.vz = vz; zeichnen(); }
    }));

    knopf.addEventListener('click', () => {
      if (!gesetzt || fertig) return;
      fertig = true;
      knopf.disabled = true;
      el.classList.add('gesperrt');
      beiFertig(gesetzt, ok => svg.classList.add(ok ? 'richtig' : 'falsch'));
    });

    return {
      el,
      /* Nach falscher Antwort die richtige Note grün daneben zeigen */
      loesungZeigen(t) {
        const sys = klavier ? Notenbild.systemVon(t) : schluessel;
        svg.insertAdjacentHTML('beforeend', `<g class="setzer-loesung">${noteHtml(165, t, sys)}</g>`);
      },
    };
  },
};

/* ---------- Die fünf Spiele je Bereich ---------- */
function notenSpiele(art) {
  const { bereich, schluessel, vz, farben } = NOTEN_ARTEN[art];
  const bass = schluessel === 'bass';
  const stufen = NOTEN_STUFEN[art];
  const reihe = NOTEN_REIHE[art];
  const bild = toene => Notenbild.noten(toene, schluessel);
  const MERKSATZ = bass
    ? 'Linien: Gute Hamster Dürfen Fast Alles – Zwischenräume: Alle Cowboys Essen Gern.'
    : 'Linien: Eine Gelbe Hummel Darf Fliegen – Zwischenräume: FACE.';

  const lesen = (st, vorher) => {
    const t = neuerTon(st, vorher?.ton);
    const richtig = Tonname.vonTon(t);
    let optionen, tasten;
    if (vz) {
      optionen = mische([richtig, ...Tonname.ablenker(t).slice(0, 3)]);
    } else {
      // Nur die Namen, die in der Stufe vorkommen – im Junior also c, d, e
      const namen = new Set(tonVorrat(st).map(t => Tonname.vonTon(t)));
      optionen = STAMM.filter(n => namen.has(n));
      tasten = optionen;
    }
    return {
      ton: t,
      frage: 'Wie heißt diese Note?',
      bild: bild([t]),
      optionen,
      tasten,
      richtig: optionen.indexOf(richtig),
      loesung: `Das ist ein ${richtig}.`,
      nachher() { Ton.klavier(Tonname.midi(t), 0, 0.5, 0.2); },
      beiFehler() { nochmalUeben(st, t); return [richtig]; },
    };
  };

  return [
    {
      id: `${art}-lesen`, bereich, titel: 'Noten lesen', icon: 'music', farbe: farben[0],
      text: vz ? `Wie heißt die Note mit ♯ oder ♭${bass ? ' im Bassschlüssel' : ''}? Achtung bei es, as und b!` : `Wie heißt die Note? ${MERKSATZ}`,
      stufen, reihe,
      aufgabe: lesen,
    },
    {
      id: `${art}-blitz`, bereich, titel: 'Blitzlesen', icon: 'timer', farbe: farben[1], zeit: 60,
      text: 'So viele Noten wie möglich in 60 Sekunden. Am Rechner gehen auch die Tasten.',
      stufen, reihe,
      aufgabe: lesen,
    },
    {
      id: `${art}-taste`, bereich, titel: 'Note → Taste', icon: 'piano', farbe: farben[2],
      text: vz ? 'Finde die schwarze Taste zur Note. Kreuz: rechts daneben, b: links daneben.'
        : bass ? 'Finde die Taste zur Note – in der richtigen Lage! Der Bassschlüssel legt das kleine f fest: die 4. Linie, zwischen den Punkten.'
          : 'Finde die Taste zur Note – in der richtigen Lage!',
      stufen, reihe,
      aufgabe(st, vorher) {
        const t = neuerTon(st, vorher?.ton);
        const ziel = Tonname.midi(t);
        const [von, bis] = klavierBereich(st, schluessel);
        return {
          ton: t,
          frage: 'Welche Taste ist diese Note?',
          bild: bild([t]),
          loesung: `Gesucht war ${Tonname.vonTon(t)} – jetzt grün markiert.`,
          beiFehler() { nochmalUeben(st, t); return [Tonname.vonTon(t)]; },
          eigen(el, antwort) {
            const klavier = Klavier.erzeuge(von, bis, m => {
              Ton.klavier(m, 0, 0.6);
              const ok = m === ziel;
              klavier.markiere(m, ok ? 'richtig' : 'falsch');
              if (!ok) klavier.markiere(ziel, 'richtig');
              antwort(ok);
            });
            el.appendChild(klavier.el);
          },
        };
      },
    },
    {
      id: `${art}-schreiben`, bereich, titel: 'Noten schreiben', icon: 'hand', farbe: farben[3],
      text: vz ? `Setze die Note mit dem richtigen Vorzeichen ins Notensystem${bass ? ' mit Bassschlüssel' : ''}.`
        : bass ? 'Setze die Note ins Notensystem mit Bassschlüssel. Jede Lage zählt – G und g sind beide ein g.'
          : 'Setze die Note ins Notensystem. Jede Lage zählt – c¹ und c² sind beide ein c.',
      stufen, reihe,
      aufgabe(st, vorher) {
        const t = neuerTon(st, vorher?.ton);
        const name = Tonname.vonTon(t);
        return {
          ton: t,
          frage: `Schreibe ein ${name}!`,
          loesung: `So sieht ${name} aus – grün daneben.`,
          beiFehler() { nochmalUeben(st, t); return [name]; },
          eigen(el, antwort) {
            const setzer = Notensetzer.erzeuge({
              vorzeichen: vz,
              schluessel,
              beiFertig(gesetzt, markieren) {
                Ton.klavier(Tonname.midi(gesetzt), 0, 0.6, 0.25);
                // Jede Oktave zählt, aber nur in der Schreibweise der Aufgabe (es, nicht dis)
                const ok = Tonname.vonTon(gesetzt) === name;
                markieren(ok);
                if (!ok) setzer.loesungZeigen(t);
                antwort(ok);
              },
            });
            el.appendChild(setzer.el);
          },
        };
      },
    },
    {
      id: `${art}-kette`, bereich, titel: 'Notenkette', icon: 'sparkles', farbe: farben[4],
      text: vz ? 'Mehrere Noten hintereinander: Tippe ihre Namen der Reihe nach. Erst ♯ oder ♭, dann den Buchstaben.'
               : 'Mehrere Noten hintereinander: Tippe ihre Namen der Reihe nach. Am Rechner gehen auch die Tasten C bis H.',
      stufen, reihe,
      aufgabe(st) {
        const toene = [];
        while (toene.length < st.kette) toene.push(neuerTon(st, toene[toene.length - 1]));
        const soll = toene.map(t => Tonname.vonTon(t));
        const falscheStellen = new Set();
        // Stammtöne: nur die Buchstaben der Stufe; Vorzeichen: alle sieben plus ♯/♭
        const buchstaben = vz ? STAMM : STAMM.filter(n => soll.includes(n) || tonVorrat(st).some(t => Tonname.vonTon(t) === n));
        return {
          frage: 'Wie heißen die Noten? Tippe sie der Reihe nach.',
          bild: bild(toene),
          loesung: `Richtig wäre: ${soll.join(' – ')}.`,
          beiFehler() {
            const falsch = toene.filter((t, i) => falscheStellen.has(i));
            falsch.forEach(t => nochmalUeben(st, t));
            return falsch.map(t => Tonname.vonTon(t));
          },
          eigen(el, antwort) {
            el.innerHTML = `
              <div class="kette-felder">${soll.map((_, i) => `<span class="kette-feld${i ? '' : ' dran'}"></span>`).join('')}</div>
              ${vz ? `<div class="kette-vz">
                ${st.kreuz ? '<button type="button" data-vz="1"><span class="vz-zeichen">♯</span>Kreuz</button>' : ''}
                ${st.b ? '<button type="button" data-vz="-1"><span class="vz-zeichen">♭</span>b</button>' : ''}
              </div>` : ''}
              <div class="optionen viele">${buchstaben.map(n => `<button type="button" class="option" data-n="${n}">${n}<kbd>${n.toUpperCase()}</kbd></button>`).join('')}</div>`;
            const felder = [...el.querySelectorAll('.kette-feld')];
            let pos = 0, vorzeichen = 0, fehler = 0;
            const vzKnopf = v => {
              vorzeichen = vorzeichen === v ? 0 : v;
              el.querySelectorAll('[data-vz]').forEach(b => b.classList.toggle('an', +b.dataset.vz === vorzeichen));
            };
            const tippen = grund => {
              if (pos >= soll.length) return;
              const name = Tonname.aus(grund, vorzeichen);
              const ok = name === soll[pos];
              felder[pos].className = 'kette-feld ' + (ok ? 'gut' : 'schlecht');
              felder[pos].innerHTML = ok ? name : `<s>${name}</s> ${soll[pos]}`;
              if (!ok) { fehler++; falscheStellen.add(pos); }
              vzKnopf(0);
              pos++;
              if (pos < soll.length) felder[pos].classList.add('dran');
              else antwort(fehler === 0);
            };
            el.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => tippen(b.dataset.n)));
            el.querySelectorAll('[data-vz]').forEach(b => b.addEventListener('click', () => vzKnopf(+b.dataset.vz)));
            const taste = e => {
              if (e.metaKey || e.ctrlKey || e.target.tagName === 'INPUT') return;
              const k = e.key.toLowerCase();
              if (buchstaben.includes(k)) tippen(k);
              else if (vz && (k === '#' || k === '+') && st.kreuz) vzKnopf(1);
              else if (vz && k === '-' && st.b) vzKnopf(-1);
            };
            document.addEventListener('keydown', taste);
            App.beimAufraeumen(() => document.removeEventListener('keydown', taste));
          },
        };
      },
    },
  ];
}

/* ---------- Bereich Oktavlagen ----------
   Sechs Spiele: Welche Etage?, Name mit Oktave, Note → Taste, Noten schreiben,
   Oktav-Detektiv und „Gleicher Platz – anderer Ton“ (eigene Stufen). */
function oktavSpiele() {
  const bereich = 'Oktavlagen';
  const stufen = NOTEN_STUFEN.okt;
  const E = Oktavlage.ETAGEN;
  const name = Oktavlage.name;

  /* Ton ziehen; im Klaviersystem steht er unter c¹ unten, darüber oben,
     um c¹ herum (g bis e¹) mal oben, mal unten */
  const ton = (st, vorher) => {
    const t = neuerTon(st, vorher);
    if (!t.schluessel) {
      t.schluessel = st.schluessel !== 'klavier' ? st.schluessel
        : t.stufe <= -3 ? 'bass' : t.stufe >= 3 ? 'violin' : zufall(['violin', 'bass']);
    }
    return t;
  };
  const bild = (toene, st) => (st.schluessel === 'klavier' ? Notenbild.klaviersystem(toene) : Notenbild.noten(toene, st.schluessel));
  const spielen = t => Ton.klavier(Stufe.midi(t.stufe), 0, 0.5, 0.2);

  return [
    {
      id: 'okt-etage', bereich, titel: 'Welche Etage?', icon: 'stairs', farbe: E[0].farbe,
      text: 'In welcher Oktave steht die Note? Jede Oktave beginnt mit c: C – c – c¹ – c² – c³.',
      stufen,
      aufgabe(st, vorher) {
        const t = ton(st, vorher?.ton);
        const etagen = Oktavlage.etagenVon(st);
        const e = Oktavlage.etage(t.stufe);
        return {
          ton: t,
          frage: 'In welcher Oktave steht diese Note?',
          bild: bild([t], st),
          optionen: etagen.map(i => Oktavlage.knopf(i)),
          richtig: etagen.indexOf(e),
          bildLoesung: name(t.stufe),
          loesung: `Das ist ${name(t.stufe)} – ${E[e].name}.`,
          nachher() { spielen(t); },
          beiFehler() { nochmalUeben(st, t); return [name(t.stufe)]; },
        };
      },
    },
    {
      id: 'okt-name', bereich, titel: 'Name mit Oktave', icon: 'pen', farbe: E[1].farbe,
      text: 'Wie heißt die Note genau? Tippe den Buchstaben und die Oktave: große Oktave groß (F), kleine klein (f), dann f¹, f², f³.',
      stufen,
      aufgabe(st, vorher) {
        const t = ton(st, vorher?.ton);
        const richtig = name(t.stufe);
        const etagen = Oktavlage.etagenVon(st);
        return {
          ton: t,
          frage: 'Wie heißt diese Note mit Oktave?',
          bild: bild([t], st),
          bildLoesung: richtig,
          loesung: `Das ist ${richtig} – ${E[Oktavlage.etage(t.stufe)].name}.`,
          nachher() { spielen(t); },
          beiFehler() { nochmalUeben(st, t); return [richtig]; },
          eigen(el, antwort) {
            let grund = null, etage = null, fertig = false;
            el.innerHTML = `
              <div class="optionen viele okt-buchstaben">${STAMM.map(n => `<button type="button" class="option" data-n="${n}"><span class="okt-b">${n}</span><kbd>${n.toUpperCase()}</kbd></button>`).join('')}</div>
              <div class="okt-zeile">
                <div class="okt-etagen">${etagen.map(i => `<button type="button" class="okt-etage" data-e="${i}" style="--etage:${E[i].farbe}" title="${E[i].name}">${E[i].kurz}</button>`).join('')}</div>
                <div class="okt-anzeige" aria-live="polite">?</div>
                <button type="button" class="primary okt-fertig" disabled>${Icons.raw('check')}Fertig</button>
              </div>`;
            const anzeige = el.querySelector('.okt-anzeige');
            const knopf = el.querySelector('.okt-fertig');
            const eingabe = () => (etage === null ? grund : Oktavlage.aus(grund, etage));
            const zeigen = () => {
              const b = grund ? (etage === 0 ? grund.toUpperCase() : grund) : '_';
              anzeige.textContent = b + (etage >= 2 ? Stufe.HOCH[etage - 2] : '');
              anzeige.style.setProperty('--etage', etage === null ? 'var(--border)' : E[etage].farbe);
              el.querySelectorAll('.okt-b').forEach(s => { s.textContent = etage === 0 ? s.parentNode.dataset.n.toUpperCase() : s.parentNode.dataset.n; });
              el.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('an', x.dataset.n === grund));
              el.querySelectorAll('[data-e]').forEach(x => x.classList.toggle('an', +x.dataset.e === etage));
              knopf.disabled = !(grund && etage !== null);
            };
            const waehle = (g, e) => {
              if (fertig) return;
              if (g) grund = g;
              if (e !== undefined && etagen.includes(e)) etage = e;
              zeigen();
            };
            const abgeben = () => {
              if (fertig || !grund || etage === null) return;
              fertig = true;
              knopf.disabled = true;
              el.querySelectorAll('button').forEach(b => (b.disabled = true));
              const ok = eingabe() === richtig;
              anzeige.classList.add(ok ? 'gut' : 'schlecht');
              if (!ok) anzeige.innerHTML = `<s>${eingabe()}</s> ${richtig}`;
              antwort(ok);
            };
            el.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => waehle(b.dataset.n)));
            el.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => waehle(null, +b.dataset.e)));
            knopf.addEventListener('click', abgeben);
            // Am Rechner: Buchstabe, mit Umschalt = große Oktave; 1, 2, 3 = ¹ ² ³; Eingabe = Fertig
            const taste = e => {
              if (fertig || e.metaKey || e.ctrlKey || e.target.tagName === 'INPUT') return;
              const k = e.key.toLowerCase();
              if (STAMM.includes(k)) waehle(k, e.shiftKey ? 0 : undefined);
              else if (['1', '2', '3'].includes(k)) waehle(null, +k + 1);
              else if (e.key === 'Enter') { e.preventDefault(); abgeben(); }
            };
            document.addEventListener('keydown', taste);
            App.beimAufraeumen(() => document.removeEventListener('keydown', taste));
          },
        };
      },
    },
    {
      id: 'okt-taste', bereich, titel: 'Note → Taste', icon: 'piano', farbe: E[2].farbe,
      text: 'Finde die Taste zur Note – in der richtigen Oktave! Die Farben oben auf den Tasten zeigen die Oktaven.',
      stufen,
      aufgabe(st, vorher) {
        const t = ton(st, vorher?.ton);
        const ziel = Stufe.midi(t.stufe);
        const [von, bis] = st.klavier;
        return {
          ton: t,
          frage: 'Welche Taste ist diese Note?',
          bild: bild([t], st),
          bildLoesung: name(t.stufe),
          loesung: `Gesucht war ${name(t.stufe)} – jetzt grün markiert.`,
          beiFehler() { nochmalUeben(st, t); return [name(t.stufe)]; },
          eigen(el, antwort) {
            const klavier = Klavier.erzeuge(von, bis, m => {
              Ton.klavier(m, 0, 0.6);
              const ok = m === ziel;
              klavier.markiere(m, ok ? 'richtig' : 'falsch');
              if (!ok) klavier.markiere(ziel, 'richtig');
              antwort(ok);
            }, { etagen: true });
            el.appendChild(klavier.el);
          },
        };
      },
    },
    {
      id: 'okt-schreiben', bereich, titel: 'Noten schreiben', icon: 'hand', farbe: E[3].farbe,
      text: 'Setze die Note in der richtigen Oktave ins Notensystem. Im Profi wählst du selbst, ob oben (Violinschlüssel) oder unten (Bassschlüssel).',
      stufen,
      aufgabe(st, vorher) {
        const t = ton(st, vorher?.ton);
        const n = name(t.stufe);
        return {
          ton: t,
          frage: `Schreibe ein ${n}!`,
          loesung: `So sieht ${n} aus – grün daneben.`,
          beiFehler() { nochmalUeben(st, t); return [n]; },
          eigen(el, antwort) {
            const setzer = Notensetzer.erzeuge({
              schluessel: st.schluessel,
              beiFertig(gesetzt, markieren) {
                Ton.klavier(Stufe.midi(gesetzt.stufe), 0, 0.6, 0.25);
                // Hier zählt die Oktave: genau dieser Ton, egal in welchem System
                const ok = gesetzt.stufe === t.stufe;
                markieren(ok);
                if (!ok) {
                  // Klaviersystem: Lösung im getippten System, wenn der Ton dort hinpasst
                  const passt = gesetzt.schluessel === 'bass' ? t.stufe <= 2 : t.stufe >= -2;
                  setzer.loesungZeigen({ ...t, schluessel: passt ? gesetzt.schluessel : undefined });
                }
                antwort(ok);
              },
            });
            el.appendChild(setzer.el);
          },
        };
      },
    },
    {
      id: 'okt-detektiv', bereich, titel: 'Oktav-Detektiv', icon: 'target', farbe: E[4].farbe,
      text: 'Drei Noten, drei Namen – aber ein Name hat die falsche Oktave. Finde ihn!',
      stufen,
      aufgabe(st, vorher) {
        const toene = [];
        for (let v = 0; toene.length < 3 && v < 50; v++) {
          const t = ton(st, toene[toene.length - 1] || vorher?.ton);
          if (!toene.some(x => x.stufe === t.stufe)) toene.push(t);
        }
        const etagen = Oktavlage.etagenVon(st);
        const richtigeNamen = toene.map(x => name(x.stufe));
        // Falscher Name: eine Oktave daneben, möglichst eine, die in der Stufe vorkommt
        // (Junior: nur ¹ und ²), und nie der Name einer der anderen Noten
        const falschVon = x => {
          const e = Oktavlage.etage(x.stufe);
          let wahl = [e - 1, e + 1].filter(y => etagen.includes(y));
          if (!wahl.length) wahl = [e - 1, e + 1].filter(y => y >= 0 && y < E.length);
          return wahl.map(y => Oktavlage.aus(STAMM[mod7(x.stufe)], y)).filter(n => !richtigeNamen.includes(n));
        };
        const moeglich = toene.map((x, i) => i).filter(i => falschVon(toene[i]).length);
        if (!moeglich.length) return this.aufgabe(st, vorher);       // sehr selten: neue Noten ziehen
        const falsch = zufall(moeglich);
        const t = toene[falsch];
        const namen = richtigeNamen.map((n, i) => (i === falsch ? zufall(falschVon(t)) : n));
        return {
          ton: t,
          frage: 'Ein Name hat die falsche Oktave. Welcher?',
          bild: bild(toene, st),
          optionen: namen,
          drei: true,
          richtig: falsch,
          bildLoesung: `${namen[falsch]} → ${name(t.stufe)}`,
          loesung: `${namen[falsch]} stimmt nicht – die ${falsch + 1}. Note heißt ${name(t.stufe)}.`,
          nachher() { toene.forEach((x, i) => Ton.klavier(Stufe.midi(x.stufe), i * 0.45, 0.4, 0.2)); },
          beiFehler() { nochmalUeben(st, t); return [name(t.stufe)]; },
        };
      },
    },
    {
      id: 'okt-platz', bereich, titel: 'Gleicher Platz – anderer Ton', icon: 'sparkles', farbe: '#93c5fd',
      text: 'Dieselbe Stelle im Violin- und im Bassschlüssel: Wie heißt die Note oben, wie unten? Beispiel: Violin h¹ = Bass d.',
      stufen: NOTEN_STUFEN.platz,
      aufgabe(st, vorher) {
        const t = neuerTon(st, vorher?.ton);
        const v = t.stufe, b = v - 12;           // Bassschlüssel liegt 12 Stufen tiefer
        const schluessel = (x, y) => `${x}|${y}`;
        // Typische Fehler: Bass gelesen wie Violin, eine Stufe daneben, falsche Oktave
        const falsche = [[v, v - 14], [v, v - 7], [v, b + 1], [v, b - 1], [v + 1, b], [v - 1, b], [v, b + 7], [v, b - 7], [v - 7, b]]
          .filter(([x, y]) => x >= -14 && y >= -14 && x <= 20);
        const gesehen = new Set([schluessel(v, b)]);
        const liste = [[v, b]];
        mische(falsche).forEach(([x, y]) => {
          const k = schluessel(x, y);
          if (liste.length < 4 && !gesehen.has(k)) { gesehen.add(k); liste.push([x, y]); }
        });
        const reihe = mische(liste);
        return {
          ton: t,
          frage: 'Gleicher Platz – wie heißen die beiden Noten?',
          bild: `<div class="platz-bild">${Notenbild.noten([v], 'violin')}${Notenbild.noten([b], 'bass')}</div>`,
          optionen: reihe.map(([x, y]) => `<span class="platz-wahl"><span><small>Violin</small>${name(x)}</span><span><small>Bass</small>${name(y)}</span></span>`),
          richtig: reihe.findIndex(([x, y]) => x === v && y === b),
          bildLoesung: `Violin ${name(v)} · Bass ${name(b)}`,
          loesung: `Oben ${name(v)}, unten ${name(b)}. Tipp: Unten heißt die Note zwei Buchstaben weiter (h → c → d).`,
          nachher() { Ton.klavier(Stufe.midi(v), 0, 0.5, 0.2); Ton.klavier(Stufe.midi(b), 0.5, 0.6, 0.2); },
          beiFehler() { nochmalUeben(st, t); return [`${name(v)} / ${name(b)}`]; },
        };
      },
    },
  ];
}

/* Notenspiele stehen auf der Startseite vorne */
SPIELE.unshift(...notenSpiele('stamm'), ...notenSpiele('vz'), ...notenSpiele('bass'), ...notenSpiele('bassvz'), ...oktavSpiele());

const BEREICH_INFO = {
  'Stammtöne': 'Die weißen Tasten: c – d – e – f – g – a – h.',
  'Vorzeichen': 'Erst spielen, wenn ♯ und ♭ im Unterricht dran waren.',
  'Bassschlüssel': 'Der Bassschlüssel legt das kleine f fest: 4. Linie, zwischen den Punkten.',
  'Bassschlüssel Vorzeichen': 'Erst spielen, wenn der Bassschlüssel sitzt.',
  'Oktavlagen': 'Jede Oktave beginnt mit c: C – c – c¹ – c² – c³.',
  'Drums': 'Grooves und Fills auf den Pads oder am Drumset.',
  'Piano': 'Songs auf dem Klavier spielen.',
};
