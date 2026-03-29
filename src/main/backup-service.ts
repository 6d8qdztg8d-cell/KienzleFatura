import * as fs from 'fs'
import * as path from 'path'
import AdmZip from 'adm-zip'
import { shell } from 'electron'
import type { Rechnung, Position } from './database'
import { db } from './database'

const MAX_BACKUPS = 30

function alteBackupsAufraeumen(): void {
  const backups = alleBackups()
  if (backups.length > MAX_BACKUPS) {
    backups.slice(MAX_BACKUPS).forEach(b => {
      try { fs.unlinkSync(b.filePath) } catch {}
    })
  }
}

export function autoBackup(): void {
  const backups = alleBackups()
  const vor7Tagen = Date.now() - 7 * 24 * 60 * 60 * 1000
  const kurzlichExistiert = backups.some(b => new Date(b.created).getTime() > vor7Tagen)
  if (!kurzlichExistiert) {
    try { backupErstellen() } catch (e) { console.error('Auto-backup failed:', e) }
  }
}

export function backupErstellen(destDir?: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const name = `KienzleFAT_Backup_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`
  const zipPath = path.join(destDir ?? db.backupDir, `${name}.zip`)

  const zip = new AdmZip()

  if (fs.existsSync(db.dbPath)) {
    zip.addLocalFile(db.dbPath, '', 'rechnungen.db')
  }

  if (fs.existsSync(db.pdfDir)) {
    const files = fs.readdirSync(db.pdfDir)
    for (const file of files) {
      const fp = path.join(db.pdfDir, file)
      if (fs.statSync(fp).isFile()) {
        zip.addLocalFile(fp, 'rechnungen_pdf')
      }
    }
  }

  zip.writeZip(zipPath)
  alteBackupsAufraeumen()
  return zipPath
}

export function backupWiederherstellen(zipPath: string): void {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()

  const dbEntry = entries.find(e => e.entryName === 'rechnungen.db' || e.name === 'rechnungen.db')
  if (dbEntry) {
    const backupOld = db.dbPath.replace('.db', '_vorher.db')
    if (fs.existsSync(db.dbPath)) {
      try { fs.copyFileSync(db.dbPath, backupOld) } catch {}
    }
    fs.writeFileSync(db.dbPath, dbEntry.getData())
  }
}

export function alleBackups(): { name: string; filePath: string; created: string }[] {
  if (!fs.existsSync(db.backupDir)) return []
  const files = fs.readdirSync(db.backupDir)
    .filter(f => f.endsWith('.zip'))
    .map(f => {
      const fp = path.join(db.backupDir, f)
      const stat = fs.statSync(fp)
      return { name: f, filePath: fp, created: stat.birthtime.toISOString() }
    })
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  return files
}

export function backupImFinderOeffnen(filePath: string): void {
  shell.showItemInFolder(filePath)
}

function trim(s: string) { return s.trim() }

export function csvExportieren(filter: { emriKlientit: string; vonDatum: string; bisDatum: string }): { csv: string; count: number } {
  const faturat = db.rechnungenFiltern(filter.emriKlientit, filter.vonDatum, filter.bisDatum)

  const formatDate = (iso: string): string => {
    const d = iso ? iso.substring(0, 10) : ''
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : d
  }

  const lines: string[] = []
  lines.push('nrFatura;targa;nrv;dataFatura;pagesaDeri;pagesa;emriKlientit;nuiKlientit;adresaKlientit;qytetiKlientit;cope;artikelNr;pershkrimi;cmimi')

  for (const r of faturat) {
    if (r.pozicionet.length === 0) {
      lines.push([r.nrFatura, r.targa, r.nrv, formatDate(r.dataFatura), formatDate(r.pagesaDeri), r.pagesa, r.emriKlientit, r.nuiKlientit, r.adresaKlientit, r.qytetiKlientit, '', '', '', ''].join(';'))
    } else {
      for (const pos of r.pozicionet) {
        lines.push([r.nrFatura, r.targa, r.nrv, formatDate(r.dataFatura), formatDate(r.pagesaDeri), r.pagesa, r.emriKlientit, r.nuiKlientit, r.adresaKlientit, r.qytetiKlientit, pos.cope, pos.artikelNr, pos.pershkrimi, pos.cmimi].join(';'))
      }
    }
  }

  return { csv: lines.join('\r\n'), count: faturat.length }
}

export function csvImportieren(csvPath: string): number {
  const raw = fs.readFileSync(csvPath, 'utf8')
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)

  if (lines.length < 2) {
    throw new Error('CSV ist leer oder hat nur den Header.')
  }

  const dataLines = lines.slice(1)

  const gruppen: Map<string, { rechnung: Partial<Rechnung>; pozicionet: Position[] }> = new Map()
  const reihenfolge: string[] = []

  for (const line of dataLines) {
    const cols = line.split(';')
    if (cols.length < 14) continue

    const nrFatura      = trim(cols[0])
    const targa         = trim(cols[1])
    const nrv           = trim(cols[2])
    const dataFatura    = parseDate(trim(cols[3]))
    const pagesaDeri    = parseDate(trim(cols[4]))
    const pagesa        = trim(cols[5])
    const emriKlientit  = trim(cols[6])
    const nuiKlientit   = trim(cols[7])
    const adresaKlientit = trim(cols[8])
    const qytetiKlientit = trim(cols[9])
    const cope          = trim(cols[10])
    const artikelNr     = trim(cols[11])
    const pershkrimi    = trim(cols[12])
    const cmimi         = trim(cols[13])

    if (!gruppen.has(nrFatura)) {
      gruppen.set(nrFatura, {
        rechnung: {
          id: 0, targa, nrFatura, nrv, pagesa,
          dataFatura, pagesaDeri, emriKlientit, nuiKlientit, adresaKlientit, qytetiKlientit,
          totali: 0
        },
        pozicionet: []
      })
      reihenfolge.push(nrFatura)
    }

    if (pershkrimi) {
      const anz = parseFloat(cope.replace(',', '.')) || 0
      const prs = parseFloat(cmimi.replace(',', '.')) || 0
      const pos: Position = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        cope, artikelNr, pershkrimi, cmimi,
        gjithsejt: anz * prs
      }
      gruppen.get(nrFatura)!.pozicionet.push(pos)
    }
  }

  let anzahl = 0
  const importAll = db.transaction(() => {
    for (const nr of reihenfolge) {
      const entry = gruppen.get(nr)
      if (!entry) continue
      entry.rechnung.pozicionet = entry.pozicionet.length > 0 ? entry.pozicionet : [{
        id: `empty-${Date.now()}`, cope: '', artikelNr: '', pershkrimi: '', cmimi: '', gjithsejt: 0
      }]
      entry.rechnung.totali = entry.rechnung.pozicionet!.reduce((s, p) => s + p.gjithsejt, 0)
      db.speichern(entry.rechnung as Rechnung)
      anzahl++
    }
  })
  importAll()
  return anzahl
}

function parseDate(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) {
    return new Date(`${m[3]}-${m[2]}-${m[1]}`).toISOString()
  }
  return new Date().toISOString()
}
