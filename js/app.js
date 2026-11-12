/* music-trainer: Startseite, Anmeldung, Spielablauf, Punkte und Sterne.

   Der Fortschritt liegt immer im Browser (localStorage). Angemeldete Kinder
   gleichen ihn zusätzlich über den Worker ab (konto.js). */

const Fortschritt = {
  daten: {},

  laden() {
    try { this.daten = JSON.parse(localStorage.getItem(Konto.speicherKey())) || {}; }
    catch { this.daten = {}; }
  },

  speichern() {
    try { localStorage.setItem(Konto.speicherKey(), JSON.stringify(this.daten)); } catch { /* privates Fenster */ }
  },

  /* Stand vom Server übernehmen, ohne bessere Werte vom Gerät zu verlieren */
  zusammenfuehren(server) {
    Object.entries(server || {}).forEach(([spiel, stufen]) => {
      Object.entries(stufen).forEach(([stufe, w]) => {
        const alt = this.bester(spiel, stufe);
        (this.daten[spiel] ||= {})[stufe] = { sterne: Math.max(alt.sterne, w.sterne), punkte: Math.max(alt.punkte, w.punkte) };
      });
    });
    this.speichern();
  },

  bester(spielId, stufe) {
    return (this.daten[spielId] || {})[stufe] || { sterne: 0, punkte: 0 };
  },

  /* Die drei besten Runden je Stufe („top“, Sterne) – daraus rechnet „Meine Note“
     wie das School-Tool den Schnitt der besten drei. Vom Server kommen die Runden,
     die er kennt; dazu die, die noch auf dem Gerät warten. */
  besteSetzen(beste3) {
    if (!beste3) return;
    const offen = Konto.offene();
    Object.entries(beste3).forEach(([spiel, stufen]) => Object.entries(stufen).forEach(([stufe, liste]) => {
      const dazu = offen.filter(o => o.spiel === spiel && String(o.stufe) === stufe).map(o => o.sterne);
      const w = (this.daten[spiel] ||= {})[stufe] ||= { sterne: 0, punkte: 0 };
      w.top = [...liste, ...dazu].sort((a, b) => b - a).slice(0, 3);
    }));
    this.speichern();
  },

  /* Schnitt der besten drei Runden in Sternen (weniger gespielt: der gespielten), null = noch nicht */
  schnitt3(spielId, stufe) {
    const w = this.bester(spielId, stufe);
    const top = w.top || (w.sterne ? [w.sterne] : []);
    return top.length ? top.reduce((a, n) => a + n, 0) / top.length : null;
  },

  /* Merkt sich nur Verbesserungen. Gibt zurück, ob es ein neuer Rekord war.
     richtig/von (richtige Antworten von so vielen Aufgaben) und die Dauer in
     Sekunden gehen nur an den Server – fürs School-Tool. */
  eintragen(spielId, stufe, sterne, punkte, richtig, von, dauer) {
    const alt = this.bester(spielId, stufe);
    const neu = {
      sterne: Math.max(alt.sterne, sterne), punkte: Math.max(alt.punkte, punkte),
      top: [...(alt.top || (alt.sterne ? [alt.sterne] : [])), sterne].sort((a, b) => b - a).slice(0, 3),
    };
    this.daten[spielId] = { ...(this.daten[spielId] || {}), [stufe]: neu };
    this.speichern();
    Konto.melden({ spiel: spielId, stufe, sterne, punkte, richtig, von, dauer });
    return punkte > alt.punkte;
  },

  sterneVon(spiel) {
    return spiel.stufen.reduce((s, _, i) => s + this.bester(spiel.id, i).sterne, 0);
  },

  name() { try { return localStorage.getItem('musiktrainer-name') || ''; } catch { return ''; } },
  setzeName(n) { try { localStorage.setItem('musiktrainer-name', n); } catch { /* egal */ } },
};

/* Bewertung wie eine Schulnote: 6 Sterne = Note 1 … 1 Stern = Note 6.
   0 heißt „noch nicht gespielt“. Schlüssel nach Anteil richtiger Aufgaben:
   alle → 1 · ab 90 % → 2 · ab 70 % → 3 · ab 50 % → 4 · ab 30 % → 5 · darunter → 6.
   Bei 10 Aufgaben: 10 · 9 · 7–8 · 5–6 · 3–4 · 0–2; bei 15: 15 · 14 · 11–13 · 8–10 · 5–7 · 0–4. */
