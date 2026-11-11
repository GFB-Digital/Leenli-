# Leenli – Fortschritt

Hier steht, was schon erledigt ist, welche Entscheidungen getroffen wurden und was als Nächstes kommt.
Wird nach jeder Phase aktualisiert. Den eigentlichen Auftrag beschreibt [PLAN.md](PLAN.md).

**Stand:** 12.11.2026 – Phase 4 abgeschlossen, als Nächstes Phase 5 (Import und Einstellungen).

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

## Entscheidungen und Abweichungen vom Plan
- **Updates:** keine automatische Aktualisierung, sondern ein Hinweis „Neue Version verfügbar → Aktualisieren“, damit eine laufende Lektion nicht verloren geht.
- **Relative Pfade** (`base: './'`): Die App läuft in jedem Unterordner (z. B. GitHub Pages) und unverändert in Capacitor.
- **Farben:** Rot ist nur für den Fokusbuchstaben da. Bei falsch beantworteten Fragen kommt Bernstein/Orange (`--wrong`) zum Einsatz, für richtige Grün (`--correct`).
- **Zeilenenden:** `.gitattributes` erzwingt LF, damit Git keine CRLF-Warnungen mehr zeigt.
- **Kurs-IDs:** Ein importierter Kurs mit derselben ID wie der Beispielkurs ersetzt diesen. In Phase 5 klären, ob das so bleiben soll.
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

## Nächste Phase: 5 – Import und Einstellungen
- **Inhalte-Bildschirm** ([src/screens/ContentScreen.tsx](src/screens/ContentScreen.tsx)):
  - JSON einfügen (auch mit ```json-Rahmen) oder `.json`-Datei wählen
  - Kurs oder Liste von Kursen; gleiche ID ersetzt den alten Kurs
  - Fehlende Lektions-IDs ergänzen
  - Gründliche Prüfung mit deutschen Fehlermeldungen (Kurs, Lektion, Schritt)
  - Importierte Kurse löschen
  - Button „Vorlage für Claude kopieren“
- **Klären:** Darf ein Import den eingebauten Beispielkurs (ID `lernen-lernen`) ersetzen?
- **Beim ersten Import** `navigator.storage.persist()` anfragen, damit der Browser die Daten nicht löscht
- **Einstellungen** ([src/screens/SettingsScreen.tsx](src/screens/SettingsScreen.tsx)):
  - Standard-Lesemodus, Tempo, Schriftgröße, Darstellung (Automatisch | Hell | Dunkel)
  - Fortschritt zurücksetzen mit `ConfirmDialog`
  - Den App-Status behalten
- **Schriftgröße und Darstellung** wirken auf die ganze App, über CSS-Variablen bzw. ein `data-theme`-Attribut an `<html>`

## Danach
- **Phase 6 – Feinschliff:** Design, iPhone-Größe, README; `npm audit` erneut prüfen

## Offene Punkte
- **Hosting:** Damit die App auf dem iPhone installierbar und offline nutzbar ist, muss sie per HTTPS erreichbar sein (z. B. GitHub Pages). In Phase 6 klären.
