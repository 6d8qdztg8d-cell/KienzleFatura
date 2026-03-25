import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Rechnungen
  alleRechnungen: () => ipcRenderer.invoke('db:alleRechnungen'),
  suchenRechnungen: (q: string) => ipcRenderer.invoke('db:suchen', q),
  speichernRechnung: (r: any) => ipcRenderer.invoke('db:speichern', r),
  loeschenRechnung: (id: number) => ipcRenderer.invoke('db:loeschen', id),
  naechsteNrFatura: () => ipcRenderer.invoke('db:naechsteNrFatura'),
  suchenKunden: (q: string) => ipcRenderer.invoke('db:suchenKunden', q),

  // Artikel
  alleArtikel: () => ipcRenderer.invoke('db:alleArtikel'),
  speichernArtikel: (a: any) => ipcRenderer.invoke('db:speichernArtikel', a),
  loeschenArtikel: (nr: string) => ipcRenderer.invoke('db:loeschenArtikel', nr),

  // PDF
  pdfDrucken: (r: any) => ipcRenderer.invoke('pdf:drucken', r),
  pdfSpeichern: (r: any) => ipcRenderer.invoke('pdf:speichern', r),

  // Backup
  backupErstellen: () => ipcRenderer.invoke('backup:erstellen'),
  backupImportieren: () => ipcRenderer.invoke('backup:importieren'),
  csvImportieren: () => ipcRenderer.invoke('backup:csvImportieren'),
  csvExportieren: (filter: { emriKlientit: string; vonDatum: string; bisDatum: string }) => ipcRenderer.invoke('backup:csvExportieren', filter),
  alleBackups: () => ipcRenderer.invoke('backup:alleBackups'),
  backupWiederherstellen: (filePath: string) => ipcRenderer.invoke('backup:wiederherstellen', filePath),
  backupImFinderOeffnen: (filePath: string) => ipcRenderer.invoke('backup:imFinderOeffnen', filePath),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
