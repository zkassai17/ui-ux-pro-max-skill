import { useMemo, useState } from 'react'
import type { Database, Task, TaskStatus } from '../types'
import { newTask } from '../actions'
import { sortTasks } from '../selectors'
import { TASK_STATUS } from '../labels'
import { Empty, SectionHead } from '../components/ui'
import { TaskRow } from '../components/rows'
import { TaskEditor } from '../components/TaskEditor'

type Lens = 'active' | TaskStatus

const LENSES: { key: Lens; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'open', label: TASK_STATUS.open },
  { key: 'assigned', label: TASK_STATUS.assigned },
  { key: 'waiting', label: TASK_STATUS.waiting },
  { key: 'done', label: TASK_STATUS.done },
]

export function Tasks({ db }: { db: Database }) {
  const [lens, setLens] = useState<Lens>('active')
  const [propertyId, setPropertyId] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Task | null>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = db.tasks.filter((t) => {
      if (lens === 'active' ? t.status === 'done' : t.status !== lens) return false
      if (propertyId && t.propertyId !== propertyId) return false
      if (q && !`${t.title} ${t.detail} ${t.assignee}`.toLowerCase().includes(q)) return false
      return true
    })
    return lens === 'done'
      ? filtered.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      : sortTasks(filtered)
  }, [db.tasks, lens, propertyId, query])

  const counts = useMemo(() => ({
    active: db.tasks.filter((t) => t.status !== 'done').length,
    open: db.tasks.filter((t) => t.status === 'open').length,
    assigned: db.tasks.filter((t) => t.status === 'assigned').length,
    waiting: db.tasks.filter((t) => t.status === 'waiting').length,
    done: db.tasks.filter((t) => t.status === 'done').length,
  }), [db.tasks])

  return (
    <div className="page">
      <div className="stack" style={{ marginBottom: 16 }}>
        <div className="chip-row">
          {LENSES.map((l) => (
            <button key={l.key} className={`chip ${lens === l.key ? 'on' : ''}`} onClick={() => setLens(l.key)}>
              {l.label} <span className="tabular" style={{ opacity: .65 }}>{counts[l.key]}</span>
            </button>
          ))}
        </div>
        <div className="row wrapping">
          <input
            className="input" style={{ flex: '1 1 200px' }}
            placeholder="Search tasks…" value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="select" style={{ width: 'auto', flex: '0 1 190px' }}
            value={propertyId} onChange={(e) => setPropertyId(e.target.value)}
            aria-label="Filter by building"
          >
            <option value="">All buildings</option>
            {db.properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
        </div>
      </div>

      <SectionHead title={LENSES.find((l) => l.key === lens)!.label} count={visible.length}>
        <button className="btn accent sm" onClick={() => setEditing(newTask({ propertyId: propertyId || null }))}>
          ＋ New task
        </button>
      </SectionHead>

      {visible.length === 0 ? (
        <Empty
          icon="🗒" title="Nothing here"
          body={query || propertyId
            ? 'No tasks match these filters. Try clearing the search or picking a different building.'
            : 'No tasks in this state yet.'}
          action={<button className="btn" onClick={() => setEditing(newTask())}>Add a task</button>}
        />
      ) : (
        visible.map((t) => <TaskRow key={t.id} db={db} task={t} onOpen={setEditing} />)
      )}

      {editing && <TaskEditor db={db} task={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
