# Leenli – Fortschritt

Hier steht, was schon erledigt ist, welche Entscheidungen getroffen wurden und was als Nächstes kommt.
Wird nach jeder Phase aktualisiert. Den eigentlichen Auftrag beschreibt [PLAN.md](PLAN.md).

**Stand:** 11.11.2026 – Phase 2 abgeschlossen, als Nächstes Phase 3.

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

## Entscheidungen und Abweichungen vom Plan
- **Updates:** keine automatische Aktualisierung, sondern ein Hinweis „Neue Version verfügbar → Aktualisieren“, damit eine laufende Lektion nicht verloren geht.
- **Relative Pfade** (`base: './'`): Die App läuft in jedem Unterordner (z. B. GitHub Pages) und unverändert in Capacitor.
- **Farben:** Rot ist nur für den Fokusbuchstaben da. Bei falsch beantworteten Fragen kommt Bernstein/Orange (`--wrong`) zum Einsatz, für richtige Grün (`--correct`).
- **Zeilenenden:** `.gitattributes` erzwingt LF, damit Git keine CRLF-Warnungen mehr zeigt.
- **Kurs-IDs:** Ein importierter Kurs mit derselben ID wie der Beispielkurs ersetzt diesen. In Phase 5 klären, ob das so bleiben soll.
- **npm audit:** Die 6 Warnungen betreffen nur Build-Werkzeuge (workbox-build), der App-Code selbst hat 0. **Nicht** `npm audit fix --force` ausführen: Das würde vite-plugin-pwa auf 1.1.0 ohne Vite-8-Unterstützung zurückstufen.
- **Darstellung:** Umschalter „Automatisch | Hell | Dunkel“ kommt in Phase 5 (Wunsch vom 11.11.2026, in PLAN.md ergänzt).

## Nächste Phase: 3 – Lektion mit normalem Lesemodus und Fragen
- [src/screens/LessonScreen.tsx](src/screens/LessonScreen.tsx) ersetzen, dabei **Test-Button „Als erledigt speichern“ entfernen**
- Oben Fortschrittsbalken und Schließen-Button
- Bei jedem Textschritt Umschalter „Normal | Speed“, Standard aus den Einstellungen; „Speed“ zeigt bis Phase 4 einen Platzhalter
- Normaler Modus: Serifenschrift, gute Zeilenlänge und Zeilenhöhe, Button „Weiter“
- Fragen: Optionen gemischt; Antwort antippen → sofort richtig/falsch farbig, Erklärung einblenden, dann „Weiter“
- Am Ende: Zusammenfassung „X von Y richtig“, Ergebnis speichern, zurück zum Kurs

## Danach
- **Phase 4 – Speed-Reader:** Logik in `src/lib/orp.ts` als reine Funktionen, dazu Tests (Vitest einrichten)
- **Phase 5 – Import und Einstellungen:** inklusive Darstellung; beim ersten Import `navigator.storage.persist()` anfragen, damit der Browser die Daten nicht löscht
- **Phase 6 – Feinschliff:** Design, iPhone-Größe, README; `npm audit` erneut prüfen

## Offene Punkte
- **Hosting:** Damit die App auf dem iPhone installierbar und offline nutzbar ist, muss sie per HTTPS erreichbar sein (z. B. GitHub Pages). In Phase 6 klären.
