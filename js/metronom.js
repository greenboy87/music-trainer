/* Metronom und Tempo für die Seiten zum freien Spielen (Klavier, Schlagzeug).

   Taktuhr: plant Sechzehntel mit Vorlauf in den AudioContext (alle 25 ms die
   nächsten 120 ms) – so bleibt der Takt genau, auch wenn der Browser kurz
   hängt. Der Drumcomputer und das Metronom der Schlagzeugseite teilen sich
   eine Uhr und laufen dadurch immer zusammen.

   Tempoleiste: Knopf „Metronom“, vier Punkte für die Viertel, − und +
   (gedrückt halten zählt weiter), Schieberegler und „Tippen“ (Tempo durch
   Antippen im Takt). Der Klick ist ein Holzblock wie in der Rhythmus-Werkstatt,
   die 1 höher und lauter. */
class Taktuhr {
  /* bpm: Funktion, die das aktuelle Tempo liefert; schritt(i, zeit): ein Sechzehntel
     planen (i = 0 … 15); bild(i): das Sechzehntel ist gerade zu hören */
  constructor(bpm, schritt, bild) {
    this.bpm = bpm;
    this.schritt = schritt;
    this.bild = bild;
    this.laeuft = false;
  }

  starten() {
    if (this.laeuft) return;
    const c = Ton.audio();
    this.laeuft = true;
    this.i = 0;
    this.zeit = c.currentTime + 0.08;
    this.marken = [];
    this.gezeigt = null;
    this.timer = setInterval(() => this.planen(), 25);
    this.planen();
    const malen = () => {
      if (!this.laeuft) return;
      const jetzt = Ton.ctx.currentTime - Ton.verzoegerung();
      let neu = null;
      while (this.marken.length && this.marken[0].zeit <= jetzt) neu = this.marken.shift();
      if (neu && neu !== this.gezeigt) { this.gezeigt = neu; this.bild?.(neu.i); }
      this.raf = requestAnimationFrame(malen);
    };
    this.raf = requestAnimationFrame(malen);
  }

  stoppen() {
    if (!this.laeuft) return;
    this.laeuft = false;
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    this.marken = [];
  }

  planen() {
    const c = Ton.audio();
    // Nach langer Pause (Tab im Hintergrund) nicht alles nachholen
    if (this.zeit < c.currentTime - 0.2) this.zeit = c.currentTime + 0.05;
    while (this.zeit < c.currentTime + 0.12) {
      this.schritt(this.i, this.zeit);
      this.marken.push({ i: this.i, zeit: this.zeit });
      this.zeit += 60 / this.bpm() / 4;
      this.i = (this.i + 1) % 16;
    }
  }
}

const Metronom = {
  /* Holzblock: stark gedämpftes Rauschen durch einen schmalen Bandpass; die 1 höher */
  klick(zeit, eins) {
    const c = Ton.audio();
    const n = Math.floor(c.sampleRate * 0.045);
    const p = c.createBuffer(1, n, c.sampleRate);
    const d = p.getChannelData(0);
    for (let j = 0; j < n; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / n, 8);
    const q = c.createBufferSource();
    q.buffer = p;
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = eins ? 2100 : 1400; f.Q.value = 9;
    const g = c.createGain();
    g.gain.value = eins ? 5 : 3.4;
    q.connect(f).connect(g).connect(Ton.ausgang);
    q.start(zeit);
  },
};

