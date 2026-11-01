# music-trainer einrichten

Die Spiele laufen auch ohne diese Schritte: Dann spielen alle als Gast und die
Sterne bleiben im jeweiligen Browser. Für Anmeldung und Auswertung braucht es
einmalig einen Cloudflare-Worker mit Datenbank. Alles bleibt im kostenlosen
Tarif. Klassen, QR-Codes und Auswertung laufen über das School-Tool
(Reiter Klassen → music-trainer).

## 1. Seite veröffentlichen (GitHub Pages)

Das Repository `music-trainer` auf GitHub anlegen und unter Settings → Pages
den Zweig `main` freigeben. Die Seite liegt dann unter
`https://greenboy87.github.io/music-trainer/`.

## 2. Datenbank anlegen (Cloudflare D1)

1. dash.cloudflare.com → **Storage & Databases → D1 → Create database**,
   Name `music-trainer`. **Speicherort/Jurisdiction: EU** wählen (falls nur
   ein Ort angeboten wird: „Western Europe“). Die Datenschutzhinweise sagen
   „Speicherort in der EU“ – das muss stimmen.
2. In der Datenbank **Console** öffnen. Das Eingabefeld ist einzeilig, und
   die Kommentare in `schema.sql` würden alles dahinter verschlucken. Deshalb
   ohne Kommentare als eine Zeile kopieren:

   ```bash
   sed 's/--.*$//' cloudflare/schema.sql | tr '\n' ' ' | tr -s ' ' | pbcopy
   ```

   Einfügen, **Execute**, dann zur Kontrolle `/tables` – es müssen `klassen`,
   `schueler`, `fortschritt`, `verlauf` und `sperren` erscheinen.

## 3. Worker anlegen

1. **Workers & Pages → Create → Create Worker**, Name `music-trainer`,
   **Deploy**.
2. **Edit code**: den Beispielcode löschen, den Inhalt von
   `cloudflare/worker.js` einfügen, **Deploy**.
3. **Settings → Bindings → Add → D1 database**: Variablenname `DB`,
   Datenbank `music-trainer`.
4. **Settings → Variables and Secrets → Add**, Typ **Secret**:
   - `LEHRER_PASSWORT` – dein Passwort für den Reiter im School-Tool
   - `TOKEN_SCHLUESSEL` – eine lange Zufallszeichenkette, mindestens 32
     Zeichen (z. B. aus einem Passwort-Generator). Nie weitergeben; wer sie
     ändert, meldet alle Kinder ab.
5. **Settings → Observability**: **Workers Logs ausschalten**. Sonst speichert
   Cloudflare zu jeder Anfrage Protokolle mit IP-Adresse, und die
   Datenschutzhinweise („Protokolle werden nicht aufgezeichnet“) stimmen nicht.
6. Die Adresse des Workers kopieren, z. B.
   `https://music-trainer.DEIN-NAME.workers.dev`.

## 4. Adresse an zwei Stellen eintragen

- `music-trainer/js/konto.js` → `API: ''`
- `school-tool/js/musiktrainer.js` → `API: ''`

Jeweils ohne `/` am Ende. Danach die Versionsnummern `?v=` hochzählen
(music-trainer: `index.html`, `datenschutz.html`; School-Tool: alle fünf
HTML-Dateien), committen und pushen.

## 5. Datenschutzhinweise ausfüllen

In `datenschutz.html` sind alle offenen Angaben rot markiert: Schule,
Nachname, dienstliche E-Mail, Datenschutzbeauftragte/r, Rechtsgrundlage des
Landes, Aufsichtsbehörde. Siehe auch die Checkliste unten.

## 6. Erste Klasse

1. School-Tool → Klassen → Klasse wählen → Reiter **music-trainer**.
2. Klassenpasswort prüfen (Vorschlag nach dem Muster `RSA-Klasse5a!`) →
   **Kinder einrichten** → einmal mit `LEHRER_PASSWORT` anmelden (gilt
   12 Stunden).
3. Jedes Kind bekommt ein Pseudonym wie `PandaGeige42`. Nur das School-Tool
   weiß, wer wer ist (verschlüsselt im Sync).
