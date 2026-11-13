# ΤΟΠΟΣ (Topos, früher Locus und Leenli) – Fortschritt

Hier steht, was schon erledigt ist, welche Entscheidungen getroffen wurden und was als Nächstes kommt.
Wird nach jeder Phase aktualisiert. Den eigentlichen Auftrag beschreibt [PLAN.md](PLAN.md).

**Stand:** 13.11.2026 – Großer Ausbau in drei Phasen umgesetzt (Phasen 13–15, siehe unten): Die 3D-Karte ist die einzige Ansicht, Säulenhöhe = Beherrschung, dazu Sicherung als Datei, Karteikarte, Reihenfolge-Frage, Prüfung mit Termin, Suche. Noch **nicht committet** und **nicht auf dem iPhone getestet**. Als Nächstes: am PC und iPhone testen, committen, dann als Erstes eine Sicherung speichern.

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
- **Veröffentlichung:** [.github/workflows/pages.yml](.github/workflows/pages.yml) testet, baut und veröffentlicht bei jedem Push auf `main` nach <https://gfb-digital.github.io/Topos/> (Node 26, `npm ci` → `npm test` → `npm run build`)
- **Kein Aufblitzen der Farben beim Start:** Darstellung und Schriftgröße werden zusätzlich in `localStorage` (`leenli-appearance`) gespiegelt; ein kleines Skript in [index.html](index.html) setzt sie vor dem ersten Zeichnen
- **Handy im Querformat:** Wortgröße richtet sich auch nach der Höhe (`min(10vw, 9vh)`); bei niedriger Höhe scrollt die untere Leiste mit, statt Inhalt zu verdecken
- **iOS:** kein Kopiermenü bei langem Druck auf das Wort (`-webkit-touch-callout: none`)
- **Geprüft:** 360 px (hell/dunkel), 390 px, iPad 820 px, PC 1280 px, Querformat 844×390 – kein seitliches Scrollen, Fokus überall auf ≤ 0,02 px genau
- **README** komplett: Installation auf dem Handy, Claude-Workflow, Kursformat, Speed-Reader-Regeln, Entwicklung, GitHub Pages, Projektaufbau, Capacitor. Die Vorlage wurde per Skript aus `claude-template.ts` eingesetzt (bei Änderungen der Vorlage README mit aktualisieren).
- `@types/node` auf ^26 angehoben; `npm audit`: App-Code 0 Warnungen, die 6 Warnungen in workbox-build bestehen weiter (keine korrigierte Version verfügbar)

### Phasen 7–12 – Wissenskarte, Kacheln, Wiederholung (12.11.2026, Vorbild: Screenshots von Kinnu)
Der Nutzer hat gebeten, diese Phasen ohne Pause nacheinander umzusetzen. Übernommen wurde die Lern-Mechanik, nicht Kinnus Erscheinungsbild.

- **Phase 7 – Kursformat:** Kurs → Kacheln (`tiles`) mit `intro`, `steps`, `recap`; neue Fragetypen `binary` und `cloze`; Bilder (`image`), Kursfarben (`color`, siehe [colors.ts](src/lib/colors.ts)), **fett** im Text. Alte Kurse (`lessons`) und alter Fortschritt (`progress`) werden beim Start automatisch umgewandelt ([store.ts](src/lib/store.ts)). Beispielkurs und Claude-Vorlage neu.
- **Phase 8 – Kachel-Ablauf:** [SessionScreen.tsx](src/screens/SessionScreen.tsx) + [components/session/](src/components/session/). Falsche Antworten und „Weiß ich nicht“ werden hinten angehängt, bis sie sitzen ([session.ts](src/lib/session.ts)).
- **Phase 9 – Karte:** [HexMap.tsx](src/components/map/HexMap.tsx) (SVG, Ziehen, Zwei-Finger-/Mausrad-Zoom, Doppeltippen, Detailstufen) und [CourseSheet.tsx](src/components/map/CourseSheet.tsx). Geometrie in [hexmap.ts](src/lib/hexmap.ts).
- **Phase 10 – Wiederholung:** [srs.ts](src/lib/srs.ts) (Vergessenskurve wie bei FSRS, Stabilität wächst mit richtigen Antworten zur rechten Zeit). „Wissen stärken“ beliebig oft ([smart.ts](src/lib/smart.ts)). Kachel zurücksetzen.
- **Phase 11 – Wissensbank und Lerntage:** [KnowledgeScreen.tsx](src/screens/KnowledgeScreen.tsx), [streak.ts](src/lib/streak.ts).
- **Phase 12 – „Schlau lernen“** (`planSmartSession`), Feinschliff, README.
- Entfernt: HomeScreen, CourseScreen, LessonScreen und die alten Lektions-Komponenten.
- Tests: 92 (orp, importer, srs, learning, hexmap). Im Browser geprüft: kompletter Kachel-Ablauf, Übernahme alter Daten, 360 px hell/dunkel, 1280 px.

