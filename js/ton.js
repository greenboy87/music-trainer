/* Klangerzeugung im Browser – keine Audiodateien.

   Ein Klavierton entsteht aus drei Obertönen mit schnellem Anschlag und
   langsamem Ausklingen; der Rhythmus-Klang ist ein kurzer Holzblock.
   Alles läuft über einen gemeinsamen Ausgang, damit „stopp()“ eine
   laufende Wiedergabe sofort abbrechen kann (neue Aufgabe, Seite verlassen). */
const Ton = {
  ctx: null,
  ausgang: null,

  audio() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ausgang) this.neuerAusgang();
    return this.ctx;
  },

  neuerAusgang() {
    this.ausgang = this.ctx.createGain();
    this.ausgang.gain.value = 0.9;
    this.ausgang.connect(this.ctx.destination);
  },

  jetzt() { return this.audio().currentTime; },

  /* Wie spät der Ton tatsächlich aus dem Lautsprecher kommt – wichtig beim
     Vergleich von Tipp-Zeitpunkten mit geplanten Tönen */
  verzoegerung() {
    const c = this.audio();
    return (c.outputLatency || 0) + (c.baseLatency || 0);
  },

  stopp() {
    if (!this.ctx || !this.ausgang) return;
    const alt = this.ausgang;
    alt.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    setTimeout(() => alt.disconnect(), 200);
    this.neuerAusgang();
  },

  frequenz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); },

  /* Ein Klavierton. start in Sekunden ab jetzt. */
  klavier(midi, start = 0, dauer = 1, laut = 0.3) {
    const c = this.audio();
    const t = c.currentTime + start + 0.02;
    const f = this.frequenz(midi);
    const huelle = c.createGain();
    huelle.gain.setValueAtTime(0, t);
    huelle.gain.linearRampToValueAtTime(laut, t + 0.008);
    huelle.gain.exponentialRampToValueAtTime(laut * 0.35, t + 0.25);
    huelle.gain.exponentialRampToValueAtTime(0.0008, t + dauer + 0.6);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(f * 8, 9000), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(f * 2, 400), t + dauer);
    huelle.connect(filter).connect(this.ausgang);
    [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([mal, form, anteil]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = form;
      o.frequency.value = f * mal;
      g.gain.value = anteil;
      o.connect(g).connect(huelle);
      o.start(t);
      o.stop(t + dauer + 0.7);
    });
  },

  akkord(midis, start = 0, dauer = 1.4, laut = 0.2) {
    midis.forEach(m => this.klavier(m, start, dauer, laut));
  },

  /* Holzblock für Rhythmen. hoch = Zählzeit 1 / Vorzähler betont */
  holz(start = 0, hoch = false, laut = 0.5) {
    const c = this.audio();
    const t = c.currentTime + start + 0.02;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(hoch ? 1250 : 880, t);
    o.frequency.exponentialRampToValueAtTime(hoch ? 900 : 620, t + 0.06);
    g.gain.setValueAtTime(laut, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.12);
    o.connect(g).connect(this.ausgang);
    o.start(t);
    o.stop(t + 0.15);
  },

  /* Leiser Metronom-Klick, damit er sich vom Rhythmus abhebt */
  klick(start = 0, betont = false) {
    const c = this.audio();
    const t = c.currentTime + start + 0.02;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = betont ? 2000 : 1500;
    g.gain.setValueAtTime(betont ? 0.09 : 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.03);
    o.connect(g).connect(this.ausgang);
    o.start(t);
    o.stop(t + 0.04);
  },
};
