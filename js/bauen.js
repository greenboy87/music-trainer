/* Rhythmus nachbauen: Ein Rhythmus erklingt, ein Teil der Noten steht schon da.
   Die Lücken füllt man mit Notenwerten aus der Leiste – wie die Rhythmus-Runde
   im Scoreboard (musik-quiz): antippen hängt an, Antippen einer gesetzten Note
   nimmt sie wieder heraus.

   Es geht schnell aufwärts: erst eine Zählzeit, dann zwei, ein halber Takt,
   ein ganzer Takt, zwei Takte. Bis dahin zeigt jede Lücke ihre leeren Viertel
   und nimmt nicht mehr an, als hineinpasst. Ab „Ohne Hilfe“ fällt das weg:
   Man kann zu viel eintragen und muss selbst darauf achten, dass jeder Takt
   genau voll ist – nicht zu kurz und nicht zu lang.

   Klasse 5: nur Ganze, Halbe, Viertel, zwei Achtel und Viertelpause.
   Richtig ist, was gleich klingt und jeden Takt genau füllt (eine Halbe und
   „Viertel + Viertelpause“ klingen mit der Snare gleich, beides zählt).      */

const Bauen = {
  dauer: liste => liste.reduce((s, b) => s + RhythmusBausteine[b].schlaege, 0),
  klang: takt => Rhythmus.einsaetze(takt).join(','),

  /* Takte in Abschnitte zerlegen: { fest: 'V' } oder { luecke: Dauer, soll: [...], inhalt: [] }.
     „wo“ sagt für jeden Baustein, ob er zur Lücke gehört; benachbarte Lückenbausteine
     werden eine Lücke. */
  abschnitte(takte, wo) {
    return takte.map((takt, ti) => {
      const liste = [];
      takt.forEach((b, bi) => {
        const letzte = liste[liste.length - 1];
        if (!wo(ti, bi)) liste.push({ fest: b });
        else if (letzte?.soll) { letzte.soll.push(b); letzte.luecke += RhythmusBausteine[b].schlaege; }
        else liste.push({ luecke: RhythmusBausteine[b].schlaege, soll: [b], inhalt: [] });
      });
      return liste;
    });
  },

  /* Wo sind die Lücken? null = mit diesem Rhythmus geht es nicht, neu würfeln */
  luecken(st, takte, schlaege) {
    if (st.art === 'takt') return this.abschnitte(takte, () => true);
    if (st.art === 'haelfte') {
      if (schlaege !== 4) return null;
      const t = takte[0];
      let pos = 0;
      const anfang = t.map(b => { const p = pos; pos += RhythmusBausteine[b].schlaege; return p; });
      if (!anfang.includes(2)) return null;                 // eine Halbe/Ganze über die Mitte
      const hinten = Math.random() < 0.5;
      const teil = t.filter((_, i) => (anfang[i] >= 2) === hinten);
      if (!Rhythmus.einsaetze(teil).length) return null;    // nur Pausen in der Lücke wäre zu billig
      return this.abschnitte(takte, (ti, bi) => (anfang[bi] >= 2) === hinten);
    }
    // einzelne Zählzeiten: nur Viertel-lange Bausteine, nicht nebeneinander
    const stellen = [];
    takte.forEach((t, ti) => t.forEach((b, bi) => { if (RhythmusBausteine[b].schlaege === 1) stellen.push([ti, bi]); }));
    const gewaehlt = [];
    for (const s of mische(stellen)) {
      if (gewaehlt.length >= st.anzahl) break;
      if (gewaehlt.some(([ti, bi]) => ti === s[0] && Math.abs(bi - s[1]) < 2)) continue;
      gewaehlt.push(s);
    }
    if (gewaehlt.length < st.anzahl) return null;
    // Mindestens eine Lücke soll klingen, nicht nur Pausen
    if (!gewaehlt.some(([ti, bi]) => RhythmusBausteine[takte[ti][bi]].einsaetze.length)) return null;
    return this.abschnitte(takte, (ti, bi) => gewaehlt.some(([a, b]) => a === ti && b === bi));
  },

  /* Spielt Takte beliebiger Länge ab „start“ (Sekunden); vorher ein Takt Vorzähler */
  spielen(takte, tempo, schlaege, start = 0) {
    const schlag = 60 / tempo;
    const vor = schlaege === 2 ? 4 : schlaege;
    for (let i = 0; i < vor; i++) Ton.klick(start + i * schlag, i % schlaege === 0);
    let pos = 0;
    takte.forEach(t => {
      Rhythmus.einsaetze(t).forEach(e => Ton.snare(start + (vor + pos + e) * schlag, e === 0 ? 1.3 : 1));
      pos += this.dauer(t);
    });
    for (let i = 0; i < Math.ceil(pos); i++) Ton.klick(start + (vor + i) * schlag, i % schlaege === 0);
    return (vor + Math.max(pos, 1)) * schlag + 0.3;
  },

  starte(el, st, aufgabe, antwort) {
    const { soll, schlaege, tempo, teile } = aufgabe;
    const hilfe = !st.frei;
    const luecken = teile.flat().filter(a => a.soll);
    let aktiv = luecken[0], fertig = false;
    el.innerHTML = `
      <div class="bau${hilfe ? '' : ' ohne-hilfe'}">
        <div class="bau-zeile"></div>
        <p class="hint bau-stand"></p>
        <div class="bau-leiste">${st.palette.map(b =>
          `<button type="button" class="bau-baustein" data-b="${b}" title="${RhythmusBausteine[b].wort}">${Notenbild.rhythmus([b], { frei: true, eng: true, linie: false })}</button>`).join('')}</div>
        <div class="bau-knoepfe">
          <button type="button" class="small" data-tat="zurueck">${Icons.raw('reset')}Zurück</button>
          <button type="button" class="small" data-tat="meins">${Icons.raw('volume')}Meins anhören</button>
          <button type="button" class="primary" data-tat="pruefen" disabled>${Icons.raw('check')}Prüfen</button>
        </div>
        <div class="bau-loesung"></div>
      </div>`;
    const zeile = el.querySelector('.bau-zeile');
    const stand = el.querySelector('.bau-stand');
    const pruefen = el.querySelector('[data-tat="pruefen"]');
    const rest = a => a.luecke - this.dauer(a.inhalt);
    const ist = () => teile.map(t => t.flatMap(a => a.fest ? [a.fest] : a.inhalt));
    const svg = b => Notenbild.rhythmus([b], { frei: true, eng: true, linie: false });

    const zeichnen = (ergebnis) => {
      let html = `<div class="bau-taktart"><span>${schlaege}</span><span>4</span></div>`;
      teile.forEach((t, ti) => {
        if (ti) html += '<div class="bau-strich"></div>';
        const klasse = ergebnis ? (ergebnis[ti] ? ' gut' : ' falsch') : '';
        html += `<div class="bau-takt${klasse}">`;
        t.forEach(a => {
          if (a.fest) { html += `<div class="bau-fest" style="flex:${RhythmusBausteine[a.fest].schlaege} 1 0">${svg(a.fest)}</div>`; return; }
          const i = luecken.indexOf(a);
          const breite = hilfe ? a.luecke : Math.max(1, this.dauer(a.inhalt) + (fertig ? 0 : 0.6));
          html += `<div class="bau-luecke${a === aktiv && !fertig ? ' aktiv' : ''}" data-l="${i}" style="flex:${breite} 1 0">`;
          a.inhalt.forEach((b, k) => { html += `<button type="button" class="bau-stein" data-l="${i}" data-k="${k}" style="flex:${RhythmusBausteine[b].schlaege} 1 0">${svg(b)}</button>`; });
          if (hilfe) for (let r = rest(a); r > 0.001; r--) html += '<span class="bau-leer" style="flex:1 1 0"></span>';
          else if (!fertig) html += '<span class="bau-cursor">+</span>';
          html += '</div>';
        });
        html += '</div>';
      });
      zeile.innerHTML = html;
      if (fertig) return;
      if (hilfe) {
        const offen = luecken.reduce((s, a) => s + rest(a), 0);
        stand.textContent = offen ? `Noch ${offen} ${offen === 1 ? 'Viertel' : 'Viertel'} frei. Tippe auf eine Lücke, um sie auszuwählen.`
                                  : 'Alles voll – jetzt prüfen.';
        pruefen.disabled = offen > 0;
      } else {
        stand.textContent = `Ohne Hilfe: Achte selbst darauf, dass jeder Takt genau ${schlaege} Viertel lang ist.`;
        pruefen.disabled = luecken.some(a => !a.inhalt.length);
      }
    };

    const hinweis = text => {
      stand.textContent = text;
      stand.classList.remove('wackeln'); void stand.offsetWidth; stand.classList.add('wackeln');
    };

    el.querySelector('.bau-leiste').addEventListener('click', e => {
      const knopf = e.target.closest('.bau-baustein');
      if (!knopf || fertig) return;
      const b = knopf.dataset.b;
      if (hilfe && RhythmusBausteine[b].schlaege > rest(aktiv) + 0.001) {
        return hinweis(rest(aktiv) ? `Passt nicht: In der Lücke ist nur noch Platz für ${rest(aktiv)} Viertel.` : 'Diese Lücke ist schon voll. Tippe auf eine andere.');
      }
      aktiv.inhalt.push(b);
      // Mit Hilfe springt die Auswahl zur nächsten Lücke, sobald eine voll ist
      if (hilfe && rest(aktiv) < 0.001) aktiv = luecken.find(a => rest(a) > 0.001) || aktiv;
      zeichnen();
    });

    zeile.addEventListener('click', e => {
      if (fertig) return;
      const stein = e.target.closest('.bau-stein');
      const luecke = e.target.closest('.bau-luecke');
      if (stein) {
        aktiv = luecken[+stein.dataset.l];
        aktiv.inhalt.splice(+stein.dataset.k, 1);
      } else if (luecke) aktiv = luecken[+luecke.dataset.l];
      zeichnen();
    });

    el.querySelector('[data-tat="zurueck"]').addEventListener('click', () => {
      if (fertig) return;
      const a = aktiv.inhalt.length ? aktiv : [...luecken].reverse().find(x => x.inhalt.length);
      if (a) { a.inhalt.pop(); aktiv = a; }
      zeichnen();
    });

    el.querySelector('[data-tat="meins"]').addEventListener('click', () => {
      Ton.stopp();
      this.spielen(ist(), tempo, schlaege);
    });

    pruefen.addEventListener('click', () => {
      if (fertig || pruefen.disabled) return;
      fertig = true;
      const meine = ist();
      const ergebnis = meine.map((t, i) => this.dauer(t) === schlaege && this.klang(t) === this.klang(soll[i]));
      const ok = ergebnis.every(Boolean);
      const satz = meine.map((t, i) => {
        if (ergebnis[i]) return null;
        const d = this.dauer(t), nr = teile.length > 1 ? `Takt ${i + 1}` : 'Der Takt';
        if (d > schlaege) return `${nr} ist zu lang: ${d} statt ${schlaege} Viertel.`;
        if (d < schlaege) return `${nr} ist zu kurz: ${d} statt ${schlaege} Viertel.`;
        return `${nr} ist voll, klingt aber anders.`;
      }).filter(Boolean);
      aufgabe.loesung = `${satz.join(' ')} Unten steht der richtige Rhythmus.`;
      zeichnen(ergebnis);
      el.querySelector('.bau-leiste').hidden = true;
      el.querySelectorAll('[data-tat="zurueck"], [data-tat="pruefen"]').forEach(b => { b.hidden = true; });
      stand.textContent = ok ? 'Genau so klang es!' : '';
      if (!ok) {
        el.querySelector('.bau-loesung').innerHTML = '<p class="hint">So war es richtig:</p>' +
          Notenbild.rhythmus(soll, { schlaege, markiert: ergebnis.indexOf(false), linie: false });
        // Erst das Original, dann die eigene Version
        Ton.stopp();
        const d1 = this.spielen(soll, tempo, schlaege, 0.2);
        const d2 = this.spielen(meine, tempo, schlaege, 0.2 + d1 + 0.5);
        stand.innerHTML = `${Icons.raw('volume')}<strong>Original</strong>, danach <strong>deine Version</strong>`;
        aufgabe.wartezeit = (0.7 + d1 + d2) * 1000;
      }
      antwort(ok);
    });

    zeichnen();
  },
};

