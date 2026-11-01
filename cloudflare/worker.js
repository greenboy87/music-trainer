// Cloudflare Worker: Anmeldung und Fortschritt für music-trainer.
//
// Datenschutz: Hier liegen keine Namen von Kindern. Jedes Kind ist nur ein
// Pseudonym wie PandaGeige42, das das School-Tool der Lehrkraft vergibt; nur
// dort steht, wer dahintersteckt. Kinder melden sich mit Pseudonym und dem
// Passwort ihrer Klasse an. Gespeichert werden Pseudonym, Klasse, beste
// Ergebnisse (Sterne, Punkte, richtige Antworten) und ein Verlauf der Runden
// (nach VERLAUF_TAGE gelöscht). Je
// Klasse dazu die Auswahl der Lehrkraft, welche Spiele und Stufen für die Note
// zählen – daraus zeigt der music-trainer jedem Kind seine eigene Note.
// IP-Adressen werden nur als gekürzter Prüfwert für die Sperre nach
// Fehlversuchen gespeichert und nach 10 Minuten gelöscht.
//
// Braucht im Cloudflare-Dashboard:
//   D1-Bindung   DB                  (Tabellen aus schema.sql)
//   Geheimnis    LEHRER_PASSWORT     (Anmeldung der Lehrkraft im School-Tool)
//   Geheimnis    TOKEN_SCHLUESSEL    (lange Zufallszeichenkette, signiert die Anmeldungen)
//
// Anmeldungen sind signierte Marken (HMAC), keine Sitzungen in der Datenbank.
// Gesperrt wird je Pseudonym, nicht je Schule: Alle iPads einer Schule teilen
// sich nach außen eine Adresse, ein paar Tippfehler dürfen also nicht die
// ganze Klasse aussperren.

const ERLAUBTE_HERKUNFT = [
  'https://greenboy87.github.io',
  'http://localhost:8778',      // music-trainer lokal
  'http://127.0.0.1:8778',
  'http://localhost:8771',      // School-Tool lokal
  'http://127.0.0.1:8771',
  'http://localhost:8773',      // School-Tool, zweites Testfenster
];

const TAG = 86400;
const GUELTIG_SCHUELER = 180 * TAG;
const GUELTIG_LEHRER = 12 * 3600;
const VERLAUF_TAGE = 365;
const SPERRE = 10 * 60;
const MAX_JE_KIND = 10;         // falsche Passwörter je Pseudonym, dann 10 Minuten Pause
const MAX_UNBEKANNT = 60;       // unbekannte Pseudonyme je Schul-Adresse
const MAX_LEHRER = 10;

const jetzt = () => Math.floor(Date.now() / 1000);

class Fehler extends Error {
  constructor(status, text) { super(text); this.status = status; }
}

/* ---------- Hilfen ---------- */

function kopf(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
}

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const vonB64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const text = s => new TextEncoder().encode(s);

async function hmac(schluessel, daten) {
  const k = await crypto.subtle.importKey('raw', text(schluessel), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', k, text(daten)));
}

async function sha256(s) {
  return b64url(await crypto.subtle.digest('SHA-256', text(s)));
}

/* Vergleich in fester Zeit, damit die Antwortdauer nichts verrät */
function gleich(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function markeErstellen(env, inhalt, gueltig) {
  const teil = b64url(text(JSON.stringify({ ...inhalt, exp: jetzt() + gueltig })));
  return `${teil}.${await hmac(env.TOKEN_SCHLUESSEL, teil)}`;
}

async function markePruefen(env, request, rolle) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer ([\w-]+)\.([\w-]+)$/);
  if (!m) throw new Fehler(401, 'Nicht angemeldet');
  if (!gleich(await hmac(env.TOKEN_SCHLUESSEL, m[1]), m[2])) throw new Fehler(401, 'Anmeldung ungültig');
  const inhalt = JSON.parse(new TextDecoder().decode(vonB64url(m[1])));
  if (inhalt.exp < jetzt()) throw new Fehler(401, 'Anmeldung abgelaufen');
  if (inhalt.rolle !== rolle) throw new Fehler(403, 'Keine Berechtigung');
  return inhalt;
}

