# Hinweise für Claude Code

music-trainer by greenboy: Musik-Lernspiele für Klasse 5 (Stammtöne,
Vorzeichen, Hören, Rhythmus), Design wie das School-Tool. Dazu ein Klavier zum
freien Spielen (`js/klavierseite.js`, `#/klavier`) und ein Schlagzeug
(`js/schlagzeug.js`, `#/schlagzeug` mit den Reitern Pads, Drumset und
Drumcomputer; Klänge im Browser erzeugt wie in der Rhythmus-Werkstatt, nur das Ride als
Aufnahme aus `klaenge/drums/`; das Drumset ist von oben gezeichnet wie in GarageBand, die
Klemme der Hi-Hat tritt sie).
Dazu der Songbaukasten (`js/songbaukasten.js`, `#/songbaukasten`, Knopf „Songs“
oben), aufgebaut wie ein Song-Maker: füllt das ganze Fenster (Leiste oben und Fußzeile
ausgeblendet, nichts scrollt, kein Zoom), Raster auf einem Canvas (jeder Ton in seiner
Farbe), darunter drei Schlagzeug-Zeilen (Klänge je nach `KITS`), Schieber zum Blättern
durch die Takte, unten Play, Klang und Schlagzeug (Antippen schaltet weiter), Tempo,
Einstellungen und Speichern als Blatt darüber, Rückgängig; angemeldete
Kinder speichern Songs im Worker (`/api/songs`, Tabelle `songs`) unter einer fünfstelligen
Nummer und öffnen sie damit wieder (`#/songbaukasten/48213`). Format `v: 1` siehe Dateikopf; Tonleitern in `TONLEITERN` (u. a. HM5); Klänge für Klavier und Songbaukasten in `Ton.KLAENGE`/`Ton.stimmen`, alle etwa gleich laut;
ändert es sich, `pruefeSong()` im Worker anpassen.
Klavier und Schlagzeug haben ein Metronom mit Tempo-Leiste (`js/metronom.js`); auf der
Schlagzeugseite teilen sich Metronom und Drumcomputer eine Taktuhr. Beide Seiten sind ein
festes Bild über dem ganzen Fenster (`Vollbild.binden` in `js/vollbild.js`, Zurück-Pfeil im
Kopf, nichts scrollt – Inhalte müssen auf iPad quer und hochkant ganz passen); ihr Knopf
„Vollbild“ schaltet nur das echte Browser-Vollbild. Im Drumcomputer gibt es keine Metronom-Zeile: der
Tempo-Teil der Leiste wird in dessen Steuerzeile umgehängt (`tempoHeim()`), das Raster beginnt oben. Jedes Kästchen hat eine Lautstärke
(`beat[k][i]` 0–1, gespeichert als `x` = voll, `1`–`9` = Zehntel, `.` = aus; nach oben/unten ziehen
regelt sie), Instrument links antippen schaltet die Spur stumm (`stumm`). Knopf „Metronom“ läuft im Drumcomputer mit;
Zeilenhöhe rechnet `zeilenAnpassen()` aus dem freien Platz. Pads: „Klänge wählen“ blendet die
Auswahl unter den Pads ein (`padWahl`, sonst versteckt). Knopf „Ternär“
(`ternaer`): jede zweite Sechzehntel 1/12 Schlag später (Shuffle 2:1). Dazu oben in der Leiste ein Vollbild-Knopf für den
ganzen music-trainer. Doppeltipp-Zoom ist per `touch-action: manipulation` aus.
Zum Dazuspielen: Ein laufender Beat (Drumcomputer) spielt beim Wechsel zwischen Schlagzeug und
Klavier weiter, ein laufender Song (Songbaukasten) zwischen Songbaukasten und Klavier
(`App.aufraeumen(ziel)` entscheidet; die Seiten behalten dann ihre Taktuhr). Am Klavier
startet und stoppt ein Knopf den Beat (auch den gespeicherten, ohne das Schlagzeug zu öffnen:
`Schlagzeugseite.vonAussenStarten()`) oder – kam man vom Songbaukasten (`App.vorherigeArt`) – den Song. Die drei Seiten haben oben Knöpfe zum direkten Wechseln
(`Vollbild.wechsel()`, immer Klavier, Schlagzeug, Songbaukasten; das aktuelle markiert mit Namen),
weil sie die obere Leiste verdecken.
Prüfungszeilen Klasse 5 und 6 (`js/pruefung.js`): `#/pruefung` Klasse wählen →
`#/pruefung/k5` Modus wählen (Üben mit Cursor, Sterne sammeln, Prüfung – Üben/Sterne
auch in Liste und Zeile umschaltbar) → `#/pruefung/k5-liste`:
Toms fünf Zeilen je Klasse (Note 5 bis 1) zum Mitspielen auf den Pads – Klasse 5
Snare und Bassdrum, Klasse 6 nur Snare mit R/L und Handsatz (optional mitbewertet).
Kein Spiel in `SPIELE` (eigene Seiten), aber „Sterne sammeln“ meldet wie ein Spiel:
`Fortschritt.eintragen('rhythmus-pruefung', stufe …)`, Stufe 0–4 = Klasse 5 Note 5–1,
5–9 = Klasse 6; Sterne über `STERNE_AB`. Der beste Versuch je Zeile kommt aus diesem
Fortschritt (punkte = Prozent), also je Kind und vom Server – nicht je Gerät (früher
`musiktrainer-pruefung-best-*`, auf geteilten iPads gemischt). Die Sterne zählen in die
Gesamtzahl auf der Startseite mit (+60 möglich). In `MT_SPIELE` im School-Tool eingetragen.
Die Prüfung meldet am Ende die Endnote als eigenes Spiel `rhythmus-pruefung-note`
(Stufe 0 = Klasse 5, 1 = Klasse 6, Sterne = 7 − Note). Üben (Cursor) meldet nichts.
„Prüfung starten“: Leiter ab Note 5, je Zeile 3 Versuche, bestanden ab 80 %,
Klasse 5 fest 80 BPM (`PRUEF_BPM`), Klasse 6 ab 72 BPM und schneller (`PRUEF_BPM6`),
`BESTANDEN`, `VERSUCHE`, Endnote am Ende (gespeichert, s. o.). Einrichtung des
Cloudflare-Workers: ANLEITUNG.md.

