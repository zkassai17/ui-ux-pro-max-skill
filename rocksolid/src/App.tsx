import { useEffect, useState } from 'react'
import { useDB, didSaveFail } from './store'
import { navigate, useRoute } from './router'
import { attention } from './selectors'
import { daysUntil } from './lib/dates'
import { Modal } from './components/ui'
import { Today } from './screens/Today'
import { Tasks } from './screens/Tasks'
import { Properties } from './screens/Properties'
import { PropertyDetail } from './screens/PropertyDetail'
import { Compliance } from './screens/Compliance'
import { Walkthroughs, WalkthroughRun } from './screens/Walkthroughs'
import { Arrears } from './screens/Arrears'
import { Notes } from './screens/Notes'
import { Settings, applyTheme, readTheme } from './screens/Settings'

interface NavItem { path: string; label: string; icon: string; short?: string }

const NAV: NavItem[] = [
  { path: '/today',        label: 'Today',        icon: '◎' },
  { path: '/tasks',        label: 'Tasks',        icon: '☑' },
  { path: '/properties',   label: 'Portfolio',    icon: '▦', short: 'Buildings' },
  { path: '/compliance',   label: 'Compliance',   icon: '⚖', short: 'Filings' },
  { path: '/walkthroughs', label: 'Walkthroughs', icon: '◈' },
  { path: '/arrears',      label: 'Arrears',      icon: '$' },
  { path: '/notes',        label: 'Notes',        icon: '✎' },
  { path: '/settings',     label: 'Settings',     icon: '⚙' },
]

const BOTTOM = NAV.slice(0, 4)
const MORE = NAV.slice(4)

const TITLES: Record<string, string> = {
  today: 'Today', tasks: 'Tasks', properties: 'Portfolio', compliance: 'Compliance',
  walkthroughs: 'Walkthroughs', arrears: 'Arrears', notes: 'Notes', settings: 'Settings',
}

export default function App() {
  const db = useDB()
  const segments = useRoute()
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => { applyTheme(readTheme()) }, [])

  const root = segments[0] ?? 'today'
  const detailId = segments[1]
  const a = attention(db)

  const overdueTotal = a.overdueTasks.length + a.overdueCompliance.length
  const badges: Record<string, number> = {
    '/today': overdueTotal,
    '/tasks': db.tasks.filter((t) => t.status !== 'done' && t.dueDate && daysUntil(t.dueDate) < 0).length,
    '/compliance': a.overdueCompliance.length,
  }

  function screen() {
    switch (root) {
      case 'tasks': return <Tasks db={db} />
      case 'properties': return detailId
        ? <PropertyDetail db={db} id={detailId} />
        : <Properties db={db} />
      case 'compliance': return <Compliance db={db} />
      case 'walkthroughs': return detailId
        ? <WalkthroughRun db={db} id={detailId} />
        : <Walkthroughs db={db} />
      case 'arrears': return <Arrears db={db} />
      case 'notes': return <Notes db={db} />
      case 'settings': return <Settings db={db} />
      default: return <Today db={db} />
    }
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <span className="brand-mark">Rock Solid</span>
        </div>
        <div className="brand" style={{ marginTop: -22, paddingBottom: 14 }}>
          <span className="brand-sub">Property Management</span>
        </div>

        {NAV.map((item) => {
          const active = `/${root}` === item.path
          const n = badges[item.path] ?? 0
          return (
            <button key={item.path}
              className={`nav-link ${active ? 'active' : ''} ${n > 0 ? 'danger' : ''}`}
              onClick={() => navigate(item.path)}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {n > 0 && <span className="nav-count">{n}</span>}
            </button>
          )
        })}

        <div className="sidebar-foot">
          <p style={{ fontSize: 11, color: 'var(--chrome-mute)', lineHeight: 1.5 }}>
            Saved on this device only. Export a backup from Settings.
          </p>
        </div>
      </nav>

      <main className="main">
        <header className="topbar">
          <h1>{detailId ? (TITLES[root] ?? 'Rock Solid') : (TITLES[root] ?? 'Today')}</h1>
          <div className="topbar-actions">
            {root !== 'today' && (
              <button className="btn ghost sm" onClick={() => navigate('/today')}>Today</button>
            )}
          </div>
        </header>

        {didSaveFail() && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <div className="banner warn">
              <span className="b-icon">⚠️</span>
              <div>
                <strong>The last change could not be saved.</strong> Browser storage is full or blocked.
                Export a backup from Settings, then remove some photos.
              </div>
            </div>
          </div>
        )}

        {screen()}
      </main>

      <nav className="bottomnav">
        {BOTTOM.map((item) => {
          const active = `/${root}` === item.path
          const n = badges[item.path] ?? 0
          return (
            <button key={item.path} className={active ? 'active' : ''}
              onClick={() => navigate(item.path)}>
              {n > 0 && <span className="dot" />}
              <span className="bn-icon">{item.icon}</span>
              <span>{item.short ?? item.label}</span>
            </button>
          )
        })}
        <button className={MORE.some((m) => `/${root}` === m.path) ? 'active' : ''}
          onClick={() => setMoreOpen(true)}>
          <span className="bn-icon">⋯</span>
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <Modal title="More" onClose={() => setMoreOpen(false)}>
          <div className="stack tight">
            {MORE.map((item) => (
              <button key={item.path} className="rowcard"
                onClick={() => { setMoreOpen(false); navigate(item.path) }}>
                <span className="rowcard-body">
                  <span className="rowcard-title">
                    <span style={{ marginRight: 9 }}>{item.icon}</span>{item.label}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