4. **QR-Anmeldung am Beamer** (ein Code je Kind, am Beamer nur Vornamen) oder
   **Kärtchen drucken**.
5. Neue Kinder später: in der Klasse eintragen, dann im Reiter
   „neue Kinder einrichten“.
6. **Am Schuljahresende: „Vom Server löschen“.** Die Datenschutzhinweise
   versprechen das.

Eigene Zugänge (z. B. für die eigenen Kinder): School-Tool → Extras →
„music-trainer: eigene Zugänge“. Gruppe mit Passwort anlegen, Benutzernamen
frei wählen.

## Wie sich die Kinder anmelden

- **Am schnellsten:** den eigenen QR-Code am Beamer scannen. Der Link meldet
  ein anderes Kind auf dem iPad ab und das neue an; Name und Passwort
  verschwinden danach sofort aus der Adresszeile.
- **Von Hand:** Pseudonym und Klassenpasswort vom Kärtchen. Groß/klein ist
  egal.
- Nach 10 falschen Passwörtern ist ein Pseudonym 10 Minuten gesperrt (je
  Kind, nicht je Schule, weil alle iPads nach außen dieselbe Adresse haben).
- Auf geteilten iPads am Ende **Abmelden** tippen.

## Datenschutz: Checkliste

Technisch umgesetzt:

- Auf dem Server keine Namen, nur Pseudonyme; Zuordnung nur verschlüsselt im
  School-Tool.
- Keine Cookies, kein Tracking, keine Inhalte von Google oder anderen
  Fremdanbietern (Notenschrift liegt in `fonts/`).
- IP-Adressen nur als gekürzter Prüfwert bei Fehlversuchen, nach Ablauf der
  Sperre gelöscht.
- Verlauf der Runden nach 365 Tagen automatisch gelöscht.
- Anmeldung freiwillig, alle Spiele auch ohne.
- Löschen einzelner Kinder und ganzer Klassen jederzeit im School-Tool.

Offen – das kann die Technik nicht lösen, das klärst du mit der Schule:

1. **Genehmigung der Schulleitung** für den Einsatz im Unterricht.
2. **Datenschutzbeauftragte/r der Schule** prüft die Datenschutzhinweise und
   trägt die Verarbeitung ins Verzeichnis der Verarbeitungstätigkeiten ein.
3. **Auftragsverarbeitung:** Cloudflare (und GitHub) laufen über dein privates
   Konto. Der Vertrag zur Auftragsverarbeitung von Cloudflare gilt damit für
   dich, nicht für die Schule. Mit dem/der DSB klären, ob das so in Ordnung
   ist oder die Schule Vertragspartner sein muss.
4. **Eltern informieren**, z. B. mit einem kurzen Elternbrief.
5. **Impressum:** Für ein kostenloses Schulangebot ohne Gewinnabsicht in der
   Regel nicht nötig – auch das mit der Schule abstimmen.
6. Die Ergebnisse **nicht für Noten** verwenden – so steht es in den
   Datenschutzhinweisen. Soll das anders sein, muss der Text geändert und
   neu abgestimmt werden.

## Kosten

Kostenloser Tarif von Cloudflare: 100 000 Worker-Aufrufe und 5 Mio.
Datenbank-Lesezugriffe pro Tag. Pro gespielter Runde geht ein kleines
Ergebnis an den Server, gelesen wird nur beim Anmelden, beim Öffnen der Seite
und im School-Tool beim Öffnen des Reiters. Eine Klasse mit 30 Kindern und je
20 Runden braucht rund 1 000 Aufrufe am Tag. Firebase wird nicht benutzt.

## Ohne Cloudflare ausprobieren

`test/attrappe.js` führt den echten Worker im Browser mit einer nachgebauten
Datenbank aus. Seite lokal öffnen (Port 8778), dann in der Browser-Konsole:

```js
await (await import('./test/attrappe.js')).starten()
```

Lehrer-Passwort in der Attrappe: `test-passwort`. Fürs School-Tool die Datei
über den Server `music-trainer-cors` (Port 8779) laden.
