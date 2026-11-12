# Leenli – Fortschritt

Hier steht, was schon erledigt ist, welche Entscheidungen getroffen wurden und was als Nächstes kommt.
Wird nach jeder Phase aktualisiert. Den eigentlichen Auftrag beschreibt [PLAN.md](PLAN.md).

**Stand:** 12.11.2026 – Phase 6 abgeschlossen. Offen: GitHub Pages im Repo einschalten (Nutzer) und Rückmeldungen vom iPhone-Test.

## Erledigt

### Phase 1 – Projektgerüst, PWA, Icons (Commit `4cc048e`)
- Vite 8, React 19, TypeScript 7, vite-plugin-pwa 2
- Icons werden per Skript erzeugt: `npm run icons` ([scripts/generate-icons.mjs](scripts/generate-icons.mjs)), Motiv: rotes „L“ als Fokusbuchstabe zwischen Führungslinien
- Service Worker nur im Build aktiv, nicht in `npm run dev` und nicht in der späteren Capacitor-App
- Grundstil mit CSS-Variablen und automatischem Dunkelmodus ([src/styles/global.css](src/styles/global.css))

### Phase 2 – Datenmodell, Speicher, Beispielkurs, Start- und Kursbildschirm (Commit `e162247`)
- Datenmodell: [src/lib/types.ts](src/lib/types.ts)
- Speicher: eigener kleiner IndexedDB-Wrapper [src/lib/db.ts](src/lib/db.ts); bei Fehlern Rückfall auf Arbeitsspeicher mit Hinweis
- App-Zustand: [src/lib/store.ts](src/lib/store.ts) (`useAppState`, `saveLessonResult`, `updateSettings`)
- Navigation ohne Router: [src/lib/navigation.ts](src/lib/navigation.ts), nutzt den Browser-Verlauf, damit die Zurück-Taste funktioniert
- Beispielkurs „Lernen lernen“: [src/content/sample-course.ts](src/content/sample-course.ts)
- Bildschirme in [src/screens/](src/screens/): Start und Kurs fertig; Lektion, Inhalte und Einstellungen sind Platzhalter

### Phase 3 – Lektion mit normalem Lesemodus und Fragen
- [src/screens/LessonScreen.tsx](src/screens/LessonScreen.tsx) steuert den Ablauf (Schritt, Antworten, Ende); Test-Button entfernt
- Je Schritttyp eine Komponente in [src/components/lesson/](src/components/lesson/): `TextStepView`, `QuestionStepView`, `LessonSummary`, `LessonFooter`
- Allgemeine Bausteine: `SegmentedControl` (Normal | Speed), `ConfirmDialog` (natives `<dialog>`, auch für Phase 5 nutzbar)
- Tastatur am PC ([src/lib/useKeydown.ts](src/lib/useKeydown.ts)): Enter = Weiter, Ziffern 1–9 wählen eine Antwort
- Ergebnis wird beim Erreichen der Zusammenfassung gespeichert, nicht erst beim Klick auf „Zurück zum Kurs“

### Phase 4 – Speed-Reader
- Logik als reine Funktionen in [src/lib/orp.ts](src/lib/orp.ts): `tokenize`, `splitWord`, `pauseAfter`, `wordDuration`, `remainingMs`, `sentenceBackTarget`, `clampWpm`
- 28 Tests in [src/lib/orp.test.ts](src/lib/orp.test.ts), Aufruf mit `npm test`
- Oberfläche in [src/components/speed/](src/components/speed/): `RsvpWord` (Wortanzeige mit Auto-Verkleinerung per ResizeObserver) und `SpeedReader` (Taktgeber, Bedienung, Tastatur, ganzer Text)
- Im Browser gemessen (Firefox, 360 px und 1280 px): Der Fokusbuchstabe lag bei allen 96 Wörtern eines Abschnitts höchstens 0,01 px neben der Mitte, nichts wurde abgeschnitten

### Überarbeitung Speed-Reader (Wunsch vom 12.11.2026, Vorbild: Video „How Fast Can You Read?“ von Neurobuff)
- **Fokusbuchstabe bei 38 % von links** statt in der Mitte (`FOCUS_X` in [RsvpWord.tsx](src/components/speed/RsvpWord.tsx)). Der Buchstabe ist dort festgemacht, die Wortteile hängen links und rechts daran → pixelgenau, lange Wörter müssen seltener verkleinert werden.
- **Optik:** zwei dezente Linien über die ganze Breite, lange senkrechte Markierungen genau über und unter dem Fokus, kein Kasten, Serifenschrift.
- **Rot:** weicheres Karminrot (`--focus-letter`: hell `#cc3b4e`, dunkel `#ef5d6c`), ebenso im App-Icon.
- **Bindestrich-Wörter** werden getrennt angezeigt: „Wiederlese-Gruppe“ → „Wiederlese-“, „Gruppe“ (`splitCompound` in orp.ts). Teile mit weniger als 3 Buchstaben bleiben verbunden („E-Mail“).

