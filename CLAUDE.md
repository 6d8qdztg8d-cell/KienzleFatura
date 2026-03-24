# KienzleFAT – Vollständige App-Spezifikation

## Zweck
Desktop-App für den Kfz-Betrieb **Kienzle Sh.P.K.** in Ferizaj, Kosovo.
Sprache der UI: Albanisch. Sprache der Kommentare/Commits: Deutsch/Albanisch gemischt.
Rechnungen erstellen, als PDF drucken/speichern, Kundendaten & Artikel verwalten, Backups.

---

## Tech Stack
- **Electron 29** + **Vite** + **React 18** + **TypeScript**
- **better-sqlite3** – synchrone SQLite-DB (natives Modul, muss per `@electron/rebuild` gebaut werden)
- **pdf-lib** – PDF-Generierung direkt im Main-Prozess
- **adm-zip** – Backup-ZIPs erstellen/lesen
- **electron-builder** – NSIS-Installer, Windows x64
- Vercel für Download-Webseite (`download-page.html`)

---

## Datenmodelle

### Rechnung
```ts
{
  id: number              // SQLite AUTOINCREMENT (0 = neu)
  kennzeichen: string     // Autokennzeichen, z.B. "01-302-YE"
  nrFatura: string        // Rechnungsnummer, z.B. "1494"
  nrv: string             // "NRV-01/0478" (immer mit Prefix "NRV-")
  faturoi: string         // Wer hat fakturiert: "Ibrahim" | "Cufa" | "Agnesa"
  pagesa: string          // Zahlungsart: "Bank" | "Cash"
  dataFatura: string      // ISO-Datum Rechnungsdatum
  pagesaDeri: string      // ISO-Datum Zahlungsfrist (Standard: +30 Tage)
  kundeName: string
  kundeNUI: string        // Steuernummer des Kunden
  kundeAdresse: string
  kundeStadt: string
  positionen: Position[]  // als JSON in DB gespeichert
  totali: number          // Summe OHNE TVSh (18% MwSt wird nur im UI/PDF berechnet, nicht gespeichert)
  erstellt: string        // ISO-Timestamp
  geaendert: string       // ISO-Timestamp
}
```

### Position (eine Zeile in der Rechnung)
```ts
{
  id: string        // temporäre Frontend-ID, wird nicht in DB gespeichert
  cope: string      // Stückzahl (als String, Komma oder Punkt als Dezimal)
  artikelNr: string // Artikelnummer aus dem Katalog
  pershkrimi: string // Beschreibung
  cmimi: string     // Preis pro Stück (als String)
  gjithsejt: number // cope × cmimi (berechnet)
}
```

### Artikel
```ts
{
  id: string         // Artikelnummer = Primary Key, z.B. "ART-001"
  beschreibung: string
  preis: number      // Preis OHNE TVSh
}
```

---

## Datenbankschema (SQLite)

```sql
CREATE TABLE rechnungen (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kennzeichen   TEXT NOT NULL DEFAULT '',
  nr_fatura     TEXT DEFAULT '',
  nrv           TEXT DEFAULT 'NRV-',
  faturoi       TEXT DEFAULT 'Ibrahim',
  pagesa        TEXT DEFAULT 'Bank',
  data_fatura   TEXT DEFAULT '',
  pagesa_deri   TEXT DEFAULT '',
  kunde_name    TEXT DEFAULT '',
  kunde_nui     TEXT DEFAULT '',
  kunde_adresse TEXT DEFAULT '',
  kunde_stadt   TEXT DEFAULT '',
  positionen    TEXT DEFAULT '[]',  -- JSON Array von Position-Objekten
  totali        REAL DEFAULT 0,
  pdf_path      TEXT DEFAULT '',
  erstellt      TEXT DEFAULT '',
  geaendert     TEXT DEFAULT ''
);

CREATE UNIQUE INDEX idx_nr_fatura_unique ON rechnungen(nr_fatura)
  WHERE nr_fatura != '';  -- Partial Index: leere Nummern erlaubt, befüllte müssen unique sein

CREATE TABLE artikel (
  nummer       TEXT PRIMARY KEY,
  beschreibung TEXT DEFAULT '',
  preis        REAL DEFAULT 0
);
```

