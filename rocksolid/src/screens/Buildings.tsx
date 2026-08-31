import { useState } from 'react'
import type { Building, Database, Todo, Unit } from '../types'
import {
  deleteBuilding, deleteUnit, newBuilding, newTodo, saveBuilding, saveUnit,
} from '../actions'
import { entriesFor, unitsFor } from '../selectors'
import { navigate } from '../router'
import {
  ConfirmButton, Empty, Field, Modal, SectionHead, TextArea, TextInput,
} from '../components/ui'
import { EntryLog } from '../components/EntryLog'
import { History } from '../components/History'
import { AddUnits } from '../components/AddUnits'
import { TodoEditor, TodoRow } from './Todos'

// ---------------------------------------------------------------- list

export function Buildings({ db }: { db: Database }) {
  const [editing, setEditing] = useState<Building | null>(null)

  return (
    <div className="page">
      <SectionHead title="Buildings" count={db.buildings.length}>
        <button className="btn accent sm" onClick={() => setEditing(newBuilding())}>＋ Add</button>
      </SectionHead>

      {db.buildings.length === 0 ? (
        <Empty icon="🏢" title="No buildings" body="Add the addresses you look after."
          action={<button className="btn accent" onClick={() => setEditing(newBuilding())}>Add a building</button>} />
      ) : db.buildings.map((b) => {
        const units = unitsFor(db, b.id)
        const open = db.todos.filter((t) => t.buildingId === b.id && !t.done).length
        const visits = db.inspections.filter((i) => i.buildingId === b.id && i.filedAt).length
        return (
          <button key={b.id} className="rowcard" onClick={() => navigate(`/buildings/${b.id}`)}>
            <span className="rowcard-body">
              <span className="rowcard-title display" style={{ fontSize: 16 }}>{b.address}</span>
              <span className="rowcard-meta">
                <span>{units.length} unit{units.length === 1 ? '' : 's'}</span>
                {open > 0 && <span>· {open} to do</span>}
                {visits > 0 && <span>· {visits} visit{visits === 1 ? '' : 's'}</span>}
              </span>
            </span>
            <span className="muted">›</span>
          </button>
        )
      })}

      {editing && <BuildingEditor building={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function BuildingEditor({ building, onClose }: { building: Building; onClose: () => void }) {
  const [draft, setDraft] = useState(building)
  return (
    <Modal title={building.address ? 'Edit building' : 'Add building'} onClose={onClose}
      footer={<>
        <span className="spacer" />
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!draft.address.trim()}
          onClick={() => { saveBuilding(draft); onClose() }}>Save</button>
      </>}>
      <div className="stack">
        <Field label="Address">
          <TextInput autoFocus value={draft.address} placeholder="303 W 116th St"
            onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
        </Field>
        <Field label="Notes">
          <TextArea value={draft.notes} placeholder="Anything worth remembering about the building."
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- building

type Tab = 'history' | 'units' | 'todos'

export function BuildingDetail({ db, id }: { db: Database; id: string }) {
  const [tab, setTab] = useState<Tab>('history')
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  const b = db.buildings.find((x) => x.id === id)
  if (!b) {
    return (
      <div className="page">
        <Empty icon="🏚" title="Not found" body="This building was deleted."
          action={<button className="btn" onClick={() => navigate('/buildings')}>Back</button>} />
      </div>
    )
  }

  const units = unitsFor(db, b.id)
  const todos = db.todos.filter((t) => t.buildingId === b.id)
  const open = todos.filter((t) => !t.done)

  const TABS: { key: Tab; label: string; n: number }[] = [
    { key: 'history', label: 'History', n: db.inspections.filter((i) => i.buildingId === b.id && i.filedAt).length },
    { key: 'units', label: 'Units', n: units.length },
    { key: 'todos', label: 'To do', n: open.length },
  ]

  return (
    <div className="page">
      <button className="btn ghost sm" style={{ marginBottom: 10 }}
        onClick={() => navigate('/buildings')}>← Buildings</button>

      <div className="row" style={{ alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="display" style={{ fontSize: 21 }}>{b.address}</h2>
          {b.notes && <p className="small muted wrap" style={{ marginTop: 4 }}>{b.notes}</p>}
        </div>
        <span className="spacer" />
        <button className="btn sm" onClick={() => setEditing(true)}>Edit</button>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} {t.n > 0 && <span className="tabular" style={{ opacity: .6 }}>{t.n}</span>}
          </button>
        ))}
      </div>

      {tab === 'history' && <History db={db} buildingId={b.id} />}

      {tab === 'units' && (
        <>
          <SectionHead title="Units" count={units.length}>
            <div className="row" style={{ gap: 7 }}>
              <button className="btn sm" onClick={() => setAdding(true)}>＋ Add many</button>
            </div>
          </SectionHead>
          {units.length === 0 ? (
            <Empty icon="🚪" title="No units" body="Put the roster in and you can take notes at any door."
              action={<button className="btn accent" onClick={() => setAdding(true)}>Add units</button>} />
          ) : units.map((u) => {
            const notes = entriesFor(db, null, u.id).length
            const openHere = db.todos.filter((t) => t.unitId === u.id && !t.done).length
            return (
              <button key={u.id} className="rowcard" onClick={() => navigate(`/units/${u.id}`)}>
                <span className="rowcard-body">
                  <span className="rowcard-title">
                    {u.label}
                    {u.tenantName && <span className="muted" style={{ fontWeight: 400 }}> — {u.tenantName}</span>}
                  </span>
                  {(notes > 0 || openHere > 0) && (
                    <span className="rowcard-meta">
                      {notes > 0 && <span>{notes} note{notes === 1 ? '' : 's'}</span>}
                      {openHere > 0 && <span>· {openHere} to do</span>}
                    </span>
                  )}
                </span>
                <span className="muted">›</span>
              </button>
            )
          })}
        </>
      )}

      {tab === 'todos' && (
        <>
          <SectionHead title="To do" count={open.length}>
            <button className="btn accent sm"
              onClick={() => setEditingTodo(newTodo({ buildingId: b.id }))}>＋ Add</button>
          </SectionHead>
          {todos.length === 0 ? (
            <Empty icon="✓" title="Nothing for this building"
              body="Anything you add here stays attached to this address." />
          ) : todos.map((t) => (
            <TodoRow key={t.id} db={db} todo={t} onOpen={setEditingTodo} hidePlace />
          ))}
        </>
      )}

      <div style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <ConfirmButton label="Delete this building"
          onConfirm={() => { deleteBuilding(b.id); navigate('/buildings') }} />
        <p className="tiny muted" style={{ marginTop: 6 }}>
          Removes its units, to-dos, notes and photos.
        </p>
      </div>

      {editing && <BuildingEditor building={b} onClose={() => setEditing(false)} />}
      {adding && <AddUnits db={db} buildingId={b.id} onClose={() => setAdding(false)} />}
      {editingTodo && <TodoEditor db={db} todo={editingTodo} onClose={() => setEditingTodo(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------- unit

export function UnitDetail({ db, id }: { db: Database; id: string }) {
  const [editing, setEditing] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  const u = db.units.find((x) => x.id === id)
  const b = u ? db.buildings.find((x) => x.id === u.buildingId) : undefined
  if (!u || !b) {
    return (
      <div className="page">
        <Empty icon="🚪" title="Not found" body="This unit was deleted."
          action={<button className="btn" onClick={() => navigate('/buildings')}>Back</button>} />
      </div>
    )
  }

  const todos = db.todos.filter((t) => t.unitId === u.id)
  const open = todos.filter((t) => !t.done)

  return (
    <div className="page">
      <button className="btn ghost sm" style={{ marginBottom: 10 }}
        onClick={() => navigate(`/buildings/${b.id}`)}>← {b.address}</button>

      <div className="row" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="display" style={{ fontSize: 21 }}>{u.label}</h2>
          <div className="small muted">{b.address}</div>
        </div>
        <span className="spacer" />
        <button className="btn sm" onClick={() => setEditing(true)}>Edit</button>
      </div>

      {(u.tenantName || u.tenantPhone) && (
        <div className="banner" style={{ marginBottom: 14 }}>
          <span className="b-icon">👤</span>
          <div>
            {u.tenantName || 'No name on file'}
            {u.tenantPhone && <> · <a href={`tel:${u.tenantPhone.replace(/[^\d+]/g, '')}`}>{u.tenantPhone}</a></>}
          </div>
        </div>
      )}
      {u.notes && <p className="small wrap" style={{ marginBottom: 14, color: 'var(--ink-2)' }}>{u.notes}</p>}

      {open.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionHead title="To do" count={open.length} />
          {open.map((t) => <TodoRow key={t.id} db={db} todo={t} onOpen={setEditingTodo} hidePlace />)}
        </div>
      )}

      <SectionHead title="Notes">
        <button className="btn ghost sm"
          onClick={() => setEditingTodo(newTodo({ buildingId: b.id, unitId: u.id }))}>
          ＋ To do
        </button>
      </SectionHead>

      <EntryLog db={db} buildingId={b.id} unitId={u.id}
        placeholder="Knocked — what happened?"
        emptyBody="Log what happened each time you came to this door: who answered, what they said, what you promised." />

      {editing && <UnitEditor unit={u} onClose={() => setEditing(false)} />}
      {editingTodo && <TodoEditor db={db} todo={editingTodo} onClose={() => setEditingTodo(null)} />}
    </div>
  )
}

function UnitEditor({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const [draft, setDraft] = useState(unit)
  const set = <K extends keyof Unit>(k: K, v: Unit[K]) => setDraft((d) => ({ ...d, [k]: v }))
  return (
    <Modal title={`Unit ${unit.label}`} onClose={onClose}
      footer={<>
        <ConfirmButton label="Delete"
          onConfirm={() => { deleteUnit(unit.id); navigate(`/buildings/${unit.buildingId}`) }} />
        <span className="spacer" />
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!draft.label.trim()}
          onClick={() => { saveUnit(draft); onClose() }}>Save</button>
      </>}>
      <div className="stack">
        <div className="form-grid two">
          <Field label="Unit">
            <TextInput value={draft.label} onChange={(e) => set('label', e.target.value)} />
          </Field>
          <Field label="Tenant">
            <TextInput value={draft.tenantName} onChange={(e) => set('tenantName', e.target.value)} />
          </Field>
        </div>
        <Field label="Phone">
          <TextInput type="tel" value={draft.tenantPhone}
            onChange={(e) => set('tenantPhone', e.target.value)} />
        </Field>
        <Field label="Notes" hint="Standing facts about the unit — not the visit log below it.">
          <TextArea value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
