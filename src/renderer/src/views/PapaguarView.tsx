import { useState, useEffect } from 'react'

interface Fatura {
  id: number
  targa: string
  nrFatura: string
  pagesa: string
  dataFatura: string
  pagesaDeri: string
  emriKlientit: string
  nuiKlientit: string
  totali: number
}

interface Props {
  isVisible: boolean
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  } catch { return iso }
}

export default function PapaguarView({ isVisible }: Props) {
  const [faturat, setFaturat] = useState<Fatura[]>([])
  const [confirmId, setConfirmId] = useState<number | null>(null)

  async function load() {
    try {
      const all = await window.api.faturatPapagura()
      setFaturat(all)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (isVisible) load()
  }, [isVisible])

  async function markoPaguar(id: number) {
    await window.api.markuarSiPaguar(id)
    setConfirmId(null)
    load()
  }

  const totalHapura = faturat.reduce((s, r) => s + r.totali * 1.18, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', background: 'var(--card)',
        borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <div className="section-label">Fatura t\xeb Papaguara</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 3 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            {faturat.length} fatura t\xeb hapura
          </div>
          {faturat.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
              Gjithsej: {totalHapura.toFixed(2)} \u20ac
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {faturat.length === 0 ? (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted)',
            marginTop: 60, fontSize: 14
          }}>
            \u2713 Nuk ka fatura t\xeb papaguara
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 900 }}>
            {faturat.map(r => {
              const overdue = new Date(r.pagesaDeri) < new Date()
              return (
                <div key={r.id} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
                  borderLeft: overdue ? '3px solid var(--red)' : '3px solid transparent'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                        {r.emriKlientit || '\u2014'}
                      </span>
                      <span style={{
                        fontSize: 11, color: 'var(--text-muted)',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 4, padding: '1px 6px'
                      }}>Nr. {r.nrFatura}</span>
                      {r.targa && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.targa}</span>
                      )}
                      {overdue && (
                        <span style={{
                          fontSize: 10, color: '#fff', background: 'var(--red)',
                          borderRadius: 4, padding: '1px 6px', fontWeight: 600
                        }}>E vonuar</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 4 }}>
                      Pagesa deri: {formatDate(r.pagesaDeri)} \xb7 {r.pagesa}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="mono-amount" style={{
                      fontSize: 16, fontWeight: 700,
                      color: overdue ? 'var(--red)' : 'var(--accent-hi)'
                    }}>
                      {(r.totali * 1.18).toFixed(2)} \u20ac
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>me TVSh</div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setConfirmId(r.id)}
                    style={{ flexShrink: 0, fontSize: 12 }}
                  >
                    \u2713 E paguar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirmId !== null && (() => {
        const r = faturat.find(f => f.id === confirmId)
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
          }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 24, minWidth: 340,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
                Konfirmo pagen\xebn
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 20 }}>
                A e konfirmon q\xeb fatura <strong>Nr. {r?.nrFatura}</strong> ({r?.emriKlientit}) \xebsht\xeb paguar?
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => setConfirmId(null)}>Jo, anulo</button>
                <button className="btn-primary" onClick={() => markoPaguar(confirmId)}>Po, e paguar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