### Überarbeitung nach dem ersten iPhone-Test (12.11.2026)
- **Achtecke statt Sechsecke** überall (Wunsch des Nutzers, „etwas Eigenes“): Karte, Fortschrittsleiste, Abzeichen, Symbole (`oct`/`octFilled`), CSS-Form `--oct`.
- **Karte neu** ([WorldMap.tsx](src/components/map/WorldMap.tsx), Geometrie [maplayout.ts](src/lib/maplayout.ts) + Tests): Kacheln zeilenweise im Raster, Umrandung in Kursfarbe (ausgewählt: hell), Fläche mit zarten Achteck-Umrissen, Kursname als Reiter oben. Keine Emojis und keine Titel mehr in Kacheln.
- **Detailstufen:** weit weg nur Flächen; mittel: gelernte Kacheln in Kursfarbe mit mittigem Häkchen; nah: **eine Punktreihe je Leseseite, ein Punkt je Frage** (gelernte Kacheln hell, nächste Kachel umrandet, neue dunkel).
- **Untere Leiste symmetrisch:** zwei gleich große runde Knöpfe (Wissensbank mit Ebenen-Symbol, Lerntage mit Kalender und Zähler), „Schlau lernen“ genau in der Mitte.
- **Kopf wie im Vorbild:** großer fetter Schriftzug, runde graue Knöpfe untereinander.
- **Kursblatt** in der Kursfarbe mit weißer Schrift und weißem Hauptknopf; Kachelliste mit Nummern statt Emojis.
- **Leseseite** als Karte mit zentrierter Kopfzeile (Kurs, Kachel, „Seite x / y“); **Fragekarte** mit „Weiß ich nicht“ und „Weiter“ in der Karte und einer Fußzeile (Fragetyp, Kachel).
- Die Screenshots des Nutzers liegen nur in der temporären Sitzung; im öffentlichen Repo sollen keine Kinnu-Screenshots landen.

### Zweite Überarbeitung nach dem iPhone-Test (12.11.2026)
- **Achtecke greifen wie Waben ineinander** statt im Quadratraster: Zeilen um eine halbe Zelle versetzt und so eng, dass die schrägen Kanten aufeinanderliegen (Zeilenabstand = Breite × (√2 − ½)). Jede Zelle hat sechs Nachbarn, gerechnet wird mit axialen Koordinaten wie bei Sechseck-Karten ([maplayout.ts](src/lib/maplayout.ts)).
- **Kachelgruppen rundlich** (z. B. 7 Kacheln = 2-3-2), gefüllt zeilenweise in Lernreihenfolge. Kurse werden so platziert, dass zwischen den Gebieten immer eine Zelle frei bleibt.
- **Keine Rechtecke mehr:** Gebiet, dunkler Rand und Umrandungslinie bestehen aus vergrößerten Achtecken (je Ebene ein SVG-Pfad), der Rand folgt also der Form der Kacheln. Zarte Umrisse nur noch auf einem Teil des Gebiets.
- **In den Kacheln** (nah): Kreis = Leseseite, Schild = Frage, nebeneinander in einer Reihe; bei vielen Zeichen mehrere Reihen und kleiner (`markRows`). Fragen auch in der Leiste beim Lernen, im Wiederholungs-Zähler und in der Fragekarte als Schild.
- **Untere Leiste kleiner und flacher:** runde Knöpfe und „Schlau lernen“ gleich hoch (52 px, `--bar-h`), Pille mit ganz runden Enden, dezenter Schatten statt Leuchten.
- **Wissensbank-Symbol:** eigener Kopf im Profil, der sich hinten oben in Punkte auflöst (im Stil des Vorbilds, nicht kopiert).
- **Heller Modus:** gelernte Kacheln kräftiger (`--map-done`), damit sie sich von neuen abheben.
- Tests: 100 (maplayout neu: Nachbarn berühren sich, Gruppen zusammenhängend und rundlich, Abstand zwischen Kursen, Zeichenreihen).

