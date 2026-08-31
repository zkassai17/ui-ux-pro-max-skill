import { useState } from 'react'
import type { Database, Task } from '../types'
import { deleteTask, saveTask, addTaskEntry, setTaskStatus } from '../actions'
import { formatStamp } from '../lib/dates'
import { opts, TASK_CATEGORY, TASK_PRIORITY, TASK_STATUS } from '../labels'
import { unitsFor } from '../selectors'
import { ConfirmButton, Field, Modal, PhotoStrip, Select, TextArea, TextInput } from './ui'

export function TaskEditor({ db, task, onClose }: {
  db: Database; task: Task; onClose: () => void
}) {
  const [draft, setDraft] = useState<Task>(task)
  const [entry, setEntry] = useState('')

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const units = draft.propertyId ? unitsFor(db, draft.propertyId) : []

  // The thread lives on the stored record, so entries persist immediately rather
  // than waiting for the Save button.
  const stored = db.tasks.find((t) => t.id === task.id)
  const thread = stored?.thread ?? draft.thread

  function commit() {
    saveTask({ ...draft, thread })
    onClose()
  }

  function postEntry() {
    const body = entry.trim()
    if (!body) return
    if (!db.tasks.some((t) => t.id === draft.id)) saveTask({ ...draft, thread: [] })
    addTaskEntry(draft.id, body)
    setEntry('')
  }

  return (
    <Modal
      title={db.tasks.some((t) => t.id === task.id) ? 'Task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          {db.tasks.some((t) => t.id === task.id) && (
            <ConfirmButton label="Delete" onConfirm={() => { deleteTask(draft.id); onClose() }} />
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={commit} disabled={!draft.title.trim()}>Save</button>
        </>
      }
    >
      <div className="stack">
        <Field label="What needs doing">
          <TextInput
            autoFocus value={draft.title}
            placeholder="No hot water — 3rd floor line"
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <div className="form-grid two">
          <Field label="Building">
            <Select
              value={draft.propertyId ?? ''}
              onChange={(e) => { set('propertyId', e.target.value || null); set('unitId', null) }}
              options={[{ value: '', label: '— none —' },
                ...db.properties.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </Field>
          <Field label="Unit">
            <Select
              value={draft.unitId ?? ''} disabled={!draft.propertyId}
              onChange={(e) => set('unitId', e.target.value || null)}
              options={[{ value: '', label: '— whole building —' },
                ...units.map((u) => ({ value: u.id, label: u.label }))]}
            />
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(e) => {
                const s = e.target.value as Task['status']
                setDraft((d) => ({ ...d, status: s, completedAt: s === 'done' ? new Date().toISOString() : null }))
              }}
              options={opts(TASK_STATUS)}
            />
          </Field>
          <Field label="Priority">
            <Select value={draft.priority}
              onChange={(e) => set('priority', e.target.value as Task['priority'])}
              options={opts(TASK_PRIORITY)} />
          </Field>
          <Field label="Category">
            <Select value={draft.category}
              onChange={(e) => set('category', e.target.value as Task['category'])}
              options={opts(TASK_CATEGORY)} />
          </Field>
          <Field label="Due date">
            <TextInput type="date" value={draft.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
        </div>

        <Field label="Assigned to" hint="Super, vendor, or whoever is actually holding this.">
          <TextInput value={draft.assignee} placeholder="Luis Ortega (super)"
            onChange={(e) => set('assignee', e.target.value)} />
        </Field>

        <Field label="Detail">
          <TextArea value={draft.detail} onChange={(e) => set('detail', e.target.value)}
            placeholder="What was reported, what you found, what the plan is." />
        </Field>

        <Field label="Photos">
          <PhotoStrip ids={draft.photoIds} onChange={(ids) => set('photoIds', ids)} />
        </Field>

        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Activity log</div>
          {thread.length === 0 && (
            <p className="small muted" style={{ marginBottom: 8 }}>
              Nothing logged yet. Every call, visit and no-show you record here is the record you will want later.
            </p>
          )}
          {thread.map((e) => (
            <div className="entry" key={e.id}>
              <div className="when">{formatStamp(e.at)}</div>
              <div className="wrap">{e.body}</div>
            </div>
          ))}
          <div className="row" style={{ marginTop: 8 }}>
            <TextInput
              value={entry} placeholder="Add an update…"
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); postEntry() } }}
            />
            <button className="btn" onClick={postEntry} disabled={!entry.trim()}>Log</button>
          </div>
        </div>

        {draft.status !== 'done' && db.tasks.some((t) => t.id === task.id) && (
          <button className="btn accent block" onClick={() => { setTaskStatus(draft.id, 'done'); onClose() }}>
            Mark done
          </button>
        )}
      </div>
    </Modal>
  )
}
