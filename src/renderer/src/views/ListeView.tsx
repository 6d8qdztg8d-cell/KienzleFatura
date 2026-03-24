import React, { useState, useEffect, useCallback } from 'react'

interface Rechnung {
  id: number
  kennzeichen: string
  nrFatura: string
  nrv: string
  faturoi: string
  pagesa: string
  dataFatura: string
  totali: number
}

interface Props {
  onEdit: (r: any) => void
  isVisible: boolean
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

export default function ListeView({ onEdit, isVisible }: Props) {
  const [rechnungen, setRechnungen] = useState<Rechnung[]>([])
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)

  const laden = useCallback(async () => {
    const data = search
      ? await window.api.suchenRechnungen(search)
      : await window.api.alleRechnungen()
    setRechnungen(data)
  }, [search])

  useEffect(() => { laden() }, [laden])
  useEffect(() => { if (isVisible) laden() }, [isVisible])

  function showToast(text: string, ok: boolean) {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleDelete(id: number) {
    await window.api.loeschenRechnung(id)
    setDeleteId(null)
    await laden()
    showToast('Fatura u fshi.', true)
  }

  async function handlePrint(r: any) {
    await window.api.pdfDrucken(r)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 24px', background: 'var(--card)',
        borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <div style={{ flex: 1 }}>
          <div className="section-label">Faturat</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 3 }}>Të Gjitha Faturat</div>
        </div>
        <span className="badge">{rechnungen.length}</span>
      </div>

      {/* Search */}
      <div style={{ padding: '14px 24px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--input)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 14px'
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>🔍</span>
          <input
            className="premium-field"
            style={{ border: 'none', background: 'transparent', padding: 0, flex: 1, fontSize: 13 }}
            placeholder="Kërko sipas targës, numrit, faturuesit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>×</button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {rechnungen.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 14 }}>
            <span style={{ fontSize: 38, color: 'var(--text-muted)', fontWeight: 100 }}>📄</span>
            <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>Nuk ka fatura të ruajtura.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rechnungen.map(r => (
              <RechnungsCard
                key={r.id}
                rechnung={r}
                onEdit={() => onEdit(r)}
                onPrint={() => handlePrint(r)}
                onDelete={() => setDeleteId(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete dialog */}
      {deleteId !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, minWidth: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Fshij Faturën?</div>
            <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 20 }}>Kjo veprim nuk mund të kthehet.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setDeleteId(null)}>Anulo</button>
              <button className="btn-destructive" onClick={() => handleDelete(deleteId!)}>Fshij</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span className={toast.ok ? 'toast-icon-ok' : 'toast-icon-err'}>{toast.ok ? '✓' : '✗'}</span>
          {toast.text}
        </div>
      )}
    </div>
  )
}

function RechnungsCard({ rechnung, onEdit, onPrint, onDelete }: {
  rechnung: Rechnung
  onEdit: () => void
  onPrint: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEdit}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 16px', cursor: 'pointer',
        background: hovered ? 'var(--card-hover)' : 'var(--card)',
        border: '1px solid var(--border)', borderRadius: 9,
        transition: 'background 0.12s'
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          {rechnung.kennzeichen || '—'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span className="tag">{rechnung.faturoi}</span>
          <span className="tag">{rechnung.pagesa}</span>
          <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{fmtDate(rechnung.dataFatura)}</span>
          {rechnung.nrFatura && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-sub)', fontVariantNumeric: 'tabular-nums' }}>{rechnung.nrFatura}</span>
            </>
          )}
        </div>
      </div>

      <span className="mono-amount" style={{ fontSize: 15 }}>
        {rechnung.totali.toFixed(2)} €
      </span>

      <div style={{ display: 'flex', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 0.1s' }}>
        <button className="btn-icon" onClick={e => { e.stopPropagation(); onEdit() }} title="Edito">✏️</button>
        <button className="btn-icon" onClick={e => { e.stopPropagation(); onPrint() }} title="Printo">🖨️</button>
        <button className="btn-icon" onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ color: 'var(--red)' }} title="Fshij">🗑️</button>
      </div>
    </div>
  )
}
