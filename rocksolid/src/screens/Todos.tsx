import { useState } from 'react'
import type { Database, Todo } from '../types'
import { newTodo, saveTodo, toggleTodo, deleteTodo } from '../actions'
import { openTodos, placeLabel, sortTodos, unitsFor } from '../selectors'
import { daysUntil, formatDate, relativeDays, todayISO } from '../lib/dates'
import {
  Badge, ConfirmButton, Empty, Field, Modal, PhotoStrip, SectionHead, TextInput,
} from '../components/ui'

export function Todos({ db }: { db: Database }) {
  const [editing, setEditing] = useState<Todo | null>(null)
  const [quick, setQuick] = useState('')
  const [showDone, setShowDone] = useState(false)

  const open = openTodos(db)
  const done = sortTodos(db.todos.filter((t) => t.done))

  function addQuick() {
    const title = quick.trim()
    if (!title) return
    setEditing(newTodo({ title }))
    setQuick('')
  }

  return (
    <div className="page">
      <div className="capture" style={{ marginBottom: 20 }}>
        <div className="row">
          <TextInput
            value={quick} placeholder="What needs doing?"
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuick() } }}
          />
          <button className="btn accent" onClick={addQuick} disabled={!quick.trim()}>Add</button>
        </div>
      </div>

      <SectionHead title="To do" count={open.length} />

      {open.length === 0 ? (
        <Empty icon="✓" title="Nothing outstanding"
          body="Add something above. Every item can point at a building or a specific unit." />
      ) : (
        open.map((t) => <TodoRow key={t.id} db={db} todo={t} onOpen={setEditing} />)
      )}

      {done.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <button className="btn ghost sm" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Hide' : 'Show'} {done.length} done
          </button>
          {showDone && (
            <div style={{ marginTop: 10 }}>
              {done.map((t) => <TodoRow key={t.id} db={db} todo={t} onOpen={setEditing} />)}
            </div>
          )}
        </div>
      )}

      {editing && <TodoEditor db={db} todo={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

export function TodoRow({ db, todo, onOpen, hidePlace = false }: {
  db: Database; todo: Todo; onOpen: (t: Todo) => void; hidePlace?: boolean
}) {
  const late = todo.dueDate && !todo.done && daysUntil(todo.dueDate) < 0
  return (
    <div className={`rowcard ${late ? 'rail overdue' : ''}`}>
      <button className="tickbox" onClick={() => toggleTodo(todo.id)}
        aria-label={todo.done ? 'Mark not done' : 'Mark done'}>
        {todo.done ? '✓' : ''}
      </button>
      <button className="rowcard-body" style={{ textAlign: 'left', background: 'none' }}
        onClick={() => onOpen(todo)}>
        <span className="rowcard-title" style={todo.done
          ? { textDecoration: 'line-through', opacity: .5 } : undefined}>
          {todo.title || 'Untitled'}
        </span>
        <span className="rowcard-meta">
          {!hidePlace && <span className="truncate">{placeLabel(db, todo.buildingId, todo.unitId)}</span>}
          {todo.photoIds.length > 0 && <span>· 📷 {todo.photoIds.length}</span>}
        </span>
      </button>
      {todo.dueDate && !todo.done && (
        <Badge tone={late ? 'red' : daysUntil(todo.dueDate) <= 2 ? 'amber' : 'grey'}>
          {relativeDays(daysUntil(todo.dueDate))}
        </Badge>
      )}
    </div>
  )
}

export function TodoEditor({ db, todo, onClose }: {
  db: Database; todo: Todo; onClose: () => void
}) {
  const [draft, setDraft] = useState(todo)
  const set = <K extends keyof Todo>(k: K, v: Todo[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const units = draft.buildingId ? unitsFor(db, draft.buildingId) : []
  const exists = db.todos.some((t) => t.id === todo.id)

  return (
    <Modal
      title={exists ? 'To do' : 'New to-do'}
      onClose={onClose}
      footer={
        <>
          {exists && <ConfirmButton label="Delete"
            onConfirm={() => { deleteTodo(draft.id); onClose() }} />}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!draft.title.trim()}
            onClick={() => { saveTodo(draft); onClose() }}>Save</button>
        </>
      }
    >
      <div className="stack">
        <Field label="What needs doing">
          <TextInput autoFocus value={draft.title}
            onChange={(e) => set('title', e.target.value)} />
        </Field>

        <div className="form-grid two">
          <Field label="Building">
            <select className="select" value={draft.buildingId ?? ''}
              onChange={(e) => { set('buildingId', e.target.value || null); set('unitId', null) }}>
              <option value="">— none —</option>
              {db.buildings.map((b) => <option key={b.id} value={b.id}>{b.address}</option>)}
            </select>
          </Field>
          <Field label="Unit">
            <select className="select" value={draft.unitId ?? ''} disabled={!draft.buildingId}
              onChange={(e) => set('unitId', e.target.value || null)}>
              <option value="">— whole building —</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Due">
          <div className="row">
            <TextInput type="date" value={draft.dueDate}
              onChange={(e) => set('dueDate', e.target.value)} />
            <button className="btn sm" onClick={() => set('dueDate', todayISO())}>Today</button>
            {draft.dueDate && (
              <button className="btn ghost sm" onClick={() => set('dueDate', '')}>Clear</button>
            )}
          </div>
        </Field>

        <Field label="Photos">
          <PhotoStrip ids={draft.photoIds} onChange={(ids) => set('photoIds', ids)}
            context={{
              building: db.buildings.find((b) => b.id === draft.buildingId)?.address ?? '',
              label: draft.title || 'To do',
            }} />
        </Field>

        {draft.done && draft.doneAt && (
          <p className="small muted">Done {formatDate(draft.doneAt.slice(0, 10))}.</p>
        )}
      </div>
    </Modal>
  )
}
