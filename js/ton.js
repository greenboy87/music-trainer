/* Klangerzeugung im Browser – keine Audiodateien.

   Ein Klavierton entsteht aus drei Obertönen mit schnellem Anschlag und
   langsamem Ausklingen; Rhythmen klingen als Snare wie in der Rhythmus-Werkstatt.
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

  /* Snare Drum für Rhythmen – übernommen aus der Rhythmus-Werkstatt
     (js/audio.js, snareKlang): das Fell als zwei kurze Töne mit leichtem
     Tonhöhenabfall, der Teppich als gefiltertes, ausklingendes Rauschen.
     staerke: 1 = normal, Werte darüber betonen (Rhythmus-Werkstatt: 0.45 / 1.3). */
  snare(start = 0, staerke = 1) {
    const c = this.audio();
    const t = c.currentTime + start + 0.02;
    const st = 0.45 * staerke;
    const ton = (f0, f1, laut, dauer) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(laut * st, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      o.connect(g).connect(this.ausgang);
      o.start(t); o.stop(t + dauer + 0.02);
    };
    ton(195, 165, 0.26, 0.11);
    ton(335, 290, 0.1, 0.07);

    const quelle = c.createBufferSource();
    quelle.buffer = this.rauschen();
    // Teppich: Hochpass gegen Wummern, Glocke um 5 kHz für das Schnarren
    const hoch = c.createBiquadFilter();
    hoch.type = 'highpass'; hoch.frequency.value = 1400;
    const glocke = c.createBiquadFilter();
    glocke.type = 'peaking'; glocke.frequency.value = 5000; glocke.Q.value = 0.9; glocke.gain.value = 5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.27 * st, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.07 * st, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    quelle.connect(hoch).connect(glocke).connect(g).connect(this.ausgang);
    quelle.start(t);
    quelle.stop(t + 0.25);
  },

  /* Ein Rauschen für alle Snare-Schläge, damit nicht jeder Schlag neu rechnet */
  rauschen() {
    if (!this.rauschPuffer) {
      const laenge = Math.floor(this.ctx.sampleRate * 0.24);
      this.rauschPuffer = this.ctx.createBuffer(1, laenge, this.ctx.sampleRate);
      const d = this.rauschPuffer.getChannelData(0);
      for (let i = 0; i < laenge; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.rauschPuffer;
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