Drums (`js/drumgrooves.js`, Kategorie „Drums“ mit der Unterkategorie Drumgrooves (Groove-Trainer, Part II, Groove + Fill und die Hör-Quiz), nach Toms Stunde „Der Drumgroove“, Klasse 7):
Groove-Trainer `#/drumgrooves` mit den fünf Grooves der Stunde (Groove 1 = Note 5 … Groove 5 = Note 1;
Hi-Hat Achtel, Snare 2 und 4, Bassdrum je Groove). Aufbau je Groove: Hi-Hat + Snare → Bassdrum + Snare → alles.
Drei Pads (Reihenfolge umdrehbar: Hi-Hat · Bassdrum · Snare oder Snare · Bassdrum · Hi-Hat, Tasten A S D) oder das
Drumset des Schlagzeugs (nur Hi-Hat, Snare, Bassdrum). „Mitspielen“ ohne Sterne, „Sterne sammeln“ = ganzer Groove,
Spiel `drumgrooves`, Stufe 0–4. Dazu das Spiel `groove-hoeren` (Bereich „Drums“, `unter: 'Drumgrooves'`; Startseite: `App.drumsKarten`). Alle drei
stehen im School-Tool in `MT_SPIELE`.
Drumgrooves Part II (`#/drumgrooves2`, `modus: 'part2'`, Klasse 9): fünf Level aus Toms Folie (`DG.GROOVES2`, Level 5 mit zwei Takten und eigener Snare), Spiel `drumgrooves-2` (Stufe 0–4), Karte in der Unterkategorie Drumgrooves.
Groove + Fill (`#/groovefill`, derselbe Trainer mit `modus: 'fill'`): 1 Takt Groove 2 + 1 Takt Fill (Snare, Toms),
4×. Acht Fills (`DG.FILLS` aus `DG.FILL_RHYTHMEN`: 1 2+ 3 4+, 1+ 2 3+ 4+, 1 2+ 3+ 4+, 1+ 2+ 3 4, je nur Snare und Snare → Toms abwärts; Stufe = Rhythmus × 2 + Toms). Aufbau: nur Fill (Computer spielt den Groove) → Groove + Fill.
Sechs Pads (oben Toms Q W E, unten Hi-Hat · Snare · Bassdrum A S D – Snare immer in der Mitte). Spiel `groove-fill`
(Stufe 0–7) und das Hör-Quiz `fill-hoeren` (Bereich „Drums“, `unter: 'Drumgrooves'` – seit 25.11.2026 steht alles in der einen Unterkategorie Drumgrooves). Drumset-Ansicht: beim Vorspielen (Anhören, Computer-Groove unter dem Fill) schlagen Sticks R (orange) und L (türkis, Farben wie der Handsatz der Rhythmus-Prüfung) und das Bassdrum-Pedal F (lila); Schalter „Sticks“. Handsatz: im Groove Hi-Hat R, Snare L; im Fill wie die Rhythmus-Werkstatt (`DG.handsatz`, nach `handsatzBerechnen` in rhythmus-werkstatt/js/noten.js: Zählzeit R, zwei Achtel R L, Viertel hintereinander R L). Gleiche Trommel: Sticks nebeneinander. Notenhälse: nur Becken = Hals ab der oberen Kreuzspitze, mit Snare/Bassdrum darunter durchgehend.

