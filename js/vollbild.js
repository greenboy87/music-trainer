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
  moeglich() {
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

  knopf() {
    return `<button type="button" class="small vollbild-knopf" aria-pressed="false" title="Vollbild an oder aus">${Icons.raw('expand')}<span>Vollbild</span></button>`;
  },

  binden(karte) {
    const k = karte.querySelector('.vollbild-knopf');
    const neu = () => requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    let selbst = false;   // echtes Vollbild von hier aus eingeschaltet (nicht schon vorher an)
    const setzen = an => {
      karte.classList.toggle('vollbild', an);
      document.body.classList.toggle('hat-vollbild', an);
      k.setAttribute('aria-pressed', String(an));
      k.innerHTML = `${Icons.raw(an ? 'shrink' : 'expand')}<span>${an ? 'Vollbild beenden' : 'Vollbild'}</span>`;
      neu();
    };
    k.addEventListener('click', () => {
      const an = !karte.classList.contains('vollbild');
      setzen(an);
      if (an && !this.echt()) { selbst = true; this.rein(); }
      else if (!an && selbst) { selbst = false; this.raus(); }
    });
    // Echtes Vollbild mit Esc verlassen: Karte wieder normal
    const wechsel = () => {
      if (!this.echt() && karte.classList.contains('vollbild')) { selbst = false; setzen(false); }
      neu();
    };
    const esc = e => { if (e.key === 'Escape' && karte.classList.contains('vollbild') && !this.echt()) setzen(false); };
    document.addEventListener('fullscreenchange', wechsel);
    document.addEventListener('webkitfullscreenchange', wechsel);
    document.addEventListener('keydown', esc);
    App.beimAufraeumen(() => {
      document.removeEventListener('fullscreenchange', wechsel);
      document.removeEventListener('webkitfullscreenchange', wechsel);
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('hat-vollbild');
      if (selbst) this.raus();
    });
  },
};