const VIER_SELTEN_DREI = [4, 4, 4, 4, 3];

SPIELE.splice(SPIELE.findIndex(s => s.id === 'rhythmus-detektiv') + 1, 0, {
  id: 'rhythmus-bauen',
  bereich: 'Rhythmus',
  titel: 'Rhythmus nachbauen',
  text: 'Ein Rhythmus erklingt, ein Teil der Noten steht schon da. Setze die fehlenden Notenwerte ein – erst einzelne, bald ganze Takte, am Ende ganz ohne Hilfe.',
  icon: 'pen',
  farbe: '#93c5fd',
  /* Fast immer 4/4, ab Stufe 5 ab und zu (jede fünfte Aufgabe) 3/4.
     art: einzeln (anzahl Zählzeiten), haelfte (halber Takt), takt (ganze Takte).
     frei: keine leeren Kästchen, keine Sperre – man kann zu viel eintragen. */
  stufen: [
    { name: 'Eine Lücke', art: 'einzeln', anzahl: 1, bausteine: ['H', 'V', 'AA', 'Vp'], palette: ['V', 'AA', 'Vp'] },
    { name: 'Zwei Lücken', art: 'einzeln', anzahl: 2, bausteine: ['H', 'V', 'AA', 'Vp'], palette: ['H', 'V', 'AA', 'Vp'] },
    { name: 'Ein halber Takt', art: 'haelfte', bausteine: ['H', 'V', 'AA', 'Vp'], palette: ['H', 'V', 'AA', 'Vp'] },
    { name: 'Ein ganzer Takt', art: 'takt', bausteine: ['H', 'V', 'AA', 'Vp'], palette: ['H', 'V', 'AA', 'Vp'] },
    { name: 'Zwei ganze Takte', art: 'takt', takte: 2, schlaege: VIER_SELTEN_DREI, bausteine: ['G', 'H', 'V', 'AA', 'Vp'], palette: ['G', 'H', 'V', 'AA', 'Vp'] },
    { name: 'Ohne Hilfe: ein Takt', art: 'takt', frei: true, schlaege: VIER_SELTEN_DREI, bausteine: ['G', 'H', 'V', 'AA', 'Vp'], palette: ['G', 'H', 'V', 'AA', 'Vp'] },
    { name: 'Ohne Hilfe: zwei Takte', art: 'takt', takte: 2, frei: true, schlaege: VIER_SELTEN_DREI, bausteine: ['G', 'H', 'V', 'AA', 'Vp'], palette: ['G', 'H', 'V', 'AA', 'Vp'] },
    { name: 'Ohne Hilfe: drei Takte', art: 'takt', takte: 3, frei: true, schlaege: [4, 4, 4, 3], bausteine: ['G', 'H', 'V', 'AA', 'Vp'], palette: ['G', 'H', 'V', 'AA', 'Vp'] },
  ],
  aufgabe(st) {
    for (let v = 0; v < 100; v++) {
      const schlaege = zufall(st.schlaege || [4]);
      const soll = Detektiv.stueck({ ...st, neu: ['AA', 'Vp'] }, st.takte || 1, schlaege);
      const teile = Bauen.luecken(st, soll, schlaege);
      if (!teile) continue;
      const tempo = schlaege === 3 ? 84 : 76;
      return {
        frage: st.art === 'takt' ? 'Hör zu und baue den Rhythmus nach.' : 'Hör zu und setze die fehlenden Notenwerte ein.',
        hoeren: () => Bauen.spielen(soll, tempo, schlaege),
        soll, schlaege, tempo, teile,
        loesung: 'Unten steht der richtige Rhythmus.',
        eigen(el, antwort, aufgabe) { Bauen.starte(el, st, aufgabe, antwort); },
      };
    }
  },
});
