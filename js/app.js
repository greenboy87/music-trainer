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

  /* Merkt sich nur Verbesserungen. Gibt zurück, ob es ein neuer Rekord war. */
  eintragen(spielId, stufe, sterne, punkte) {
    const alt = this.bester(spielId, stufe);
    const neu = { sterne: Math.max(alt.sterne, sterne), punkte: Math.max(alt.punkte, punkte) };
    this.daten[spielId] = { ...(this.daten[spielId] || {}), [stufe]: neu };
    this.speichern();
    Konto.melden({ spiel: spielId, stufe, sterne, punkte });
    return punkte > alt.punkte;
  },

  sterneVon(spiel) {
    return spiel.stufen.reduce((s, _, i) => s + this.bester(spiel.id, i).sterne, 0);
  },

  name() { try { return localStorage.getItem('musiktrainer-name') || ''; } catch { return ''; } },
  setzeName(n) { try { localStorage.setItem('musiktrainer-name', n); } catch { /* egal */ } },
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const sterneHtml = (anzahl, von = 3) =>
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
    else if (art === 'anmelden' && Konto.verfuegbar() && !Konto.angemeldet()) this.zeigeAnmeldung();
    else this.zeigeStart();
    window.scrollTo(0, 0);
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
    const moeglich = SPIELE.reduce((s, sp) => s + sp.stufen.length * 3, 0);
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
             für jede Runde gibt es bis zu drei Sterne.</p>
          ${konto ? `<p class="konto-info">${Icons.raw('check')}Angemeldet in <strong>${esc(konto.klasse)}</strong> – deine Sterne werden gespeichert.</p>`
          : `<div class="gast-zeile">
              <label class="name-feld">${Icons.raw('user')}
                <input type="text" id="name" maxlength="24" placeholder="Dein Vorname" value="${esc(name)}">
              </label>
              ${Konto.verfuegbar() ? `<a class="knopf primary" href="#/anmelden">Mit Klassencode anmelden</a>` : ''}
            </div>`}
        </div>
        <div class="gesamt">
          <div class="gesamt-zahl">${Icons.raw('star')}${gesamt}</div>
          <div class="hint">von ${moeglich} Sternen</div>
          <div class="bahn"><div class="balken" style="width:${gesamt / moeglich * 100}%"></div></div>
        </div>
      </section>
      ${bereiche.map(b => `
        <h2 class="bereich-titel">${b}${typeof BEREICH_INFO !== 'undefined' && BEREICH_INFO[b] ? `<span class="bereich-info">${BEREICH_INFO[b]}</span>` : ''}</h2>
        <div class="spiele-raster">
          ${SPIELE.filter(s => s.bereich === b).map(s => `
            <a class="card spiel-karte" href="#/spiel/${s.id}" style="--farbe:${s.farbe}">
              <span class="spiel-icon">${Icons.raw(s.icon)}</span>
              <span class="spiel-titel">${s.titel}</span>
              <span class="hint">${s.text}</span>
              <span class="spiel-sterne">${Icons.raw('star')} ${Fortschritt.sterneVon(s)} / ${s.stufen.length * 3}</span>
            </a>`).join('')}
        </div>`).join('')}`;
    const feld = document.getElementById('name');
    feld?.addEventListener('change', () => { Fortschritt.setzeName(feld.value.trim()); this.zeigeStart(); });
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
          ${spiel.stufen.map((st, i) => {
            const b = Fortschritt.bester(spiel.id, i);
            return `<button type="button" class="stufe" data-stufe="${i}">
              <span class="stufe-nr">${st.info ? st.name : `Stufe ${i + 1}`}</span>
              <span class="stufe-name">${st.info || st.name}</span>
              <span class="stufe-sterne">${sterneHtml(b.sterne)}</span>
              <span class="hint">${b.punkte ? `Bestwert ${b.punkte} Punkte` : spiel.zeit ? `${spiel.zeit} Sekunden` : '10 Aufgaben'}</span>
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
          <div class="runde-titel"><strong>${spiel.titel}</strong><span class="hint">${st.info ? `${st.name} · ${st.info}` : `Stufe ${stufeIdx + 1} · ${st.name}`}</span></div>
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
    this.runde = { spiel, stufeIdx, st, nr: 0, richtig: 0, punkte: 0, serie: 0, aufgabe: null, offen: false };
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
    document.getElementById('r-stand').innerHTML = `${Icons.raw('timer')}${Math.ceil(rest / 1000)} s`;
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
    if (!r.spiel.zeit && r.nr >= 10) return this.zeigeErgebnis();
    Ton.stopp();
    r.nr++;
    const a = r.spiel.aufgabe(r.st, r.aufgabe);
    r.aufgabe = a;
    r.offen = true;
    if (!r.spiel.zeit) {
      document.getElementById('r-stand').textContent = `${r.nr} / 10`;
      document.getElementById('r-balken').style.width = `${(r.nr - 1) * 10}%`;
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
      eingabe.className = 'optionen' + (a.breit ? ' breit' : a.optionen.length > 4 ? ' viele' : a.optionen.length <= 3 ? ' wenige' : '');
      a.optionen.forEach((o, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'option';
        b.innerHTML = o;
        const kuerzel = a.tasten ? a.tasten[i].toUpperCase() : (i < 9 ? i + 1 : '');
        if (kuerzel && !a.breit) b.insertAdjacentHTML('beforeend', `<kbd>${kuerzel}</kbd>`);
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

    if (ok) {
      r.richtig++;
      r.serie++;
      r.punkte += 10 + (r.spiel.zeit ? 0 : Math.min(r.serie - 1, 5) * 2);
    } else r.serie = 0;
    document.getElementById('r-punkte').textContent = r.punkte;

    const rueck = document.getElementById('r-rueck');
    rueck.className = 'rueckmeldung ' + (ok ? 'gut' : 'schlecht');
    rueck.innerHTML = ok
      ? `${Icons.raw('check')}${r.serie >= 3 && !r.spiel.zeit ? `Richtig! ${r.serie} in Folge` : 'Richtig!'}`
      : `${Icons.raw('x')}${a.loesung || 'Leider falsch.'}`;
    a.nachher?.();

    // Kein Klingel-Signal: es beißt sich mit dem Ton, der gerade erklingt
    if (r.spiel.zeit) {
      this.spaeter(() => this.naechste(), ok ? 250 : 1100);
      return;
    }
    if (ok) this.spaeter(() => this.naechste(), a.eigen ? 2200 : 1000);
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
  zeigeErgebnis() {
    const r = this.runde;
    if (!r) return;
    const { spiel, stufeIdx, st } = r;
    const sterne = spiel.zeit
      ? st.ziel.filter(z => r.richtig >= z).length
      : r.richtig === 10 ? 3 : r.richtig >= 8 ? 2 : r.richtig >= 6 ? 1 : 0;
    const vorher = Fortschritt.bester(spiel.id, stufeIdx);
    const rekord = Fortschritt.eintragen(spiel.id, stufeIdx, sterne, r.punkte);
    this.aufraeumen();
    const lob = ['Weiter üben – du schaffst das!', 'Gut gemacht!', 'Stark!', 'Perfekt!'][sterne];
    const naechste = stufeIdx + 1 < spiel.stufen.length && sterne >= 2;
    this.el.innerHTML = `
      <section class="card ergebnis" style="--farbe:${spiel.farbe}">
        <div class="ergebnis-sterne">${sterneHtml(sterne)}</div>
        <h2>${lob}</h2>
        <p class="ergebnis-zahl">${spiel.zeit ? `${r.richtig} Noten richtig` : `${r.richtig} von 10 richtig`} · ${r.punkte} Punkte</p>
        ${rekord && vorher.punkte ? '<p class="rekord">Neuer Bestwert!</p>' : ''}
        ${spiel.zeit && sterne < 3 ? `<p class="hint">Für ${sterne + 1} Sterne brauchst du ${st.ziel[sterne]} richtige Noten.</p>` : ''}
        <div class="btn-row mitte">
          <button type="button" id="e-nochmal" class="${naechste ? '' : 'primary'}">${Icons.raw('reset')}Nochmal</button>
          ${naechste ? `<button type="button" id="e-weiter" class="primary">${spiel.stufen[stufeIdx + 1].info ? spiel.stufen[stufeIdx + 1].name : `Stufe ${stufeIdx + 2}`}${Icons.raw('next')}</button>` : ''}
          <a class="knopf" href="#/spiel/${spiel.id}">Stufen</a>
          <a class="knopf" href="#/">Alle Spiele</a>
        </div>
      </section>`;
    document.getElementById('e-nochmal').addEventListener('click', () => this.starteRunde(spiel, stufeIdx));
    document.getElementById('e-weiter')?.addEventListener('click', () => this.starteRunde(spiel, stufeIdx + 1));
    if (sterne >= 2) { Ton.audio(); [72, 76, 79, 84].forEach((m, i) => Ton.klavier(m, i * 0.12, 0.5, 0.15)); }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
