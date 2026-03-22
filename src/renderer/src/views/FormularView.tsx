import React, { useState, useEffect, useCallback } from 'react'

interface Position {
  id: string
  cope: string
  artikelNr: string
  pershkrimi: string
  cmimi: string
  gjithsejt: number
}

interface Rechnung {
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
}

interface Props {
  rechnung: Rechnung | null
  onSaved: () => void
}

const FATUROIS = ['Ibrahim', 'Cufa', 'Agnesa']
const ZAHLUNGSARTEN = ['Bank', 'Cash']

function toInputDate(iso: string): string {
  try { return new Date(iso).toISOString().slice(0, 10) } catch { return '' }
}

function fromInputDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString()
  return new Date(dateStr + 'T12:00:00').toISOString()
}

function newPosition(): Position {
  return { id: `p-${Date.now()}-${Math.random()}`, cope: '', artikelNr: '', pershkrimi: '', cmimi: '', gjithsejt: 0 }
}

function newRechnung(): Rechnung {
  const now = new Date()
  const due = new Date(); due.setDate(due.getDate() + 30)
  return {
    id: 0, kennzeichen: '', nrFatura: '', nrv: 'NRV-',
    faturoi: 'Ibrahim', pagesa: 'Bank',
    dataFatura: now.toISOString(), pagesaDeri: due.toISOString(),
    kundeName: '', kundeNUI: '', kundeAdresse: '', kundeStadt: '',
    positionen: [newPosition()], totali: 0
  }
}