### Dritte Überarbeitung: Sechsecke ohne Umrandung (12.11.2026)
- **Wunsch des Nutzers:** zurück zu Sechsecken, genau aneinanderliegend, und die doppelte Umrandung (Linie in Kursfarbe + dunkler Rand) weg.
- **Sechsecke mit Spitze oben**, Zeilenabstand = Breite × √3/2 → lückenlos. Die Logik (axiale Koordinaten, rundliche Gruppen, Platzierung, Gebiet) blieb gleich, nur die Form wechselte ([maplayout.ts](src/lib/maplayout.ts): `hexagonPoints`, `hexagonsPath`, `CELL_HEIGHT`).
- **Kacheln in voller Größe**, getrennt nur durch eine feine Fuge (`--seam`). Neue Kacheln sind dunkler als das Gebiet (`--tile-new`), damit man sie ohne Umrandung erkennt. Die nächste Kachel bekommt einen Ring in Kursfarbe, der über den Nachbarn liegt.
- **Zarte Umrisse** im Gebiet nur noch abseits der Kacheln, damit sie nicht wie Kacheln wirken. Kursname sitzt knapp über der obersten Reihe.
- **Auch sonst Sechsecke** statt Achtecke: Lerntage-Stempel, Kachel-Nummern im Kursblatt, Abzeichen in Zusammenfassung und Wissensbank (Icons `hex`/`hexFilled`, CSS-Form `--hex`).

### Schrift Google Sans (12.11.2026)
- **Wunsch des Nutzers:** Lesetext und Fragen in Google Sans. Gilt für Leseseiten (Text und Überschrift), Fragen, Antworten, Rückmeldung, „Du lernst …“/Rückblick und das Wort im Speed-Reader. Überschriften, Karte und Bedienelemente behalten ihre Schriften.
- **In der App gespeichert** statt von Google geladen: [src/assets/fonts/](src/assets/fonts/) (nur Latein und Latein-Erweiterung, normal und kursiv, variable Strichstärke 400–700, zusammen rund 118 KB), eingebunden in [fonts.css](src/styles/fonts.css), Variable `--font-text` in global.css. Der Service Worker speichert die Dateien vorab (`woff2` in `globPatterns`), also auch offline und später in Capacitor.
- **Lizenz:** SIL Open Font License 1.1, Lizenztext liegt daneben ([OFL.txt](src/assets/fonts/OFL.txt)). Quelle: npm-Paket `@fontsource-variable/google-sans` 5.3.2 (nur die Dateien kopiert, keine neue Abhängigkeit).
- **Speed-Reader** misst die Wortbreite nach dem Laden der Schrift einmal neu (`document.fonts.ready` in [RsvpWord.tsx](src/components/speed/RsvpWord.tsx)). Gemessen: Fokus bei allen 90 Wörtern auf 0,01 px genau, nichts abgeschnitten (hell/dunkel, 390 px).

