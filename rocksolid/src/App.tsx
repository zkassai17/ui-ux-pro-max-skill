import { useEffect, useState } from 'react'
import { useDB, didSaveFail } from './store'
import { navigate, useRoute } from './router'
import { openTodos } from './selectors'
import { daysUntil } from './lib/dates'
import { Todos } from './screens/Todos'
import { Buildings, BuildingDetail, UnitDetail } from './screens/Buildings'
import { Settings, applyTheme, readTheme } from './screens/Settings'
import { Search } from './components/Search'

const NAV = [
  { path: '/todo', label: 'To do', icon: '☑' },
  { path: '/buildings', label: 'Buildings', icon: '▦' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

const TITLES: Record<string, string> = {
  todo: 'To do', buildings: 'Buildings', units: 'Unit', settings: 'Settings',
}

export default function App() {
  const db = useDB()
  const segments = useRoute()
  const [searching, setSearching] = useState(false)
  useEffect(() => { applyTheme(readTheme()) }, [])

  const root = segments[0] ?? 'todo'
  const detailId = segments[1]
  const detailTab = segments[2]
  const late = openTodos(db).filter((t) => t.dueDate && daysUntil(t.dueDate) < 0).length

  function screen() {
    switch (root) {
      case 'buildings':
        return detailId
          ? <BuildingDetail db={db} id={detailId} initialTab={detailTab} />
          : <Buildings db={db} />
      case 'units':
        return <UnitDetail db={db} id={detailId} />
      case 'settings':
        return <Settings db={db} />
      default:
        return <Todos db={db} />
    }
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <span className="brand-mark">Rock Solid</span>
        </div>
        {NAV.map((item) => {
          const active = `/${root}` === item.path ||
            (item.path === '/buildings' && root === 'units')
          return (
            <button key={item.path} className={`nav-link ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.path === '/todo' && late > 0 && <span className="nav-count">{late}</span>}
            </button>
          )
        })}
        <div className="sidebar-foot">
          <p style={{ fontSize: 11, color: 'var(--chrome-mute)', lineHeight: 1.5 }}>
            Saved on this device. Export a backup from Settings.
          </p>
        </div>
      </nav>

      <main className="main">
        <header className="topbar">
          <h1>{TITLES[root] ?? 'To do'}</h1>
          <div className="topbar-actions">
            <button className="iconbtn" onClick={() => setSearching(true)}
              aria-label="Search everything" title="Search">🔍</button>
          </div>
        </header>

        {didSaveFail() && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <div className="banner warn">
              <span className="b-icon">⚠️</span>
              <div><strong>That change wasn't saved.</strong> Storage is full or blocked — export a
                backup, then delete some photos.</div>
            </div>
          </div>
        )}

        {screen()}
      </main>

      <nav className="bottomnav">
        {NAV.map((item) => {
          const active = `/${root}` === item.path ||
            (item.path === '/buildings' && root === 'units')
          return (
            <button key={item.path} className={active ? 'active' : ''}
              onClick={() => navigate(item.path)}>
              {item.path === '/todo' && late > 0 && <span className="dot" />}
              <span className="bn-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {searching && <Search db={db} onClose={() => setSearching(false)} />}
    </div>
  )
}
