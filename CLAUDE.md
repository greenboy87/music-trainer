# Hinweise für Claude Code

music-trainer by greenboy: Musik-Lernspiele für Klasse 5 (Stammtöne,
Vorzeichen, Hören, Rhythmus), Design wie das School-Tool. Dazu ein Klavier zum
freien Spielen (`js/klavierseite.js`, `#/klavier`) und ein Schlagzeug
(`js/schlagzeug.js`, `#/schlagzeug` mit den Reitern Pads, Drumset und
Drumcomputer; Klänge im Browser erzeugt wie in der Rhythmus-Werkstatt).
Beide haben ein Metronom mit Tempo-Leiste (`js/metronom.js`); auf der
Schlagzeugseite teilen sich Metronom und Drumcomputer eine Taktuhr. Beide Seiten haben einen
Knopf „Vollbild“ (`js/vollbild.js`); dazu oben in der Leiste ein Vollbild-Knopf für den
ganzen music-trainer. Doppeltipp-Zoom ist per `touch-action: manipulation` aus.
Prüfungszeilen Klasse 5 und 6 (`js/pruefung.js`): `#/pruefung` Klasse wählen →
`#/pruefung/k5` Modus wählen (Üben mit Cursor, Sterne sammeln, Prüfung – Üben/Sterne
auch in Liste und Zeile umschaltbar) → `#/pruefung/k5-liste`:
Toms fünf Zeilen je Klasse (Note 5 bis 1) zum Mitspielen auf den Pads – Klasse 5
Snare und Bassdrum, Klasse 6 nur Snare mit R/L und Handsatz (optional mitbewertet).
Kein Spiel in `SPIELE` (eigene Seiten), aber „Sterne sammeln“ meldet wie ein Spiel:
`Fortschritt.eintragen('rhythmus-pruefung', stufe …)`, Stufe 0–4 = Klasse 5 Note 5–1,
5–9 = Klasse 6; Sterne über `STERNE_AB`. In `MT_SPIELE` im School-Tool eingetragen.
Die Prüfung meldet am Ende die Endnote als eigenes Spiel `rhythmus-pruefung-note`
(Stufe 0 = Klasse 5, 1 = Klasse 6, Sterne = 7 − Note). Üben (Cursor) meldet nichts.
„Prüfung starten“: Leiter ab Note 5, je Zeile 3 Versuche, bestanden ab 80 %,
Klasse 5 fest 80 BPM (`PRUEF_BPM`), Klasse 6 ab 72 BPM und schneller (`PRUEF_BPM6`),
`BESTANDEN`, `VERSUCHE`, Endnote am Ende (gespeichert, s. o.). Einrichtung des
Cloudflare-Workers: ANLEITUNG.md.

## Versionsnummer nach jeder CSS/JS-Änderung hochzählen

Alle eingebundenen Dateien tragen `?v=N`. Nach einer Änderung die Zahl in
`index.html` **und** `datenschutz.html` auf denselben Wert hochzählen.

## Klassen und Auswertung laufen über das School-Tool

Es gibt keine eigene Lehrerseite. Pseudonyme, QR-Codes und Auswertung stehen
in `school-tool/js/musiktrainer.js`. Dessen Spielliste `MT_SPIELE` muss zu
`js/spiele.js`, `js/notenspiele.js`, `js/instrumente.js` und
`js/hoerbeispiele.js` passen – neue Spiele und Stufen dort nachtragen. Neue
Stufen nur hinten anhängen: gespeicherte Ergebnisse hängen an der Stufennummer
– auch die Auswahl für die Note (`klassen.benotung` im Worker, „Meine Note“ auf
der Startseite) besteht aus `spiel|stufe`. Soll eine neue Stufe weiter vorne
erscheinen, legt `reihe` im Spiel die Reihenfolge fest (Stammtöne:
`NOTEN_REIHE`, Junior 2 und Anfänger 2 sind Nummer 4 und 5); `MT_SPIELE` im
School-Tool braucht dieselbe `reihe`.

Der Worker nimmt Stufennummern 0–29 an (`stufe > 29` und `\d{1,2}` in
`cloudflare/worker.js`); ein Spiel mit mehr Stufen braucht dort eine höhere Grenze.

## Noten: Schnitt der 3 besten Runden

Je Spiel und Stufe zählt der Schnitt der drei besten Runden (Note = 7 − Sterne).
Gerechnet wird das zweimal und muss gleich bleiben: `meineNote()` in
`js/app.js` (die Kinder, mit `beste3` vom Worker) und `werte()` in
`school-tool/js/musiktrainer.js` (die Lehrkraft, aus dem Verlauf).

## Aufnahmen

Instrumente, Stilrichtungen und Spielweisen nutzen echte Aufnahmen
(Wikimedia Commons, Freesound): nur gemeinfrei, CC0, CC BY oder CC BY-SA,
nichts aus Schulbüchern (MusiX, Helbling). Jede Aufnahme mit Urheber und
Lizenz auf `quellen.html` nachweisen.

## Datenschutz

Auf dem Server liegen keine Namen, nur Pseudonyme. Keine Inhalte von
Fremdanbietern einbinden (Schriften, CDNs, Analyse): `datenschutz.html` sagt
das zu. Änderungen an gespeicherten Daten auch dort nachtragen. Alle Seiten tragen
`<meta name="robots" content="noindex, nofollow">`, damit Suchmaschinen den
music-trainer nicht aufnehmen – neue HTML-Seiten auch.

## Worker und Seite gehören zusammen

`cloudflare/worker.js` fügt Tom von Hand im Cloudflare-Dashboard ein (kein
Wrangler). Nach Änderungen am Worker daran erinnern, ihn neu einzufügen.
`normName()` im Worker und `Benutzername.normal()` in `js/konto.js` müssen
gleich bleiben.

## Testen ohne Cloudflare

`test/attrappe.js` (siehe ANLEITUNG.md) – führt den echten Worker mit sql.js
als D1-Ersatz aus.

## Klasse 5

Keine punktierten Noten, höchstens zwei Hilfslinien, Notennamen klein (c, cis,
es, b) wie im Unterricht.