**DB-Einstellungen:** WAL-Modus, synchronous=NORMAL, foreign_keys=ON
**DB-Pfad:** `C:\Users\[Name]\AppData\Roaming\KienzleFAT\rechnungen.db`
**WICHTIG:** UNIQUE INDEX immer in separatem try-catch erstellen, nicht im gleichen exec()-Block wie die Tabellen.
**WICHTIG:** SQLite String-Literale immer mit `''` (einfache Anführungszeichen). `""` = Spaltenname → "no such column" Fehler.

---

## Rechnungsnummern-Logik
- Erste Rechnungsnummer: **1494** (alles davor im alten System)
- `naechsteNrFatura()`: Liest alle `nr_fatura` aus DB, parsed als Int, nimmt Maximum, gibt `max + 1` zurück. Startwert `maxNr = 1493`.
- Nummer wird im Frontend als gesperrtes Feld angezeigt (🔒), nicht editierbar.
- **Duplikat-Schutz 3-fach:**
  1. DB: UNIQUE INDEX blockiert INSERT
  2. Backend: `speichern()` prüft mit SELECT vor INSERT, wirft `Error("DUPLICATE_NR_FATURA:1495")`
  3. Frontend: fängt Fehler, zeigt Toast "Nr. Faturës 1495 ekziston tashmë!"

---

## IPC-API (window.api im Frontend)

```ts
// Rechnungen
window.api.alleRechnungen()           // → Rechnung[]
window.api.suchenRechnungen(q)        // → Rechnung[] (alle Felder durchsucht)
window.api.speichernRechnung(r)       // → number (neue ID)
window.api.loeschenRechnung(id)       // → void
window.api.naechsteNrFatura()         // → string

// Artikel
window.api.alleArtikel()              // → Artikel[]
window.api.speichernArtikel(a)        // → void
window.api.loeschenArtikel(nr)        // → void

// Kunden-Autocomplete
window.api.suchenKunden(q)            // → {kundeName, kundeNUI, kundeAdresse, kundeStadt}[]

// PDF
window.api.pdfDrucken(r)             // → void (öffnet PDF in System-Viewer, SPEICHERT NICHT in DB)
window.api.pdfSpeichern(r)           // → void (speichert PDF in pdfDir, kein DB-Eintrag)

// Backup
window.api.backupErstellen()          // → string (ZIP-Pfad)
window.api.backupImportieren()        // → 'ok' | null (öffnet Datei-Dialog)
window.api.backupWiederherstellen(p)  // → void
window.api.alleBackups()             // → {name, filePath, created}[]
window.api.backupImFinderOeffnen(p)  // → void
window.api.csvImportieren()          // → number (Anzahl importierter Rechnungen, öffnet Datei-Dialog)
```

---

## Navigation & State-Management (App.tsx)

```
Sidebar-Tabs: formular | liste | einstellungen | backup
```

**WICHTIG:** Navigation verwendet CSS `display:none` (NICHT conditional rendering).
Alle Views bleiben permanent gemountet → Formulardaten gehen beim Tab-Wechsel NICHT verloren.

```tsx
<div style={{ display: selected === 'formular' ? 'flex' : 'none' }}>
  <FormularView key={formKey} rechnung={editRechnung} onClear={handleNeueRechnung} isVisible={selected === 'formular'} />
</div>
```

**formKey** – Integer, wird bei jedem `handleNeueRechnung()` inkrementiert → erzwingt Remount von FormularView → setzt Formular zurück + lädt neue Rechnungsnummer.

**State in App.tsx:**
- `selected` – aktiver Tab
- `editRechnung` – Rechnung die bearbeitet wird (null = neue Rechnung)
- `formKey` – erzwingt Remount

**handleEdit(r):** Setzt `editRechnung`, inkrementiert `formKey`, navigiert zu 'formular'
**handleNeueRechnung():** Setzt `editRechnung=null`, inkrementiert `formKey`, navigiert zu 'formular'

---

## FormularView – genaues Verhalten

### Felder
| Feld | Typ | Besonderheit |
|------|-----|--------------|
| Nr. Faturës | read-only Display | automatisch, 🔒-Icon, Farbe accent-hi |
| Targa / Kennzeichen | text input | Pflichtfeld im UI-Sinne |
| NRV | text input mit Prefix | "NRV-" ist fest vorangestellt, User tippt nur den Rest |
| Datë Fatura | date input | Standard: heute |
| Pagesa Deri | date input | Standard: heute + 30 Tage |
| Faturoi | select | Optionen: Ibrahim, Cufa, Agnesa |
| Mënyra e Pagesës | select | Optionen: Bank, Cash |
| Emri / Name | text + Autocomplete | suchenKunden() nach früher genutzten Namen |
| NUI | text | |
| Adresa | text | |
| Qyteti / Stadt | text | |

