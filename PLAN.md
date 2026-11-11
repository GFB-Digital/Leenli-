# Leenli – Projektplan

Du baust mit mir meine Lern-App „Leenli“. Ich bin Anfänger, arbeite auf Windows in VS Code im Ordner C:\Users\PCUser\Leenli- (schon mit GitHub verbunden: GFB-Digital/Leenli-, Branch main). Node.js, Git und VS Code sind installiert. Erkläre Terminal-Befehle kurz und für Windows (PowerShell).

## Ziel
Eine Lern-App wie Kinnu: Lektionen bestehen aus kurzen Leseabschnitten, nach jedem Abschnitt kommt eine Frage. Besonderheit: Jeder Leseabschnitt kann normal ODER mit einem Speed-Reader gelesen werden (wie spreeder.com, aber besser). Ich will beliebig viele eigene Inhalte importieren, die ich mir von Claude als JSON erstellen lasse.

Läuft auf PC, iPhone und iPad als installierbare Web-App (PWA, „Zum Home-Bildschirm“). Alles muss so gebaut sein, dass ich später ohne Umbau mit Capacitor eine echte App für App Store und Play Store daraus machen kann. Keine Synchronisierung, kein Login, kein Server: alles lokal und offline.

## Technik
- React + TypeScript + Vite
- vite-plugin-pwa (Manifest, Service Worker, offline, Icons 192/512/maskable, apple-touch-icon)
- Speicherung lokal in IndexedDB (kleiner eigener Wrapper oder idb-keyval, keine schweren Abhängigkeiten)
- Kein Router-Paket nötig, einfache Ansichts-Steuerung per State reicht
- Keine externen Schriften oder CDNs (muss offline gehen), Systemschriften verwenden
- Capacitor-tauglich: Mobile first, Touch statt Hover, große Tippflächen, Safe Areas (env(safe-area-inset-*)), viewport-fit=cover, keine reinen Browser-APIs, die in einer App-Hülle fehlen
- Script `npm run dev:handy` (vite --host), damit ich die App im selben WLAN auf dem iPhone testen kann
- Gesamte Oberfläche auf Deutsch

## Datenformat (JSON)
Kurs → Lektionen → Schritte. Schritt-Typen:
- `{ "type": "text", "title"?: string, "text": string }` – Absätze mit \n\n getrennt
- `{ "type": "choice", "question": string, "options": string[], "answer": number, "explanation"?: string }` – answer = Index der richtigen Option; die App mischt die Optionen beim Anzeigen
- `{ "type": "truefalse", "statement": string, "answer": boolean, "explanation"?: string }`

Kurs: `{ "id", "title", "emoji"?, "description"?, "lessons": [{ "id", "title", "steps": [...] }] }`

Fehlende Lektions-IDs automatisch ergänzen. Beim Import gründlich prüfen und verständliche deutsche Fehlermeldungen zeigen (welcher Kurs, welche Lektion, welcher Schritt).

## Speed-Reader (wichtigstes Feature, sehr sorgfältig umsetzen)
- Zeigt ein Wort nach dem anderen an fester Stelle (RSVP).
- Pro Wort ist der Fokusbuchstabe (ORP) ROT. Regel nach Anzahl Buchstaben (Satzzeichen nicht mitzählen, aber anzeigen): 1 → 1. Buchstabe, 2–5 → 2., 6–9 → 3., 10–13 → 4., ab 14 → 5. Umlaute und Unicode korrekt behandeln (Array.from, \p{L}).
- Der rote Buchstabe steht IMMER exakt an derselben Bildschirmposition (Mitte): linker Wortteil rechtsbündig, rechter Teil linksbündig. Dünne Führungslinien oben und unten mit kleiner Markierung über dem Fokuspunkt.
- Lange Wörter (Deutsch!) dürfen nie abgeschnitten werden: Schriftgröße automatisch per ResizeObserver verkleinern.
- Timing: Grundzeit 60000/WPM. Satzende (.!?…) ×2,2, Komma/Doppelpunkt/Semikolon/Gedankenstrich ×1,5, Wörter >8 Buchstaben +0,3, >12 zusätzlich +0,3, Absatzende mindestens ×2,8. Die ersten 3 Wörter nach dem Start ×1,6 als Anlauf. Schließende Anführungszeichen hinter Satzzeichen berücksichtigen.
- Bedienung: Tippen auf das Wort = Start/Pause; Play/Pause-Button; „Satz zurück“ (springt an den Anfang des aktuellen bzw. vorherigen Satzes); Schieberegler für die Position im Text; Umschalter „Ganzen Text anzeigen“ zum Nachlesen; WPM-Regler 100–1000 in 25er-Schritten plus −/+; Anzeige „Wort X / Y“ und Restzeit; „Weiter“ wenn fertig, sonst „Überspringen“.
- Tastatur: Leertaste Start/Pause, ←/→ Wort zurück/vor, ↑/↓ Tempo, Enter = weiter wenn fertig.
- Gewähltes Tempo wird gespeichert.
- Diese Logik in eine eigene, testbare Datei (z. B. src/lib/orp.ts) mit reinen Funktionen.