### Umbenennung in Locus (13.11.2026)
- **Sichtbarer Name** jetzt „Locus“: Startseite, Fenstertitel, Name auf dem Home-Bildschirm (Manifest, `apple-mobile-web-app-title`), Claude-Vorlage, Beispielkurs, README.
- **Startseite:** Untertitel „Dein Ort des Wissens“ statt „Deine Wissenskarte“; Schriftzug kleiner in der Ecke oben links (2 rem statt 3,2 rem, Untertitel 0,9 rem).
- **Bewusst nicht umbenannt:** Datenbank `leenli`, `localStorage`-Schlüssel `leenli-appearance`, Bilder-Cache `leenli-bilder`, die Kennung im Browser-Verlauf und `package.json`. Sonst wären gespeicherte Kurse, Fortschritt und Einstellungen weg. Der Ordner heißt weiter `Leenli-`. Das GitHub-Repo heißt seit 13.11.2026 `GFB-Digital/Locus`, die App liegt jetzt unter <https://gfb-digital.github.io/Locus/> (alte Adresse `…/Leenli-/` gibt 404). Im Browser bleiben gespeicherte Daten erhalten (gleiche Domain); eine auf dem Home-Bildschirm installierte App muss von der neuen Adresse neu hinzugefügt werden.
- Das App-Icon (rotes „L“) passt weiter.

### 3D-Karte als Testmodus (13.11.2026, Vorbild: Basaltsäulen, 3D-Mindmaps)
- **Ziel:** sich optisch von Kinnu absetzen. Kacheln als **Sechseck-Säulen**, Höhe = Anzahl Seiten + Fragen der Kachel (`columnHeight`: 4 + 9 je Schritt, höchstens 130).
- **Einschalten:** Einstellungen → Darstellung → „3D-Karte (Test)“ (`settings.map3d`, Standard aus). Die flache Karte bleibt unverändert.
- **Feste Neigung 35°, dafür drehbar** (Wunsch des Nutzers): zwei Finger drehen (erst ab 12° Drehung, damit Zoomen nicht mitdreht), am PC Umschalt + Mausrad. Ein Kompass-Knopf unter den Kopf-Knöpfen zeigt nach Norden und dreht zurück.
- **Technik:** kein echtes 3D und keine Bibliothek, sondern eine Projektion im bestehenden SVG ([map3d.ts](src/lib/map3d.ts), Tests in [map3d.test.ts](src/lib/map3d.test.ts)). Boden und Deckel werden per SVG-Transform gedreht und gestaucht, sichtbare Seiten (2–3 je Säule) berechnet, Säulen von hinten nach vorne gezeichnet. Licht von links: linke Seiten hell, rechte dunkel, weicher Schatten nach rechts.
- **Geprüft** in Firefox (390 × 844, hell und dunkel, mit den drei Studienkursen, gedreht): Verdeckung, Zeichen auf den Deckeln, Kursnamen, Kompass. Tests: 108.
- **Offen:** Im Dunkelmodus sind die Seiten sehr dunkel und schwer zu unterscheiden. Tempo beim Drehen auf dem iPhone noch nicht gemessen (beim Drehen wird jede Säule neu berechnet). Schatten fallen am Gebietsrand auch auf den Hintergrund.

