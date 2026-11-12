// Vorlage, die man bei Claude einfügt, um einen Kurs im Leenli-Format zu bekommen.
// Das heutige Datum steckt in der ID → neue Kurse überschneiden sich nicht.

import { COURSE_COLOR_NAMES } from '../lib/colors.ts'

function dateStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

export function claudeTemplate(today: Date = new Date()): string {
  const stamp = dateStamp(today)
  return `Erstelle mir einen Lernkurs für meine Lern-App „Leenli“.

Thema: [HIER DEIN THEMA EINTRAGEN]
Umfang: [z. B. 6 Kacheln]

So ist ein Kurs aufgebaut:
- Ein Kurs besteht aus Kacheln. Jede Kachel ist eine kurze Lerneinheit zu einem Teilthema (z. B. beim Kurs „Das Gehirn“ eine Kachel pro Hirnregion). Ordne die Kacheln so, dass sie aufeinander aufbauen.
- Jede Kachel beginnt mit 2 Leitfragen („intro“): Was lernt man in dieser Kachel?
- Dann folgen 3 bis 4 Leseseiten. Nach jeder Seite kommt genau eine Frage zu genau dieser Seite. Am Ende darf noch eine zusätzliche Frage zur ganzen Kachel stehen.
- Jede Kachel endet mit einem Rückblick („recap“): 3 kurze Kernaussagen.

Inhalt:
- Sprache: Deutsch, lebendig und anschaulich, wie ein gutes Sachbuch.
- Jede Seite hat 80 bis 140 Wörter. Absätze innerhalb einer Seite trennst du mit \\n\\n.
- Erzähle Hintergründe: Wer hat etwas entdeckt, erfunden oder erforscht – wann, wie und warum? Beschreibe Experimente, Geschichten und konkrete Beispiele.
- Markiere 1 bis 2 Schlüsselbegriffe pro Seite mit **zwei Sternchen** (fett).
- Nur gesicherte Fakten, nichts erfinden. Bei Unsicherheit lieber weglassen.
- Fragen prüfen das Verständnis, nicht den genauen Wortlaut. Jede Frage bekommt eine kurze Erklärung (1–2 Sätze).
- Mische die Fragetypen:
  - "choice": Auswahlfrage mit 3 oder 4 plausiblen Antworten, genau eine richtig. Die richtige steht nicht immer an derselben Stelle.
  - "binary": Entweder-oder mit genau 2 Antworten, gut für Fallbeispiele („Anna macht … – was passiert?“).
  - "truefalse": eine Aussage, die stimmt oder nicht stimmt.
  - "cloze": ein Satz mit genau einer Lücke ___ und 3 Antworten zum Einsetzen.

Bilder (freiwillig):
- Nur wenn du dir sicher bist, dass es das Bild gibt: "image" mit einer direkten Adresse von upload.wikimedia.org und einer Quellenangabe in "credit" (Wer, Lizenz, „via Wikimedia Commons“).
- Bist du nicht ganz sicher, lass "image" weg. Ein falscher Link wird als fehlendes Bild angezeigt.

Format:
Antworte ausschließlich mit gültigem JSON in einem \`\`\`json-Codeblock, ohne Text davor oder danach. Halte dich genau an diese Struktur:

\`\`\`json
{
  "id": "thema-${stamp}",
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
        { "type": "text", "title": "Überschrift der Seite", "text": "Erster Absatz mit einem **Schlüsselbegriff** …\\n\\nZweiter Absatz …" },
        { "type": "choice", "question": "Frage zur Seite?", "options": ["Antwort A", "Antwort B", "Antwort C"], "answer": 1, "explanation": "Warum Antwort B stimmt." },
        { "type": "text", "title": "Nächste Seite", "text": "…", "image": { "src": "https://upload.wikimedia.org/…", "credit": "Bild: Name, Lizenz, via Wikimedia Commons" } },
        { "type": "binary", "question": "Ein Fallbeispiel – was ist richtig?", "options": ["Erste Möglichkeit", "Zweite Möglichkeit"], "answer": 0, "explanation": "Warum." },
        { "type": "text", "title": "Dritte Seite", "text": "…" },
        { "type": "cloze", "text": "Ein Satz mit einer ___ darin.", "options": ["Lücke", "Wand", "Tür"], "answer": 0, "explanation": "Warum." },
        { "type": "truefalse", "statement": "Eine Aussage zur ganzen Kachel.", "answer": false, "explanation": "Warum sie nicht stimmt." }
      ],
      "recap": ["Erste Kernaussage.", "Zweite Kernaussage.", "Dritte Kernaussage."]
    }
  ]
}
\`\`\`

Regeln für das JSON:
- "id" des Kurses: kurzer Name zum Thema aus Kleinbuchstaben, Ziffern und Bindestrichen, gefolgt von -${stamp} (z. B. "photosynthese-${stamp}"). So überschneidet er sich nicht mit anderen Kursen.
- Jede Kachel hat eine eigene "id" ("kachel-1", "kachel-2", …) und ein passendes Emoji.
- "color" ist einer dieser Namen: ${COURSE_COLOR_NAMES.join(', ')}.
- "answer" bei "choice", "binary" und "cloze" ist die Nummer der richtigen Antwort in "options", gezählt ab 0 (0 = erste Antwort).
- "answer" bei "truefalse" ist true oder false (ohne Anführungszeichen).
- Der Lückentext enthält genau eine Lücke aus drei Unterstrichen: ___
- Nur gerade Anführungszeichen ("), keine Kommentare, kein Komma nach dem letzten Element einer Liste.

Wenn ich dich später bitte, einen bestehenden Kurs zu überarbeiten, behalte seine "id" und die IDs der Kacheln bei – dann ersetzt die App den alten Kurs und mein Fortschritt bleibt erhalten.`
}