export default function FormularView({ rechnung: initialRechnung, onSaved }: Props) {
  const [r, setR] = useState<Rechnung>(initialRechnung ?? newRechnung())
  const [nrvSuffix, setNrvSuffix] = useState('')
  const [artikelListe, setArtikelListe] = useState<any[]>([])
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    window.api.alleArtikel().then(setArtikelListe)
    if (!initialRechnung) {
      window.api.naechsteNrFatura().then((nr: string) => {
        setR(prev => ({ ...prev, nrFatura: nr }))
      })
    } else {
      const nrv = initialRechnung.nrv || 'NRV-'
      setNrvSuffix(nrv.startsWith('NRV-') ? nrv.slice(4) : nrv)
    }
  }, [])

  function showToast(text: string, ok: boolean) {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function updateField(key: keyof Rechnung, value: any) {
    setR(prev => ({ ...prev, [key]: value }))
  }

  function berechneTotal(positionen: Position[]) {
    return positionen.reduce((s, p) => s + p.gjithsejt, 0)
  }

  function updatePosition(id: string, updates: Partial<Position>) {
    setR(prev => {
      const positionen = prev.positionen.map(p => {
        if (p.id !== id) return p
        const updated = { ...p, ...updates }
        // Recalculate if cope or cmimi changed
        if ('cope' in updates || 'cmimi' in updates) {
          const anz = parseFloat((updated.cope || '').replace(',', '.')) || 0
          const prs = parseFloat((updated.cmimi || '').replace(',', '.')) || 0
          updated.gjithsejt = anz * prs
        }
        return updated
      })
      return { ...prev, positionen, totali: berechneTotal(positionen) }
    })
  }

  function updateArtikelNr(id: string, nr: string) {
    const artikel = artikelListe.find(a => a.id === nr)
    if (artikel) {
      updatePosition(id, {
        artikelNr: nr,
        pershkrimi: artikel.beschreibung,
        cmimi: artikel.preis.toFixed(2)
      })
      // Recalculate gjithsejt
      setR(prev => {
        const positionen = prev.positionen.map(p => {
          if (p.id !== id) return p
          const cope = parseFloat(p.cope.replace(',', '.')) || 0
          return { ...p, artikelNr: nr, pershkrimi: artikel.beschreibung, cmimi: artikel.preis.toFixed(2), gjithsejt: cope * artikel.preis }
        })
        return { ...prev, positionen, totali: berechneTotal(positionen) }
      })
    } else {
      updatePosition(id, { artikelNr: nr })
    }
  }

  function addPosition() {
    setR(prev => ({ ...prev, positionen: [...prev.positionen, newPosition()] }))
  }

  function removePosition(id: string) {
    setR(prev => {
      const positionen = prev.positionen.filter(p => p.id !== id)
      return { ...prev, positionen, totali: berechneTotal(positionen) }
    })
  }

  async function speichern() {
    const fullNrv = 'NRV-' + nrvSuffix
    const toSave = { ...r, nrv: fullNrv, totali: berechneTotal(r.positionen) }
    const id = await window.api.speichernRechnung(toSave)
    await window.api.pdfSpeichern({ ...toSave, id })
    showToast(`Fatura u ruajt: ${r.kennzeichen}`, true)
    setTimeout(onSaved, 1200)
  }

  async function drucken() {
    const fullNrv = 'NRV-' + nrvSuffix
    const toSave = { ...r, nrv: fullNrv, totali: berechneTotal(r.positionen) }
    const id = await window.api.speichernRechnung(toSave)
    await window.api.pdfDrucken({ ...toSave, id })
  }

  const totali = berechneTotal(r.positionen)
  const tvsh = totali * 0.18
  const totalBrutto = totali * 1.18

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 24px', background: 'var(--card)',
        borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <div style={{ flex: 1 }}>
          <div className="section-label">{r.id ? 'Edito Faturën' : 'Faturë e Re'}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 3 }}>
            {r.id ? r.kennzeichen || 'Faturë' : 'Krijo faturë të re'}
          </div>
        </div>
        <button className="btn-ghost" onClick={drucken}>🖨️ Printo</button>
        <button className="btn-primary" onClick={speichern}>💾 Ruaj (Ctrl+S)</button>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>

          {/* Rechnungs-Info */}
          <div className="card">
            <div className="section-label" style={{ marginBottom: 12 }}>Informacioni i Faturës</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

              {/* Nr. Faturës – read-only */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-sub)', marginBottom: 5 }}>Nr. Faturës</div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 7, padding: '9px 11px'
                }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 13, color: 'var(--accent-hi)' }}>{r.nrFatura}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🔒</span>
                </div>
              </div>

              <Field label="Targa / Kennzeichen" placeholder="01-302-YE" value={r.kennzeichen} onChange={v => updateField('kennzeichen', v)} />

              {/* NRV */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>NRV – Numri Rendor i Verifikimit</div>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: 'var(--input)', border: '1.5px solid var(--border)', borderRadius: 7
                }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 13, color: 'var(--accent)', paddingLeft: 11 }}>NRV-</span>
                  <input
                    className="premium-field"
                    style={{ border: 'none', background: 'transparent', flex: 1 }}
                    placeholder="01/0478"
                    value={nrvSuffix}
                    onChange={e => setNrvSuffix(e.target.value)}
                  />
                </div>
              </div>

              <DateField label="Datë Fatura" value={toInputDate(r.dataFatura)} onChange={v => updateField('dataFatura', fromInputDate(v))} />
              <DateField label="Pagesa Deri" value={toInputDate(r.pagesaDeri)} onChange={v => updateField('pagesaDeri', fromInputDate(v))} />
              <SelectField label="Faturoi" options={FATUROIS} value={r.faturoi} onChange={v => updateField('faturoi', v)} />
              <SelectField label="Mënyra e Pagesës" options={ZAHLUNGSARTEN} value={r.pagesa} onChange={v => updateField('pagesa', v)} />
            </div>
          </div>

          {/* Klienti */}
          <div className="card">
            <div className="section-label" style={{ marginBottom: 12 }}>Klienti / Kundendaten</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Emri / Name" placeholder="Emri i klientit" value={r.kundeName} onChange={v => updateField('kundeName', v)} />
              <Field label="NUI / Steuer-Nr." placeholder="K12345678L" value={r.kundeNUI} onChange={v => updateField('kundeNUI', v)} />
              <Field label="Adresa" placeholder="Rr. Hasan Prishtina" value={r.kundeAdresse} onChange={v => updateField('kundeAdresse', v)} />
              <Field label="Qyteti / Stadt" placeholder="Prishtinë" value={r.kundeStadt} onChange={v => updateField('kundeStadt', v)} />
            </div>
          </div>

          {/* Positionen */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-label" style={{ flex: 1 }}>Pozicionet / Positionen</div>
              <button onClick={addPosition}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-hi)', fontSize: 12, fontWeight: 500 }}>
                + Shto
              </button>
            </div>

            {/* Table header */}
            <div style={{
              display: 'flex', gap: 8, fontSize: 10, fontWeight: 600,
              color: 'var(--text-muted)', padding: '7px 10px',
              background: 'var(--surface)', borderRadius: 6, marginBottom: 4
            }}>
              <span style={{ width: 52 }}>Sasi</span>
              <span style={{ width: 70 }}>Nr. Art.</span>
              <span style={{ flex: 1 }}>Përshkrimi</span>
              <span style={{ width: 100, textAlign: 'right' }}>Çmimi</span>
              <span style={{ width: 100, textAlign: 'right' }}>Gjithsejt</span>
              <span style={{ width: 32 }}></span>
            </div>

            {r.positionen.map(pos => (
              <PositionZeile
                key={pos.id}
                pos={pos}
                artikelListe={artikelListe}
                onDelete={() => removePosition(pos.id)}
                onChange={updates => updatePosition(pos.id, updates)}
                onArtikelNrChange={nr => updateArtikelNr(pos.id, nr)}
              />
            ))}
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
              padding: '18px 24px',
              background: 'linear-gradient(to right, rgba(238,242,255,0.3), rgba(238,242,255,0.1))',
              border: '1px solid rgba(79,70,229,0.2)', borderRadius: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>Nën-Totali (pa TVSh)</span>
                <span className="mono-amount" style={{ fontSize: 13 }}>{totali.toFixed(2)} €</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>TVSh 18%</span>
                <span className="mono-amount" style={{ fontSize: 13 }}>{tvsh.toFixed(2)} €</span>
              </div>
              <div style={{ width: 200, height: 1, background: 'var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1 }}>TOTALI (me TVSh)</span>
                <span className="mono-amount" style={{ fontSize: 28 }}>{totalBrutto.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast">
          <span className={toast.ok ? 'toast-icon-ok' : 'toast-icon-err'}>{toast.ok ? '✓' : '✗'}</span>
          {toast.text}
        </div>
      )}
    </div>
  )
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</div>
      <input className="premium-field" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</div>
      <input type="date" className="premium-field" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function SelectField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</div>
      <select className="premium-field" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function PositionZeile({ pos, artikelListe, onDelete, onChange, onArtikelNrChange }: {
  pos: Position
  artikelListe: any[]
  onDelete: () => void
  onChange: (updates: Partial<Position>) => void
  onArtikelNrChange: (nr: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 10px' }}
    >
      <input
        className="premium-field"
        style={{ width: 52, flexShrink: 0 }}
        placeholder="1"
        value={pos.cope}
        onChange={e => onChange({ cope: e.target.value })}
      />
      <input
        className="premium-field"
        style={{ width: 70, flexShrink: 0 }}
        placeholder="Nr."
        value={pos.artikelNr}
        onChange={e => onArtikelNrChange(e.target.value)}
      />
      <input
        className="premium-field"
        style={{ flex: 1 }}
        placeholder="Përshkrimi i artikullit…"
        value={pos.pershkrimi}
        onChange={e => onChange({ pershkrimi: e.target.value })}
      />
      <input
        className="premium-field"
        style={{ width: 100, flexShrink: 0, textAlign: 'right' }}
        placeholder="0.00"
        value={pos.cmimi}
        onChange={e => onChange({ cmimi: e.target.value })}
      />
      <span className="mono-amount" style={{ width: 100, textAlign: 'right', flexShrink: 0, fontSize: 13 }}>
        {pos.gjithsejt.toFixed(2)} €
      </span>
      <button
        className="btn-icon"
        onClick={onDelete}
        style={{ width: 32, flexShrink: 0, color: hovered ? 'var(--red)' : 'var(--text-muted)' }}
      >✕</button>
    </div>
  )
}

// Declare global api
declare global {
  interface Window {
    api: any
  }
}
