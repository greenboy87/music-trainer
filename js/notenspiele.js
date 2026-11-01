/* Notenlesen nach der Stunde „Stammtöne & Noten lesen“ (Klasse 5).

   Zwei Bereiche mit denselben fünf Spielen (Noten lesen, Blitzlesen, Note → Taste,
   Noten schreiben, Notenkette) und je vier Stufen:
     Stammtöne   Junior: c, d, e · Anfänger: c'–c'' · Fortgeschritten: h–g'' · Profi: g–d'''
     Vorzeichen  Junior: nur ♯ · Anfänger: nur ♭ · Fortgeschritten/Profi: gemischt
   Höchstens zwei Hilfslinien. Notennamen klein wie im Unterricht (c, cis, es, b).

   Ein Ton ist { stufe, vz }: stufe wie in notenbild.js (c' = 0), vz = 1 für ♯,
   -1 für ♭, 0 ohne Vorzeichen. Erlaubt sind nur Vorzeichen, die auf eine
   schwarze Taste führen – eis, his, ces und fes kommen nicht vor. */

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

const NOTEN_STUFEN = {
  stamm: [
    { name: 'Junior', info: 'Drei Töne: c, d, e', von: 0, bis: 2, kette: 3, ziel: [12, 18, 24] },
    { name: 'Anfänger', info: "Alle Stammtöne von c' bis c''", von: 0, bis: 7, kette: 4, ziel: [10, 16, 22] },
    { name: 'Fortgeschritten', info: "Ein paar Töne mehr: h bis g''", von: -1, bis: 11, kette: 5, ziel: [9, 14, 19] },
    { name: 'Profi', info: "Bis zu zwei Hilfslinien: g bis d'''", von: -3, bis: 15, kette: 6, ziel: [8, 13, 18] },
  ],
  vz: [
    { name: 'Junior', info: 'Nur Kreuz ♯: cis, dis, fis, gis, ais', von: 0, bis: 6, kette: 3, kreuz: true, ziel: [8, 12, 16] },
    { name: 'Anfänger', info: 'Nur b ♭: des, es, ges, as, b', von: 0, bis: 6, kette: 4, b: true, ziel: [8, 12, 16] },
    { name: 'Fortgeschritten', info: "♯ und ♭ gemischt, h bis g''", von: -1, bis: 11, kette: 5, kreuz: true, b: true, stamm: true, ziel: [7, 11, 15] },
    { name: 'Profi', info: 'Alles gemischt, bis zu zwei Hilfslinien', von: -3, bis: 15, kette: 6, kreuz: true, b: true, stamm: true, ziel: [6, 10, 14] },
  ],
};

/* Alle Töne einer Stufe. Bei „gemischt“ kommen Vorzeichen doppelt so oft dran. */
function tonVorrat(st) {
  const vorrat = [];
  for (let s = st.von; s <= st.bis; s++) {
    const g = STAMM[mod7(s)];
    if (st.kreuz && KREUZ_OK.includes(g)) vorrat.push({ stufe: s, vz: 1 }, { stufe: s, vz: 1 });
    if (st.b && B_OK.includes(g)) vorrat.push({ stufe: s, vz: -1 }, { stufe: s, vz: -1 });
    if (st.stamm || (!st.kreuz && !st.b)) vorrat.push({ stufe: s, vz: 0 });
  }
  return vorrat;
}

function neuerTon(st, vorher) {
  const vorrat = tonVorrat(st);
  let t;
  do { t = zufall(vorrat); } while (vorher && vorrat.length > 1 && t.stufe === vorher.stufe && t.vz === vorher.vz);
  return t;
}

/* Klaviatur passend zur Stufe; mindestens c'–c'', damit die Lage nicht verrät */
function klavierBereich(st) {
  return [Math.min(60, Stufe.midi(st.von)), Math.max(72, Stufe.midi(st.bis) + (st.bis % 7 === 6 ? 1 : 0))];
}

/* ---------- Noten setzen: Tippen ins Notensystem ---------- */
const Notensetzer = {
  VON: -3, BIS: 15,     // höchstens zwei Hilfslinien

  erzeuge({ vorzeichen, beiFertig }) {
    const el = document.createElement('div');
    el.className = 'setzer';
    let vz = 0, gesetzt = null, fertig = false;
    el.innerHTML = `
      ${vorzeichen ? `<div class="setzer-vz" role="group" aria-label="Vorzeichen">
        <button type="button" data-vz="0" class="an">ohne</button>
        <button type="button" data-vz="1"><span class="vz-zeichen">♯</span>Kreuz</button>
        <button type="button" data-vz="-1"><span class="vz-zeichen">♭</span>b</button>
      </div>` : ''}
      <svg class="notenbild setzer-system" viewBox="0 0 200 120" role="img" aria-label="Notensystem zum Antippen">
        ${Notenbild.linien(4, 194)}${Notenbild.schluessel('violin')}
        <g class="setzer-note"></g>
        <rect x="0" y="0" width="200" height="120" fill="transparent" class="setzer-flaeche"/>
      </svg>
      <p class="hint setzer-tipp">Tippe in das Notensystem. Du kannst die Note noch verschieben.</p>
      <button type="button" class="primary setzer-fertig" disabled>${Icons.raw('check')}Fertig</button>`;
    const svg = el.querySelector('svg');
    const noteG = el.querySelector('.setzer-note');
    const knopf = el.querySelector('.setzer-fertig');

    const zeichnen = () => {
      if (!gesetzt) { noteG.innerHTML = ''; return; }
      const x = 125, y = Notenbild.yVon(gesetzt.stufe, 'violin');
      noteG.innerHTML = Notenbild.hilfslinien(x, y) + Notenbild.vorzeichen(x, y, gesetzt.vz) + Notenbild.kopf(x, y, true);
    };

    const stufeAus = e => {
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      const y = p.matrixTransform(svg.getScreenCTM().inverse()).y;
      const s = Math.round((Notenbild.UNTEN - y) / (Notenbild.ABSTAND / 2)) + Notenbild.UNTERSTE.violin;
      return Math.max(this.VON, Math.min(this.BIS, s));
    };

    let drueckt = false;
    const setzen = e => {
      if (fertig) return;
      gesetzt = { stufe: stufeAus(e), vz };
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
        const x = 165, y = Notenbild.yVon(t.stufe, 'violin');
        svg.insertAdjacentHTML('beforeend', `<g class="setzer-loesung">${Notenbild.hilfslinien(x, y)}${Notenbild.vorzeichen(x, y, t.vz)}${Notenbild.kopf(x, y, true)}</g>`);
      },
    };
  },
};