### Phase 5 – Import und Einstellungen
- Import-Logik als reine Funktionen in [src/lib/importer.ts](src/lib/importer.ts), 22 Tests in [importer.test.ts](src/lib/importer.test.ts) (insgesamt jetzt 54 Tests)
- Vorlage für Claude: [src/content/claude-template.ts](src/content/claude-template.ts) – ein Test prüft, dass ihr Beispiel-JSON fehlerfrei importierbar ist
- [ContentScreen](src/screens/ContentScreen.tsx): JSON einfügen oder Datei wählen, Ergebnis-/Fehleranzeige, Rückfrage bei gleicher ID, Vorlage kopieren/ansehen, Kurse löschen
- [SettingsScreen](src/screens/SettingsScreen.tsx): Standard-Lesemodus, Speed-Tempo, Schriftgröße mit Vorschau, Darstellung, Fortschritt zurücksetzen, App-Status
- Darstellung und Schriftgröße: [src/lib/appearance.ts](src/lib/appearance.ts) setzt `data-theme` und `--font-scale` an `<html>`
- Neue Bausteine: `TempoControl`, `ConfirmDialog` mit optionaler dritter Möglichkeit, `copyText` ([clipboard.ts](src/lib/clipboard.ts))

### Phase 6 – Feinschliff
- **Veröffentlichung:** [.github/workflows/pages.yml](.github/workflows/pages.yml) testet, baut und veröffentlicht bei jedem Push auf `main` nach <https://gfb-digital.github.io/Leenli-/> (Node 26, `npm ci` → `npm test` → `npm run build`)
- **Kein Aufblitzen der Farben beim Start:** Darstellung und Schriftgröße werden zusätzlich in `localStorage` (`leenli-appearance`) gespiegelt; ein kleines Skript in [index.html](index.html) setzt sie vor dem ersten Zeichnen
- **Handy im Querformat:** Wortgröße richtet sich auch nach der Höhe (`min(10vw, 9vh)`); bei niedriger Höhe scrollt die untere Leiste mit, statt Inhalt zu verdecken
- **iOS:** kein Kopiermenü bei langem Druck auf das Wort (`-webkit-touch-callout: none`)
- **Geprüft:** 360 px (hell/dunkel), 390 px, iPad 820 px, PC 1280 px, Querformat 844×390 – kein seitliches Scrollen, Fokus überall auf ≤ 0,02 px genau
- **README** komplett: Installation auf dem Handy, Claude-Workflow, Kursformat, Speed-Reader-Regeln, Entwicklung, GitHub Pages, Projektaufbau, Capacitor. Die Vorlage wurde per Skript aus `claude-template.ts` eingesetzt (bei Änderungen der Vorlage README mit aktualisieren).
- `@types/node` auf ^26 angehoben; `npm audit`: App-Code 0 Warnungen, die 6 Warnungen in workbox-build bestehen weiter (keine korrigierte Version verfügbar)

