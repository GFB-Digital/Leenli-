// Vorlage, die man bei Claude einfügt, um einen Kurs im Leenli-Format zu bekommen.
// Das heutige Datum steckt in der ID → neue Kurse überschneiden sich nicht.

function dateStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

export function claudeTemplate(today: Date = new Date()): string {
  const stamp = dateStamp(today)
  return `Erstelle mir einen Lernkurs für meine Lern-App „Leenli“.

Thema: [HIER DEIN THEMA EINTRAGEN]
Umfang: [z. B. 3 Lektionen]

Inhalt:
- Sprache: Deutsch, klar und anschaulich.
- Jede Lektion besteht aus 3 bis 5 Leseabschnitten. Nach jedem Abschnitt folgt genau eine Frage dazu.
- Jeder Leseabschnitt hat 60 bis 120 Wörter. Absätze innerhalb eines Abschnitts trennst du mit \\n\\n.
- Nur gesicherte Fakten, nichts erfinden. Bei Unsicherheit lieber weglassen.
- Die Fragen prüfen das Verständnis, nicht den genauen Wortlaut. Jede Frage bekommt eine kurze Erklärung (1–2 Sätze).
- Auswahlfragen haben 3 oder 4 plausible Antworten, genau eine ist richtig. Die richtige Antwort steht nicht immer an derselben Stelle.
- Mische Auswahlfragen ("choice") und Richtig/Falsch-Aussagen ("truefalse").

Format:
Antworte ausschließlich mit gültigem JSON in einem \`\`\`json-Codeblock, ohne Text davor oder danach. Halte dich genau an diese Struktur:

\`\`\`json
{
  "id": "thema-${stamp}",
  "title": "Titel des Kurses",
  "emoji": "📘",
  "description": "Ein Satz, worum es in dem Kurs geht.",
  "lessons": [
    {
      "id": "lektion-1",
      "title": "Titel der Lektion",
      "steps": [
        { "type": "text", "title": "Überschrift des Abschnitts", "text": "Erster Absatz …\\n\\nZweiter Absatz …" },
        { "type": "choice", "question": "Frage zum Abschnitt?", "options": ["Antwort A", "Antwort B", "Antwort C"], "answer": 1, "explanation": "Warum Antwort B stimmt." },
        { "type": "text", "title": "Nächster Abschnitt", "text": "…" },
        { "type": "truefalse", "statement": "Eine Aussage zum Abschnitt.", "answer": false, "explanation": "Warum die Aussage nicht stimmt." }
      ]
    }
  ]
}
\`\`\`

Regeln für das JSON:
- "id" des Kurses: kurzer Name zum Thema aus Kleinbuchstaben, Ziffern und Bindestrichen, gefolgt von -${stamp} (z. B. "photosynthese-${stamp}"). So überschneidet er sich nicht mit anderen Kursen.
- Jede Lektion hat eine eigene "id" ("lektion-1", "lektion-2", …).
- "answer" bei "choice" ist die Nummer der richtigen Antwort in "options", gezählt ab 0 (0 = erste Antwort).
- "answer" bei "truefalse" ist true oder false (ohne Anführungszeichen).
- "emoji" ist ein einzelnes passendes Emoji.
- Nur gerade Anführungszeichen ("), keine Kommentare, kein Komma nach dem letzten Element einer Liste.

Wenn ich dich später bitte, einen bestehenden Kurs zu überarbeiten, behalte seine "id" und die IDs der Lektionen bei – dann ersetzt die App den alten Kurs und mein Fortschritt bleibt erhalten.`
}