/* Benutzernamen so vergleichen, wie Kinder sie tippen: Groß/klein egal,
   Leerzeichen und Bindestriche zählen nicht, ü = ue = u (ebenso ä, ö, ß).
   Muss zu Benutzername.normal() in js/konto.js passen. */
function normName(s) {
  return String(s || '').toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
}

/* IP-Adressen nur als Prüfwert speichern, nie im Klartext */
async function herkunft(env, ip) {
  return (await sha256(env.TOKEN_SCHLUESSEL + ip)).slice(0, 16);
}

function pruefeText(wert, max, was) {
  const t = String(wert || '').trim().replace(/\s+/g, ' ');
  if (!t || t.length > max) throw new Fehler(400, `${was}: 1 bis ${max} Zeichen`);
  if (/[<>"\\]/.test(t)) throw new Fehler(400, `${was} enthält ungültige Zeichen`);
  return t;
}

function pruefePasswort(p) {
  const t = String(p || '').trim();
  if (t.length < 4 || t.length > 30) throw new Fehler(400, 'Das Klassenpasswort braucht 4 bis 30 Zeichen');
  return t;
}

/* Fehlversuche zählen; nach max Versuchen ist der Schlüssel SPERRE Sekunden gesperrt */
async function gesperrt(env, schluessel, max) {
  const s = await env.DB.prepare('SELECT versuche, bis FROM sperren WHERE schluessel = ?').bind(schluessel).first();
  return !!s && s.bis > jetzt() && s.versuche >= max;
}

async function fehlversuch(env, schluessel) {
  const t = jetzt();
  // Abgelaufene Sperren gleich mit aufräumen
  await env.DB.prepare('DELETE FROM sperren WHERE bis < ?').bind(t).run();
  await env.DB.prepare(
    `INSERT INTO sperren (schluessel, versuche, bis) VALUES (?1, 1, ?2)
     ON CONFLICT (schluessel) DO UPDATE SET
       versuche = CASE WHEN bis < ?3 THEN 1 ELSE versuche + 1 END,
       bis = ?2`
  ).bind(schluessel, t + SPERRE, t).run();
}

/* Spalten, die nach dem ersten Einrichten dazukamen (alle 01.11.2026). Ältere
   Datenbanken bekommen sie beim ersten Bedarf; danach merkt sich der Worker,
   dass sie da sind. In der D1-Konsole ist dafür nichts zu tun. */
const NEUE_SPALTEN = [
  ['klassen', 'benotung', 'TEXT'],         // Auswahl für die Note: { liste: ['stamm-lesen|0', …], fehltAls6 }
  ['fortschritt', 'richtig', 'INTEGER'],   // richtige Antworten der Runde mit dem besten Anteil …
  ['fortschritt', 'von', 'INTEGER'],       // … von so vielen (Blitzlesen: Ziel für die Note 1)
  ['verlauf', 'richtig', 'INTEGER'],
  ['verlauf', 'von', 'INTEGER'],
];
let spaltenDa = false;

async function spaltenSichern(env) {
  if (spaltenDa) return;
  for (const [tabelle, spalte, typ] of NEUE_SPALTEN) {
    try {
      await env.DB.prepare(`SELECT ${spalte} FROM ${tabelle} LIMIT 0`).all();
    } catch {
      try { await env.DB.prepare(`ALTER TABLE ${tabelle} ADD COLUMN ${spalte} ${typ}`).run(); }
      catch (e) { if (!/duplicate column/i.test(String(e))) throw e; }   // gleichzeitig schon angelegt
    }
  }
  spaltenDa = true;
}

function pruefeBenotung(b) {
  if (!b || !Array.isArray(b.liste)) throw new Fehler(400, 'Benotung: Liste fehlt');
  const liste = [...new Set(b.liste.map(String))].filter(w => /^[a-z-]{1,30}\|\d$/.test(w)).slice(0, 200);
  return { liste, fehltAls6: b.fehltAls6 === true };
}

function leseBenotung(json) {
  try {
    const b = JSON.parse(json);
    return b && Array.isArray(b.liste) ? b : null;
  } catch { return null; }
}

async function benotungVonKind(env, schuelerId) {
  await spaltenSichern(env);
  const k = await env.DB.prepare(
    'SELECT k.benotung FROM klassen k JOIN schueler s ON s.klasse_id = k.id WHERE s.id = ?'
  ).bind(schuelerId).first();
  return leseBenotung(k?.benotung);
}

async function fortschrittVon(env, schuelerId) {
  const { results } = await env.DB.prepare(
    'SELECT spiel, stufe, sterne, punkte FROM fortschritt WHERE schueler_id = ?'
  ).bind(schuelerId).all();
  const daten = {};
  results.forEach(r => { (daten[r.spiel] ||= {})[r.stufe] = { sterne: r.sterne, punkte: r.punkte }; });
  return daten;
}

/* ---------- Kinder ---------- */

async function anmelden(env, body, ip) {
  const benutzer = normName(body.benutzername);
  const passwort = String(body.passwort || '').trim();
  const her = 'ip:' + await herkunft(env, ip);
  if (!benutzer || !passwort) throw new Fehler(400, 'Bitte Benutzername und Passwort eingeben');
  if (await gesperrt(env, 'kind:' + benutzer, MAX_JE_KIND) || await gesperrt(env, her, MAX_UNBEKANNT))
    throw new Fehler(429, 'Zu viele Fehlversuche. Bitte in 10 Minuten nochmal versuchen.');

  await spaltenSichern(env);
  const s = await env.DB.prepare(
    `SELECT s.id, s.anzeige, k.name AS klasse, k.passwort, k.benotung
     FROM schueler s JOIN klassen k ON k.id = s.klasse_id WHERE s.benutzername = ?`
  ).bind(benutzer).first();
  if (!s) {
    await fehlversuch(env, her);
    throw new Fehler(401, 'Diesen Benutzernamen gibt es nicht. Er steht auf deinem Kärtchen, z. B. PandaGeige42.');
  }
  // Groß/klein beim Passwort egal – Kinder auf dem iPad tippen oft mit großem Anfangsbuchstaben
  if (!gleich(passwort.toLowerCase(), s.passwort.toLowerCase())) {
    await fehlversuch(env, 'kind:' + benutzer);
    throw new Fehler(401, 'Das Passwort stimmt nicht.');
  }
  await env.DB.batch([
    env.DB.prepare('UPDATE schueler SET zuletzt = ? WHERE id = ?').bind(jetzt(), s.id),
    // Abgelaufene Sperren (mit IP-Prüfwerten) bei jeder Anmeldung entfernen
    env.DB.prepare('DELETE FROM sperren WHERE bis < ?').bind(jetzt()),
  ]);
  return {
    token: await markeErstellen(env, { rolle: 'schueler', id: s.id }, GUELTIG_SCHUELER),
    id: s.id,
    name: s.anzeige,
    klasse: s.klasse,
    fortschritt: await fortschrittVon(env, s.id),
    benotung: leseBenotung(s.benotung),
  };
}

/* Beim Bestwert zählt für richtig/von die Runde mit dem besten Anteil (über
   Kreuz multipliziert, ohne Division); Runden ohne die Angabe ändern nichts */
const BESSERER_ANTEIL = 'excluded.richtig IS NOT NULL AND (richtig IS NULL OR excluded.richtig * von > richtig * excluded.von)';

async function ergebnisseSpeichern(env, wer, body) {
  await spaltenSichern(env);
  const liste = Array.isArray(body.ergebnisse) ? body.ergebnisse.slice(0, 50) : [];
  const t = jetzt();
  const anweisungen = [];
  for (const e of liste) {
    const spiel = String(e.spiel || '');
    const stufe = Number(e.stufe), sterne = Number(e.sterne), punkte = Number(e.punkte);
    // Zeitpunkt vom Gerät, falls die Runde ohne Netz gespielt wurde – aber nie in der Zukunft
    const zeit = Number.isInteger(e.zeit) && e.zeit <= t && e.zeit > t - 30 * TAG ? e.zeit : t;
    if (!/^[a-z-]{1,30}$/.test(spiel)) continue;
    if (![stufe, sterne, punkte].every(Number.isInteger)) continue;
    if (stufe < 0 || stufe > 9 || sterne < 0 || sterne > 6 || punkte < 0 || punkte > 10000) continue;   // 6 Sterne = Note 1
    // Richtige Antworten von wie vielen Aufgaben – ältere Seiten schicken das nicht mit
    let richtig = e.richtig, von = e.von;
    if (!Number.isInteger(richtig) || !Number.isInteger(von) || richtig < 0 || richtig > 1000 || von < 1 || von > 1000) richtig = von = null;
    anweisungen.push(env.DB.prepare(
      `INSERT INTO fortschritt (schueler_id, spiel, stufe, sterne, punkte, runden, geaendert, richtig, von)
       VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8)
       ON CONFLICT (schueler_id, spiel, stufe) DO UPDATE SET
         sterne = MAX(sterne, excluded.sterne),
         punkte = MAX(punkte, excluded.punkte),
         runden = runden + 1,
         geaendert = excluded.geaendert,
         richtig = CASE WHEN ${BESSERER_ANTEIL} THEN excluded.richtig ELSE richtig END,
         von = CASE WHEN ${BESSERER_ANTEIL} THEN excluded.von ELSE von END`
    ).bind(wer.id, spiel, stufe, sterne, punkte, zeit, richtig, von));
    anweisungen.push(env.DB.prepare(
      'INSERT INTO verlauf (schueler_id, spiel, stufe, sterne, punkte, zeit, richtig, von) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(wer.id, spiel, stufe, sterne, punkte, zeit, richtig, von));
  }
  // Gelöschte Kinder dürfen mit einer alten Marke nichts mehr schreiben
  const da = await env.DB.prepare('SELECT id FROM schueler WHERE id = ?').bind(wer.id).first();
  if (!da) throw new Fehler(401, 'Dieses Konto gibt es nicht mehr');
  anweisungen.push(env.DB.prepare('UPDATE schueler SET zuletzt = ? WHERE id = ?').bind(t, wer.id));
  // Löschfrist: alte Runden ab und zu entfernen (Index auf zeit, kostet kaum etwas)
  if (Math.random() < 0.05)
    anweisungen.push(env.DB.prepare('DELETE FROM verlauf WHERE zeit < ?').bind(t - VERLAUF_TAGE * TAG));
  await env.DB.batch(anweisungen);
  return { gespeichert: liste.length };
}

/* ---------- Lehrkraft ---------- */

async function lehrerAnmelden(env, body, ip) {
  if (!env.LEHRER_PASSWORT) throw new Fehler(500, 'LEHRER_PASSWORT ist im Worker nicht gesetzt');
  const her = 'lehrer:' + await herkunft(env, ip);
  if (await gesperrt(env, her, MAX_LEHRER)) throw new Fehler(429, 'Zu viele Fehlversuche. Bitte 10 Minuten warten.');
  if (!gleich(await sha256(String(body.passwort || '')), await sha256(env.LEHRER_PASSWORT))) {
    await fehlversuch(env, her);
    throw new Fehler(401, 'Passwort falsch');
  }
  return { token: await markeErstellen(env, { rolle: 'lehrer' }, GUELTIG_LEHRER) };
}

/* Pseudonyme eintragen. Ist eins schon vergeben, kommt eine Ziffer dazu.
   Antwort in derselben Reihenfolge wie die Anfrage, damit das School-Tool
   jedem Kind sein endgültiges Pseudonym zuordnen kann. */
async function kinderEintragen(env, klasseId, liste) {
  if (!Array.isArray(liste)) return [];
  const t = jetzt();
  const ergebnis = [];
  for (const k of liste.slice(0, 60)) {
    const anzeigeBasis = String(k.benutzername || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 30);
    const basis = normName(anzeigeBasis);
    if (basis.length < 3) throw new Fehler(400, 'Benutzername zu kurz (mindestens 3 Zeichen)');
    for (let n = 1; n < 100; n++) {
      const name = n === 1 ? basis : basis + n;
      const anzeige = n === 1 ? anzeigeBasis : anzeigeBasis + n;
      try {
        const r = await env.DB.prepare('INSERT INTO schueler (klasse_id, benutzername, anzeige, erstellt) VALUES (?, ?, ?, ?)')
          .bind(klasseId, name, anzeige, t).run();
        ergebnis.push({ angefragt: k.benutzername, benutzername: anzeige, id: r.meta.last_row_id });
        break;
      } catch (e) {
        if (!/UNIQUE/i.test(String(e))) throw e;
      }
    }
  }
  return ergebnis;
}

async function klasseAnlegen(env, body) {
  const name = pruefeText(body.name, 40, 'Klassenname');
  const passwort = pruefePasswort(body.passwort);
  const r = await env.DB.prepare('INSERT INTO klassen (name, passwort, erstellt) VALUES (?, ?, ?)')
    .bind(name, passwort, jetzt()).run();
  const id = r.meta.last_row_id;
  return { id, name, passwort, schueler: await kinderEintragen(env, id, body.schueler) };
}

async function klasseAendern(env, id, body) {
  await spaltenSichern(env);
  const k = await env.DB.prepare('SELECT * FROM klassen WHERE id = ?').bind(id).first();
  if (!k) throw new Fehler(404, 'Klasse nicht gefunden');
  const name = body.name === undefined ? k.name : pruefeText(body.name, 40, 'Klassenname');
  const passwort = body.passwort === undefined ? k.passwort : pruefePasswort(body.passwort);
  const benotung = body.benotung === undefined ? k.benotung : JSON.stringify(pruefeBenotung(body.benotung));
  await env.DB.prepare('UPDATE klassen SET name = ?, passwort = ?, benotung = ? WHERE id = ?')
    .bind(name, passwort, benotung, id).run();
  return { id, name, passwort, benotung: leseBenotung(benotung) };
}

async function klasseLoeschen(env, id) {
  const kinder = 'SELECT id FROM schueler WHERE klasse_id = ?';
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM verlauf WHERE schueler_id IN (${kinder})`).bind(id),
    env.DB.prepare(`DELETE FROM fortschritt WHERE schueler_id IN (${kinder})`).bind(id),
    env.DB.prepare('DELETE FROM schueler WHERE klasse_id = ?').bind(id),
    env.DB.prepare('DELETE FROM klassen WHERE id = ?').bind(id),
  ]);
  return { geloescht: true };
}

/* Alles zu einer Klasse: Pseudonyme, Bestwerte und der Verlauf seit „seit“ */
async function klassenUebersicht(env, id, seit) {
  await spaltenSichern(env);
  const klasse = await env.DB.prepare('SELECT id, name, passwort, benotung FROM klassen WHERE id = ?').bind(id).first();
  if (!klasse) throw new Fehler(404, 'Klasse nicht gefunden');
  klasse.benotung = leseBenotung(klasse.benotung);
  const { results: kinder } = await env.DB.prepare(
    'SELECT id, anzeige AS benutzername, zuletzt FROM schueler WHERE klasse_id = ? ORDER BY anzeige'
  ).bind(id).all();
  const { results: zeilen } = await env.DB.prepare(
    `SELECT f.schueler_id, f.spiel, f.stufe, f.sterne, f.punkte, f.runden, f.geaendert, f.richtig, f.von
     FROM fortschritt f JOIN schueler s ON s.id = f.schueler_id WHERE s.klasse_id = ?`
  ).bind(id).all();
  const { results: verlauf } = await env.DB.prepare(
    `SELECT v.schueler_id, v.spiel, v.stufe, v.sterne, v.punkte, v.zeit, v.richtig, v.von
     FROM verlauf v JOIN schueler s ON s.id = v.schueler_id
     WHERE s.klasse_id = ? AND v.zeit >= ? ORDER BY v.zeit`
  ).bind(id, Math.max(0, Number(seit) || 0)).all();
  const nachKind = {};
  zeilen.forEach(z => {
    ((nachKind[z.schueler_id] ||= {})[z.spiel] ||= {})[z.stufe] =
      { sterne: z.sterne, punkte: z.punkte, runden: z.runden, geaendert: z.geaendert, richtig: z.richtig, von: z.von };
  });
  return { klasse, schueler: kinder.map(k => ({ ...k, fortschritt: nachKind[k.id] || {} })), verlauf };
}

async function kindLoeschen(env, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM verlauf WHERE schueler_id = ?').bind(id),
    env.DB.prepare('DELETE FROM fortschritt WHERE schueler_id = ?').bind(id),
    env.DB.prepare('DELETE FROM schueler WHERE id = ?').bind(id),
  ]);
  return { geloescht: true };
}

/* ---------- Verteiler ---------- */

async function verteilen(request, env) {
  const url = new URL(request.url);
  const pfad = url.pathname.replace(/\/+$/, '');
  const m = request.method;
  const ip = request.headers.get('CF-Connecting-IP') || 'unbekannt';
  const body = ['POST', 'PATCH'].includes(m) ? await request.json().catch(() => ({})) : {};
  let teile;

  if (m === 'POST' && pfad === '/api/anmelden') return anmelden(env, body, ip);
  if (m === 'GET' && pfad === '/api/fortschritt') {
    const wer = await markePruefen(env, request, 'schueler');
    return { fortschritt: await fortschrittVon(env, wer.id), benotung: await benotungVonKind(env, wer.id) };
  }
  if (m === 'POST' && pfad === '/api/ergebnisse')
    return ergebnisseSpeichern(env, await markePruefen(env, request, 'schueler'), body);

  if (m === 'POST' && pfad === '/api/lehrer/anmelden') return lehrerAnmelden(env, body, ip);
  if (pfad.startsWith('/api/lehrer/')) {
    await markePruefen(env, request, 'lehrer');
    if (m === 'POST' && pfad === '/api/lehrer/klassen') return klasseAnlegen(env, body);
    if ((teile = pfad.match(/^\/api\/lehrer\/klassen\/(\d+)$/))) {
      if (m === 'GET') return klassenUebersicht(env, +teile[1], url.searchParams.get('seit'));
      if (m === 'PATCH') return klasseAendern(env, +teile[1], body);
      if (m === 'DELETE') return klasseLoeschen(env, +teile[1]);
    }
    if ((teile = pfad.match(/^\/api\/lehrer\/klassen\/(\d+)\/schueler$/)) && m === 'POST') {
      const k = await env.DB.prepare('SELECT id FROM klassen WHERE id = ?').bind(+teile[1]).first();
      if (!k) throw new Fehler(404, 'Klasse nicht gefunden');
      return { schueler: await kinderEintragen(env, k.id, body.schueler) };
    }
    if ((teile = pfad.match(/^\/api\/lehrer\/schueler\/(\d+)$/)) && m === 'DELETE') return kindLoeschen(env, +teile[1]);
  }
  throw new Fehler(404, 'Unbekannte Adresse');
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!ERLAUBTE_HERKUNFT.includes(origin)) return new Response('Herkunft nicht erlaubt', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: kopf(origin) });
    const antwort = (daten, status) => new Response(JSON.stringify(daten), {
      status, headers: { ...kopf(origin), 'Content-Type': 'application/json; charset=utf-8' },
    });
    try {
      if (!env.TOKEN_SCHLUESSEL || env.TOKEN_SCHLUESSEL.length < 32)
        throw new Fehler(500, 'TOKEN_SCHLUESSEL fehlt oder ist kürzer als 32 Zeichen');
      return antwort(await verteilen(request, env), 200);
    } catch (e) {
      if (e instanceof Fehler) return antwort({ fehler: e.message }, e.status);
      console.error(e);
      return antwort({ fehler: 'Serverfehler' }, 500);
    }
  },
};
