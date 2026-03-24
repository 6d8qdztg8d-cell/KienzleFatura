import React, { useState, useEffect } from 'react'

interface BackupEntry {
  name: string
  filePath: string
  created: string
}

export default function BackupView() {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState('')

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
          <div style={{ display: 'flex', gap: 12 }}>
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
