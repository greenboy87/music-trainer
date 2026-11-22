/* Vollbild.

   1. Für den ganzen music-trainer: der Knopf oben in der Leiste schaltet echtes
      Vollbild ein und aus (ohne Adress- und Tableiste). Wo der Browser das nicht
      kann (iPhone), ist der Knopf ausgeblendet.

   2. Klavier und Schlagzeug: die Karte liegt immer über der ganzen Seite (festes
      Bild, kein Scrollen, Zurück-Pfeil oben links). Ihr Knopf schaltet zusätzlich
      echtes Vollbild ein und aus. War die Seite schon vorher im Vollbild (Knopf
      oben), bleibt sie es. Nach dem Umschalten löst ein „resize“ aus, damit
      Klaviatur und Drumset ihre Größe neu berechnen. */
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

  /* Klavier und Schlagzeug sind immer ein festes Bild: die Karte füllt das Fenster,
     die Seite scrollt nicht. Der Knopf schaltet nur noch das echte Vollbild des
     Browsers (ohne Adress- und Tableiste) ein und aus. */
  binden(karte) {
    const k = karte.querySelector('.vollbild-knopf');
    const neu = () => requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    let selbst = false;   // echtes Vollbild von hier aus eingeschaltet (nicht schon vorher an)
    karte.classList.add('vollbild');
    document.body.classList.add('hat-vollbild');
    const zeigen = () => {
      const an = !!this.echt();
      if (!an) selbst = false;
      k.setAttribute('aria-pressed', String(an));
      k.innerHTML = `${Icons.raw(an ? 'shrink' : 'expand')}<span>${an ? 'Vollbild beenden' : 'Vollbild'}</span>`;
      neu();
    };
    if (!this.moeglich()) k.hidden = true;
    k.addEventListener('click', () => {
      if (this.echt()) this.raus(); else { selbst = true; this.rein(); }
    });
    document.addEventListener('fullscreenchange', zeigen);
    document.addEventListener('webkitfullscreenchange', zeigen);
    zeigen();
    App.beimAufraeumen(() => {
      document.removeEventListener('fullscreenchange', zeigen);
      document.removeEventListener('webkitfullscreenchange', zeigen);
      document.body.classList.remove('hat-vollbild');
      if (selbst) this.raus();
    });
  },
};
