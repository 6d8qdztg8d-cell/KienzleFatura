import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { db } from './database'
import { pdfDrucken, pdfSpeichern } from './pdf-service'
import {
  backupErstellen, backupWiederherstellen, alleBackups,
  backupImFinderOeffnen, csvImportieren, csvExportieren, autoBackup
} from './backup-service'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 1060,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'KienzleFAT – Kienzle Sh.P.K.',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.kienzle.faktura')
  autoBackup()
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  // ── DB ────────────────────────────────────────────────────────
  ipcMain.handle('db:alleRechnungen', () => {
    try { return db.alleRechnungen() } catch (e) { console.error(e); return [] }
  })
  ipcMain.handle('db:suchen', (_, q: string) => {
    try { return db.suchen(q) } catch (e) { console.error(e); return [] }
  })
  ipcMain.handle('db:speichern', (_, r) => {
    try { return db.speichern(r) } catch (e) { console.error(e); throw e }
  })
  ipcMain.handle('db:loeschen', (_, id: number) => {
    try { db.loeschen(id) } catch (e) { console.error(e) }
  })
  ipcMain.handle('db:naechsteNrFatura', () => {
    try { return db.naechsteNrFatura() } catch (e) { console.error(e); return '1494' }
  })
  ipcMain.handle('db:alleArtikel', () => {
    try { return db.alleArtikel() } catch (e) { console.error(e); return [] }
  })
  ipcMain.handle('db:speichernArtikel', (_, a) => {
    try { db.artikelSpeichern(a) } catch (e) { console.error(e); throw e }
  })
  ipcMain.handle('db:loeschenArtikel', (_, nr: string) => {
    try { db.artikelLoeschen(nr) } catch (e) { console.error(e) }
  })
  ipcMain.handle('db:suchenKunden', (_, q: string) => {
    try { return db.suchenKunden(q) } catch (e) { console.error(e); return [] }
  })
  ipcMain.handle('db:faturatPapagura', () => {
    try { return db.faturatPapagura() } catch (e) { console.error(e); return [] }
  })
  ipcMain.handle('db:markuarSiPaguar', (_, id: number) => {
    try { db.markuarSiPaguar(id) } catch (e) { console.error(e) }
  })

  // ── PDF ───────────────────────────────────────────────────────
  ipcMain.handle('pdf:drucken', async (_, r) => {
    try { await pdfDrucken(r) } catch (e) { console.error('PDF print error:', e); throw e }
  })
  ipcMain.handle('pdf:speichern', async (_, r) => {
    try { await pdfSpeichern(r, db.pdfDir) } catch (e) { console.error('PDF save error:', e) }
  })

  // ── Backup ────────────────────────────────────────────────────
  ipcMain.handle('backup:erstellen', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      title: 'Zgjidhni dosjen për backup',
      properties: ['openDirectory']
    })
    if (result.canceled || !result.filePaths.length) return null
    try { return backupErstellen(result.filePaths[0]) } catch (e) { console.error(e); throw e }
  })

  ipcMain.handle('backup:importieren', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      title: 'Backup-ZIP auswählen',
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths.length) return null
    try { backupWiederherstellen(result.filePaths[0]); return 'ok' }
    catch (e) { console.error(e); throw e }
  })

  ipcMain.handle('backup:wiederherstellen', (_, filePath: string) => {
    try { backupWiederherstellen(filePath) } catch (e) { console.error(e); throw e }
  })

  ipcMain.handle('backup:csvImportieren', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      title: 'CSV-Datei auswählen (Trennzeichen: Semikolon)',
      filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths.length) return null
    try { return csvImportieren(result.filePaths[0]) }
    catch (e) { console.error(e); throw e }
  })

  ipcMain.handle('backup:csvExportieren', async (event, filter: { emriKlientit: string; vonDatum: string; bisDatum: string }) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const { csv, count } = csvExportieren(filter)
    if (count === 0) return { count: 0, saved: false }
    const today = new Date().toISOString().substring(0, 10)
    const result = await dialog.showSaveDialog(win, {
      title: 'CSV-Export speichern',
      defaultPath: `KienzleFAT_Export_${today}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return { count, saved: false }
    fs.writeFileSync(result.filePath, '\ufeff' + csv, 'utf8')
    return { count, saved: true }
  })

  ipcMain.handle('backup:alleBackups', () => {
    try { return alleBackups() } catch (e) { console.error(e); return [] }
  })
  ipcMain.handle('backup:imFinderOeffnen', (_, filePath: string) => {
    backupImFinderOeffnen(filePath)
  })

  createWindow()
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
