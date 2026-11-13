# ΤΟΠΟΣ

<img src="design/logo.png" alt="Logo von ΤΟΠΟΣ: weißer Tempel mit rotem Punkt im Giebel" width="220">

**ΤΟΠΟΣ** (Topos) ist griechisch und heißt „Ort“ – dein Ort des Wissens. Eine Lern-App in kurzen Häppchen. Deine Kurse liegen als **drehbare Wissenslandschaft aus Sechseck-Säulen** vor dir: Jeder Kurs ist eine Gruppe, jede Kachel eine kurze Lerneinheit aus Leseseiten und Fragen – und je fester ihr Wissen sitzt, desto höher ragt ihre Säule. Gelerntes wird danach in wachsenden Abständen wiederholt, damit es wirklich hängen bleibt. Jede Seite lässt sich normal lesen oder mit dem eingebauten **Speed-Reader** – ein Wort nach dem anderen, mit rotem Fokusbuchstaben.

- Läuft auf PC, iPhone, iPad und Android als installierbare Web-App (PWA)
- Funktioniert komplett offline – kein Server, kein Konto, keine Synchronisierung
- Eigene Kurse lässt du dir von Claude erstellen und importierst sie als JSON
- Alle Daten bleiben auf deinem Gerät

**App öffnen:** <https://gfb-digital.github.io/Topos/> (sobald GitHub Pages eingeschaltet ist, siehe unten)

---

## Inhalt

