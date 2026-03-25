import React, { useState, useEffect } from 'react'

interface BackupEntry {
  name: string
  filePath: string
  created: string
}

interface ExportFilter {
  emriKlientit: string
  vonDatum: string
  bisDatum: string
}

function todayStr() {
  return new Date().toISOString().substring(0, 10)
}

function firstOfMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function BackupView() {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFilter, setExportFilter] = useState<ExportFilter>({
    emriKlientit: '',
    vonDatum: firstOfMonthStr(),
    bisDatum: todayStr()
  })

  async function laden() {
    const data = await window.api.alleBackups()
    setBackups(data)
  }

  useEffect(() => { laden() }, [])

  function showToast(text: string, ok: boolean) {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function backupErstellen() {
    setLoading('backup')
    try {
      const path = await window.api.backupErstellen()
      await laden()
      showToast(`Backup erstellt: ${path.split(/[\\/]/).pop()}`, true)
    } catch (e: any) {
      showToast(`Fehler: ${e.message}`, false)
    } finally { setLoading('') }
  }

  async function backupImportieren() {
    setLoading('import')
    try {
      const result = await window.api.backupImportieren()
      if (result) showToast('Wiederherstellung erfolgreich!', true)
    } catch (e: any) {
      showToast(`Fehler: ${e.message}`, false)
    } finally { setLoading('') }
  }

  async function csvImportieren() {
    setLoading('csv')
    try {
      const anzahl = await window.api.csvImportieren()
      if (anzahl !== null) showToast(`${anzahl} Rechnung(en) importiert!`, true)
    } catch (e: any) {
      showToast(`Fehler: ${e.message}`, false)
    } finally { setLoading('') }
  }

  async function csvExportieren() {
    setLoading('csvexport')
    setShowExportModal(false)
    try {
      const result = await window.api.csvExportieren(exportFilter)
      if (result.saved) {
        showToast(`${result.count} Rechnung(en) eksportiert!`, true)
      } else if (result.count === 0) {
        showToast('Nuk u gjet asnjë faturë për filtrin e zgjedhur.', false)
      }
    } catch (e: any) {
      showToast(`Fehler: ${e.message}`, false)
    } finally { setLoading('') }
  }

  async function wiederherstellen(filePath: string) {
    try {
      await window.api.backupWiederherstellen(filePath)
      showToast('Wiederhergestellt!', true)
    } catch (e: any) {
      showToast(`Fehler: ${e.message}`, false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', background: 'var(--card)',
        borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <div className="section-label">Backups</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 3 }}>Backup & Wiederherstellung</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>

          {/* Action cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <AktionKarte
              icon="⬆️"
              titel="Backup erstellen"
              sub="Alle Rechnungen als ZIP sichern"
              farbe="var(--accent)"
              loading={loading === 'backup'}
              onClick={backupErstellen}
            />
            <AktionKarte
              icon="⬇️"
              titel="Backup importieren"
              sub="ZIP-Datei wiederherstellen"
              farbe="var(--amber)"
              loading={loading === 'import'}
              onClick={backupImportieren}
            />
            <AktionKarte
              icon="📊"
              titel="CSV importieren"
              sub="Rechnungen aus CSV-Datei laden"
              farbe="var(--green)"
              loading={loading === 'csv'}
              onClick={csvImportieren}
            />
            <AktionKarte
              icon="📤"
              titel="CSV eksportieren"
              sub="Fatura në CSV sipas filtrit"
              farbe="var(--accent-hi)"
              loading={loading === 'csvexport'}
              onClick={() => setShowExportModal(true)}
            />
          </div>

          {/* Saved backups */}
          <div>
            <div className="section-label" style={{ marginBottom: 10 }}>Gespeicherte Backups ({backups.length})</div>

            {backups.length === 0 ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 16,
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9
              }}>
                <span style={{ color: 'var(--text-muted)' }}>📦</span>
                <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>Noch keine Backups vorhanden.</span>
              </div>
            ) : (
              backups.map(b => (
                <BackupZeile
                  key={b.filePath}
                  backup={b}
                  onRestore={() => wiederherstellen(b.filePath)}
                  onOpenFolder={() => window.api.backupImFinderOeffnen(b.filePath)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* CSV Export Modal */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
              padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              📤 CSV Eksportim
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 20 }}>
              Lëre fushën "Klienti" bosh për të eksportuar të gjitha faturat.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 5 }}>
                  Klienti <span style={{ color: 'var(--text-muted)' }}>(opsionale)</span>
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="p.sh. Petrit Gashi"
                  value={exportFilter.emriKlientit}
                  onChange={e => setExportFilter(f => ({ ...f, emriKlientit: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 5 }}>
                    Nga data
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={exportFilter.vonDatum}
                    onChange={e => setExportFilter(f => ({ ...f, vonDatum: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 5 }}>
                    Deri më datë
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={exportFilter.bisDatum}
                    onChange={e => setExportFilter(f => ({ ...f, bisDatum: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowExportModal(false)}>Anulo</button>
              <button className="btn-primary" onClick={csvExportieren}>
                📤 Eksporto CSV
              </button>
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

function AktionKarte({ icon, titel, sub, farbe, loading, onClick }: {
  icon: string; titel: string; sub: string; farbe: string; loading?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 14,
        padding: 16, background: 'var(--card)',
        border: '1px solid var(--border)', borderRadius: 10,
        cursor: loading ? 'wait' : 'pointer', textAlign: 'left',
        transition: 'background 0.12s', opacity: loading ? 0.7 : 1
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: `color-mix(in srgb, ${farbe} 15%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{titel}</div>
        <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{loading ? '⏳' : '→'}</span>
    </button>
  )
}

function BackupZeile({ backup, onRestore, onOpenFolder }: {
  backup: BackupEntry; onRestore: () => void; onOpenFolder: () => void
}) {
  const dateStr = (() => {
    try {
      return new Date(backup.created).toLocaleString('de-DE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return backup.created }
  })()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9, marginBottom: 6
    }}>
      <span style={{ fontSize: 16, color: 'var(--text-sub)', width: 24, flexShrink: 0 }}>🗜️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {backup.name}
        </div>
        <div style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', marginTop: 2 }}>{dateStr}</div>
      </div>
      <button className="btn-ghost" style={{ fontSize: 11 }} onClick={onOpenFolder}>Im Explorer</button>
      <button className="btn-primary" style={{ fontSize: 11 }} onClick={onRestore}>Wiederherstellen</button>
    </div>
  )
}
