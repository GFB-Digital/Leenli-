# Leenli

Lern-App mit kurzen Leseabschnitten, Fragen und eingebautem Speed-Reader.
Läuft als installierbare Web-App (PWA) – komplett lokal und offline.

## Befehle

| Befehl | Was passiert |
| --- | --- |
| `npm install` | Abhängigkeiten installieren (einmalig bzw. nach Änderungen an `package.json`) |
| `npm run dev` | Entwicklungsserver auf <http://localhost:5173> |
| `npm run dev:handy` | Wie `dev`, aber auch im WLAN erreichbar (z. B. iPhone) |
| `npm run build` | Typprüfung + fertige App in `dist/` bauen |
| `npm run preview` | Gebaute App aus `dist/` starten (hier funktioniert auch offline) |
| `npm test` | Tests der Speed-Reader-Logik ausführen |
| `npm run icons` | App-Icons neu erzeugen (`scripts/generate-icons.mjs`) |

Die ausführliche Anleitung (Inhaltsformat, Prompt-Vorlage, Capacitor) folgt.