### Umbenennung in ΤΟΠΟΣ und neues Logo (13.11.2026)
- **Name:** sichtbar überall **ΤΟΠΟΣ** in griechischen Großbuchstaben (Fenstertitel, Name unter dem Icon im Manifest und `apple-mobile-web-app-title`, Startseite, Claude-Vorlage, Beispielkurs, README). „Topos“ in lateinischen Buchstaben nur in `package.json`, Kommentaren und Konsolen-Meldungen. Interne Schlüssel bleiben `leenli…`.
- **Schriftzug auf der Startseite** wie im Logo: dünn (400) und weit gesperrt (0,16 em) statt fett.
- **Logo:** Original mit Schriftzug liegt in [design/logo.png](design/logo.png) (1024 × 1024) und steht oben im README.
- **App-Icons** erzeugt [scripts/generate-icons.mjs](scripts/generate-icons.mjs) jetzt aus dem Logo (eigener kleiner PNG-Decoder, keine Bibliothek): Schriftzug entfernt (Verlauf darüber und darunter überblendet), Tempel mittig auf 84 % der Breite, Rand des grauen Verlaufs fortgesetzt. Maskable-Icon mit 68 %, damit der Tempel in der runden Android-Maske bleibt. Favicon 32 px mit 96 %.
- **Entfernt:** `public/favicon.svg` (altes rotes „L“); das Browser-Tab nutzt `icons/favicon-32.png`.
- **Größe:** Die Icons sind zusammen rund 270 KB (vorher wenige KB), weil das Logo ein fein verrauschtes Bild ist. PNG-Zeilenfilter brachten nur ~5 % und wurden deshalb nicht eingebaut.
- **Repo umbenannt:** `GFB-Digital/Locus` → `GFB-Digital/Topos` (per `gh repo rename`), Remote auf `https://github.com/GFB-Digital/Topos.git` umgestellt. Die App liegt jetzt unter <https://gfb-digital.github.io/Topos/>, `…/Locus/` gibt 404. Auf den Geräten muss die App von der neuen Adresse neu installiert werden. Der Ordner heißt seit 13.11.2026 `C:\Users\PCUser\Topos` (vorher `Locus`, davor `Leenli-`).
- **Geprüft:** `npm run build` und `npm test` (108 Tests) fehlerfrei; gebautes Manifest heißt ΤΟΠΟΣ (echte griechische Buchstaben, keine lateinischen T/O).

### Phasen 13–15 – 3D-Welt, Lernsystem, Ausbau (13.11.2026)
Auftrag des Nutzers: erst Analyse und Plan (siehe PLAN.md, „Erweiterung 13.11.2026“), nach Freigabe alle Phasen ohne Pause. Seine drei Entscheidungen: Höhe zeigt, wie fest etwas sitzt (sinkt nicht von selbst); flacher Start ist in Ordnung; Sicherung direkt nach Phase 1.

**Phase 13 – 3D-Welt**
- **Nur noch 3D:** flache Karte, Umschalter und `settings.map3d` entfernt. [WorldMap.tsx](src/components/map/WorldMap.tsx) hat nur noch die Säulen-Ebene. Die doppelte CSS-Klasse `.map-side` ist aufgelöst (Säulenseiten heißen `.map-col-side`).
- **Blaues Gebiet entfernt** (`territory`, `decor`, `hexagonsPath`). Den Abstand regelt jetzt `COURSE_GAP` = 3 freie Zellen zwischen zwei Kursen. Schatten sind kürzer und heller.
- **Organische Anordnung:** `growCells(seed, n)` in [maplayout.ts](src/lib/maplayout.ts) lässt jede Kursgruppe Zelle für Zelle wachsen – zufällig, aber mit festem Startwert aus der Kurs-ID. Gleicher Kurs = gleiche Form; neue Kacheln hängen sich an, ohne alte zu verschieben; fast eingeschlossene Zellen werden zuerst gefüllt (keine Löcher). Die Karte sieht dadurch **einmalig anders** aus als vorher.
- **Säulenhöhe = Beherrschung:** neue Datei [mastery.ts](src/lib/mastery.ts). Wert einer Frage = ihre Stelle auf der Skala der Gedächtnis-Prognose direkt nach der letzten Wiederholung (also aus der Stabilität, kein zweites System). Kachel = Mittel ihrer Fragen, ungelernt = 0. Höhe: `12 + 108 × m^0,7` (`HEIGHT` in [map3d.ts](src/lib/map3d.ts)) → 0 % = 12, 10 % = 34, 25 % = 53, 50 % = 78, 75 % = 100, 90 % = 112, 100 % = 120. Frisch gelernt ≈ 16 % ≈ Höhe 41.
- **Fällig = verblasst:** Kacheln mit fälligen Fragen behalten ihre Höhe, die Säule wird blasser (`.map-tile--due`), das Häkchen verschwindet.
- **Säulen wachsen sichtbar:** Nach einer Sitzung fahren geänderte Säulen in 0,8 s auf die neue Höhe (`useGrowingHeights`; die zuletzt gezeigten Höhen merkt sich ein Modul-Speicher, weil die Karte während einer Sitzung nicht existiert).
- **Stufenlose Zeichen:** keine drei harten Detailstufen mehr. Die Karte setzt zwei CSS-Variablen (`--marks`, `--check`) aus der Zellgröße; Häkchen, heller Deckel und Zeichen blenden damit weich ein und aus. Eingehängt werden die Zeichen schon etwas früher, als sie sichtbar werden.
- **Kamera:** Nachgleiten nach dem Loslassen, die Karte bleibt immer mindestens 90 px im Bild (`keepInView`), herauszoomen höchstens auf die halbe eingepasste Größe, Drehen am PC mit rechter Maustaste/Umschalt + Ziehen, Tasten (Pfeile, + / −, Q / E, N).
- **Kursnamen:** über der Gruppe, sonst darunter; Vorfahrt haben der gewählte Kurs und die größeren Kurse; wer keinen Platz hat, blendet aus (`placeLabels`). Weit herausgezoomt sind die Namen kleiner. **Bekannt:** In der Gesamtübersicht auf dem Handy ist der Name des kleinen Beispielkurses deshalb ausgeblendet, bis man hineinzoomt.
- **Gemessen** (Firefox am PC, 89 Säulen, gebaute App): Drehen und Zoomen je 16,5–17 ms pro Bild, also 60 Bilder/s. Im Entwicklungsmodus ist Drehen langsamer (23 ms), das liegt an React im Dev-Modus.

