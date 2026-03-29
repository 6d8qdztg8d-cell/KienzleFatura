import { useState, useEffect } from 'react'

const QYTETET: Record<string, string> = {
  '01': 'Prishtinë',
  '02': 'Mitrovicë',
  '03': 'Pejë',
  '04': 'Gjakovë',
  '05': 'Ferizaj',
  '06': 'Gjilan',
  '07': 'Prizren',
}

interface Fatura {
  id: number
  targa: string
  emriKlientit: string
  totali: number
  paguar: number
  pagesa: string
}

interface Props {
  isVisible: boolean
}

export default function StatistikaView({ isVisible }: Props) {
  const [faturat, setFaturat] = useState<Fatura[]>([])

  useEffect(() => {
    if (isVisible) {
      window.api.alleRechnungen().then(setFaturat).catch(console.error)
    }
  }, [isVisible])

  // Top 5 klientët sipas qarkullimit (totali pa TVSh)
  const klientetMap = new Map<string, number>()
  for (const r of faturat) {
    if (!r.emriKlientit) continue
    klientetMap.set(r.emriKlientit, (klientetMap.get(r.emriKlientit) || 0) + r.totali)
  }
  const top5 = Array.from(klientetMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const maxTop5 = top5.length > 0 ? top5[0][1] : 1

  // Qytetet sipas prefiksit të targes
  const qytetetMap = new Map<string, number>()
  for (const r of faturat) {
    if (!r.targa) continue
    const prefix = r.targa.slice(0, 2)
    if (QYTETET[prefix]) {
      qytetetMap.set(prefix, (qytetetMap.get(prefix) || 0) + 1)
    }
  }
  const qytetetList = Object.entries(QYTETET)
    .map(([prefix, name]) => ({ prefix, name, count: qytetetMap.get(prefix) || 0 }))
    .sort((a, b) => b.count - a.count)

  const maxCount = Math.max(...qytetetList.map(q => q.count), 1)

  const totalQarkullimi = faturat.reduce((s, r) => s + r.totali, 0)
  const isPaguar = (r: Fatura) => r.paguar === 1 || r.pagesa === 'Para të gatshme'
  const totalPaguara = faturat.filter(isPaguar).length
  const totalPapaguara = faturat.filter(r => !isPaguar(r)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', background: 'var(--card)',
        borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <div className="section-label">Statistika</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 3 }}>
          Pasqyra e biznesit
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ maxWidth: 900 }}>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <KpiCard label="Fatura gjithsej" value={String(faturat.length)} />
            <KpiCard label="Qarkullimi (pa TVSh)" value={`${totalQarkullimi.toFixed(0)} €`} accent />
            <KpiCard label="Të paguara" value={String(totalPaguara)} color="var(--green)" />
            <KpiCard label="Të papaguara" value={String(totalPapaguara)} color="var(--red)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Top 5 Klientët */}
            <div className="card">
              <div className="section-label" style={{ marginBottom: 16 }}>Top 5 Klientët</div>
              {top5.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nuk ka të dhëna</div>
              ) : top5.map(([emri, totali], i) => (
                <div key={emri} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: i === 0 ? 'var(--accent-hi)' : 'var(--surface)',
                      color: i === 0 ? '#fff' : 'var(--text-sub)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, border: '1px solid var(--border)'
                    }}>{i + 1}</div>
                    <div style={{
                      flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{emri}</div>
                    <div className="mono-amount" style={{
                      fontSize: 12, fontWeight: 700,
                      color: i === 0 ? 'var(--accent-hi)' : 'var(--text-sub)',
                      flexShrink: 0
                    }}>{totali.toFixed(0)} €</div>
                  </div>
                  <div style={{ height: 5, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: i === 0 ? 'var(--accent-hi)' : 'var(--accent)',
                      width: `${(totali / maxTop5) * 100}%`,
                      transition: 'width 0.4s'
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Sipas Qytetit */}
            <div className="card">
              <div className="section-label" style={{ marginBottom: 16 }}>Sipas Qytetit (Targa)</div>
              {qytetetList.map(({ prefix, name, count }) => (
                <div key={prefix} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                      <span style={{
                        display: 'inline-block', width: 22, fontSize: 10,
                        color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums'
                      }}>{prefix}</span>
                      {name}
                    </span>
                    <span style={{
                      fontSize: 12,
                      color: count > 0 ? 'var(--text)' : 'var(--text-muted)',
                      fontWeight: count > 0 ? 600 : 400
                    }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: count > 0 ? 'var(--accent-hi)' : 'var(--border)',
                      width: `${(count / maxCount) * 100}%`,
                      transition: 'width 0.4s'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, accent, color }: {
  label: string; value: string; accent?: boolean; color?: string
}) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </div>
      <div className="mono-amount" style={{
        fontSize: 20, fontWeight: 700,
        color: color || (accent ? 'var(--accent-hi)' : 'var(--text)')
      }}>{value}</div>
    </div>
  )
}
