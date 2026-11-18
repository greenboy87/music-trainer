/* Vollbild.

   1. Für den ganzen music-trainer: der Knopf oben in der Leiste schaltet echtes
      Vollbild ein und aus (ohne Adress- und Tableiste). Wo der Browser das nicht
      kann (iPhone), ist der Knopf ausgeblendet.

   2. Für Klavier und Schlagzeug: ein Knopf legt die Karte über die ganze Seite und
      schaltet – wo es geht – zusätzlich echtes Vollbild ein. Wo es kein echtes
      Vollbild gibt, füllt die Karte trotzdem das Fenster. Esc oder derselbe Knopf
      beendet es. War die Seite schon vorher im Vollbild (Knopf oben), bleibt sie es.
      Nach dem Umschalten löst ein „resize“ aus, damit Klaviatur und Drumset ihre
      Größe neu berechnen. */
const Vollbild = {
  echt() { return document.fullscreenElement || document.webkitFullscreenElement; },
  /* iPad/iPhone: Safari hält schnelles Tippen im echten Vollbild für Tippen auf
     einer Tastatur und blendet dann „Im Vollbildmodus bleiben?“ ein – beim
     Trommeln ständig. Dort also kein echtes Vollbild: die Karte füllt nur das
     Fenster (und die Sperre gilt trotzdem). */
  apple() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  },
  moeglich() {
    if (this.apple()) return false;
    const el = document.documentElement;
    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !!(el.requestFullscreen || el.webkitRequestFullscreen);
  },
  rein() {
    const el = document.documentElement;
    try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {}); } catch { /* geht nicht */ }
  },
  raus() {
    if (!this.echt()) return;
    try { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {}); } catch { /* egal */ }
  },

  /* Knopf oben in der Leiste – einmal beim Start */
  leisteEinrichten() {
    const k = document.getElementById('btn-vollbild');
    if (!k) return;
    if (!this.moeglich()) { k.hidden = true; return; }
    const zeigen = () => {
      const an = !!this.echt();
      k.innerHTML = Icons.raw(an ? 'shrink' : 'expand');
      k.title = an ? 'Vollbild beenden' : 'Vollbild – ohne Adressleiste spielen';
      k.setAttribute('aria-label', k.title);
      k.setAttribute('aria-pressed', String(an));
    };
    zeigen();
    k.addEventListener('click', () => (this.echt() ? this.raus() : this.rein()));
    document.addEventListener('fullscreenchange', zeigen);
    document.addEventListener('webkitfullscreenchange', zeigen);
  },

  /* Sperre im Vollbild: Der Knopf mit dem Schloss erscheint nur im Vollbild.
     Gesperrt sind „Vollbild beenden“, Esc und die Zurück-Geste aus; nur langes
     Drücken (HALTEN ms) auf das Schloss entsperrt wieder. Verlässt der Browser
     das echte Vollbild trotzdem (Wischgeste, Esc), bleibt die Karte über der
     Seite und holt das echte Vollbild beim nächsten Tippen zurück. */
  HALTEN: 1500,
  gesperrtAuf: null,   // Adresse der gesperrten Seite (App.route() hält sie fest)

  knopf() {
    return `<button type="button" class="small vollbild-sperre" hidden title="Sperren: Vollbild lässt sich nur noch hier beenden">${Icons.raw('schlossAuf')}<span>Sperren</span></button>`
      + `<button type="button" class="small vollbild-knopf" aria-pressed="false" title="Vollbild an oder aus">${Icons.raw('expand')}<span>Vollbild</span></button>`;
  },

  binden(karte) {
    const k = karte.querySelector('.vollbild-knopf');
    const sp = karte.querySelector('.vollbild-sperre');
    const neu = () => requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    let selbst = false;   // echtes Vollbild von hier aus eingeschaltet (nicht schon vorher an)
    let gesperrt = false;
    const setzen = an => {
      karte.classList.toggle('vollbild', an);
      document.body.classList.toggle('hat-vollbild', an);
      k.setAttribute('aria-pressed', String(an));
      k.innerHTML = `${Icons.raw(an ? 'shrink' : 'expand')}<span>${an ? 'Vollbild beenden' : 'Vollbild'}</span>`;
      if (sp) sp.hidden = !an;
      neu();
    };
    const sperreZeigen = () => {
      karte.classList.toggle('gesperrt', gesperrt);
      k.hidden = gesperrt;
      sp.setAttribute('aria-pressed', String(gesperrt));
      sp.title = gesperrt ? 'Gesperrt – zum Entsperren gedrückt halten' : 'Sperren: Vollbild lässt sich nur noch hier beenden';
      sp.innerHTML = `${Icons.raw(gesperrt ? 'schloss' : 'schlossAuf')}<span>${gesperrt ? 'Gesperrt · halten' : 'Sperren'}</span><i class="vollbild-halten"></i>`;
    };
    const sperren = an => {
      gesperrt = an;
      this.gesperrtAuf = an ? location.hash : null;
      sperreZeigen();
    };
    k.addEventListener('click', () => {
      if (gesperrt) return;
      const an = !karte.classList.contains('vollbild');
      setzen(an);
      if (an && !this.echt() && this.moeglich()) { selbst = true; this.rein(); }
      else if (!an && selbst) { selbst = false; this.raus(); }
    });
    // Schloss: Tippen sperrt, gedrückt halten entsperrt
    let halten = null, entsperrt = false;   // entsperrt: der Klick nach dem Halten sperrt nicht gleich wieder
    const loslassen = () => { clearTimeout(halten); halten = null; sp?.classList.remove('haelt'); };
    if (sp) {
      sperreZeigen();
      sp.hidden = true;
      sp.addEventListener('click', () => {
        if (entsperrt) { entsperrt = false; return; }
        if (!gesperrt) sperren(true);
      });
      sp.addEventListener('pointerdown', e => {
        if (!gesperrt) return;
        e.preventDefault();
        sp.style.setProperty('--halten', this.HALTEN + 'ms');
        sp.classList.add('haelt');
        entsperrt = false;
        halten = setTimeout(() => { loslassen(); entsperrt = true; sperren(false); }, this.HALTEN);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => sp.addEventListener(n, loslassen));
      sp.addEventListener('contextmenu', e => e.preventDefault());
    }
    // Gesperrt und echtes Vollbild verloren: beim nächsten Tippen zurückholen
    const zurueckholen = () => { if (gesperrt && !this.echt() && this.moeglich()) { selbst = true; this.rein(); } };
    // Echtes Vollbild mit Esc verlassen: Karte wieder normal (außer gesperrt)
    const wechsel = () => {
      if (!this.echt() && karte.classList.contains('vollbild') && !gesperrt) { selbst = false; setzen(false); }
      neu();
    };
    const esc = e => { if (e.key === 'Escape' && karte.classList.contains('vollbild') && !this.echt() && !gesperrt) setzen(false); };
    document.addEventListener('fullscreenchange', wechsel);
    document.addEventListener('webkitfullscreenchange', wechsel);
    document.addEventListener('keydown', esc);
    karte.addEventListener('pointerup', zurueckholen);
    App.beimAufraeumen(() => {
      loslassen();
      this.gesperrtAuf = null;
      document.removeEventListener('fullscreenchange', wechsel);
      document.removeEventListener('webkitfullscreenchange', wechsel);
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('hat-vollbild');
      if (selbst) this.raus();
    });
  },
};