## Lektionsablauf (wie Kinnu)
- Fortschrittsbalken oben, Schließen-Button.
- Bei jedem Textschritt Umschalter „Normal | Speed“; Standard kommt aus den Einstellungen.
- Normaler Modus: angenehme Lesetypografie (Serifenschrift aus System, gute Zeilenlänge und Zeilenhöhe), Button „Weiter“.
- Fragen: Antwort antippen → sofort richtig/falsch farblich zeigen, Erklärung einblenden, dann „Weiter“.
- Am Ende: Zusammenfassung (X von Y richtig), Fortschritt speichern, zurück zum Kurs.

## Bildschirme
1. Start: Liste der Kurse als Karten (Emoji, Titel, Beschreibung, Fortschritt „x/y Lektionen“), Zugang zu „Inhalte“ und „Einstellungen“.
2. Kurs: Lektionsliste mit Häkchen und Ergebnis für erledigte Lektionen.
3. Lektion (siehe oben).
4. Inhalte: JSON einfügen (auch mit ```json-Rahmen) oder .json-Datei wählen → importieren; Kurs oder Liste von Kursen; gleiche ID ersetzt den alten Kurs; importierte Kurse löschen; Button „Vorlage für Claude kopieren“ mit einem fertigen Prompt, der Kurse genau in diesem Format erzeugt.
5. Einstellungen: Standard-Lesemodus, Tempo, Schriftgröße, Darstellung (Automatisch | Hell | Dunkel, Standard: Automatisch), Fortschritt zurücksetzen (mit Bestätigung).

## Design
Ruhig, hochwertig, nicht nach Baukasten. Heller Papierton als Hintergrund, Akzentfarbe Indigo (#4b3fd1), Rot ist nur für den Fokusbuchstaben reserviert. Dunkelmodus automatisch über prefers-color-scheme. Farben als CSS-Variablen. Funktioniert ab 360 px Breite ohne seitliches Scrollen, auf dem iPad und am PC zentriert mit maximaler Breite.

## Beispielinhalt
Lege einen fest eingebauten Beispielkurs „Lernen lernen“ auf Deutsch an: 3 Lektionen (Vergessenskurve/Ebbinghaus und Abstandseffekt; Abrufen statt Wiederlesen/Testeffekt nach Roediger & Karpicke; Was beim Speed Reading passiert: Sakkaden, Fixationen, RSVP, Fokusbuchstabe, Verständnis sinkt bei hohem Tempo). Je 3 Abschnitte à 60–120 Wörter, nach jedem eine Frage. Nur gesicherte Fakten.

## Nicht machen
- Keine Inhalte von Kinnu oder anderen Apps übernehmen.
- Keine Synchronisierung, keine Konten, keine Analyse-Tools.
- Keine unnötigen Bibliotheken.

## Vorgehen
Arbeite in Phasen und halte nach jeder Phase an, damit ich teste:
1. Projektgerüst + PWA + Icons → ich starte `npm install` und `npm run dev`
2. Datenmodell, Speicher, Beispielkurs, Start- und Kursbildschirm
3. Lektion mit normalem Lesemodus und Fragen
4. Speed-Reader
5. Import-Bildschirm und Einstellungen
6. Feinschliff: Design, Dunkelmodus, Test auf iPhone-Größe, README (Installation, Inhaltsformat, Prompt-Vorlage, wie man später Capacitor ergänzt)

Nach jeder Phase: kurz sagen, was ich testen soll, und einen Commit mit sinnvoller Nachricht vorschlagen (git add, commit, push). Wenn etwas unklar ist, frag mich, bevor du großflächig umbaust.
