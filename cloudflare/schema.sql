-- Datenbank für music-trainer (Cloudflare D1). Einmal in der D1-Konsole ausführen.
--
-- Hier liegen keine Namen von Kindern. Jedes Kind ist nur ein Pseudonym
-- (z. B. PandaGeige42); wer dahintersteckt, weiß allein das School-Tool der
-- Lehrkraft. Gespeichert werden Klassenname, Klassenpasswort, Pseudonym,
-- beste Ergebnisse und ein Verlauf der Runden, der nach 365 Tagen gelöscht wird.
-- Später dazugekommene Spalten (klassen.benotung, richtig/von, dauer) und die
-- Tabelle besuche legt der Worker in älteren Datenbanken selbst an.

CREATE TABLE IF NOT EXISTS klassen (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT    NOT NULL,              -- z. B. „5a“, ohne Namen von Personen
  passwort TEXT    NOT NULL,              -- ein Passwort für die ganze Klasse
  erstellt INTEGER NOT NULL,
  benotung TEXT                           -- was für die Note zählt: {"liste":["stamm-lesen|0",…],"fehltAls6":false}
);

CREATE TABLE IF NOT EXISTS schueler (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  klasse_id    INTEGER NOT NULL,
  benutzername TEXT    NOT NULL UNIQUE,   -- Vergleichsform: pandageige42
  anzeige      TEXT    NOT NULL,          -- so wird es gezeigt: PandaGeige42
  erstellt     INTEGER NOT NULL,
  zuletzt      INTEGER NOT NULL DEFAULT 0
);

-- Bestes Ergebnis je Kind, Spiel und Stufe
CREATE TABLE IF NOT EXISTS fortschritt (
  schueler_id INTEGER NOT NULL,
  spiel       TEXT    NOT NULL,
  stufe       INTEGER NOT NULL,
  sterne      INTEGER NOT NULL,
  punkte      INTEGER NOT NULL,
  runden      INTEGER NOT NULL DEFAULT 0,
  geaendert   INTEGER NOT NULL,
  richtig     INTEGER,                    -- richtige Antworten der Runde mit dem besten Anteil …
  von         INTEGER,                    -- … von so vielen Aufgaben (Blitzlesen: Ziel für die Note 1)
  PRIMARY KEY (schueler_id, spiel, stufe)
);

-- Jede gespielte Runde, für „wer hat seit letzter Woche geübt“.
-- Der Worker löscht Einträge, die älter als 365 Tage sind.
CREATE TABLE IF NOT EXISTS verlauf (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  schueler_id INTEGER NOT NULL,
  spiel       TEXT    NOT NULL,
  stufe       INTEGER NOT NULL,
  sterne      INTEGER NOT NULL,
  punkte      INTEGER NOT NULL,
  zeit        INTEGER NOT NULL,
  richtig     INTEGER,
  von         INTEGER,
  dauer       INTEGER                     -- Sekunden
);
CREATE INDEX IF NOT EXISTS verlauf_kind ON verlauf (schueler_id, zeit);
CREATE INDEX IF NOT EXISTS verlauf_zeit ON verlauf (zeit);

-- Tage, an denen ein Kind angemeldet im music-trainer war (Tag = Tage seit 1970,
-- grob deutsche Zeit). Der Worker löscht Einträge, die älter als 365 Tage sind.
CREATE TABLE IF NOT EXISTS besuche (
  schueler_id INTEGER NOT NULL,
  tag         INTEGER NOT NULL,
  PRIMARY KEY (schueler_id, tag)
);

-- Fehlversuche, gegen Durchprobieren. Einträge laufen nach 10 Minuten ab.
CREATE TABLE IF NOT EXISTS sperren (
  schluessel TEXT PRIMARY KEY,
  versuche   INTEGER NOT NULL,
  bis        INTEGER NOT NULL
);
