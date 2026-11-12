# Leenli

Eine Lern-App in kurzen Häppchen: Lektionen bestehen aus kurzen Leseabschnitten, nach jedem Abschnitt kommt eine Frage. Jeder Abschnitt lässt sich normal lesen oder mit dem eingebauten **Speed-Reader** – ein Wort nach dem anderen, mit rotem Fokusbuchstaben.

- Läuft auf PC, iPhone, iPad und Android als installierbare Web-App (PWA)
- Funktioniert komplett offline – kein Server, kein Konto, keine Synchronisierung
- Eigene Kurse lässt du dir von Claude erstellen und importierst sie als JSON
- Alle Daten bleiben auf deinem Gerät

**App öffnen:** <https://gfb-digital.github.io/Leenli-/> (sobald GitHub Pages eingeschaltet ist, siehe unten)

---

## Inhalt

1. [Auf dem Handy installieren](#auf-dem-handy-installieren)
2. [Eigene Kurse mit Claude erstellen](#eigene-kurse-mit-claude-erstellen)
3. [Das Kursformat](#das-kursformat)
4. [Der Speed-Reader](#der-speed-reader)
5. [Entwicklung am PC](#entwicklung-am-pc)
6. [Veröffentlichen auf GitHub Pages](#veröffentlichen-auf-github-pages)
7. [Projektaufbau](#projektaufbau)
8. [Später als echte App (Capacitor)](#später-als-echte-app-capacitor)

---

## Auf dem Handy installieren

| Gerät | So geht's |
| --- | --- |
| **iPhone / iPad** | Die App-Adresse in **Safari** öffnen → Teilen-Symbol (Quadrat mit Pfeil) → **„Zum Home-Bildschirm“** → „Hinzufügen“ |
| **Android** | In Chrome öffnen → Menü ⋮ → **„App installieren“** |
| **PC (Chrome/Edge)** | Rechts in der Adressleiste auf das Installieren-Symbol klicken |

Nach dem ersten Öffnen funktioniert Leenli auch ohne Internet. Gibt es eine neue Version, erscheint unten der Hinweis „Neue Version verfügbar → Aktualisieren“. Die App lädt nie ungefragt neu, damit keine laufende Lektion verloren geht.

> **Wichtig:** Deine Kurse und dein Fortschritt liegen nur auf dem jeweiligen Gerät. Wird die App vom Home-Bildschirm gelöscht, sind auch die Daten weg.

---

## Eigene Kurse mit Claude erstellen

1. In Leenli **Inhalte** öffnen (Pfeil-Symbol oben rechts) → **„Vorlage kopieren“**
2. Bei Claude einfügen, Thema und Umfang eintragen, absenden
3. Claudes Antwort komplett kopieren – auch mit Text davor oder dem ```json-Rahmen, das entfernt Leenli selbst
4. In Leenli unter **Inhalte** einfügen → **„Importieren“** (oder eine `.json`-Datei wählen)

Findet Leenli Fehler, steht genau da, wo: zum Beispiel
„Kurs („Photosynthese“) › Lektion 2 › Schritt 3 (Frage): „answer“ ist 4, erlaubt sind aber nur 0 bis 3.“
Diese Meldung kannst du Claude einfach zurückgeben und um Korrektur bitten.

### Kurse überarbeiten statt doppelt anlegen

Jeder Kurs hat eine **ID**. Daran erkennt Leenli „denselben“ Kurs.

- **Neuer Kurs:** Die Vorlage lässt Claude das heutige Datum in die ID schreiben (z. B. `photosynthese-20261112`). So überschneiden sich neue Kurse nie.
- **Verbesserter Kurs:** Bitte Claude, die IDs beizubehalten. Beim Import fragt Leenli dann:
  - **Ersetzen** – der alte Kurs wird ausgetauscht, dein Fortschritt bleibt für Lektionen mit gleicher ID erhalten.
  - **Als neuen Kurs hinzufügen** – der Kurs bekommt automatisch eine neue ID (bei gleichem Titel z. B. „Photosynthese (2)“).

Auch der eingebaute Beispielkurs „Lernen lernen“ lässt sich so ersetzen. Löschst du deine Version wieder, ist der Beispielkurs zurück.

### Die Vorlage

So sieht die Vorlage aus (in der App steht statt `JJJJMMTT` das heutige Datum):

<!-- VORLAGE:ANFANG -->
````text
Erstelle mir einen Lernkurs für meine Lern-App „Leenli“.

Thema: [HIER DEIN THEMA EINTRAGEN]
Umfang: [z. B. 3 Lektionen]

Inhalt:
- Sprache: Deutsch, klar und anschaulich.
- Jede Lektion besteht aus 3 bis 5 Leseabschnitten. Nach jedem Abschnitt folgt genau eine Frage dazu.
- Jeder Leseabschnitt hat 60 bis 120 Wörter. Absätze innerhalb eines Abschnitts trennst du mit \n\n.
- Nur gesicherte Fakten, nichts erfinden. Bei Unsicherheit lieber weglassen.
- Die Fragen prüfen das Verständnis, nicht den genauen Wortlaut. Jede Frage bekommt eine kurze Erklärung (1–2 Sätze).
- Auswahlfragen haben 3 oder 4 plausible Antworten, genau eine ist richtig. Die richtige Antwort steht nicht immer an derselben Stelle.
- Mische Auswahlfragen ("choice") und Richtig/Falsch-Aussagen ("truefalse").

Format:
Antworte ausschließlich mit gültigem JSON in einem ```json-Codeblock, ohne Text davor oder danach. Halte dich genau an diese Struktur:

```json
{
  "id": "thema-JJJJMMTT",
  "title": "Titel des Kurses",
  "emoji": "📘",
  "description": "Ein Satz, worum es in dem Kurs geht.",
  "lessons": [
    {
      "id": "lektion-1",
      "title": "Titel der Lektion",
      "steps": [
        { "type": "text", "title": "Überschrift des Abschnitts", "text": "Erster Absatz …\n\nZweiter Absatz …" },
        { "type": "choice", "question": "Frage zum Abschnitt?", "options": ["Antwort A", "Antwort B", "Antwort C"], "answer": 1, "explanation": "Warum Antwort B stimmt." },
        { "type": "text", "title": "Nächster Abschnitt", "text": "…" },
        { "type": "truefalse", "statement": "Eine Aussage zum Abschnitt.", "answer": false, "explanation": "Warum die Aussage nicht stimmt." }
      ]
    }
  ]
}
```

Regeln für das JSON:
- "id" des Kurses: kurzer Name zum Thema aus Kleinbuchstaben, Ziffern und Bindestrichen, gefolgt von -JJJJMMTT (z. B. "photosynthese-JJJJMMTT"). So überschneidet er sich nicht mit anderen Kursen.
- Jede Lektion hat eine eigene "id" ("lektion-1", "lektion-2", …).
- "answer" bei "choice" ist die Nummer der richtigen Antwort in "options", gezählt ab 0 (0 = erste Antwort).
- "answer" bei "truefalse" ist true oder false (ohne Anführungszeichen).
- "emoji" ist ein einzelnes passendes Emoji.
- Nur gerade Anführungszeichen ("), keine Kommentare, kein Komma nach dem letzten Element einer Liste.

Wenn ich dich später bitte, einen bestehenden Kurs zu überarbeiten, behalte seine "id" und die IDs der Lektionen bei – dann ersetzt die App den alten Kurs und mein Fortschritt bleibt erhalten.
````
<!-- VORLAGE:ENDE -->

---

## Das Kursformat

Kurs → Lektionen → Schritte. Ein Import kann ein einzelner Kurs `{ … }` oder eine Liste von Kursen `[ { … }, { … } ]` sein.

### Kurs

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `id` | empfohlen | Eindeutige Kennung, z. B. `"photosynthese-20261112"`. Fehlt sie, wird sie aus dem Titel gebildet. |
| `title` | ja | Titel des Kurses |
| `emoji` | nein | Symbol auf der Kurskarte, z. B. `"🌱"` |
| `description` | nein | Ein Satz zum Inhalt |
| `lessons` | ja | Liste der Lektionen (mindestens eine) |

### Lektion

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `id` | nein | Kennung innerhalb des Kurses. Fehlt sie, wird sie aus dem Titel ergänzt. |
| `title` | ja | Titel der Lektion |
| `steps` | ja | Liste der Schritte (mindestens einer) |

### Schritte

**Leseabschnitt**

```json
{ "type": "text", "title": "Überschrift (optional)", "text": "Erster Absatz …\n\nZweiter Absatz …" }
```

Absätze werden mit einer Leerzeile getrennt – im JSON als `\n\n` geschrieben.

**Auswahlfrage**

```json
{ "type": "choice", "question": "Frage?", "options": ["A", "B", "C"], "answer": 1, "explanation": "Optional: warum B stimmt." }
```

`answer` ist die Nummer der richtigen Antwort, **gezählt ab 0** (0 = erste Antwort). Leenli mischt die Antworten beim Anzeigen.

**Richtig/Falsch-Aussage**

```json
{ "type": "truefalse", "statement": "Eine Aussage.", "answer": false, "explanation": "Optional: warum." }
```

`answer` ist `true` oder `false` – ohne Anführungszeichen.

---

## Der Speed-Reader

Die Wörter erscheinen nacheinander an derselben Stelle (RSVP). Ein Buchstabe pro Wort ist rot – dorthin schaut das Auge, ohne zu springen. Er steht immer exakt an derselben Position, etwas links der Mitte.

**Welcher Buchstabe rot wird** (Satzzeichen zählen nicht mit):

| Buchstaben im Wort | 1 | 2–5 | 6–9 | 10–13 | ab 14 |
| --- | --- | --- | --- | --- | --- |
| Roter Buchstabe | 1. | 2. | 3. | 4. | 5. |

**Wie lange ein Wort stehen bleibt** – Grundzeit 60 000 ÷ Wörter pro Minute, mal:

| Situation | Faktor |
| --- | --- |
| Satzende (. ! ? …) | × 2,2 |
| Komma, Doppelpunkt, Semikolon, Gedankenstrich | × 1,5 |
| mehr als 8 Buchstaben | + 0,3 |
| mehr als 12 Buchstaben | weitere + 0,3 |
| Absatzende | mindestens × 2,8 |
| die ersten 3 Wörter nach dem Start (Anlauf) | zusätzlich × 1,6 |

Abkürzungen wie „z. B.“ oder „usw.“ gelten nicht als Satzende. Bindestrich-Wörter werden geteilt angezeigt („Wiederlese-“, „Gruppe“). Zu lange Wörter werden kleiner dargestellt, nie abgeschnitten.

**Bedienung**

| Aktion | Touch | Tastatur |
| --- | --- | --- |
| Start / Pause | Wort antippen oder ▶ | Leertaste |
| Ein Wort zurück / vor | Positions-Regler | ← / → |
| Satz zurück | „Satz zurück“ (zweimal schnell = ein Satz weiter zurück) | – |
| Tempo | Regler oder − / + (100–1000 Wörter/Min.) | ↑ / ↓ |
| Weiter (wenn fertig gelesen) | „Weiter“ | Enter |
| Text nachlesen | „Ganzer Text“, dann ein Wort antippen springt dorthin | – |

Das Tempo wird gespeichert. Alle Werte stehen zentral in `TIMING` in [src/lib/orp.ts](src/lib/orp.ts).

---

## Entwicklung am PC

Voraussetzung: [Node.js](https://nodejs.org) ab Version 22.12 (empfohlen: 26) und Git.

```powershell
npm install          # einmalig: Abhängigkeiten installieren
npm run dev:handy    # Entwicklungsserver starten
```

Dann <http://localhost:5173> öffnen. Fürs iPhone im selben WLAN die „Network“-Adresse aus dem Terminal nehmen (die Windows-Firewall beim ersten Mal für private Netzwerke erlauben). Beenden mit **Strg + C**.

| Befehl | Was passiert |
| --- | --- |
| `npm run dev` | Entwicklungsserver nur auf diesem PC |
| `npm run dev:handy` | Entwicklungsserver, auch im WLAN erreichbar |
| `npm test` | Automatische Tests (Speed-Reader- und Import-Logik) |
| `npm run build` | Typprüfung und fertige App in `dist/` bauen |
| `npm run preview` | Gebaute App starten – hier funktioniert auch der Offline-Modus |
| `npm run icons` | App-Icons neu erzeugen ([scripts/generate-icons.mjs](scripts/generate-icons.mjs)) |

Im Entwicklungsmodus ist der Offline-Speicher (Service Worker) absichtlich aus. Im WLAN-Test ohne HTTPS funktioniert er ebenfalls nicht – das ist normal.

---

## Veröffentlichen auf GitHub Pages

Bei jedem `git push` auf `main` testet und baut GitHub die App automatisch und veröffentlicht sie unter <https://gfb-digital.github.io/Leenli-/>. Schlägt ein Test fehl, wird nichts veröffentlicht. Der Ablauf steht in [.github/workflows/pages.yml](.github/workflows/pages.yml).

**Einmalig einschalten:** Auf GitHub im Repo **Settings → Pages → Build and deployment → Source: „GitHub Actions“** wählen.

Den Stand siehst du im Repo unter **Actions**. Ein grüner Haken heißt: veröffentlicht.

> Die Seite ist öffentlich erreichbar. Deine importierten Kurse und dein Fortschritt werden dabei **nicht** hochgeladen – sie liegen nur auf deinem Gerät.

---

## Projektaufbau

```
src/
  App.tsx                 Ansichts-Steuerung (Start, Kurs, Lektion, Inhalte, Einstellungen)
  screens/                Die fünf Bildschirme
  components/             Bausteine: Kopfleiste, Dialog, Umschalter, Tempo-Regler …
    lesson/               Leseabschnitt, Frage, Zusammenfassung
    speed/                Speed-Reader (Taktgeber, Bedienung, Wortanzeige)
  lib/
    orp.ts                Speed-Reader-Logik (reine Funktionen) + orp.test.ts
    importer.ts           Kurs-Import und Prüfung + importer.test.ts
    db.ts                 Speicher (IndexedDB) – einzige Stelle mit Speicherzugriff
    store.ts              App-Zustand: Kurse, Fortschritt, Einstellungen
    navigation.ts         Ansichtswechsel mit Zurück-Taste
    appearance.ts         Hell/Dunkel und Schriftgröße
    pwa.ts                Offline-Modus und Update-Hinweis
  content/
    sample-course.ts      Eingebauter Beispielkurs „Lernen lernen“
    claude-template.ts    Vorlage für Claude
  styles/global.css       Alle Farben und Maße als CSS-Variablen
```

Der aktuelle Arbeitsstand steht in [FORTSCHRITT.md](FORTSCHRITT.md), der ursprüngliche Auftrag in [PLAN.md](PLAN.md).

---

## Später als echte App (Capacitor)

Leenli ist so gebaut, dass daraus ohne Umbau eine App für App Store und Play Store werden kann:

- **Relative Pfade** (`base: './'` in [vite.config.ts](vite.config.ts)) – der Build läuft unverändert in der App-Hülle.
- **Kein Service Worker in der App:** [src/lib/pwa.ts](src/lib/pwa.ts) erkennt Capacitor und schaltet ihn ab (die Dateien liegen dort ohnehin auf dem Gerät).
- **Safe Areas, Touch-Bedienung, große Tippflächen** sind schon berücksichtigt.
- **Zurück-Taste:** Die Navigation nutzt den Verlauf, Androids Zurück-Taste funktioniert damit.

So ginge es los (braucht für iOS einen Mac mit Xcode, für Android Android Studio):

```powershell
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init Leenli de.gfbdigital.leenli --web-dir dist
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npm run build
npx cap sync
```

Danach nach jeder Änderung: `npm run build` und `npx cap sync`.

**Empfehlungen für die App-Version:**

- **Speicher:** In der App kann das System IndexedDB bei Speichermangel leeren. Sicherer ist ein nativer Speicher (z. B. `@capacitor/preferences` oder SQLite). Dafür muss nur [src/lib/db.ts](src/lib/db.ts) ausgetauscht werden – der Rest der App spricht ausschließlich über `getItem`/`setItem`/`removeItem`.
- **Android-Zurück-Taste** mit `@capacitor/app` an `history.back()` koppeln, damit sie am Startbildschirm die App schließt.
- **App-Icons und Startbildschirme** aus [public/icons/icon-512.png](public/icons/icon-512.png) erzeugen, z. B. mit `@capacitor/assets`.
