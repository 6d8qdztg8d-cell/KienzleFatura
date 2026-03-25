import Database from 'better-sqlite3'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export interface Position {
  id: string
  cope: string
  artikelNr: string
  pershkrimi: string
  cmimi: string
  gjithsejt: number
}

export interface Rechnung {
  id: number
  kennzeichen: string
  nrFatura: string
  nrv: string
  faturoi: string
  pagesa: string
  dataFatura: string
  pagesaDeri: string
  kundeName: string
  kundeNUI: string
  kundeAdresse: string
  kundeStadt: string
  positionen: Position[]
  totali: number
  erstellt: string
  geaendert: string
}

export interface Artikel {
  id: string
  beschreibung: string
  preis: number
}

function getAppDir(): string {
  const dir = path.join(app.getPath('userData'), 'KienzleFAT')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

class DatenbankService {
  private db: Database.Database
  readonly dbPath: string
  readonly pdfDir: string
  readonly backupDir: string

  constructor() {
    const appDir = getAppDir()
    this.dbPath = path.join(appDir, 'rechnungen.db')
    this.pdfDir = path.join(appDir, 'rechnungen_pdf')
    this.backupDir = path.join(appDir, 'backups')
    fs.mkdirSync(this.pdfDir, { recursive: true })
    fs.mkdirSync(this.backupDir, { recursive: true })
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('foreign_keys = ON')
    this.createTables()
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rechnungen (
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
        positionen    TEXT DEFAULT '[]',
        totali        REAL DEFAULT 0,
        pdf_path      TEXT DEFAULT '',
        erstellt      TEXT DEFAULT '',
        geaendert     TEXT DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS artikel (
        nummer        TEXT PRIMARY KEY,
        beschreibung  TEXT DEFAULT '',
        preis         REAL DEFAULT 0
      );
    `)
    try {
      this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_nr_fatura_unique ON rechnungen(nr_fatura) WHERE nr_fatura != ''`)
    } catch (e) {
      console.warn('Index already exists or could not be created:', e)
    }
  }

  private rowToRechnung(row: any): Rechnung {
    return {
      id: row.id,
      kennzeichen: row.kennzeichen || '',
      nrFatura: row.nr_fatura || '',
      nrv: row.nrv || 'NRV-',
      faturoi: row.faturoi || 'Ibrahim',
      pagesa: row.pagesa || 'Bank',
      dataFatura: row.data_fatura || new Date().toISOString(),
      pagesaDeri: row.pagesa_deri || new Date().toISOString(),
      kundeName: row.kunde_name || '',
      kundeNUI: row.kunde_nui || '',
      kundeAdresse: row.kunde_adresse || '',
      kundeStadt: row.kunde_stadt || '',
      positionen: (() => {
        try { return JSON.parse(row.positionen || '[]') } catch { return [] }
      })(),
      totali: row.totali || 0,
      erstellt: row.erstellt || '',
      geaendert: row.geaendert || ''
    }
  }

  alleRechnungen(): Rechnung[] {
    const rows = this.db.prepare('SELECT * FROM rechnungen ORDER BY erstellt DESC').all()
    return rows.map(r => this.rowToRechnung(r))
  }

  suchen(q: string): Rechnung[] {
    const pat = `%${q}%`
    const rows = this.db.prepare(
      `SELECT * FROM rechnungen WHERE
        kennzeichen LIKE ? OR nr_fatura LIKE ? OR nrv LIKE ? OR faturoi LIKE ? OR pagesa LIKE ?
        OR kunde_name LIKE ? OR kunde_nui LIKE ? OR kunde_adresse LIKE ? OR kunde_stadt LIKE ?
        OR data_fatura LIKE ?
      ORDER BY erstellt DESC`
    ).all(pat, pat, pat, pat, pat, pat, pat, pat, pat, pat)
    return rows.map(r => this.rowToRechnung(r))
  }

  laden(id: number): Rechnung | null {
    const row = this.db.prepare('SELECT * FROM rechnungen WHERE id = ?').get(id)
    return row ? this.rowToRechnung(row) : null
  }

  speichern(r: Rechnung): number {
    const now = new Date().toISOString()
    const posJson = JSON.stringify(r.positionen)

    if (!r.id || r.id === 0) {
      const existing = this.db.prepare("SELECT id FROM rechnungen WHERE nr_fatura = ? AND nr_fatura != ''").get(r.nrFatura)
      if (existing) throw new Error(`DUPLICATE_NR_FATURA:${r.nrFatura}`)
      const stmt = this.db.prepare(`
        INSERT INTO rechnungen
        (kennzeichen,nr_fatura,nrv,faturoi,pagesa,data_fatura,pagesa_deri,
         kunde_name,kunde_nui,kunde_adresse,kunde_stadt,positionen,totali,pdf_path,erstellt,geaendert)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      const result = stmt.run(
        r.kennzeichen, r.nrFatura, r.nrv, r.faturoi, r.pagesa,
        r.dataFatura, r.pagesaDeri, r.kundeName, r.kundeNUI,
        r.kundeAdresse, r.kundeStadt, posJson, r.totali, '', now, now
      )
      return result.lastInsertRowid as number
    } else {
      this.db.prepare(`
        UPDATE rechnungen SET
        kennzeichen=?,nr_fatura=?,nrv=?,faturoi=?,pagesa=?,data_fatura=?,pagesa_deri=?,
        kunde_name=?,kunde_nui=?,kunde_adresse=?,kunde_stadt=?,positionen=?,totali=?,geaendert=?
        WHERE id=?
      `).run(
        r.kennzeichen, r.nrFatura, r.nrv, r.faturoi, r.pagesa,
        r.dataFatura, r.pagesaDeri, r.kundeName, r.kundeNUI,
        r.kundeAdresse, r.kundeStadt, posJson, r.totali, now, r.id
      )
      return r.id
    }
  }

  naechsteNrFatura(): string {
    let maxNr = 1493
    const rows = this.db.prepare('SELECT nr_fatura FROM rechnungen').all() as any[]
    for (const row of rows) {
      const n = parseInt(row.nr_fatura)
      if (!isNaN(n) && n > maxNr) maxNr = n
    }
    return String(maxNr + 1)
  }

  loeschen(id: number) {
    this.db.prepare('DELETE FROM rechnungen WHERE id=?').run(id)
  }

  alleArtikel(): Artikel[] {
    const rows = this.db.prepare('SELECT nummer,beschreibung,preis FROM artikel ORDER BY nummer').all() as any[]
    return rows.map(r => ({ id: r.nummer, beschreibung: r.beschreibung, preis: r.preis }))
  }

  artikelSpeichern(a: Artikel) {
    this.db.prepare('INSERT OR REPLACE INTO artikel(nummer,beschreibung,preis) VALUES(?,?,?)').run(a.id, a.beschreibung, a.preis)
  }

  transaction<T>(fn: () => T): () => T {
    return this.db.transaction(fn)
  }

  artikelLoeschen(nummer: string) {
    this.db.prepare('DELETE FROM artikel WHERE nummer=?').run(nummer)
  }

  rechnungenFiltern(kundeName: string, vonDatum: string, bisDatum: string): Rechnung[] {
    const conditions: string[] = []
    const params: any[] = []
    if (kundeName && kundeName.trim()) {
      conditions.push('kunde_name LIKE ?')
      params.push(`%${kundeName.trim()}%`)
    }
    if (vonDatum) {
      conditions.push("SUBSTR(data_fatura, 1, 10) >= ?")
      params.push(vonDatum)
    }
    if (bisDatum) {
      conditions.push("SUBSTR(data_fatura, 1, 10) <= ?")
      params.push(bisDatum)
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = this.db.prepare(`SELECT * FROM rechnungen ${where} ORDER BY data_fatura ASC`).all(...params)
    return rows.map(r => this.rowToRechnung(r))
  }

  suchenKunden(q: string): { kundeName: string; kundeNUI: string; kundeAdresse: string; kundeStadt: string }[] {
    if (!q || q.trim().length === 0) return []
    const pat = `%${q}%`
    const rows = this.db.prepare(`
      SELECT kunde_name, kunde_nui, kunde_adresse, kunde_stadt,
             MAX(erstellt) as letzte
      FROM rechnungen
      WHERE kunde_name LIKE ? AND kunde_name != ''
      GROUP BY kunde_name, kunde_nui, kunde_adresse, kunde_stadt
      ORDER BY letzte DESC
      LIMIT 8
    `).all(pat) as any[]
    return rows.map(r => ({
      kundeName: r.kunde_name || '',
      kundeNUI: r.kunde_nui || '',
      kundeAdresse: r.kunde_adresse || '',
      kundeStadt: r.kunde_stadt || ''
    }))
  }
}

export const db = new DatenbankService()
