# KienzleFAT – Projektkontext für Claude

## Was ist das?
Electron-App (React + TypeScript + better-sqlite3) für Rechnungsverwaltung.
Firma: Kienzle Sh.P.K.

## Tech Stack
- Electron 29 + Vite + React 18 + TypeScript
- better-sqlite3 (natives Modul – muss per `@electron/rebuild` neu gebaut werden)
- electron-builder für Installer (NSIS, Windows x64)
- Vercel für die Download-Webseite (`download-page.html`)

## GitHub
- Repo: https://github.com/6d8qdztg8d-cell/KienzleFatura
- Branch: main
- Windows Build via GitHub Actions (`windows-latest`)
- **Neuen Build auslösen:** `git tag vX.X.X && git push origin vX.X.X`
- Tag-Version MUSS mit `package.json → version` übereinstimmen (sonst falscher Dateiname)

## Build-Workflow
1. `package.json` Version updaten
2. `git add . && git commit -m "vX.X.X" && git push origin main`
3. `git tag vX.X.X && git push origin vX.X.X`
4. GitHub Actions baut automatisch → `.exe` wird als GitHub Release hochgeladen
5. Download-Seite holt per JS automatisch den neuesten Release

## Download-Seite
- Datei: `download-page.html` → deployed auf Vercel
- JS fetcht automatisch neuesten Release von GitHub API
- Statischer Fallback-Link muss manuell auf neue Version geupdatet werden
- Uninstall-Fix Button vorhanden (lädt `uninstall-fix.bat` runter)

## Installer (NSIS)
- Konfiguration: `electron-builder.yml`
- Custom Script: `build/installer.nsh`
  - Beendet laufende App vor Installation (`taskkill` für KienzleFAT.exe + KienzleFaktura.exe)
  - Löscht im `customInit` AUTOMATISCH alle alten Registry-Einträge und Ordner (KienzleFAT + KienzleFaktura) BEVOR der Installer nach alter Version sucht → kein Fehler mehr
  - `customRemoveFiles` löscht Installationsordner forcefully beim Deinstallieren
- `perMachine: true` → installiert in `C:\Program Files\`
- `oneClick: true` → kein Installations-Dialog
- **Ab v1.0.15**: Neue `.exe` einfach draufklicken – überschreibt automatisch ohne Fehlermeldung

## Bekannte Probleme & Fixes
- **"Alte Anwendungsdateien konnten nicht deinstalliert werden"**: War ein Problem bis v1.0.14. Ab v1.0.15 behoben durch `customInit` in `build/installer.nsh`. Falls es bei alten Installationen nochmal auftritt: `uninstall-fix.bat` als Admin ausführen (auf Webseite verfügbar).
- **Native Module**: `better-sqlite3` muss immer mit `npx @electron/rebuild -f -w better-sqlite3` neu gebaut werden nach `npm install`
- **Cross-Compile**: Kein Cross-Compile von macOS zu Windows möglich (kein Wine/Docker). Immer über GitHub Actions bauen.
- **Tag ≠ Version**: Tag-Version in git MUSS identisch mit `package.json → version` sein – sonst heißt die .exe falsch. Immer beide zusammen updaten!

## Wichtige Dateien
- `package.json` – Version hier updaten vor jedem Build
- `electron-builder.yml` – Installer-Konfiguration
- `build/installer.nsh` – Custom NSIS Script
- `download-page.html` – Vercel Download-Seite
- `uninstall-fix.bat` – Reparatur-Tool für kaputte Installationen
- `.github/workflows/build-release.yml` – GitHub Actions Build

## Auto-Update
Aktuell kein Auto-Update implementiert. Nutzer muss neue Version manuell von der Webseite laden und installieren.
