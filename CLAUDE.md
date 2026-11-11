# Leenli – Hinweise für Claude

Claude Code liest diese Datei zu Beginn jeder Sitzung automatisch. Die beiden folgenden Dateien werden damit ebenfalls geladen:

@PLAN.md
@FORTSCHRITT.md

## Arbeitsweise
- Der Nutzer ist Anfänger und arbeitet unter Windows mit VS Code und PowerShell. Terminal-Befehle kurz erklären und in PowerShell-Schreibweise angeben.
- Antworten und gesamte App-Oberfläche auf Deutsch.
- In Phasen arbeiten und nach jeder Phase anhalten: sagen, was getestet werden soll, und einen Commit vorschlagen (`git add`, `commit`, `push`). Der Nutzer committet selbst.
- Vor größeren Umbauten nachfragen.
- Nach jeder Phase **FORTSCHRITT.md aktualisieren**: Erledigtes, Entscheidungen, nächste Schritte.
- Vor dem Abschluss einer Phase prüfen: `npm run build` (enthält die Typprüfung) und `npm test` (Speed-Reader-Logik).
