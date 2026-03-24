# KienzleFAT – Projektkontext für Claude

## Was ist das Programm?
Desktop-App für Kfz-Betrieb **Kienzle Sh.P.K.** zur Rechnungsverwaltung.
- Rechnungen erstellen, drucken (PDF), speichern
- Kundendaten & Artikel verwalten
- CSV-Import von alten Rechnungen
- Backups erstellen & wiederherstellen
- Rechnungsnummern starten bei **1494** (alle davor wurden im alten System gemacht)

## Was das Programm tut (Features)

### Navigation (Sidebar)
- **Faturë e Re** – neues Rechnungsformular (Navigation cleart NICHT die Daten)
- **Faturat** – Liste aller gespeicherten Rechnungen
- **Artikujt** – Artikel/Preis-Katalog verwalten
- **Backups** – Backup erstellen, wiederherstellen, CSV importieren
- Navigation nutzt CSS `display:none` → alle Views bleiben gemountet, Formulardaten gehen nicht verloren

### Formular (FormularView)
- Felder: Kennzeichen, Nr. Faturës (automatisch, gesperrt), NRV, Datum, Faturoi, Pagesa, Kundendaten, Positionen (Artikelliste)
- **🗑️ Clear** – cleart das gesamte Formular und holt neue Rechnungsnummer
- **🖨️ Printo** – druckt PDF, speichert NICHT in DB
- **💾 Ruaj** – speichert in DB, erstellt PDF, cleart danach das Formular automatisch, bleibt auf dem Formular (navigiert NICHT zur Liste)
- Doppelte Rechnungsnummern sind blockiert (3-fach: DB Index, Backend-Check, Frontend-Meldung)
- **Artikel-Autofill**: Artikelnummer eingeben → Beschreibung + Preis werden automatisch ausgefüllt, Gjithsejt = Sasi × Çmimi
- **Artikelliste wird neu geladen** sobald das Formular-Tab aktiv wird (damit neu angelegte Artikel sofort verfügbar sind)
- Kundenname-Feld: Autocomplete aus gespeicherten Rechnungen (suchenKunden)

### Rechnungsliste (ListeView)
- Alle Rechnungen anzeigen, suchen, bearbeiten, löschen
- **Suche durchsucht alle Felder**: Kennzeichen, Nr. Faturës, NRV, Faturoi, Pagesa, Kundenname, NUI, Adresse, Stadt, Datum
- Wird neu geladen wenn Tab aktiv wird (`isVisible` prop)

### Artikelverwaltung (EinstellungenView)
- Artikel mit Nummer, Beschreibung, Preis speichern & wiederverwenden
- Artikelnummer = ID → wird im Formular als Lookup-Key verwendet

### Backups (BackupView)
- Manuelles Backup als ZIP (DB + alle PDFs)
- Backup wiederherstellen
- CSV importieren (Semikolon-getrennt, 15 Spalten, Datum TT/MM/JJJJ)
- **Auto-Backup**: täglich automatisch beim App-Start
- **Max. 30 Backups** – älteste werden automatisch gelöscht

## Datensicherheit
- **WAL-Modus** aktiviert → DB überlebt Crashes & Stromausfälle
- **synchronous = NORMAL** → maximale Sicherheit
- **foreign_keys = ON**
- DB liegt in `C:\Users\[Name]\AppData\Roaming\KienzleFAT\rechnungen.db`
- Daten bleiben auch nach Programmdeinstallation erhalten
- UNIQUE INDEX auf `nr_fatura` → keine doppelten Rechnungsnummern möglich
- CSV-Import als Transaction → alles oder nichts

## Tech Stack
- Electron 29 + Vite + React 18 + TypeScript
- better-sqlite3 (natives Modul – muss per `@electron/rebuild` neu gebaut werden)
- electron-builder für Installer (NSIS, Windows x64)
- Vercel für die Download-Webseite (`download-page.html`)

## GitHub & Build
- Repo: https://github.com/6d8qdztg8d-cell/KienzleFatura
- Branch: main
- Windows Build via GitHub Actions (`windows-latest`)
- **Neuen Build auslösen:**
  1. `package.json` Version updaten (z.B. 1.0.29 → 1.0.30)
  2. Version in `src/renderer/src/App.tsx` updaten (Footer)
  3. `git add -A && git commit -m "vX.X.X" && git push origin main`
  4. `git tag vX.X.X && git push origin vX.X.X`
- **WICHTIG**: Tag = package.json version, sonst heißt die .exe falsch!
- GitHub Actions baut → lädt `.exe` als Release hoch → Webseite zeigt automatisch neuste Version