const Bewertung = {
  MAX: 6,
  NOTEN: ['', 'sehr gut', 'gut', 'befriedigend', 'ausreichend', 'mangelhaft', 'ungenügend'],

  ausRichtig(r, n = 10) { return r >= n ? 6 : 10 * r >= 9 * n ? 5 : 10 * r >= 7 * n ? 4 : 10 * r >= 5 * n ? 3 : 10 * r >= 3 * n ? 2 : 1; },
  anzahl(spiel) { return spiel.anzahl || 10; },

  /* Zeitspiele (Blitzlesen): ziel[2] richtige Noten in 60 s sind die 1,
     die übrigen Stufen anteilig darunter. Gibt die Schwellen für 2 … 6 Sterne. */
  zeitSchwellen(ziel) { return [0.3, 0.5, 0.7, 0.85, 1].map(f => Math.max(1, Math.round(ziel[2] * f))); },
  ausZeit(r, ziel) { return 1 + this.zeitSchwellen(ziel).filter(z => r >= z).length; },

  note(sterne) { return sterne ? 7 - sterne : null; },
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const sterneHtml = (anzahl, von = Bewertung.MAX) =>
  Array.from({ length: von }, (_, i) =>
    `<span class="stern${i < anzahl ? ' an' : ''}">${Icons.raw('star')}</span>`).join('');

/* ---------- Klaviertastatur ---------- */
const Klavier = {
  SCHWARZ: [1, 3, 6, 8, 10],

  erzeuge(von, bis, beiTaste) {
    const el = document.createElement('div');
    el.className = 'klavier';
    const weisse = [];
    for (let m = von; m <= bis; m++) if (!this.SCHWARZ.includes(m % 12)) weisse.push(m);
    const breite = 100 / weisse.length;
    const tasten = {};
    let gesperrt = false;

    const taste = (m, klasse, stil) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'taste ' + klasse;
      if (stil) b.style.cssText = stil;
      if (m % 12 === 0) b.innerHTML = `<span class="taste-c">${Stufe.vollerName((m - 60) / 12 * 7)}</span>`;
      b.setAttribute('aria-label', `Taste ${m}`);
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (gesperrt) return;
        gesperrt = true;
        el.classList.add('gesperrt');
        beiTaste(m);
      });
      tasten[m] = b;
      el.appendChild(b);
    };

    weisse.forEach(m => taste(m, 'weiss', `width:${breite}%`));
    weisse.forEach((m, i) => {
      if (m + 1 <= bis && this.SCHWARZ.includes((m + 1) % 12))
        taste(m + 1, 'schwarz', `left:${(i + 1) * breite - breite * 0.32}%;width:${breite * 0.64}%`);
    });

    return {
      el,
      markiere(m, klasse) { tasten[m]?.classList.add(klasse); },
    };
  },
};

/* ---------- Rhythmus-Echo: Vorspielen, dann nachklopfen ---------- */
const RhythmusEcho = {
  TOLERANZ: 0.25,       // in Schlägen

  starte(el, takt, tempo, antwort, aufgabe) {
    const schlag = 60 / tempo;
    el.innerHTML = `
      <div class="echo">
        <div class="echo-schlaege">${'<span></span>'.repeat(4)}</div>
        <div class="echo-phase hint">Tippe auf Start, dann zählt das Metronom vier Schläge ein.</div>
        <button type="button" class="echo-pad bereit">${Icons.raw('play')}Start</button>
        <div class="echo-zeitleiste" hidden></div>
      </div>`;
    const pad = el.querySelector('.echo-pad');
    const phase = el.querySelector('.echo-phase');
    const punkte = [...el.querySelectorAll('.echo-schlaege span')];
    const leiste = el.querySelector('.echo-zeitleiste');
    const tipps = [];
    let zustand = 'bereit', beginnDu = 0;

    const tippen = () => {
      if (zustand === 'bereit') return abspielen();
      if (zustand !== 'aufnahme' && zustand !== 'gleich') return;
      Ton.snare(0, 0.8);
      tipps.push((Ton.jetzt() - Ton.verzoegerung() - beginnDu) / schlag);
      pad.classList.remove('puls'); void pad.offsetWidth; pad.classList.add('puls');
    };
    pad.addEventListener('pointerdown', e => { e.preventDefault(); tippen(); });
    const taste = e => { if (e.code === 'Space') { e.preventDefault(); tippen(); } };
    document.addEventListener('keydown', taste);
    App.beimAufraeumen(() => document.removeEventListener('keydown', taste));

    /* Ablauf in Schlägen: 0–3 Einzählen, 4–7 Vorspielen, 8–11 Einzählen,
       12–15 nachklopfen. */
    const abspielen = () => {
      zustand = 'hoeren';
      pad.classList.remove('bereit');
      pad.innerHTML = `${Icons.raw('ear')}Hör zu …`;
      const { beginn } = Rhythmus.abspielen(takt, tempo);
      for (let i = 8; i < 16; i++) Ton.klick(i * schlag, i % 4 === 0);
      beginnDu = beginn + 8 * schlag;
      const start = Ton.jetzt();
      for (let i = 0; i < 16; i++) {
        App.spaeter(() => {
          punkte.forEach((p, k) => p.classList.toggle('an', k === i % 4));
          if (i === 0) phase.textContent = 'Einzählen …';
          if (i === 4) phase.textContent = 'Hör genau zu!';
          if (i === 8) { phase.textContent = 'Gleich bist du dran: 1 – 2 – 3 – 4'; pad.innerHTML = `${Icons.raw('hand')}Gleich …`; }
          if (i === 11) zustand = 'gleich';
          if (i === 12) { zustand = 'aufnahme'; phase.textContent = 'Jetzt klopfen!'; pad.classList.add('aktiv'); pad.innerHTML = `${Icons.raw('hand')}Klopf hier`; }
        }, ((beginn - 4 * schlag - start) + i * schlag) * 1000);
      }
      App.spaeter(auswerten, ((beginnDu - start) + 4.4 * schlag) * 1000);
    };

    const auswerten = () => {
      zustand = 'fertig';
      punkte.forEach(p => p.classList.remove('an'));
      pad.classList.remove('aktiv');
      pad.disabled = true;
      pad.innerHTML = 'Fertig';
      const soll = Rhythmus.einsaetze(takt);
      const ist = tipps.filter(t => t > -0.4 && t < 4.3);
      const frei = [...ist];
      const treffer = soll.map(s => {
        let best = -1;
        frei.forEach((t, i) => { if (Math.abs(t - s) <= this.TOLERANZ && (best < 0 || Math.abs(t - s) < Math.abs(frei[best] - s))) best = i; });
        if (best < 0) return null;
        return frei.splice(best, 1)[0];
      });
      const ok = treffer.every(t => t !== null) && ist.length === soll.length;
      const pos = b => `${Math.min(100, Math.max(0, b / 4 * 100))}%`;
      leiste.hidden = false;
      leiste.innerHTML = '<div class="zl-schlaege">' + '<span></span>'.repeat(4) + '</div>' +
        soll.map(s => `<i class="zl-soll" style="left:${pos(s)}"></i>`).join('') +
        ist.map(t => `<b class="zl-ist ${treffer.includes(t) ? 'gut' : 'daneben'}" style="left:${pos(t)}"></b>`).join('');
      phase.textContent = ok ? 'Genau im Takt!'
        : ist.length < soll.length ? `Es fehlen Schläge: ${soll.length} Töne, du hast ${ist.length}× geklopft.`
        : ist.length > soll.length ? `Zu viele Schläge: ${soll.length} Töne, du hast ${ist.length}× geklopft.`
        : 'Fast – einige Schläge lagen daneben.';
      if (!ok && aufgabe.nachLoesung && !aufgabe.bild)
        el.insertAdjacentHTML('afterbegin', `<div class="bild">${aufgabe.nachLoesung()}</div>`);
      antwort(ok);
    };
  },
};

