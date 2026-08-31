import { useState } from 'react'
import type { Database, Task } from '../types'
import { addNote, newTask } from '../actions'
import { attention, money, urgency } from '../selectors'
import { daysUntil, formatDate, heatSeasonLabel, isHeatSeason, relativeDays } from '../lib/dates'
import { navigate } from '../router'
import { Badge, Empty, SectionHead } from '../components/ui'
import { ComplianceRow, TaskRow } from '../components/rows'
import { TaskEditor } from '../components/TaskEditor'

export function Today({ db }: { db: Database }) {
  const [capture, setCapture] = useState('')
  const [captureProp, setCaptureProp] = useState('')
  const [editing, setEditing] = useState<Task | null>(null)
  const [flash, setFlash] = useState('')

  const a = attention(db)
  const openCount = db.tasks.filter((t) => t.status !== 'done').length
  const heat = isHeatSeason()

  function saveAsNote() {
    const body = capture.trim()
    if (!body) return
    addNote({ body, propertyId: captureProp || null })
    setCapture('')
    setFlash('Note saved')
    setTimeout(() => setFlash(''), 1800)
  }

  function saveAsTask() {
    const title = capture.trim()
    if (!title) return
    setEditing(newTask({ title, propertyId: captureProp || null }))
    setCapture('')
  }

  const nothingUrgent =
    a.overdueTasks.length === 0 && a.dueTodayTasks.length === 0 &&
    a.overdueCompliance.length === 0 && a.weekCompliance.length === 0 &&
    a.weekTasks.length === 0

  return (
    <div className="page">
      {/* ---------- Capture ---------- */}
      <div className="capture" style={{ marginBottom: 20 }}>
        <textarea
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          placeholder="What just happened? Tenant call, something you spotted, a promise you made…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveAsNote() }
          }}
        />
        <div className="capture-foot">
          <select
            className="select" value={captureProp}
            onChange={(e) => setCaptureProp(e.target.value)}
            aria-label="Tag to building"
          >
            <option value="">No building</option>
            {db.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="spacer" />
          {flash && <span className="tiny" style={{ color: 'var(--ok)' }}>{flash}</span>}
          <button className="btn sm" onClick={saveAsTask} disabled={!capture.trim()}>
            Make a task
          </button>
          <button className="btn accent sm" onClick={saveAsNote} disabled={!capture.trim()}>
            Save note
          </button>
        </div>
      </div>

      {/* ---------- Stats ---------- */}
      <div className="stats" style={{ marginBottom: 20 }}>
        <div className={`stat ${a.overdueTasks.length ? 'alert' : ''}`}>
          <div className="label">Overdue</div>
          <div className="value">{a.overdueTasks.length + a.overdueCompliance.length}</div>
          <div className="sub">tasks &amp; filings</div>
        </div>
        <div className="stat">
          <div className="label">Open tasks</div>
          <div className="value">{openCount}</div>
          <div className="sub">across {db.properties.length} buildings</div>
        </div>
        <div className={`stat ${a.weekCompliance.length ? 'warn' : ''}`}>
          <div className="label">Filings ≤14d</div>
          <div className="value">{a.weekCompliance.length}</div>
          <div className="sub">deadline approaching</div>
        </div>
        <div className={`stat ${a.arrearsTotal > 0 ? 'warn' : ''}`}>
          <div className="label">Arrears</div>
          <div className="value">{money(a.arrearsTotal)}</div>
          <div className="sub">{db.arrears.length} units behind</div>
        </div>
      </div>

      {heat && (
        <div className="banner accent" style={{ marginBottom: 20 }}>
          <span className="b-icon">🔥</span>
          <div>
            <strong>{heatSeasonLabel()} is active.</strong>{' '}
            Oct 1 – May 31. Daytime 68°F when outside is under 55°F, and 62°F overnight
            regardless of outside temperature. Log every heat complaint with a timestamp —
            HPD complaints turn into violations fast.
          </div>
        </div>
      )}

      {nothingUrgent && (
        <div style={{ marginBottom: 20 }}>
          <Empty
            icon="✓" title="Nothing on fire"
            body="No overdue work, no filings inside two weeks. Good time to run a walkthrough or work the arrears list."
            action={<button className="btn" onClick={() => navigate('/walkthroughs')}>Start a walkthrough</button>}
          />
        </div>
      )}

      {/* ---------- Overdue ---------- */}
      {(a.overdueCompliance.length > 0 || a.overdueTasks.length > 0) && (
        <div className="section">
          <SectionHead title="Overdue" count={a.overdueCompliance.length + a.overdueTasks.length} />
          {a.overdueCompliance.map((c) => (
            <ComplianceRow key={c.id} db={db} item={c} onOpen={() => navigate('/compliance')} />
          ))}
          {a.overdueTasks.map((t) => (
            <TaskRow key={t.id} db={db} task={t} onOpen={setEditing} />
          ))}
        </div>
      )}

      {/* ---------- Today ---------- */}
      {a.dueTodayTasks.length > 0 && (
        <div className="section">
          <SectionHead title="Due today" count={a.dueTodayTasks.length} />
          {a.dueTodayTasks.map((t) => <TaskRow key={t.id} db={db} task={t} onOpen={setEditing} />)}
        </div>
      )}

      {/* ---------- Filings ---------- */}
      {a.weekCompliance.length > 0 && (
        <div className="section">
          <SectionHead title="Filings coming up" count={a.weekCompliance.length}>
            <button className="btn ghost sm" onClick={() => navigate('/compliance')}>All filings →</button>
          </SectionHead>
          {a.weekCompliance.map((c) => (
            <ComplianceRow key={c.id} db={db} item={c} onOpen={() => navigate('/compliance')} />
          ))}
        </div>
      )}

      {/* ---------- This week ---------- */}
      {a.weekTasks.length > 0 && (
        <div className="section">
          <SectionHead title="This week" count={a.weekTasks.length}>
            <button className="btn ghost sm" onClick={() => navigate('/tasks')}>All tasks →</button>
          </SectionHead>
          {a.weekTasks.map((t) => <TaskRow key={t.id} db={db} task={t} onOpen={setEditing} />)}
        </div>
      )}

      {/* ---------- Leases ---------- */}
      {a.expiringLeases.length > 0 && (
        <div className="section">
          <SectionHead title="Leases expiring within 90 days" count={a.expiringLeases.length} />
          {a.expiringLeases.slice(0, 6).map((u) => {
            const p = db.properties.find((x) => x.id === u.propertyId)
            const n = daysUntil(u.leaseEnd)
            return (
              <button key={u.id} className={`rowcard rail ${urgency(u.leaseEnd)}`}
                onClick={() => navigate(`/properties/${u.propertyId}`)}>
                <span className="rowcard-body">
                  <span className="rowcard-title">{p?.name} · {u.label}</span>
                  <span className="rowcard-meta">
                    <span>{u.tenantName || 'No tenant on file'}</span>
                    {u.stabilized && <Badge tone="blue">Stabilized</Badge>}
                    <span>· ends {formatDate(u.leaseEnd)}</span>
                  </span>
                </span>
                <span className="rowcard-side">
                  <Badge tone={n <= 30 ? 'amber' : 'grey'}>{relativeDays(n)}</Badge>
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ---------- Recent notes ---------- */}
      {db.notes.length > 0 && (
        <div className="section">
          <SectionHead title="Recent notes">
            <button className="btn ghost sm" onClick={() => navigate('/notes')}>All notes →</button>
          </SectionHead>
          {db.notes.slice(0, 3).map((n) => (
            <div className={`note ${n.pinned ? 'pinned' : ''}`} key={n.id}>
              <div className="note-body">{n.body}</div>
              <div className="note-meta">
                {n.propertyId && <Badge>{db.properties.find((p) => p.id === n.propertyId)?.name}</Badge>}
                <span>{new Date(n.createdAt).toLocaleString('en-US',
                  { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <TaskEditor db={db} task={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