## Installer (NSIS)
- `electron-builder.yml`: appId = `com.kienzle.fat`, productName = `KienzleFAT`
- `build/installer.nsh`:
  - Beendet KienzleFAT.exe + KienzleFaktura.exe per taskkill
  - Löscht alte Registry-Keys (com.kienzle.fat, com.kienzle.faktura, KienzleFAT, KienzleFaktura)
  - Löscht alte Installationsordner ($PROGRAMFILES64 + $PROGRAMFILES)
  - → Ab v1.0.15: neue .exe einfach draufklicken, kein Fehler mehr
- `perMachine: true` → C:\Program Files\
- `oneClick: true`

## Bekannte Probleme & Fixes
- **"Alte Anwendungsdateien konnten nicht deinstalliert werden"**: Ab v1.0.15 behoben. Falls nochmal: `uninstall-fix.bat` als Admin (auf Webseite verfügbar)
- **"Gabim gjatë ruajtjes!"** beim Speichern: Ab v1.0.24 zeigt die Meldung den genauen Fehlertext. Ursache war DB-Initialisierungsfehler durch UNIQUE INDEX im falschen exec()-Block (behoben in v1.0.22)
- **Doppelte Rechnungsnummer**: Zeigt "Nr. Faturës X ekziston tashmë!" – andere Nummer wählen
- **Artikel-Autofill funktioniert nicht nach Tab-Wechsel**: Behoben in v1.0.30 – FormularView lädt Artikelliste neu wenn Tab aktiv wird (`isVisible` prop)
- **Native Module**: `better-sqlite3` immer mit `npx @electron/rebuild -f -w better-sqlite3` neu bauen
- **Cross-Compile**: Nicht möglich von macOS. Immer GitHub Actions verwenden.
- **SQLite String-Literale**: Immer einfache Anführungszeichen `''` verwenden, nie `""` (doppelte = Spaltenname in SQLite → "no such column" Fehler)

## Wichtige Dateien
- `package.json` – App-Version (vor jedem Build updaten)
- `electron-builder.yml` – Installer-Konfiguration
- `build/installer.nsh` – Custom NSIS Script (Upgrade-Logik)
- `download-page.html` – Vercel Download-Seite
- `uninstall-fix.bat` – Reparatur-Tool (auch auf GitHub Release v1.0.14+)
- `.github/workflows/build-release.yml` – GitHub Actions (permissions: contents: write!)
- `src/main/database.ts` – DB-Logik, WAL, UNIQUE Index, Duplikat-Check, Suche über alle Felder
- `src/main/backup-service.ts` – Backup, Auto-Backup, CSV-Import (Transaction)
- `src/renderer/src/App.tsx` – Navigation, Routing, Version im Footer, isVisible Props
- `src/renderer/src/views/FormularView.tsx` – Hauptformular, Speichern/Drucken/Clear, Artikel-Autofill
- `src/renderer/src/views/ListeView.tsx` – Rechnungsliste, Suche (alle Felder), isVisible
- `src/renderer/src/views/EinstellungenView.tsx` – Artikelverwaltung
- `src/renderer/src/views/BackupView.tsx` – Backup/Restore/CSV

## Versionshistorie (wichtige Änderungen)
- v1.0.15 – Installer-Fix: keine "alte Dateien" Meldung mehr
- v1.0.16 – Sofortige Weiterleitung nach Speichern (kein 1.5s Delay)
- v1.0.17 – WAL-Modus, Auto-Backup täglich, max 30 Backups, CSV Transaction
- v1.0.18 – appId auf com.kienzle.fat, Registry-Keys korrigiert
- v1.0.19 – Rezervimi→Backups, Faktura→Fatura, Startnummer 1494, Version sichtbar
- v1.0.20 – Doppelte Rechnungsnummern blockiert (UNIQUE INDEX + Backend + Frontend)
- v1.0.21 – Drucken speichert nicht mehr in DB
- v1.0.22 – DB-Init Fix: UNIQUE INDEX separat mit try-catch
- v1.0.23 – Navigation cleart nicht mehr; Clear-Button hinzugefügt
- v1.0.24 – Genauer Fehlertext beim Speichern sichtbar
- v1.0.28 – Ruaj cleart Formular automatisch, navigiert nicht mehr zur Liste; onSaved entfernt
- v1.0.29 – Suche in Faturat durchsucht alle Felder (Name, NUI, Adresse, Stadt, Datum, Pagesa, NRV)
- v1.0.30 – Artikel-Autofill Fix: Artikelliste wird bei Tab-Wechsel neu geladen