### Positionen (Artikelzeilen)
Jede Zeile: **Sasi** (Stückzahl) | **Nr. Art.** | **Përshkrimi** | **Çmimi** | **Gjithsejt** (berechnet) | ✕-Button

**Artikel-Autofill:** Wenn Artikelnummer eingegeben wird → sucht in `artikelListe` → füllt Beschreibung + Preis automatisch aus → berechnet Gjithsejt = Sasi × Çmimi sofort.

**artikelListe** wird geladen:
1. Beim ersten Mount (useEffect [])
2. Jedes Mal wenn `isVisible` true wird (damit neu angelegte Artikel sofort verfügbar sind)

### Totals (nur Anzeige, nicht in DB)
- Nën-Totali = Summe aller Gjithsejt
- TVSh 18% = Totali × 0.18
- TOTALI (me TVSh) = Totali × 1.18

### Buttons
- **🗑️ Clear** – ruft `onClear()` → `handleNeueRechnung()` → Remount, neue Rechnungsnummer
- **🖨️ Printo** – ruft `pdfDrucken()`, speichert NICHT in DB, bleibt auf Formular
- **💾 Ruaj** – speichert in DB, speichert PDF, zeigt Toast, ruft dann `onClear()` → Formular wird gecleart und neue Nummer geholt. Navigiert NICHT zur Liste.

### Ruaj-Ablauf (genau)
1. `speichernRechnung(toSave)` → bekommt neue ID
2. `pdfSpeichern(savedR)` → PDF wird gespeichert (Fehler werden nur geloggt, nicht dem User gezeigt)
3. Toast: "Fatura u ruajt: [Kennzeichen]" (grün, 3.5s)
4. `onClear()` → Formular zurücksetzen

### Fehlerbehandlung
- `DUPLICATE_NR_FATURA:X` → Toast "Nr. Faturës X ekziston tashmë!" (rot)
- Sonstiger Fehler → Toast "Gabim: [Fehlermeldung]" (rot)

---

## ListeView – genaues Verhalten

- Lädt Rechnungen beim Mount und jedes Mal wenn `isVisible` true wird
- Suche: Echtzeit, `suchenRechnungen(q)` bei jeder Eingabe
- **Suche durchsucht alle Felder:** kennzeichen, nr_fatura, nrv, faturoi, pagesa, kunde_name, kunde_nui, kunde_adresse, kunde_stadt, data_fatura
- Pro Karte: Kennzeichen (fett), Tags für Faturoi + Pagesa, Datum, Nr. Faturës, Totali rechts
- Hover zeigt Buttons: ✏️ Bearbeiten | 🖨️ Drucken | 🗑️ Löschen
- Löschen öffnet Bestätigungs-Dialog
- Klick auf Karte = Bearbeiten

---

## EinstellungenView (Artikujt)

- Artikel anlegen: Nummer (= ID), Beschreibung, Preis (ohne TVSh)
- `INSERT OR REPLACE` → Artikel mit gleicher Nummer wird überschrieben
- Liste zeigt alle Artikel sortiert nach Nummer
- Löschen mit Bestätigungs-Dialog

---

## BackupView

- **Backup erstellen:** ZIP mit `rechnungen.db` + allen PDFs aus `rechnungen_pdf/`
  - Name: `KienzleFAT_Backup_YYYY-MM-DD_HH-MM.zip`
  - Nach Erstellen: cleanup → max. 30 Backups (älteste werden gelöscht)
- **Backup importieren:** Datei-Dialog → ZIP auswählen → DB wird wiederhergestellt (alte DB wird als `_vorher.db` gesichert)
- **CSV importieren:** Datei-Dialog → Semikolon-getrennte CSV, 15 Spalten, Header-Zeile wird übersprungen
  - Spaltenreihenfolge: nrFatura; kennzeichen; nrv; dataFatura(TT/MM/JJJJ); pagesaDeri(TT/MM/JJJJ); faturoi; pagesa; kundeName; kundeNUI; kundeAdresse; kundeStadt; cope; artikelNr; pershkrimi; cmimi
  - Mehrere Zeilen mit gleicher nrFatura = eine Rechnung mit mehreren Positionen
  - Gesamter Import als eine SQLite-Transaction (alles oder nichts)