/* ---------- Ablauf ---------- */
const App = {
  el: null,
  timer: [],
  aufraeumer: [],
  runde: null,

  init() {
    Konto.laden();
    Fortschritt.laden();
    this.el = document.getElementById('app');
    Icons.hydrate();
    Theme.updateButton();
    this.kontoLeiste();
    document.getElementById('btn-theme').addEventListener('click', () => Theme.toggle());
    // Im Klick den Ton freigeben – auf dem iPad klingt sonst die erste Taste nicht sofort
    ['btn-klavier', 'btn-schlagzeug'].forEach(id => document.getElementById(id).addEventListener('click', () => Ton.audio()));
    if (Konto.angemeldet()) Konto.abgleichen().then(() => { if (!this.runde && Konto.angemeldet()) this.route(); });
    document.addEventListener('keydown', e => this.taste(e));
    window.addEventListener('hashchange', () => this.route());
    /* Die Notenschrift lädt der Browser sonst erst, wenn der erste Schlüssel
       gezeichnet wird – dann fehlt er bei der ersten Aufgabe. */
    document.fonts?.load('52px "Noto Music"', '\u{1D11E}\u{1D122}').catch(() => {});
    this.route();
  },

  spaeter(fn, ms) { this.timer.push(setTimeout(fn, ms)); },
  beimAufraeumen(fn) { this.aufraeumer.push(fn); },

  aufraeumen() {
    this.timer.forEach(clearTimeout);
    this.timer = [];
    this.aufraeumer.forEach(fn => fn());
    this.aufraeumer = [];
    if (this.runde?.uhr) clearInterval(this.runde.uhr);
    this.runde = null;
    Ton.stopp();
  },

  route() {
    this.aufraeumen();
    const [pfad, abfrage] = location.hash.split('?');
    const [, art, id] = pfad.split('/');
    const spiel = SPIELE.find(s => s.id === id);
    /* Anmelde-Link aus dem QR-Code: #/anmelden?u=LenaMüller&p=… – meldet ein
       anderes Kind auf diesem iPad ab und gleich das neue an */
    const link = art === 'anmelden' && abfrage ? new URLSearchParams(abfrage) : null;
    if (link && Konto.verfuegbar()) {
      if (Konto.angemeldet()) { Konto.abmelden(); Fortschritt.laden(); this.kontoLeiste(); }
      this.zeigeAnmeldung(link.get('u'), link.get('p'));
    }
    else if (art === 'spiel' && spiel) this.zeigeSpiel(spiel);
    else if (art === 'klavier') Klavierseite.zeigen(this.el);
    else if (art === 'schlagzeug') Schlagzeugseite.zeigen(this.el, id);
    else if (art === 'pruefung') Pruefungsseite.zeigen(this.el, id);
    else if (art === 'anmelden' && Konto.verfuegbar() && !Konto.angemeldet()) this.zeigeAnmeldung();
    else this.zeigeStart();
    this.werkzeugKnoepfe(art, pfad);
    window.scrollTo(0, 0);
  },

  /* Die Knöpfe „Klavier“ und „Schlagzeug“ oben öffnen die Seite zum freien Spielen; dort
     führt derselbe Knopf zurück, wo man vorher war (die Adresse ohne Anmeldedaten), sonst
     zur Startseite. Von Klavier zu Schlagzeug gewechselt, bleibt das Ziel dasselbe. */
  werkzeugKnoepfe(art, pfad) {
    const werkzeuge = { klavier: 'Klavier zum freien Spielen', schlagzeug: 'Schlagzeug zum freien Spielen' };
    if (!(art in werkzeuge)) this.vorWerkzeug = pfad || '#/';
    Object.entries(werkzeuge).forEach(([w, titel]) => {
      const k = document.getElementById(`btn-${w}`);
      const an = art === w;
      k.classList.toggle('aktiv', an);
      k.href = an ? this.vorWerkzeug || '#/' : `#/${w}`;
      k.title = an ? 'Zurück zum music-trainer' : titel;
    });
  },

  /* ---------- Anmeldung ---------- */
  kontoLeiste() {
    const ort = document.getElementById('konto-leiste');
    if (!Konto.verfuegbar()) { ort.innerHTML = ''; return; }
    if (Konto.angemeldet()) {
      ort.innerHTML = `
        <span class="konto-chip" title="Angemeldet in ${esc(Konto.daten.klasse)}">${Icons.raw('user')}<span class="konto-name">${esc(Konto.daten.name)}</span></span>
        <button type="button" id="btn-abmelden" class="small" title="Abmelden – wichtig auf geteilten iPads">Abmelden</button>`;
      document.getElementById('btn-abmelden').addEventListener('click', () => this.abmelden());
    } else {
      ort.innerHTML = `<a class="knopf small" href="#/anmelden">${Icons.raw('user')}Anmelden</a>`;
    }
  },

  abmelden() {
    Konto.abmelden();
    Fortschritt.laden();
    this.kontoLeiste();
    location.hash = '#/anmelden';
    this.route();
  },

  /* Der Server kennt die Anmeldung nicht mehr (abgelaufen, Konto gelöscht) */
  abgemeldet(grund) {
    Fortschritt.laden();
    this.kontoLeiste();
    if (!this.runde) { location.hash = '#/anmelden'; this.route(); }
    const hinweis = document.getElementById('anmelde-fehler');
    if (hinweis) hinweis.textContent = `${grund}. Bitte melde dich neu an.`;
  },

  zeigeAnmeldung(linkName, linkPasswort) {
    this.el.innerHTML = `
      <section class="card anmeldung">
        <span class="spiel-icon gross" style="--farbe:var(--accent)">${Icons.raw('user')}</span>
        <h2>Anmelden</h2>
        <div class="regel">
          <p><strong>Am schnellsten:</strong> deinen QR-Code am Beamer mit der iPad-Kamera scannen.</p>
          <p><strong>Oder:</strong> Benutzername und Passwort von deinem Kärtchen eintippen.
             Groß/klein ist egal.</p>
        </div>
        <form id="anmelde-form" autocomplete="off">
          <label>Benutzername
            <input type="text" id="a-name" maxlength="45" required autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="z. B. PandaGeige42"></label>
          <label>Passwort
            <input type="password" id="a-pw" maxlength="30" required autocapitalize="none" autocorrect="off"></label>
          <p class="fehler" id="anmelde-fehler" aria-live="polite"></p>
          <button type="submit" class="primary">Los geht's</button>
        </form>
        <a class="gast-link" href="#/">Ohne Anmeldung spielen</a>
      </section>`;
    const form = document.getElementById('anmelde-form');
    const fehler = document.getElementById('anmelde-fehler');
    document.getElementById('a-name').focus();
    // Name und Passwort sofort aus der Adresse nehmen, damit das Passwort nicht im Verlauf bleibt
    if (linkName) history.replaceState(null, '', location.pathname + location.search + '#/anmelden');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const knopf = form.querySelector('button');
      knopf.disabled = true;
      fehler.textContent = '';
      try {
        const d = await Konto.anmelden(document.getElementById('a-name').value, document.getElementById('a-pw').value);
        Fortschritt.laden();
        Fortschritt.zusammenfuehren(d.fortschritt);
        Fortschritt.besteSetzen(d.beste3);
        this.kontoLeiste();
        this.willkommen = Object.keys(d.fortschritt).length ? 'zurueck' : 'neu';
        if (location.hash === '#/') this.route();
        else location.hash = '#/';
      } catch (err) {
        fehler.textContent = err.status ? err.message : 'Keine Verbindung zum Server. Bist du im Internet?';
        knopf.disabled = false;
      }
    });
    if (linkName && linkPasswort) {
      document.getElementById('a-name').value = linkName;
      document.getElementById('a-pw').value = linkPasswort;
      form.requestSubmit();
    }
  },

  /* ---------- Startseite ---------- */
  zeigeStart() {
    const gesamt = SPIELE.reduce((s, sp) => s + Fortschritt.sterneVon(sp), 0);
    const moeglich = SPIELE.reduce((s, sp) => s + sp.stufen.length * Bewertung.MAX, 0);
    const bereiche = [...new Set(SPIELE.map(s => s.bereich))];
    const konto = Konto.angemeldet() ? Konto.daten : null;
    const name = konto ? konto.name : Fortschritt.name();
    const willkommen = this.willkommen;
    this.willkommen = null;
    this.el.innerHTML = `
      <section class="card held">
        <div>
          <h2>${name ? `${willkommen === 'zurueck' ? 'Willkommen zurück' : 'Hallo'} ${esc(name)}!` : 'Willkommen beim music-trainer!'}</h2>
          <p class="hint">Trainiere dein Gehör, lies Noten und klopfe Rhythmen. Jedes Spiel hat mehrere Stufen –
             für jede Runde gibt es bis zu sechs Sterne – sechs Sterne sind eine 1.</p>
          ${konto ? `<p class="konto-info">${Icons.raw('check')}Angemeldet in <strong>${esc(konto.klasse)}</strong> – deine Sterne werden gespeichert.</p>`
          : `<div class="gast-zeile">
              <label class="name-feld">${Icons.raw('user')}
                <input type="text" id="name" maxlength="24" placeholder="Dein Vorname" value="${esc(name)}">
              </label>
              ${Konto.verfuegbar() ? `<a class="knopf primary" href="#/anmelden">Anmelden</a>` : ''}
            </div>`}
        </div>
        <div class="gesamt">
          <div class="gesamt-zahl">${Icons.raw('star')}${gesamt}</div>
          <div class="hint">von ${moeglich} Sternen</div>
          <div class="bahn"><div class="balken" style="width:${gesamt / moeglich * 100}%"></div></div>
        </div>
      </section>
      ${konto ? this.meineNote() : ''}
      ${bereiche.map(b => `
        <h2 class="bereich-titel">${b}${typeof BEREICH_INFO !== 'undefined' && BEREICH_INFO[b] ? `<span class="bereich-info">${BEREICH_INFO[b]}</span>` : ''}</h2>
        <div class="spiele-raster">
          ${SPIELE.filter(s => s.bereich === b).map(s => `
            <a class="card spiel-karte" href="#/spiel/${s.id}" style="--farbe:${s.farbe}">
              <span class="spiel-icon">${Icons.raw(s.icon)}</span>
              <span class="spiel-titel">${s.titel}</span>
              <span class="hint">${s.text}</span>
              <span class="spiel-sterne">${Icons.raw('star')} ${Fortschritt.sterneVon(s)} / ${s.stufen.length * Bewertung.MAX}</span>
            </a>`).join('')}
          ${b === 'Rhythmus' ? `
            <a class="card spiel-karte" href="#/pruefung" style="--farbe:#5eead4">
              <span class="spiel-icon">${Icons.raw('drum')}</span>
              <span class="spiel-titel">Prüfungszeilen Klasse 5 und 6</span>
              <span class="hint">Wähle deine Zeile (Note 5 bis 1) und spiel sie auf den Pads mit – am Ende siehst du, wie genau du warst.</span>
              <span class="spiel-sterne">${Icons.raw('star')} ${Pruefungsseite.sterneSumme()} / 60</span>
            </a>` : ''}
        </div>`).join('')}`;
    const feld = document.getElementById('name');
    feld?.addEventListener('change', () => { Fortschritt.setzeName(feld.value.trim()); this.zeigeStart(); });
  },

  /* „Meine Note“: die Aufgaben, die die Lehrkraft für die Note ausgewählt hat.
     Dieselbe Rechnung wie im School-Tool: Note je Aufgabe = 7 − Schnitt der Sterne
     der drei besten Runden, davon der Durchschnitt; nicht Gespieltes zählt nur
     mit, wenn die Lehrkraft „zählt als 6“ gewählt hat. */
  meineNote() {
    const b = Konto.daten?.benotung;
    const aufgaben = (b?.liste || []).map(w => {
      const [id, i] = w.split('|');
      const spiel = SPIELE.find(s => s.id === id);
      const sterne = Fortschritt.schnitt3(id, +i);
      return spiel?.stufen[+i] ? { spiel, stufe: +i, top: Fortschritt.bester(id, +i).top, note: sterne ? 7 - sterne : null } : null;
    }).filter(Boolean).sort((x, y) => SPIELE.indexOf(x.spiel) - SPIELE.indexOf(y.spiel)
      || stufenReihe(x.spiel).indexOf(x.stufe) - stufenReihe(y.spiel).indexOf(y.stufe));
    if (!aufgaben.length) return '';
    const zaehlen = aufgaben.map(a => a.note ?? (b.fehltAls6 ? 6 : null)).filter(n => n !== null);
    const schnitt = zaehlen.length ? zaehlen.reduce((s, n) => s + n, 0) / zaehlen.length : null;
    const komma = x => x.toFixed(1).replace('.', ',');
    const kurz = x => komma(x).replace(',0', '');
    const offen = aufgaben.filter(a => !a.note);
    const schlechteste = aufgaben.reduce((x, a) => (a.note > (x?.note ?? 1) ? a : x), null);
    const name = a => `„${a.spiel.titel} (${a.spiel.bereich}) – ${a.spiel.stufen[a.stufe].name}“`;
    // Was eine Runde mit 6 Sternen aus der schlechtesten Aufgabe machen würde
    const mitSechs = a => {
      const top = [...(a.top || [7 - a.note]), 6].sort((x, y) => y - x).slice(0, 3);
      return 7 - top.reduce((s, n) => s + n, 0) / top.length;
    };
    const tipp = offen.length
      ? `Noch ${offen.length === 1 ? 'eine Aufgabe' : `${offen.length} Aufgaben`} offen${b.fehltAls6 ? ' – was du nicht spielst, zählt als 6' : ''}. Tipp drauf und spiel los!`
      : schlechteste
        ? `Am meisten bringt dir ${name(schlechteste)}: Mit einer Runde mit 6 Sternen wird aus ${kurz(schlechteste.note)} eine ${kurz(mitSechs(schlechteste))}.`
        : 'Überall eine 1 – stark!';
    return `
      <section class="card meine-note">
        <div class="meine-note-kopf">
          <div>
            <h2>${Icons.raw('star')}Meine Note</h2>
            <p class="hint">Diese ${aufgaben.length === 1 ? 'Aufgabe zählt' : `${aufgaben.length} Aufgaben zählen`} für deine Note.
              Je Aufgabe zählt der Schnitt deiner drei besten Runden – du kannst so oft üben, wie du willst.</p>
          </div>
          <div class="note-gross${schnitt ? ` n${Math.round(schnitt)}` : ''}" title="Durchschnitt deiner Aufgaben">${schnitt ? komma(schnitt) : '–'}</div>
        </div>
        <ul class="note-liste">
          ${aufgaben.map(a => `
            <li><a href="#/spiel/${a.spiel.id}">
              <span class="note-aufgabe">${esc(a.spiel.titel)}<span class="hint">${esc(a.spiel.bereich)} · ${esc(a.spiel.stufen[a.stufe].name)}</span></span>
              ${a.note ? `<span class="note-kreis n${Math.round(a.note)}${Number.isInteger(a.note) ? '' : ' dezimal'}"
                  title="Deine besten Runden: ${(a.top || [7 - a.note]).join(', ')} Sterne">${kurz(a.note)}</span>`
                : '<span class="note-kreis offen">offen</span>'}
            </a></li>`).join('')}
        </ul>
        <p class="note-tipp">${Icons.raw('next')}${tipp}</p>
      </section>`;
  },

  /* ---------- Spielseite mit Stufenwahl ---------- */
  zeigeSpiel(spiel) {
    this.el.innerHTML = `
      <a class="zurueck" href="#/">${Icons.raw('back')}Alle Spiele</a>
      <section class="card spiel-intro" style="--farbe:${spiel.farbe}">
        <span class="spiel-icon gross">${Icons.raw(spiel.icon)}</span>
        <h2>${spiel.titel}</h2>
        <p class="hint">${spiel.text}</p>
        <div class="stufen">
          ${stufenReihe(spiel).map((i, platz) => {
            const st = spiel.stufen[i];
            const b = Fortschritt.bester(spiel.id, i);
            return `<button type="button" class="stufe" data-stufe="${i}">
              <span class="stufe-nr">${st.info ? st.name : `Stufe ${platz + 1}`}</span>
              <span class="stufe-name">${st.info || st.name}</span>
              <span class="stufe-sterne">${sterneHtml(b.sterne)}</span>
              <span class="hint">${b.sterne ? `Beste Note ${Bewertung.note(b.sterne)} · ${b.punkte} Punkte` : spiel.zeit ? `${spiel.zeit} Sekunden` : `${Bewertung.anzahl(spiel)} Aufgaben`}</span>
            </button>`;
          }).join('')}
        </div>
      </section>`;
    this.el.querySelectorAll('.stufe').forEach(b =>
      b.addEventListener('click', () => this.starteRunde(spiel, +b.dataset.stufe)));
  },

  /* ---------- Runde ---------- */
  starteRunde(spiel, stufeIdx) {
    this.aufraeumen();
    Ton.audio();      // im Klick entsperren – iPad spielt sonst keinen Ton
    const st = spiel.stufen[stufeIdx];
    this.el.innerHTML = `
      <div class="runde" style="--farbe:${spiel.farbe}">
        <div class="runde-kopf">
          <button type="button" class="small" id="r-abbruch">${Icons.raw('back')}Beenden</button>
          <div class="runde-titel"><strong>${spiel.titel}</strong><span class="hint">${st.info ? `${st.name} · ${st.info}` : `Stufe ${stufenReihe(spiel).indexOf(stufeIdx) + 1} · ${st.name}`}</span></div>
          <div class="runde-stand"><span id="r-stand"></span><span class="punkte" id="r-punkte">0</span></div>
        </div>
        <div class="bahn"><div class="balken" id="r-balken"></div></div>
        <section class="card aufgabe-karte">
          <p class="frage" id="r-frage"></p>
          <div class="bild" id="r-bild"></div>
          <button type="button" id="r-hoeren" class="hoeren-btn">${Icons.raw('volume')}Nochmal hören</button>
          <div id="r-eingabe"></div>
          <div class="rueckmeldung" id="r-rueck" aria-live="polite"></div>
          <button type="button" class="primary weiter-btn" id="r-weiter" hidden>Weiter${Icons.raw('next')}</button>
        </section>
      </div>`;
    this.runde = { spiel, stufeIdx, st, nr: 0, richtig: 0, punkte: 0, serie: 0, aufgabe: null, offen: false, daneben: {}, start: Date.now() };
    document.getElementById('r-abbruch').addEventListener('click', () => this.route());
    document.getElementById('r-hoeren').addEventListener('click', () => this.hoeren());
    document.getElementById('r-weiter').addEventListener('click', () => this.naechste());

    if (spiel.zeit) {
      const r = this.runde;
      r.ende = Date.now() + spiel.zeit * 1000;
      r.uhr = setInterval(() => this.uhrTick(), 200);
      this.uhrTick();
    }
    this.naechste();
  },

  uhrTick() {
    const r = this.runde;
    const rest = Math.max(0, r.ende - Date.now());
    // Zeitspiele: Restzeit und wie viele schon richtig sind
    document.getElementById('r-stand').innerHTML = `${Icons.raw('timer')}${Math.ceil(rest / 1000)} s<span class="r-richtig">${Icons.raw('check')}${r.richtig}</span>`;
    document.getElementById('r-balken').style.width = `${rest / (r.spiel.zeit * 10)}%`;
    if (rest <= 0) this.zeigeErgebnis();
  },

  hoeren() {
    const a = this.runde?.aufgabe;
    if (!a?.hoeren) return;
    Ton.stopp();
    const knopf = document.getElementById('r-hoeren');
    knopf.classList.add('spielt');
    const dauer = a.hoeren();
    this.spaeter(() => knopf.classList.remove('spielt'), dauer * 1000);
  },

  naechste() {
    const r = this.runde;
    if (!r) return;
    if (!r.spiel.zeit && r.nr >= Bewertung.anzahl(r.spiel)) return this.zeigeErgebnis();
    Ton.stopp();
    r.nr++;
    const a = r.spiel.aufgabe(r.st, r.aufgabe);
    r.aufgabe = a;
    r.offen = true;
    if (!r.spiel.zeit) {
      document.getElementById('r-stand').textContent = `${r.nr} / ${Bewertung.anzahl(r.spiel)}`;
      document.getElementById('r-balken').style.width = `${(r.nr - 1) * 100 / Bewertung.anzahl(r.spiel)}%`;
    }
    document.getElementById('r-frage').textContent = a.frage;
    document.getElementById('r-bild').innerHTML = a.bild || '';
    document.getElementById('r-rueck').textContent = '';
    document.getElementById('r-rueck').className = 'rueckmeldung';
    document.getElementById('r-weiter').hidden = true;
    document.getElementById('r-hoeren').hidden = !a.hoeren;

    const eingabe = document.getElementById('r-eingabe');
    eingabe.innerHTML = '';
    eingabe.className = '';
    if (a.eigen) {
      a.eigen(eingabe, ok => this.beantworte(ok, null), a);
    } else {
      eingabe.className = 'optionen' + (a.bilder ? ' bilder' : a.notenwahl ? ' notenwahl' : a.drei ? ' drei' : a.breit ? (a.lang ? ' breit lang' : ' breit') : a.optionen.length > 4 ? ' viele' : a.optionen.length <= 3 ? ' wenige' : '');
      a.optionen.forEach((o, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'option';
        b.innerHTML = o;
        const kuerzel = a.tasten ? a.tasten[i].toUpperCase() : (i < 9 ? i + 1 : '');
        if (kuerzel && !a.breit && !a.bilder) b.insertAdjacentHTML('beforeend', `<kbd>${kuerzel}</kbd>`);
        b.addEventListener('click', () => this.beantworte(i === a.richtig, b));
        eingabe.appendChild(b);
      });
    }
    if (a.hoeren) this.spaeter(() => this.hoeren(), 350);
  },

  beantworte(ok, knopf) {
    const r = this.runde;
    if (!r || !r.offen) return;
    r.offen = false;
    const a = r.aufgabe;
    const optionen = [...document.querySelectorAll('#r-eingabe .option')];
    optionen.forEach(b => (b.disabled = true));
    if (knopf) knopf.classList.add(ok ? 'richtig' : 'falsch');
    if (!ok && optionen[a.richtig]) optionen[a.richtig].classList.add('richtig');
    // Notenspiele: den richtigen Namen groß unter die Note schreiben
    if (!ok && a.ton && a.bild) document.getElementById('r-bild').insertAdjacentHTML('beforeend', `<div class="bild-loesung">${Tonname.vonTon(a.ton)}</div>`);

    if (ok) {
      r.richtig++;
      r.serie++;
      r.punkte += 10 + (r.spiel.zeit ? 0 : Math.min(r.serie - 1, 5) * 2);
    } else {
      r.serie = 0;
      // Notenspiele: falsche Töne kommen öfter wieder und stehen am Ende in der Übersicht
      (a.beiFehler?.() || []).forEach(n => { r.daneben[n] = (r.daneben[n] || 0) + 1; });
    }
    document.getElementById('r-punkte').textContent = r.punkte;

    const rueck = document.getElementById('r-rueck');
    rueck.className = 'rueckmeldung ' + (ok ? 'gut' : 'schlecht');
    rueck.innerHTML = ok
      ? `${Icons.raw('check')}${r.serie >= 3 && !r.spiel.zeit ? `Richtig! ${r.serie} in Folge` : 'Richtig!'}`
      : `${Icons.raw('x')}${a.loesung || 'Leider falsch.'}`;
    a.nachher?.();

    // Kein Klingel-Signal: es beißt sich mit dem Ton, der gerade erklingt
    if (r.spiel.zeit) {
      this.spaeter(() => this.naechste(), ok ? 250 : 1800);   // nach Fehler Zeit zum Lesen der Lösung
      return;
    }
    if (ok) this.spaeter(() => this.naechste(), a.wartezeit || (a.eigen ? 2200 : 1000));
    else {
      const w = document.getElementById('r-weiter');
      w.hidden = false;
      w.focus();
    }
  },

  taste(e) {
    const r = this.runde;
    if (!r || e.metaKey || e.ctrlKey || e.target.tagName === 'INPUT') return;
    const a = r.aufgabe;
    if (e.key === 'Enter' && !document.getElementById('r-weiter').hidden) { e.preventDefault(); return this.naechste(); }
    if (!r.offen || !a || a.eigen) return;
    if (e.code === 'Space' && a.hoeren) { e.preventDefault(); return this.hoeren(); }
    const k = e.key.toLowerCase();
    const i = a.tasten ? a.tasten.indexOf(k) : parseInt(k, 10) - 1;
    const knopf = document.querySelectorAll('#r-eingabe .option')[i];
    if (knopf) knopf.click();
  },

  /* ---------- Ergebnis ---------- */
  /* Sechs leere Sterne füllen sich nacheinander bis zur erreichten Zahl, mit
     einem aufsteigenden Ton je Stern; danach erscheint die Note. */
  zeigeErgebnis() {
    const r = this.runde;
    if (!r) return;
    const { spiel, stufeIdx, st } = r;
    const sterne = spiel.zeit ? Bewertung.ausZeit(r.richtig, st.ziel) : Bewertung.ausRichtig(r.richtig, Bewertung.anzahl(spiel));
    const note = Bewertung.note(sterne);
    const vorher = Fortschritt.bester(spiel.id, stufeIdx);
    // Bei Zeitspielen zählt als „von“ das Ziel für die Note 1 – mehr Richtige gehen also über 100 %
    const von = spiel.zeit ? st.ziel?.[2] : Bewertung.anzahl(spiel);
    // Übungszeit fürs School-Tool; höchstens 15 Minuten, falls das iPad offen liegen bleibt
    const dauer = Math.min(900, Math.round((Date.now() - r.start) / 1000));
    const rekord = Fortschritt.eintragen(spiel.id, stufeIdx, sterne, r.punkte, r.richtig, von, dauer);
    this.aufraeumen();
    const lob = ['', 'Nicht aufgeben – nochmal!', 'Weiter üben!', 'Da geht noch mehr!', 'Gut gemacht!', 'Super!', 'Perfekt!'][sterne];
    const reihe = stufenReihe(spiel);
    const weiter = reihe[reihe.indexOf(stufeIdx) + 1];
    const naechste = weiter !== undefined && sterne >= 4;
    const schwellen = spiel.zeit ? Bewertung.zeitSchwellen(st.ziel) : null;
    const daneben = Object.entries(r.daneben).sort((x, y) => y[1] - x[1]);
    this.el.innerHTML = `
      <section class="card ergebnis" style="--farbe:${spiel.farbe}">
        <div class="ergebnis-sterne">${sterneHtml(0)}</div>
        <div class="ergebnis-text">
          <p class="ergebnis-note">Note ${note} <span>${Bewertung.NOTEN[note]}</span></p>
          <h2>${lob}</h2>
          <p class="ergebnis-zahl">${spiel.zeit ? `${r.richtig} Noten richtig` : `${r.richtig} von ${Bewertung.anzahl(spiel)} richtig`} · ${r.punkte} Punkte</p>
          ${rekord && vorher.punkte ? '<p class="rekord">Neuer Bestwert!</p>' : ''}
          ${daneben.length ? `<p class="daneben">Daneben: ${daneben.map(([n, k]) => `<strong>${n}</strong>${k > 1 ? ` ${k}×` : ''}`).join(', ')}
            <span class="hint">– ${daneben.length === 1 ? 'diese Note kommt' : 'diese Noten kommen'} beim Üben jetzt öfter dran.</span></p>` : ''}
          ${schwellen && sterne < Bewertung.MAX ? `<p class="hint">Für ${sterne + 1} Sterne brauchst du ${schwellen[sterne - 1]} richtige Noten.</p>` : ''}
          <div class="btn-row mitte">
            <button type="button" id="e-nochmal" class="${naechste ? '' : 'primary'}">${Icons.raw('reset')}Nochmal</button>
            ${naechste ? `<button type="button" id="e-weiter" class="primary">${spiel.stufen[weiter].info ? spiel.stufen[weiter].name : `Stufe ${reihe.indexOf(weiter) + 1}`}${Icons.raw('next')}</button>` : ''}
            <a class="knopf" href="#/spiel/${spiel.id}">Stufen</a>
            <a class="knopf" href="#/">Alle Spiele</a>
          </div>
        </div>
      </section>`;
    document.getElementById('e-nochmal').addEventListener('click', () => this.starteRunde(spiel, stufeIdx));
    document.getElementById('e-weiter')?.addEventListener('click', () => this.starteRunde(spiel, weiter));

    Ton.audio();
    const leiter = [72, 74, 76, 79, 81, 84];
    const felder = [...this.el.querySelectorAll('.ergebnis-sterne .stern')];
    const takt = 380;
    for (let i = 0; i < sterne; i++) {
      this.spaeter(() => { felder[i].classList.add('an'); Ton.klavier(leiter[i], 0, 0.4, 0.16); }, 400 + i * takt);
    }
    this.spaeter(() => {
      this.el.querySelector('.ergebnis-text').classList.add('da');
      if (sterne >= 5) [72, 76, 79, 84].forEach((m, i) => Ton.klavier(m, i * 0.1, 0.5, 0.13));
    }, 500 + sterne * takt);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
