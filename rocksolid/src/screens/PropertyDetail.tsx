import { useState } from 'react'
import type { Database, Task, Unit } from '../types'
import {
  deleteProperty, deleteUnit, newTask, newUnit, saveUnit, startWalkthrough,
} from '../actions'
import { money, sortCompliance, unitsFor } from '../selectors'
import { daysUntil, formatDate, relativeDays } from '../lib/dates'
import { opts, UNIT_STATUS, NOTICE_STAGE, NOTICE_TONE } from '../labels'
import { navigate } from '../router'
import {
  Badge, ConfirmButton, Empty, Field, Modal,
  SectionHead, Select, TextArea, TextInput,
} from '../components/ui'
import { ComplianceRow, TaskRow } from '../components/rows'
import { TaskEditor } from '../components/TaskEditor'
import { PropertyEditor } from './Properties'
import { ComplianceEditor } from './Compliance'

type Tab = 'units' | 'tasks' | 'compliance' | 'walkthroughs' | 'notes'

export function PropertyDetail({ db, id }: { db: Database; id: string }) {
  const [tab, setTab] = useState<Tab>('units')
  const [editingProp, setEditingProp] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [addingFiling, setAddingFiling] = useState(false)

  const p = db.properties.find((x) => x.id === id)
  if (!p) {
    return (
      <div className="page">
        <Empty icon="🏚" title="Building not found"
          body="It may have been deleted."
          action={<button className="btn" onClick={() => navigate('/properties')}>Back to portfolio</button>} />
      </div>
    )
  }

  const units = unitsFor(db, p.id)
  const tasks = db.tasks.filter((t) => t.propertyId === p.id)
  const openTasks = tasks.filter((t) => t.status !== 'done')
  const filings = sortCompliance(db.compliance.filter((c) => c.propertyId === p.id))
  const walks = db.walkthroughs.filter((w) => w.propertyId === p.id)
  const notes = db.notes.filter((n) => n.propertyId === p.id)
  const owed = db.arrears.filter((a) => a.propertyId === p.id).reduce((s, a) => s + a.balance, 0)

  const TABS: { key: Tab; label: string; n: number }[] = [
    { key: 'units', label: 'Units', n: units.length },
    { key: 'tasks', label: 'Tasks', n: openTasks.length },
    { key: 'compliance', label: 'Compliance', n: filings.filter((c) => c.status === 'scheduled').length },
    { key: 'walkthroughs', label: 'Walkthroughs', n: walks.length },
    { key: 'notes', label: 'Notes', n: notes.length },
  ]

  return (
    <div className="page">
      <button className="btn ghost sm" style={{ marginBottom: 10 }}
        onClick={() => navigate('/properties')}>← Portfolio</button>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row wrapping" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <h2 className="display" style={{ fontSize: 22 }}>{p.address}</h2>
            {p.submarket && <div className="small muted">{p.submarket}</div>}
          </div>
          <span className="spacer" />
          <button className="btn sm" onClick={() => setEditingProp(true)}>Edit</button>
        </div>

        <div className="row wrapping" style={{ marginTop: 12, gap: 6 }}>
          <Badge>{units.length || p.unitCount} units</Badge>
          {p.hpdRegistration && <Badge tone="blue">HPD {p.hpdRegistration}</Badge>}
          {p.blockLot && <Badge>Block/Lot {p.blockLot}</Badge>}
          {owed > 0 && <Badge tone="red">{money(owed)} in arrears</Badge>}
        </div>

        {p.superName && (
          <div className="small" style={{ marginTop: 11 }}>
            <span className="muted">Super:</span> {p.superName}
            {p.superPhone && <> · <a href={`tel:${p.superPhone.replace(/[^\d+]/g, '')}`}>{p.superPhone}</a></>}
          </div>
        )}
        {p.notes && <p className="small wrap" style={{ marginTop: 10, color: 'var(--ink-2)' }}>{p.notes}</p>}
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} {t.n > 0 && <span className="tabular" style={{ opacity: .6 }}>{t.n}</span>}
          </button>
        ))}
      </div>

      {/* ---------- Units ---------- */}
      {tab === 'units' && (
        <>
          <SectionHead title="Units" count={units.length}>
            <button className="btn accent sm" onClick={() => setEditingUnit(newUnit(p.id))}>＋ Add unit</button>
          </SectionHead>
          {units.length === 0 ? (
            <Empty icon="🚪" title="No units yet"
              body="Add units to track tenants, lease expirations and arrears for this building."
              action={<button className="btn" onClick={() => setEditingUnit(newUnit(p.id))}>Add a unit</button>} />
          ) : units.map((u) => {
            const arr = db.arrears.find((a) => a.unitId === u.id)
            const leaseDays = u.leaseEnd ? daysUntil(u.leaseEnd) : Infinity
            return (
              <button key={u.id} className="rowcard" onClick={() => setEditingUnit(u)}>
                <span className="rowcard-body">
                  <span className="rowcard-title">
                    {u.label} {u.tenantName && <span className="muted" style={{ fontWeight: 400 }}>— {u.tenantName}</span>}
                  </span>
                  <span className="rowcard-meta">
                    <Badge tone={u.status === 'occupied' ? 'green' : u.status === 'vacant' ? 'amber' : 'blue'}>
                      {UNIT_STATUS[u.status]}
                    </Badge>
                    {u.stabilized && <Badge tone="blue">Stabilized</Badge>}
                    {u.rent > 0 && <span>{money(u.rent)}/mo</span>}
                    {u.leaseEnd && <span>· lease ends {formatDate(u.leaseEnd)}</span>}
                  </span>
                </span>
                <span className="rowcard-side">
                  {arr && arr.balance > 0 && <Badge tone={NOTICE_TONE[arr.noticeStage]}>{money(arr.balance)}</Badge>}
                  {Number.isFinite(leaseDays) && leaseDays <= 90 && leaseDays >= 0 && (
                    <span className="tiny muted">{relativeDays(leaseDays)}</span>
                  )}
                </span>
              </button>
            )
          })}
        </>
      )}

      {/* ---------- Tasks ---------- */}
      {tab === 'tasks' && (
        <>
          <SectionHead title="Tasks" count={openTasks.length}>
            <button className="btn accent sm"
              onClick={() => setEditingTask(newTask({ propertyId: p.id }))}>＋ New task</button>
          </SectionHead>
          {tasks.length === 0 ? (
            <Empty icon="🔧" title="No tasks for this building" body="Anything you log here stays attached to this address."
              action={<button className="btn" onClick={() => setEditingTask(newTask({ propertyId: p.id }))}>Add a task</button>} />
          ) : (
            <>
              {openTasks.map((t) => <TaskRow key={t.id} db={db} task={t} onOpen={setEditingTask} showLocation={false} />)}
              {tasks.filter((t) => t.status === 'done').length > 0 && (
                <>
                  <div className="eyebrow" style={{ margin: '18px 0 8px' }}>Completed</div>
                  {tasks.filter((t) => t.status === 'done').map((t) => (
                    <TaskRow key={t.id} db={db} task={t} onOpen={setEditingTask} showLocation={false} />
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ---------- Compliance ---------- */}
      {tab === 'compliance' && (
        <>
          <SectionHead title="Filings & violations" count={filings.length}>
            <button className="btn accent sm" onClick={() => setAddingFiling(true)}>＋ Add</button>
          </SectionHead>
          {filings.length === 0 ? (
            <Empty icon="📋" title="Nothing tracked yet"
              body="Add the recurring filings this building owes — registration, boiler, elevator, gas piping — plus any open violations."
              action={<button className="btn accent" onClick={() => setAddingFiling(true)}>Add from the NYC list</button>} />
          ) : filings.map((c) => (
            <ComplianceRow key={c.id} db={db} item={c} onOpen={() => navigate('/compliance')} />
          ))}
        </>
      )}

      {/* ---------- Walkthroughs ---------- */}
      {tab === 'walkthroughs' && (
        <>
          <SectionHead title="Walkthrough history" count={walks.length}>
            <Select
              value="" className="select" style={{ width: 'auto' }}
              onChange={(e) => {
                const tpl = db.templates.find((t) => t.id === e.target.value)
                if (!tpl) return
                const w = startWalkthrough(p.id, tpl)
                navigate(`/walkthroughs/${w.id}`)
              }}
              options={[{ value: '', label: 'Start walkthrough…' },
                ...db.templates.map((t) => ({ value: t.id, label: t.name }))]}
            />
          </SectionHead>
          {walks.length === 0 ? (
            <Empty icon="🔦" title="No walkthroughs recorded"
              body="Run one and you'll have a dated, itemised record of the building's condition — the thing that settles arguments later." />
          ) : walks.map((w) => {
            const done = w.results.filter((r) => r.status !== 'pending').length
            const issues = w.results.filter((r) => r.status === 'issue').length
            return (
              <button key={w.id} className="rowcard" onClick={() => navigate(`/walkthroughs/${w.id}`)}>
                <span className="rowcard-body">
                  <span className="rowcard-title">{w.templateName}</span>
                  <span className="rowcard-meta">
                    <span>{formatDate(w.date)}</span>
                    <span>· {done}/{w.results.length} checked</span>
                    {issues > 0 && <Badge tone="red">{issues} issue{issues === 1 ? '' : 's'}</Badge>}
                  </span>
                </span>
                <span className="rowcard-side">
                  {w.completedAt ? <Badge tone="green">Complete</Badge> : <Badge tone="amber">In progress</Badge>}
                </span>
              </button>
            )
          })}
        </>
      )}

      {/* ---------- Notes ---------- */}
      {tab === 'notes' && (
        <>
          <SectionHead title="Notes" count={notes.length} />
          {notes.length === 0 ? (
            <Empty icon="📝" title="No notes on this building"
              body="Capture notes from the Today screen and tag them to this building." />
          ) : notes.map((n) => (
            <div className={`note ${n.pinned ? 'pinned' : ''}`} key={n.id}>
              <div className="note-body">{n.body}</div>
              <div className="note-meta">
                <span>{new Date(n.createdAt).toLocaleString('en-US',
                  { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                {n.unitId && <Badge>{units.find((u) => u.id === n.unitId)?.label}</Badge>}
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 34, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <ConfirmButton
          label="Delete this building"
          onConfirm={() => { deleteProperty(p.id); navigate('/properties') }}
        />
        <p className="tiny muted" style={{ marginTop: 6 }}>
          Removes its units, tasks, filings, walkthroughs and arrears. Notes are kept but unlinked.
        </p>
      </div>

      {editingProp && <PropertyEditor property={p} onClose={() => setEditingProp(false)} />}
      {editingUnit && <UnitEditor db={db} unit={editingUnit} onClose={() => setEditingUnit(null)} />}
      {editingTask && <TaskEditor db={db} task={editingTask} onClose={() => setEditingTask(null)} />}
      {addingFiling && <ComplianceEditor db={db} propertyId={p.id} onClose={() => setAddingFiling(false)} />}
    </div>
  )
}

function UnitEditor({ db, unit, onClose }: { db: Database; unit: Unit; onClose: () => void }) {
  const [draft, setDraft] = useState(unit)
  const set = <K extends keyof Unit>(k: K, v: Unit[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const exists = db.units.some((u) => u.id === unit.id)
  const arr = db.arrears.find((a) => a.unitId === unit.id)

  return (
    <Modal
      title={exists ? `Unit ${unit.label}` : 'Add unit'}
      onClose={onClose}
      footer={
        <>
          {exists && <ConfirmButton label="Delete" onConfirm={() => { deleteUnit(unit.id); onClose() }} />}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!draft.label.trim()}
            onClick={() => { saveUnit(draft); onClose() }}>Save</button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid two">
          <Field label="Unit">
            <TextInput autoFocus value={draft.label} placeholder="3B"
              onChange={(e) => set('label', e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={draft.status} options={opts(UNIT_STATUS)}
              onChange={(e) => set('status', e.target.value as Unit['status'])} />
          </Field>
          <Field label="Tenant">
            <TextInput value={draft.tenantName} onChange={(e) => set('tenantName', e.target.value)} />
          </Field>
          <Field label="Phone">
            <TextInput type="tel" value={draft.tenantPhone} onChange={(e) => set('tenantPhone', e.target.value)} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={draft.tenantEmail} onChange={(e) => set('tenantEmail', e.target.value)} />
          </Field>
          <Field label="Monthly rent">
            <TextInput type="number" min={0} value={draft.rent || ''}
              onChange={(e) => set('rent', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Lease start">
            <TextInput type="date" value={draft.leaseStart} onChange={(e) => set('leaseStart', e.target.value)} />
          </Field>
          <Field label="Lease end">
            <TextInput type="date" value={draft.leaseEnd} onChange={(e) => set('leaseEnd', e.target.value)} />
          </Field>
        </div>

        <label className="check">
          <input type="checkbox" checked={draft.stabilized}
            onChange={(e) => set('stabilized', e.target.checked)} />
          <span>Rent-stabilized <span className="muted small">— renewal offers and DHCR registration apply</span></span>
        </label>

        {arr && arr.balance > 0 && (
          <div className="banner warn">
            <span className="b-icon">💰</span>
            <div>
              {money(arr.balance)} outstanding · {NOTICE_STAGE[arr.noticeStage]}.
              {' '}Manage this on the Arrears screen.
            </div>
          </div>
        )}

        <Field label="Notes">
          <TextArea value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