**Phase 14 – Lernsystem**
- **Sicherung als Datei:** [backup.ts](src/lib/backup.ts) (Format `topos-sicherung`, Version 1: importierte Kurse, Lernstand, Einstellungen), [files.ts](src/lib/files.ts) (Handy: Teilen-Menü, PC: Download). Oberfläche in „Inhalte“; Einspielen zeigt vorher, was drinsteckt, und ersetzt alles. Hinweis, wenn die letzte Sicherung älter als 14 Tage ist. Eine Sicherung im Kurs-Importfeld wird erkannt.
- **Abgebrochene Runden zählen:** Beim Verlassen einer Wiederholungsrunde oder Prüfung werden die schon gegebenen Antworten gespeichert (ohne Lerntag-Stempel). Nebenbei behoben: Eine leere Runde gab früher einen Stempel.
- **Karteikarte** (`recall`): Frage, selbst überlegen, aufdecken, „Gewusst / Nicht gewusst“. Erster Fragetyp mit freiem Abrufen.
- **Ratekorrektur:** `reviewCard(…, guess)` – bei richtig beantworteten Fragen mit Ratechance wächst der Abstand langsamer (2 Antworten: −25 % Zuwachs, 4 Antworten: −12,5 %, Karteikarte/Reihenfolge: keine Kürzung).
- **Schwierige Fragen:** Wissensbank zeigt Fragen mit mindestens 2 Fehlern (`hardCards`), antippen = Kachel nochmal lesen, dazu „Schwierige Fragen üben“.
- **Fragen ohne Gedächtnis-Stand** in gelernten Kacheln (neu dazugekommen oder Text geändert) gelten jetzt als sofort fällig, statt nie mehr dranzukommen (`learnedCards`).