- **Auto-Backup:** Täglich beim App-Start, wenn noch kein Backup für heute existiert
- Gespeicherte Backups: Liste mit Datum, "Im Explorer" Button, "Wiederherstellen" Button

---

## PDF-Layout (pdf-lib, A4)

**Firma:** Kienzle Sh.P.K. | NUI: 812248773 | BpB 1304 0010 0416 0572
Adresse: Magistralja Ferizaj-Shkup p.n., 70000 Ferizaj, Kosove
Tel: +383 44 130 057 | tahokienzle1@gmail.com

**Aufbau von oben nach unten:**
1. Logo (links, aus `resources/logo.png`) + "Fatura" Schriftzug (rechts) + roter Balken
2. Info-Box (rechts): Datum, Nr. Faturës, Pagesa Deri, Faturoi, Pagesa, Nr. i Targes
3. Firmenadresse (links neben Info-Box)
4. Trennlinie
5. Kunden-Box (grauer Hintergrund, roter linker Streifen): Name, NUI, Adresse, Stadt
6. Tabelle: Cope | Artikel | Përshkrimi | Çmimi per cope | Gjithsejt
   - Abwechselnd weiß/hellgrau, mind. 5 Zeilen
7. Totals: Nën-Totali, TVSh 18%, Gesamtbetrag (rot, fett)
8. Footer: Nr. i Targes, NRV, Hinweistext auf Albanisch, Unterschriftenzeile

**PDF speichern:** `rechnungen_pdf/[Kennzeichen].pdf`
**PDF drucken:** In `temp/` speichern, mit `shell.openPath()` öffnen

---

## Fenster-Konfiguration
- Größe: 1200×780, Minimum: 1060×700
- `autoHideMenuBar: true`
- Titel: "KienzleFAT – Kienzle Sh.P.K."

---

## GitHub & Build-Prozess
- Repo: https://github.com/6d8qdztg8d-cell/KienzleFatura
- Branch: main
- Build: GitHub Actions `windows-latest` (kein Cross-Compile von macOS möglich)
- **Neuen Build auslösen:**
  1. Version in `package.json` updaten
  2. Version in `src/renderer/src/App.tsx` (Footer: `v1.0.X · ©2026 Kienzle Sh.P.K.`)
  3. `git add -A && git commit -m "vX.X.X" && git push origin main`
  4. `git tag vX.X.X && git push origin vX.X.X`
  5. **WICHTIG:** Tag muss exakt = package.json version sein, sonst heißt die .exe falsch

## Installer (NSIS)
- `appId: com.kienzle.fat`, `productName: KienzleFAT`
- `perMachine: true` → `C:\Program Files\`
- `oneClick: true`
- `build/installer.nsh` (customInit):
  - Beendet KienzleFAT.exe + KienzleFaktura.exe per taskkill
  - Löscht Registry-Keys: com.kienzle.fat, com.kienzle.faktura, KienzleFAT, KienzleFaktura
  - Löscht alte Installationsordner ($PROGRAMFILES64 + $PROGRAMFILES)
  → Neue .exe draufklicken reicht, kein manuelles Deinstallieren nötig

## Wichtige Dateien
- `package.json` – Version
- `electron-builder.yml` – Installer-Config
- `build/installer.nsh` – NSIS Custom-Script
- `download-page.html` – Vercel Download-Seite
- `.github/workflows/build-release.yml` – GitHub Actions (`permissions: contents: write`)
- `src/main/index.ts` – IPC-Handler, App-Init, autoBackup()
- `src/main/database.ts` – DB-Klasse, alle Queries
- `src/main/pdf-service.ts` – PDF erstellen/speichern/drucken
- `src/main/backup-service.ts` – Backup/Restore/CSV/AutoBackup
- `src/preload/index.ts` – window.api Definitionen
- `src/renderer/src/App.tsx` – Navigation, formKey, isVisible-Props
- `src/renderer/src/views/FormularView.tsx` – Hauptformular
- `src/renderer/src/views/ListeView.tsx` – Rechnungsliste
- `src/renderer/src/views/EinstellungenView.tsx` – Artikelverwaltung
- `src/renderer/src/views/BackupView.tsx` – Backup-UI

## Versionsstand
Aktuelle Version: **v1.0.30**
