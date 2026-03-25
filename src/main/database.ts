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
  targa: string
  nrFatura: string
  nrv: string
  faturoi: string
  pagesa: string
  dataFatura: string
  pagesaDeri: string
  emriKlientit: string
  nuiKlientit: string
  adresaKlientit: string
  qytetiKlientit: string
  pozicionet: Position[]
  totali: number
  krijuar: string
  ndryshuar: string
}

export interface Artikel {
  id: string
  pershkrimi: string
  cmimi: number
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
    this.migrateToAlbanian()
    this.createTables()
  }

  private migrateToAlbanian() {
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]
    const tableNames = tables.map((t: any) => t.name)

    if (tableNames.includes('rechnungen')) {
      try { this.db.exec('ALTER TABLE rechnungen RENAME TO faturat') } catch {}
    }
    if (tableNames.includes('artikel')) {
      try { this.db.exec('ALTER TABLE artikel RENAME TO artikujt') } catch {}
    }

    const faturaRenames: [string, string][] = [
      ['kennzeichen',   'targa'],
      ['kunde_name',    'emri_klientit'],
      ['kunde_nui',     'nui_klientit'],
      ['kunde_adresse', 'adresa_klientit'],
      ['kunde_stadt',   'qyteti_klientit'],
      ['positionen',    'pozicionet'],
      ['erstellt',      'krijuar'],
      ['geaendert',     'ndryshuar'],
      ['pdf_path',      'pdf_shtegu'],
    ]
    for (const [oldName, newName] of faturaRenames) {
      try { this.db.exec(`ALTER TABLE faturat RENAME COLUMN ${oldName} TO ${newName}`) } catch {}
    }

    const artikelRenames: [string, string][] = [
      ['nummer',       'numri'],
      ['beschreibung', 'pershkrimi'],
      ['preis',        'cmimi'],
    ]
    for (const [oldName, newName] of artikelRenames) {
      try { this.db.exec(`ALTER TABLE artikujt RENAME COLUMN ${oldName} TO ${newName}`) } catch {}
    }
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS faturat (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        targa             TEXT NOT NULL DEFAULT '',
        nr_fatura         TEXT DEFAULT '',
        nrv               TEXT DEFAULT 'NRV-',
        faturoi           TEXT DEFAULT 'Ibrahim',
        pagesa            TEXT DEFAULT 'Bank',
        data_fatura       TEXT DEFAULT '',
        pagesa_deri       TEXT DEFAULT '',
        emri_klientit     TEXT DEFAULT '',
        nui_klientit      TEXT DEFAULT '',
        adresa_klientit   TEXT DEFAULT '',
        qyteti_klientit   TEXT DEFAULT '',
        pozicionet        TEXT DEFAULT '[]',
        totali            REAL DEFAULT 0,
        pdf_shtegu        TEXT DEFAULT '',
        krijuar           TEXT DEFAULT '',
        ndryshuar         TEXT DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS artikujt (
        numri         TEXT PRIMARY KEY,
        pershkrimi    TEXT DEFAULT '',
        cmimi         REAL DEFAULT 0
      );
    `)
    try {
      this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_nr_fatura_unique ON faturat(nr_fatura) WHERE nr_fatura != ''`)
    } catch (e) {
      console.warn('Index already exists or could not be created:', e)
    }
  }

  private rowToRechnung(row: any): Rechnung {
    return {
      id: row.id,
      targa: row.targa || '',
      nrFatura: row.nr_fatura || '',
      nrv: row.nrv || 'NRV-',
      faturoi: row.faturoi || 'Ibrahim',
      pagesa: row.pagesa || 'Bank',
      dataFatura: row.data_fatura || new Date().toISOString(),
      pagesaDeri: row.pagesa_deri || new Date().toISOString(),
      emriKlientit: row.emri_klientit || '',
      nuiKlientit: row.nui_klientit || '',
      adresaKlientit: row.adresa_klientit || '',
      qytetiKlientit: row.qyteti_klientit || '',
      pozicionet: (() => {
        try { return JSON.parse(row.pozicionet || '[]') } catch { return [] }
      })(),
      totali: row.totali || 0,
      krijuar: row.krijuar || '',
      ndryshuar: row.ndryshuar || ''
    }
  }

  alleRechnungen(): Rechnung[] {
    const rows = this.db.prepare('SELECT * FROM faturat ORDER BY krijuar DESC').all()
    return rows.map(r => this.rowToRechnung(r))
  }

  suchen(q: string): Rechnung[] {
    const pat = `%${q}%`
    const rows = this.db.prepare(
      `SELECT * FROM faturat WHERE
        targa LIKE ? OR nr_fatura LIKE ? OR nrv LIKE ? OR faturoi LIKE ? OR pagesa LIKE ?
        OR emri_klientit LIKE ? OR nui_klientit LIKE ? OR adresa_klientit LIKE ? OR qyteti_klientit LIKE ?
        OR data_fatura LIKE ?
      ORDER BY krijuar DESC`
    ).all(pat, pat, pat, pat, pat, pat, pat, pat, pat, pat)
    return rows.map(r => this.rowToRechnung(r))
  }

  laden(id: number): Rechnung | null {
    const row = this.db.prepare('SELECT * FROM faturat WHERE id = ?').get(id)
    return row ? this.rowToRechnung(row) : null
  }

  speichern(r: Rechnung): number {
    const now = new Date().toISOString()
    const pozJson = JSON.stringify(r.pozicionet)

    if (!r.id || r.id === 0) {
      const existing = this.db.prepare("SELECT id FROM faturat WHERE nr_fatura = ? AND nr_fatura != ''").get(r.nrFatura)
      if (existing) throw new Error(`DUPLICATE_NR_FATURA:${r.nrFatura}`)
      const stmt = this.db.prepare(`
        INSERT INTO faturat
        (targa,nr_fatura,nrv,faturoi,pagesa,data_fatura,pagesa_deri,
         emri_klientit,nui_klientit,adresa_klientit,qyteti_klientit,pozicionet,totali,pdf_shtegu,krijuar,ndryshuar)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      const result = stmt.run(
        r.targa, r.nrFatura, r.nrv, r.faturoi, r.pagesa,
        r.dataFatura, r.pagesaDeri, r.emriKlientit, r.nuiKlientit,
        r.adresaKlientit, r.qytetiKlientit, pozJson, r.totali, '', now, now
      )
      return result.lastInsertRowid as number
    } else {
      this.db.prepare(`
        UPDATE faturat SET
        targa=?,nr_fatura=?,nrv=?,faturoi=?,pagesa=?,data_fatura=?,pagesa_deri=?,
        emri_klientit=?,nui_klientit=?,adresa_klientit=?,qyteti_klientit=?,pozicionet=?,totali=?,ndryshuar=?
        WHERE id=?
      `).run(
        r.targa, r.nrFatura, r.nrv, r.faturoi, r.pagesa,
        r.dataFatura, r.pagesaDeri, r.emriKlientit, r.nuiKlientit,
        r.adresaKlientit, r.qytetiKlientit, pozJson, r.totali, now, r.id
      )
      return r.id
    }
  }

  naechsteNrFatura(): string {
    let maxNr = 1493
    const rows = this.db.prepare('SELECT nr_fatura FROM faturat').all() as any[]
    for (const row of rows) {
      const n = parseInt(row.nr_fatura)
      if (!isNaN(n) && n > maxNr) maxNr = n
    }
    return String(maxNr + 1)
  }

  loeschen(id: number) {
    this.db.prepare('DELETE FROM faturat WHERE id=?').run(id)
  }

  alleArtikel(): Artikel[] {
    const rows = this.db.prepare('SELECT numri, pershkrimi, cmimi FROM artikujt ORDER BY numri').all() as any[]
    return rows.map(r => ({ id: r.numri, pershkrimi: r.pershkrimi, cmimi: r.cmimi }))
  }

  artikelSpeichern(a: Artikel) {
    this.db.prepare('INSERT OR REPLACE INTO artikujt(numri,pershkrimi,cmimi) VALUES(?,?,?)').run(a.id, a.pershkrimi, a.cmimi)
  }

  transaction<T>(fn: () => T): () => T {
    return this.db.transaction(fn)
  }

  artikelLoeschen(nummer: string) {
    this.db.prepare('DELETE FROM artikujt WHERE numri=?').run(nummer)
  }

  suchenKunden(q: string): { emriKlientit: string; nuiKlientit: string; adresaKlientit: string; qytetiKlientit: string }[] {
    if (!q || q.trim().length === 0) return []
    const pat = `%${q}%`
    const rows = this.db.prepare(`
      SELECT emri_klientit, nui_klientit, adresa_klientit, qyteti_klientit,
             MAX(krijuar) as e_fundit
      FROM faturat
      WHERE emri_klientit LIKE ? AND emri_klientit != ''
      GROUP BY emri_klientit, nui_klientit, adresa_klientit, qyteti_klientit
      ORDER BY e_fundit DESC
      LIMIT 8
    `).all(pat) as any[]
    return rows.map(r => ({
      emriKlientit: r.emri_klientit || '',
      nuiKlientit: r.nui_klientit || '',
      adresaKlientit: r.adresa_klientit || '',
      qytetiKlientit: r.qyteti_klientit || ''
    }))
  }

  rechnungenFiltern(emriKlientit: string, vonDatum: string, bisDatum: string): Rechnung[] {
    const conditions: string[] = []
    const params: any[] = []
    if (emriKlientit && emriKlientit.trim()) {
      conditions.push('emri_klientit LIKE ?')
      params.push(`%${emriKlientit.trim()}%`)
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
    const rows = this.db.prepare(`SELECT * FROM faturat ${where} ORDER BY data_fatura ASC`).all(...params)
    return rows.map(r => this.rowToRechnung(r))
  }
}

export const db = new DatenbankService()
