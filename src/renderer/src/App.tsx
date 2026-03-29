import { useState } from 'react'
import ListeView from './views/ListeView'
import FormularView from './views/FormularView'
import EinstellungenView from './views/EinstellungenView'
import BackupView from './views/BackupView'
import PapaguarView from './views/PapaguarView'
import StatistikaView from './views/StatistikaView'

type NavItem = 'formular' | 'liste' | 'papaguar' | 'statistika' | 'einstellungen' | 'backup'

const navItems: { key: NavItem; label: string; icon: string }[] = [
  { key: 'formular',      label: 'Faturë e Re',         icon: '📄' },
  { key: 'liste',         label: 'Faturat',              icon: '📋' },
  { key: 'papaguar',      label: 'Fatura të papaguar',   icon: '⏳' },
  { key: 'statistika',    label: 'Statistika',           icon: '📊' },
  { key: 'einstellungen', label: 'Artikujt',             icon: '🏷️' },
  { key: 'backup',        label: 'Backups',              icon: '💾' },
]

interface EditingRechnung {
  id: number
  [key: string]: any
}

export default function App() {
  const [selected, setSelected] = useState<NavItem>('formular')
  const [editRechnung, setEditRechnung] = useState<EditingRechnung | null>(null)
  const [formKey, setFormKey] = useState(0)

  function handleEdit(r: EditingRechnung) {
    setEditRechnung(r)
    setFormKey(k => k + 1)
    setSelected('formular')
  }

  function handleNeueRechnung() {
    setEditRechnung(null)
    setFormKey(k => k + 1)
    setSelected('formular')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 210, flexShrink: 0,
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        height: '100%'
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hi))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 17, flexShrink: 0
            }}>K</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: 'var(--text)' }}>KIENZLE</div>
              <div style={{ fontSize: 10, color: 'var(--text-sub)' }}>Fatura System</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: '0 8px', flex: 1 }}>
          <div className="section-label" style={{ padding: '0 8px 6px' }}>Navigation</div>
          {navItems.map(item => {
            const isActive = selected === item.key
            return (
              <button
                key={item.key}
                onClick={() => setSelected(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 12px', marginBottom: 2,
                  border: isActive ? '1px solid rgba(79,70,229,0.3)' : '1px solid transparent',
                  borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                  background: isActive ? 'rgba(238,242,255,0.5)' : 'transparent',
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.12s'
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hi)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>v1.0.44 · ©2026 Kienzle Sh.P.K.</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', background: 'var(--surface)' }}>
        <div style={{ display: selected === 'formular' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <FormularView
            key={formKey}
            rechnung={editRechnung as any}
            onClear={handleNeueRechnung}
            isVisible={selected === 'formular'}
          />
        </div>
        <div style={{ display: selected === 'liste' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <ListeView onEdit={handleEdit} isVisible={selected === 'liste'} />
        </div>
        <div style={{ display: selected === 'papaguar' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <PapaguarView isVisible={selected === 'papaguar'} />
        </div>
        <div style={{ display: selected === 'statistika' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <StatistikaView isVisible={selected === 'statistika'} />
        </div>
        <div style={{ display: selected === 'einstellungen' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <EinstellungenView />
        </div>
        <div style={{ display: selected === 'backup' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <BackupView />
        </div>
      </div>
    </div>
  )
}
