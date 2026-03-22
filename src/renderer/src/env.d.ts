/// <reference types="vite/client" />

interface Window {
  api: {
    alleRechnungen: () => Promise<any[]>
    suchenRechnungen: (q: string) => Promise<any[]>
    speichernRechnung: (r: any) => Promise<number>
    loeschenRechnung: (id: number) => Promise<void>
    naechsteNrFatura: () => Promise<string>
    suchenKunden: (q: string) => Promise<any[]>
    alleArtikel: () => Promise<any[]>
    speichernArtikel: (a: any) => Promise<void>
    loeschenArtikel: (nr: string) => Promise<void>
    pdfDrucken: (r: any) => Promise<void>
    pdfSpeichern: (r: any) => Promise<void>
    backupErstellen: () => Promise<string>
    backupImportieren: () => Promise<string | null>
    csvImportieren: () => Promise<number | null>
    alleBackups: () => Promise<any[]>
    backupWiederherstellen: (filePath: string) => Promise<void>
    backupImFinderOeffnen: (filePath: string) => Promise<void>
  }
}