**Phase 15 – Ausbau**
- **Prüfung:** 20 gemischte Fragen aus allen Kacheln eines Kurses (`pickForExam`), keine Rückmeldung zwischendurch, am Ende Ergebnis je Kachel. Antworten zählen für die Wiederholung, aber nur bei gelernten Kacheln. Das letzte Ergebnis steht im Kursblatt.
- **Prüfungstermin je Kurs** (`learn.examDates`): Tagespensum mit 3 Tagen Reserve; „Schlau lernen“ nimmt den Kurs mit der nächsten Prüfung zuerst; in den 7 Tagen davor ist jede Frage einmal fällig (`dueCards`).
- **Reihenfolge-Frage** (`order`): Einträge in der richtigen Reihenfolge antippen. Im Kurs stehen sie richtig, die App mischt.
- **Fälligkeits-Vorschau** in der Wissensbank (heute, morgen, 7 Tage).
- **Themengebiete:** Kursfeld `group`; Kurse mit gleichem Gebiet suchen ihren Platz rund um den ersten Kurs des Gebiets.
- **Suche:** [search.ts](src/lib/search.ts), [SearchScreen.tsx](src/screens/SearchScreen.tsx), Lupe oben rechts auf der Karte.
- **Import-Hinweise** (blockieren nicht): Seiten über 160 Wörter, Kacheln ohne Frage.
- **Beispielkurs** hat in Kachel 2 je eine Reihenfolge-Frage und eine Karteikarte. **Claude-Vorlage** und README kennen die neuen Typen und `group`. Das README wurde per Skript aus `claude-template.ts` aktualisiert.
- **Geprüft:** `npm test` 147 Tests, `npm run build` fehlerfrei. Im Browser (Firefox, 390 px hell/dunkel, 360 px, 1280 px, mit den drei Studienkursen und erfundenem Lernstand): Karte in allen Zoomstufen und gedreht; eine Kachel komplett gelernt (Reihenfolge erst falsch, dann richtig; Karteikarte), Säule wuchs von 7 auf 20 Bildschirm-px; Prüfung mit Termin; Wissensbank; Abbruch einer Runde (2 Antworten gespeichert); Suche; Sicherung gespeichert, alles gelöscht, eingespielt – Lernstand identisch. Keine Fehler in der Konsole, kein seitliches Scrollen.
- **Nicht geprüft:** echtes iPhone (Tempo beim Drehen, Teilen-Menü der Sicherung, Datumsfeld im Kursblatt), Zwei-Finger-Gesten (im Test nur Maus und Mausrad).

## Entscheidungen und Abweichungen vom Plan
- **Säulenhöhe (entschieden 13.11.2026):** zeigt, wie fest das Wissen sitzt, nicht den Umfang der Kachel und nicht den Tagesstand. Sie sinkt nur nach Fehlern. Folge: Ohne Lernstand ist die Welt flach.
- **Sicherung ersetzt, sie mischt nicht:** Einspielen überschreibt Kurse, Lernstand und Einstellungen des Geräts (nach Rückfrage). Zwei Geräte lassen sich damit nicht zusammenführen – das wäre Synchronisierung, und die ist laut Plan nicht gewollt.
- **Alte Gedächtnis-Stände bleiben liegen:** Ändert sich ein Fragetext, bleibt der alte Stand im Speicher (unsichtbar, winzig). Bewusst nicht automatisch gelöscht: Ein versehentlich importierter Teilkurs mit gleicher ID würde sonst Lernstand vernichten.
- **Selbstbewertung bei Karteikarten** ist Vertrauenssache. Dafür gibt es bei ihnen keine Ratekorrektur.
- **Kein Technologiewechsel für die Karte:** weiter SVG mit eigener Projektion, keine 3D-Bibliothek. Reicht laut Messung für rund 90 Säulen mit 60 Bildern/s am PC. Falls das iPhone ruckelt: zuerst Säulen außerhalb des Bildes weglassen, dann Canvas.
- **Eigene Studienkurse (12.11.2026):** Die Kurse aus den Vorlesungen (ABWL, Fertigungstechnik, Konstruktion) entstehen in `kurse/`. Der Ordner ist ein eigenes **privates** Repo (`GFB-Digital/Topos-Kurse`, bis 13.11.2026 `Leenli-Kurse`) und hier per `.gitignore` ausgeschlossen, weil er urheberrechtlich geschützte Vorlesungsinhalte enthält. Die App selbst bleibt unverändert: Kurse kommen über „Inhalte → Datei wählen“ hinein. `kurse/werkzeuge/bauen.mjs` prüft jeden Kurs mit dem Importer aus `src/lib/importer.ts`.
- **Updates:** keine automatische Aktualisierung, sondern ein Hinweis „Neue Version verfügbar → Aktualisieren“, damit eine laufende Lektion nicht verloren geht. Seit 13.11.2026 sucht die App auch beim Zurückholen aus dem Hintergrund nach Updates (`visibilitychange` → `registration.update()` in [pwa.ts](src/lib/pwa.ts)), weil iOS sonst nur bei einem echten Neustart prüft.
- **Alte Adressen `…/Leenli-/` und `…/Locus/`** geben seit den Umbenennungen 404. Dort installierte Home-Bildschirm-Apps bekommen nie wieder Updates und müssen von `…/Topos/` neu hinzugefügt werden (Lernstand geht dabei vermutlich verloren, iOS trennt den Speicher je Home-Bildschirm-App).
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