1. [Auf dem Handy installieren](#auf-dem-handy-installieren)
2. [So lernst du mit ΤΟΠΟΣ](#so-lernst-du-mit-τοπος)
3. [Sicherung](#sicherung)
4. [Eigene Kurse mit Claude erstellen](#eigene-kurse-mit-claude-erstellen)
5. [Das Kursformat](#das-kursformat)
6. [Der Speed-Reader](#der-speed-reader)
7. [Entwicklung am PC](#entwicklung-am-pc)
8. [Veröffentlichen auf GitHub Pages](#veröffentlichen-auf-github-pages)
9. [Projektaufbau](#projektaufbau)
10. [Später als echte App (Capacitor)](#später-als-echte-app-capacitor)

---

## Auf dem Handy installieren

| Gerät | So geht's |
| --- | --- |
| **iPhone / iPad** | Die App-Adresse in **Safari** öffnen → Teilen-Symbol (Quadrat mit Pfeil) → **„Zum Home-Bildschirm“** → „Hinzufügen“ |
| **Android** | In Chrome öffnen → Menü ⋮ → **„App installieren“** |
| **PC (Chrome/Edge)** | Rechts in der Adressleiste auf das Installieren-Symbol klicken |

Nach dem ersten Öffnen funktioniert ΤΟΠΟΣ auch ohne Internet. Gibt es eine neue Version, erscheint unten der Hinweis „Neue Version verfügbar → Aktualisieren“. Die App lädt nie ungefragt neu, damit keine laufende Kachel verloren geht.

> **Wichtig:** Deine Kurse und dein Fortschritt liegen nur auf dem jeweiligen Gerät. Wird die App vom Home-Bildschirm gelöscht, sind auch die Daten weg. Speichere deshalb regelmäßig eine **Sicherung** (Inhalte → „Sicherung speichern“) – damit holst du alles auf jedem Gerät zurück.

---

## So lernst du mit ΤΟΠΟΣ

**Die Wissenskarte (Startseite).** Jeder Kurs ist eine farbige Gruppe aus Sechseck-Säulen, eine Säule pro Kachel. Jede Gruppe ist anders gewachsen, bleibt aber immer gleich; kommen Kacheln dazu, docken sie an, ohne die alten zu verschieben.

**Die Höhe einer Säule zeigt, wie fest das Wissen sitzt** – nicht, wie viel in der Kachel steht:

| Zustand der Kachel | Säule |
| --- | --- |
| neu oder angefangen | flach |
| frisch gelernt | wächst sichtbar (etwa ein Drittel der vollen Höhe) |
| nach jeder richtigen Wiederholung | höher – volle Höhe, wenn das Wissen auf Jahre sitzt |
| nach einem Fehler | niedriger |
| Wiederholung fällig | gleich hoch, aber **verblasst**, bis du das Wissen wieder stärkst |

Nach einer Sitzung siehst du die betroffenen Säulen wachsen. Die Zeichen in einer Kachel (Kreis = Leseseite, Schild = Frage) blenden beim Hineinzoomen stufenlos ein.

| Aktion | Touch | PC |
| --- | --- | --- |
| Verschieben | ein Finger (gleitet kurz nach) | ziehen oder Pfeiltasten |
| Zoomen | zwei Finger, Doppeltippen | Mausrad, `+` / `−` |
| Drehen | zwei Finger drehen | rechte Maustaste ziehen, Umschalt + Mausrad oder `Q` / `E` |
| Zurück nach Norden | Kompass antippen | `N` |

**Suche** (Lupe oben rechts) durchsucht Kurstitel, Kacheln, Leseseiten und Fragen aller Kurse.

**Kurs antippen** öffnet das Kursblatt mit Anzahl der Kacheln, Fortschritt und Lernzeit, dazu „Kurs starten“ bzw. „Weiterlernen“. Tippst du eine Kachel an, kannst du sie lernen, nochmal lesen oder zurücksetzen.

**Eine Kachel** läuft so ab:

1. **Du lernst …** – zwei Leitfragen zum Aufdecken
2. **Seiten mit Fragen** – nach jeder Seite eine Frage. Die Leiste oben zeigt Kreise (Seiten) und Schilde (Fragen).
3. **Rückblick** – die Kernaussagen zum Aufdecken
4. **Falsch beantwortete Fragen** (auch „Weiß ich nicht“) werden hinten angehängt und kommen so lange wieder, bis sie sitzen. Oben rechts zeigt ein oranges Schild, wie viele noch offen sind.

**Fragetypen:** Auswahl, Entweder-oder (eine Antwort oben, eine unten – tippen oder wischen), Richtig/Falsch, Lückentext, **Reihenfolge** (Einträge in der richtigen Reihenfolge antippen) und **Karteikarte** (Antwort erst selbst überlegen, dann aufdecken und ehrlich bewerten – das festigt am stärksten, weil du frei abrufst statt wiederzuerkennen).

**Wiederholen (Spaced Repetition).** Nach einer Kachel bekommt jede ihrer Fragen einen Gedächtnis-Stand. ΤΟΠΟΣ rechnet aus, wann du sie voraussichtlich vergisst, und holt sie kurz vorher wieder. Richtig beantwortet → der Abstand wächst (Tage → Wochen → Monate). Falsch → er schrumpft deutlich. Die Kachel musst du dafür nicht noch einmal lesen. Bei Fragen, die man hätte raten können (zwei Antworten), wächst der Abstand etwas langsamer. Brichst du eine Runde ab, zählen die schon gegebenen Antworten trotzdem.

**Prüfung** (im Kursblatt ganz unten):

- **Prüfungstermin** eintragen → ΤΟΠΟΣ zeigt, wie viele Kacheln pro Tag nötig sind, damit vor der Prüfung noch drei Tage zum Wiederholen bleiben. „Schlau lernen“ nimmt dann zuerst den Kurs mit der nächsten Prüfung, und in der letzten Woche kommt jede Frage noch einmal dran.
- **Prüfung starten** → 20 gemischte Fragen aus allen Kacheln, ohne Rückmeldung zwischendurch. Am Ende siehst du das Ergebnis je Kachel, die schwächsten zuerst.

**Wissensbank** (Knopf unten links):

- **Dein Wissen:** jede gelernte Kachel als Kette von Punkten – gefüllt = sicher, Ring = droht vergessen zu werden
- **Wissen stärken:** so oft du willst, die schwächsten Fragen kommen zuerst
- **Vorschau:** wie viele Wiederholungen heute, morgen und in den nächsten sieben Tagen anstehen
- **Schwierige Fragen:** was schon mehrfach falsch war – zum Nachlesen oder gezielten Üben
- **Gerade am Lernen:** Fortschritt pro Kurs
- **Gedächtnis-Prognose:** wie lange du einen Kurs voraussichtlich noch weißt
- **Lerntage und Lernstatistik**

**Schlau lernen** (großer Knopf unten) startet automatisch das Sinnvollste: zuerst fällige Wiederholungen, dann eine angefangene Kachel, dann die nächste neue. Die Zahl am Knopf zeigt, wie viele Fragen gerade fällig sind.

**Lerntage** (Knopf unten rechts): Jeder Tag mit mindestens einer abgeschlossenen Kachel oder Wiederholungsrunde bekommt einen Stempel. Dazu gibt es Serie, Wochenleiste und Monatskalender.

---

## Sicherung

Unter **Inhalte → Sicherung**:

- **Sicherung speichern** legt eine Datei `topos-sicherung-JJJJ-MM-TT.json` an – mit deinen importierten Kursen, dem kompletten Lernstand (Kacheln, Wiederholungsstand jeder Frage, Lerntage, Prüfungstermine) und den Einstellungen. Auf dem Handy öffnet sich das Teilen-Menü (z. B. „In Dateien sichern“), am PC landet die Datei im Download-Ordner.
- **Sicherung einspielen** liest eine solche Datei wieder ein. Vorher zeigt ΤΟΠΟΣ, was darin steckt, und fragt nach – denn die Daten auf dem Gerät werden dadurch **ersetzt**.

So ziehst du auch von einem Gerät aufs andere um: am alten Gerät speichern, Datei übertragen, am neuen einspielen. Ist die letzte Sicherung älter als zwei Wochen, weist die App darauf hin.

---

## Eigene Kurse mit Claude erstellen

1. In ΤΟΠΟΣ **Inhalte** öffnen (Pfeil-Symbol oben rechts) → **„Vorlage kopieren“**
2. Bei Claude einfügen, Thema und Umfang eintragen, absenden
3. Claudes Antwort komplett kopieren – auch mit Text davor oder dem ```json-Rahmen, das entfernt ΤΟΠΟΣ selbst
4. In ΤΟΠΟΣ unter **Inhalte** einfügen → **„Importieren“** (oder eine `.json`-Datei wählen)

Findet ΤΟΠΟΣ Fehler, steht genau da, wo: zum Beispiel
„Kurs („Photosynthese“) › Kachel 2 › Schritt 3 (Frage): „answer“ ist 4, erlaubt sind aber nur 0 bis 3.“
Diese Meldung kannst du Claude einfach zurückgeben und um Korrektur bitten.

Dazu gibt es **Hinweise**, die den Import nicht verhindern: Seiten mit mehr als 160 Wörtern (kürzere lernen sich leichter) und Kacheln ohne Frage (die lassen sich nicht wiederholen).

### Kurse überarbeiten statt doppelt anlegen

Jeder Kurs hat eine **ID**. Daran erkennt ΤΟΠΟΣ „denselben“ Kurs.

- **Neuer Kurs:** Die Vorlage lässt Claude das heutige Datum in die ID schreiben (z. B. `photosynthese-20261112`). So überschneiden sich neue Kurse nie.
- **Verbesserter Kurs:** Bitte Claude, die IDs beizubehalten. Beim Import fragt ΤΟΠΟΣ dann:
  - **Ersetzen** – der alte Kurs wird ausgetauscht, dein Fortschritt bleibt für Kacheln mit gleicher ID erhalten.
  - **Als neuen Kurs hinzufügen** – der Kurs bekommt automatisch eine neue ID (bei gleichem Titel z. B. „Photosynthese (2)“).

Auch der eingebaute Beispielkurs „Lernen lernen“ lässt sich so ersetzen. Löschst du deine Version wieder, ist der Beispielkurs zurück.

### Die Vorlage

So sieht die Vorlage aus (in der App steht statt `JJJJMMTT` das heutige Datum):

<!-- VORLAGE:ANFANG -->
````text
Erstelle mir einen Lernkurs für meine Lern-App „ΤΟΠΟΣ“.

Thema: [HIER DEIN THEMA EINTRAGEN]
Umfang: [z. B. 6 Kacheln]

So ist ein Kurs aufgebaut:
- Ein Kurs besteht aus Kacheln. Jede Kachel ist eine kurze Lerneinheit zu einem Teilthema (z. B. beim Kurs „Das Gehirn“ eine Kachel pro Hirnregion). Ordne die Kacheln so, dass sie aufeinander aufbauen.
- Jede Kachel beginnt mit 2 Leitfragen („intro“): Was lernt man in dieser Kachel?
- Dann folgen 3 bis 4 Leseseiten. Nach jeder Seite kommt genau eine Frage zu genau dieser Seite. Am Ende dürfen noch ein bis zwei Fragen zur ganzen Kachel stehen.
- Jede Kachel endet mit einem Rückblick („recap“): 3 kurze Kernaussagen.

Inhalt:
- Sprache: Deutsch, lebendig und anschaulich, wie ein gutes Sachbuch.
- Jede Seite hat 80 bis 140 Wörter. Absätze innerhalb einer Seite trennst du mit \n\n.
- Erzähle Hintergründe: Wer hat etwas entdeckt, erfunden oder erforscht – wann, wie und warum? Beschreibe Experimente, Geschichten und konkrete Beispiele.
- Markiere 1 bis 2 Schlüsselbegriffe pro Seite mit **zwei Sternchen** (fett).
- Nur gesicherte Fakten, nichts erfinden. Bei Unsicherheit lieber weglassen.
- Fragen prüfen das Verständnis, nicht den genauen Wortlaut. Jede Frage bekommt eine kurze Erklärung (1–2 Sätze).
- Mische die Fragetypen:
  - "choice": Auswahlfrage mit 3 oder 4 plausiblen Antworten, genau eine richtig. Die richtige steht nicht immer an derselben Stelle.
  - "binary": Entweder-oder mit genau 2 Antworten, gut für Fallbeispiele („Anna macht … – was passiert?“).
  - "truefalse": eine Aussage, die stimmt oder nicht stimmt.
  - "cloze": ein Satz mit genau einer Lücke ___ und 3 Antworten zum Einsetzen.
  - "recall": Karteikarte. Eine offene Frage ("question") und die Musterantwort ("answer", 1–2 Sätze). Man überlegt sich die Antwort selbst, deckt sie auf und bewertet sich. Gut für „Warum …?“, „Erkläre …“, Definitionen und Formeln. Etwa eine pro Kachel, am besten als letzte Frage.
  - "order": Reihenfolge. Eine Aufgabe ("question") und 3 bis 5 kurze Einträge ("items") in der RICHTIGEN Reihenfolge – die App mischt sie. Gut für Abläufe, Prozessketten und zeitliche Abfolgen. Nur verwenden, wenn die Reihenfolge eindeutig ist.

Bilder (freiwillig):
- Nur wenn du dir sicher bist, dass es das Bild gibt: "image" mit einer direkten Adresse von upload.wikimedia.org und einer Quellenangabe in "credit" (Wer, Lizenz, „via Wikimedia Commons“).
- Bist du nicht ganz sicher, lass "image" weg. Ein falscher Link wird als fehlendes Bild angezeigt.

Format:
Antworte ausschließlich mit gültigem JSON in einem ```json-Codeblock, ohne Text davor oder danach. Halte dich genau an diese Struktur:

```json
{
  "id": "thema-JJJJMMTT",
  "title": "Titel des Kurses",
  "emoji": "📘",
  "color": "blau",
  "description": "Ein Satz, worum es in dem Kurs geht.",
  "tiles": [
    {
      "id": "kachel-1",
      "title": "Titel der Kachel",
      "emoji": "🔬",
      "intro": ["Erste Leitfrage?", "Zweite Leitfrage?"],
      "steps": [
        { "type": "text", "title": "Überschrift der Seite", "text": "Erster Absatz mit einem **Schlüsselbegriff** …\n\nZweiter Absatz …" },
        { "type": "choice", "question": "Frage zur Seite?", "options": ["Antwort A", "Antwort B", "Antwort C"], "answer": 1, "explanation": "Warum Antwort B stimmt." },
        { "type": "text", "title": "Nächste Seite", "text": "…", "image": { "src": "https://upload.wikimedia.org/…", "credit": "Bild: Name, Lizenz, via Wikimedia Commons" } },
        { "type": "binary", "question": "Ein Fallbeispiel – was ist richtig?", "options": ["Erste Möglichkeit", "Zweite Möglichkeit"], "answer": 0, "explanation": "Warum." },
        { "type": "text", "title": "Dritte Seite", "text": "…" },
        { "type": "cloze", "text": "Ein Satz mit einer ___ darin.", "options": ["Lücke", "Wand", "Tür"], "answer": 0, "explanation": "Warum." },
        { "type": "truefalse", "statement": "Eine Aussage zur ganzen Kachel.", "answer": false, "explanation": "Warum sie nicht stimmt." },
        { "type": "order", "question": "Bringe die Schritte in die richtige Reihenfolge.", "items": ["Erster Schritt", "Zweiter Schritt", "Dritter Schritt"], "explanation": "Warum diese Reihenfolge." },
        { "type": "recall", "question": "Eine offene Frage zur ganzen Kachel – warum ist das so?", "answer": "Die Musterantwort in ein bis zwei Sätzen.", "explanation": "Optional: ein zusätzlicher Hinweis." }
      ],
      "recap": ["Erste Kernaussage.", "Zweite Kernaussage.", "Dritte Kernaussage."]
    }
  ]
}
```

Regeln für das JSON:
- "id" des Kurses: kurzer Name zum Thema aus Kleinbuchstaben, Ziffern und Bindestrichen, gefolgt von -JJJJMMTT (z. B. "photosynthese-JJJJMMTT"). So überschneidet er sich nicht mit anderen Kursen.
- Jede Kachel hat eine eigene "id" ("kachel-1", "kachel-2", …) und ein passendes Emoji.
- "color" ist einer dieser Namen: indigo, violett, blau, tuerkis, gruen, oliv, gold, orange, rost, rosa, schiefer.
- "answer" bei "choice", "binary" und "cloze" ist die Nummer der richtigen Antwort in "options", gezählt ab 0 (0 = erste Antwort).
- "answer" bei "truefalse" ist true oder false (ohne Anführungszeichen).
- Der Lückentext enthält genau eine Lücke aus drei Unterstrichen: ___
- "recall" hat "question" und "answer" (beides Text), keine "options". "order" hat "question" und "items" (3 bis 6 verschiedene Einträge in der richtigen Reihenfolge), kein "answer".
- Gehören mehrere Kurse zum selben Themengebiet (z. B. mehrere Teile einer Vorlesung), gib ihnen dasselbe "group" (z. B. "group": "Fertigungstechnik") – sie stehen dann auf der Karte beieinander. Sonst lass "group" weg.
- Nur gerade Anführungszeichen ("), keine Kommentare, kein Komma nach dem letzten Element einer Liste.

Wenn ich dich später bitte, einen bestehenden Kurs zu überarbeiten, behalte seine "id" und die IDs der Kacheln bei – dann ersetzt die App den alten Kurs und mein Fortschritt bleibt erhalten.
````
<!-- VORLAGE:ENDE -->

---

## Das Kursformat

Kurs → Kacheln → Schritte (Seiten und Fragen). Ein Import kann ein einzelner Kurs `{ … }` oder eine Liste von Kursen `[ { … }, { … } ]` sein. Ältere Kurse mit `"lessons"` statt `"tiles"` werden weiterhin angenommen und automatisch umgewandelt.

### Kurs

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `id` | empfohlen | Eindeutige Kennung, z. B. `"photosynthese-20261112"`. Fehlt sie, wird sie aus dem Titel gebildet. |
| `title` | ja | Titel des Kurses |
| `emoji` | nein | Symbol auf Karte und Kursblatt, z. B. `"🌱"` |
| `description` | nein | Ein Satz zum Inhalt |
| `color` | nein | Farbe der Gruppe: indigo, violett, blau, tuerkis, gruen, oliv, gold, orange, rost, rosa, schiefer |
| `group` | nein | Themengebiet, z. B. `"Fertigungstechnik"`. Kurse mit demselben Namen stehen auf der Karte beieinander. |
| `tiles` | ja | Liste der Kacheln (mindestens eine) |

### Kachel

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `id` | nein | Kennung innerhalb des Kurses. Fehlt sie, wird sie aus dem Titel ergänzt. |
| `title` | ja | Titel der Kachel |
| `emoji` | nein | Symbol auf der Karte |
| `intro` | nein | „Du lernst …“: Liste von Leitfragen, z. B. `["Was ist …?", "Wer fand …?"]` |
| `steps` | ja | Seiten und Fragen in Reihenfolge (mindestens ein Schritt) |
| `recap` | nein | „Rückblick“: Liste von Kernaussagen |

### Schritte

**Seite**

```json
{ "type": "text", "title": "Überschrift (optional)", "text": "Erster Absatz mit **Schlüsselbegriff** …\n\nZweiter Absatz …",
  "image": { "src": "https://upload.wikimedia.org/…", "credit": "Bild: …, Lizenz, via Wikimedia Commons" } }
```

Absätze werden mit einer Leerzeile getrennt – im JSON als `\n\n` geschrieben. `**zwei Sternchen**` machen ein Wort fett. Das Bild ist freiwillig; nach dem ersten Laden ist es auch offline verfügbar.

**Auswahlfrage** (2 bis 6 Antworten, ΤΟΠΟΣ mischt sie beim Anzeigen)

```json
{ "type": "choice", "question": "Frage?", "options": ["A", "B", "C"], "answer": 1, "explanation": "Optional: warum B stimmt." }
```

**Entweder-oder** (genau 2 Antworten, gut für Fallbeispiele)

```json
{ "type": "binary", "question": "Anna lernt … – was hilft mehr?", "options": ["Erste Möglichkeit", "Zweite Möglichkeit"], "answer": 0 }
```

**Richtig/Falsch**

```json
{ "type": "truefalse", "statement": "Eine Aussage.", "answer": false, "explanation": "Optional: warum." }
```

**Lückentext** (genau eine Lücke aus drei Unterstrichen)

```json
{ "type": "cloze", "text": "Die Vergessenskurve stammt von Hermann ___.", "options": ["Ebbinghaus", "Leitner", "Karpicke"], "answer": 0 }
```

**Reihenfolge** (3 bis 6 verschiedene Einträge **in der richtigen Reihenfolge** – ΤΟΠΟΣ mischt sie)

```json
{ "type": "order", "question": "Vom Rohteil zum Fertigteil:", "items": ["Gießen", "Entgraten", "Schleifen"], "explanation": "Optional: warum." }
```

**Karteikarte** (offene Frage mit Musterantwort; man bewertet sich selbst)

```json
{ "type": "recall", "question": "Warum wirkt verteiltes Lernen besser?", "answer": "Weil jede Wiederholung kurz vor dem Vergessen das Gedächtnis am stärksten festigt." }
```

`answer` ist bei `choice`, `binary` und `cloze` die Nummer der richtigen Antwort, **gezählt ab 0**. Bei `truefalse` ist es `true` oder `false` – ohne Anführungszeichen. Bei `recall` ist es der Antworttext; `order` hat kein `answer`.

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
| `npm test` | Automatische Tests (Speed-Reader, Import, Wiederholung, Karte, Sicherung, Suche) |
| `npm run build` | Typprüfung und fertige App in `dist/` bauen |
| `npm run preview` | Gebaute App starten – hier funktioniert auch der Offline-Modus |
| `npm run icons` | App-Icons aus dem Logo [design/logo.png](design/logo.png) neu erzeugen ([scripts/generate-icons.mjs](scripts/generate-icons.mjs)) |

Im Entwicklungsmodus ist der Offline-Speicher (Service Worker) absichtlich aus. Im WLAN-Test ohne HTTPS funktioniert er ebenfalls nicht – das ist normal.

---

## Veröffentlichen auf GitHub Pages

Bei jedem `git push` auf `main` testet und baut GitHub die App automatisch und veröffentlicht sie unter <https://gfb-digital.github.io/Topos/>. Schlägt ein Test fehl, wird nichts veröffentlicht. Der Ablauf steht in [.github/workflows/pages.yml](.github/workflows/pages.yml).

**Einmalig einschalten:** Auf GitHub im Repo **Settings → Pages → Build and deployment → Source: „GitHub Actions“** wählen.

Den Stand siehst du im Repo unter **Actions**. Ein grüner Haken heißt: veröffentlicht.

> Die Seite ist öffentlich erreichbar. Deine importierten Kurse und dein Fortschritt werden dabei **nicht** hochgeladen – sie liegen nur auf deinem Gerät.

---

## Projektaufbau

```
src/
  App.tsx                 Ansichts-Steuerung (Karte, Kachel, Wiederholen, Prüfung, Wissensbank, Suche, Inhalte, Einstellungen)
  screens/
    MapScreen.tsx         Startseite: Wissenskarte, „Schlau lernen“, Kursblatt
    SessionScreen.tsx     Lernsitzung: Kachel lernen/lesen, Wissen stärken, Prüfung, Schlau lernen
    KnowledgeScreen.tsx   Wissensbank, Vorschau, schwierige Fragen, Prognose, Lerntage, Statistik
    SearchScreen.tsx      Suche über alle Kurse
    ContentScreen.tsx     Import, Sicherung, Vorlage für Claude, Kurse verwalten
    SettingsScreen.tsx    Einstellungen
  components/
    map/                  3D-Karte (Säulen) und Kursblatt
    session/              Fortschrittsleiste, Seite, Fragekarte, „Du lernst …“/„Rückblick“
    speed/                Speed-Reader
  lib/
    maplayout.ts          Anordnung der Kacheln und Kurse (Sechseck-Raster)  (+ maplayout.test.ts)
    map3d.ts              Säulen: Höhe, Projektion, Drehen, Grenzen          (+ map3d.test.ts)
    mastery.ts            Beherrschung einer Kachel → Säulenhöhe             (+ mastery.test.ts)
    srs.ts                Wiederholung in wachsenden Abständen               (+ srs.test.ts)
    session.ts            Ablauf einer Sitzung, falsche Fragen anhängen
    smart.ts              Auswahl für „Wissen stärken“, Prüfung, Prüfungstermin, „Schlau lernen“
    streak.ts             Lerntage, Serie, Kalender                          (+ learning.test.ts)
    backup.ts, files.ts   Sicherung als Datei, Datei speichern               (+ backup.test.ts)
    search.ts             Suche                                              (+ search.test.ts)
    sanitize.ts           Gespeicherte Daten prüfen
    orp.ts                Speed-Reader-Logik                       (+ orp.test.ts)
    importer.ts           Kurs-Import und Prüfung                  (+ importer.test.ts)
    db.ts                 Speicher (IndexedDB) – einzige Stelle mit Speicherzugriff
    store.ts              App-Zustand: Kurse, Lernstand, Einstellungen; Übernahme alter Daten
    model.ts, colors.ts   Hilfsfunktionen, Kursfarben
    navigation.ts         Ansichtswechsel mit Zurück-Taste
    appearance.ts         Hell/Dunkel und Schriftgröße
    pwa.ts                Offline-Modus und Update-Hinweis
  content/
    sample-course.ts      Eingebauter Beispielkurs „Lernen lernen“
    claude-template.ts    Vorlage für Claude
  styles/
    global.css            Farben, Grundstil, Lesen, Speed-Reader
    learning.css          Karte, Kursblatt, Sitzung, Wissensbank
```

Der aktuelle Arbeitsstand steht in [FORTSCHRITT.md](FORTSCHRITT.md), der Auftrag in [PLAN.md](PLAN.md).

---

## Später als echte App (Capacitor)

ΤΟΠΟΣ ist so gebaut, dass daraus ohne Umbau eine App für App Store und Play Store werden kann:

- **Relative Pfade** (`base: './'` in [vite.config.ts](vite.config.ts)) – der Build läuft unverändert in der App-Hülle.
- **Kein Service Worker in der App:** [src/lib/pwa.ts](src/lib/pwa.ts) erkennt Capacitor und schaltet ihn ab (die Dateien liegen dort ohnehin auf dem Gerät).
- **Safe Areas, Touch-Bedienung, große Tippflächen** sind schon berücksichtigt.
- **Zurück-Taste:** Die Navigation nutzt den Verlauf, Androids Zurück-Taste funktioniert damit.

So ginge es los (braucht für iOS einen Mac mit Xcode, für Android Android Studio):

```powershell
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init ΤΟΠΟΣ de.gfbdigital.topos --web-dir dist
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npm run build
npx cap sync
```

Danach nach jeder Änderung: `npm run build` und `npx cap sync`.

**Empfehlungen für die App-Version:**

- **Sicherung speichern:** [src/lib/files.ts](src/lib/files.ts) nutzt das Teilen-Menü des Browsers bzw. einen Download. In der App-Hülle braucht es dafür `@capacitor/filesystem` und `@capacitor/share` – nur diese eine Datei wäre anzupassen.
- **Speicher:** In der App kann das System IndexedDB bei Speichermangel leeren. Sicherer ist ein nativer Speicher (z. B. `@capacitor/preferences` oder SQLite). Dafür muss nur [src/lib/db.ts](src/lib/db.ts) ausgetauscht werden – der Rest der App spricht ausschließlich über `getItem`/`setItem`/`removeItem`.
- **Android-Zurück-Taste** mit `@capacitor/app` an `history.back()` koppeln, damit sie am Startbildschirm die App schließt.
- **App-Icons und Startbildschirme** aus [public/icons/icon-512.png](public/icons/icon-512.png) erzeugen, z. B. mit `@capacitor/assets`.
