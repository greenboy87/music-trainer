/* Anmeldung über den Cloudflare-Worker (cloudflare/worker.js).

   Ohne Anmeldung bleibt alles wie vorher: Der Fortschritt liegt nur in diesem
   Browser. Angemeldete Kinder speichern ihre Ergebnisse zusätzlich auf dem
   Server; was ohne Netz entsteht, wartet in einer Liste und geht beim
   nächsten Mal mit. Gesendet wird pro Runde ein kleines Ergebnis, gelesen nur
   bei der Anmeldung und beim Öffnen der Seite. */

/* Benutzername ist ein Pseudonym wie PandaGeige42, vergeben vom School-Tool.
   normal() ist die Vergleichsform (Groß/klein, Leerzeichen egal, ü = ue = u)
   und muss zu normName() im Worker passen. */
const Benutzername = {
  normal(s) {
    return String(s || '').toLowerCase()
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
  },
};

const Konto = {
  /* Adresse des Workers, nach dem Einrichten eintragen (siehe ANLEITUNG.md),
     z. B. 'https://music-trainer.DEIN-NAME.workers.dev'.
     Leer = Anmeldung ausgeblendet, alle spielen als Gast. */
  API: '',
  KEY: 'musiktrainer-konto',
  OFFEN_KEY: 'musiktrainer-offen',
  daten: null,          // { token, id, name, klasse }

  verfuegbar() { return !!this.API; },

  laden() {
    try { this.daten = JSON.parse(localStorage.getItem(this.KEY)); } catch { this.daten = null; }
  },

  angemeldet() { return this.verfuegbar() && !!this.daten?.token; },

  /* Eigener Speicherplatz pro Kind – auf geteilten iPads sieht sonst das
     nächste Kind die Sterne des vorigen */
  speicherKey() { return this.angemeldet() ? `musiktrainer-fortschritt-k${this.daten.id}` : 'musiktrainer-fortschritt'; },

  async api(pfad, { methode = 'GET', body, token = this.daten?.token } = {}) {
    const r = await fetch(this.API + pfad, {
      method: methode,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const daten = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(daten.fehler || `Fehler ${r.status}`);
      e.status = r.status;
      throw e;
    }
    return daten;
  },

  async anmelden(benutzername, passwort) {
    const d = await this.api('/api/anmelden', { methode: 'POST', body: { benutzername, passwort }, token: null });
    this.daten = { token: d.token, id: d.id, name: d.name, klasse: d.klasse };
    try { localStorage.setItem(this.KEY, JSON.stringify(this.daten)); } catch { /* privates Fenster */ }
    this.offeneLeeren();
    return d;
  },

  abmelden() {
    this.daten = null;
    try {
      localStorage.removeItem(this.KEY);
      localStorage.removeItem(this.OFFEN_KEY);
    } catch { /* egal */ }
  },

  /* ---------- Ergebnisse senden ---------- */
  offene() {
    try { return JSON.parse(localStorage.getItem(this.OFFEN_KEY)) || []; } catch { return []; }
  },

  offeneLeeren() { try { localStorage.removeItem(this.OFFEN_KEY); } catch { /* egal */ } },

  melden(ergebnis) {
    if (!this.angemeldet()) return;
    // Zeitpunkt mitschicken: Runden ohne Netz zählen dann am richtigen Tag
    const liste = this.offene().concat({ ...ergebnis, zeit: Math.floor(Date.now() / 1000) }).slice(-50);
    try { localStorage.setItem(this.OFFEN_KEY, JSON.stringify(liste)); } catch { /* egal */ }
    this.senden();
  },

  async senden() {
    const liste = this.offene();
    if (!liste.length || !this.angemeldet() || this.sendet) return;
    this.sendet = true;
    try {
      await this.api('/api/ergebnisse', { methode: 'POST', body: { ergebnisse: liste } });
      // Nur die gesendeten entfernen – während des Sendens kann eins dazugekommen sein
      try { localStorage.setItem(this.OFFEN_KEY, JSON.stringify(this.offene().slice(liste.length))); } catch { /* egal */ }
    } catch (e) {
      if (e.status === 401) { this.abmelden(); App.abgemeldet(e.message); }
    } finally {
      this.sendet = false;
    }
  },

  /* Stand vom Server holen und mit dem Gerät zusammenführen (jeweils das Bessere) */
  async abgleichen() {
    if (!this.angemeldet()) return;
    try {
      this.senden();
      const { fortschritt } = await this.api('/api/fortschritt');
      Fortschritt.zusammenfuehren(fortschritt);
    } catch (e) {
      if (e.status === 401) { this.abmelden(); App.abgemeldet(e.message); }
    }
  },
};