Klavier-Prüfung „In the End“ (`js/klavierpruefung.js`, `#/klavierpruefung`; seit 25.11.2026 eigene Kategorie „Piano“ auf der Startseite, nicht mehr unter Prüfungen; Übeart „Mitspielen“ heißt in der Oberfläche „Üben“):
Intro von „In the End“ (Linkin Park) auf einer eigenen Klaviatur (G bis h¹, Knopf „Größer“: A bis a¹), festes Bild wie das Klavier (`Vollbild.binden`, Tasten von Rand zu Rand, füllen die Höhe unter den Noten), Zeile einmal
gezeichnet mit Wiederholung, gespielt 2×, beim 2. Mal Ende auf Takt 4, Schlag 1 (liegen
lassen). Tastennummern wie Toms Aufkleber am Keyboard (`NUMMER`, keine Fingersätze) unter den Noten und auf den Tasten. Rechte/linke Hand/beide; „Schritt für Schritt“ (Cursor wartet auf die richtigen
Tasten, Akkorde zusammen) „Mitspielen“ (Einzähltakt, Treffer ±0,18 s, keine Sterne) und „Sterne sammeln“
(wie Mitspielen, gewertet; Tasten leuchten bei Schritt für Schritt immer, bei Mitspielen per Schalter (anfangs aus), bei Sterne sammeln nie; Sterne wie die Rhythmus-Prüfung, Spiel `klavier-pruefung`,
Stufe 0/1/2 = rechts/links/beide, im School-Tool eingetragen). Andere Hand spielt wahlweise mit. Kein Zoom, kein Markieren. **Urheberrecht:** Die Noten stehen nie
im Repository (öffentlich), sondern in der Cloudflare-Variable `STUECKE`; der Worker gibt
sie nur angemeldeten Kindern (`GET /api/stueck/<id>`, § 60a UrhG). Lokal liegen sie in
`cloudflare/stuecke.local.json` (gitignored, die Attrappe liest sie). Format im Dateikopf
von `js/klavierpruefung.js`.

## Notenspiele (`js/notenspiele.js`)

Bereiche Stammtöne, Vorzeichen, Bassschlüssel, Bassschlüssel Vorzeichen (je fünf Spiele,
`notenSpiele(art)` mit Schlüssel aus `NOTEN_ARTEN`) und Oktavlagen (Klasse 6, `oktavSpiele()`:
Welche Etage?, Name mit Oktave, Note → Taste, Noten schreiben, Oktav-Detektiv, Gleicher Platz).
Namen mit Oktave wie im Unterricht: C … H, c … h, c¹, c², c³ (`Stufe.vollerName`, hochgestellt,
nicht c'). Oktav-Farben in `Oktavlage.ETAGEN`. Profi der Oktavlagen im Klaviersystem
(`Notenbild.klaviersystem`, `Notensetzer` mit `schluessel: 'klavier'`).

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
Ausnahme: bei `rhythmus-pruefung-note` (Endnote der Prüfung) zählt nur die beste
Prüfung (`wievieleZaehlen()` hier in `Fortschritt` und im School-Tool).
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

## Minispiele nutzen dieselben Konten

Die Minispiele (`~/github-projekte/Minispiele`, greenboy87.github.io/minispiele) melden
sich mit denselben Pseudonymen über diesen Worker an (`Minispiele/shared/konto.js`,
gleicher localStorage-Schlüssel `musiktrainer-konto`). Ihre Runden landen in `verlauf`
und `fortschritt` mit Spielnamen `mini-…` (stehen nicht in `MT_SPIELE`). Für ihre Seite
„Mein Stand“ gibt es `GET /api/meinverlauf?praefix=mini-` (nur eigene Runden).

## Testen ohne Cloudflare

`test/attrappe.js` (siehe ANLEITUNG.md) – führt den echten Worker mit sql.js
als D1-Ersatz aus.

## Klasse 5

Keine punktierten Noten, höchstens zwei Hilfslinien, Notennamen klein (c, cis,
es, b) wie im Unterricht.

Startseite: Die Beschreibungen der Spielkarten sind versteckt; ein einziges i über allen Spielen (`#btn-beschreibungen`, `App.beschreibungenBinden`, `localStorage` `musiktrainer-beschreibungen`) blendet alle ein. Kein i je Karte (Toms Wunsch).

iPad-Spielflächen (Klaviatur In the End, freies Klavier, Drum-Pads/Drumset): `Vollbild.beruehrung(el, alleLos)` fängt `touchstart` ab (keine Textauswahl, kein „Kopieren“-Menü), hebt Auswahlen auf und lässt alle Tasten los, sobald kein Finger mehr aufliegt bzw. bei blur/Hintergrund – vorher blieben Tasten auf dem iPad manchmal gedrückt (25.11.2026). Auf `.card.vollbild` gilt überall `user-select: none`.