/* ---------- Die fünf Spiele je Bereich ---------- */
function notenSpiele(art) {
  const vz = art === 'vz';
  const bereich = vz ? 'Vorzeichen' : 'Stammtöne';
  const stufen = NOTEN_STUFEN[art];
  const farben = vz ? ['#f0abfc', '#e879f9', '#c4b5fd', '#a5b4fc', '#f9a8d4'] : ['#5eead4', '#67e8f9', '#93c5fd', '#86efac', '#fcd34d'];

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
      bild: Notenbild.noten([t]),
      optionen,
      tasten,
      richtig: optionen.indexOf(richtig),
      loesung: `Das ist ein ${richtig}.`,
      nachher() { Ton.klavier(Tonname.midi(t), 0, 0.5, 0.2); },
    };
  };

  return [
    {
      id: `${art}-lesen`, bereich, titel: 'Noten lesen', icon: 'music', farbe: farben[0],
      text: vz ? 'Wie heißt die Note mit ♯ oder ♭? Achtung bei es, as und b!' : 'Wie heißt die Note? Linien: Eine Gelbe Hummel Darf Fliegen – Zwischenräume: FACE.',
      stufen,
      aufgabe: lesen,
    },
    {
      id: `${art}-blitz`, bereich, titel: 'Blitzlesen', icon: 'timer', farbe: farben[1], zeit: 60,
      text: 'So viele Noten wie möglich in 60 Sekunden. Am Rechner gehen auch die Tasten.',
      stufen,
      aufgabe: lesen,
    },
    {
      id: `${art}-taste`, bereich, titel: 'Note → Taste', icon: 'piano', farbe: farben[2],
      text: vz ? 'Finde die schwarze Taste zur Note. Kreuz: rechts daneben, b: links daneben.' : 'Finde die Taste zur Note – in der richtigen Lage!',
      stufen,
      aufgabe(st, vorher) {
        const t = neuerTon(st, vorher?.ton);
        const ziel = Tonname.midi(t);
        const [von, bis] = klavierBereich(st);
        return {
          ton: t,
          frage: 'Welche Taste ist diese Note?',
          bild: Notenbild.noten([t]),
          loesung: `Gesucht war ${Tonname.vonTon(t)} – jetzt grün markiert.`,
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
      text: vz ? 'Setze die Note mit dem richtigen Vorzeichen ins Notensystem.' : 'Setze die Note ins Notensystem. Jede Lage zählt – c\' und c\'\' sind beide ein c.',
      stufen,
      aufgabe(st, vorher) {
        const t = neuerTon(st, vorher?.ton);
        const name = Tonname.vonTon(t);
        return {
          ton: t,
          frage: `Schreibe ein ${name}!`,
          loesung: `So sieht ${name} aus – grün daneben.`,
          eigen(el, antwort) {
            const setzer = Notensetzer.erzeuge({
              vorzeichen: vz,
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
      stufen,
      aufgabe(st) {
        const toene = [];
        while (toene.length < st.kette) toene.push(neuerTon(st, toene[toene.length - 1]));
        const soll = toene.map(t => Tonname.vonTon(t));
        // Stammtöne: nur die Buchstaben der Stufe; Vorzeichen: alle sieben plus ♯/♭
        const buchstaben = vz ? STAMM : STAMM.filter(n => soll.includes(n) || tonVorrat(st).some(t => Tonname.vonTon(t) === n));
        return {
          frage: 'Wie heißen die Noten? Tippe sie der Reihe nach.',
          bild: Notenbild.noten(toene),
          loesung: `Richtig wäre: ${soll.join(' – ')}.`,
          eigen(el, antwort) {
            el.innerHTML = `
              <div class="kette-felder">${soll.map((_, i) => `<span class="kette-feld${i ? '' : ' dran'}"></span>`).join('')}</div>
              ${vz ? `<div class="kette-vz">
                ${st.kreuz ? '<button type="button" data-vz="1"><span class="vz-zeichen">\u266F</span>Kreuz</button>' : ''}
                ${st.b ? '<button type="button" data-vz="-1"><span class="vz-zeichen">\u266D</span>b</button>' : ''}
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
              if (!ok) fehler++;
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

/* Notenspiele stehen auf der Startseite vorne */
SPIELE.unshift(...notenSpiele('stamm'), ...notenSpiele('vz'));

const BEREICH_INFO = {
  'Stammtöne': 'Die weißen Tasten: c – d – e – f – g – a – h.',
  'Vorzeichen': 'Erst spielen, wenn ♯ und ♭ im Unterricht dran waren.',
};
