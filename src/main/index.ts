import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { db } from './database'
import { pdfDrucken, pdfSpeichern } from './pdf-service'
import {
  backupErstellen, backupWiederherstellen, alleBackups,
  backupImFinderOeffnen, csvImportieren
} from './backup-service'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 1060,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    title: 'KienzleFaktura – Kienzle Sh.P.K.',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

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

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ── DB handlers ──────────────────────────────────────────────
  ipcMain.handle('db:alleRechnungen', () => db.alleRechnungen())
  ipcMain.handle('db:suchen', (_, q: string) => db.suchen(q))
  ipcMain.handle('db:speichern', (_, r) => db.speichern(r))
  ipcMain.handle('db:loeschen', (_, id: number) => db.loeschen(id))
  ipcMain.handle('db:naechsteNrFatura', () => db.naechsteNrFatura())
  ipcMain.handle('db:alleArtikel', () => db.alleArtikel())
  ipcMain.handle('db:speichernArtikel', (_, a) => db.artikelSpeichern(a))
  ipcMain.handle('db:loeschenArtikel', (_, nr: string) => db.artikelLoeschen(nr))

  // ── PDF handlers ─────────────────────────────────────────────
  ipcMain.handle('pdf:drucken', async (_, r) => {
    await pdfDrucken(r)
  })
  ipcMain.handle('pdf:speichern', async (_, r) => {
    await pdfSpeichern(r, db.pdfDir)
  })

  // ── Backup handlers ──────────────────────────────────────────
  ipcMain.handle('backup:erstellen', () => {
    return backupErstellen()
  })

  ipcMain.handle('backup:importieren', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      title: 'Backup-ZIP auswählen',
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    backupWiederherstellen(result.filePaths[0])
    return 'ok'
  })

  ipcMain.handle('backup:wiederherstellen', (_, filePath: string) => {
    backupWiederherstellen(filePath)
  })

  ipcMain.handle('backup:csvImportieren', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)!
    const result = await dialog.showOpenDialog(win, {
      title: 'CSV-Datei auswählen (Trennzeichen: Semikolon)',
      filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return csvImportieren(result.filePaths[0])
  })

  ipcMain.handle('backup:alleBackups', () => alleBackups())
  ipcMain.handle('backup:imFinderOeffnen', (_, filePath: string) => backupImFinderOeffnen(filePath))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
