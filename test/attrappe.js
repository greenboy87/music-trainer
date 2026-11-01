/* Testhilfe: führt den echten Worker (cloudflare/worker.js) im Browser aus,
   mit einer nachgebauten D1-Datenbank auf Basis von sql.js. So lassen sich
   Anmeldung und Lehrer-Übersicht ohne Cloudflare-Konto ausprobieren.

   Benutzung in der Browser-Konsole (music-trainer oder School-Tool; fürs
   School-Tool die Datei über einen Server mit CORS laden, siehe launch.json):
     await (await import('./test/attrappe.js')).starten()
   Lehrer-Passwort in der Attrappe: test-passwort
   Die Test-Datenbank bleibt in localStorage („musiktrainer-test-db“). */

import worker from '../cloudflare/worker.js';

const API = 'https://attrappe.musiktrainer.test';
const SQL_JS = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/';

function ladeSkript(src) {
  return new Promise((ok, fehler) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = fehler;
    document.head.appendChild(s);
  });
}

/* Nachbau der D1-Schnittstelle, soweit der Worker sie benutzt */
function d1(db, sichern) {
  const ausfuehren = (sql, werte, art, speichern = true) => {
    const st = db.prepare(sql);
    try {
      st.bind(werte);
      if (art === 'run') {
        while (st.step()) { /* Ergebnis wird nicht gebraucht */ }
        const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
        // export() beendet eine offene Transaktion – im Stapel erst am Ende sichern
        if (speichern) sichern();
        return { meta: { last_row_id: id } };
      }
      const zeilen = [];
      while (st.step()) zeilen.push(st.getAsObject());
      return art === 'first' ? zeilen[0] || null : { results: zeilen };
    } finally {
      st.free();
    }
  };
  const anweisung = (sql, werte = []) => ({
    sql, werte,
    bind: (...w) => anweisung(sql, w),
    first: async () => ausfuehren(sql, werte, 'first'),
    all: async () => ausfuehren(sql, werte, 'all'),
    run: async () => ausfuehren(sql, werte, 'run'),
  });
  return {
    prepare: sql => anweisung(sql),
    async batch(liste) {
      db.exec('BEGIN');
      try {
        const r = liste.map(a => ausfuehren(a.sql, a.werte, 'run', false));
        db.exec('COMMIT');
        sichern();
        return r;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

export async function starten() {
  if (!window.initSqlJs) await ladeSkript(SQL_JS + 'sql-wasm.js');
  const SQL = await initSqlJs({ locateFile: f => SQL_JS + f });
  const gespeichert = localStorage.getItem('musiktrainer-test-db');
  const db = gespeichert
    ? new SQL.Database(Uint8Array.from(atob(gespeichert), c => c.charCodeAt(0)))
    : new SQL.Database();
  if (!gespeichert) db.exec(await (await fetch(new URL('../cloudflare/schema.sql', import.meta.url))).text());
  const sichern = () => {
    const b = db.export();
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    localStorage.setItem('musiktrainer-test-db', btoa(s));
  };
  const env = { DB: d1(db, sichern), LEHRER_PASSWORT: 'test-passwort', TOKEN_SCHLUESSEL: 'attrappe-'.repeat(5) };

  const echtesFetch = window.fetch.bind(window);
  window.fetch = async (url, opt = {}) => {
    if (!String(url).startsWith(API)) return echtesFetch(url, opt);
    const headers = new Headers(opt.headers || {});
    headers.set('Origin', location.origin);
    headers.set('CF-Connecting-IP', '127.0.0.1');
    const anfrage = {
      method: opt.method || 'GET',
      url: String(url),
      headers,
      json: async () => JSON.parse(opt.body || '{}'),
    };
    return worker.fetch(anfrage, env);
  };

  if (typeof Konto !== 'undefined') Konto.API = API;
  if (typeof Musiktrainer !== 'undefined') { Musiktrainer.API = API; Musiktrainer.renderEigene(); }
  if (typeof App !== 'undefined') { App.kontoLeiste(); App.route(); }
  return 'Attrappe läuft';
}
