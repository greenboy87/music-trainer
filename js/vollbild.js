/* Vollbild für Klavier und Schlagzeug: ein Knopf legt die Karte über die ganze Seite
   und schaltet – wo der Browser es kann – auch echtes Vollbild ein (ohne Adressleiste).
   Wo es kein echtes Vollbild gibt (iPhone), füllt die Karte trotzdem das Fenster.
   Esc oder derselbe Knopf beendet es. Nach dem Umschalten löst ein „resize“ aus,
   damit Klaviatur und Drumset ihre Größe neu berechnen. */
const Vollbild = {
  knopf() {
    return `<button type="button" class="small vollbild-knopf" aria-pressed="false" title="Vollbild an oder aus">${Icons.raw('expand')}<span>Vollbild</span></button>`;
  },

  echt() { return document.fullscreenElement || document.webkitFullscreenElement; },

  binden(karte) {
    const k = karte.querySelector('.vollbild-knopf');
    const neu = () => requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    const setzen = an => {
      karte.classList.toggle('vollbild', an);
      document.body.classList.toggle('hat-vollbild', an);
      k.setAttribute('aria-pressed', String(an));
      k.innerHTML = `${Icons.raw(an ? 'shrink' : 'expand')}<span>${an ? 'Vollbild beenden' : 'Vollbild'}</span>`;
      neu();
    };
    const raus = () => {
      if (!this.echt()) return;
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
    };
    k.addEventListener('click', () => {
      const an = !karte.classList.contains('vollbild');
      setzen(an);
      if (an) {
        const el = document.documentElement;
        try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {}); } catch { /* geht nicht – Karte füllt trotzdem das Fenster */ }
      } else raus();
    });
    // Echtes Vollbild mit Esc verlassen: Karte wieder normal
    let warEcht = false;
    const wechsel = () => {
      if (this.echt()) warEcht = true;
      else if (warEcht) { warEcht = false; if (karte.classList.contains('vollbild')) setzen(false); }
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
      raus();
    });
  },
};