- **Wiederholung:** Start-Abstand 3 Tage (auf Anhieb richtig) bzw. 1 Tag. Richtig → Stabilität × (1 + (ease − 1) × Zeitfaktor); sofortiges Wiederholen bringt kaum Zuwachs, schadet aber nicht. Falsch → Stabilität × 0,3, mindestens ½ Tag. „Gefährdet“ heißt: Erinnerungswahrscheinlichkeit unter 90 %.
- **Fragen-Schlüssel:** Der Lernstand einer Frage hängt an einem Fingerabdruck ihres Textes (`cardKey` in model.ts). Ändert sich der Fragetext bei einem Re-Import, gilt sie als neue Frage.
- **Gewertet wird nur der erste Versuch** einer Frage; angehängte Wiederholungen dienen dem Festigen.
- **Lerntage:** Stempel nur für abgeschlossene Kacheln oder Wiederholungsrunden, nicht fürs reine Nachlesen. „Fortschritt zurücksetzen“ behält Lerntage und Lernzeit.
- **Eigenes Design statt Kopie:** Achteck-Stempel statt Kraniche, Indigo-Akzent, Kursfarben für Karte, Fragekarten und Buttons in der Sitzung; Dunkelmodus in neutralem Anthrazit (`#212125`). Rot bleibt dem Fokusbuchstaben vorbehalten (falsch = Orange).
- **Neue Styles** stehen in [learning.css](src/styles/learning.css), die Grundlagen weiter in global.css.

## Als Nächstes
- **Auf dem iPhone testen:** Drehen und Zoomen mit zwei Fingern (flüssig?), Nachgleiten, Sicherung über das Teilen-Menü, Datumsfeld für den Prüfungstermin, Reihenfolge-Frage und Karteikarte
- **Kurse erweitern:** Claude mit der neuen Vorlage bitten, in die Studienkurse Karteikarten und Reihenfolge-Fragen einzubauen (IDs beibehalten) und ihnen bei Bedarf ein `group` zu geben
- Rückmeldungen einarbeiten, v. a. zur Optik der Säulen (Farben, Schatten, Höhe) und zu den Kursnamen in der Gesamtübersicht
- Mögliche Ideen für später: Säulen außerhalb des Bildes nicht zeichnen (nur falls das iPhone ruckelt), kleiner Korrektur-Editor für einzelne Fragen, Lückentext zum Eintippen, Startbildschirme für iOS

## Offene Punkte
- **Abweichung von PLAN.md:** Der Plan sieht nur Systemschriften vor. Für Lesetext und Fragen gibt es jetzt Google Sans, wegen der Offline-Pflicht aber in der App gespeichert, nicht von einem CDN.
- **Hosting:** GitHub Pages ist eingeschaltet, jeder Push auf main veröffentlicht automatisch.
- **Abweichung von PLAN.md:** Der Plan nennt für den Fokusbuchstaben „Mitte“. Auf Wunsch des Nutzers (Video-Vorbild) steht er jetzt bei 38 %.
