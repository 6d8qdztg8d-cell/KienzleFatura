import React, { useState, useEffect } from 'react'

interface Artikel {
  id: string
  pershkrimi: string
  cmimi: number
}

export default function EinstellungenView() {
  const [artikel, setArtikel] = useState<Artikel[]>([])
  const [neuNummer, setNeuNummer] = useState('')
  const [neuPershkrimi, setNeuPershkrimi] = useState('')
  const [neuCmimi, setNeuCmimi] = useState('')
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const [deleteNr, setDeleteNr] = useState<string | null>(null)

  async function laden() {
    const data = await window.api.alleArtikel()
    setArtikel(data)
  }

  useEffect(() => { laden() }, [])

  function showToast(text: string, ok: boolean) {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function shtoArtikullin() {
    if (!neuNummer.trim() || !neuPershkrimi.trim()) return
    const cmimi = parseFloat(neuCmimi.replace(',', '.')) || 0
    await window.api.speichernArtikel({ id: neuNummer.trim(), pershkrimi: neuPershkrimi.trim(), cmimi })
    await laden()
    setNeuNummer(''); setNeuPershkrimi(''); setNeuCmimi('')
    showToast(`Artikulli '${neuNummer}' u ruajt.`, true)
  }

  async function handleDelete(nr: string) {
    await window.api.loeschenArtikel(nr)
    setDeleteNr(null)
    await laden()
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
          <div className="section-label">Katalog</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 3 }}>Artikujt</div>
        </div>
        <span className="badge">{artikel.length} artikuj</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>

          {/* Add form */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div className="section-label" style={{ flex: 1 }}>Shto Artikull</div>
              <span style={{
                fontSize: 10, fontWeight: 500, color: 'var(--green)',
                padding: '3px 8px', background: 'var(--green-bg)', borderRadius: 4
              }}>Pa TVSh</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 130px', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>Nr. Artikullit</div>
                <input className="premium-field" placeholder="ART-001" value={neuNummer} onChange={e => setNeuNummer(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>Përshkrimi</div>
                <input className="premium-field" placeholder="p.sh. Ndërrimi i vajit…" value={neuPershkrimi} onChange={e => setNeuPershkrimi(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>Çmimi pa TVSh (€)</div>
                <input className="premium-field" style={{ textAlign: 'right' }} placeholder="0.00" value={neuCmimi} onChange={e => setNeuCmimi(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={shtoArtikullin} disabled={!neuNummer.trim() || !neuPershkrimi.trim()}>
                + Shto Artikullin
              </button>
            </div>
          </div>

          {/* Article list */}
          <div>
            <div className="section-label" style={{ marginBottom: 10 }}>Artikujt e Ruajtur ({artikel.length})</div>

            {artikel.length === 0 ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 16,
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9
              }}>
                <span style={{ color: 'var(--text-muted)' }}>🏷️</span>
                <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>Nuk ka artikuj të ruajtur.</span>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{
                  display: 'flex', gap: 8, fontSize: 10, fontWeight: 600,
                  color: 'var(--text-muted)', padding: '8px 14px',
                  background: 'var(--surface)', borderRadius: 7, marginBottom: 4
                }}>
                  <span style={{ width: 90 }}>Nr.</span>
                  <span style={{ flex: 1 }}>Përshkrimi</span>
                  <span style={{ width: 120, textAlign: 'right' }}>Çmimi pa TVSh</span>
                  <span style={{ width: 36 }}></span>
                </div>

                {artikel.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px',
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 9, marginBottom: 4
                  }}>
                    <span style={{ width: 90, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>{a.id}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{a.pershkrimi}</span>
                    <span style={{ width: 120, textAlign: 'right', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                      {a.cmimi.toFixed(2)} €
                    </span>
                    <button className="btn-icon" style={{ width: 36, color: 'rgba(220,38,38,0.7)' }} onClick={() => setDeleteNr(a.id)}>🗑️</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      {deleteNr !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, minWidth: 300, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Fshij Artikullin?</div>
            <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 20 }}>Kjo veprim nuk mund të kthehet.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setDeleteNr(null)}>Anulo</button>
              <button className="btn-destructive" onClick={() => handleDelete(deleteNr!)}>Fshij</button>
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
