import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'
import { app, shell } from 'electron'
import type { Rechnung } from './database'

const A4W = 595, A4H = 842
const margin = 50
const pageRight = 545
const secGap = 18
const innerPad = 10
const colRed     = rgb(0.84, 0.10, 0.10)
const colDark    = rgb(0.08, 0.08, 0.08)
const colGray    = rgb(0.45, 0.45, 0.45)
const colLightBg = rgb(0.95, 0.95, 0.95)
const colBorder  = rgb(0.78, 0.78, 0.78)

function fmtDate(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
  } catch { return isoStr }
}

function getResourcesPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '../../resources')
}

// pdf-lib StandardFonts (Helvetica) support Latin-1 / CP1252.
// Albanian ë (0xEB), ç (0xE7), ë are all in that range — they render correctly.

export async function createPDF(rechnung: Rechnung): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page   = pdfDoc.addPage([A4W, A4H])

  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  function f(weight = '') {
    return (weight === 'Bold' || weight === 'Medium') ? fontBold : fontReg
  }

  function txt(text: string, x: number, y: number, size = 9, weight = '', color = colDark) {
    if (!text) return
    try { page.drawText(text, { x, y, size, font: f(weight), color }) } catch { /* skip unencodable chars */ }
  }

  function txtR(text: string, rx: number, y: number, size = 9, weight = '', color = colDark) {
    if (!text) return
    try {
      const font = f(weight)
      const w = font.widthOfTextAtSize(text, size)
      page.drawText(text, { x: rx - w, y, size, font, color })
    } catch { /* skip unencodable chars */ }
  }

  function fill(x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
    page.drawRectangle({ x, y, width: w, height: h, color })
  }

  function box(x: number, y: number, w: number, h: number, strokeColor = colBorder, lw = 0.5) {
    page.drawRectangle({ x, y, width: w, height: h, borderColor: strokeColor, borderWidth: lw })
  }

  function hln(y: number, x1 = margin, x2 = pageRight, lw = 0.5, color = colBorder) {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: lw, color })
  }

  function vln(x: number, y1: number, y2: number, lw = 0.5, color = colBorder) {
    page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: lw, color })
  }

  // ── 1. HEADER ──────────────────────────────────────────────────
  const logoH      = 36
  const logoBottom = A4H - 24 - logoH   // 782

  const logoPath = path.join(getResourcesPath(), 'logo.png')
  if (fs.existsSync(logoPath)) {
    try {
      const logoBytes = fs.readFileSync(logoPath)
      const logoImg   = await pdfDoc.embedPng(logoBytes)
      const w = logoH * (logoImg.width / logoImg.height)
      page.drawImage(logoImg, { x: margin, y: logoBottom, width: w, height: logoH })
    } catch { txt('KIENZLE', margin, logoBottom + 8, 20, 'Bold', colRed) }
  } else {
    txt('KIENZLE', margin, logoBottom + 8, 20, 'Bold', colRed)
  }

  txt('Fatura', 398, logoBottom + 8, 20, 'Medium')

  // Red bar
  const barY = logoBottom - secGap
  fill(0, barY, 595, 2.5, colRed)

  // ── 2. INFO BOX + FIRMEN-ADRESSE ───────────────────────────────
  const blockTop = barY - secGap

  const ibLeft  = 358, ibRight = pageRight
  const ibRowH  = 15,  ibRows  = 4
  const ibH     = ibRows * ibRowH + 2 * innerPad
  const ibTop   = blockTop
  const ibBottom = ibTop - ibH
  const ibW     = ibRight - ibLeft

  fill(ibLeft, ibBottom, ibW, ibH, colLightBg)
  box(ibLeft, ibBottom, ibW, ibH, colBorder, 0.5)

  let iy = ibTop - innerPad - ibRowH / 2 - 3
  let isFirst = true
  function infoRow(label: string, value: string) {
    if (!isFirst) hln(iy + ibRowH / 2 + 4, ibLeft + 5, ibRight - 5, 0.3, rgb(0.82, 0.82, 0.82))
    isFirst = false
    txt(label, ibLeft + 8,  iy, 8.5, '',     colGray)
    txtR(value, ibRight - 8, iy, 8.5, 'Bold')
    iy -= ibRowH
  }

  infoRow('Data:',            fmtDate(rechnung.dataFatura))
  infoRow('Nr.i Fatur\xebs:', rechnung.nrFatura)
  infoRow('Pagesa deri m\xeb:', fmtDate(rechnung.pagesaDeri))
  infoRow('Pagesa:',          rechnung.pagesa)

  // Firmen-Adresse (links)
  const compLineH = 12
  let cy = blockTop - 1
  function compLine(t: string, weight = '', color = colDark) {
    txt(t, margin, cy, 8.5, weight, color); cy -= compLineH
  }
  compLine('Kienzle Sh.P.K.', 'Bold')
  compLine('NUI: 812248773', '', colGray)
  compLine('TVSh: 330675358', '', colGray)
  compLine('BpB 1304 0010 0416 0572', '', colGray)
  cy -= 4
  compLine('Magistralja Ferizaj-Shkup p.n.')
  compLine('70000 Ferizaj, Kosove')
  compLine('Tel: +383 44 130 057')
  compLine('tahokienzle1@gmail.com', '', colGray)

  const blockBottom = Math.min(ibBottom, cy)

  // ── 3. TRENNLINIE ──────────────────────────────────────────────
  const sepY = blockBottom - secGap
  hln(sepY, margin, pageRight, 0.7)

  // ── 4. KUNDEN-BOX ──────────────────────────────────────────────
  const custTop    = sepY - secGap
  const custHeight = 72
  const custBottom = custTop - custHeight
  const custRight  = 330

  fill(margin, custBottom, custRight - margin, custHeight, colLightBg)
  fill(margin, custBottom, 3, custHeight, colRed)
  box(margin, custBottom, custRight - margin, custHeight, colBorder, 0.5)

  txt('Fatura l\xebshohet p\xebr:', margin + 10, custTop - 11, 7.5, 'Medium', colGray)

  let custY = custTop - 23
  function custLine(t: string, weight = '') {
    if (!t) return
    txt(t, margin + 10, custY, 9, weight); custY -= 13
  }
  custLine(rechnung.kundeName, 'Bold')
  if (rechnung.kundeNUI) custLine(`NUI ${rechnung.kundeNUI}`)
  custLine(rechnung.kundeAdresse)
  custLine(rechnung.kundeStadt)

  // ── 5. TABELLE ─────────────────────────────────────────────────
  const tc1 = margin,       tc2 = margin + 38
  const tc3 = margin + 90,  tc4 = margin + 275
  const tc5 = margin + 395

  const tblTop    = custBottom - secGap
  const tblHdrH   = 18
  const tblHdrBot = tblTop - tblHdrH

  fill(tc1, tblHdrBot, pageRight - tc1, tblHdrH, colLightBg)
  hln(tblTop,    margin, pageRight, 0.8)
  hln(tblHdrBot, margin, pageRight, 0.8)
  vln(tc1,       tblHdrBot, tblTop, 0.8)
  vln(tc2,       tblHdrBot, tblTop)
  vln(tc3,       tblHdrBot, tblTop)
  vln(tc4,       tblHdrBot, tblTop)
  vln(tc5,       tblHdrBot, tblTop)
  vln(pageRight, tblHdrBot, tblTop, 0.8)

  const hY = tblTop - 13
  txt('Cop\xeb',               tc1 + 4, hY, 8.5, 'Medium', colGray)
  txt('Artikulli',            tc2 + 4, hY, 8.5, 'Medium', colGray)
  txt('P\xebrshkrimi',        tc3 + 4, hY, 8.5, 'Medium', colGray)
  txt('\xc7mimi p\xebr cop\xeb', tc4 + 4, hY, 8.5, 'Medium', colGray)
  txt('Gjith\xebsejt',        tc5 + 4, hY, 8.5, 'Medium', colGray)

  const rowH    = 20
  const minRows = 5
  let rowY      = tblHdrBot

  const filledPos = rechnung.positionen.filter(p => p.pershkrimi)

  for (let i = 0; i < filledPos.length; i++) {
    const pos = filledPos[i]
    if (i % 2 === 1) fill(tc1, rowY - rowH, pageRight - tc1, rowH, rgb(0.97, 0.97, 0.97))
    const ty   = rowY - rowH + 6
    const cVal = parseFloat(pos.cmimi.replace(',', '.')) || 0
    txt(pos.cope,      tc1 + 4, ty)
    txt(pos.artikelNr, tc2 + 4, ty)
    txt(pos.pershkrimi, tc3 + 4, ty)
    txtR(`${cVal.toFixed(2)} EUR`,          tc5 - 5, ty)
    txtR(`${pos.gjithsejt.toFixed(2)} EUR`, pageRight - 5, ty, 9, 'Medium')
    rowY -= rowH
    hln(rowY, margin, pageRight, 0.35)
  }

  for (let i = 0; i < Math.max(0, minRows - filledPos.length); i++) {
    rowY -= rowH; hln(rowY, margin, pageRight, 0.25)
  }
  hln(rowY, margin, pageRight, 0.8, rgb(0.55, 0.55, 0.55))

  // ── 6. TOTALS ──────────────────────────────────────────────────
  let totY = rowY - secGap * 0.75

  txt('\xc7mimi (pa TVSh)', tc4 + 5, totY, 8.5, '', colGray)
  txtR(`${rechnung.totali.toFixed(2)} EUR`, pageRight - 5, totY)

  totY -= 13
  const tvsh = rechnung.totali * 0.18
  txt('TVSh 18%', tc4 + 5, totY, 8.5, '', colGray)
  txtR(`${tvsh.toFixed(2)} EUR`, pageRight - 5, totY)

  totY -= 16
  const totalBrutto = rechnung.totali * 1.18
  fill(tc3, totY - 3, pageRight - tc3, 17, colLightBg)
  box(tc3,  totY - 3, pageRight - tc3, 17, colBorder, 0.5)
  txt('Totali', tc3 + 5, totY, 8.5, 'Medium')
  txtR(`${totalBrutto.toFixed(2)} EUR`, pageRight - 6, totY, 9, 'Bold', colRed)

  // ── 7. FOOTER ──────────────────────────────────────────────────
  if (rechnung.kennzeichen) txt(`Nr. i Targes: ${rechnung.kennzeichen}`, margin, 148, 8.5, 'Medium')
  if (rechnung.nrv && rechnung.nrv !== 'NRV-') txt(rechnung.nrv, margin, 135, 8.5)
  hln(124, margin, pageRight, 0.6)
  txt('Ju lutemi pagesa duhet te behet brenda 30 dite nga data e l\xebshimit te fatur\xebs.', margin, 110, 8, '', colGray)
  txt('Ju faleminderit per mirkuptim.', margin, 98, 8, '', colGray)
  txt('Klienti: ..............................', 338, 78)

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export async function pdfSpeichern(rechnung: Rechnung, pdfDir: string): Promise<string> {
  const data  = await createPDF(rechnung)
  const name  = (rechnung.kennzeichen || `fatura_${rechnung.id}`).replace(/[/\\]/g, '-')
  const fPath = path.join(pdfDir, `${name}.pdf`)
  fs.writeFileSync(fPath, data)
  return fPath
}

export async function pdfDrucken(rechnung: Rechnung): Promise<void> {
  const data    = await createPDF(rechnung)
  const tmpPath = path.join(app.getPath('temp'), `fatura_${rechnung.id || Date.now()}.pdf`)
  fs.writeFileSync(tmpPath, data)
  await shell.openPath(tmpPath)
}