class Tempoleiste {
  /* ort: Element, in das die Leiste kommt. bpm: Anfangstempo.
     beiTempo(bpm): Tempo geändert. beiMetronom(): Knopf „Metronom“ gedrückt. */
  constructor(ort, { bpm, beiTempo, beiMetronom }) {
    this.bpm = bpm;
    this.beiTempo = beiTempo;
    ort.innerHTML = `
      <div class="metro-leiste">
        <button type="button" class="metro-an" aria-pressed="false" title="Metronom an oder aus (Taste M)">${Icons.raw('timer')}<span>Metronom</span></button>
        <span class="metro-punkte" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <div class="sz-tempo" role="group" aria-label="Tempo">
          <button type="button" class="sz-pm" data-pm="-1" aria-label="Langsamer" title="Langsamer (−1)">−</button>
          <input type="range" class="metro-regler" min="50" max="200" step="1" value="${bpm}" aria-label="Tempo in BPM">
          <button type="button" class="sz-pm" data-pm="1" aria-label="Schneller" title="Schneller (+1)">+</button>
          <span class="sz-bpm-wert"><span class="metro-zahl">${bpm}</span> BPM</span>
          <button type="button" class="sz-tippen" title="Mehrmals im Takt antippen – das Tempo stellt sich danach ein">${Icons.raw('hand')}<span>Tippen</span></button>
        </div>
      </div>`;
    this.el = ort.querySelector('.metro-leiste');
    this.punkte = [...this.el.querySelectorAll('.metro-punkte i')];
    this.knopf = this.el.querySelector('.metro-an');
    this.knopf.addEventListener('click', () => beiMetronom());

    const regler = this.el.querySelector('.metro-regler');
    regler.addEventListener('input', () => this.setzen(Number(regler.value)));
    // − und +: einmal antippen = 1 BPM, gedrückt halten zählt weiter
    let halt = null;
    const los = () => { clearTimeout(halt); clearInterval(halt); halt = null; };
    this.el.querySelectorAll('[data-pm]').forEach(b => {
      const d = Number(b.dataset.pm);
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        los();
        this.setzen(this.bpm + d);
        halt = setTimeout(() => { halt = setInterval(() => this.setzen(this.bpm + d), 70); }, 400);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => b.addEventListener(n, los));
      b.addEventListener('click', e => { if (e.detail === 0) this.setzen(this.bpm + d); });
    });
    const tipp = this.el.querySelector('.sz-tippen');
    tipp.addEventListener('pointerdown', e => { e.preventDefault(); this.tippen(); });
    tipp.addEventListener('click', e => { if (e.detail === 0) this.tippen(); });
    App.beimAufraeumen(los);
  }

  setzen(bpm) {
    this.bpm = Math.max(50, Math.min(200, Math.round(bpm)));
    this.el.querySelector('.metro-regler').value = this.bpm;
    this.el.querySelector('.metro-zahl').textContent = this.bpm;
    this.beiTempo(this.bpm);
  }

  /* Tempo tippen: Schnitt der letzten bis zu vier Abstände; nach 2 Sekunden Pause neu anfangen */
  tippen() {
    const jetzt = performance.now();
    if (!this.tipps || jetzt - this.tipps[this.tipps.length - 1] > 2000) this.tipps = [];
    this.tipps.push(jetzt);
    if (this.tipps.length > 5) this.tipps.shift();
    const k = this.el.querySelector('.sz-tippen');
    k.classList.remove('schlag');
    void k.getBoundingClientRect();
    k.classList.add('schlag');
    if (this.tipps.length < 2) { k.lastChild.textContent = 'weiter …'; return; }
    k.lastChild.textContent = 'Tippen';
    this.setzen(60000 / ((this.tipps[this.tipps.length - 1] - this.tipps[0]) / (this.tipps.length - 1)));
  }

  /* Knopf „Metronom“ an oder aus zeigen */
  an(ja) {
    this.knopf.setAttribute('aria-pressed', String(ja));
    if (!ja) this.schlag(-1);
  }

  /* Den Punkt für Viertel v (0–3) aufleuchten lassen; −1 = alle aus */
  schlag(v) {
    this.punkte.forEach((p, i) => p.classList.toggle('an', i === v));
  }
}

/* Metronom allein (Klavierseite): eigene Uhr, Klick auf jedes Viertel */
class Metronomuhr {
  constructor(ort, { bpm, merken }) {
    this.bpmWert = bpm;
    this.leiste = new Tempoleiste(ort, {
      bpm,
      beiTempo: b => { this.bpmWert = b; merken(b); },
      beiMetronom: () => this.umschalten(),
    });
    this.uhr = new Taktuhr(() => this.bpmWert,
      (i, zeit) => { if (i % 4 === 0) Metronom.klick(zeit, i === 0); },
      i => { if (i % 4 === 0) this.leiste.schlag(i / 4); });
    const taste = e => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.target.closest?.('input, select, textarea')) return;
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); this.umschalten(); }
    };
    const weg = () => { if (document.hidden) this.aus(); };
    document.addEventListener('keydown', taste);
    document.addEventListener('visibilitychange', weg);
    App.beimAufraeumen(() => {
      document.removeEventListener('keydown', taste);
      document.removeEventListener('visibilitychange', weg);
      this.aus();
    });
  }

  umschalten() {
    if (this.uhr.laeuft) this.aus();
    else { this.uhr.starten(); this.leiste.an(true); }
  }

  aus() {
    this.uhr.stoppen();
    this.leiste.an(false);
  }
}