## Entscheidungen und Abweichungen vom Plan
- **Updates:** keine automatische Aktualisierung, sondern ein Hinweis „Neue Version verfügbar → Aktualisieren“, damit eine laufende Lektion nicht verloren geht.
- **Relative Pfade** (`base: './'`): Die App läuft in jedem Unterordner (z. B. GitHub Pages) und unverändert in Capacitor.
- **Farben:** Rot ist nur für den Fokusbuchstaben da. Bei falsch beantworteten Fragen kommt Bernstein/Orange (`--wrong`) zum Einsatz, für richtige Grün (`--correct`).
- **Zeilenenden:** `.gitattributes` erzwingt LF, damit Git keine CRLF-Warnungen mehr zeigt.
- **Kurs-IDs (entschieden 12.11.2026):** Die ID erkennt „denselben“ Kurs, damit überarbeitete Versionen den alten Kurs ersetzen und der Fortschritt bleibt. Neue Kurse überschneiden sich nicht, weil die Claude-Vorlage das Datum in die ID schreibt (`thema-JJJJMMTT`). Bei gleicher ID fragt die App: „Ersetzen“ (Fortschritt bleibt für gleiche Lektions-IDs) oder „Als neuen Kurs hinzufügen“ (neue ID, bei gleichem Titel „Titel (2)“). Das gilt auch für den Beispielkurs; wird die Ersatzversion gelöscht, kommt er zurück.
- **Fehlende Kurs-ID** wird aus dem Titel erzeugt (z. B. „gruene-pflanzen“), fehlende Lektions-IDs ebenso. Die App weist nach dem Import darauf hin.
- **Import ist tolerant beim Drumherum, streng beim Inhalt:** Begleittext und ```json-Rahmen werden entfernt, `{ "courses": [...] }` wird akzeptiert. Falsche Typen werden dagegen nie stillschweigend korrigiert, sondern mit Kurs › Lektion › Schritt gemeldet.
- **Schriftgröße** (Klein/Normal/Groß/Riesig = 0,9/1/1,12/1,25) wirkt auf Lesetext, Fragen, Antworten und den Speed-Reader.
- **Darstellung:** Die dunklen Farben stehen in global.css zweimal (automatisch per Media Query und erzwungen per `[data-theme='dark']`) – beide Blöcke gleich halten.
- **npm audit:** Die 6 Warnungen betreffen nur Build-Werkzeuge (workbox-build), der App-Code selbst hat 0. **Nicht** `npm audit fix --force` ausführen: Das würde vite-plugin-pwa auf 1.1.0 ohne Vite-8-Unterstützung zurückstufen.
- **Darstellung:** Umschalter „Automatisch | Hell | Dunkel“ kommt in Phase 5 (Wunsch vom 11.11.2026, in PLAN.md ergänzt).
- **Richtig/Falsch-Fragen** haben die Antwort-Buttons „Stimmt“ und „Stimmt nicht“. So gibt es keine Verwechslung mit der Rückmeldung „Richtig!“ / „Nicht ganz.“.
- **Bei falscher Antwort** wird immer auch die richtige Lösung genannt, zusätzlich zur Erklärung (falls vorhanden).
- **Lesemodus:** Wer in einer Lektion auf „Speed“ umschaltet, behält das für die restlichen Abschnitte dieser Lektion. Der Standard kommt aus den Einstellungen und wird dadurch nicht geändert.
- **Schließen** einer begonnenen Lektion fragt nach („Lektion beenden?“). Die Zurück-Taste des Browsers verlässt die Lektion ohne Rückfrage.
- **Silbentrennung** ist nur im Lesetext automatisch, nicht in Fragen und Antworten (der Browser trennte dort ungünstig, z. B. „sinnlo-se“).
- **Tests:** Statt Vitest wird der in Node.js eingebaute Test-Runner genutzt (`node --test`). Node 26 führt TypeScript direkt aus, deshalb ist keine zusätzliche Bibliothek nötig. Die Testdateien prüft `tsconfig.node.json`, nicht `tsconfig.app.json`.
- **Speed-Reader im Detail:**
  - Zeichen werden als Grapheme gezählt (`Intl.Segmenter`, sonst `Array.from`). So gilt z. B. „Ä“ aus A + ¨ als ein Buchstabe. Ziffern zählen als Buchstaben, Emojis bekommen den Fokus aufs erste Zeichen.
  - „+0,3“ für lange Wörter wird zum Faktor addiert (also +30 % der Grundzeit).
  - Abkürzungen („z. B.“, „usw.“, „Dr.“), Initialen („H.“) und Ordnungszahlen („11.“) gelten nicht als Satzende.
  - Alleinstehende Satzzeichen (z. B. ein Gedankenstrich) werden ans vorherige Wort gehängt.
  - **„Satz zurück“:** Mitten im Satz springt es an dessen Anfang. Am Satzanfang oder bei zweimaligem Drücken innerhalb von 1,5 s geht es zum vorherigen Satz (wie „Titel zurück“ im Musikplayer).
  - „Weiter“ erscheint, sobald der Text einmal bis zum Ende gelesen wurde, sonst „Überspringen“.
  - Wird die App in den Hintergrund geschickt, hält der Reader automatisch an.
  - Bei „Ganzer Text“ springt der Reader zum angetippten Wort.
  - Ein Mausklick wählt die Bedien-Buttons nicht aus, damit die Leertaste immer Start/Pause bleibt.

## Als Nächstes
- **GitHub Pages einschalten (Nutzer, einmalig):** Repo → Settings → Pages → Source „GitHub Actions“. Claude durfte das nicht selbst tun (Einstellung, die etwas öffentlich macht). Danach einmal pushen oder den Workflow unter „Actions“ starten.
- Rückmeldungen vom echten iPhone einarbeiten: Speed-Reader-Optik, Lesbarkeit, Kopieren der Vorlage, Installation vom Home-Bildschirm
- Mögliche Ideen für später: Export/Import des Fortschritts als Datei (Sicherung), Wiederholungs-Erinnerungen (Abstandseffekt), Startbildschirme für iOS

## Offene Punkte
- **Hosting:** Workflow für GitHub Pages ist fertig; das Einschalten in den Repo-Einstellungen steht noch aus (siehe „Als Nächstes“).
- **Abweichung von PLAN.md:** Der Plan nennt für den Fokusbuchstaben „Mitte“. Auf Wunsch des Nutzers (Video-Vorbild) steht er jetzt bei 38 %.
